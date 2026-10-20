import { SessionTimeline } from "@/app/admin/_ui/sessions";
import { loadSessions } from "@/lib/admin/load";

export default async function SessionsPage() {
  return <SessionTimeline data={await loadSessions()} />;
}
