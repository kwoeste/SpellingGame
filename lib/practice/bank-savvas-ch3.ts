import type { PracticeFact } from "@/lib/practice/types";

/**
 * Savvas science chapter 3 practice test (classification, adaptations, heredity, animal behavior).
 * Our own wording, same blanks and key terms as the class guided notes. "___" marks each blank.
 * answers[i] lists the accepted forms for blank i (first one is the spelling we teach).
 */
export const SAVVAS_CH3_FACTS: PracticeFact[] = [
  // Lesson 1: How are plants and animals classified?
  { id: "l1-sort", lesson: 1, answers: [["all"], ["animals"]], phrasings: [
    "Scientists sort ___ living things, such as plants and ___, into different groups.",
    "Every living thing gets put into a group. Scientists sort ___ living things, like plants and ___.",
  ] },
  { id: "l1-classify", lesson: 1, answers: [["classify", "classifying"]], wordBank: true, phrasings: [
    "To arrange or sort objects or living things by their properties or characteristics is to ___.",
    "When you sort living things into groups by their characteristics, you ___ them.",
    "Sorting things into groups by what they are like is called to ___.",
  ] },
  { id: "l1-plants", lesson: 1, answers: [["nutrients", "nutrient"], ["reproduce", "reproduction"]], phrasings: [
    "Two characteristics scientists use to classify plants are how plants transport ___ and how they ___.",
    "Scientists classify plants by how they move ___ through the plant and how they ___.",
  ] },
  { id: "l1-physical", lesson: 1, answers: [["physical"]], wordBank: true, phrasings: [
    "Scientists can classify animals by their ___ characteristics.",
    "One way to classify animals is by ___ characteristics, like what their bodies are like.",
  ] },
  { id: "l1-backbones", lesson: 1, answers: [["backbones", "backbone"], ["not"]], phrasings: [
    "Some animals have ___, and others do ___ have backbones.",
    "Animals can be sorted by backbones. Some have ___ and some do ___.",
  ] },
  { id: "l1-vertebrates", lesson: 1, answers: [["vertebrates", "vertebrate"]], wordBank: true, phrasings: [
    "Animals that have backbones are called ___.",
    "A dog, a frog, and a fish all have backbones, so they are ___.",
  ] },
  { id: "l1-groups", lesson: 1, kind: "list", answers: [["fish", "fishes"], ["amphibians", "amphibian"], ["reptiles", "reptile"], ["birds", "bird"], ["mammals", "mammal"]], phrasings: [
    "There are 5 groups of vertebrates. Name all 5 (any order).",
    "List the 5 groups of animals with backbones (any order).",
  ] },
  { id: "l1-invertebrates", lesson: 1, answers: [["invertebrates", "invertebrate"]], wordBank: true, phrasings: [
    "Animals without backbones are called ___.",
    "A worm and a spider have no backbone, so they are ___.",
  ] },
  { id: "l1-most", lesson: 1, answers: [["animals"]], phrasings: [
    "Most ___ on Earth are invertebrates.",
    "Invertebrates are the biggest group. Most ___ on Earth do not have a backbone.",
  ] },
  { id: "l1-arthropods", lesson: 1, answers: [["spiders", "spider"]], phrasings: [
    "Insects, ___, crabs, and shrimp are arthropods.",
    "Arthropods include insects, crabs, shrimp, and ___.",
  ] },
  { id: "l1-exoskeleton", lesson: 1, answers: [["exoskeleton", "exoskeletons"]], wordBank: true, phrasings: [
    "An arthropod's body is covered by a hard, lightweight outer skin called an ___.",
    "A crab's hard, lightweight outer covering is its ___.",
  ] },
  { id: "l1-worms", lesson: 1, answers: [["no"]], phrasings: [
    "Other invertebrates, such as worms, have ___ protection for their soft bodies.",
    "A worm has a soft body with ___ protection.",
  ] },
  { id: "l1-match", lesson: 1, kind: "match", answers: [["vertebrate"], ["invertebrate"], ["exoskeleton"], ["classify"]], prompts: [
    "an animal with a backbone", "an animal without a backbone", "a hard, lightweight outer skin", "to sort by properties or characteristics",
  ], phrasings: ["Match each word to what it means."] },

  // Lesson 2: What are adaptations?
  { id: "l2-adaptation", lesson: 2, answers: [["adaptation", "adaptations"]], wordBank: true, phrasings: [
    "An ___ is a physical feature or behavior that helps an organism survive in its environment.",
    "A physical feature or a behavior that helps a living thing survive where it lives is an ___.",
    "A duck's webbed feet help it swim. Webbed feet are an ___.",
  ] },
  { id: "l2-different", lesson: 2, answers: [["different"]], phrasings: [
    "Plants and animals in different areas often have ___ adaptations.",
    "A desert and the Arctic are very different places, so living things there have ___ adaptations.",
  ] },
  { id: "l2-survive", lesson: 2, answers: [["survive", "survival"]], wordBank: true, phrasings: [
    "Animals have many adaptations that help them ___ in their environment.",
    "Adaptations help animals stay alive, or ___, where they live.",
  ] },
  { id: "l2-food", lesson: 2, anyOrder: true, answers: [["teeth", "tooth"], ["claws", "claw"]], phrasings: [
    "Adaptations such as sharp beaks, ___, or ___ may help animals get food.",
    "To get food, some animals use sharp beaks, sharp ___, or sharp ___.",
  ] },
  { id: "l2-protect", lesson: 2, answers: [["smelly sprays", "smelly spray", "sprays", "spray"], ["eaten"]], phrasings: [
    "Adaptations such as stingers, quills, ___, or bitter-tasting flesh protect animals from being ___ by predators.",
    "A skunk's ___ and a porcupine's quills keep the animal from being ___ by predators.",
  ] },
  { id: "l2-monarch", lesson: 2, answers: [["monarch butterfly", "monarch", "monarch butterflies"]], phrasings: [
    "Bright colors, like those of the ___, may warn predators that the animal is poisonous.",
    "The bright orange ___ warns predators that it is poisonous.",
  ] },
  { id: "l2-hibernation", lesson: 2, answers: [["hibernation", "hibernate", "hibernating"]], wordBank: true, phrasings: [
    "___, or a state of rest, is a behavior that helps some animals survive low temperatures.",
    "Bears rest all winter to survive the cold. This state of rest is called ___.",
  ] },
  { id: "l2-environments", lesson: 2, answers: [["environments", "environment"]], phrasings: [
    "Plants also have adaptations that help them survive in their ___.",
    "A cactus can store water. That adaptation helps it survive in its ___.",
  ] },
  { id: "l2-pollinate", lesson: 2, answers: [["pollinate", "pollination", "pollinated"]], wordBank: true, phrasings: [
    "Some adaptations help plants reproduce. They may help plants ___ or spread their seeds.",
    "Bright flowers bring bees, which help plants ___. Other adaptations help spread seeds.",
  ] },
  { id: "l2-thorns", lesson: 2, answers: [["thorns", "thorn"]], wordBank: true, phrasings: [
    "Harmful oils and ___ may protect a plant from being eaten.",
    "A rose has sharp ___ that protect it from being eaten.",
  ] },
  { id: "l2-match", lesson: 2, kind: "match", answers: [["adaptation"], ["hibernation"], ["thorns"], ["pollinate"]], prompts: [
    "a feature or behavior that helps a living thing survive", "a state of rest that helps animals survive the cold", "sharp plant parts that protect it from being eaten", "an adaptation that helps plants reproduce",
  ], phrasings: ["Match each word to what it means."] },

  // Lesson 3: What plant and animal characteristics are inherited?
  { id: "l3-characteristics", lesson: 3, answers: [["characteristics", "characteristic"]], wordBank: true, phrasings: [
    "___ are the qualities an organism has.",
    "The qualities a living thing has, like eye color or leaf shape, are its ___.",
  ] },
  { id: "l3-mendel", lesson: 3, answers: [["not"]], phrasings: [
    "Mendel studied pea plants and found that the offspring did ___ always look exactly like their parents.",
    "In Mendel's pea plants, the young plants did ___ always look just like their parents.",
  ] },
  { id: "l3-pea", lesson: 3, answers: [["pea", "peas"]], phrasings: [
    "Mendel studied ___ plants to learn how characteristics pass from parents to offspring.",
    "The scientist Mendel did his work with ___ plants.",
  ] },
  { id: "l3-heredity", lesson: 3, answers: [["heredity"]], wordBank: true, phrasings: [
    "Mendel's work became the basis for the study of ___, the passing of characteristics from parents to offspring.",
    "The passing of characteristics from parents to their offspring is called ___.",
  ] },
  { id: "l3-inherit", lesson: 3, answers: [["inherit", "inherited", "inheriting"]], wordBank: true, phrasings: [
    "In science, to ___ is to receive characteristics from an organism's parents.",
    "When you get curly hair from your parents, you ___ it.",
  ] },
  { id: "l3-traits", lesson: 3, answers: [["traits", "trait"]], wordBank: true, phrasings: [
    "Animals and plants pass these ___ on to their own offspring.",
    "Parents pass ___, like fur color, on to their offspring.",
  ] },
  { id: "l3-competition", lesson: 3, answers: [["competition"]], wordBank: true, phrasings: [
    "___ happens when two or more living things need the same resources to survive.",
    "Two birds want the same seeds. When living things need the same resources, that is ___.",
  ] },
  { id: "l3-advantage", lesson: 3, answers: [["advantage", "advantages"]], wordBank: true, phrasings: [
    "An ___ is a characteristic that can help an individual compete.",
    "A giraffe's long neck helps it reach food other animals can't. That is an ___.",
  ] },
  { id: "l3-match", lesson: 3, kind: "match", answers: [["heredity"], ["inherit"], ["competition"], ["advantage"]], prompts: [
    "the passing of characteristics from parents to offspring", "to receive characteristics from your parents", "when living things need the same resources", "a characteristic that helps an individual compete",
  ], phrasings: ["Match each word to what it means."] },

  // Lesson 4: How do animals respond to the environment?
  { id: "l4-blind", lesson: 4, answers: [["blind"]], phrasings: [
    "A common misconception about bats is that they are ___.",
    "Many people think bats cannot see, or are ___. That is a misconception.",
  ] },
  { id: "l4-echolocation", lesson: 4, answers: [["echolocation"]], wordBank: true, phrasings: [
    "Some bats use ___ to locate prey, such as insects.",
    "A bat makes sounds and listens for echoes to find insects. This is called ___.",
  ] },
  { id: "l4-sound", lesson: 4, answers: [["sound"]], phrasings: [
    "Echolocation uses ___ energy.",
    "When a bat uses echolocation, it uses ___ energy that bounces back as echoes.",
  ] },
  { id: "l4-behaviors", lesson: 4, answers: [["behaviors", "behavior", "behaviours", "behaviour"]], wordBank: true, phrasings: [
    "___ are the ways that animals act.",
    "The ways animals act, like running, hiding, or building nests, are called ___.",
  ] },
  { id: "l4-every", lesson: 4, answers: [["behavior", "behaviour", "behaviors"]], phrasings: [
    "Every ___ is caused by a stimulus.",
    "A stimulus causes every ___ an animal has.",
  ] },
  { id: "l4-stimulus", lesson: 4, answers: [["stimulus", "stimuli"]], wordBank: true, phrasings: [
    "A ___ is something that causes a reaction in a living thing.",
    "A loud noise makes a rabbit run. The noise is a ___, something that causes a reaction.",
  ] },
  { id: "l4-wings", lesson: 4, anyOrder: true, answers: [["wings", "wing"], ["fur"]], phrasings: [
    "Animals inherit physical characteristics, such as ___ or ___, from their parents.",
    "Physical characteristics like ___ and ___ are passed from parents to their young.",
  ] },
  { id: "l4-instinct", lesson: 4, answers: [["instinct", "instincts"]], wordBank: true, phrasings: [
    "An ___ is a behavior that is inherited.",
    "A baby turtle knows to crawl to the ocean without being taught. That inherited behavior is an ___.",
  ] },
  { id: "l4-needs", lesson: 4, answers: [["needs", "need"]], phrasings: [
    "Instincts help animals meet their ___ and respond to stimuli in their environments.",
    "Instincts help animals get what they ___ and respond to stimuli.",
  ] },
  { id: "l4-examples", lesson: 4, kind: "list", answers: [["echolocation"], ["migration", "migrate"], ["hibernation", "hibernate"]], phrasings: [
    "Name 3 examples of instinctive behaviors (any order).",
    "List 3 behaviors that animals do by instinct (any order).",
  ] },
  { id: "l4-match", lesson: 4, kind: "match", answers: [["behavior"], ["stimulus"], ["instinct"], ["echolocation"]], prompts: [
    "the way an animal acts", "something that causes a reaction", "a behavior that is inherited", "using sound to find prey",
  ], phrasings: ["Match each word to what it means."] },
];

