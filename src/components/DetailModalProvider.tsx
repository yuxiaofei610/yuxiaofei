"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { NormalizedContent } from "@/lib/types";
import DetailModalView from "./DetailModalView";

type CtxValue = { open: (c: NormalizedContent) => void; close: () => void };

const DetailModalCtx = createContext<CtxValue>({ open: () => {}, close: () => {} });

export const useDetailModal = () => useContext(DetailModalCtx);

export default function DetailModalProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<NormalizedContent | null>(null);

  const open = useCallback((c: NormalizedContent) => setContent(c), []);
  const close = useCallback(() => setContent(null), []);

  // 打开弹窗时锁定背景滚动 + 支持 Esc 关闭
  useEffect(() => {
    if (!content) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [content, close]);

  return (
    <DetailModalCtx.Provider value={{ open, close }}>
      {children}
      {content && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={close}
        >
          <div className="my-8 w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
            <DetailModalView content={content} onClose={close} />
          </div>
        </div>
      )}
    </DetailModalCtx.Provider>
  );
}
