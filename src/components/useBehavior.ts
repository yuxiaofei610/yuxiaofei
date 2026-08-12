"use client";

import { useRouter } from "next/navigation";
import { showToast } from "./toast";

// 统一行为操作：已看/已玩/喜欢/不喜欢（切换语义，由后端返回 added 决定状态）
export function useBehavior() {
  const router = useRouter();

  async function act(contentType: string, contentId: string, action: "watched" | "played" | "like" | "dislike") {
    const res = await fetch("/api/behavior", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType, contentId, action }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || data.error === "NOT_LOGIN") {
      showToast("请先登录", "error");
      router.push("/login");
      return null;
    }
    if (!data.ok) {
      showToast("操作失败：" + (data.error || ""), "error");
      return null;
    }
    return data as { ok: boolean; added: boolean; action: string };
  }

  return { act };
}
