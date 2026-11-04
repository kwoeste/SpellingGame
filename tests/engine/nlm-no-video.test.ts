import { describe, expect, it } from "vitest";
import { nlmArms } from "@/lib/engine/modality";
import { watchListenFor } from "@/lib/content/nlm";
import { firstTeachStart, reteachStart } from "@/components/ChapterPlayer";
import recapVideos from "@/lib/content/recap-video-media.json";

// Chapters imported from NotebookLM with --skip-video (audio + flashcards only).
// Since Nov 4 2026 their video slot is filled by our own narrated recap video
// (lib/content/recap-video-media.json); NotebookLM audio and flashcards are unchanged.
const NO_NLM_VIDEO = ["col.ch4", "col.ch5", "col.ch6", "col.ch7", "col.ch8", "col.ch9", "col.ch10", "col.ch11", "col.ch12", "col.ch13", "col.ch14", "col.ch15", "col.ch16"];

describe("NotebookLM chapters without a NotebookLM video", () => {
  it.each(NO_NLM_VIDEO)("%s offers podcast, flashcards and the recap video", (id) => {
    expect((recapVideos as Record<string, unknown>)[id]).toBeTruthy();
    const arms = nlmArms(id);
    expect(arms).toEqual(expect.arrayContaining(["nlm_podcast", "nlm_flashcards", "nlm_video"]));
    const wl = watchListenFor(id);
    expect(wl?.video).toBe(`/api/engine/media/${id}/video`);
    expect(wl?.audio).toBe(`/api/engine/media/${id}/audio`);
    expect(wl?.flashcards.length).toBeGreaterThanOrEqual(18);
  });

  it.each(NO_NLM_VIDEO)("%s plays the video, podcast or flashcards when the planner asks", (id) => {
    const wl = watchListenFor(id);
    expect(firstTeachStart(true, "nlm_video", wl)).toEqual({ kind: "media", modality: "nlm_video" });
    expect(reteachStart(true, "nlm_podcast", 0, wl)).toEqual({ kind: "media", modality: "nlm_podcast" });
    expect(firstTeachStart(true, "nlm_flashcards", wl)).toEqual({ kind: "media", modality: "nlm_flashcards" });
  });
});
