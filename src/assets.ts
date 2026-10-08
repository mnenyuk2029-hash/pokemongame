// Vite inlines these in the standalone library build. In development they
// remain ordinary URLs served by Vite. Node-based engine tests need no images.
const images =
  typeof document !== "undefined"
    ? import.meta.glob<string>("../public/**/*.{png,svg}", {
        eager: true,
        query: "?url",
        import: "default",
      })
    : {};

export function asset(path: string): string {
  return images[`../public/${path}`] ?? `/${path}`;
}
