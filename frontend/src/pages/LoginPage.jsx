import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import Card from "../components/Card";
import Button from "../components/Button";
import { authService } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await authService.login({ email: form.email, password: form.password });
      login(res.data.access, res.data.refresh);
      toast.success("Welcome to AGRICHAIN");
      navigate("/dashboard");
    } catch {
      toast.error("Authentication failed. Check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-md py-8">
        <Card>
          <h2 className="mb-4 text-2xl font-bold">Farmer Login</h2>
          <form className="space-y-4" onSubmit={submit}>
            <input className="w-full rounded-xl bg-slate-900 p-3" placeholder="Email" type="email" required onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="w-full rounded-xl bg-slate-900 p-3" placeholder="Password" type="password" required onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <Button className="w-full" disabled={loading}>
              {loading ? "Please wait..." : "Login"}
            </Button>
          </form>
          <button className="mt-4 text-sm text-emerald-300" onClick={() => navigate("/register")}>
            New farmer? Create account
          </button>
        </Card>
      </div>
    </MainLayout>
  );
}
