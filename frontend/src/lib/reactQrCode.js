import qrDefaultExport from "react-qr-code";
import * as qrNamespace from "react-qr-code";

/** forwardRef / memo are objects, not functions — must not use `typeof x === "function"` alone. */
function isReactComponentType(Component) {
  if (Component == null) return false;
  if (typeof Component === "function") return true;
  if (typeof Component !== "object") return false;
  const t = Component.$$typeof;
  return (
    t === Symbol.for("react.forward_ref") ||
    t === Symbol.for("react.memo") ||
    t === Symbol.for("react.lazy")
  );
}

function unwrapDefaultChain(value, maxDepth = 6) {
  let cur = value;
  const seen = new Set();
  const out = [];
  let depth = 0;
  while (cur != null && depth < maxDepth && !seen.has(cur)) {
    seen.add(cur);
    out.push(cur);
    depth += 1;
    if (cur && typeof cur === "object" && Object.prototype.hasOwnProperty.call(cur, "default")) {
      const next = cur.default;
      if (next === cur) break;
      cur = next;
    } else break;
  }
  return out;
}

function resolveReactQrRoot() {
  const seeds = [qrDefaultExport, qrNamespace?.default, qrNamespace?.QRCode].filter((x) => x != null);

  for (const seed of seeds) {
    for (const candidate of unwrapDefaultChain(seed)) {
      if (isReactComponentType(candidate)) return candidate;
    }
  }

  if (qrNamespace && typeof qrNamespace === "object") {
    for (const key of Object.keys(qrNamespace)) {
      const v = qrNamespace[key];
      if (isReactComponentType(v)) return v;
    }
  }

  return null;
}

export const ReactQRCode = resolveReactQrRoot();

export function canRenderReactQRCode() {
  return isReactComponentType(ReactQRCode);
}
