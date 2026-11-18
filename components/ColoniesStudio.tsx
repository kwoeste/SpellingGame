"use client";

import { useMemo, useState } from "react";
import { ColoniesMap, type MapFrame, type MapLabel, type MapShape } from "@/components/ColoniesMap";
import { ColonySpellBox } from "@/components/ColonySpell";
import { ReadFirst } from "@/components/ReadFirst";
import { ConfettiLayer } from "@/components/ui/ConfettiBurst";
import { StuckHelpPanel } from "@/components/ui/StuckHelpPanel";
import { useKidPrefs } from "@/components/ui/KidPrefs";
import { colonyBlankIndexes, colonyChoices, colonyShown, colonySpellEqual, colonyTiles, gradeColonySpell, SPELL_CUE } from "@/lib/content/colonies-spell";
import { seededRandom, seededShuffle } from "@/lib/content/shuffle";
import { binGameHelp, spellingHelp } from "@/lib/help/games";
import type { StuckHelp } from "@/lib/help/ladder";
import { assignTestFormats, type TestFormat } from "@/lib/spelling/formats";
import { playSound } from "@/lib/ui/sounds";

type StudioColony = {
  id: string;
  name: string;
  regionId: string;
  regionName: string;
  oops: string;
  trickyAt: number;
  trickyLen: number;
  sentence: string;
};

type StudioRegion = { id: string; name: string; blurb: string; colonies: string[] };
type StudioCard = { front: string; back: string };
type Play = "overview" | "sort" | "map" | "spell" | "cards";

function logStudio(mode: string, detail: string, extra: Record<string, unknown> = {}) {
  void fetch("/api/engine/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entry: "games",
      events: [{ id: crypto.randomUUID(), type: "game_event", payload: { game_id: "ss.colonies", detail, mode, ...extra } }],
    }),
  }).catch(() => undefined);
}

function regionClass(id: string): string {
  if (id === "new-england" || id === "middle" || id === "southern") return `region-${id}`;
  return "";
}

export function ColoniesStudio({
  play,
  frame,
  shapes,
  labels,
  fills,
  strokes,
  regions,
  colonies,
  cards,
  prompts,
}: {
  play: Play;
  chapterId: string;
  frame: MapFrame;
  shapes: MapShape[];
  labels: Record<string, MapLabel>;
  fills: Record<string, string>;
  strokes: Record<string, string>;
  regions: StudioRegion[];
  colonies: StudioColony[];
  cards: StudioCard[];
  prompts: { sort: string; mapName: string; mapTap: string; spell: string; cards: string; overview: string };
}) {
  return (
    <div className="colonies-studio">
      {play === "overview" ? (
        <Overview frame={frame} shapes={shapes} labels={labels} fills={fills} strokes={strokes} regions={regions} prompt={prompts.overview} />
      ) : null}
      {play === "sort" ? <SortGame colonies={colonies} regions={regions} prompt={prompts.sort} /> : null}
      {play === "map" ? <MapGame colonies={colonies} frame={frame} shapes={shapes} promptName={prompts.mapName} promptTap={prompts.mapTap} /> : null}
      {play === "spell" ? <SpellGame colonies={colonies} prompt={prompts.spell} /> : null}
      {play === "cards" ? <CardGame cards={cards} prompt={prompts.cards} /> : null}
      {play !== "overview" ? (
        <p><a className="btn secondary" href="/study/ss.colonies">Back to the chapter</a></p>
      ) : null}
    </div>
  );
}

function Overview({
  frame,
  shapes,
  labels,
  fills,
  strokes,
  regions,
  prompt,
}: {
  frame: MapFrame;
  shapes: MapShape[];
  labels: Record<string, MapLabel>;
  fills: Record<string, string>;
  strokes: Record<string, string>;
  regions: StudioRegion[];
  prompt: string;
}) {
  const prefs = useKidPrefs();
  return (
    <section className="card">
      <h2>The east-coast map</h2>
      <p>{prompt}</p>
      <p>
        <button type="button" className="btn secondary" onClick={() => prefs.speak(regions.map((region) => region.blurb).join(" "))}>
          🔊 Read the regions to me
        </button>
      </p>
      <ColoniesMap frame={frame} shapes={shapes} labels={labels} fills={fills} strokes={strokes} />
      <div className="grid cols-3 colonies-regions">
        {regions.map((region) => (
          <article key={region.id} className={`card ${regionClass(region.id)}`}>
            <h3>{region.name}</h3>
            <p>{region.blurb}</p>
            <p><strong>{region.colonies.join(", ")}</strong></p>
          </article>
        ))}
      </div>
      <p className="kid-kicker">Practice</p>
      <p>
        <a className="btn" href="/study/ss.colonies?play=sort">Sort the regions</a>{" "}
        <a className="btn" href="/study/ss.colonies?play=map">Label the map</a>{" "}
        <a className="btn" href="/study/ss.colonies?play=spell">Spell the names</a>{" "}
        <a className="btn" href="/study/ss.colonies?play=cards">Flashcards</a>
      </p>
    </section>
  );
}

