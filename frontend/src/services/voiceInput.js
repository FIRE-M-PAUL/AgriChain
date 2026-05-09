function parseCropSpeech(transcript = "") {
  const normalized = transcript.trim().toLowerCase();
  const quantityMatch = normalized.match(/(\d+(\.\d+)?)/);
  const quantity = quantityMatch ? quantityMatch[1] : "";
  const cropName = normalized
    .replace(/(\d+(\.\d+)?)/g, "")
    .replace(/\b(bags?|kg|kgs|kilograms?|tons?|tonnes?|of)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    cropName: cropName ? cropName.replace(/\b\w/g, (char) => char.toUpperCase()) : "",
    quantity,
  };
}

export function startVoiceCapture({ onResult, onError }) {
  if (typeof window === "undefined") {
    onError?.("Voice capture is only available in a browser.");
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    onError?.("Speech recognition is not supported in this browser.");
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript || "";
    onResult?.({ transcript, parsed: parseCropSpeech(transcript) });
  };
  recognition.onerror = () => {
    onError?.("Voice transcription failed. Please try again.");
  };
  recognition.start();
  return recognition;
}

export function getElevenLabsPlaceholderConfig() {
  return {
    enabled: Boolean(import.meta.env.VITE_ELEVENLABS_API_KEY),
    endpoint: "https://api.elevenlabs.io/v1/speech-to-text",
    note: "Use a backend proxy for production API key security.",
  };
}
