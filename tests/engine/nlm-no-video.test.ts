import { describe, expect, it } from "vitest";
import { nlmArms } from "@/lib/engine/modality";
import { watchListenFor } from "@/lib/content/nlm";
import { firstTeachStart, reteachStart } from "@/components/ChapterPlayer";

// Real manifest: chapters imported with --skip-video (audio + flashcards only).
// savvas.ch8 video failed review (held back for a redo).
const NO_VIDEO = ["savvas.ch8", "col.ch1", "col.ch3", "col.ch4", "col.ch5", "col.ch6", "col.ch7", "col.ch8", "col.ch9", "col.ch10", "col.ch11", "col.ch12", "col.ch13", "col.ch14", "col.ch15", "col.ch16"];

describe("NotebookLM modalities without a video", () => {
  it.each(NO_VIDEO)("%s offers podcast + flashcards arms, never video", (id) => {
    const arms = nlmArms(id);
    expect(arms).toEqual(expect.arrayContaining(["nlm_podcast", "nlm_flashcards"]));
    expect(arms).not.toContain("nlm_video");
    const wl = watchListenFor(id);
    expect(wl?.video).toBeNull();
    expect(wl?.audio).toBe(`/api/engine/media/${id}/audio`);
    expect(wl?.flashcards.length).toBeGreaterThanOrEqual(18);
  });

  it.each(NO_VIDEO)("%s falls back when the planner asks for video, and uses podcast/flashcards when asked", (id) => {
    const wl = watchListenFor(id);
    expect(reteachStart(true, "nlm_video", 0, wl)).not.toEqual(expect.objectContaining({ kind: "media" }));
    expect(firstTeachStart(true, "nlm_video", wl)).not.toEqual(expect.objectContaining({ kind: "media" }));
    expect(reteachStart(true, "nlm_podcast", 0, wl)).toEqual({ kind: "media", modality: "nlm_podcast" });
    expect(firstTeachStart(true, "nlm_flashcards", wl)).toEqual({ kind: "media", modality: "nlm_flashcards" });
  });
});
