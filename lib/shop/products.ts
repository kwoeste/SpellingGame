export type ShopProduct = {
  id: number;
  name: string;
  description: string;
  category: "fidget" | "animals" | "toys";
  images: string[];
  colorImages?: Record<string, string[]>;
  colors?: string[];
  colorParts?: Record<string, string[]>;
  sizes?: string[];
  sizeImages?: Record<string, string[]>;
  sizeVideos?: Record<string, string>;
  video?: string;
};

export const FILAMENT_COLORS = [
  "light blue",
  "black",
  "hot pink",
  "brown",
  "gray",
  "blue grey",
  "green",
  "light gray",
  "bambu green",
  "purple",
  "desert tan (matte)",
  "latte brown (matte)",
  "nardo gray (matte)",
];

export const COLOR_HEX: Record<string, string> = {
  "light blue": "#a8d8ea",
  white: "#ffffff",
  black: "#2c2c2c",
  "hot pink": "#ff69b4",
  brown: "#8b4513",
  gray: "#808080",
  "blue grey": "#6b7b8a",
  green: "#2e8b57",
  "light gray": "#c0c0c0",
  "bambu green": "#4caf50",
  purple: "#9b59b6",
  "desert tan (matte)": "#c4a77d",
  "latte brown (matte)": "#a68b6a",
  "nardo gray (matte)": "#6e6e6e",
  rainbow: "linear-gradient(135deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff)",
  blue: "#3498db",
};

