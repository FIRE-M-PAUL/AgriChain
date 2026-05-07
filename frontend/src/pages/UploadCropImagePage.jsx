import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ImageUp, Loader2 } from "lucide-react";
import Card from "../components/Card";
import PageScaffold from "../components/PageScaffold";
import StatusBadge from "../components/dashboard/StatusBadge";

export default function UploadCropImagePage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);

  const uploadAndAnalyze = () => {
    setProgress(10);
    setResult(null);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setResult({
            crop: "Maize",
            confidence: 93,
            authenticity: "Likely authentic farm photo",
            status: "AI Verified",
          });
          return 100;
        }
        return prev + 18;
      });
    }, 250);
  };

  const confidenceWidth = useMemo(() => `${result?.confidence || 0}%`, [result]);

  const onFileChange = (event) => {
    const next = event.target.files?.[0];
    setFile(next || null);
    setProgress(0);
    setResult(null);
    if (next) {
      setPreview(URL.createObjectURL(next));
    }
  };

  return (
    <PageScaffold title="Upload Crop Image" subtitle="Submit crop imagery for AI authenticity verification and confidence scoring.">
      <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
        <Card>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-300/35 bg-slate-900/40 p-10 text-center hover:bg-slate-900/70">
            <ImageUp className="mb-2 h-7 w-7 text-emerald-300" />
            <p className="text-sm font-semibold text-white">Drag & drop or click to upload</p>
            <p className="mt-1 text-xs text-slate-300">PNG, JPG up to 10MB</p>
            <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          </label>

          {file && (
            <div className="mt-4">
              <button onClick={uploadAndAnalyze} className="rounded-xl border border-emerald-300/35 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-500/10">
                Run AI Analysis
              </button>
            </div>
          )}

          {progress > 0 && (
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-slate-300">
                <span>Upload progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <motion.div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400" animate={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          {preview ? <img src={preview} alt="Uploaded crop" className="h-52 w-full rounded-xl object-cover" /> : <div className="flex h-52 items-center justify-center rounded-xl bg-slate-900/60 text-sm text-slate-400">Image preview appears here</div>}
          {!result && progress > 0 && progress < 100 ? (
            <p className="text-sm text-cyan-200">
              <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />
              AI is analyzing crop quality and authenticity...
            </p>
          ) : null}
          {result ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                <span className="text-emerald-200">{result.status}</span>
                <StatusBadge label={result.status} />
              </div>
              <p className="text-slate-300">Crop detected: {result.crop}</p>
              <p className="text-slate-300">Authenticity: {result.authenticity}</p>
              <div className="mt-2">
                <p className="mb-1 text-xs text-slate-300">Confidence: {result.confidence}%</p>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-lime-400 to-emerald-300" animate={{ width: confidenceWidth }} />
                </div>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </PageScaffold>
  );
}
