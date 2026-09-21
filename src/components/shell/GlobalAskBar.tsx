"use client";

import { Search } from "lucide-react";
import { useState } from "react";

export function GlobalAskBar() {
  const [value, setValue] = useState("");

  return (
    <form
      role="search"
      aria-label="Ask the operational assistant"
      className="relative flex w-full max-w-xl items-center"
      onSubmit={(e) => {
        e.preventDefault();
        // Wired in Step 6/9
      }}
    >
      <Search
        className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400"
        aria-hidden="true"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ask about procedures, assets, policies…"
        aria-label="Ask a question"
        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      />
    </form>
  );
}
