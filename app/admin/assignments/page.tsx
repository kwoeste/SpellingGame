import type { Metadata } from "next";
import { AssignmentsPanel } from "@/app/admin/_ui/assignments";
import { loadAssignments } from "@/lib/admin/load";

export const metadata: Metadata = {
  title: "Admin · Assignments | Mae's Lab",
};

export default async function AssignmentsPage() {
  return <AssignmentsPanel data={await loadAssignments()} />;
}
