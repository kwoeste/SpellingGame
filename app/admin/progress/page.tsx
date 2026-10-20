import type { Metadata } from "next";
import { ProgressViewPanel } from "@/app/admin/_ui/progress";
import { loadProgress } from "@/lib/admin/load";

export const metadata: Metadata = {
  title: "Admin · Progress | Mae's Lab",
};

export default async function ProgressPage() {
  return <ProgressViewPanel data={await loadProgress()} />;
}
