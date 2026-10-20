import type { Metadata } from "next";
import { KnowledgeMapView } from "@/app/admin/_ui/knowledge-map";
import { loadKnowledgeMap } from "@/lib/admin/load";

export const metadata: Metadata = {
  title: "Admin · Knowledge Map | Mae's Lab",
};

export default async function KnowledgeMapPage() {
  return <KnowledgeMapView data={await loadKnowledgeMap()} />;
}
