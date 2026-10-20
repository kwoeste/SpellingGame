import { KnowledgeMapView } from "@/app/admin/_ui/knowledge-map";
import { loadKnowledgeMap } from "@/lib/admin/load";

export default async function KnowledgeMapPage() {
  return <KnowledgeMapView data={await loadKnowledgeMap()} />;
}
