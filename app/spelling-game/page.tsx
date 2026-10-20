import type { Metadata } from "next";
import { SpellingSafari } from "@/components/SpellingSafari";
import { defaultSpellingList } from "@/lib/games/spelling-lists";

const list = defaultSpellingList();

export const metadata: Metadata = {
  title: `Spelling Safari · ${list.shortTitle} | Mae's Lab`,
};

export default function SpellingGamePage() {
  return (
    <div className="kid-shell">
      <SpellingSafari list={list} />
    </div>
  );
}
