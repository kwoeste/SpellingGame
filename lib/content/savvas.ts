import { buildChapter, type CompactChapter } from "@/lib/content/build";

const savvas: CompactChapter[] = [
  {
    id: "savvas.ch1",
    book: "savvas",
    number: 1,
    titleKid: "What is science?",
    subject: "science",
    bigQuestion: "How do scientists learn about the world?",
    paragraphs: [
      "Scientists start by looking closely. An observation is something you notice with your senses, like “the ice feels cold.” An inference is a guess based on what you saw, like “the ice will melt in the sun.”",
      "A fair test changes only one variable at a time. Tools such as a ruler, thermometer, or balance help you collect data you can share.",
    ],
    vocab: [
      { word: "observation", definition: "something you notice with your senses" },
      { word: "inference", definition: "a guess based on what you noticed" },
      { word: "variable", definition: "the one thing you change in a test" },
      { word: "data", definition: "facts you collect and write down" },
    ],
    sequence: ["Ask a question", "Make a plan", "Collect data", "Share a conclusion"],
    proofs: [
      {
        stem: "What is an observation?",
        options: ["A guess about why something happened", "Something you notice with your senses", "A tool you buy", "A finished report"],
        answer: 1,
        evidence: 1,
        why: "Not yet. Look at the sentence that tells what an observation is.",
      },
      {
        stem: "Why change only one variable?",
        options: ["So the test is fair", "So you can skip tools", "So data is a secret", "So inferences become facts"],
        answer: 0,
        evidence: 3,
        why: "Not yet. Find the sentence about a fair test.",
      },
    ],
  },
  {
    id: "savvas.ch2",
    book: "savvas",
    number: 2,
    titleKid: "Technology and design",
    subject: "science",
    bigQuestion: "How do people design solutions?",
    paragraphs: [
      "Technology is any tool people make to solve a problem. A pencil, a bridge, and a water bottle are all technology.",
      "Designers follow a process. They name the problem, list limits, sketch ideas, build a prototype, test it, and improve it.",
    ],
    vocab: [
      { word: "technology", definition: "a tool made to solve a problem" },
      { word: "prototype", definition: "a first model you can test" },
      { word: "criteria", definition: "what a solution must do" },
      { word: "constraint", definition: "a limit, like time or materials" },
    ],
    sequence: ["Name the problem", "Sketch ideas", "Build a prototype", "Test and improve"],
    proofs: [
      {
        stem: "What is a prototype?",
        options: ["The final factory product", "A first model you can test", "A list of guesses", "A finished grade"],
        answer: 1,
        evidence: 3,
        why: "Not yet. Find the sentence about a first model.",
      },
    ],
  },
  {
    id: "savvas.ch3",
    book: "savvas",
    number: 3,
    titleKid: "Living things and adaptations",
    subject: "science",
    bigQuestion: "How do living things fit their homes?",
    paragraphs: [
      "Scientists classify animals to study them. Vertebrates have backbones. Invertebrates do not.",
      "An adaptation is a body part or behavior that helps a living thing survive. A thick coat, a sharp beak, or traveling to a warmer place can all be adaptations.",
    ],
    vocab: [
      { word: "classify", definition: "to sort into groups" },
      { word: "vertebrate", definition: "an animal with a backbone" },
      { word: "invertebrate", definition: "an animal without a backbone" },
      { word: "adaptation", definition: "a trait that helps a living thing survive" },
    ],
    sequence: ["Look at a trait", "Ask how it helps", "Name the environment", "Call it an adaptation"],
    proofs: [
      {
        stem: "What is a vertebrate?",
        options: ["An animal with a backbone", "A plant with seeds", "A rock layer", "A kind of weather"],
        answer: 0,
        evidence: 1,
        why: "Not yet. Find the sentence about backbones.",
      },
    ],
  },
  {
    id: "savvas.ch4",
    book: "savvas",
    number: 4,
    titleKid: "Ecosystems and fossils",
    subject: "science",
    bigQuestion: "How do living things and past worlds connect?",
    paragraphs: [
      "An ecosystem is the living and nonliving parts of a place working together. Producers make food. Consumers eat. Decomposers recycle leftovers.",
      "A fossil is a trace of a living thing from long ago. Fossils can hint at the past environment, like a watery place or a dry one.",
    ],
    vocab: [
      { word: "ecosystem", definition: "living and nonliving parts of a place together" },
      { word: "producer", definition: "a living thing that makes its own food" },
      { word: "consumer", definition: "a living thing that eats other living things" },
      { word: "fossil", definition: "a trace of a living thing from long ago" },
    ],
    sequence: ["Sunlight hits plants", "A plant is eaten", "An animal is eaten", "A decomposer recycles"],
    proofs: [
      {
        stem: "What do producers do?",
        options: ["Eat other animals only", "Make food", "Turn into rocks", "Hide fossils"],
        answer: 1,
        evidence: 1,
        why: "Not yet. Look at the sentence about producers.",
      },
    ],
  },
  {
    id: "savvas.ch5",
    book: "savvas",
    number: 5,
    titleKid: "Earth's resources and changing land",
    subject: "science",
    bigQuestion: "How does Earth's surface change?",
    paragraphs: [
      "Earth's surface has landforms and a lot of water. Most of that water is in oceans, so only a little is fresh water we can easily use.",
      "Weathering breaks rock into smaller pieces. Erosion carries those pieces away. Deposition drops them in a new place. Gravity helps water, ice, and wind move soil.",
    ],
    vocab: [
      { word: "weathering", definition: "breaking rock into smaller pieces" },
      { word: "erosion", definition: "carrying rock and soil away" },
      { word: "deposition", definition: "dropping rock and soil in a new place" },
      { word: "landform", definition: "a shape on Earth's surface, like a hill or valley" },
    ],
    sequence: ["Rock is broken", "Water picks up bits", "Bits travel downhill", "Bits settle in a new place"],
    proofs: [
      {
        stem: "What is erosion?",
        options: ["Making new magma", "Carrying rock and soil away", "Measuring mass", "Building a circuit"],
        answer: 1,
        evidence: 3,
        why: "Not yet. Find the sentence that names erosion.",
      },
    ],
    gameId: "stream-steepness",
  },
  {
    id: "savvas.ch6",
    book: "savvas",
    number: 6,
    titleKid: "Matter stays matter",
    subject: "science",
    bigQuestion: "What happens to matter when it changes?",
    paragraphs: [
      "Matter is anything that has mass and takes up space. It can be a solid, a liquid, or a gas.",
      "When something breaks, dissolves, or changes state, the amount of matter stays the same. The pieces still add up, even if they look different.",
    ],
    vocab: [
      { word: "matter", definition: "anything that has mass and takes up space" },
      { word: "mass", definition: "how much matter is in an object" },
      { word: "volume", definition: "how much space something takes" },
      { word: "mixture", definition: "two or more materials put together" },
    ],
    sequence: ["Start with a whole ice cube", "Heat it", "It melts to water", "The mass is still there"],
    proofs: [
      {
        stem: "What stays the same when ice melts?",
        options: ["The shape only", "The amount of matter", "The color of the sun", "The volume of the room"],
        answer: 1,
        evidence: 3,
        why: "Not yet. Look at the sentence about the amount of matter.",
      },
    ],
  },
  {
    id: "savvas.ch7",
    book: "savvas",
    number: 7,
    titleKid: "Energy and heat",
    subject: "science",
    bigQuestion: "How does energy move?",
    paragraphs: [
      "Energy can show up as light, heat, sound, or motion. Heat moves from a warmer place to a cooler place.",
      "A conductor lets heat move through it easily, like a metal pan. An insulator slows heat, like a wooden handle.",
    ],
    vocab: [
      { word: "energy", definition: "the ability to cause change or do work" },
      { word: "heat", definition: "energy that moves from warmer to cooler" },
      { word: "conductor", definition: "a material that lets heat or electricity move easily" },
      { word: "insulator", definition: "a material that slows heat or electricity" },
    ],
    sequence: ["Sun warms a pan", "Heat moves into the metal", "The food warms", "A wooden handle stays cooler"],
    proofs: [
      {
        stem: "Which way does heat move?",
        options: ["From cold to hot only", "From warmer to cooler", "Only through glass", "It never moves"],
        answer: 1,
        evidence: 0,
        why: "Not yet. Find the sentence about heat moving.",
      },
    ],
  },
  {
    id: "savvas.ch8",
    book: "savvas",
    number: 8,
    titleKid: "Electricity and magnetism",
    subject: "science",
    bigQuestion: "How do circuits and magnets work?",
    paragraphs: [
      "A circuit needs a complete conducting loop for electricity to flow. If the loop is open, a bulb stays dark.",
      "Electricity can change into light, heat, sound, or motion. Electricity and magnetism are related. A coil of wire with current can act like a magnet.",
    ],
    vocab: [
      { word: "circuit", definition: "a complete loop that electricity can travel" },
      { word: "conductor", definition: "a material electricity can move through" },
      { word: "magnet", definition: "an object that can pull some metals" },
      { word: "electromagnet", definition: "a magnet made with electricity and a coil" },
    ],
    sequence: ["Close the loop", "Current flows", "The bulb lights", "Open the loop and it stops"],
    proofs: [
      {
        stem: "What does a circuit need?",
        options: ["A complete conducting loop", "Only plastic parts", "A magnet with no wire", "An open gap"],
        answer: 0,
        evidence: 0,
        why: "Not yet. Look at the sentence about a complete loop.",
      },
    ],
    gameId: "circuit-builder",
  },
];

export const savvasChapters = savvas.map(buildChapter);
