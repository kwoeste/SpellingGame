import type { Metadata } from "next";
import { NumberMatch } from "@/components/NumberMatch";

export const metadata: Metadata = {
  title: "Number Match | Mae's Lab",
};

export default function NumberMatchPage() {
  return (
    <div className="kid-shell">
      <NumberMatch />
    </div>
  );
}
