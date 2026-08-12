"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { showToast } from "@/components/toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok && data.ok) {
      showToast("登录成功", "success");
      router.push("/");
      router.refresh();
    } else {
      showToast("登录失败：" + (data.error || ""), "error");
    }
  };

  return (
    <div className="mx-auto max-w-sm py-12">
      <h1 className="mb-6 text-2xl font-bold">登录</h1>
      <form onSubmit={submit} className="space-y-3">
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="邮箱" className="w-full rounded-lg border border-line bg-bg-soft px-4 py-2 outline-none focus:border-accent" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required placeholder="密码" className="w-full rounded-lg border border-line bg-bg-soft px-4 py-2 outline-none focus:border-accent" />
        <button disabled={loading} className="btn btn-brand w-full">{loading ? "登录中…" : "登录"}</button>
      </form>
      <p className="mt-4 text-sm text-muted">还没有账号？<Link href="/register" className="text-accent">注册</Link></p>
    </div>
  );
}
