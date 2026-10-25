import type { CompactRecap, SlideSeed, TryAtHome } from "@/lib/content/recaps";

/**
 * Multiplication recaps. Every picture is drawn by scripts/render-math-visuals.py from `visual`, so the
 * dots in the picture always match the fact in the sentence (tests re-check the arithmetic).
 */
export type MathVisual =
  | { kind: "groups"; groups: number; each: number }
  | { kind: "array"; rows: number; cols: number }
  | { kind: "split"; rows: number; cols: number; first: number; fade?: boolean }
  | { kind: "rods"; tens: number }
  | { kind: "hops"; step: number; count: number };

export type MathSlide = { visual: MathVisual; text: string };

export function visualValue(v: MathVisual): number {
  switch (v.kind) {
    case "groups":
      return v.groups * v.each;
    case "array":
      return v.rows * v.cols;
    case "split":
      return v.fade ? v.first * v.cols : v.rows * v.cols;
    case "rods":
      return v.tens * 10;
    case "hops":
      return v.step * v.count;
  }
}

export function visualAlt(v: MathVisual): string {
  switch (v.kind) {
    case "groups":
      return `${v.groups} circles with ${v.each} dots in each circle`;
    case "array":
      return `An array of dots with ${v.rows} rows and ${v.cols} in each row`;
    case "split":
      return v.fade
        ? `An array with ${v.rows} rows of ${v.cols} dots; the last ${v.rows - v.first} row is faded out`
        : `An array with ${v.rows} rows of ${v.cols} dots; the first ${v.first} rows are one color and the other ${v.rows - v.first} another color`;
    case "rods":
      return `${v.tens} bars, each made of 10 cubes`;
    case "hops":
      return `A number line with ${v.count} hops of ${v.step} each`;
  }
}

type MathSeed = {
  slides: MathSlide[];
  check: { a: number; b: number; choices: number[]; answer: number };
  tryAtHome: TryAtHome;
};

const g = (groups: number, each: number): MathVisual => ({ kind: "groups", groups, each });
const a = (rows: number, cols: number): MathVisual => ({ kind: "array", rows, cols });
const h = (step: number, count: number): MathVisual => ({ kind: "hops", step, count });
const sp = (rows: number, cols: number, first: number, fade = false): MathVisual => ({ kind: "split", rows, cols, first, fade });
const r = (tens: number): MathVisual => ({ kind: "rods", tens });

