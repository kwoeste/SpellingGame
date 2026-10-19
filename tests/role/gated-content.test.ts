import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { GET as numberMatch } from "@/app/number-match/route";
import { GET as spellingGame } from "@/app/spelling-game/route";
import { mintTestSession, resetSessions } from "@/lib/auth/sessions";
import { resetMemoryUsers } from "@/lib/auth/users";
import { listChapters } from "@/lib/content/catalog";
import { gameSpec, gameVisibleTo, isGameId } from "@/lib/content/games";

function get(url: string, email?: string): Request {
  const headers = new Headers();
  if (email) headers.set("x-test-session", mintTestSession(email).id);
  return new Request(url, { headers });
}

describe("gated games", () => {
  beforeEach(() => {
    resetSessions();
    resetMemoryUsers();
  });

  it("serves the original games only to signed-in family, with absolute asset paths", async () => {
    const anon = await spellingGame(get("http://local/spelling-game"));
    expect(anon.status).toBe(307);
    expect(anon.headers.get("location")).toContain("/sign-in?from=%2Fspelling-game");
    const ok = await spellingGame(get("http://local/spelling-game", "mae.woeste@gmail.com"));
    expect(ok.status).toBe(200);
    const html = await ok.text();
    expect(html).toContain('"/audio/"');
    expect(html).not.toContain("public/audio/");
    expect((await numberMatch(get("http://local/number-match", "kevinw@mcsteen.com"))).status).toBe(200);
  });

  it("hides religion games from the student until approved", () => {
    expect(gameVisibleTo("beatitudes", "student")).toBe(false);
    expect(gameVisibleTo("beatitudes", "admin")).toBe(true);
    expect(gameVisibleTo("circuit-builder", "student")).toBe(true);
    expect(gameVisibleTo("not-a-game", "admin")).toBe(false);
  });
});

/** Runs after `next build`: public static chunks must not contain Study or game text. */
describe.skipIf(!existsSync(".next/static"))("public static bundle", () => {
  it("contains no chapter passages, questions, or game items", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".js")) files.push(full);
      }
    };
    walk(".next/static");
    const bundle = files.map((file) => readFileSync(file, "utf8")).join("\n");
    const needles = [
      ...listChapters().flatMap((chapter) => [chapter.sentences[0].text, chapter.items.at(-1)?.stem ?? ""]),
      ...["feudal-pyramid", "beatitudes", "ten-commandments"].filter(isGameId).map((id) => gameSpec(id).items[0].label),
    ].filter((needle) => needle.length > 20);
    for (const needle of needles) expect(bundle.includes(needle), needle).toBe(false);
  });
});
