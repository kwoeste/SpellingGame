import { OverviewView } from "@/app/admin/_ui/overview";
import { loadOverview } from "@/lib/admin/load";

export default async function AdminHomePage() {
  return <OverviewView data={await loadOverview()} />;
}
