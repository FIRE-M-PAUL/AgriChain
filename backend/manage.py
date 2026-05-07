#!/usr/bin/env python
import atexit
import json
import os
from pathlib import Path
import re
import signal
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import webbrowser
from urllib import error as url_error
from urllib import request as url_request


DEFAULT_FRONTEND_PORTS = [5173, 5174, 4173, 3000, 3001]
FRONTEND_READY_TIMEOUT_SECONDS = 35
FRONTEND_READY_POLL_INTERVAL_SECONDS = 0.6
_BROWSER_OPENED = False


def _supports_color():
    if os.environ.get("NO_COLOR"):
        return False
    return sys.stdout.isatty()


def _color(text, code):
    if not _supports_color():
        return text
    return f"\033[{code}m{text}\033[0m"


def _log(level, message):
    ascii_only = (os.environ.get("PYTHONIOENCODING", "").lower() != "utf-8") and not _supports_color()
    styles = {
        "info": ("34", "i"),
        "ok": ("32", "OK" if ascii_only else "✓"),
        "warn": ("33", "!"),
        "error": ("31", "ERR" if ascii_only else "x"),
    }
    color_code, symbol = styles.get(level, ("0", "-"))
    prefix = _color(f"[AGRICHAIN] {symbol}", color_code)
    print(f"{prefix} {message}")


def _is_port_open(host, port, timeout=0.2):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(timeout)
        return sock.connect_ex((host, int(port))) == 0


def _http_ready_on_port(port, timeout=0.4):
    for host in ("127.0.0.1", "localhost"):
        url = f"http://{host}:{port}"
        req = url_request.Request(url, method="GET")
        try:
            with url_request.urlopen(req, timeout=timeout) as resp:
                if 200 <= resp.status < 500:
                    return True
        except (url_error.URLError, TimeoutError, OSError):
            continue
    return False


def _extract_ports_from_script(script_text):
    ports = set()
    if not script_text:
        return ports
    for pattern in (
        r"(?:--port|-p)\s+(\d{2,5})",
        r"PORT\s*=\s*(\d{2,5})",
        r"set\s+PORT\s*=\s*(\d{2,5})",
    ):
        for match in re.findall(pattern, script_text, flags=re.IGNORECASE):
            try:
                ports.add(int(match))
            except ValueError:
                pass
    return ports


def _frontend_port_candidates(package_data):
    scripts = package_data.get("scripts", {}) if isinstance(package_data, dict) else {}
    parsed = set(DEFAULT_FRONTEND_PORTS)
    for script_value in scripts.values():
        parsed.update(_extract_ports_from_script(str(script_value)))
    return sorted(parsed)


