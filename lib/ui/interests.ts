export type InterestCard = {
  tag: string;
  label: string;
  blurb: string;
  icon: string;
  tint: "coral" | "teal" | "gold" | "sky" | "violet" | "rose";
};

export const INTEREST_CARDS: InterestCard[] = [
  { tag: "animals.reptiles", label: "Reptiles", blurb: "Lizards, geckos, and scaly friends", icon: "🦎", tint: "teal" },
  { tag: "animals.snakes", label: "Snakes", blurb: "Gary and other slithery pals", icon: "🐍", tint: "teal" },
  { tag: "animals.dragons", label: "Dragons", blurb: "Bearded dragons and story dragons", icon: "🐉", tint: "gold" },
  { tag: "crafts.fidgets", label: "Fidgets", blurb: "Spinners, cubes, and twisty toys", icon: "🌀", tint: "violet" },
  { tag: "crafts.3d_printing", label: "3D printing", blurb: "Making toys layer by layer", icon: "🖨️", tint: "sky" },
  { tag: "crafts.selling", label: "Shop / selling", blurb: "Mae's free print shop", icon: "🛍️", tint: "coral" },
  { tag: "sports.soccer", label: "Soccer", blurb: "Goals, passes, and teamwork", icon: "⚽", tint: "coral" },
  { tag: "games.puzzles", label: "Puzzles", blurb: "Sorting, matching, and building", icon: "🧩", tint: "rose" },
];
