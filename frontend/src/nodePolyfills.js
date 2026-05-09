/**
 * Load-order guarantee: Buffer + process exist before Solana/Web3 modules evaluate.
 * Vite polyfill plugin handles bundling; this wires globals for libs that reference them directly.
 */
import { Buffer } from "buffer";
import process from "process";

if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer;
}
if (typeof window !== "undefined" && window.Buffer === undefined) {
  window.Buffer = Buffer;
}
if (typeof globalThis.process === "undefined") {
  globalThis.process = process;
}
