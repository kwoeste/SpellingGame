import type { Metadata } from "next";
import { UpcomingTestsEditor } from "@/app/admin/upcoming-tests/editor";
import { loadUpcomingTests } from "@/lib/practice/upcoming-store";

export const metadata: Metadata = { title: "Admin · Test dates | Mae's Lab" };
export const dynamic = "force-dynamic";

export default async function UpcomingTestsPage() {
  return (
    <div>
      <h1>Test dates</h1>
      <p>Dated items are pinned first on her Today plan from the start date through the test date, soonest test first, then drop off. Within a day of a test they can fill the whole session.</p>
      <UpcomingTestsEditor initial={await loadUpcomingTests("admin")} />
    </div>
  );
}
