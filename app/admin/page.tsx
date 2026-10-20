import type { Metadata } from "next";
import { OverviewView } from "@/app/admin/_ui/overview";
import { loadOverview } from "@/lib/admin/load";

export const metadata: Metadata = {
  title: "Admin · Today | Mae's Lab",
};

export default async function AdminHomePage() {
  return <OverviewView data={await loadOverview()} />;
}
