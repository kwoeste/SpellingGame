import type { Metadata } from "next";
import { NotAllowed } from "@/components/NotAllowed";
import { ProgressView } from "@/components/ProgressView";
import { requirePageUser } from "@/lib/auth/server";
import { listChapters } from "@/lib/content/catalog";
import { chapterVisibleTo } from "@/lib/content/student";
import { engineRepo } from "@/lib/engine/repos";
import { studentProgress } from "@/lib/engine/service";

export const metadata: Metadata = {
  title: "My Progress | Mae's Lab",
};

export default async function MyProgressPage() {
  const user = await requirePageUser(["student", "admin"], "/my-progress");
  if (!user) return <NotAllowed />;

  const actor = { role: user.role, learnerId: user.learnerId };
  const progress = await studentProgress(engineRepo(), actor);
  const allChapters = listChapters()
    .filter((ch) => chapterVisibleTo(ch, user.role))
    .map((ch) => ({ id: ch.id, titleKid: ch.titleKid, subject: ch.subject }));

  return (
    <div className="kid-shell">
      <p className="kid-kicker">Your journey</p>
      <h1>My Progress</h1>
      <ProgressView
        displayName={user.displayName?.split(" ")[0] || "friend"}
        progress={progress}
        allChapters={allChapters}
      />
    </div>
  );
}
