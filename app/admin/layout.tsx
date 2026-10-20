import { AdminNav } from "@/app/admin/_ui/nav";
import { NotAllowed } from "@/components/NotAllowed";
import { ReportProblem } from "@/components/ReportProblem";
import { requirePageUser } from "@/lib/auth/server";
import "./admin.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser(["admin"], "/admin");
  if (!user) return <NotAllowed />;
  return (
    <div className="ad-shell">
      <AdminNav />
      {children}
      <ReportProblem />
    </div>
  );
}
