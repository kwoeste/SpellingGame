"use client";

import { useState, useRef, useEffect } from "react";
import { VoicePicker } from "@/components/ui/VoicePicker";

export function SettingsPopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="settings-popover-wrap" ref={ref}>
      <button
        type="button"
        className="settings-gear-btn"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Settings"
      >
        ⚙️
      </button>
      {open && (
        <div className="settings-popover">
          <p className="kid-kicker">Settings</p>
          <h3 style={{ margin: "0 0 12px" }}>Voice &amp; Speed</h3>
          <p style={{ fontSize: "0.9rem", margin: "0 0 12px", color: "var(--muted)" }}>
            Pick how Mae reads to you. Used in Study and games.
          </p>
          <VoicePicker />
        </div>
      )}
    </div>
  );
}