function SortGame({ colonies, regions, prompt }: { colonies: StudioColony[]; regions: StudioRegion[]; prompt: string }) {
  const prefs = useKidPrefs();
  const [seed, setSeed] = useState(1);
  const order = useMemo(() => seededShuffle(colonies, `colonies-sort:${seed}`), [colonies, seed]);
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState("");
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [misses, setMisses] = useState(0);
  const [help, setHelp] = useState<(StuckHelp & { place?: Record<string, string> }) | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [message, setMessage] = useState("");
  const [won, setWon] = useState(false);
  const items = order.map((colony) => ({ label: colony.name, bin: colony.regionName }));
  const leftover = order.filter((colony) => !placed[colony.name]);

  function place(name: string, regionName: string) {
    setPlaced((prev) => ({ ...prev, [name]: regionName }));
    setPicked("");
    setWrong(new Set());
    setMessage("");
    playSound("pair", prefs.soundOn);
  }

  function check() {
    const bad = items.filter((item) => placed[item.label] !== item.bin).map((item) => item.label);
    if (bad.length === 0) {
      setWon(true);
      setWrong(new Set());
      setHelp(null);
      setMessage("Yes! Every colony is in its region.");
      playSound("fanfare", prefs.soundOn);
      prefs.speak("Yes! Every colony is in its region.");
      logStudio("sort", "finished", { score: order.length, total: order.length });
      return;
    }
    const nextMisses = misses + 1;
    setMisses(nextMisses);
    setWrong(new Set(bad));
    setWon(false);
    const nextHelp = binGameHelp(items, placed, nextMisses);
    if (nextHelp?.place) setPlaced((prev) => ({ ...prev, ...nextHelp.place }));
    setHelp(nextHelp);
    setMessage(bad.length === 1 ? "Not yet. One card needs a new region." : `Not yet. ${bad.length} cards need a new region.`);
    playSound("wrong", prefs.soundOn);
    logStudio("sort", "answered", { correct: false, misses: nextMisses });
  }

  return (
    <section className="card">
      {won ? <ConfettiLayer fire /> : null}
      <h2>Sort the colonies</h2>
      <ReadFirst text={prompt}>
        {(ready) => (
          <>
            <div className="chips">
              {leftover.map((colony) => (
                <button
                  key={colony.id}
                  type="button"
                  draggable={ready}
                  className={`tile ${picked === colony.name ? "selected" : ""}`}
                  disabled={!ready}
                  onClick={() => setPicked(colony.name)}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", colony.name);
                    setPicked(colony.name);
                  }}
                >
                  {colony.name}
                </button>
              ))}
            </div>
            <div className="grid cols-3">
              {regions.map((region) => (
                <div
                  key={region.id}
                  className={`drop ${regionClass(region.id)}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const name = event.dataTransfer.getData("text/plain") || picked;
                    if (ready && name) place(name, region.name);
                  }}
                  onClick={() => {
                    if (ready && picked) place(picked, region.name);
                  }}
                >
                  <strong>{region.name}</strong>
                  {order.filter((colony) => placed[colony.name] === region.name).map((colony) => (
                    <p key={colony.id} className={wrong.has(colony.name) ? "misplaced" : ""}>
                      {colony.name}{" "}
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPlaced((prev) => {
                            const next = { ...prev };
                            delete next[colony.name];
                            return next;
                          });
                        }}
                      >
                        Move
                      </button>
                    </p>
                  ))}
                </div>
              ))}
            </div>
            <p>
              <button type="button" className="btn" disabled={!ready || leftover.length > 0} onClick={check}>Check</button>{" "}
              <button type="button" className="btn secondary" onClick={() => { setSeed((n) => n + 1); setPlaced({}); setWon(false); setMisses(0); setHelp(null); setRevealed(false); setMessage(""); }}>
                Mix them up
              </button>
            </p>
          </>
        )}
      </ReadFirst>
      {message ? <p role="status">{message}</p> : null}
      {won ? null : (
        <StuckHelpPanel
          help={help}
          revealed={revealed}
          onShowMe={() => {
            if (!help?.reveal) return;
            setRevealed(true);
            setPlaced(help.reveal.response as Record<string, string>);
            setWrong(new Set());
            prefs.speak(help.reveal.answer);
          }}
          onSkip={() => {
            setPlaced({});
            setMisses(0);
            setHelp(null);
            setRevealed(false);
            setMessage("Okay. Let's try this set again.");
          }}
        />
      )}
    </section>
  );
}

function MapGame({
  colonies,
  frame,
  shapes,
  promptName,
  promptTap,
}: {
  colonies: StudioColony[];
  frame: MapFrame;
  shapes: MapShape[];
  promptName: string;
  promptTap: string;
}) {
  const prefs = useKidPrefs();
  const [seed, setSeed] = useState(1);
  const [mode, setMode] = useState<"name" | "tap">("name");
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState("");
  const [typed, setTyped] = useState("");
  const [message, setMessage] = useState("");
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const order = useMemo(() => seededShuffle(colonies, `colonies-map:${seed}`), [colonies, seed]);
  const colony = order[index];
  const choices = useMemo(() => {
    if (!colony) return [];
    const others = seededShuffle(colonies.filter((item) => item.id !== colony.id), `colonies-map-choice:${seed}:${colony.id}`).slice(0, 3);
    return seededShuffle([colony, ...others], `colonies-map-bank:${seed}:${colony.id}`).map((item) => item.name);
  }, [colony, colonies, seed]);

  function reset(nextSeed: number) {
    setSeed(nextSeed);
    setIndex(0);
    setPicked("");
    setTyped("");
    setMessage("");
    setScore(0);
    setDone(false);
  }

  function advance(correct: boolean) {
    const nextScore = score + (correct ? 1 : 0);
    setScore(nextScore);
    setMessage(correct ? "Yes! That's right." : `Not yet. That shape is ${colony?.name ?? ""}.`);
    prefs.speak(correct ? "Yes! That's right." : `That shape is ${colony?.name ?? ""}.`);
    playSound(correct ? "pair" : "wrong", prefs.soundOn);
    if (index + 1 >= order.length) {
      setDone(true);
      logStudio("map", "finished", { score: nextScore, total: order.length, format: mode });
      return;
    }
    setIndex(index + 1);
    setPicked("");
    setTyped("");
  }

  if (!colony) return null;
  const prompt = mode === "name" ? promptName : `${promptTap} ${colony.name}.`;
  return (
    <section className="card">
      <h2>Label the map</h2>
      <p>
        <button type="button" className={mode === "name" ? "btn" : "btn secondary"} onClick={() => { setMode("name"); reset(seed); }}>Name the lit colony</button>{" "}
        <button type="button" className={mode === "tap" ? "btn" : "btn secondary"} onClick={() => { setMode("tap"); reset(seed + 1); }}>Tap the colony</button>{" "}
        <button type="button" className="btn secondary" onClick={() => reset(seed + 1)}>Mix them up</button>
      </p>
      <p className="kid-kicker">Colony {Math.min(index + 1, order.length)} of {order.length}</p>
      <ColoniesMap
        frame={frame}
        shapes={shapes}
        highlightId={mode === "name" ? colony.id : picked}
        selectedId={mode === "tap" ? picked : null}
        interactive={mode === "tap" && !done}
        onSelect={setPicked}
      />
      {done ? (
        <p role="status">You named {score} of {order.length}. Nice work.</p>
      ) : (
        <ReadFirst text={prompt}>
          {(ready) => mode === "name" ? (
            <>
              <p>
                {choices.map((name) => (
                  <button key={name} type="button" className={picked === name ? "btn" : "btn secondary"} disabled={!ready} style={{ margin: 4 }} onClick={() => setPicked(name)}>
                    {name}
                  </button>
                ))}
              </p>
              <p>
                <input aria-label="Type the colony name" className="pt-blank" value={typed} disabled={!ready} onChange={(event) => setTyped(event.target.value)} />
              </p>
              <button type="button" className="btn" disabled={!ready || (!picked && !typed.trim())} onClick={() => advance(colonySpellEqual(typed.trim() || picked, colony.name))}>
                Check
              </button>
            </>
          ) : (
            <>
              <p className="kid-kicker">{picked ? "Shape picked. Tap Check." : "Tap the colony on the map."}</p>
              <button type="button" className="btn" disabled={!ready || !picked} onClick={() => advance(picked === colony.id)}>Check</button>
            </>
          )}
        </ReadFirst>
      )}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}

function SpellGame({ colonies, prompt }: { colonies: StudioColony[]; prompt: string }) {
  const prefs = useKidPrefs();
  const [seed, setSeed] = useState(1);
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [help, setHelp] = useState<StuckHelp | null>(null);
  const [misses, setMisses] = useState(0);
  const order = useMemo(() => seededShuffle(colonies, `colonies-spell-order:${seed}`), [colonies, seed]);
  const formats = useMemo(() => assignTestFormats(order.length, seededRandom(`colonies-spell:${seed}`)), [order.length, seed]);
  const colony = order[index];
  const format: TestFormat = formats[index] ?? "listen";

  function reset(nextSeed: number) {
    setSeed(nextSeed);
    setIndex(0);
    setValue("");
    setMessage("");
    setScore(0);
    setDone(false);
    setHelp(null);
    setMisses(0);
  }

  if (!colony) return null;
  const shown = format === "blanks" ? colonyShown(colony.name, colonyBlankIndexes(colony.name, colony.trickyAt, colony.trickyLen)) : undefined;
  const tiles = format === "scramble" ? colonyTiles(colony.name, `studio:${seed}:${colony.id}`) : undefined;
  const choices = format === "choice" ? colonyChoices(colony.name, colony.oops, `studio:${seed}:${colony.id}`) : undefined;
  const raw = format === "sentence" ? colony.sentence : SPELL_CUE[format];
  const text = raw.replace(/___/g, "blank");

  function check() {
    const graded = gradeColonySpell(colony.name, format, value, colony.trickyAt, colony.trickyLen);
    if (graded.correct) {
      const nextScore = score + (misses === 0 ? 1 : 0);
      setScore(nextScore);
      setMessage("Yes! Spelled just right.");
      prefs.speak(`Yes! Spelled just right. ${colony.name}`);
      playSound("pair", prefs.soundOn);
      if (index + 1 >= order.length) {
        setDone(true);
        logStudio("spell", "finished", { score: nextScore, total: order.length });
        return;
      }
      setIndex(index + 1);
      setValue("");
      setMisses(0);
      setHelp(null);
      return;
    }
    const nextMisses = misses + 1;
    setMisses(nextMisses);
    setHelp(spellingHelp(colony.name, nextMisses));
    setMessage("Not yet. Check every letter.");
    playSound("wrong", prefs.soundOn);
  }

  return (
    <section className="card">
      <h2>Spell the colony</h2>
      <p>
        <button type="button" className="btn secondary" onClick={() => reset(seed + 1)}>Mix them up</button>
      </p>
      {done ? <p role="status">You spelled {score} of {order.length} on the first try.</p> : (
        <>
          <p className="kid-kicker">Name {index + 1} of {order.length}</p>
          <ReadFirst text={text}>
            {(ready) => (
              <>
                <ColonySpellBox
                  key={`${colony.id}:${format}:${seed}`}
                  format={format}
                  shown={shown}
                  tiles={tiles}
                  choices={choices}
                  disabled={!ready}
                  onValue={setValue}
                  onHear={format === "listen" ? () => prefs.speak(colony.name) : undefined}
                />
                <p><button type="button" className="btn" disabled={!ready || !value.trim()} onClick={check}>Check</button></p>
              </>
            )}
          </ReadFirst>
          {message ? <p role="status">{message}</p> : null}
          <StuckHelpPanel
            help={help}
            revealed={false}
            onShowMe={() => {
              if (!help?.reveal) return;
              prefs.speak(`${help.reveal.answer}. ${help.reveal.why}`);
              setMessage(help.reveal.answer);
            }}
            onSkip={() => {
              setIndex((n) => Math.min(order.length - 1, n + 1));
              setValue("");
              setHelp(null);
              setMisses(0);
              setMessage("");
            }}
          />
        </>
      )}
    </section>
  );
}

function CardGame({ cards, prompt }: { cards: StudioCard[]; prompt: string }) {
  const prefs = useKidPrefs();
  const [seed, setSeed] = useState(1);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const order = useMemo(() => seededShuffle(cards, `colonies-cards:${seed}`), [cards, seed]);
  const card = order[index];
  if (!card) return null;
  return (
    <section className="card">
      <h2>Flashcards</h2>
      <p className="kid-kicker">Card {index + 1} of {order.length}</p>
      <ReadFirst text={prompt}>
        {() => (
          <ReadFirst text={card.front}>
            {(ready) => (
              <>
                <p style={{ fontSize: "1.3em" }}>{flipped ? card.back : "Tap Flip when you have an answer."}</p>
                <p>
                  <button type="button" className="btn" disabled={!ready} onClick={() => { setFlipped(true); prefs.speak(card.back); }}>Flip</button>{" "}
                  <button
                    type="button"
                    className="btn secondary"
                    disabled={!flipped}
                    onClick={() => {
                      if (index + 1 >= order.length) {
                        logStudio("cards", "finished", { total: order.length });
                        setSeed((n) => n + 1);
                        setIndex(0);
                      } else setIndex(index + 1);
                      setFlipped(false);
                    }}
                  >
                    Next card
                  </button>
                </p>
              </>
            )}
          </ReadFirst>
        )}
      </ReadFirst>
    </section>
  );
}
