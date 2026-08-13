import { CategorySection } from "@/components/HomeContent";

export const dynamic = "force-dynamic";

export default function GamePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">🎮 游戏推荐</h1>
        <p className="mt-1 text-sm text-muted">单机、网游、手游，发现值得入手的好游戏。</p>
      </header>

      <CategorySection type="single_player_game" label="单机游戏" />
      <CategorySection type="online_game" label="网游" />
      <CategorySection type="mobile_game" label="手游" />
    </main>
  );
}
