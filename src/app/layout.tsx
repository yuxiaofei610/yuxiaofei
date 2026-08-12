import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { ToastHost } from "@/components/toast";

export const metadata: Metadata = {
  title: "悦荐 · 综合娱乐推荐",
  description: "发现电影、电视剧、动漫、综艺、纪录片、音乐，个性化推荐，标记已看已听，建立你的兴趣画像。",
  keywords: ["影视推荐", "动漫", "电影", "个性化推荐", "Bilibili", "QQ音乐"],
  openGraph: {
    title: "悦荐 · 综合娱乐推荐",
    description: "个性化娱乐推荐平台",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-bg text-white/90 font-sans antialiased">
        <Nav />
        <main className="mx-auto w-full max-w-[1280px] px-4 pb-24 md:pb-10 pt-2">{children}</main>
        <Footer />
        <ToastHost />
      </body>
    </html>
  );
}
