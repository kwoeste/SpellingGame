"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/app/admin/_ui/empty";
import { formatEtDateTime, formatPct } from "@/lib/admin/format";
import { subjectLabel, type KnowledgeMapView, type KnowledgeNode, type MasteryState } from "@/lib/admin/types";
import { tidyId } from "@/lib/admin/subject-names";
import type { SubjectId } from "@/lib/content/types";

const STATES: MasteryState[] = ["mastered", "in_progress", "missing", "not_started", "review_due", "rusty"];

function stateLabel(state: MasteryState): string {
  switch (state) {
    case "mastered":
      return "Mastered";
    case "in_progress":
      return "In progress";
    case "missing":
      return "Not solid yet";
    case "not_started":
      return "Not started";
    case "review_due":
      return "Mastered, check-in due";
    case "rusty":
      return "Needs a refresh";
    default: {
      const unhandled: never = state;
      throw new Error(`Unhandled state: ${String(unhandled)}`);
    }
  }
}

const SUBJECT_ORDER: SubjectId[] = ["ela", "math", "religion", "science"];

const CHAPTER_TAG = /\bCh\s?(\d+)/;

function extractChapterNumber(title: string): number | null {
  const match = title.match(CHAPTER_TAG);
  return match ? parseInt(match[1], 10) : null;
}

export function KnowledgeMapView(props: { data: KnowledgeMapView }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subject, setSubject] = useState<SubjectId | "all">("all");
  const nodes = useMemo(
    () => props.data.nodes.filter((node) => subject === "all" || node.subject === subject),
    [props.data.nodes, subject],
  );
  const selected = nodes.find((node) => node.id === selectedId) ?? null;
  const bySubject = useMemo(() => {
    const groups = new Map<SubjectId, KnowledgeNode[]>();
    for (const node of nodes) {
      const list = groups.get(node.subject) ?? [];
      list.push(node);
      groups.set(node.subject, list);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => {
        if (a.milestoneLevel !== b.milestoneLevel) return a.milestoneLevel - b.milestoneLevel;
        const aNum = extractChapterNumber(a.titleAdmin);
        const bNum = extractChapterNumber(b.titleAdmin);
        if (aNum !== null && bNum !== null) return aNum - bNum;
        return a.titleAdmin.localeCompare(b.titleAdmin);
      });
    }
    return groups;
  }, [nodes]);

  return (
    <div className="pd-wrap">
      <p className="pd-kicker">Knowledge map</p>
      <h1>Skills map</h1>
      <p className="pd-lead">
        Each box is one skill, colored by how well she knows it. Click a skill to see details. &ldquo;Not solid
        yet&rdquo; means she has tried it but still misses it often; it is not missing data. &ldquo;Mastered, check-in due&rdquo; is a skill she knows that is scheduled for a quick
        check; &ldquo;Needs a refresh&rdquo; means that check is long overdue or she missed it.
      </p>
      <div className="pd-legend">
        {STATES.map((state) => (
          <span key={state}>
            <i className="pd-dot" data-state={state} style={{ background: "currentColor" }} />
            <span className={`pd-pill ${state}`}>{stateLabel(state)}</span>
          </span>
        ))}
      </div>
      <div className="pd-filters">
        <select value={subject} onChange={(event) => setSubject(event.target.value as SubjectId | "all")}>
          <option value="all">All subjects</option>
          <option value="ela">Reading</option>
          <option value="math">Math</option>
          <option value="religion">Religion</option>
          <option value="science">Science</option>
        </select>
      </div>
      {nodes.length === 0 ? (
        <EmptyState title="No concepts in this filter" body="The catalog will show nodes even before Mae practices. Try All subjects." />
      ) : (
        <div className="pd-map">
          <div className="pd-map-canvas">
            {SUBJECT_ORDER.map((key) => {
              const list = bySubject.get(key) ?? [];
              if (list.length === 0) return null;
              const frontier = props.data.frontiers.find((row) => row.subject === key)?.frontier;
              const solid = list.filter((n) => n.state === "mastered" || n.state === "review_due").length;
              const tried = list.filter((n) => n.attempts > 0).length;
              const levels = new Set(list.map((n) => n.milestoneLevel));
              const sameLevel = levels.size === 1 ? list[0].milestoneLevel : null;
              return (
                <details className="pd-group" key={key} open={subject !== "all" || tried > 0}>
                  <summary>
                    {subjectLabel(key)}
                    <span className="pd-note">
                      {solid} of {list.length} mastered · {tried} tried
                      {frontier != null ? ` · working at about grade ${Number(frontier).toFixed(1)}` : ""}
                      {sameLevel !== null ? ` · all grade level ${sameLevel}` : ""}
                    </span>
                  </summary>
                  <div className="pd-node-grid">
                    {list.map((node) => (
                      <button
                        key={node.id}
                        type="button"
                        className="pd-node"
                        data-state={node.state}
                        onClick={() => setSelectedId(node.id)}
                        aria-pressed={selectedId === node.id}
                      >
                        <strong>{node.titleAdmin}</strong>
                        <span>
                          {stateLabel(node.state)} · {node.attempts} {node.attempts === 1 ? "try" : "tries"}
                          {sameLevel === null ? ` · Grade level ${node.milestoneLevel}` : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
          <aside className="pd-card">
            <h2>Skill details</h2>
            {!selected ? (
              <EmptyState title="Pick a skill" body="Click a skill to see how well she knows it, how many tries, and when she last practiced it." />
            ) : (
              <dl className="pd-detail">
                <dt>Skill</dt>
                <dd>{selected.titleAdmin}</dd>
                <dt>What Mae sees</dt>
                <dd>{selected.titleKid}</dd>
                <dt>State</dt>
                <dd>
                  <span className={`pd-pill ${selected.state}`}>{stateLabel(selected.state)}</span>
                </dd>
                <dt>Chance she knows it</dt>
                <dd>{formatPct(selected.pMastery, 0)}</dd>
                <dt>Grade level</dt>
                <dd>{selected.milestoneLevel}</dd>
                <dt>Attempts</dt>
                <dd>
                  {selected.attempts} ({selected.correctUnhinted} right on the first try without a hint)
                </dd>
                <dt>Last seen</dt>
                <dd>{selected.lastPracticedAt ? formatEtDateTime(selected.lastPracticedAt) : "Never"}</dd>
                <dt>Next check-in</dt>
                <dd>{selected.reviewDueAt ? formatEtDateTime(selected.reviewDueAt) : "—"}</dd>
                <dt>Standards</dt>
                <dd>{selected.standardCodes.join(", ") || "—"}</dd>
                <dt>Prerequisites</dt>
                <dd>
                  {props.data.edges
                    .filter((edge) => edge.to === selected.id)
                    .map((edge) => props.data.nodes.find((n) => n.id === edge.from)?.titleAdmin ?? tidyId(edge.from))
                    .join(", ") || "None"}
                </dd>
              </dl>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
