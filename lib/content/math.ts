import { seededShuffle } from "@/lib/content/shuffle";
import type { ChapterItem, ChapterPack } from "@/lib/content/types";

function multiplicationItem(
  chapterId: string,
  idx: number,
  a: number,
  b: number,
  options: number[],
): ChapterItem {
  const product = a * b;
  const shuffledOptions = seededShuffle(options, `${chapterId}.${idx}`);
  return {
    id: `${chapterId}.mult.${idx}`,
    activityId: `${chapterId}.practice`,
    templateId: "math.mult_fact",
    conceptId: "math.oa.mult_facts",
    type: "mc",
    stem: `What is ${a} × ${b}?`,
    options: shuffledOptions.map(String),
    answer: String(product),
    feedbackCorrect: `Yes! ${a} × ${b} = ${product}`,
    feedbackWrong: `Not yet. Think: ${a} groups of ${b}.`,
  };
}

function generateMultOptions(correct: number, factor: number): number[] {
  const nearby = [correct - factor, correct + factor, correct - 1, correct + 1].filter(
    (n) => n > 0 && n !== correct
  );
  const unique = [...new Set(nearby)].slice(0, 3);
  while (unique.length < 3) {
    const fallback = correct + unique.length + 2;
    if (!unique.includes(fallback)) unique.push(fallback);
  }
  return [correct, ...unique];
}

