import type { Metadata } from "next";
import { LearnsBest } from "@/app/admin/_ui/learns-best";
import { loadLearnsBest } from "@/lib/admin/load";

export const metadata: Metadata = {
  title: "Admin · How Mae learns best | Mae's Lab",
};
export const dynamic = "force-dynamic";

export default async function LearnsBestPage() {
  return <LearnsBest data={await loadLearnsBest()} />;
}
