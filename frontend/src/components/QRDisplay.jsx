import { useRef } from "react";
import { ReactQRCode, canRenderReactQRCode } from "../lib/reactQrCode";
import Card from "./Card";

export default function QRDisplay({ value, product }) {
  const qrRef = useRef(null);
  if (!value) return null;

  const downloadQr = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    canvas.width = 320;
    canvas.height = 320;
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `${product?.product_id || "agrichain-product"}-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = `data:image/svg+xml;base64,${window.btoa(svgData)}`;
  };

  return (
    <Card className="space-y-4 text-center">
      <h3 className="text-lg font-semibold">Generated QR Code</h3>
      <div ref={qrRef} className="mx-auto w-fit rounded-xl bg-white p-3">
        {canRenderReactQRCode() ? <ReactQRCode value={value} size={170} /> : null}
      </div>
      {product?.product_id && <p className="text-sm text-slate-300">Product ID: {product.product_id}</p>}
      <button onClick={downloadQr} className="rounded-xl border border-emerald-300/40 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-400/10">
        Download QR
      </button>
    </Card>
  );
}
