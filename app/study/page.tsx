import type { Metadata } from "next";
import { StudentDashboard } from "@/components/StudentDashboard";
import { NotAllowed } from "@/components/NotAllowed";
import { currentLoginId, requirePageUser } from "@/lib/auth/server";
import { previewPlanForLearner, todayPlan } from "@/lib/engine/plan";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";
import { listChapters } from "@/lib/content/catalog";
import { chapterVisibleTo } from "@/lib/content/student";
import { arcadeTiles } from "@/lib/games/arcade-tiles";
import { engineRepo } from "@/lib/engine/repos";
import { getLikes, progressSummary, resumePoint, reteachQueue } from "@/lib/engine/service";

export const metadata: Metadata = {
  title: "Study | Mae's Lab",
};

export default async function StudyIndexPage() {
  const user = await requirePageUser(["student", "admin"], "/study");
  if (!user) return <NotAllowed />;
  const actor = { role: user.role, learnerId: user.learnerId };
  const chapters = listChapters()
    .filter((chapter) => chapterVisibleTo(chapter, user.role))
    .map((chapter) => ({ id: chapter.id, number: chapter.number, titleKid: chapter.titleKid, subject: chapter.subject }));
  const loginId = await currentLoginId().catch(() => null);
  const [resume, progress, likes, reteach, plan] = await Promise.all([
    resumePoint(engineRepo(), actor).catch(() => null),
    progressSummary(engineRepo(), actor).catch(() => ({ rings: [], xp_total: 0, xp_today: 0, streak_days: 0, badges: [] })),
    getLikes(engineRepo(), actor).catch(() => []),
    reteachQueue(engineRepo(), actor).catch(() => []),
    (user.role === "admin" && !user.learnerId
      ? previewPlanForLearner(engineRepo(), SEEDED_LEARNER_ID, loginId)
      : todayPlan(engineRepo(), actor, loginId)
    ).catch((error) => {
      console.error("today_plan_failed", { role: user.role, message: error instanceof Error ? error.message : "unknown" });
      return null;
    }),
  ]);
  const tiles = arcadeTiles({ role: user.role, badges: progress.badges, recommendedSpellingId: "d1" });
  return (
    <>
      <StudentDashboard
        displayName={user.displayName?.split(" ")[0] || "friend"}
        resume={resume ? { chapterId: resume.chapterId, titleKid: resume.titleKid } : null}
        rings={progress.rings}
        xpToday={progress.xp_today}
        xpTotal={progress.xp_total}
        streakDays={progress.streak_days}
        chapters={chapters}
        likes={likes.filter((row) => row.liked).map((row) => row.interestTag)}
        arcadeTiles={tiles}
        plan={
          plan
            ? {
                blocks: plan.blocks.map((b) => ({ id: b.id, kind: b.kind, title: b.title, href: b.href, minutes: b.minutes, done: b.done, detail: b.detail })),
                goalMinutes: plan.goalMinutes,
                minutesToday: plan.minutesToday,
                timeBack: plan.timeBack,
                whyKid: plan.whyKid,
              }
            : null
        }
        tryAgain={reteach.map((row) => ({ href: row.href, chapterTitle: row.chapterTitle, stepNumber: row.stepIndex + 1, startWith: row.startWith }))}
      />
      <nav className="sr-only" aria-label="Games">
        <a href="/spelling-game">Spelling Safari</a>
        <a href="/number-match">Number Match</a>
        <a href="/games">Game Lab</a>
      </nav>
    </>
  );
}
