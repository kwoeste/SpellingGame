import { NotAllowed } from "@/components/NotAllowed";
import { ReportProblem } from "@/components/ReportProblem";
import { requirePageUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function StudyLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser(["student", "admin"], "/study");
  if (!user) return <NotAllowed />;
  return (
    <>
      {children}
      <ReportProblem />
    </>
  );
}
