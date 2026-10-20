import { SpellingSafari } from "@/components/SpellingSafari";
import { defaultSpellingList } from "@/lib/games/spelling-lists";

export default function SpellingGamePage() {
  return (
    <div className="kid-shell">
      <SpellingSafari list={defaultSpellingList()} />
    </div>
  );
}