const mathChaptersData: ChapterPack[] = [
  {
    id: "math.mult.2s",
    book: "math",
    number: 1,
    titleKid: "Times 2: Doubling",
    subject: "math",
    bigQuestion: "What pattern shows when you multiply by 2?",
    storyHook: "Imagine you have pairs of socks. Doubling means having two of everything!",
    reviewStatus: "draft",
    provenance: {
      author: "Mae Site original math content",
      date: "2026-10-20",
      original: true,
      sourcesConsulted: ["3rd-4th grade math curriculum standards for multiplication fluency"],
    },
    chunks: [
      {
        id: "math.mult.2s.chunk1",
        sentenceIds: ["math.mult.2s.s1", "math.mult.2s.s2", "math.mult.2s.s3"],
      },
    ],
    sentences: [
      { id: "math.mult.2s.s1", text: "When you multiply by 2, you double the number." },
      { id: "math.mult.2s.s2", text: "2 × 3 means 3 + 3, which is 6." },
      { id: "math.mult.2s.s3", text: "The answers go: 2, 4, 6, 8, 10, 12... — always even!" },
    ],
    vocab: [
      { word: "double", definition: "to add a number to itself", sentenceId: "math.mult.2s.s1" },
      { word: "factor", definition: "a number you multiply", sentenceId: "math.mult.2s.s2" },
      { word: "product", definition: "the answer when you multiply", sentenceId: "math.mult.2s.s2" },
      { word: "multiply", definition: "to add a number over and over", sentenceId: "math.mult.2s.s1" },
      { word: "even", definition: "a number that ends in 0, 2, 4, 6, or 8", sentenceId: "math.mult.2s.s3" },
    ],
    sequence: [],
    items: [
      multiplicationItem("math.mult.2s", 1, 2, 3, generateMultOptions(6, 2)),
      multiplicationItem("math.mult.2s", 2, 2, 5, generateMultOptions(10, 2)),
      multiplicationItem("math.mult.2s", 3, 2, 7, generateMultOptions(14, 2)),
      multiplicationItem("math.mult.2s", 4, 2, 8, generateMultOptions(16, 2)),
      multiplicationItem("math.mult.2s", 5, 2, 9, generateMultOptions(18, 2)),
    ],
  },
  {
    id: "math.mult.5s",
    book: "math",
    number: 2,
    titleKid: "Times 5: Counting by fives",
    subject: "math",
    bigQuestion: "What pattern shows when you multiply by 5?",
    storyHook: "Counting nickels? Each nickel is 5 cents. How many cents in 6 nickels?",
    reviewStatus: "draft",
    provenance: {
      author: "Mae Site original math content",
      date: "2026-10-20",
      original: true,
      sourcesConsulted: ["3rd-4th grade math curriculum standards for multiplication fluency"],
    },
    chunks: [
      {
        id: "math.mult.5s.chunk1",
        sentenceIds: ["math.mult.5s.s1", "math.mult.5s.s2", "math.mult.5s.s3"],
      },
    ],
    sentences: [
      { id: "math.mult.5s.s1", text: "When you multiply by 5, the products end in 0 or 5." },
      { id: "math.mult.5s.s2", text: "5 × 4 means skip-counting: 5, 10, 15, 20." },
      { id: "math.mult.5s.s3", text: "The clock shows 5-minute jumps: 5, 10, 15, 20, 25, 30..." },
    ],
    vocab: [
      { word: "skip-counting", definition: "counting by jumps of the same size", sentenceId: "math.mult.5s.s2" },
      { word: "multiple", definition: "a number you land on when skip-counting", sentenceId: "math.mult.5s.s1" },
      { word: "factor", definition: "a number you multiply", sentenceId: "math.mult.5s.s2" },
      { word: "product", definition: "the answer when you multiply", sentenceId: "math.mult.5s.s1" },
      { word: "pattern", definition: "something that repeats in a predictable way", sentenceId: "math.mult.5s.s3" },
    ],
    sequence: [],
    items: [
      multiplicationItem("math.mult.5s", 1, 5, 3, generateMultOptions(15, 5)),
      multiplicationItem("math.mult.5s", 2, 5, 6, generateMultOptions(30, 5)),
      multiplicationItem("math.mult.5s", 3, 5, 7, generateMultOptions(35, 5)),
      multiplicationItem("math.mult.5s", 4, 5, 8, generateMultOptions(40, 5)),
      multiplicationItem("math.mult.5s", 5, 5, 9, generateMultOptions(45, 5)),
    ],
  },
  {
    id: "math.mult.10s",
    book: "math",
    number: 3,
    titleKid: "Times 10: Just add a zero!",
    subject: "math",
    bigQuestion: "What happens when you multiply by 10?",
    storyHook: "Ten fingers on your hands. Ten toes on your feet. Tens are everywhere!",
    reviewStatus: "draft",
    provenance: {
      author: "Mae Site original math content",
      date: "2026-10-20",
      original: true,
      sourcesConsulted: ["3rd-4th grade math curriculum standards for multiplication fluency"],
    },
    chunks: [
      {
        id: "math.mult.10s.chunk1",
        sentenceIds: ["math.mult.10s.s1", "math.mult.10s.s2", "math.mult.10s.s3"],
      },
    ],
    sentences: [
      { id: "math.mult.10s.s1", text: "When you multiply by 10, just write a zero after the number." },
      { id: "math.mult.10s.s2", text: "10 × 7 = 70 — the 7 shifts to the tens place." },
      { id: "math.mult.10s.s3", text: "Every product of 10 ends in zero." },
    ],
    vocab: [
      { word: "tens place", definition: "the second digit from the right in a number", sentenceId: "math.mult.10s.s2" },
      { word: "place value", definition: "what a digit is worth based on where it sits", sentenceId: "math.mult.10s.s1" },
      { word: "multiply", definition: "to add a number over and over", sentenceId: "math.mult.10s.s1" },
      { word: "product", definition: "the answer when you multiply", sentenceId: "math.mult.10s.s3" },
      { word: "zero", definition: "the number that means nothing or none", sentenceId: "math.mult.10s.s1" },
    ],
    sequence: [],
    items: [
      multiplicationItem("math.mult.10s", 1, 10, 3, generateMultOptions(30, 10)),
      multiplicationItem("math.mult.10s", 2, 10, 5, generateMultOptions(50, 10)),
      multiplicationItem("math.mult.10s", 3, 10, 7, generateMultOptions(70, 10)),
      multiplicationItem("math.mult.10s", 4, 10, 8, generateMultOptions(80, 10)),
      multiplicationItem("math.mult.10s", 5, 10, 9, generateMultOptions(90, 10)),
    ],
  },
  {
    id: "math.mult.3s",
    book: "math",
    number: 4,
    titleKid: "Times 3: Triple it!",
    subject: "math",
    bigQuestion: "How can doubling help you multiply by 3?",
    storyHook: "A triangle has 3 sides. How many sides in 5 triangles?",
    reviewStatus: "draft",
    provenance: {
      author: "Mae Site original math content",
      date: "2026-10-20",
      original: true,
      sourcesConsulted: ["3rd-4th grade math curriculum standards for multiplication fluency"],
    },
    chunks: [
      {
        id: "math.mult.3s.chunk1",
        sentenceIds: ["math.mult.3s.s1", "math.mult.3s.s2", "math.mult.3s.s3"],
      },
    ],
    sentences: [
      { id: "math.mult.3s.s1", text: "3 × a number is like doubling, then adding one more group." },
      { id: "math.mult.3s.s2", text: "3 × 4: double 4 is 8, plus 4 more is 12." },
      { id: "math.mult.3s.s3", text: "The 3s facts go: 3, 6, 9, 12, 15, 18, 21, 24, 27, 30." },
    ],
    vocab: [
      { word: "triple", definition: "to multiply by 3", sentenceId: "math.mult.3s.s1" },
      { word: "group", definition: "a set of things counted together", sentenceId: "math.mult.3s.s1" },
      { word: "factor", definition: "a number you multiply", sentenceId: "math.mult.3s.s2" },
      { word: "product", definition: "the answer when you multiply", sentenceId: "math.mult.3s.s3" },
      { word: "array", definition: "objects arranged in rows and columns", sentenceId: "math.mult.3s.s1" },
    ],
    sequence: [],
    items: [
      multiplicationItem("math.mult.3s", 1, 3, 4, generateMultOptions(12, 3)),
      multiplicationItem("math.mult.3s", 2, 3, 6, generateMultOptions(18, 3)),
      multiplicationItem("math.mult.3s", 3, 3, 7, generateMultOptions(21, 3)),
      multiplicationItem("math.mult.3s", 4, 3, 8, generateMultOptions(24, 3)),
      multiplicationItem("math.mult.3s", 5, 3, 9, generateMultOptions(27, 3)),
    ],
  },
  {
    id: "math.mult.4s",
    book: "math",
    number: 5,
    titleKid: "Times 4: Double double!",
    subject: "math",
    bigQuestion: "How can you use what you know about 2s to multiply by 4?",
    storyHook: "A car has 4 wheels. How many wheels on 7 cars?",
    reviewStatus: "draft",
    provenance: {
      author: "Mae Site original math content",
      date: "2026-10-20",
      original: true,
      sourcesConsulted: ["3rd-4th grade math curriculum standards for multiplication fluency"],
    },
    chunks: [
      {
        id: "math.mult.4s.chunk1",
        sentenceIds: ["math.mult.4s.s1", "math.mult.4s.s2", "math.mult.4s.s3"],
      },
    ],
    sentences: [
      { id: "math.mult.4s.s1", text: "4 × a number is like doubling twice." },
      { id: "math.mult.4s.s2", text: "4 × 6: double 6 is 12, double 12 is 24." },
      { id: "math.mult.4s.s3", text: "Every 4s product is even, just like the 2s." },
    ],
    vocab: [
      { word: "quadruple", definition: "to multiply by 4", sentenceId: "math.mult.4s.s1" },
      { word: "even number", definition: "a number you can split into two equal groups", sentenceId: "math.mult.4s.s3" },
      { word: "double", definition: "to add a number to itself", sentenceId: "math.mult.4s.s2" },
      { word: "factor", definition: "a number you multiply", sentenceId: "math.mult.4s.s1" },
      { word: "product", definition: "the answer when you multiply", sentenceId: "math.mult.4s.s2" },
    ],
    sequence: [],
    items: [
      multiplicationItem("math.mult.4s", 1, 4, 5, generateMultOptions(20, 4)),
      multiplicationItem("math.mult.4s", 2, 4, 6, generateMultOptions(24, 4)),
      multiplicationItem("math.mult.4s", 3, 4, 7, generateMultOptions(28, 4)),
      multiplicationItem("math.mult.4s", 4, 4, 8, generateMultOptions(32, 4)),
      multiplicationItem("math.mult.4s", 5, 4, 9, generateMultOptions(36, 4)),
    ],
  },
  {
    id: "math.mult.6s",
    book: "math",
    number: 6,
    titleKid: "Times 6: Triple the double",
    subject: "math",
    bigQuestion: "How can you build 6s from facts you already know?",
    storyHook: "Insects have 6 legs. How many legs on 8 bugs?",
    reviewStatus: "draft",
    provenance: {
      author: "Mae Site original math content",
      date: "2026-10-20",
      original: true,
      sourcesConsulted: ["3rd-4th grade math curriculum standards for multiplication fluency"],
    },
    chunks: [
      {
        id: "math.mult.6s.chunk1",
        sentenceIds: ["math.mult.6s.s1", "math.mult.6s.s2", "math.mult.6s.s3"],
      },
    ],
    sentences: [
      { id: "math.mult.6s.s1", text: "6 × a number is 5 times the number, plus one more group." },
      { id: "math.mult.6s.s2", text: "6 × 7: 5 × 7 is 35, plus 7 more is 42." },
      { id: "math.mult.6s.s3", text: "Or think: 6 is 3 × 2, so 6 × 7 = 3 × (2 × 7) = 3 × 14 = 42." },
    ],
    vocab: [
      { word: "distributive", definition: "splitting one factor into parts, then multiplying", sentenceId: "math.mult.6s.s1" },
      { word: "factor", definition: "a number you multiply", sentenceId: "math.mult.6s.s2" },
      { word: "product", definition: "the answer when you multiply", sentenceId: "math.mult.6s.s2" },
      { word: "strategy", definition: "a plan or trick to solve a problem", sentenceId: "math.mult.6s.s3" },
      { word: "array", definition: "objects arranged in rows and columns", sentenceId: "math.mult.6s.s1" },
    ],
    sequence: [],
    items: [
      multiplicationItem("math.mult.6s", 1, 6, 4, generateMultOptions(24, 6)),
      multiplicationItem("math.mult.6s", 2, 6, 6, generateMultOptions(36, 6)),
      multiplicationItem("math.mult.6s", 3, 6, 7, generateMultOptions(42, 6)),
      multiplicationItem("math.mult.6s", 4, 6, 8, generateMultOptions(48, 6)),
      multiplicationItem("math.mult.6s", 5, 6, 9, generateMultOptions(54, 6)),
    ],
  },
  {
    id: "math.mult.7s",
    book: "math",
    number: 7,
    titleKid: "Times 7: A week of facts",
    subject: "math",
    bigQuestion: "What strategies help with the trickier 7s?",
    storyHook: "There are 7 days in a week. How many days in 6 weeks?",
    reviewStatus: "draft",
    provenance: {
      author: "Mae Site original math content",
      date: "2026-10-20",
      original: true,
      sourcesConsulted: ["3rd-4th grade math curriculum standards for multiplication fluency"],
    },
    chunks: [
      {
        id: "math.mult.7s.chunk1",
        sentenceIds: ["math.mult.7s.s1", "math.mult.7s.s2", "math.mult.7s.s3"],
      },
    ],
    sentences: [
      { id: "math.mult.7s.s1", text: "7 × a number = 5 times it, plus 2 times it." },
      { id: "math.mult.7s.s2", text: "7 × 8: 5 × 8 is 40, 2 × 8 is 16, so 40 + 16 = 56." },
      { id: "math.mult.7s.s3", text: "Practice the tricky ones: 7×7=49, 7×8=56, 7×9=63." },
    ],
    vocab: [
      { word: "decompose", definition: "to break a number into smaller parts", sentenceId: "math.mult.7s.s1" },
      { word: "factor", definition: "a number you multiply", sentenceId: "math.mult.7s.s2" },
      { word: "product", definition: "the answer when you multiply", sentenceId: "math.mult.7s.s2" },
      { word: "strategy", definition: "a plan or trick to solve a problem", sentenceId: "math.mult.7s.s3" },
      { word: "multiply", definition: "to add a number over and over", sentenceId: "math.mult.7s.s1" },
    ],
    sequence: [],
    items: [
      multiplicationItem("math.mult.7s", 1, 7, 4, generateMultOptions(28, 7)),
      multiplicationItem("math.mult.7s", 2, 7, 6, generateMultOptions(42, 7)),
      multiplicationItem("math.mult.7s", 3, 7, 7, generateMultOptions(49, 7)),
      multiplicationItem("math.mult.7s", 4, 7, 8, generateMultOptions(56, 7)),
      multiplicationItem("math.mult.7s", 5, 7, 9, generateMultOptions(63, 7)),
    ],
  },
  {
    id: "math.mult.8s",
    book: "math",
    number: 8,
    titleKid: "Times 8: Double, double, double",
    subject: "math",
    bigQuestion: "How does doubling three times give you 8s?",
    storyHook: "An octopus has 8 arms. How many arms on 9 octopuses?",
    reviewStatus: "draft",
    provenance: {
      author: "Mae Site original math content",
      date: "2026-10-20",
      original: true,
      sourcesConsulted: ["3rd-4th grade math curriculum standards for multiplication fluency"],
    },
    chunks: [
      {
        id: "math.mult.8s.chunk1",
        sentenceIds: ["math.mult.8s.s1", "math.mult.8s.s2", "math.mult.8s.s3"],
      },
    ],
    sentences: [
      { id: "math.mult.8s.s1", text: "8 × a number is like doubling three times: 2 × 2 × 2 = 8." },
      { id: "math.mult.8s.s2", text: "8 × 7: double 7 is 14, double 14 is 28, double 28 is 56." },
      { id: "math.mult.8s.s3", text: "You can also think 10 times the number, minus 2 times the number." },
    ],
    vocab: [
      { word: "power of two", definition: "a number made by multiplying 2s together", sentenceId: "math.mult.8s.s1" },
      { word: "double", definition: "to add a number to itself", sentenceId: "math.mult.8s.s2" },
      { word: "factor", definition: "a number you multiply", sentenceId: "math.mult.8s.s1" },
      { word: "product", definition: "the answer when you multiply", sentenceId: "math.mult.8s.s2" },
      { word: "strategy", definition: "a plan or trick to solve a problem", sentenceId: "math.mult.8s.s3" },
    ],
    sequence: [],
    items: [
      multiplicationItem("math.mult.8s", 1, 8, 4, generateMultOptions(32, 8)),
      multiplicationItem("math.mult.8s", 2, 8, 6, generateMultOptions(48, 8)),
      multiplicationItem("math.mult.8s", 3, 8, 7, generateMultOptions(56, 8)),
      multiplicationItem("math.mult.8s", 4, 8, 8, generateMultOptions(64, 8)),
      multiplicationItem("math.mult.8s", 5, 8, 9, generateMultOptions(72, 8)),
    ],
  },
  {
    id: "math.mult.9s",
    book: "math",
    number: 9,
    titleKid: "Times 9: The finger trick",
    subject: "math",
    bigQuestion: "What cool patterns do the 9s facts have?",
    storyHook: "Hold up 10 fingers. Put down one and count what is left. Magic!",
    reviewStatus: "draft",
    provenance: {
      author: "Mae Site original math content",
      date: "2026-10-20",
      original: true,
      sourcesConsulted: ["3rd-4th grade math curriculum standards for multiplication fluency"],
    },
    chunks: [
      {
        id: "math.mult.9s.chunk1",
        sentenceIds: ["math.mult.9s.s1", "math.mult.9s.s2", "math.mult.9s.s3"],
      },
    ],
    sentences: [
      { id: "math.mult.9s.s1", text: "9 × a number is 10 times the number, minus the number." },
      { id: "math.mult.9s.s2", text: "9 × 7: 10 × 7 is 70, minus 7 is 63." },
      { id: "math.mult.9s.s3", text: "The digits of 9s facts always add up to 9: 1+8=9, 2+7=9, 3+6=9..." },
    ],
    vocab: [
      { word: "digit sum", definition: "the total when you add all digits in a number", sentenceId: "math.mult.9s.s3" },
      { word: "pattern", definition: "something that repeats in a predictable way", sentenceId: "math.mult.9s.s3" },
      { word: "factor", definition: "a number you multiply", sentenceId: "math.mult.9s.s2" },
      { word: "product", definition: "the answer when you multiply", sentenceId: "math.mult.9s.s2" },
      { word: "multiply", definition: "to add a number over and over", sentenceId: "math.mult.9s.s1" },
    ],
    sequence: [],
    items: [
      multiplicationItem("math.mult.9s", 1, 9, 4, generateMultOptions(36, 9)),
      multiplicationItem("math.mult.9s", 2, 9, 6, generateMultOptions(54, 9)),
      multiplicationItem("math.mult.9s", 3, 9, 7, generateMultOptions(63, 9)),
      multiplicationItem("math.mult.9s", 4, 9, 8, generateMultOptions(72, 9)),
      multiplicationItem("math.mult.9s", 5, 9, 9, generateMultOptions(81, 9)),
    ],
  },
];

export const mathChapters: ChapterPack[] = mathChaptersData;
