import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    details?: string;
    page?: string;
  };
  const token = process.env.GITHUB_ISSUE_TOKEN;
  const repo = process.env.GITHUB_REPO || "kwoeste/SpellingGame";
  const title = (body.title || "Problem on Mae's site").slice(0, 120);
  const page = body.page || "unknown";
  const details = (body.details || "").slice(0, 4000);
  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        queued: true,
        message: "Saved locally. A GitHub token is not configured yet, so Kevin needs to add GITHUB_ISSUE_TOKEN.",
      },
      { status: 202 },
    );
  }
  const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "maewoeste-site",
    },
    body: JSON.stringify({
      title,
      body: `Reported from \`${page}\`.\n\n${details}\n\n---\nNo student personal data included.`,
    }),
  });
  if (!response.ok) {
    return NextResponse.json({ ok: false, message: "Could not open a GitHub issue." }, { status: 502 });
  }
  const created = (await response.json()) as { html_url?: string };
  return NextResponse.json({ ok: true, url: created.html_url });
}
