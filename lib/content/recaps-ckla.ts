import type { CompactRecap } from "@/lib/content/recaps";

/** CKLA Unit 2, Empires in the Middle Ages. Original wording; battles shown as maps, castles, and banners only. */
export const CKLA_RECAPS: Record<string, CompactRecap> = {
  "ckla.u2.ch1": {
    slides: [
      ["Old stone columns of a faded Roman temple with grass growing around them", "Long ago, the western Roman Empire faded away."],
      ["A friendly timeline ribbon with a castle in the middle between old columns and a modern city", "The long time after Rome is called the Middle Ages. Medieval means from that time."],
      ["A colorful cartoon map of Europe with little castles dotted across the countries", "Its lands later became places we call Spain, France, England, and Italy."],
      ["A nobleman in a rich cloak standing proudly in front of green fields and a manor house", "A nobleman was a person of high rank who held land."],
      ["A stone church and a grand family manor side by side in a village", "Powerful families and church leaders shaped daily life."],
      ["Villagers closing a big wooden town gate as small boats appear far away on a river", "Raiders could seize towns, so people worked hard to stay safe."],
    ],
    check: { prompt: "Tap the picture that shows a nobleman who held land.", choices: [2, 3, 0], answer: 3, right: "Yes! A nobleman had high rank and held land.", wrong: "Not quite. Look for the person in a rich cloak with fields behind him." },
    tryAtHome: {
      title: "Map your medieval kingdom",
      materials: ["paper", "crayons or markers"],
      steps: ["Draw an imaginary kingdom with a river and hills.", "Add a castle, a church, a village, and farm fields.", "Give your kingdom a name.", "Tell a grown-up who would live in each place."],
      safety: "Just paper and crayons. Have fun!",
    },
  },
  "ckla.u2.ch2": {
    slides: [
      ["A bird's-eye view of a manor house, a small village, a church, and striped farm fields", "A manor was a lord's land plus the village around it."],
      ["A lord in a cloak standing at the gate of a manor house with a shield on the wall", "The lord promised to protect the people of the manor."],
      ["Farmers harvesting golden wheat with baskets and sickles in a sunny field", "Serfs farmed the land. They owed the lord work and crops."],
      ["A lady of the manor holding a ring of keys and planning with helpers in a busy kitchen hall", "The lady of the manor ran much of the household."],
      ["A farmer and a lord shaking hands in front of a field and a manor house", "Lords and serfs needed each other. Loyalty mattered a lot."],
      ["A faithful helper carrying a basket alongside a lord on a path through the manor", "A loyal helper was faithful and true, and that was prized."],
    ],
    check: { prompt: "Tap the picture that shows serfs working the land.", choices: [1, 2, 3], answer: 2, right: "Yes! Serfs farmed the land and owed work and crops.", wrong: "Not quite. Look for the people harvesting in the field." },
    tryAtHome: {
      title: "Draw a manor map",
      materials: ["paper", "crayons", "a ruler (optional)"],
      steps: ["Draw the lord's manor house in the middle.", "Add the village, a church, a mill, and strips of farm fields.", "Draw a path that connects everything.", "Explain to a grown-up what the lord gave and what the serfs gave."],
      safety: "No special safety needs.",
    },
  },
  "ckla.u2.ch3": {
    slides: [
      ["A big stone castle with thick walls, towers, and colorful banners on a green hill", "A castle was much more than a big house."],
      ["Villagers walking safely inside a castle courtyard surrounded by thick walls", "Thick walls enclosed a safe space when danger came near."],
      ["A castle on a hill surrounded by many small tents with flags in the fields around it", "When an army camped outside to trap people in, that was a siege."],
      ["A suit of shiny knight's armor standing on display with a helmet and shield", "Knights wore armor, a metal covering, for protection."],
      ["A young squire practicing with a wooden shield and helping polish a knight's helmet", "Knights trained for years, starting as young helpers."],
      ["A small bag of gold coins being handed over at a castle gate while a knight walks free", "A captured knight might be freed if a ransom was paid."],
    ],
    check: { prompt: "Tap the picture that shows a siege.", choices: [0, 2, 3], answer: 2, right: "Yes! The army's tents surround the castle. That's a siege.", wrong: "Not quite. Look for the castle with tents camped all around it." },
    tryAtHome: {
      title: "Design a coat of arms",
      materials: ["paper", "crayons or markers", "scissors (with a grown-up)"],
      steps: ["Draw a big shield shape.", "Split it into two or four parts with lines.", "Fill each part with a symbol that stands for you, like a book or a cat.", "Pick two or three bold colors and tell your family what each symbol means."],
      safety: "Ask a grown-up for help with scissors.",
    },
  },
  "ckla.u2.ch4": {
    slides: [
      ["A busy medieval market square with colorful stalls of bread, cloth, and fruit", "Towns began to thrive when merchants sold goods at busy markets."],
      ["A merchant at a stall holding up a roll of bright cloth for shoppers", "A merchant was a person who bought and sold goods."],
      ["A narrow muddy town street with puddles, carts, chickens, and timber houses", "Streets could be muddy, noisy, and full of hustle and bustle."],
      ["A boy apprentice learning to make shoes at a workbench beside a master shoemaker", "A young apprentice learned a craft from a master."],
      ["A bell ringing in a tower at dusk while townspeople head home with lanterns", "A curfew bell told people when to go indoors."],
      ["A cozy inn with travelers sharing bread and soup at a long wooden table", "Inns and taverns served food and talk after a day's work."],
    ],
    check: { prompt: "Tap the picture that shows an apprentice learning a craft.", choices: [0, 4, 3], answer: 3, right: "Yes! The apprentice learns shoemaking from a master.", wrong: "Not quite. Look for the young learner at the workbench." },
    tryAtHome: {
      title: "Run a market stall",
      materials: ["toys or snacks to 'sell'", "paper for price tags", "play coins"],
      steps: ["Set up a table as your market stall.", "Make price tags for each item.", "Take turns being the merchant and the shopper.", "Ring a 'curfew bell' to close the market!"],
      safety: "Only use snacks a grown-up says are okay.",
    },
  },
  "ckla.u2.ch5": {
    slides: [
      ["A large stone cathedral with a tall pointed spire rising above a medieval town", "The Church was a center of faith and community."],
      ["A round, glowing stained-glass rose window with colorful petal shapes and no figures", "Churches had tall spires and glowing rose windows."],
      ["Monks in simple brown robes reading and praying in a quiet stone cloister garden", "Some people chose a humble life devoted to prayer."],
      ["A monk carefully copying a book with colorful decorated borders by candlelight", "Monks also copied books by hand and kept learning alive."],
      ["Villagers enjoying a joyful feast day with banners, music, and a long table of food", "Feast days and days of fasting marked the year."],
      ["A peaceful village where every path leads to the church in the center", "Sacred places felt set apart as holy."],
    ],
    check: { prompt: "Tap the picture that shows a rose window.", choices: [0, 1, 4], answer: 1, right: "Yes! A rose window is a round window of colorful glass.", wrong: "Not quite. Look for the round, glowing glass window." },
    tryAtHome: {
      title: "Paper rose window",
      materials: ["a paper plate or circle of black paper", "colored tissue paper", "glue stick", "scissors (with a grown-up)"],
      steps: ["Have a grown-up cut petal-shaped holes in the circle.", "Glue tissue paper squares over the holes.", "Tape it to a sunny window.", "Watch the colors glow like a church window!"],
      safety: "Ask a grown-up to do the cutting.",
    },
  },
  "ckla.u2.ch6": {
    slides: [
      ["Two royal crowns floating above a map of England with a question mark-shaped ribbon", "In 1066, two leaders both claimed the crown of England."],
      ["A colorful map of England and Normandy with a dotted path of small ships across the sea", "William of Normandy sailed across the sea to England."],
      ["A map showing two sets of colorful banners on hills near the town of Hastings", "The two armies met near a place called Hastings."],
      ["A game board with arrow pieces moving back and then turning forward", "A clever tactic was the feigned retreat: pretend to run, then turn back."],
      ["A new king with a crown standing in front of a castle with flying banners", "William won and became king of England."],
      ["A very long embroidered cloth unrolled across a museum wall showing boats and horses", "His side made records and a long stitched cloth that told the story."],
    ],
    check: { prompt: "Tap the picture that shows the tactic of a feigned retreat.", choices: [3, 1, 5], answer: 3, right: "Yes! Pretend to go back, then turn around. That's a feigned retreat.", wrong: "Not quite. Look for the arrows that go back and then turn forward." },
    tryAtHome: {
      title: "Stitch-a-story strip",
      materials: ["a long strip of paper (tape pages together)", "crayons"],
      steps: ["Think of a story from your week.", "Draw it in order, left to right, like a comic with no words.", "Add a border along the top and bottom.", "Unroll it and tell your family the story."],
      safety: "No special safety needs.",
    },
  },
  "ckla.u2.ch7": {
    slides: [
      ["A king with a crown and a red cloak holding a scroll in front of a castle", "Henry II wanted one set of royal laws across his lands."],
      ["A judge in a robe riding a horse along a country road toward a village", "He appointed judges who traveled from place to place."],
      ["A judge listening to two villagers in a simple courtroom hall", "Judges heard cases and decided if someone was innocent or guilty."],
      ["A balance scale with two even pans on a wooden table", "Everyone was judged by the same royal rules."],
      ["A broken chain link next to a crown on a velvet cushion", "Treason meant betraying the ruler."],
      ["A king's crown and a church leader's tall hat placed far apart on a table", "Henry also had a sad falling-out with a church leader."],
    ],
    check: { prompt: "Tap the picture that shows a traveling royal judge.", choices: [0, 1, 4], answer: 1, right: "Yes! Henry's judges rode from town to town to hear cases.", wrong: "Not quite. Look for the judge riding along the road." },
    tryAtHome: {
      title: "Family fair-rules court",
      materials: ["paper and a pencil"],
      steps: ["Write three fair rules for a family game.", "Make sure the rules are the same for everyone.", "Take turns being the 'traveling judge' who checks the rules.", "Talk about why the same rules for all is fair."],
      safety: "No special safety needs.",
    },
  },
  "ckla.u2.ch8": {
    slides: [
      ["A frowning king on a throne with a pile of coins while nobles look upset", "King John made nobles angry. He took too much and asked too often."],
      ["Nobles around a table pointing at a scroll and talking with each other", "They wanted the king to consult them before deciding."],
      ["A sunny green meadow beside a river with a royal tent and colorful banners", "They met the king at a meadow called Runnymede."],
      ["A rolled parchment scroll with a red wax seal on a wooden table", "In 1215, the king accepted Magna Carta, a written agreement."],
      ["A crown sitting next to a fence line marking a boundary", "Magna Carta said even a king had limits."],
      ["Many people in a sunny town square holding up scrolls together", "That idea later inspired people who wanted fairer rules."],
    ],
    check: { prompt: "Tap the picture that shows Magna Carta.", choices: [2, 3, 0], answer: 3, right: "Yes! Magna Carta was a written agreement with a seal.", wrong: "Not quite. Look for the scroll with the wax seal." },
    tryAtHome: {
      title: "Write a family charter",
      materials: ["paper", "a pencil", "a crayon for the 'seal'"],
      steps: ["Write three promises everyone in the family agrees to, even grown-ups.", "Talk it over: ask everyone before deciding.", "Everyone signs it.", "Draw a big red 'wax seal' circle at the bottom."],
      safety: "No special safety needs.",
    },
  },
  "ckla.u2.ch9": {
    slides: [
      ["A map of Europe with many small banners and a long, winding timeline arrow", "Long wars went on for many years in Europe."],
      ["A quiet medieval village with closed shutters under a soft gray sky", "A terrible sickness, the plague, spread from person to person."],
      ["A rope slowly unraveling between a manor house and a village", "So many people were lost that old ties began to unravel."],
      ["A growing town with new buildings, a busy bridge, and workshops", "Towns grew, and new tools and ideas appeared."],
      ["Two people at a table shaking hands over a paper agreement", "People had to negotiate new ways to live and work."],
      ["A sunrise over a medieval town with a new road leading forward", "The medieval world changed, and a new age began."],
    ],
    check: { prompt: "Tap the picture that shows people negotiating.", choices: [3, 4, 0], answer: 4, right: "Yes! Negotiating means talking until you agree.", wrong: "Not quite. Look for the two people agreeing at a table." },
    tryAtHome: {
      title: "Then and now timeline",
      materials: ["a long strip of paper", "crayons"],
      steps: ["Draw a castle on the left end and your house on the right.", "Add pictures of things that changed: towns, tools, travel.", "Talk about one thing that changed after the Middle Ages.", "Practice negotiating: agree on a family movie together!"],
      safety: "No special safety needs.",
    },
  },
};
