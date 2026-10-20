import { AssignmentsPanel } from "@/app/admin/_ui/assignments";
import { loadAssignments } from "@/lib/admin/load";

export default async function AssignmentsPage() {
  return <AssignmentsPanel data={await loadAssignments()} />;
}
