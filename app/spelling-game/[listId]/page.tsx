import { notFound } from "next/navigation";
import { SpellingSafari } from "@/components/SpellingSafari";
import { getSpellingList } from "@/lib/games/spelling-lists";

export default async function SpellingListPage({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = await params;
  const list = getSpellingList(listId);
  if (!list || list.id === "d1") notFound();
  return (
    <div className="kid-shell">
      <SpellingSafari list={list} />
    </div>
  );
}
