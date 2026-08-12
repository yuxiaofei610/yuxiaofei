import HistoryList from "@/components/HistoryList";
import { CONTENT_TYPE_LABELS, ContentType } from "@/lib/types";

const FILTERS: ContentType[] = (Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).filter(
  (t) => t !== "mobile_game" && t !== "online_game" && t !== "single_player_game"
);

export default function Page() {
  return <HistoryList listType="watched" filters={FILTERS} title="已看" />;
}