def _detect_frontend_script(frontend_dir):
    package_json = frontend_dir / "package.json"
    if not package_json.exists():
        return None, {}, "missing frontend/package.json"
    try:
        package_data = json.loads(package_json.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        return None, {}, f"could not parse package.json: {exc}"

    scripts = package_data.get("scripts", {})
    if not isinstance(scripts, dict):
        return None, package_data, "package.json scripts field is invalid"

    script_priority = [
        "dev",
        "start",
    ]
    for script_name in script_priority:
        if script_name in scripts:
            return script_name, package_data, ""

    # Fallback: choose a script that explicitly starts Vite or Next.js.
    for script_name, script_cmd in scripts.items():
        cmd = str(script_cmd).lower()
        if "vite" in cmd or "next dev" in cmd:
            return script_name, package_data, ""

    return None, package_data, "no dev/start/vite/next-compatible script found"


def _snapshot_open_ports(ports):
    return {port for port in ports if _is_port_open("127.0.0.1", port)}


def _wait_for_frontend_readiness(ports, timeout_seconds):
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        for port in ports:
            if _is_port_open("127.0.0.1", port) and _http_ready_on_port(port):
                return port
        time.sleep(FRONTEND_READY_POLL_INTERVAL_SECONDS)
    return None


def _should_open_browser():
    value = os.environ.get("AGRICHAIN_OPEN_BROWSER", "1").strip().lower()
    return value not in {"0", "false", "no", "off"}


def _browser_session_key():
    # For autoreload mode, the parent reloader PID is stable across child restarts.
    if _is_django_serving_process() and "--noreload" not in sys.argv:
        return str(os.getppid())
    return str(os.getpid())


def _browser_lock_file():
    project_marker = "agrichain"
    return Path(tempfile.gettempdir()) / f"{project_marker}_chrome_opened_{_browser_session_key()}.lock"


def _already_opened_browser_this_session():
    return _browser_lock_file().exists()


def _mark_browser_opened_this_session():
    try:
        _browser_lock_file().write_text("opened", encoding="utf-8")
    except OSError:
        # Non-fatal: in worst case browser might open more than once.
        pass


def _find_chrome_executable():
    env_override = os.environ.get("AGRICHAIN_CHROME_PATH")
    if env_override and Path(env_override).exists():
        return env_override

    if os.name == "nt":
        candidates = [
            Path("C:/Program Files/Google/Chrome/Application/chrome.exe"),
            Path("C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"),
            Path.home() / "AppData/Local/Google/Chrome/Application/chrome.exe",
        ]
        for candidate in candidates:
            if candidate.exists():
                return str(candidate)
    else:
        for binary in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser"):
            binary_path = shutil.which(binary)
            if binary_path:
                return binary_path
    return None


def _open_in_google_chrome(url):
    chrome_path = _find_chrome_executable()
    if chrome_path:
        try:
            if os.name == "nt":
                subprocess.Popen(
                    [chrome_path, "--new-tab", url],
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
                )
            else:
                subprocess.Popen([chrome_path, "--new-tab", url])
            return True
        except OSError as exc:
            _log("warn", f"Found Chrome but failed to launch it: {exc}")

    _log("warn", "Google Chrome not found. Falling back to default browser.")
    try:
        return webbrowser.open_new_tab(url)
    except Exception as exc:  # noqa: BLE001 - browser fallback must stay best effort
        _log("warn", f"Could not open browser automatically: {exc}")
        return False


def _maybe_open_browser(port):
    global _BROWSER_OPENED
    if _BROWSER_OPENED or not _should_open_browser() or _already_opened_browser_this_session():
        return

    url = f"http://localhost:{port}"
    if _open_in_google_chrome(url):
        _BROWSER_OPENED = True
        _mark_browser_opened_this_session()
        _log("ok", "Opening AGRICHAIN in Google Chrome...")


def _terminate_process_tree(process):
    if not process or process.poll() is not None:
        return
    pid = process.pid
    try:
        if os.name == "nt":
            # /T terminates child processes too (npm -> node).
            subprocess.run(
                ["taskkill", "/PID", str(pid), "/T", "/F"],
                check=False,
                capture_output=True,
                text=True,
            )
        else:
            os.killpg(os.getpgid(pid), signal.SIGTERM)
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(os.getpgid(pid), signal.SIGKILL)
    except Exception as exc:  # noqa: BLE001 - shutdown path must not crash app exit
        _log("warn", f"Frontend cleanup warning: {exc}")


def _register_shutdown_handlers(process):
    atexit.register(_terminate_process_tree, process)

    def _signal_handler(signum, _frame):
        _log("info", f"Received signal {signum}. Shutting down frontend...")
        _terminate_process_tree(process)
        raise KeyboardInterrupt

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            signal.signal(sig, _signal_handler)
        except (ValueError, OSError):
            # Happens in some embedded runtimes; atexit still handles cleanup.
            pass


def _is_runserver_invocation():
    return "runserver" in sys.argv[1:]


def _is_django_serving_process():
    # Django's autoreloader creates a parent process and a serving child process.
    return os.environ.get("RUN_MAIN") == "true" or "--noreload" in sys.argv


def _build_frontend_command(script_name):
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    return [npm_cmd, "run", script_name]


def _spawn_frontend(command, cwd):
    kwargs = {"cwd": str(cwd)}
    if os.name == "nt":
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
        kwargs["shell"] = False
    else:
        kwargs["start_new_session"] = True
    return subprocess.Popen(command, **kwargs)


def _frontend_already_running(candidate_ports):
    for port in candidate_ports:
        if _is_port_open("127.0.0.1", port) and _http_ready_on_port(port):
            return port
    return None


def _detect_backend_port():
    runserver_index = None
    for index, arg in enumerate(sys.argv):
        if arg == "runserver":
            runserver_index = index
            break
    if runserver_index is None or runserver_index + 1 >= len(sys.argv):
        return 8000

    next_arg = sys.argv[runserver_index + 1].strip()
    if next_arg.startswith("-"):
        return 8000
    if ":" in next_arg:
        _, _, maybe_port = next_arg.rpartition(":")
        return int(maybe_port) if maybe_port.isdigit() else 8000
    return int(next_arg) if next_arg.isdigit() else 8000


def _wait_and_open_browser_after_services_ready(frontend_port_hint, candidate_ports):
    if not _should_open_browser():
        return

    backend_port = _detect_backend_port()
    deadline = time.time() + max(FRONTEND_READY_TIMEOUT_SECONDS + 15, 45)
    while time.time() < deadline:
        backend_ready = _is_port_open("127.0.0.1", backend_port)
        frontend_port = frontend_port_hint or _frontend_already_running(candidate_ports)
        frontend_ready = bool(frontend_port)
        if backend_ready and frontend_ready:
            _log("ok", f"Django backend running on port {backend_port}.")
            _maybe_open_browser(frontend_port)
            return
        time.sleep(0.5)

    _log("warn", "Timed out waiting for backend/frontend readiness before opening browser.")


def _maybe_start_frontend():
    if not _is_runserver_invocation():
        return None, None, list(DEFAULT_FRONTEND_PORTS)
    if not _is_django_serving_process():
        return None, None, list(DEFAULT_FRONTEND_PORTS)

    backend_dir = Path(__file__).resolve().parent
    frontend_dir = backend_dir.parent / "frontend"
    if not frontend_dir.exists():
        _log("warn", "Frontend directory not found. Continuing with backend only.")
        return None, None, list(DEFAULT_FRONTEND_PORTS)

    script_name, package_data, detect_error = _detect_frontend_script(frontend_dir)
    if not script_name:
        _log("warn", f"Frontend script detection failed: {detect_error}.")
        _log("warn", "Continuing with backend only.")
        return None, None, list(DEFAULT_FRONTEND_PORTS)

    candidate_ports = _frontend_port_candidates(package_data)
    active_port = _frontend_already_running(candidate_ports)
    if active_port:
        _log("warn", f"Frontend already running on port {active_port}.")
        return None, active_port, candidate_ports

    command = _build_frontend_command(script_name)
    _log("info", f"Starting frontend with: {' '.join(command)}")
    before_ports = _snapshot_open_ports(candidate_ports)
    try:
        process = _spawn_frontend(command, frontend_dir)
    except OSError as exc:
        _log("error", f"Failed to start frontend: {exc}")
        _log("warn", "Django backend will continue without frontend auto-start.")
        return None, None, candidate_ports

    _register_shutdown_handlers(process)

    # Readiness check is best effort: backend must still start even if this fails.
    ready_port = _wait_for_frontend_readiness(
        ports=candidate_ports,
        timeout_seconds=FRONTEND_READY_TIMEOUT_SECONDS,
    )
    if ready_port:
        _log("ok", f"Frontend ready on port {ready_port}.")
        return process, ready_port, candidate_ports

    after_ports = _snapshot_open_ports(candidate_ports)
    new_ports = sorted(after_ports - before_ports)
    if process.poll() is not None:
        _log("error", "Frontend process exited before becoming ready.")
    elif new_ports:
        _log("warn", f"Frontend opened port(s) {new_ports} but readiness was not confirmed in time.")
    else:
        _log("warn", "Frontend readiness timeout reached with no detected open dev port.")
    _log("warn", "Backend continues running. Check frontend terminal output for details.")
    return process, None, candidate_ports


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "farmtrace_backend.settings")
    _log("info", "Booting AGRICHAIN development environment...")
    _frontend_process, frontend_port, candidate_ports = _maybe_start_frontend()
    _log("ok", "Django backend starting...")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError("Couldn't import Django.") from exc

    if _is_runserver_invocation() and _is_django_serving_process():
        # Run browser-opening logic in a background thread so Django can start
        # immediately; this avoids race conditions with backend/frontend readiness.
        threading.Thread(
            target=_wait_and_open_browser_after_services_ready,
            args=(frontend_port, candidate_ports),
            daemon=True,
        ).start()

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
