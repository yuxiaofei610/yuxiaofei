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

  // 打开弹窗时锁定背景滚动（保留当前滚动位置，避免页面跳回顶部）+ 支持 Esc 关闭
  useEffect(() => {
    if (!content) return;
    const scrollY = window.scrollY;
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevWidth = document.body.style.width;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.width = prevWidth;
      window.removeEventListener("keydown", onKey);
      window.scrollTo(0, scrollY);
    };
  }, [content, close]);

  return (
    <DetailModalCtx.Provider value={{ open, close }}>
      {children}
      {content && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
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
