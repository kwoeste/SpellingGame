"use client";

import { useEffect, useState } from "react";
import type { SpellFormatName } from "@/lib/practice/types";

function TypedAnswer({
  disabled,
  onValue,
  onHear,
  label,
}: {
  disabled?: boolean;
  onValue: (value: string) => void;
  onHear?: () => void;
  label: string;
}) {
  const [text, setText] = useState("");
  useEffect(() => {
    onValue(text);
  }, [onValue, text]);
  return (
    <p>
      {onHear ? (
        <button type="button" className="btn secondary" disabled={disabled} onClick={onHear}>
          🔊 Hear the colony
        </button>
      ) : null}{" "}
      <input
        aria-label={label}
        className="pt-blank"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        value={text}
        disabled={disabled}
        onChange={(event) => setText(event.target.value)}
        style={{ minWidth: 180, fontSize: "1.15em" }}
      />
    </p>
  );
}

function BlankLetters({ shown, disabled, onValue }: { shown: string[]; disabled?: boolean; onValue: (letters: string) => void }) {
  const count = shown.filter((ch) => ch === "").length;
  const [letters, setLetters] = useState<string[]>(() => Array.from({ length: count }, () => ""));
  useEffect(() => {
    onValue(letters.join(""));
  }, [letters, onValue]);
  let blank = 0;
  return (
    <p className="spell-row" aria-label="Missing letters">
      {shown.map((ch, index) => {
        if (ch === " ") return <span key={index} className="spell-gap" aria-hidden="true" />;
        if (ch !== "") return <span key={index} className="spell-fixed">{ch}</span>;
        const slot = blank;
        blank += 1;
        return (
          <input
            key={index}
            aria-label={`Missing letter ${slot + 1}`}
            className="pt-blank spell-box"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={1}
            value={letters[slot] ?? ""}
            disabled={disabled}
            onChange={(event) => {
              const next = event.target.value.slice(-1);
              setLetters((prev) => prev.map((item, i) => (i === slot ? next : item)));
            }}
          />
        );
      })}
    </p>
  );
}

function ScrambleTiles({ tiles, disabled, onValue }: { tiles: string[]; disabled?: boolean; onValue: (joined: string) => void }) {
  const [placed, setPlaced] = useState<number[]>([]);
  useEffect(() => {
    onValue(placed.map((index) => tiles[index] ?? "").join(""));
  }, [onValue, placed, tiles]);
  const used = new Set(placed);
  return (
    <div>
      <p className="kid-kicker">Your spelling</p>
      <div className="spell-row">
        {placed.length === 0 ? <span className="kid-kicker">Tap the letters in order.</span> : null}
        {placed.map((index, order) => (
          <button
            key={`${index}-${order}`}
            type="button"
            className="tile spell-tile"
            disabled={disabled}
            onClick={() => setPlaced((prev) => prev.filter((item) => item !== index))}
          >
            {tiles[index] === " " ? "space" : tiles[index]}
          </button>
        ))}
      </div>
      <p className="kid-kicker">Letters</p>
      <div className="spell-row">
        {tiles.map((tile, index) => used.has(index) ? null : (
          <button
            key={`${tile}-${index}`}
            type="button"
            className="tile spell-tile"
            disabled={disabled}
            aria-label={tile === " " ? "space" : tile}
            onClick={() => setPlaced((prev) => [...prev, index])}
          >
            {tile === " " ? "space" : tile}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ColonySpellBox({
  format,
  shown,
  tiles,
  choices,
  disabled,
  onValue,
  onHear,
}: {
  format: SpellFormatName;
  shown?: string[];
  tiles?: string[];
  choices?: string[];
  disabled?: boolean;
  onValue: (value: string) => void;
  onHear?: () => void;
}) {
  switch (format) {
    case "listen":
      return <TypedAnswer disabled={disabled} onValue={onValue} onHear={onHear} label="Type the colony you hear" />;
    case "sentence":
      return <TypedAnswer disabled={disabled} onValue={onValue} label="Type the colony" />;
    case "blanks":
      return <BlankLetters shown={shown ?? []} disabled={disabled} onValue={onValue} />;
    case "scramble":
      return <ScrambleTiles tiles={tiles ?? []} disabled={disabled} onValue={onValue} />;
    case "choice":
      return <SpellChoices choices={choices ?? []} disabled={disabled} onValue={onValue} />;
    default: {
      const unreachable: never = format;
      return unreachable;
    }
  }
}

function SpellChoices({ choices, disabled, onValue }: { choices: string[]; disabled?: boolean; onValue: (value: string) => void }) {
  const [picked, setPicked] = useState("");
  return (
    <div role="radiogroup" aria-label="Spellings">
      {choices.map((choice) => (
        <p key={choice}>
          <button
            type="button"
            role="radio"
            aria-checked={picked === choice}
            className={picked === choice ? "btn" : "btn secondary"}
            disabled={disabled}
            onClick={() => {
              setPicked(choice);
              onValue(choice);
            }}
          >
            {choice}
          </button>
        </p>
      ))}
    </div>
  );
}
