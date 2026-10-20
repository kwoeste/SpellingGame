import type { Metadata } from "next";
import { SessionTimeline } from "@/app/admin/_ui/sessions";
import { loadSessions } from "@/lib/admin/load";

export const metadata: Metadata = {
  title: "Admin · Sessions | Mae's Lab",
};

export default async function SessionsPage() {
  return <SessionTimeline data={await loadSessions()} />;
}
