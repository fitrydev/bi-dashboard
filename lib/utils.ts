import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Token ukuran font kustom (globals.css --text-*) harus dikenal sebagai font-size; tanpa ini
// twMerge menganggap `text-label` warna dan membuangnya bila ada `text-ink` sesudahnya.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "title", "subtitle", "body-lg", "body", "label", "caption"] }],
    },
  },
});
export const cn = (...i: ClassValue[]) => twMerge(clsx(i));
