import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import Card from "../components/Card";
import Button from "../components/Button";
import { authService } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    farm_name: "",
    province: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await authService.register(form);
      const res = await authService.login({ email: form.email, password: form.password });
      login(res.data.access, res.data.refresh);
      toast.success("Account created successfully");
      navigate("/dashboard");
    } catch {
      toast.error("Could not create account. Try another username.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-md py-8">
        <Card>
          <h2 className="mb-4 text-2xl font-bold">Register Farmer</h2>
          <form className="space-y-4" onSubmit={submit}>
            <input className="w-full rounded-xl bg-slate-900 p-3" placeholder="Full Name" required onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <input className="w-full rounded-xl bg-slate-900 p-3" placeholder="Email" type="email" required onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="w-full rounded-xl bg-slate-900 p-3" placeholder="Phone Number" required onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
            <input className="w-full rounded-xl bg-slate-900 p-3" placeholder="Farm Name" required onChange={(e) => setForm({ ...form, farm_name: e.target.value })} />
            <input className="w-full rounded-xl bg-slate-900 p-3" placeholder="Province / Location" required onChange={(e) => setForm({ ...form, province: e.target.value })} />
            <input className="w-full rounded-xl bg-slate-900 p-3" placeholder="Password" type="password" required onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <Button className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Register"}
            </Button>
          </form>
          <button className="mt-4 text-sm text-emerald-300" onClick={() => navigate("/login")}>
            Already have an account? Login
          </button>
        </Card>
      </div>
    </MainLayout>
  );
}
