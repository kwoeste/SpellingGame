import { eliminateChoices, helpStage, type StuckHelp } from "@/lib/help/ladder";
/**
 * "Watch it" recaps: short narrated picture slides shown before Careful Read.
 * Original wording written for Mae (age 9); illustrations are original generated art in public/study/<chapterId>/.
 * Keyed by chapter id so CKLA and religion chapters can get recaps later by adding entries here.
 */

export type RecapSlide = { id: string; image: string; alt: string; text: string };
export type RecapChoice = { id: string; image: string; alt: string };
export type RecapCheck = { prompt: string; choices: RecapChoice[]; answer: string; feedbackCorrect: string; feedbackWrong: string };
export type TryAtHome = { title: string; materials: string[]; steps: string[]; safety: string };
export type Recap = { chapterId: string; slides: RecapSlide[]; check: RecapCheck; tryAtHome: TryAtHome };

type SlideSeed = [alt: string, text: string];
type CompactRecap = {
  slides: SlideSeed[];
  check: { prompt: string; choices: number[]; answer: number; right: string; wrong: string };
  tryAtHome: TryAtHome;
};

const compact: Record<string, CompactRecap> = {
  "savvas.ch1": {
    slides: [
      ["A curious kid scientist holding a big magnifying glass over a leaf", "Scientists are like detectives. They ask questions about the world."],
      ["A child touching an ice cube and shivering, with a snowflake sparkle", "An observation is what you notice with your senses. This ice feels cold!"],
      ["A child next to an open freezer thinking with a lightbulb above her head", "An inference is an idea you figure out. The ice must have come from the freezer."],
      ["Two identical plant pots, one in sun and one in shade, with a checklist", "A fair test changes only one thing. That one thing is the variable."],
      ["A ruler, a thermometer, and a balance scale on a table", "Tools like a ruler, a thermometer, and a balance help you collect data."],
      ["A kid scientist showing a simple bar chart poster to friends", "Scientists share their data so others can learn too."],
    ],
    check: { prompt: "Tap the picture that shows tools for collecting data.", choices: [4, 1, 5], answer: 4, right: "Yes! A ruler, a thermometer, and a balance are science tools.", wrong: "Not quite. Look for the ruler, thermometer, and balance." },
    tryAtHome: {
      title: "Ice cube race",
      materials: ["2 ice cubes", "2 small plates", "a sunny window and a shady spot"],
      steps: ["Put one ice cube on each plate.", "Set one plate in the sun and one in the shade.", "Guess which will melt first. That guess is your prediction!", "Check every 5 minutes and write down what you observe."],
      safety: "Do this with a grown-up and wipe up any water so no one slips.",
    },
  },
  "savvas.ch2": {
    slides: [
      ["A pencil, a water bottle, and a small bridge drawn as friendly objects", "Technology is any tool people make to solve a problem."],
      ["A child looking at a puddle blocking a path, thinking", "Designers start by naming the problem they want to fix."],
      ["A child sketching ideas in a notebook with colorful pencils", "Next they list the limits and sketch lots of ideas."],
      ["A child building a cardboard bridge model with tape", "Then they build a prototype. A prototype is a first model."],
      ["A small toy car rolling over a cardboard bridge model", "They test the prototype to see what works."],
      ["A child adding an extra cardboard support to the bridge and smiling", "Then they make it better and test again!"],
    ],
    check: { prompt: "Tap the picture that shows a prototype being built.", choices: [2, 3, 0], answer: 3, right: "Yes! Building a first model is making a prototype.", wrong: "Not quite. Look for someone building a first model." },
    tryAtHome: {
      title: "Paper bridge challenge",
      materials: ["2 stacks of books", "1 sheet of paper", "pennies or coins"],
      steps: ["Lay a flat sheet of paper between two book stacks.", "Add pennies one at a time. How many before it sags?", "Fold the paper like a fan (accordion) and try again.", "Compare. Which design held more?"],
      safety: "Keep coins away from little brothers, sisters, and pets.",
    },
  },
  "savvas.ch3": {
    slides: [
      ["A friendly fish, a bird, and a frog with a glowing backbone outline", "Animals with a backbone are called vertebrates."],
      ["A cheerful snail, a worm, and a butterfly", "Animals without a backbone are called invertebrates."],
      ["A polar bear with a thick fluffy white coat in the snow", "An adaptation helps a living thing survive. A thick coat keeps this bear warm."],
      ["A bird with a strong sharp beak cracking a seed", "A sharp beak is an adaptation for cracking food."],
      ["A flock of geese flying south over trees toward a warm sun", "Some animals travel to warmer places. That is an adaptation too."],
      ["A cactus in a sunny desert storing water", "Plants have adaptations too. A cactus stores water for dry days."],
    ],
    check: { prompt: "Tap the picture that shows an animal with a thick coat for staying warm.", choices: [1, 2, 3], answer: 2, right: "Yes! The bear's thick coat is an adaptation for the cold.", wrong: "Not quite. Look for the animal with a fluffy coat in the snow." },
    tryAtHome: {
      title: "Blubber glove",
      materials: ["a bowl of ice water", "2 zip-top bags", "shortening or butter", "a spoon"],
      steps: ["Fill one bag with a big scoop of shortening.", "Put the second bag inside it to make a squishy glove.", "Dip one bare finger and one gloved finger into the ice water.", "Which stays warmer? Thick fat is an adaptation for whales and seals!"],
      safety: "Only a quick dip in the ice water, and wash your hands after.",
    },
  },
  "savvas.ch4": {
    slides: [
      ["A sunny pond with plants, fish, a frog, rocks, and water", "An ecosystem is living and nonliving things working together."],
      ["Green plants and grass soaking up sunlight", "Producers, like plants, make their own food from sunlight."],
      ["A rabbit eating clover near a fox peeking from bushes", "Consumers eat plants or other animals to get energy."],
      ["Mushrooms and earthworms on a fallen log", "Decomposers break down leftovers and put them back in the soil."],
      ["A shell fossil pressed into a rock", "A fossil is a trace of a living thing from long ago."],
      ["A fish fossil in a rock with a faded picture of ancient water above it", "A fish fossil tells us this place was once watery."],
    ],
    check: { prompt: "Tap the picture that shows decomposers.", choices: [1, 3, 2], answer: 3, right: "Yes! Mushrooms and worms break down leftovers.", wrong: "Not quite. Look for the mushrooms and worms on the old log." },
    tryAtHome: {
      title: "Make a fossil print",
      materials: ["play dough or modeling clay", "a shell, leaf, or toy dinosaur"],
      steps: ["Flatten a ball of clay into a thick pancake.", "Press the shell or leaf in firmly.", "Lift it out gently and look at the print.", "Trade with a grown-up and guess what made each other's print!"],
      safety: "Wash your hands after using clay.",
    },
  },
  "savvas.ch5": {
    slides: [
      ["A colorful map of Earth with mountains, valleys, rivers, and big blue oceans", "Earth has many landforms and lots of water."],
      ["A big ocean next to one small glass of fresh water", "Most water is salty ocean water. Only a little is fresh water we can use."],
      ["A rock with tiny cracks and rain falling on it", "Weathering breaks rock into smaller pieces."],
      ["A river carrying sand and pebbles downstream", "Erosion carries those pieces away."],
      ["A sandy delta where a river meets a lake, building a new beach", "Deposition drops the pieces in a new place."],
      ["Snow, wind, and water moving down a hill with a gravity arrow", "Gravity helps water, ice, and wind move soil downhill."],
    ],
    check: { prompt: "Tap the picture that shows erosion carrying pieces away.", choices: [3, 2, 1], answer: 3, right: "Yes! The river is carrying sand and pebbles away.", wrong: "Not quite. Look for water carrying sand and pebbles." },
    tryAtHome: {
      title: "Sand hill rain",
      materials: ["a baking pan", "damp sand or soil", "a cup with small holes poked in the bottom"],
      steps: ["Build a sand hill at one end of the pan.", "Hold the holey cup over the hill and pour water in to make rain.", "Watch where the sand moves. That is erosion!", "Look at the bottom of the pan. Where the sand lands is deposition."],
      safety: "Do this outside or in the sink with a grown-up.",
    },
  },
  "savvas.ch6": {
    slides: [
      ["A block, a cup of juice, and a balloon side by side", "Matter is anything that has mass and takes up space."],
      ["An ice cube, a puddle of water, and a cloud of steam in a row", "Matter can be a solid, a liquid, or a gas."],
      ["A balance scale with a whole cookie on one side and broken cookie pieces on the other, level", "When something breaks, all the pieces still add up."],
      ["Sugar stirring into a glass of water", "When sugar dissolves, it is still there. You just can't see it."],
      ["An ice cube melting into a puddle on a scale that shows the same number", "When ice melts, the amount of matter stays the same."],
      ["A smiling ice cube, water drop, and steam cloud holding hands", "Matter can look different, but it does not disappear!"],
    ],
    check: { prompt: "Tap the picture that shows sugar dissolving.", choices: [2, 3, 1], answer: 3, right: "Yes! The sugar dissolves, but it is still in the water.", wrong: "Not quite. Look for sugar going into water." },
    tryAtHome: {
      title: "Disappearing sugar?",
      materials: ["a clear cup of warm water", "1 spoonful of sugar", "a spoon"],
      steps: ["Look at the sugar. Is it a solid?", "Stir it into the warm water until you can't see it.", "Take a tiny taste with a clean spoon. Is it sweet?", "The sugar did not disappear. The matter is still there!"],
      safety: "Use warm tap water, not hot, and ask a grown-up first.",
    },
  },
  "savvas.ch7": {
    slides: [
      ["A sun, a speaker with music notes, a rolling ball, and a warm mug", "Energy can be light, heat, sound, or motion."],
      ["A warm mug of cocoa with heat waves moving toward cold hands", "Heat moves from a warmer place to a cooler place."],
      ["An ice pop melting on a sunny day", "That is why an ice pop melts on a hot day."],
      ["A metal pan on a stove with heat arrows moving through it", "A conductor lets heat move through it easily, like a metal pan."],
      ["A pot with a wooden handle staying cool", "An insulator slows heat down, like a wooden handle."],
      ["Cozy mittens and a blanket keeping a child warm", "Mittens are insulators. They keep your warm hands warm!"],
    ],
    check: { prompt: "Tap the picture that shows an insulator.", choices: [3, 4, 2], answer: 4, right: "Yes! The wooden handle slows the heat down.", wrong: "Not quite. Look for the wooden handle that stays cool." },
    tryAtHome: {
      title: "Butter melt test",
      materials: ["a metal spoon", "a wooden spoon", "a plastic spoon", "tiny dabs of butter", "a mug of warm water"],
      steps: ["Put a tiny dab of butter near the top of each spoon handle.", "A grown-up stands all three spoons in the warm water.", "Watch which butter melts first.", "The fastest one is the best conductor!"],
      safety: "A grown-up handles the warm water. Use warm, not boiling.",
    },
  },
  "savvas.ch8": {
    slides: [
      ["A battery, wire loop, and a glowing lightbulb in a complete circle", "A circuit is a complete loop. Electricity flows and the bulb lights up."],
      ["The same circuit with a gap in the wire and a dark bulb", "If the loop is open, the bulb stays dark."],
      ["A lamp, a toaster, a speaker, and a fan", "Electricity can change into light, heat, sound, or motion."],
      ["A horseshoe magnet picking up paper clips", "Magnets pull on things made of iron."],
      ["A coil of wire around a nail picking up paper clips, connected to a battery", "A coil of wire with electricity can act like a magnet!"],
      ["A smiling kid flipping a light switch on", "A switch opens and closes the loop."],
    ],
    check: { prompt: "Tap the picture that shows a complete circuit.", choices: [1, 0, 3], answer: 0, right: "Yes! The loop is complete, so the bulb lights up.", wrong: "Not quite. Look for the loop with no gap and a glowing bulb." },
    tryAtHome: {
      title: "Magnet treasure hunt",
      materials: ["a fridge magnet", "a spoon, a coin, a paper clip, a crayon, foil, a key"],
      steps: ["Guess which things the magnet will pick up.", "Test each object one at a time.", "Sort them into two piles: sticks and doesn't stick.", "Were your guesses right? Things with iron stick!"],
      safety: "Keep magnets away from phones, tablets, and little kids who might swallow them.",
    },
  },
};

