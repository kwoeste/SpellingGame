import { ProgressViewPanel } from "@/app/admin/_ui/progress";
import { loadProgress } from "@/lib/admin/load";

export default async function ProgressPage() {
  return <ProgressViewPanel data={await loadProgress()} />;
}
