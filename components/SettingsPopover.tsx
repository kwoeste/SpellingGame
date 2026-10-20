"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { VoicePicker } from "@/components/ui/VoicePicker";

export function SettingsPopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        close();
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open, close]);

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
        <div className="settings-popover" role="dialog" aria-label="Settings">
          <div className="settings-popover-header">
            <p className="kid-kicker">Settings</p>
            <button type="button" className="settings-close-btn" onClick={close} aria-label="Close">
              ✕
            </button>
          </div>
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
