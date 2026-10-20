"use client";

import { CarefulRead } from "@/components/CarefulRead";

type Props = {
  sentences: { id: string; text: string }[];
  highlightId?: string | null;
};

export function ReadAloud({ sentences, highlightId }: Props) {
  return <CarefulRead sentences={sentences} highlightId={highlightId} />;
}
