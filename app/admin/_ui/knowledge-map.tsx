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
    for (const list of groups.values()) list.sort((a, b) => a.milestoneLevel - b.milestoneLevel || a.titleAdmin.localeCompare(b.titleAdmin));
    return groups;
  }, [nodes]);

  return (
    <div className="ad-wrap">
      <p className="ad-kicker">Knowledge map</p>
      <h1>Concepts</h1>
      <p className="ad-lead">
        Nodes color by state. Size is not used; attempt count is in the drill-down with P(L), Elo,
        and last seen. Click a node.
      </p>
      <div className="ad-legend">
        {STATES.map((state) => (
          <span key={state}>
            <i className="ad-dot" data-state={state} style={{ background: "currentColor" }} />
            <span className={`ad-pill ${state}`}>{stateLabel(state)}</span>
          </span>
        ))}
      </div>
      <div className="ad-filters">
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
        <div className="ad-map">
          <div className="ad-map-canvas">
            <div className="ad-columns">
              {(["math", "science", "ela", "religion"] as SubjectId[]).map((key) => {
                const list = bySubject.get(key) ?? [];
                if (subject !== "all" && subject !== key) return null;
                return (
                  <div className="ad-col" key={key}>
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
                        className="ad-node"
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
            </div>
          </div>
          <aside className="ad-card">
            <h2>Drill-down</h2>
            {!selected ? (
              <EmptyState title="Pick a node" body="P(L), Elo, attempts, and last seen stay here so the map stays readable." />
            ) : (
              <dl className="ad-detail">
                <dt>Concept</dt>
                <dd>{selected.titleAdmin}</dd>
                <dt>Kid title</dt>
                <dd>{selected.titleKid}</dd>
                <dt>State</dt>
                <dd>
                  <span className={`ad-pill ${selected.state}`}>{stateLabel(selected.state)}</span>
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
