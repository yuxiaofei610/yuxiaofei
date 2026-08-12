"use client";

import { useEffect, useState } from "react";

export function showToast(message: string, kind: "info" | "success" | "error" = "info") {
  window.dispatchEvent(new CustomEvent("app-toast", { detail: { message, kind } }));
}

interface ToastItem { id: number; message: string; kind: string; }

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { message, kind } = (e as CustomEvent).detail;
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, message, kind }]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 2200);
    };
    window.addEventListener("app-toast", handler);
    return () => window.removeEventListener("app-toast", handler);
  }, []);

  return (
    <div className="fixed bottom-20 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-6">
      {items.map((t) => (
        <div key={t.id} className={`animate-fadeup rounded-lg border px-4 py-2 text-sm shadow-lg ${
          t.kind === "error" ? "border-red-500/50 bg-red-500/15 text-red-200" :
          t.kind === "success" ? "border-green-500/50 bg-green-500/15 text-green-200" :
          "border-line bg-bg-soft text-white"
        }`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