export const SAVVAS_CH3_LESSONS: { lesson: number; title: string; learn: { term: string; explain: string }[] }[] = [
  { lesson: 1, title: "How are plants and animals classified?", learn: [
    { term: "classify", explain: "To classify is to sort things into groups by their properties or characteristics. Scientists sort all living things, like plants and animals, into groups." },
    { term: "plants", explain: "Scientists classify plants by how they transport nutrients and how they reproduce." },
    { term: "vertebrates", explain: "Animals are classified by physical characteristics. Vertebrates have backbones. The 5 groups are fish, amphibians, reptiles, birds, and mammals." },
    { term: "invertebrates", explain: "Invertebrates have no backbone. Most animals on Earth are invertebrates." },
    { term: "exoskeleton", explain: "Insects, spiders, crabs, and shrimp are arthropods. Their bodies are covered by an exoskeleton, a hard, lightweight outer skin. Others, like worms, have no protection for their soft bodies." },
  ] },
  { lesson: 2, title: "What are adaptations?", learn: [
    { term: "adaptation", explain: "An adaptation is a physical feature or behavior that helps an organism survive in its environment. Living things in different areas have different adaptations." },
    { term: "getting food", explain: "Sharp beaks, teeth, or claws help animals get food." },
    { term: "staying safe", explain: "Stingers, quills, smelly sprays, or bitter-tasting flesh protect animals from being eaten by predators. Bright colors, like the monarch butterfly's, warn predators that it is poisonous." },
    { term: "hibernation", explain: "Hibernation is a state of rest. It helps some animals survive low temperatures." },
    { term: "plant adaptations", explain: "Plant adaptations help plants survive in their environments and reproduce. They help plants pollinate or spread seeds. Harmful oils and thorns protect plants from being eaten." },
  ] },
  { lesson: 3, title: "What plant and animal characteristics are inherited?", learn: [
    { term: "characteristics", explain: "Characteristics are the qualities an organism has." },
    { term: "Mendel", explain: "Mendel studied pea plants. He found that offspring did not always look exactly like their parents." },
    { term: "heredity", explain: "Heredity is the passing of characteristics from parents to offspring. Mendel's work became the basis for studying heredity." },
    { term: "inherit and traits", explain: "To inherit is to receive characteristics from your parents. Plants and animals pass these traits on to their offspring." },
    { term: "competition and advantage", explain: "Competition happens when two or more living things need the same resources. An advantage is a characteristic that helps an individual compete." },
  ] },
  { lesson: 4, title: "How do animals respond to the environment?", learn: [
    { term: "echolocation", explain: "Bats are not blind. That is a misconception. Some bats use echolocation to find prey, like insects. Echolocation uses sound energy." },
    { term: "behavior and stimulus", explain: "Behaviors are the ways animals act. Every behavior is caused by a stimulus. A stimulus is something that causes a reaction in a living thing." },
    { term: "inherited body parts", explain: "Animals inherit physical characteristics, like wings or fur, from their parents." },
    { term: "instinct", explain: "An instinct is a behavior that is inherited. Instincts help animals meet their needs and respond to stimuli. Examples are echolocation, migration, and hibernation." },
  ] },
];
