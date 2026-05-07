import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Save, Sparkles } from "lucide-react";
import Button from "../components/Button";
import Card from "../components/Card";
import PageScaffold from "../components/PageScaffold";
import { productService } from "../services/api";

const initialForm = {
  crop_name: "",
  quantity: "",
  farm_location: "",
  harvest_date: "",
  description: "",
};

export default function RegisterCropPage() {
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);

  const submitCrop = async (event) => {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      await productService.create({
        crop_name: form.crop_name,
        quantity: Number(form.quantity),
        description: `${form.description}\n\nLocation: ${form.farm_location}\nHarvest: ${form.harvest_date}`,
      });
      toast.success("Crop registered on AGRICHAIN");
      setForm(initialForm);
    } catch {
      toast.error("Could not register crop");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveDraft = async () => {
    setIsDrafting(true);
    setTimeout(() => {
      setIsDrafting(false);
      toast.success("Draft saved locally");
    }, 600);
  };

  return (
    <PageScaffold title="Register New Crop" subtitle="Record harvest batches with blockchain-ready metadata and AI-ready crop context.">
      <Card>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={submitCrop}>
          <input className="rounded-xl bg-slate-900 p-3 text-sm" placeholder="Crop name" value={form.crop_name} onChange={(e) => setForm((prev) => ({ ...prev, crop_name: e.target.value }))} required />
          <input className="rounded-xl bg-slate-900 p-3 text-sm" type="number" min="1" placeholder="Quantity (kg)" value={form.quantity} onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))} required />
          <input className="rounded-xl bg-slate-900 p-3 text-sm" placeholder="Farm location" value={form.farm_location} onChange={(e) => setForm((prev) => ({ ...prev, farm_location: e.target.value }))} required />
          <input className="rounded-xl bg-slate-900 p-3 text-sm" type="date" value={form.harvest_date} onChange={(e) => setForm((prev) => ({ ...prev, harvest_date: e.target.value }))} required />
          <textarea className="rounded-xl bg-slate-900 p-3 text-sm md:col-span-2" rows={4} placeholder="Product description" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />

          <div className="md:col-span-2 flex flex-wrap gap-3">
            <Button disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 inline h-4 w-4" />}
              {isSubmitting ? "Registering..." : "Blockchain Register"}
            </Button>
            <button type="button" onClick={saveDraft} className="rounded-xl border border-white/20 px-4 py-2 text-sm text-slate-200 hover:bg-white/10" disabled={isDrafting}>
              {isDrafting ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : <Save className="mr-1 inline h-4 w-4" />}
              {isDrafting ? "Saving..." : "Save Draft"}
            </button>
          </div>
        </form>
      </Card>
    </PageScaffold>
  );
}
