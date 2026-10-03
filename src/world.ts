import { REGIONS } from "./data";
export const TILE = 24,
  RW = 56,
  RH = 44,
  WIDTH = RW * 3,
  HEIGHT = RH * 3;
export type Tile =
  | "grass"
  | "tall"
  | "path"
  | "water"
  | "tree"
  | "flower"
  | "rock"
  | "bridge"
  | "sand";
export interface Entity {
  id: string;
  kind:
    | "house"
    | "lab"
    | "center"
    | "shop"
    | "npc"
    | "trainer"
    | "beacon"
    | "chest"
    | "sign";
  x: number;
  y: number;
  w: number;
  h: number;
  region: number;
  name: string;
  variant: number;
}
export function noise(x: number, y: number, seed = 0) {
  let n = Math.imul(x + seed * 723, 374761393) + Math.imul(y + seed, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
export function regionAt(x: number, y: number) {
  return Math.max(0, Math.min(8, Math.floor(y / RH) * 3 + Math.floor(x / RW)));
}
export const origin = (r: number) => ({
  x: (r % 3) * RW,
  y: Math.floor(r / 3) * RH,
});
export const town = (r: number) => {
  const o = origin(r);
  return { x: o.x + 28, y: o.y + 24 };
};
export const entities: Entity[] = [];
function add(
  r: number,
  kind: Entity["kind"],
  x: number,
  y: number,
  w: number,
  h: number,
  name: string,
  variant = 0,
) {
  const o = origin(r);
  entities.push({
    id: `${r}-${kind}-${x}-${y}`,
    kind,
    x: o.x + x,
    y: o.y + y,
    w,
    h,
    region: r,
    name,
    variant,
  });
}
for (let r = 0; r < 9; r++) {
  add(r, "center", 19, 17, 6, 5, "Pokémon Rest House", r);
  add(r, "shop", 32, 17, 5, 5, "Trailside Market", r);
  add(
    r,
    r === 0 ? "lab" : "house",
    24,
    9,
    7,
    5,
    r === 0 ? "Professor Fern’s Lab" : `${REGIONS[r].name} Lodge`,
    r,
  );
  add(r, "house", 15, 28, 5, 4, "A place to call home", r + 2);
  add(r, "house", 34, 29, 5, 4, "Keeper’s Cottage", r + 1);
  add(
    r,
    "npc",
    27,
    16,
    1,
    1,
    r === 0
      ? "Professor Fern"
      : [
          "",
          "Rowan’s apprentice",
          "Sailor Nell",
          "Miner Pip",
          "Juniper",
          "Lantern keeper",
          "Researcher Ada",
          "Engineer Moss",
          "Beacon tender",
        ][r],
    r,
  );
  add(r, "npc", 30, 27, 1, 1, "Ivy", r + 1);
  add(r, "sign", 28, 23, 1, 1, REGIONS[r].name, r);
  add(
    r,
    "beacon",
    45,
    9,
    3,
    4,
    r === 0 ? "The homeward stone" : "Ancient beacon",
    r,
  );
  for (let i = 0; i < 4; i++)
    add(
      r,
      "trainer",
      ...([
        [12, 13],
        [44, 27],
        [23, 36],
        [8, 33],
      ][i] as [number, number]),
      1,
      1,
      ["Scout", "Ranger", "Ace", "Wanderer"][i] +
        " " +
        ["Milo", "Wren", "Kai", "Sage", "Theo", "Nia", "Jules", "Ashby", "Sol"][
          r
        ],
      i,
    );
  for (let i = 0; i < 4; i++)
    add(
      r,
      "chest",
      ...([
        [8, 8],
        [49, 35],
        [6, 25],
        [38, 6],
      ][i] as [number, number]),
      1,
      1,
      "Forgotten supplies",
      i,
    );
}
export function tileAt(x: number, y: number): Tile {
  if (x < 1 || y < 1 || x >= WIDTH - 1 || y >= HEIGHT - 1) return "tree";
  const r = regionAt(x, y),
    lx = x % RW,
    ly = y % RH,
    biome = REGIONS[r].biome;
  // Paths connect all nine regions and every settlement.
  if (Math.abs(lx - 28) <= 1 || Math.abs(ly - 24) <= 1) return "path";
  if (
    (ly >= 14 && ly <= 28 && lx >= 17 && lx <= 38) ||
    (ly >= 8 && ly <= 17 && lx >= 23 && lx <= 31) ||
    (ly >= 28 && ly <= 34 && lx >= 14 && lx <= 40)
  )
    return noise(x, y) > 0.95 ? "flower" : "grass";
  if (ly === 22 && lx >= 17 && lx <= 38) return "path";
  if (lx >= 43 && lx <= 49 && ly >= 7 && ly <= 15) return "grass";
  // Winding brook; ford is always walkable.
  const river = 39 + Math.sin(ly * 0.19) * 2;
  if (Math.abs(lx - river) < 1.5 && ly > 13 && ly < 39)
    return ly >= 23 && ly <= 25 ? "bridge" : "water";
  if ((lx - 9) ** 2 / 35 + (ly - 19) ** 2 / 22 < 1) return "water";
  for (const e of entities)
    if (
      e.region === r &&
      x >= e.x - 1 &&
      x <= e.x + e.w &&
      y >= e.y - 1 &&
      y <= e.y + e.h
    )
      return "grass";
  let n = noise(x, y, r + 1);
  if ((lx < 3 || lx > 53 || ly < 3 || ly > 41) && n > 0.24) return "tree";
  if (n < 0.13 || ((lx < 16 || lx > 43) && n < 0.3)) return "tree";
  if (n < 0.16) return "rock";
  if (n < 0.53) return "tall";
  if (n < 0.6) return "flower";
  return biome === "desert" || biome === "coast" ? "sand" : "grass";
}
export function solidEntity(x: number, y: number) {
  return entities.some(
    (e) =>
      ["house", "lab", "center", "shop", "beacon"].includes(e.kind) &&
      x >= e.x &&
      x < e.x + e.w &&
      y >= e.y &&
      y < e.y + e.h,
  );
}
export function walkable(x: number, y: number) {
  const t = tileAt(x, y);
  return t !== "water" && t !== "tree" && t !== "rock" && !solidEntity(x, y);
}
export function nearEntity(x: number, y: number) {
  return entities
    .filter(
      (e) =>
        x >= e.x - 2 &&
        x <= e.x + e.w + 1 &&
        y >= e.y - 2 &&
        y <= e.y + e.h + 1,
    )
    .sort(
      (a, b) =>
        Math.hypot(x - a.x - a.w / 2, y - a.y - a.h / 2) -
        Math.hypot(x - b.x - b.w / 2, y - b.y - b.h / 2),
    )[0];
}
export function pathTo(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): { x: number; y: number }[] {
  const goal = { x: Math.round(tx), y: Math.round(ty) };
  if (!walkable(goal.x, goal.y)) return [];
  const start = `${sx},${sy}`,
    end = `${goal.x},${goal.y}`,
    q = [{ x: sx, y: sy }],
    prev = new Map<string, string>();
  prev.set(start, "");
  for (let i = 0; i < q.length && i < 20000; i++) {
    let p = q[i];
    if (`${p.x},${p.y}` === end) break;
    for (const [dx, dy] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]) {
      let x = p.x + dx,
        y = p.y + dy,
        k = `${x},${y}`;
      if (!prev.has(k) && walkable(x, y)) {
        prev.set(k, `${p.x},${p.y}`);
        q.push({ x, y });
      }
    }
  }
  if (!prev.has(end)) return [];
  const path = [];
  let k = end;
  while (k !== start) {
    const [x, y] = k.split(",").map(Number);
    path.unshift({ x, y });
    k = prev.get(k)!;
  }
  return path;
}
