import { build } from "vite";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const result = await build({
  root,
  configFile: false,
  publicDir: false,
  build: {
    write: false,
    lib: {
      entry: fileURLToPath(new URL("../src/main.ts", import.meta.url)),
      name: "Wildbound",
      formats: ["iife"],
    },
    cssCodeSplit: false,
    minify: true,
  },
});
const output = (Array.isArray(result) ? result : [result]).flatMap(
  (bundle) => bundle.output,
);
const js = output.filter((item) => item.type === "chunk");
const css = output.filter(
  (item) => item.type === "asset" && item.fileName.endsWith(".css"),
);
if (js.length !== 1 || css.length !== 1) {
  throw new Error(
    "Standalone build must contain exactly one script and stylesheet.",
  );
}
const favicon = await readFile(
  new URL("../public/ui/poke-ball.png", import.meta.url),
);
const template = await readFile(
  new URL("../dev.html", import.meta.url),
  "utf8",
);
const fontLicenses = await Promise.all(
  ["pixelify-OFL.txt", "press-start-OFL.txt"].map((name) =>
    readFile(new URL(`../public/fonts/${name}`, import.meta.url), "utf8"),
  ),
);
const notices = `Pokémon Wildbound — unofficial fan game. Pokémon names and character designs belong to Nintendo, Game Freak, and Creatures. Sprites: https://github.com/PokeAPI/sprites.\n\n${fontLicenses.join("\n\n").replace(/[^\S\n]+$/gm, "")}`;
const html = template
  .replace(
    "<head>",
    `<head><script type="text/plain" id="asset-licenses">${notices.replace(/<\/script/gi, "<\\/script")}</script>`,
  )
  .replace(
    'href="/ui/poke-ball.png"',
    `href="data:image/png;base64,${favicon.toString("base64")}"`,
  )
  .replace(
    "</head>",
    `<style>${String(css[0].source).replace(/<\/style/gi, "<\\/style")}</style></head>`,
  )
  .replace(
    '<script type="module" src="/src/main.ts"></script>',
    `<script>${js[0].code.replace(/<\/script/gi, "<\\/script")}</script>`,
  );
await mkdir(new URL("../dist/", import.meta.url), { recursive: true });
await writeFile(new URL("../index.html", import.meta.url), html);
await writeFile(new URL("../dist/index.html", import.meta.url), html);
console.log(
  `Standalone index.html ready (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB). No server or companion files required.`,
);
