"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { showToast } from "@/components/toast";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok && data.ok) {
      showToast("注册成功", "success");
      router.push("/");
      router.refresh();
    } else {
      showToast("注册失败：" + (data.error || ""), "error");
    }
  };

  return (
    <div className="mx-auto max-w-sm py-12">
      <h1 className="mb-6 text-2xl font-bold">注册</h1>
      <form onSubmit={submit} className="space-y-3">
        <input value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="用户名" className="w-full rounded-lg border border-line bg-bg-soft px-4 py-2 outline-none focus:border-accent" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="邮箱" className="w-full rounded-lg border border-line bg-bg-soft px-4 py-2 outline-none focus:border-accent" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={6} placeholder="密码（至少6位）" className="w-full rounded-lg border border-line bg-bg-soft px-4 py-2 outline-none focus:border-accent" />
        <button disabled={loading} className="btn btn-brand w-full">{loading ? "注册中…" : "注册"}</button>
      </form>
      <p className="mt-4 text-sm text-muted">已有账号？<Link href="/login" className="text-accent">登录</Link></p>
    </div>
  );
}
