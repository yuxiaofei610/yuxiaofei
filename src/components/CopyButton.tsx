"use client";

import { useState } from "react";
import { showToast } from "./toast";

export default function CopyButton({ text, className = "btn btn-outline" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // 移动端非安全上下文兜底
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      showToast("✓ 已复制", "success");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showToast("复制失败", "error");
    }
  };

  return (
    <button onClick={copy} className={className}>
      {copied ? "✓ 已复制" : "复制名称"}
    </button>
  );
}
