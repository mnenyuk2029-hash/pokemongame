import type { Game } from "./engine";
import {
  entities,
  pathTo,
  tileAt,
  walkable,
  origin,
  RW,
  RH,
  type Entity,
} from "./world";
export type Guide = {
  label: string;
  destination: { x: number; y: number };
  route: { x: number; y: number }[];
  entity?: Entity;
};
export function entityApproach(game: Game, e: Entity) {
  const points: { x: number; y: number }[] = [];
  // Buildings are approached at their front door, not through a side wall.
  if (["lab", "house", "center", "shop"].includes(e.kind))
    points.push({ x: Math.floor(e.x + e.w / 2), y: e.y + e.h });
  else
    for (let x = e.x - 1; x <= e.x + e.w; x++)
      for (let y = e.y - 1; y <= e.y + e.h; y++)
        if (walkable(x, y)) points.push({ x, y });
  points.sort(
    (a, b) =>
      Math.abs(a.x - game.state.x) +
      Math.abs(a.y - game.state.y) -
      Math.abs(b.x - game.state.x) -
      Math.abs(b.y - game.state.y),
  );
  for (const p of points) {
    const route = pathTo(game.state.x, game.state.y, p.x, p.y);
    if (route.length || (p.x === game.state.x && p.y === game.state.y))
      return { destination: p, route };
  }
}
export function questGuide(game: Game): Guide | undefined {
  const s = game.state,
    chapter = game.chapter;
  let entity: Entity | undefined;
  let label = "";
  if (!s.starterChosen) {
    entity = entities.find((e) => e.kind === "lab");
    label = "Professor Fern’s Lab";
  } else if (!chapter) return;
  else if (!s.briefed) {
    entity = entities.find(
      (e) =>
        e.kind === "npc" && e.region === chapter.region && e.name !== "Ivy",
    );
    label = "Meet the local guide";
  } else if (game.bossReady) {
    entity = entities.find(
      (e) => e.kind === "beacon" && e.region === chapter.region,
    );
    label = "Challenge the beacon keeper";
  } else if (s.catches[chapter.region] === 0) {
    const o = origin(chapter.region),
      candidates = [];
    for (let y = o.y + 3; y < o.y + RH - 3; y++)
      for (let x = o.x + 3; x < o.x + RW - 3; x++)
        if (tileAt(x, y) === "tall" && walkable(x, y))
          candidates.push({ x, y });
    candidates.sort(
      (a, b) =>
        Math.abs(a.x - s.x) +
        Math.abs(a.y - s.y) -
        Math.abs(b.x - s.x) -
        Math.abs(b.y - s.y),
    );
    for (const p of candidates.slice(0, 30)) {
      const route = pathTo(s.x, s.y, p.x, p.y);
      if (route.length || (p.x === s.x && p.y === s.y))
        return {
          label: "Search the grass · Weaken and catch a Pokémon",
          destination: p,
          route,
        };
    }
  } else {
    const targets = entities.filter(
      (e) =>
        e.kind === "trainer" &&
        e.region === chapter.region &&
        !s.defeated.includes(e.id),
    );
    targets.sort(
      (a, b) =>
        Math.abs(a.x - s.x) +
        Math.abs(a.y - s.y) -
        Math.abs(b.x - s.x) -
        Math.abs(b.y - s.y),
    );
    entity = targets[0];
    label = "Challenge a trail warden";
  }
  if (entity) {
    const approach = entityApproach(game, entity);
    if (approach) return { ...approach, label, entity };
  }
}