function build(chapterId: string, c: CompactRecap): Recap {
  const slides = c.slides.map(([alt, text], i) => ({ id: `${chapterId}.w${i + 1}`, image: `/study/${chapterId}/${i + 1}.webp`, alt, text }));
  const choices = c.check.choices.map((i) => ({ id: slides[i].id, image: slides[i].image, alt: slides[i].alt }));
  return {
    chapterId,
    slides,
    check: { prompt: c.check.prompt, choices, answer: slides[c.check.answer].id, feedbackCorrect: c.check.right, feedbackWrong: c.check.wrong },
    tryAtHome: c.tryAtHome,
  };
}

const RECAPS: Record<string, Recap> = Object.fromEntries(Object.entries(compact).map(([id, c]) => [id, build(id, c)]));

export function getRecap(chapterId: string): Recap | null {
  return RECAPS[chapterId] ?? null;
}

export function listRecaps(): Recap[] {
  return Object.values(RECAPS);
}

/** What the browser gets: everything except the quick-check answer and feedback. */
export type StudentRecap = {
  slides: RecapSlide[];
  check: { prompt: string; choices: RecapChoice[] };
  tryAtHome: TryAtHome;
};

export function toStudentRecap(recap: Recap | null): StudentRecap | null {
  if (!recap) return null;
  return { slides: recap.slides, check: { prompt: recap.check.prompt, choices: recap.check.choices }, tryAtHome: recap.tryAtHome };
}

