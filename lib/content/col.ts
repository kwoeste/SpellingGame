import { buildChapter, type CompactChapter } from "@/lib/content/build";

function religion(partial: Omit<CompactChapter, "book" | "subject" | "religion">): CompactChapter {
  return { ...partial, book: "col", subject: "religion", religion: true };
}

const col: CompactChapter[] = [
  religion({
    id: "col.ch1",
    number: 1,
    titleKid: "We believe",
    unit: "Unit 1",
    bigQuestion: "How do we come to faith in Jesus?",
    paragraphs: [
      "Christians believe Jesus is truly God and truly human. That mystery is called the Incarnation. Faith is trusting God even when we cannot see everything.",
      "The Gospel tells how Thomas wanted to see and touch before he believed. Jesus invited him to believe, and Thomas answered with love.",
    ],
    vocab: [
      { word: "Incarnation", definition: "the Son of God becoming truly human" },
      { word: "faith", definition: "trust in God and in what God has revealed" },
    ],
    sequence: ["Friends tell Thomas the news", "Thomas wants to see", "Jesus comes among them", "Thomas believes"],
    proofs: [
      {
        stem: "What is faith?",
        options: ["A kind of coin", "Trust in God", "A map of Rome", "A castle wall"],
        answer: 1,
        evidence: 2,
        why: "Not yet. Find the sentence that names faith.",
      },
    ],
    gameId: "saint-cards",
  }),
  religion({
    id: "col.ch2",
    number: 2,
    titleKid: "God's Word",
    unit: "Unit 1",
    bigQuestion: "How does Scripture help us?",
    paragraphs: [
      "Scripture is the holy writings God gave his people. The Bible has an Old Testament and a New Testament.",
      "The four Gospels tell the good news of Jesus. Salvation is God's loving plan to bring us home to him.",
    ],
    vocab: [
      { word: "Scripture", definition: "the holy writings of the Bible" },
      { word: "Gospel", definition: "the good news of Jesus" },
      { word: "salvation", definition: "God's loving plan to save us" },
    ],
    sequence: ["God speaks", "Writings are gathered", "We hear a reading", "We try to live it"],
    proofs: [
      {
        stem: "What are the Gospels?",
        options: ["Tax lists", "The good news of Jesus", "A kind of feast only", "Roman roads"],
        answer: 1,
        evidence: 2,
        why: "Not yet. Look at the sentence about the four Gospels.",
      },
    ],
  }),
  religion({
    id: "col.ch3",
    number: 3,
    titleKid: "The Church on rock",
    unit: "Unit 1",
    bigQuestion: "How does Jesus care for the Church?",
    paragraphs: [
      "Jesus called Peter a rock and asked him to care for the flock. The Church is the family of people who follow Jesus.",
      "Grace is God's own life and help in us. We ask the Holy Spirit to make us brave and kind.",
    ],
    vocab: [
      { word: "grace", definition: "God's own life and help in us" },
    ],
    sequence: ["Jesus asks a question", "Peter answers", "Jesus gives Peter a mission", "The Church is cared for"],
    proofs: [
      {
        stem: "What is grace?",
        options: ["A kind of bread only", "God's own life and help in us", "A Roman coin", "A weather report"],
        answer: 1,
        evidence: 2,
        why: "Not yet. Find the sentence that defines grace.",
      },
    ],
  }),
  religion({
    id: "col.ch4",
    number: 4,
    titleKid: "Unit 1 looking back",
    unit: "Unit 1",
    bigQuestion: "What have we learned about God and the Church?",
    paragraphs: [
      "We remember that God came close to us in Jesus. Faith, Scripture, and the Church help us walk with him.",
      "A soul is the unseen part of us that lives for God. Heaven is life with God forever.",
    ],
    vocab: [
      { word: "soul", definition: "the unseen part of a person that lives for God" },
      { word: "heaven", definition: "life with God forever" },
    ],
    sequence: ["We hear God's Word", "We believe", "We belong to the Church", "We hope for heaven"],
    proofs: [
      {
        stem: "What is heaven?",
        options: ["A market stall", "Life with God forever", "A kind of armor", "A science tool"],
        answer: 1,
        evidence: 3,
        why: "Not yet. Look at the sentence about heaven.",
      },
    ],
  }),
  religion({
    id: "col.ch5",
    number: 5,
    titleKid: "We talk with God",
    unit: "Unit 2",
    bigQuestion: "Why do we pray?",
    paragraphs: [
      "Prayer is talking and listening to God. Jesus taught a prayer we still say, the Lord's Prayer.",
      "Jesus healed people and forgave them. We can bring our needs and thanks to God each day.",
    ],
    vocab: [
      { word: "prayer", definition: "talking and listening to God" },
      { word: "Lord's Prayer", definition: "the prayer Jesus taught his friends" },
    ],
    sequence: ["We become still", "We speak to God", "We listen", "We live what we asked"],
    proofs: [
      {
        stem: "What is prayer?",
        options: ["A math fact", "Talking and listening to God", "A kind of castle", "A weather chart"],
        answer: 1,
        evidence: 0,
        why: "Not yet. Find the first sentence about prayer.",
      },
    ],
    gameId: "prayer-builder",
  }),
  religion({
    id: "col.ch6",
    number: 6,
    titleKid: "A listening conscience",
    unit: "Unit 2",
    bigQuestion: "How do we choose what is right?",
    paragraphs: [
      "Conscience is the quiet inner voice that helps us know right from wrong. We form it by learning God's way.",
      "A venial sin wounds love. A mortal sin is a very serious wrong that a person knows is wrong and freely chooses anyway. It turns us away from God. God is always ready to forgive a sorry heart.",
    ],
    vocab: [
      { word: "conscience", definition: "the inner voice that helps us know right from wrong" },
      { word: "mortal sin", definition: "a very serious sin, chosen freely and knowingly, that turns us from God" },
      { word: "venial sin", definition: "a less serious sin that wounds love" },
    ],
    sequence: ["We face a choice", "We listen to conscience", "We choose", "We ask forgiveness if we fail"],
    proofs: [
      {
        stem: "What is conscience?",
        options: ["A kind of feast", "The inner voice that helps us know right from wrong", "A Roman law only", "A market tax"],
        answer: 1,
        evidence: 0,
        why: "Not yet. Look at the sentence that names conscience.",
      },
    ],
  }),
  religion({
    id: "col.ch7",
    number: 7,
    titleKid: "We worship",
    unit: "Unit 2",
    bigQuestion: "How do we give God our best?",
    paragraphs: [
      "Worship is giving God honor and love. A sacrifice is a gift offered to God.",
      "The people of Israel learned to honor God. Jesus offered the perfect gift of himself.",
    ],
    vocab: [
      { word: "worship", definition: "giving God honor and love" },
      { word: "sacrifice", definition: "a gift offered to God" },
    ],
    sequence: ["We gather", "We praise", "We offer our gifts", "We go out to love"],
    proofs: [
      {
        stem: "What is worship?",
        options: ["Ignoring God", "Giving God honor and love", "A kind of weather", "A math game"],
        answer: 1,
        evidence: 0,
        why: "Not yet. Find the sentence about honor and love.",
      },
    ],
  }),
  religion({
    id: "col.ch8",
    number: 8,
    titleKid: "The Ten Commandments",
    unit: "Unit 2",
    bigQuestion: "How does God guide our choices?",
    paragraphs: [
      "God made a covenant, a holy promise, with his people. The Ten Commandments show us how to love God and love our neighbor.",
      "The first three commandments honor God. The other seven teach us to honor family, life, marriage, truth, and what belongs to others.",
    ],
    vocab: [
      { word: "covenant", definition: "a holy promise between God and people" },
      { word: "Ten Commandments", definition: "God's ten ways to love God and neighbor" },
    ],
    sequence: ["God calls the people", "A covenant is made", "Commandments are given", "People try to live them"],
    proofs: [
      {
        stem: "What do the Ten Commandments show?",
        options: ["How to build a castle", "How to love God and neighbor", "How to count coins", "How to map Rome"],
        answer: 1,
        evidence: 1,
        why: "Not yet. Look at the sentence about love of God and neighbor.",
      },
    ],
    gameId: "ten-commandments",
  }),
  religion({
    id: "col.ch9",
    number: 9,
    titleKid: "Unit 2 looking back",
    unit: "Unit 2",
    bigQuestion: "How do prayer and the commandments shape us?",
    paragraphs: [
      "We look back at prayer, conscience, worship, and the commandments. Mary said yes to God. The Angelus is a prayer that remembers that yes.",
      "God still invites us to choose love each day.",
    ],
    vocab: [
      { word: "Angelus", definition: "a prayer that remembers Mary's yes to God" },
    ],
    sequence: ["We pray", "We listen to conscience", "We keep the commandments", "We remember Mary's yes"],
    proofs: [
      {
        stem: "What is the Angelus?",
        options: ["A market tax", "A prayer that remembers Mary's yes", "A kind of armor", "A science tool"],
        answer: 1,
        evidence: 2,
        why: "Not yet. Find the sentence about the Angelus.",
      },
    ],
    gameId: "church-year",
  }),
  religion({
    id: "col.ch10",
    number: 10,
    titleKid: "We adore God",
    unit: "Unit 3",
    bigQuestion: "How do we put God first?",
    paragraphs: [
      "To adore God is to love him above all things. We praise God with words, song, and quiet hearts.",
      "Nothing we own is greater than God. We can thank God for good gifts without making those gifts into idols.",
    ],
    vocab: [
      { word: "adore", definition: "to love and honor God above all" },
    ],
    sequence: ["We notice God's gifts", "We thank God", "We put God first", "We share the gifts"],
    proofs: [
      {
        stem: "What does it mean to adore God?",
        options: ["To love and honor God above all", "To hide from neighbors", "To skip prayer", "To collect coins"],
        answer: 0,
        evidence: 0,
        why: "Not yet. Look at the first sentence.",
      },
    ],
  }),
  religion({
    id: "col.ch11",
    number: 11,
    titleKid: "God's holy name",
    unit: "Unit 3",
    bigQuestion: "Why do we honor God's name?",
    paragraphs: [
      "God told Moses his holy name: I AM. The name of Jesus is holy too.",
      "Blasphemy is speaking about God or holy things with hate or scorn. We honor God's name when we speak it with love and keep our promises.",
    ],
    vocab: [
      { word: "blasphemy", definition: "speaking about God or holy things with hate or scorn" },
    ],
    sequence: ["Moses meets God", "God shares the holy name", "We learn Jesus' name", "We speak it with love"],
    proofs: [
      {
        stem: "How should we use God's name?",
        options: ["As a joke only", "With love and care", "Never at all in prayer", "To scare people"],
        answer: 1,
        evidence: 3,
        why: "Not yet. Find the sentence about speaking the name with love.",
      },
    ],
  }),
  religion({
    id: "col.ch12",
    number: 12,
    titleKid: "The Lord's Day",
    unit: "Unit 3",
    bigQuestion: "Why do we keep Sunday holy?",
    paragraphs: [
      "God rested after creation and gave a day for rest and worship. For Christians the Lord's Day is Sunday, the day we celebrate the Resurrection.",
      "We gather for Mass, rest from unnecessary work, and make time for family and the poor.",
    ],
    vocab: [
      { word: "Lord's Day", definition: "Sunday, the day we celebrate the Resurrection" },
    ],
    sequence: ["The week begins", "We gather for Mass", "We rest and pray", "We care for others"],
    proofs: [
      {
        stem: "What is the Lord's Day for Christians?",
        options: ["Monday market day", "Sunday, the Resurrection day", "A Roman tax day", "A siege day"],
        answer: 1,
        evidence: 1,
        why: "Not yet. Look at the sentence about Sunday.",
      },
    ],
    gameId: "church-year",
  }),
  religion({
    id: "col.ch13",
    number: 13,
    titleKid: "Unit 3 looking back",
    unit: "Unit 3",
    bigQuestion: "How do we keep God first?",
    paragraphs: [
      "Jesus told a story about a sower. Seed that falls on good soil grows. Our hearts can be that good soil when we listen.",
      "We review adoring God, honoring his name, and keeping the Lord's Day.",
    ],
    vocab: [
      { word: "sower", definition: "someone who plants seed" },
    ],
    sequence: ["Seed is scattered", "Some ground is hard", "Some ground is good", "Good soil grows a harvest"],
    proofs: [
      {
        stem: "What happens to seed in good soil?",
        options: ["It dries up at once", "It grows", "It turns into stone", "It disappears"],
        answer: 1,
        evidence: 1,
        why: "Not yet. Find the sentence about good soil.",
      },
    ],
  }),
  religion({
    id: "col.ch14",
    number: 14,
    titleKid: "We honor family",
    unit: "Unit 4",
    bigQuestion: "How do we live the fourth commandment?",
    paragraphs: [
      "Jesus grew up in a family with Mary and Joseph. We honor parents and the people who care for us.",
      "Love in a family looks like patience, honesty, and help with everyday work.",
    ],
    vocab: [
      { word: "honor", definition: "to show respect and love" },
    ],
    sequence: ["We listen at home", "We help", "We speak kindly", "We pray for our family"],
    proofs: [
      {
        stem: "How can we honor family?",
        options: ["By ignoring them", "With respect, help, and kindness", "By hiding chores", "By breaking promises"],
        answer: 1,
        evidence: 2,
        why: "Not yet. Look at the sentence about patience and help.",
      },
    ],
  }),
  religion({
    id: "col.ch15",
    number: 15,
    titleKid: "Love of neighbor",
    unit: "Unit 4",
    bigQuestion: "Who is my neighbor?",
    paragraphs: [
      "Jesus told about a traveler who was hurt. A kind stranger stopped, cared for him, and paid for a safe place to heal.",
      "A neighbor is anyone who needs our help, not only a friend we already know.",
    ],
    vocab: [
      { word: "neighbor", definition: "anyone who needs our love and help" },
    ],
    sequence: ["Someone is hurt", "Some people pass by", "A kind person stops", "Care is given"],
    proofs: [
      {
        stem: "Who is a neighbor?",
        options: ["Only people on our street", "Anyone who needs our help", "Only kings", "Only classmates we like"],
        answer: 1,
        evidence: 2,
        why: "Not yet. Find the sentence that names a neighbor.",
      },
    ],
  }),
  religion({
    id: "col.ch16",
    number: 16,
    titleKid: "We respect our bodies",
    unit: "Unit 4",
    bigQuestion: "How do we treat our bodies as gifts?",
    paragraphs: [
      "Our bodies are gifts. Modesty is a way of protecting the dignity of ourselves and others.",
      "We care for health, speak with respect, and remember that we are temples of the Holy Spirit.",
    ],
    vocab: [
      { word: "modesty", definition: "protecting the dignity of ourselves and others" },
    ],
    sequence: ["We thank God for our bodies", "We choose respectful words", "We care for health", "We honor others"],
    proofs: [
      {
        stem: "What is modesty?",
        options: ["Showing off", "Protecting dignity", "A kind of tax", "A castle job"],
        answer: 1,
        evidence: 1,
        why: "Not yet. Look at the sentence about dignity.",
      },
    ],
  }),
  religion({
    id: "col.ch17",
    number: 17,
    titleKid: "We share what we have",
    unit: "Unit 4",
    bigQuestion: "How do we live generously?",
    paragraphs: [
      "God gives gifts so we can share them. People who care for the poor show us what love looks like in action.",
      "We can share time, kind words, and things we own. Small gifts matter.",
    ],
    vocab: [
      { word: "generosity", definition: "sharing freely with others" },
    ],
    sequence: ["We notice a need", "We choose to share", "Someone is helped", "Joy grows"],
    proofs: [
      {
        stem: "What can we share?",
        options: ["Only gold coins", "Time, words, and things we own", "Nothing at all", "Only leftover crumbs of anger"],
        answer: 1,
        evidence: 2,
        why: "Not yet. Find the sentence about time and kind words.",
      },
    ],
  }),
  religion({
    id: "col.ch18",
    number: 18,
    titleKid: "We use our gifts",
    unit: "Unit 4",
    bigQuestion: "What does Jesus ask us to do with our talents?",
    paragraphs: [
      "Jesus told a story about servants who were trusted with gifts. The ones who used the gifts well were praised.",
      "A witness shows by words and actions that God is good. We do not hide our gifts in a hole.",
    ],
    vocab: [
      { word: "witness", definition: "someone who shows God's goodness by word and action" },
    ],
    sequence: ["Gifts are given", "Some people use them", "Some people hide them", "The giver asks what we did"],
    proofs: [
      {
        stem: "What is a witness?",
        options: ["Someone who hides every gift", "Someone who shows God's goodness", "A kind of armor", "A weather tool"],
        answer: 1,
        evidence: 2,
        why: "Not yet. Look at the sentence that defines witness.",
      },
    ],
  }),
  religion({
    id: "col.ch19",
    number: 19,
    titleKid: "We stand for truth",
    unit: "Unit 4",
    bigQuestion: "Why does truth matter?",
    paragraphs: [
      "Jesus suffered for the truth. A martyr is someone who gives up their life rather than turn away from God.",
      "We practice truth in small ways: honest words, keeping secrets that should be kept, and speaking up kindly.",
    ],
    vocab: [
      { word: "martyr", definition: "someone who gives up their life rather than turn away from God" },
    ],
    sequence: ["A hard choice appears", "We tell the truth", "It may cost us", "God is still with us"],
    proofs: [
      {
        stem: "What is a martyr?",
        options: ["A market seller", "Someone who gives their life for God", "A kind of feast only", "A Roman road"],
        answer: 1,
        evidence: 1,
        why: "Not yet. Find the sentence that names a martyr.",
      },
    ],
  }),
  religion({
    id: "col.ch20",
    number: 20,
    titleKid: "Unit 4 looking back",
    unit: "Unit 4",
    bigQuestion: "How do we walk a path for life?",
    paragraphs: [
      "We look back at family, neighbors, respect, sharing, gifts, and truth. These are a path for life.",
      "God walks with us as we practice love one choice at a time.",
    ],
    vocab: [
      { word: "path", definition: "a way to walk, in life or on land" },
    ],
    sequence: ["We honor family", "We help neighbors", "We share gifts", "We tell the truth"],
    proofs: [
      {
        stem: "What is this unit's path about?",
        options: ["Only maps of Europe", "Living love in daily choices", "Building circuits", "Counting dice"],
        answer: 1,
        evidence: 2,
        why: "Not yet. Find the sentence about practicing love.",
      },
    ],
  }),
  religion({
    id: "col.ch21",
    number: 21,
    titleKid: "The Beatitudes",
    unit: "Unit 5",
    bigQuestion: "What kind of happiness does Jesus bless?",
    paragraphs: [
      "On a mountain, Jesus taught the Beatitudes. He said the poor in spirit, the merciful, and the peacemakers are blessed.",
      "The Sermon on the Mount shows a way of living that looks like God's heart. Happiness here is deeper than getting every toy.",
    ],
    vocab: [
      { word: "Beatitudes", definition: "Jesus' blessings that show true happiness" },
      { word: "Sermon on the Mount", definition: "Jesus' teaching on a mountain about God's way" },
    ],
    sequence: ["People gather", "Jesus teaches", "He names who is blessed", "We try those ways"],
    proofs: [
      {
        stem: "What are the Beatitudes?",
        options: ["Roman taxes", "Jesus' blessings that show true happiness", "A kind of armor", "Market rules"],
        answer: 1,
        evidence: 1,
        why: "Not yet. Find the sentence that names the Beatitudes.",
      },
    ],
    gameId: "beatitudes",
  }),
  religion({
    id: "col.ch22",
    number: 22,
    titleKid: "Jesus shows compassion",
    unit: "Unit 5",
    bigQuestion: "How does Jesus treat people who hurt?",
    paragraphs: [
      "Compassion means suffering with someone and then helping. Jesus noticed people others ignored.",
      "We can practice compassion with a visit, a kind word, or sharing what we have.",
    ],
    vocab: [
      { word: "compassion", definition: "suffering with someone and helping" },
    ],
    sequence: ["We notice someone hurting", "We draw near", "We help", "Hope grows"],
    proofs: [
      {
        stem: "What is compassion?",
        options: ["Walking away", "Suffering with someone and helping", "Winning a game only", "Keeping every coin"],
        answer: 1,
        evidence: 0,
        why: "Not yet. Look at the first sentence.",
      },
    ],
  }),
  religion({
    id: "col.ch23",
    number: 23,
    titleKid: "We choose what is good",
    unit: "Unit 5",
    bigQuestion: "How do we fill our minds with what is good?",
    paragraphs: [
      "Paul wrote that we should think about what is true, honorable, and lovely. Righteousness is living in a right relationship with God.",
      "Mary said yes to God. We can ask her to help us choose good thoughts and kind actions.",
    ],
    vocab: [
      { word: "righteousness", definition: "living in a right relationship with God" },
    ],
    sequence: ["We notice a thought", "We ask if it is true and kind", "We keep the good", "We let go of the rest"],
    proofs: [
      {
        stem: "What is righteousness?",
        options: ["Winning every argument", "Living in a right relationship with God", "A kind of market", "A castle job"],
        answer: 1,
        evidence: 1,
        why: "Not yet. Find the sentence that defines righteousness.",
      },
    ],
  }),
  religion({
    id: "col.ch24",
    number: 24,
    titleKid: "We work for peace",
    unit: "Unit 5",
    bigQuestion: "How do we treat Jesus in other people?",
    paragraphs: [
      "Jesus said that what we do for people in need, we do for him. Peace is more than being quiet. It is making things right.",
      "Saints who served the sick and the poor show us that peace has work to do.",
    ],
    vocab: [
      { word: "peace", definition: "making things right with God and others" },
    ],
    sequence: ["We see a need", "We remember Jesus", "We help", "Peace grows"],
    proofs: [
      {
        stem: "What did Jesus say about people in need?",
        options: ["Ignore them", "What we do for them, we do for him", "Only kings can help", "Help only on feast days"],
        answer: 1,
        evidence: 0,
        why: "Not yet. Look at the first sentence.",
      },
    ],
  }),
  religion({
    id: "col.ch25",
    number: 25,
    titleKid: "Unit 5 looking back",
    unit: "Unit 5",
    bigQuestion: "How does Jesus lead us to new life?",
    paragraphs: [
      "We remember the Beatitudes, compassion, good choices, and peace. Jesus died and rose. That is the center of our hope.",
      "Saints and ordinary friends help us keep going. We look back at the year and thank God.",
    ],
    vocab: [
      { word: "Resurrection", definition: "Jesus being raised to new life" },
    ],
    sequence: ["Jesus teaches", "Jesus suffers", "Jesus rises", "We live with hope"],
    proofs: [
      {
        stem: "What is the center of our hope?",
        options: ["A new toy", "Jesus died and rose", "A longer recess only", "A hidden treasure map"],
        answer: 1,
        evidence: 1,
        why: "Not yet. Find the sentence about Jesus dying and rising.",
      },
    ],
  }),
];

export const colChapters = col.map(buildChapter);
