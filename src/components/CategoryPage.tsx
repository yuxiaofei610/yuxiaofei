import CategoryBrowser from "./CategoryBrowser";
import { CATEGORIES } from "@/lib/categories";
import { prefetchContent } from "@/lib/adapters";
import { ContentType } from "@/lib/types";

// 服务端预取分类页默认 tab 的数据并直出，避免手机端白屏。
export default async function CategoryPage({ type, title }: { type: ContentType; title: string }) {
  const cats = CATEGORIES[type];
  const cat = cats[0]?.key ?? "popular";
  const { items, isMock } = await prefetchContent(type, cat, 24);
  return (
    <CategoryBrowser
      type={type}
      title={title}
      initialCategory={cat}
      initialItems={items}
      initialIsMock={isMock}
    />
  );
}
