export type ShopProduct = {
  id: number;
  name: string;
  description: string;
  category: "fidget" | "animals" | "toys";
  images: string[];
  colors?: string[];
  colorParts?: Record<string, string[]>;
  sizes?: string[];
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

export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    id: 1,
    name: "Gary the Snake",
    description: "An articulated snake that wiggles. Big eyes and fangs make Gary a desk buddy.",
    category: "animals",
    images: ["/images/gary-snake-blue-2.jpg", "/images/gary-snake-blue-3.jpg", "/images/gary-snake-blue.png"],
    colorParts: { Bottom: FILAMENT_COLORS, Body: FILAMENT_COLORS, Eyes: FILAMENT_COLORS },
  },
  {
    id: 3,
    name: "Infinity Cube",
    description: "Flip and fold it. A pocket fidget that never ends.",
    category: "fidget",
    images: ["/images/infinity-cube.jpg", "/images/infinity-cube-2.jpg", "/images/infinity-cube.png"],
    colors: FILAMENT_COLORS,
  },
  {
    id: 4,
    name: "Snake Dragon",
    description: "An articulated dragon with a long flexible body.",
    category: "animals",
    images: ["/images/snake-dragon.jpg", "/images/snake-dragon-2.jpg"],
    colors: ["green", "hot pink", "purple", ...FILAMENT_COLORS],
  },
  {
    id: 5,
    name: "Planetary Gear Spinner",
    description: "Gears that spin together. Pick a size and style.",
    category: "fidget",
    images: ["/images/planetary-gear-spinner.jpg", "/images/planetary-gear-6spike-17mm.jpg"],
    sizes: ["6 Gears Spike (17mm)", "6 Gears Cog (17mm)", "8 Gears Spike (33mm)", "8 Gears Cog (33mm)"],
    colors: FILAMENT_COLORS,
  },
  {
    id: 6,
    name: "Flexi Ferret",
    description: "A posable ferret with big eyes and little paws.",
    category: "animals",
    images: ["/images/flexi-ferret.jpg", "/images/flexi-ferret-2.jpg"],
    colorParts: { Body: FILAMENT_COLORS, "Paws & Nose": FILAMENT_COLORS },
  },
  {
    id: 7,
    name: "Bearded Dragon",
    description: "A wiggly desk beardie. No feeding required.",
    category: "animals",
    images: ["/images/bearded-dragon.jpg", "/images/bearded-dragon-2.jpg"],
    colors: FILAMENT_COLORS,
  },
  {
    id: 9,
    name: "Twist Puzzle",
    description: "Twist the pieces into new shapes.",
    category: "fidget",
    images: ["/images/twist-puzzle.jpg", "/images/twist-puzzle-green-white.jpg"],
    colorParts: { "Color 1": FILAMENT_COLORS, "Color 2": FILAMENT_COLORS },
  },
  {
    id: 10,
    name: "Hexagon Spiral Top",
    description: "A hexagon spinning top with a spiral pattern.",
    category: "toys",
    images: ["/images/hexagon-spiral-top.jpg", "/images/hexagon-twist.png"],
    sizes: ["Small", "Large"],
    colors: FILAMENT_COLORS,
  },
  {
    id: 18,
    name: "Herringbone Gear Fidget",
    description: "Turn the crank and watch helical gears spin.",
    category: "fidget",
    images: ["/images/herringbone-gear.jpg", "/images/herringbone-gear-2.jpg"],
    video: "/images/herringbone-gear-video.mp4",
    colorParts: { Gears: FILAMENT_COLORS, Handle: FILAMENT_COLORS },
  },
  {
    id: 19,
    name: "Ring Spinner Top",
    description: "A spinning top with a ring and launcher.",
    category: "toys",
    images: ["/images/ring-spinner-top.jpg"],
    colors: FILAMENT_COLORS,
  },
  {
    id: 20,
    name: "Gyro Fidget Spinner",
    description: "Interlocking rings that twist and spin.",
    category: "fidget",
    images: ["/images/gyro-fidget-spinner.jpg"],
    colors: FILAMENT_COLORS,
  },
];

export function thankYouUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/thank-you`;
  }
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  return base ? `${base.replace(/\/$/, "")}/thank-you` : "/thank-you";
}

export function web3formsKey(): string {
  return process.env.NEXT_PUBLIC_WEB3FORMS_KEY || "1b3b40d6-fd45-4915-b73d-dd53a462b16d";
}