/** Mirrors the product list on the original static index.html. */
export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    id: 1,
    name: "Gary the Snake",
    description: "A super cool articulated snake that wiggles and moves! Big googly eyes and fangs make Gary the perfect desk buddy. Great for fidgeting!",
    category: "animals",
    images: [
      "/images/gary-snake-blue-2.jpg",
      "/images/gary-snake-blue-3.jpg",
      "/images/gary-snake-blue-4.jpg",
      "/images/gary-snake-blue.png",
    ],
    colorParts: {
      "Bottom": FILAMENT_COLORS,
      "Body": FILAMENT_COLORS,
      "Eyes": FILAMENT_COLORS,
    },
  },
  {
    id: 3,
    name: "Infinity Cube",
    description: "The ultimate fidget toy! Flip and fold it forever - it never ends! Super satisfying and helps you focus. Fits perfectly in your hand.",
    category: "fidget",
    images: [
      "/images/infinity-cube.jpg",
      "/images/infinity-cube-2.jpg",
      "/images/infinity-cube-6.jpg",
      "/images/infinity-cube-7.jpg",
      "/images/infinity-cube-8.jpg",
    ],
    colors: FILAMENT_COLORS,
  },
  {
    id: 4,
    name: "Snake Dragon",
    description: "An epic articulated dragon with spiky scales and a long serpent body! Fully flexible and posable - bend and twist it into any shape. Looks amazing on your desk!",
    category: "animals",
    images: [
      "/images/snake-dragon.jpg",
      "/images/snake-dragon-2.jpg",
      "/images/snake-dragon-4.jpg",
    ],
    colorImages: {
      "green": ["/images/snake-dragon.jpg","/images/snake-dragon-2.jpg","/images/snake-dragon-4.jpg"],
      "hot pink": ["/images/snake-dragon-5.jpg","/images/snake-dragon-6.jpg","/images/snake-dragon-8.jpg"],
      "purple": ["/images/snake-dragon-7.jpg","/images/snake-dragon-9.jpg"],
    },
    colors: ["green","hot pink","purple","light blue","black","brown","gray","blue grey","light gray","bambu green","desert tan (matte)","latte brown (matte)","nardo gray (matte)"],
  },
  {
    id: 5,
    name: "Planetary Gear Spinner",
    description: "A mesmerizing gear fidget spinner with planetary gears that all spin together! Watch all the cogs turn in perfect sync. Choose your size and style - Spike has pointed teeth, Cog has rounded teeth!",
    category: "fidget",
    images: [
      "/images/planetary-gear-spinner.jpg",
      "/images/planetary-gear-spinner-2.jpg",
      "/images/planetary-gear-spinner-3.jpg",
      "/images/planetary-gear-6spike-17mm.jpg",
    ],
    colors: FILAMENT_COLORS,
    sizes: ["6 Gears Spike (17mm)","6 Gears Cog (17mm)","8 Gears Spike (33mm)","8 Gears Cog (33mm)","10 Gears Spike (33mm)","10 Gears Cog (33mm)"],
    sizeImages: {
      "6 Gears Spike (17mm)": ["/images/planetary-gear-6spike-17mm.jpg"],
    },
    sizeVideos: {
      "6 Gears Spike (17mm)": "/images/planetary-gear-6spike-17mm-video.mp4",
    },
  },
  {
    id: 6,
    name: "Flexi Ferret",
    description: "The cutest articulated ferret! With big sparkly eyes and adorable little paws, this flexi friend wiggles and poses however you want. Pick colors for the body and the paws & nose!",
    category: "animals",
    images: [
      "/images/flexi-ferret.jpg",
      "/images/flexi-ferret-2.jpg",
    ],
    colorParts: {
      "Body": FILAMENT_COLORS,
      "Paws & Nose": FILAMENT_COLORS,
    },
  },
  {
    id: 7,
    name: "Bearded Dragon",
    description: "A super cute articulated bearded dragon! With big adorable eyes and a wiggly tail, this happy beardie is the perfect desk pet. No feeding required!",
    category: "animals",
    images: [
      "/images/bearded-dragon-2.jpg",
      "/images/bearded-dragon-3.jpg",
      "/images/bearded-dragon-4.jpg",
      "/images/bearded-dragon-5.jpg",
      "/images/bearded-dragon.jpg",
    ],
    colors: FILAMENT_COLORS,
  },
  {
    id: 9,
    name: "Twist Puzzle",
    description: "A twisty puzzle that transforms into endless shapes! Bend and twist the connected pieces to make a ball, snake, dog, or whatever you can imagine! Pick two colors for a cool combo!",
    category: "fidget",
    images: [
      "/images/twist-puzzle.jpg",
      "/images/twist-puzzle-2.jpg",
      "/images/twist-puzzle-3.jpg",
      "/images/twist-puzzle-4.jpg",
      "/images/twist-puzzle-green-white.jpg",
      "/images/twist-puzzle-green-white-2.jpg",
      "/images/twist-puzzle-green-white-3.jpg",
      "/images/twist-puzzle-green-white-4.jpg",
      "/images/twist-puzzle-green-white-5.jpg",
    ],
    colorParts: {
      "Color 1": FILAMENT_COLORS,
      "Color 2": FILAMENT_COLORS,
    },
  },
  {
    id: 10,
    name: "Hexagon Spiral Top",
    description: "A hexagon spinning top with a mesmerizing spiral pattern! Watch the optical illusion come to life when you spin it. Available in two sizes!",
    category: "toys",
    images: [
      "/images/hexagon-spiral-top.jpg",
      "/images/hexagon-spiral-top-2.jpg",
      "/images/hexagon-spiral-top-3.jpg",
      "/images/hexagon-spiral-top-4.jpg",
      "/images/hexagon-spiral-top-5.jpg",
    ],
    colors: FILAMENT_COLORS,
    sizes: ["Small","Large"],
  },
  {
    id: 11,
    name: "Valentine 67 Buddy",
    description: "An adorable Valentine's Day 67 character with hearts and little feet! Perfect for Valentine's gifts or year-round love!",
    category: "toys",
    images: [
      "/images/valentine-67-buddy.jpg",
      "/images/valentine-67-buddy-2.jpg",
    ],
    colors: FILAMENT_COLORS,
  },
  {
    id: 12,
    name: "Valentine's Kiss",
    description: "A sweet chocolate kiss decoration with a twist-off spiral ribbon top! Pick your colors for the base and the ribbon. Perfect for Valentine's Day or as a cute desk decoration!",
    category: "toys",
    images: [
      "/images/valentines-kiss-6.jpg",
      "/images/valentines-kiss-8.jpg",
      "/images/valentines-kiss-9.jpg",
      "/images/valentines-kiss-7.jpg",
      "/images/valentines-kiss.jpg",
      "/images/valentines-kiss-2.jpg",
      "/images/valentines-kiss-3.jpg",
      "/images/valentines-kiss-4.jpg",
      "/images/valentines-kiss-5.jpg",
    ],
    colorParts: {
      "Base (Kiss)": FILAMENT_COLORS,
      "Top (Ribbon)": FILAMENT_COLORS,
    },
  },
  {
    id: 13,
    name: "Valentine Spinner",
    description: "Spread the love with these spinning Valentine's Day tops! Watch 'Happy Valentine's Day' and 'Be My Valentine' spin around in a mesmerizing display!",
    category: "toys",
    images: [
      "/images/valentine-spinner.jpg",
    ],
    colors: FILAMENT_COLORS,
  },
  {
    id: 14,
    name: "67 Gyro Spinner",
    description: "A cool gyroscope spinner with the number 67 spinning inside a ring! Hold the handles and watch it spin and flip. Super satisfying fidget toy!",
    category: "fidget",
    images: [
      "/images/67-gyro-spinner.jpg",
      "/images/67-gyro-spinner-2.jpg",
      "/images/67-gyro-spinner-3.jpg",
    ],
    colors: FILAMENT_COLORS,
  },
  {
    id: 15,
    name: "Rainbow Fidget Spinner",
    description: "A stunning rainbow fidget spinner with mesmerizing geometric patterns! Printed with multicolor filament for an amazing color gradient effect. Spins smooth and looks incredible!",
    category: "fidget",
    images: [
      "/images/rainbow-fidget-spinner.jpg",
      "/images/rainbow-fidget-spinner-2.jpg",
      "/images/rainbow-fidget-spinner-3.jpg",
    ],
    colors: ["rainbow"],
  },
  {
    id: 16,
    name: "67 Pencil Topper",
    description: "A fun 67 pencil topper to decorate your pencils! Show off your school spirit with this cool fidget topper that spins on your pencil!",
    category: "toys",
    images: [
      "/images/67-pencil-topper.jpg",
      "/images/67-pencil-topper-2.jpg",
      "/images/67-pencil-topper-3.jpg",
    ],
    colors: FILAMENT_COLORS,
  },
  {
    id: 17,
    name: "67 Buddy",
    description: "Meet your new 67 Buddy! This adorable character has big googly eyes, posable arms with cartoon hands, and stylish shoes. The perfect desk companion!",
    category: "toys",
    images: [
      "/images/67-buddy.jpg",
      "/images/67-buddy-2.jpg",
      "/images/67-buddy-3.jpg",
      "/images/67-buddy-4.jpg",
    ],
    colors: FILAMENT_COLORS,
  },
  {
    id: 18,
    name: "Herringbone Gear Fidget",
    description: "A mesmerizing herringbone gear fidget with interlocking helical gears! Turn the crank and watch both gears spin in perfect sync. Pick two colors for the gears and handle!",
    category: "fidget",
    images: [
      "/images/herringbone-gear.jpg",
      "/images/herringbone-gear-2.jpg",
      "/images/herringbone-gear-3.jpg",
      "/images/herringbone-gear-4.jpg",
      "/images/herringbone-gear-5.jpg",
      "/images/herringbone-gear-6.jpg",
      "/images/herringbone-gear-7.jpg",
    ],
    colorParts: {
      "Gears": FILAMENT_COLORS,
      "Handle": FILAMENT_COLORS,
    },
    video: "/images/herringbone-gear-video.mp4",
  },
  {
    id: 19,
    name: "Ring Spinner Top",
    description: "A classic spinning top with an elegant ring design! Comes with a launcher for super long spins. Twist the handle, pull the cord, and watch it spin!",
    category: "toys",
    images: [
      "/images/ring-spinner-top.jpg",
      "/images/ring-spinner-top-2.jpg",
      "/images/ring-spinner-top-3.jpg",
      "/images/ring-spinner-top-4.jpg",
      "/images/ring-spinner-top-5.jpg",
    ],
    colors: FILAMENT_COLORS,
  },
  {
    id: 20,
    name: "Gyro Fidget Spinner",
    description: "A mesmerizing orbit ball with interlocking rings! Spin and twist the rings around each other for endless fidgeting fun. Super satisfying to play with!",
    category: "fidget",
    images: [
      "/images/gyro-fidget-spinner.jpg",
      "/images/gyro-fidget-spinner-2.jpg",
      "/images/gyro-fidget-spinner-3.jpg",
      "/images/gyro-fidget-spinner-4.jpg",
    ],
    colors: FILAMENT_COLORS,
  },
];

/** Web3Forms needs an absolute redirect; the client swaps in its own origin after hydration. */
export const DEFAULT_THANK_YOU_URL = "https://maewoeste.com/thank-you";

export function web3formsKey(): string {
  return process.env.NEXT_PUBLIC_WEB3FORMS_KEY || "1b3b40d6-fd45-4915-b73d-dd53a462b16d";
}