/** Server-side grading for the picture quick check; the answer never leaves the server until she is stuck. */
export function gradeRecapCheck(
  chapterId: string,
  choiceId: string,
  missesBefore = 0,
): { correct: boolean; feedback: string; help: StuckHelp | null } | null {
  const recap = getRecap(chapterId);
  if (!recap || !recap.check.choices.some((c) => c.id === choiceId)) return null;
  const correct = recap.check.answer === choiceId;
  const misses = correct ? 0 : Math.max(0, Math.min(99, Math.floor(missesBefore) || 0)) + 1;
  return { correct, feedback: correct ? recap.check.feedbackCorrect : recap.check.feedbackWrong, help: recapCheckHelp(recap, misses) };
}

/** Ladder help for the picture check: miss 4 removes wrong pictures, miss 5 shows the right one and why. */
export function recapCheckHelp(recap: Recap, misses: number): StuckHelp | null {
  const stage = helpStage(misses);
  if (stage === "none") return null;
  const ids = recap.check.choices.map((c) => c.id);
  const removeChoices = eliminateChoices(ids, recap.check.answer, 1, recap.chapterId);
  const hint = `${recap.check.feedbackWrong.replace(/^Not yet\.\s*/i, "")} Now pick from the two pictures left.`;
  if (stage === "hint") return { stage, hint, removeChoices };
  const right = recap.check.choices.find((c) => c.id === recap.check.answer);
  return {
    stage,
    hint,
    removeChoices: ids.filter((id) => id !== recap.check.answer),
    reveal: { answer: `It's this picture: ${right?.alt ?? ""}`.trim(), why: recap.check.feedbackCorrect, response: recap.check.answer },
  };
}
