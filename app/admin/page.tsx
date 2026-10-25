import type { Metadata } from "next";
import { HomeSummaryView } from "@/app/admin/_ui/home-summary";
import { OverviewView } from "@/app/admin/_ui/overview";
import { loadHome, loadOverview } from "@/lib/admin/load";

export const metadata: Metadata = {
  title: "Admin · Today | Mae's Lab",
};

export default async function AdminHomePage() {
  const [overview, home] = await Promise.all([loadOverview(), loadHome()]);
  return <OverviewView data={overview} summary={<HomeSummaryView data={home} />} />;
}
