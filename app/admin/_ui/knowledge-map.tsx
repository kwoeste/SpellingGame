"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/app/admin/_ui/empty";
import { formatEtDateTime, formatPct } from "@/lib/admin/format";
import { subjectLabel, type KnowledgeMapView, type KnowledgeNode, type MasteryState } from "@/lib/admin/types";
import type { SubjectId } from "@/lib/content/types";

const STATES: MasteryState[] = ["mastered", "in_progress", "missing", "not_started", "review_due", "rusty"];

function stateLabel(state: MasteryState): string {
  switch (state) {
    case "mastered":
      return "Mastered";
    case "in_progress":
      return "In progress";
    case "missing":
      return "Missing";
    case "not_started":
      return "Not started";
    case "review_due":
      return "Review due";
    case "rusty":
      return "Rusty";
    default: {
      const unhandled: never = state;
      throw new Error(`Unhandled state: ${String(unhandled)}`);
    }
  }
}

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

  const elaSkills = useMemo(() => {
    const list = bySubject.get("ela") ?? [];
    return list.filter((node) => node.kind === "reading_skill" || !CHAPTER_TAG.test(node.titleAdmin));
  }, [bySubject]);

  const elaChapters = useMemo(() => {
    const list = bySubject.get("ela") ?? [];
    return list.filter((node) => node.kind !== "reading_skill" && CHAPTER_TAG.test(node.titleAdmin));
  }, [bySubject]);

  return (
    <div className="pd-wrap">
      <p className="pd-kicker">Knowledge map</p>
      <h1>Concepts</h1>
      <p className="pd-lead">
        Nodes color by state. Size is not used; attempt count is in the drill-down with P(L), Elo,
        and last seen. Click a node.
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
          <option value="math">Math</option>
          <option value="science">Science</option>
          <option value="ela">ELA</option>
          <option value="religion">Religion</option>
        </select>
      </div>
      {nodes.length === 0 ? (
        <EmptyState title="No concepts in this filter" body="The catalog will show nodes even before Mae practices. Try All subjects." />
      ) : (
        <div className="pd-map">
          <div className="pd-map-canvas">
            <div className="pd-columns pd-columns-wide">
              {(["math", "science", "religion"] as SubjectId[]).map((key) => {
                const list = bySubject.get(key) ?? [];
                if (subject !== "all" && subject !== key) return null;
                return (
                  <div className="pd-col" key={key}>
                    <h3>
                      {subjectLabel(key)}
                      {props.data.frontiers.find((row) => row.subject === key)?.frontier != null
                        ? ` · frontier ${props.data.frontiers.find((row) => row.subject === key)?.frontier}`
                        : ""}
                    </h3>
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
                          {stateLabel(node.state)} · {node.attempts} tries · {node.milestoneLevel}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
              {(subject === "all" || subject === "ela") && (
                <>
                  <div className="pd-col">
                    <h3>ELA Skills</h3>
                    {elaSkills.map((node) => (
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
                          {stateLabel(node.state)} · {node.attempts} tries · {node.milestoneLevel}
                        </span>
                      </button>
                    ))}
                  </div>
                  {elaChapters.length > 0 && (
                    <div className="pd-col">
                      <h3>ELA Chapters</h3>
                      {elaChapters.map((node) => (
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
                            {stateLabel(node.state)} · {node.attempts} tries · {node.milestoneLevel}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <aside className="pd-card">
            <h2>Drill-down</h2>
            {!selected ? (
              <EmptyState title="Pick a node" body="P(L), Elo, attempts, and last seen stay here so the map stays readable." />
            ) : (
              <dl className="pd-detail">
                <dt>Concept</dt>
                <dd>{selected.titleAdmin}</dd>
                <dt>Kid title</dt>
                <dd>{selected.titleKid}</dd>
                <dt>State</dt>
                <dd>
                  <span className={`pd-pill ${selected.state}`}>{stateLabel(selected.state)}</span>
                </dd>
                <dt>P(L)</dt>
                <dd>{formatPct(selected.pMastery, 0)}</dd>
                <dt>Elo θ</dt>
                <dd>{selected.theta.toFixed(2)}</dd>
                <dt>Attempts</dt>
                <dd>
                  {selected.attempts} ({selected.correctUnhinted} first-try unhinted)
                </dd>
                <dt>Last seen</dt>
                <dd>{selected.lastPracticedAt ? formatEtDateTime(selected.lastPracticedAt) : "Never"}</dd>
                <dt>Review due</dt>
                <dd>{selected.reviewDueAt ? formatEtDateTime(selected.reviewDueAt) : "—"}</dd>
                <dt>Standards</dt>
                <dd>{selected.standardCodes.join(", ") || "—"}</dd>
                <dt>Prerequisites</dt>
                <dd>
                  {props.data.edges
                    .filter((edge) => edge.to === selected.id)
                    .map((edge) => edge.from)
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
