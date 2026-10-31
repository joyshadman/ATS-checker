import localFont from "next/font/local";

// Resume sheet fonts (spec 0007), self hosted from @fontsource-variable packages so the
// build never fetches from Google Fonts (a failed fetch breaks Turbopack with
// "Can't resolve '@vercel/turbopack-next/internal/font/google/font'"). Each is a
// CSS variable the template's page class reads, so only the family in use loads.

const classic = localFont({
  variable: "--font-source-serif-4",
  src: [
    {
      path: "../../node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2",
      weight: "200 900",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-italic.woff2",
      weight: "200 900",
      style: "italic",
    },
  ],
  display: "swap",
});

const modern = localFont({
  variable: "--font-inter",
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
});

const compact = localFont({
  variable: "--font-ibm-plex-sans",
  src: "../../node_modules/@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2",
  weight: "100 700",
  display: "swap",
});

/** Classes that define all three sheet font variables; put on the viewer root. */
export const sheetFontVariables = `${classic.variable} ${modern.variable} ${compact.variable}`;
