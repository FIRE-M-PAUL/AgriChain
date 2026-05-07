import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || "Unknown runtime error" };
  }

  componentDidCatch(error) {
    // Keep browser console details for debugging
    console.error("AGRICHAIN runtime error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
          <div className="mx-auto max-w-2xl rounded-2xl border border-red-400/30 bg-red-900/20 p-5">
            <h1 className="text-2xl font-bold text-red-300">Rendering Error</h1>
            <p className="mt-2 text-sm text-slate-200">
              The app crashed while rendering. Open browser DevTools Console for full details.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-900 p-3 text-xs text-red-200">
              {this.state.errorMessage}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