export const MATH_SEEDS: Record<string, MathSeed> = {
  "math.mult.2s": {
    slides: [
      { visual: g(2, 3), text: "Two groups of 3 make 6. 3 + 3 = 6, so 2 × 3 = 6." },
      { visual: a(2, 5), text: "This array has 2 rows of 5. 2 × 5 = 10." },
      { visual: h(2, 6), text: "Skip-count by 2s: 2, 4, 6, 8, 10, 12." },
      { visual: g(2, 4), text: "Doubling 4 means 4 + 4 = 8. So 2 × 4 = 8." },
      { visual: a(2, 7), text: "2 × 7 = 14. Every 2s answer is even!" },
      { visual: g(5, 2), text: "Socks come in pairs. Five pairs is 5 × 2 = 10 socks." },
    ],
    check: { a: 2, b: 5, choices: [1, 4, 3], answer: 1 },
    tryAtHome: {
      title: "Bean doubles",
      materials: ["a handful of dry beans", "2 small cups"],
      steps: ["Pick a number from 1 to 10.", "Put that many beans in each cup.", "Count all the beans. That is your number doubled!", "Try three more numbers and say each 2s fact out loud."],
      safety: "Beans are for counting, not eating. Keep them away from little kids.",
    },
  },
  "math.mult.5s": {
    slides: [
      { visual: g(4, 5), text: "Four groups of 5 make 20. 5 × 4 = 20." },
      { visual: h(5, 4), text: "Skip-count by 5s: 5, 10, 15, 20." },
      { visual: g(3, 5), text: "Each hand has 5 fingers. Three hands have 5 × 3 = 15 fingers." },
      { visual: a(5, 6), text: "5 × 6 = 30. Products of 5 end in 0 or 5." },
      { visual: a(5, 5), text: "5 × 5 = 25. That one ends in 5!" },
      { visual: h(5, 6), text: "Clock minutes jump by 5s: 5, 10, 15, 20, 25, 30." },
    ],
    check: { a: 5, b: 4, choices: [0, 4, 2], answer: 0 },
    tryAtHome: {
      title: "High-five counting",
      materials: ["a grown-up's hands and yours"],
      steps: ["Hold up one hand: that is 5.", "Add hands one at a time and skip-count by 5s.", "How many fingers do 4 hands have? Say the 5s fact.", "Look at a clock and count the minutes by 5s."],
      safety: "Gentle high-fives only!",
    },
  },
  "math.mult.10s": {
    slides: [
      { visual: g(3, 10), text: "Three groups of 10 make 30. 10 × 3 = 30." },
      { visual: r(7), text: "Seven bars of 10 make 70. 10 × 7 = 70." },
      { visual: h(10, 5), text: "Skip-count by 10s: 10, 20, 30, 40, 50." },
      { visual: r(4), text: "10 × 4 = 40. Just write a zero after the 4." },
      { visual: r(9), text: "10 × 9 = 90. Every product of 10 ends in zero." },
      { visual: a(2, 10), text: "Two rows of 10 make 20. 10 × 2 = 20." },
    ],
    check: { a: 10, b: 7, choices: [1, 3, 4], answer: 1 },
    tryAtHome: {
      title: "Lego tens",
      materials: ["Lego bricks or any small blocks"],
      steps: ["Build towers that are exactly 10 bricks tall.", "Make 3 towers. Count by 10s: 10, 20, 30.", "Add towers and say the fact, like 10 × 5 = 50.", "Notice: every answer ends in zero!"],
      safety: "Pick up the bricks after so no one steps on them.",
    },
  },
  "math.mult.3s": {
    slides: [
      { visual: g(3, 4), text: "Three groups of 4 make 12. 3 × 4 = 12." },
      { visual: sp(3, 4, 2), text: "Double 4 is 8. Add one more 4: 8 + 4 = 12." },
      { visual: h(3, 5), text: "Skip-count by 3s: 3, 6, 9, 12, 15." },
      { visual: a(3, 6), text: "3 × 6 = 18. That is three rows of 6." },
      { visual: g(3, 3), text: "Three groups of 3 make 9. 3 × 3 = 9." },
      { visual: a(3, 7), text: "3 × 7 = 21. Triple means three times as many." },
    ],
    check: { a: 3, b: 6, choices: [3, 0, 5], answer: 3 },
    tryAtHome: {
      title: "Egg carton triples",
      materials: ["an empty egg carton", "small objects like buttons or cereal"],
      steps: ["Use just 3 cups of the carton.", "Put the same number in each cup, like 4.", "Count them all: 3 × 4 = 12.", "Change the number in each cup and say the new fact."],
      safety: "Wash hands after handling the egg carton.",
    },
  },
  "math.mult.4s": {
    slides: [
      { visual: g(4, 3), text: "Four groups of 3 make 12. 4 × 3 = 12." },
      { visual: sp(4, 6, 2), text: "Double 6 is 12. Double 12 is 24. So 4 × 6 = 24." },
      { visual: h(4, 5), text: "Skip-count by 4s: 4, 8, 12, 16, 20." },
      { visual: a(4, 5), text: "4 × 5 = 20. That is four rows of 5." },
      { visual: g(4, 4), text: "Four groups of 4 make 16. 4 × 4 = 16." },
      { visual: a(4, 8), text: "4 × 8 = 32. Every 4s product is even." },
    ],
    check: { a: 4, b: 5, choices: [3, 1, 4], answer: 3 },
    tryAtHome: {
      title: "Toy car wheels",
      materials: ["toy cars, or paper and crayons to draw cars"],
      steps: ["Every car has 4 wheels.", "Line up 2 cars and count the wheels: 4 × 2 = 8.", "Add one car at a time and skip-count by 4s.", "How many wheels do 6 cars have? Double, then double again!"],
      safety: "Keep small toy parts away from little kids.",
    },
  },
  "math.mult.6s": {
    slides: [
      { visual: g(6, 3), text: "Six groups of 3 make 18. 6 × 3 = 18." },
      { visual: sp(6, 7, 5), text: "5 × 7 is 35. Add one more 7: 35 + 7 = 42." },
      { visual: h(6, 5), text: "Skip-count by 6s: 6, 12, 18, 24, 30." },
      { visual: a(6, 4), text: "6 × 4 = 24. That is six rows of 4." },
      { visual: a(6, 6), text: "6 × 6 = 36. Six rows of 6 make a square!" },
      { visual: a(2, 6), text: "An egg carton holds 2 rows of 6. 2 × 6 = 12 eggs." },
    ],
    check: { a: 6, b: 4, choices: [3, 0, 4], answer: 3 },
    tryAtHome: {
      title: "Egg carton sixes",
      materials: ["an empty 12-cup egg carton", "dry beans or buttons"],
      steps: ["Look at one row of the carton. It has 6 cups.", "Put 2 beans in each cup of one row: 6 × 2 = 12.", "Try 3 beans in each cup. Skip-count by 3s to check.", "Use both rows to see 2 × 6 = 12 cups."],
      safety: "Beans are for counting, not eating.",
    },
  },
  "math.mult.7s": {
    slides: [
      { visual: g(7, 2), text: "Seven groups of 2 make 14. 7 × 2 = 14." },
      { visual: sp(7, 8, 5), text: "5 × 8 is 40 and 2 × 8 is 16. 40 + 16 = 56." },
      { visual: h(7, 4), text: "Skip-count by 7s: 7, 14, 21, 28." },
      { visual: a(7, 3), text: "7 × 3 = 21. That is seven rows of 3." },
      { visual: a(7, 7), text: "7 × 7 = 49. That one is tricky, so practice it!" },
      { visual: g(4, 7), text: "A week has 7 days. Four weeks is 7 × 4 = 28 days." },
    ],
    check: { a: 7, b: 3, choices: [3, 4, 5], answer: 3 },
    tryAtHome: {
      title: "Calendar sevens",
      materials: ["a wall calendar", "a crayon or sticky notes"],
      steps: ["Find a column of the calendar. The dates jump by 7.", "Count how many days are in 2 weeks: 7 × 2 = 14.", "Mark the end of each week and skip-count by 7s.", "How many days are in 4 weeks?"],
      safety: "Ask before writing on the family calendar!",
    },
  },
  "math.mult.8s": {
    slides: [
      { visual: g(8, 2), text: "Eight groups of 2 make 16. 8 × 2 = 16." },
      { visual: a(8, 3), text: "8 × 3 = 24. That is eight rows of 3." },
      { visual: h(8, 4), text: "Skip-count by 8s: 8, 16, 24, 32." },
      { visual: sp(8, 7, 4), text: "Double 7 three times: 14, 28, 56. So 8 × 7 = 56." },
      { visual: a(8, 5), text: "8 × 5 = 40. That is eight rows of 5." },
      { visual: a(8, 4), text: "10 × 4 is 40. Take away 2 × 4 = 8 to get 32. So 8 × 4 = 32." },
    ],
    check: { a: 8, b: 5, choices: [4, 1, 5], answer: 4 },
    tryAtHome: {
      title: "Double, double, double",
      materials: ["about 60 small Lego bricks or beans"],
      steps: ["Start with a pile of 3.", "Double it to 6. Double again to 12. Double again to 24.", "You doubled three times, so 8 × 3 = 24!", "Try it again starting with 4."],
      safety: "Keep small pieces away from little kids.",
    },
  },
  "math.mult.9s": {
    slides: [
      { visual: g(9, 2), text: "Nine groups of 2 make 18. 9 × 2 = 18." },
      { visual: sp(10, 7, 9, true), text: "10 × 7 is 70. Take away one 7 to get 63. So 9 × 7 = 63." },
      { visual: h(9, 4), text: "Skip-count by 9s: 9, 18, 27, 36." },
      { visual: a(9, 3), text: "9 × 3 = 27. And 2 + 7 = 9!" },
      { visual: a(9, 4), text: "9 × 4 = 36. And 3 + 6 = 9!" },
      { visual: a(9, 5), text: "9 × 5 = 45. The digits 4 + 5 make 9 again." },
    ],
    check: { a: 9, b: 4, choices: [4, 3, 5], answer: 4 },
    tryAtHome: {
      title: "The finger trick",
      materials: ["your ten fingers"],
      steps: ["Hold up all 10 fingers.", "For 9 × 3, fold down your third finger.", "Count fingers before the fold (2) and after it (7): 27!", "Try 9 × 4 and 9 × 6 the same way."],
      safety: "No materials needed. Do it with a grown-up and check each other.",
    },
  },
};

export const MATH_RECAPS: Record<string, CompactRecap> = Object.fromEntries(
  Object.entries(MATH_SEEDS).map(([id, seed]) => {
    const slides: SlideSeed[] = seed.slides.map((s) => [visualAlt(s.visual), s.text]);
    const prompt = `Tap the picture that shows ${seed.check.a} × ${seed.check.b}.`;
    const product = seed.check.a * seed.check.b;
    return [
      id,
      {
        slides,
        check: {
          prompt,
          choices: seed.check.choices,
          answer: seed.check.answer,
          right: `Yes! ${seed.check.a} × ${seed.check.b} = ${product}.`,
          wrong: `Not quite. Count the dots. You need ${product} in all.`,
        },
        tryAtHome: seed.tryAtHome,
      },
    ];
  }),
);
