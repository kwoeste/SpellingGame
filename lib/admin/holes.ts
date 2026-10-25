import { targetName } from "@/lib/admin/names";
import { catalogConcept, catalogConcepts, hardPrereqs } from "@/lib/admin/catalog";
import type { Alert, KnowledgeNode, MasteryState } from "@/lib/admin/types";

const HOLE_P = 0.6;
const WEAK_P = 0.85;

function parentsOf(conceptId: string): string[] {
  return hardPrereqs().filter((edge) => edge.to === conceptId).map((edge) => edge.from);
}

function isHoleState(state: MasteryState, pMastery: number): boolean {
  return state === "missing" || state === "rusty" || pMastery < HOLE_P;
}

/** Walk hard prerequisites of in-progress or missing nodes; deepest blockers first. */
export function detectHoles(nodes: KnowledgeNode[], now = Date.now()): Alert[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  const holes: Alert[] = [];

  const visit = (conceptId: string, blocked: string, depth: number): void => {
    if (depth > 3 || seen.has(conceptId)) return;
    const node = byId.get(conceptId);
    const catalog = catalogConcept(conceptId);
    if (!node) {
      if (catalog) {
        seen.add(conceptId);
        holes.push({
          kind: "hole",
          title: `Not started yet: ${catalog.titleAdmin}`,
          detail: `Not practiced yet, and it comes before ${catalogConcept(blocked)?.titleAdmin ?? targetName(blocked)}.`,
          targetType: "concept",
          targetId: conceptId,
          severity: 2,
        });
      }
      return;
    }
    if (isHoleState(node.state, node.pMastery)) {
      seen.add(conceptId);
      const child = catalogConcept(blocked);
      holes.push({
        kind: "hole",
        title: `Gap to fill: ${node.titleAdmin}`,
        detail: `Needed for ${child?.titleAdmin ?? targetName(blocked)}. She knows it about ${(node.pMastery * 100).toFixed(0)}%.`,
        targetType: "concept",
        targetId: conceptId,
        severity: node.state === "rusty" ? 3 : 2,
      });
      for (const parent of parentsOf(conceptId)) visit(parent, conceptId, depth + 1);
      return;
    }
    if (node.pMastery < WEAK_P) {
      const stale = !node.lastPracticedAt || now - node.lastPracticedAt > 7 * 24 * 60 * 60 * 1000;
      if (stale) {
        seen.add(conceptId);
        holes.push({
          kind: "hole",
          title: `Earlier skill getting shaky: ${node.titleAdmin}`,
          detail: `She knows it about ${(node.pMastery * 100).toFixed(0)}% and has not practiced in 7 days. Worth a quick check before ${catalogConcept(blocked)?.titleAdmin ?? targetName(blocked)}.`,
          targetType: "concept",
          targetId: conceptId,
          severity: 1,
        });
      }
    }
  };

  for (const node of nodes) {
    if (node.state === "in_progress" || node.state === "missing" || node.state === "rusty") {
      for (const parent of parentsOf(node.id)) visit(parent, node.id, 0);
    }
  }

  for (const concept of catalogConcepts()) {
    const node = byId.get(concept.id);
    if (!node && parentsOf(concept.id).length === 0) continue;
  }

  return holes.sort((a, b) => b.severity - a.severity || a.title.localeCompare(b.title));
}
