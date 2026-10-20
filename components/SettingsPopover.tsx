"use client";

import { useState, useEffect, useCallback } from "react";
import { VoicePicker } from "@/components/ui/VoicePicker";

export function SettingsPopover() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        className="settings-gear-btn"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-label="Settings"
      >
        ⚙️
      </button>
      {open && (
        <div className="settings-modal-backdrop" onClick={close}>
          <div
            className="settings-modal"
            role="dialog"
            aria-label="Settings"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings-modal-header">
              <h3>Settings</h3>
              <button type="button" className="settings-close-btn" onClick={close} aria-label="Close">
                ✕
              </button>
            </div>
            <p className="kid-kicker" style={{ marginBottom: 8 }}>Voice &amp; Speed</p>
            <p style={{ fontSize: "0.95rem", margin: "0 0 14px", color: "var(--muted)" }}>
              Pick how Mae reads to you. Used in Study and games.
            </p>
            <VoicePicker />
          </div>
        </div>
      )}
    </>
  );
}
