"use client";

import { useState } from "react";

export default function CopySnippet({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Fallback for older browsers / non-secure contexts.
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-900 shadow-lg">
      <div className="flex items-center justify-between border-b border-stone-700 px-4 py-2">
        <span className="font-mono text-xs text-stone-400">embed-snippet.html</span>
        <button
          onClick={copy}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            copied
              ? "bg-green-600 text-white"
              : "bg-amber-600 text-white hover:bg-amber-500"
          }`}
        >
          {copied ? "Copied ✓" : "Copy snippet"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed text-amber-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}
