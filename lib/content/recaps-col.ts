import type { CompactRecap } from "@/lib/content/recaps";

/** Christ Our Life (grade 4). Original wording that follows the approved chapter text in col.ts; reverent, traditional images. */
export const COL_RECAPS: Record<string, CompactRecap> = {
  "col.ch1": {
    slides: [
      ["A starry night over a small stable in Bethlehem with a bright star shining above", "God loved us so much that his Son came to live among us."],
      ["Baby Jesus resting in a manger with Mary and Joseph kneeling beside him, soft halos", "Jesus is truly God and truly human. We call this the Incarnation."],
      ["A child holding a candle and smiling while looking up at a softly glowing sky", "Faith means trusting God, even when we cannot see everything."],
      ["The apostle Thomas, a bearded man in a simple robe, looking puzzled among the other apostles in a room", "Thomas wanted to see and touch Jesus before he believed."],
      ["Risen Jesus in a white robe with a soft halo gently welcoming Thomas, who kneels in wonder", "Jesus came and invited Thomas to believe. Thomas said, 'My Lord and my God!'"],
      ["A family praying together at home around a small table with a candle and a cross", "We can say yes to Jesus with our faith too."],
    ],
    check: { prompt: "Tap the picture that shows Thomas believing in the risen Jesus.", choices: [1, 3, 4], answer: 4, right: "Yes! Thomas knelt and said, 'My Lord and my God!'", wrong: "Not quite. Look for Thomas kneeling before the risen Jesus." },
    tryAtHome: {
      title: "Family faith prayer",
      materials: ["a candle (grown-up lights it) or a flashlight", "a quiet spot"],
      steps: ["Gather your family in a quiet spot.", "Each person names one thing they trust God with.", "Pray together: 'Jesus, I trust in you.'", "Finish with the Sign of the Cross."],
      safety: "A grown-up should light and watch any candle.",
    },
  },
  "col.ch2": {
    slides: [
      ["A large open Bible with a golden ribbon bookmark resting on a wooden stand, pages showing only soft patterns", "Scripture is the holy writing God gave his people. We find it in the Bible."],
      ["A Bible standing open with the left half shown in olive green and the right half in sky blue", "The Bible has two parts, the Old Testament and the New Testament."],
      ["Four closed books with colorful covers decorated with a winged man, a lion, an ox, and an eagle", "The four Gospels tell the good news of Jesus."],
      ["A gentle, traditional picture of Jesus in a white robe and red mantle with a soft halo standing on a hillside teaching a crowd of happy listeners", "In the Gospels we hear what Jesus said and did."],
      ["A shepherd carrying a little lost lamb home over green hills toward a sheepfold at sunset", "Salvation is God's loving plan to bring us home to him."],
      ["A child reading a children's Bible on a cozy couch next to a parent", "When we read Scripture, God speaks to our hearts."],
    ],
    check: { prompt: "Tap the picture that shows the four Gospels.", choices: [0, 1, 2], answer: 2, right: "Yes! Matthew, Mark, Luke, and John are the four Gospels.", wrong: "Not quite. Look for the four books with their special symbols." },
    tryAtHome: {
      title: "A family Bible moment",
      materials: ["a children's Bible"],
      steps: ["Pick a short Gospel story together.", "Read it out loud, taking turns.", "Each person tells their favorite part.", "Thank God for his Word with a short prayer."],
      safety: "No special safety needs.",
    },
  },
  "col.ch3": {
    slides: [
      ["Jesus in a white robe and red mantle with a soft halo, placing a hand on the shoulder of the apostle Peter beside a large rock by the sea", "Jesus called Peter a rock. He built his Church on him."],
      ["Peter, a bearded man in a simple robe, gently tending a flock of white sheep on a green hill", "Jesus asked Peter to care for his flock, the people of God."],
      ["A big happy crowd of all kinds of people walking together toward a church with a cross", "The Church is the family of people who follow Jesus."],
      ["Warm golden light shining down on a child with hands folded in prayer", "Grace is God's own life and help in us."],
      ["A white dove with soft rays of light above a group of children helping each other", "We ask the Holy Spirit to make us brave and kind."],
      ["A child bringing a meal to a neighbor's door with a smile", "With God's grace, we can care for others like Peter did."],
    ],
    check: { prompt: "Tap the picture that shows Peter caring for the flock.", choices: [0, 1, 4], answer: 1, right: "Yes! Jesus asked Peter to feed and care for his sheep.", wrong: "Not quite. Look for Peter with the sheep." },
    tryAtHome: {
      title: "Church family tree",
      materials: ["paper", "crayons"],
      steps: ["Draw a big tree trunk and call it 'Jesus.'", "Draw branches for your family, parish, and friends.", "Add a leaf for each person who helps you know God.", "Pray for each person on your tree."],
      safety: "No special safety needs.",
    },
  },
  "col.ch4": {
    slides: [
      ["Baby Jesus in the manger with a soft glow and a star overhead", "God came close to us in Jesus."],
      ["Three symbols side by side: a candle flame, an open Bible, and a small church with a cross", "Faith, Scripture, and the Church help us walk with Jesus."],
      ["A child standing in sunshine with a soft gentle glow around the heart", "Your soul is the unseen part of you that lives for God."],
      ["Bright golden clouds and gentle light with happy angels in the sky", "Heaven is life with God forever."],
      ["A path winding up a green hill toward a glowing sunrise, with a family walking together", "Every day we can take a step closer to God."],
    ],
    check: { prompt: "Tap the picture that shows heaven, life with God forever.", choices: [1, 2, 3], answer: 3, right: "Yes! Heaven is joy with God forever.", wrong: "Not quite. Look for the golden clouds and gentle light." },
    tryAtHome: {
      title: "Faith walk",
      materials: ["a short walk outside"],
      steps: ["Take a walk with a grown-up.", "Name something you see that God made.", "Talk about one thing you learned about Jesus this unit.", "Say a thank-you prayer on the way home."],
      safety: "Walk with a grown-up and watch for cars.",
    },
  },
  "col.ch5": {
    slides: [
      ["A child kneeling beside a bed with hands folded, a moonlit window behind", "Prayer is talking and listening to God."],
      ["A gentle, traditional picture of Jesus in a white robe and red mantle with a soft halo sitting on a hillside teaching his friends how to pray, hands raised gently", "Jesus taught his friends the Lord's Prayer. We still pray it today."],
      ["A gentle, traditional picture of Jesus in a white robe and red mantle with a soft halo gently healing a sick man who sits up smiling on a mat", "Jesus healed people and forgave them."],
      ["A child at a table drawing hearts and a sun next to a prayer card with only flower designs", "We can bring God our needs and our thanks."],
      ["A family sitting together at a dinner table with heads bowed before a meal", "We can pray anywhere, anytime: at meals, in bed, or at church."],
      ["A child sitting quietly under a tree with eyes closed, listening, with birds nearby", "Prayer also means being still and listening."],
    ],
    check: { prompt: "Tap the picture that shows Jesus teaching his friends to pray.", choices: [0, 1, 2], answer: 1, right: "Yes! Jesus taught them the Lord's Prayer.", wrong: "Not quite. Look for Jesus teaching his friends on the hillside." },
    tryAtHome: {
      title: "Prayer jar",
      materials: ["a jar or box", "paper strips", "a pencil"],
      steps: ["Write family needs and thank-yous on strips of paper.", "Fold them and put them in the jar.", "Each night, pull one out and pray for it together.", "End with the Lord's Prayer."],
      safety: "No special safety needs.",
    },
  },
  "col.ch6": {
    slides: [
      ["A child pausing at a fork in a garden path, one path sunny with flowers, thinking", "Conscience is the quiet voice inside that helps us know right from wrong."],
      ["A child reading a children's Bible with a parent beside a window", "We form our conscience by learning God's way."],
      ["A small crack in a clay heart-shaped pot on a table", "A venial sin is a smaller wrong. It wounds our love."],
      ["A person walking away from a bright light down a shadowy path, seen from behind, calm not scary", "A mortal sin is a very serious wrong, chosen freely and knowingly. It turns us away from God."],
      ["A father hugging a returning son on a path outside a farmhouse, warm sunset", "God is always ready to forgive a sorry heart."],
      ["A child giving a hug to a sibling after saying sorry, both smiling", "We can say sorry, make things right, and try again."],
    ],
    check: { prompt: "Tap the picture that shows God's forgiveness.", choices: [0, 2, 4], answer: 4, right: "Yes! Like the father in Jesus' story, God welcomes us back.", wrong: "Not quite. Look for the father hugging his son who came home." },
    tryAtHome: {
      title: "Kindness and sorry practice",
      materials: ["paper", "crayons"],
      steps: ["Draw a heart and split it into four parts.", "In each part, draw a choice that shows love.", "Talk about a time you said sorry and made things right.", "Pray: 'Jesus, help me listen to my conscience.'"],
      safety: "No special safety needs.",
    },
  },
  "col.ch7": {
    slides: [
      ["A family kneeling in a church pew facing a golden altar with candles", "Worship is giving God honor and love."],
      ["Hands offering a basket of bread and grapes on a stone altar under blue sky", "A sacrifice is a gift offered to God."],
      ["Ancient Israelite people in robes gathered around a tent of meeting in the desert, praising", "The people of Israel learned to honor God."],
      ["A simple wooden cross on a hill at sunrise with soft golden light and flowers", "Jesus offered the perfect gift. He gave himself for us out of love."],
      ["A priest lifting a golden chalice at an altar during Mass, people kneeling", "At Mass, we join in Jesus' gift to the Father."],
      ["A child helping set the table and drawing a picture, giving her best work", "We give God our best in prayer, work, and kindness."],
    ],
    check: { prompt: "Tap the picture that shows a sacrifice, a gift offered to God.", choices: [0, 1, 5], answer: 1, right: "Yes! A sacrifice is a gift offered to God.", wrong: "Not quite. Look for the gift of bread and grapes on the altar." },
    tryAtHome: {
      title: "My best gift for God",
      materials: ["paper", "crayons"],
      steps: ["Pick one thing you can do with your best effort this week.", "Draw it as a gift box.", "Offer it to God with a short prayer in the morning.", "Tell your family how it went."],
      safety: "No special safety needs.",
    },
  },
  "col.ch8": {
    slides: [
      ["Moses, a bearded man in a robe, on a mountain holding two stone tablets with soft light, tablets blank", "God gave Moses the Ten Commandments on a mountain."],
      ["A rainbow over a camp of tents with families looking up in joy", "A covenant is a holy promise between God and his people."],
      ["Two stone tablets with no writing, one glowing gold and one glowing blue, side by side", "The commandments show us how to love God and love our neighbor."],
      ["A family praying in church with candles and a cross", "The first three commandments help us honor God."],
      ["Children helping parents, sharing toys, and telling the truth in three cheerful little scenes", "The other seven teach us to honor family, life, truth, and others' things."],
      ["A child following a lit path through a garden at dusk with lanterns", "God's commandments are like lights that guide our choices."],
    ],
    check: { prompt: "Tap the picture that shows Moses with the Ten Commandments.", choices: [0, 1, 5], answer: 0, right: "Yes! God gave Moses the commandments on the mountain.", wrong: "Not quite. Look for Moses holding the stone tablets." },
    tryAtHome: {
      title: "Ten finger commandments",
      materials: ["your hands", "paper"],
      steps: ["Trace both hands on paper.", "On three fingers, draw ways to love God.", "On seven fingers, draw ways to love others.", "Hang it up as a reminder."],
      safety: "No special safety needs.",
    },
  },
  "col.ch9": {
    slides: [
      ["A child folding hands with a heart, a Bible, and stone tablets drawn softly around", "We looked back at prayer, conscience, worship, and the commandments."],
      ["The Virgin Mary in a blue mantle and white veil with a soft halo, kneeling as the angel Gabriel greets her with lilies", "Mary said yes to God when the angel came."],
      ["A church bell tower ringing at noon with a farmer pausing in a field to pray", "The Angelus is a prayer that remembers Mary's yes."],
      ["A family pausing together in a kitchen at noon with heads bowed", "Many people pray the Angelus in the morning, at noon, and in the evening."],
      ["A child choosing to share a snack with a friend on a sunny playground", "God invites us to choose love every day."],
    ],
    check: { prompt: "Tap the picture that shows Mary saying yes to God.", choices: [0, 1, 4], answer: 1, right: "Yes! Mary said yes when the angel Gabriel came.", wrong: "Not quite. Look for Mary with the angel." },
    tryAtHome: {
      title: "Noon Angelus pause",
      materials: ["a timer or clock"],
      steps: ["Set a timer for noon on a weekend day.", "When it rings, stop what you're doing.", "Pray a Hail Mary together.", "Think of one way you can say yes to God today."],
      safety: "No special safety needs.",
    },
  },
  "col.ch10": {
    slides: [
      ["A family kneeling in adoration before a golden monstrance on an altar with candles", "To adore God means to love him above all things."],
      ["Children singing in a church choir with music stands showing only notes", "We praise God with words and songs."],
      ["A child sitting quietly with eyes closed in a sunlit chapel", "We also praise God with a quiet heart."],
      ["A pile of toys and a tablet on one side and a glowing heart on the other, the heart bigger", "Nothing we own is greater than God."],
      ["A child holding a gift box and looking up to the sky with a thankful smile", "We thank God for good gifts but do not let them become idols."],
      ["A child making the Sign of the Cross as the sun rises outside a window", "We can put God first by starting each day with him."],
    ],
    check: { prompt: "Tap the picture that shows adoring God.", choices: [0, 3, 4], answer: 0, right: "Yes! Kneeling in adoration shows God comes first.", wrong: "Not quite. Look for the family kneeling in adoration." },
    tryAtHome: {
      title: "God-first morning",
      materials: ["paper", "crayons"],
      steps: ["Draw a sun in the middle of the page.", "Write 'God first' inside it.", "Around it, draw the things you love.", "Tape it near your bed and pray when you wake up."],
      safety: "No special safety needs.",
    },
  },
  "col.ch11": {
    slides: [
      ["Moses in a robe kneeling with sandals off before a burning bush full of bright orange light, not scary", "God spoke to Moses from a burning bush."],
      ["Glowing golden light rising from the burning bush over a desert mountain at sunrise", "God told Moses his holy name, 'I AM.'"],
      ["A gentle traditional image of the Holy Name: golden rays around a heart with a small cross, no letters", "The name of Jesus is holy too."],
      ["Two children talking kindly to each other with soft speech bubbles holding little hearts", "We honor God's name when we speak it with love."],
      ["A child shaking hands with a parent in a kitchen, both smiling", "We honor God when we keep our promises."],
      ["A child covering her ears and walking away from a rude group, calm", "Speaking about God with hate or scorn is called blasphemy. We never do that."],
    ],
    check: { prompt: "Tap the picture that shows God speaking to Moses.", choices: [0, 3, 4], answer: 0, right: "Yes! God spoke from the burning bush.", wrong: "Not quite. Look for Moses at the burning bush." },
    tryAtHome: {
      title: "Holy name banner",
      materials: ["paper", "crayons or markers"],
      steps: ["Write 'Jesus' in big bubble letters.", "Decorate it with hearts, stars, and colors.", "Bow your head when you say his name in prayer.", "Hang it where your family will see it."],
      safety: "No special safety needs.",
    },
  },
  "col.ch12": {
    slides: [
      ["A sunny garden with soft golden light, animals and flowers resting peacefully", "God rested after creation. He gave us a day to rest and worship."],
      ["An empty tomb in a garden with the stone rolled away and bright sunrise light", "Sunday is the Lord's Day. It celebrates Jesus rising from the dead."],
      ["A family walking up the steps into a church on a Sunday morning", "We gather for Mass on Sunday."],
      ["A family having a picnic in a park, relaxing on a blanket", "We rest from unnecessary work and spend time together."],
      ["A family bringing bags of food to a parish food pantry with smiles", "Sunday is a good day to help people in need."],
      ["A calendar page with one bright golden square shining, no numbers", "The Lord's Day is a gift each week."],
    ],
    check: { prompt: "Tap the picture that shows the Resurrection we celebrate on Sunday.", choices: [0, 1, 3], answer: 1, right: "Yes! The tomb is empty. Jesus is risen!", wrong: "Not quite. Look for the empty tomb." },
    tryAtHome: {
      title: "Sunday plan",
      materials: ["paper", "crayons"],
      steps: ["Draw a Sunday with four boxes.", "Box 1: Mass. Box 2: rest. Box 3: family. Box 4: helping someone.", "Fill in each box with a drawing.", "Try your plan this Sunday."],
      safety: "No special safety needs.",
    },
  },
  "col.ch13": {
    slides: [
      ["A farmer in a robe scattering seeds in a field from a cloth bag, sunny day", "Jesus told a story about a sower who planted seed."],
      ["Seeds falling on a stony path and among thorny weeds, with small birds pecking", "Some seed fell where it could not grow well."],
      ["Tall golden wheat growing strong in rich dark soil under sunshine", "Seed that fell on good soil grew and grew."],
      ["A child listening with a happy face as a small green sprout grows from a heart shape", "Our hearts can be good soil when we listen to God."],
      ["Three symbols: a kneeling child, a gentle heart with rays, and a church on Sunday", "We looked back at adoring God, honoring his name, and keeping Sunday."],
    ],
    check: { prompt: "Tap the picture that shows seed growing in good soil.", choices: [0, 1, 2], answer: 2, right: "Yes! Good soil grows a big harvest.", wrong: "Not quite. Look for the tall wheat in rich soil." },
    tryAtHome: {
      title: "Plant a seed",
      materials: ["a cup", "soil", "a bean seed", "water"],
      steps: ["Fill a cup with soil.", "Plant a bean seed and water it.", "Put it by a sunny window and check each day.", "As it grows, pray for a heart that listens to God."],
      safety: "Wash hands after touching soil.",
    },
  },
};
