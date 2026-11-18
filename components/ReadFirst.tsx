"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CarefulRead } from "@/components/CarefulRead";

/** She taps every word of the question before the answer controls unlock. */
export function ReadFirst({ text, children }: { text: string; children: (ready: boolean) => ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
  }, [text]);

  return (
    <div>
      <CarefulRead key={text} sentences={[{ id: "prompt", text }]} onReady={setReady} />
      {children(ready)}
      {!ready ? <p className="kid-kicker">Read every word before you answer.</p> : null}
    </div>
  );
}
