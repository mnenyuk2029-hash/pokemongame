import { REGIONS } from "./data";
import type { Entity } from "./world";

export type Furnishing = {
  x: number;
  y: number;
  w: number;
  h: number;
  kind:
    | "shelf"
    | "bed"
    | "plant"
    | "counter"
    | "table"
    | "terminal"
    | "sofa"
    | "stove";
};
export type RoomAction =
  "exit" | "heal" | "shop" | "research" | "read" | "talk";
export type Hotspot = {
  x: number;
  y: number;
  label: string;
  action: RoomAction;
};
export type Interior = {
  entity: Entity;
  x: number;
  y: number;
  facing: number;
  furniture: Furnishing[];
  spots: Hotspot[];
};
export const ROOM_W = 18,
  ROOM_H = 14;
export const MEMORY_PAGES = [
  "Before the silence, your mother mapped the beacons by listening. ‘Every light has a different rhythm,’ she wrote. ‘The quiet between them is part of the song.’ A pressed blue flower marks the page.",
  "Rowan’s first patrol: the trees bent toward the beacon even without wind. He tied ribbons to the branches. By morning every ribbon pointed home. The forest remembers its friends.",
  "Nell’s tide chart has one night circled. Every boat returned safely during a storm because a line of glowing Water Pokémon led them through the reef. The beacon did not command them. They chose to help.",
  "Pip found a warm crystal in a cold seam. Vale offered to buy it. Pip refused: his Sandshrew had been sleeping beside it for a week. ‘Some things aren’t ours to take.’ Vale stayed for tea anyway.",
  "Juniper records the last autumn picnic before the lights faded. Vale brought too many sandwiches. Your mother laughed until she cried. Beneath the list of guests: ‘Remember him like this, too.’",
  "The lantern keeper counted thirteen lights crossing the marsh. Only twelve lanterns had been lit. The last was a tiny Ghost Pokémon carrying a lost child’s ribbon back to the road.",
  "Ada’s instruments froze. Her partner curled around the battery until it warmed enough to send a message: ‘We made it.’ The smallest act of kindness kept the expedition alive.",
  "Moss sketched a machine to make the beacons shine forever. Your mother crossed out ‘forever’ and wrote ‘together.’ Vale kept the crossed-out drawing. He could not bear another goodbye.",
  "The final page is unfinished. ‘If you are reading this, follow the living things. A world that changes can hurt. But it can also heal.’ Below it is a drawing of you, Ivy, and an Eevee with enormous ears.",
];
export function makeInterior(entity: Entity): Interior {
  const furniture: Furnishing[] = [
    { x: 1, y: 3, w: 3, h: 1, kind: "shelf" },
    { x: 14, y: 3, w: 3, h: 1, kind: "shelf" },
    { x: 1, y: 10, w: 1, h: 1, kind: "plant" },
    { x: 16, y: 10, w: 1, h: 1, kind: "plant" },
  ];
  const spots: Hotspot[] = [
    { x: 9, y: 12, label: "Return outside", action: "exit" },
  ];
  if (entity.kind === "center") {
    furniture.push(
      { x: 6, y: 4, w: 6, h: 1, kind: "counter" },
      { x: 2, y: 6, w: 2, h: 3, kind: "bed" },
      { x: 14, y: 6, w: 2, h: 3, kind: "bed" },
      { x: 4, y: 4, w: 1, h: 1, kind: "terminal" },
    );
    spots.push(
      { x: 9, y: 5, label: "Nurse · Restore your team", action: "heal" },
      {
        x: 4,
        y: 5,
        label: "Field terminal · Research rewards",
        action: "research",
      },
    );
  } else if (entity.kind === "shop") {
    furniture.push(
      { x: 6, y: 4, w: 6, h: 1, kind: "counter" },
      { x: 2, y: 6, w: 2, h: 2, kind: "shelf" },
      { x: 14, y: 6, w: 2, h: 2, kind: "shelf" },
    );
    spots.push({ x: 9, y: 5, label: "Clerk · Buy supplies", action: "shop" });
  } else if (entity.kind === "lab") {
    furniture.push(
      { x: 3, y: 5, w: 3, h: 2, kind: "table" },
      { x: 12, y: 5, w: 3, h: 2, kind: "table" },
      { x: 8, y: 3, w: 2, h: 1, kind: "terminal" },
    );
    spots.push(
      {
        x: 9,
        y: 5,
        label: "Professor Fern · Starter research",
        action: "talk",
      },
      { x: 5, y: 7, label: "Your mother’s field notes", action: "read" },
      { x: 13, y: 7, label: "Research terminal", action: "research" },
    );
  } else {
    furniture.push(
      { x: 2, y: 5, w: 3, h: 2, kind: "sofa" },
      { x: 7, y: 6, w: 3, h: 2, kind: "table" },
      { x: 14, y: 5, w: 2, h: 3, kind: "bed" },
      { x: 11, y: 3, w: 2, h: 1, kind: "stove" },
    );
    spots.push(
      { x: 8, y: 8, label: "Read a lost field-journal page", action: "read" },
      { x: 4, y: 7, label: "Talk to your host", action: "talk" },
      { x: 13, y: 7, label: "Rest by the window", action: "heal" },
    );
  }
  return { entity, x: 9, y: 11, facing: 3, furniture, spots };
}
export function roomWalkable(room: Interior, x: number, y: number) {
  return (
    x >= 1 &&
    x < ROOM_W - 1 &&
    y >= 4 &&
    y < ROOM_H - 1 &&
    !room.furniture.some(
      (f) => x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h,
    )
  );
}
export function roomSpot(room: Interior) {
  return room.spots
    .filter((s) => Math.abs(s.x - room.x) + Math.abs(s.y - room.y) <= 1)
    .sort(
      (a, b) =>
        Math.abs(a.x - room.x) +
        Math.abs(a.y - room.y) -
        Math.abs(b.x - room.x) -
        Math.abs(b.y - room.y),
    )[0];
}
export function roomTitle(room: Interior) {
  return `${room.entity.name} · ${REGIONS[room.entity.region].name}`;
}
