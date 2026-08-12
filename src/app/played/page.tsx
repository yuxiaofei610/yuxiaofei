import HistoryList from "@/components/HistoryList";
import { ContentType } from "@/lib/types";

const FILTERS: ContentType[] = ["mobile_game", "online_game", "single_player_game"];

export default function Page() {
  return <HistoryList listType="played" filters={FILTERS} title="已玩" />;
}
