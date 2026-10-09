import { playBattleCue } from "./battle-effects";
import {
  makeInterior,
  roomWalkable,
  roomSpot,
  roomTitle,
  MEMORY_PAGES,
  type Hotspot,
} from "./interiors";
import { questGuide, entityApproach } from "./navigation";
import { asset } from "./assets";
import "./style.css";
import {
  Game,
  parseSave,
  newGame,
  maxHp,
  effectiveness,
  type BattleFrame,
  xpNeeded,
  type Pokemon,
} from "./engine";
import {
  SPECIES,
  REGIONS,
  CHAPTERS,
  SIDE_QUESTS,
  ITEMS,
  MOVES,
  COLORS,
  sprite,
  type ItemId,
} from "./data";
import { Renderer, landscape } from "./renderer";
import {
  entities,
  nearEntity,
  pathTo,
  town,
  regionAt,
  walkable,
  type Entity,
} from "./world";
const paths: Record<string, string> = {
  compass: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M16 8l-3 5-5 3 3-5 5-3Z",
  team: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-4",
  dex: "M4 3h16v18H4z M8 3v18 M12 7h4 M12 11h4",
  journal:
    "M5 3h13a2 2 0 0 1 2 2v16H6a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2Z M3 17h17 M8 7h7 M8 11h5",
  bag: "M6 8h12l3 13H3L6 8Z M9 8V5a3 3 0 0 1 6 0v3 M8 13h8",
  map: "m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Z M9 3v16 M15 5v16",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1",
  moon: "M20 15a9 9 0 0 1-11-11 9 9 0 1 0 11 11Z",
  volume: "m11 4-6 4H2v8h3l6 4V4Z M15 8a6 6 0 0 1 0 8 M18 5a10 10 0 0 1 0 14",
  mute: "m11 4-6 4H2v8h3l6 4V4Z M16 9l6 6 M22 9l-6 6",
  arrow: "M4 12h16 M14 6l6 6-6 6",
  down: "m6 9 6 6 6-6",
  chevron: "m9 5 7 7-7 7",
  location:
    "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z M15 10a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z",
  flag: "M5 22V3 M5 4c5-5 9 5 15 0v10c-6 5-10-5-15 0",
  check: "m5 12 4 4L19 6",
  close: "m6 6 12 12 M18 6 6 18",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Z",
  help: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5 M12 17h.01",
  leaf: "M20 3C7 1 0 12 8 18S22 15 20 3Z M4 21 16 9",
  bolt: "m13 2-9 12h7l-1 8 10-13h-8l1-7Z",
  heart: "M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-5 5 8 16 8 16S25 10 20 5Z",
  save: "M5 3h12l4 4v14H3V3h2Z M7 3v6h10V3 M7 21v-8h10v8",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 7v5l3 2",
  star: "m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z",
  lock: "M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4",
  search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z m5 12 6 6",
  expand: "M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5",
  gift: "M3 8h18v5H3z M5 13v8h14v-8 M12 8v13 M12 8C1 9 6-3 12 8c6-11 11 1 0 0",
  home: "m2 11 10-9 10 9 M5 9v12h14V9 M9 21v-8h6v8",
};
const icon = (name: string, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.compass}"/></svg>`;
const ball = '<span class="pokeball" aria-hidden="true"></span>';
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
let loaded,
  saveLoadError = false;
try {
  const raw = localStorage.getItem("wildbound-save-v1");
  if (raw) loaded = parseSave(raw);
} catch {
  saveLoadError = true;
}
const game = new Game(loaded);
let overlay = "",
  overlayTab = "",
  selectedBox = -1,
  selectedParty = 0,
  dexFilter = "",
  dexType = "all";
let path: { x: number; y: number }[] = [];
let pendingEntity: Entity | undefined;
let lastStep = 0;
let noticeTimer: ReturnType<typeof setTimeout>;
let lastRegion = game.region;
const keys = new Set<string>();
let previousFocus: HTMLElement | null = null;
const thumbs = REGIONS.map((r) => landscape(r.biome));
document.querySelector("#app")!.innerHTML = `
<main class="game-screen" aria-label="Pokémon Wildbound">
  <canvas id="world" tabindex="0" aria-label="Pokémon overworld. Use WASD or arrow keys to move, E to interact, and Escape to open the game menu."></canvas>
  <div class="world-vignette" aria-hidden="true"></div>
  <header class="game-hud">
    <div class="location-banner pixel-panel"><span class="location-emblem">${ball}</span><div><span class="region-caption">AURELIAN REGION</span><h1 id="location-name">Verdant Hollow</h1></div></div>
    <div class="hud-actions"><div class="weather-pill"></div><button class="menu-trigger pixel-panel" data-action="menu" aria-label="Open game menu"><img src="${asset("ui/poke-ball.png")}" alt=""/><span>MENU</span><kbd>ESC</kbd></button></div>
  </header>
  <div class="hud-bottom">
    <button class="companion-hud pixel-panel" data-action="team" aria-label="View your Pokémon" id="party-hud"></button>
    <button class="objective-hud pixel-panel" data-action="track" id="quest-hud" aria-label="Track current objective"></button>
    <button class="interact-hud pixel-panel" data-action="interact" id="world-hint"></button>
  </div>
  <div class="overworld-controls"><span><kbd>WASD</kbd> MOVE</span><span><kbd>SHIFT</kbd> RUN</span><span><kbd>M</kbd> MAP</span><span id="save-indicator"></span></div>
  <div class="mobile-controls"><div class="dpad"><button data-dir="0,-1" aria-label="Move up">▲</button><button data-dir="-1,0" aria-label="Move left">◀</button><span></span><button data-dir="0,1" aria-label="Move down">▼</button><button data-dir="1,0" aria-label="Move right">▶</button></div><div class="touch-actions"><button class="touch-menu" data-action="menu" aria-label="Open game menu">START</button><button class="touch-interact" data-action="interact" aria-label="Interact">A</button></div></div>
</main><div id="toast" class="toast pixel-panel" role="status"></div><div id="modal-root"></div>`;
const renderer = new Renderer(document.querySelector("#world")!, game);
let roomPath: { x: number; y: number }[] = [];
let roomDestination: Hotspot | undefined;
let guideStamp = "",
  guideOrigin = "",
  guideTime = 0;
function refreshGuide(force = false) {
  const s = game.state;
  const stamp = [
    s.starterChosen,
    s.chapter,
    s.briefed,
    s.catches.join(),
    s.defeated.length,
  ].join("|");
  const old = renderer.guide;
  const origin = `${s.x},${s.y}`;
  if (!force && stamp === guideStamp && old) {
    if (guideOrigin === origin) return;
    const index = old.route.findIndex((p) => p.x === s.x && p.y === s.y);
    if (index >= 0) {
      old.route = old.route.slice(index + 1);
      guideOrigin = origin;
      return;
    }
    if (performance.now() - guideTime < 900) return;
    if (old.destination.x === s.x && old.destination.y === s.y) return;
  }
  guideStamp = stamp;
  guideOrigin = origin;
  guideTime = performance.now();
  renderer.guide = questGuide(game);
}
function enterBuilding(entity: Entity) {
  path = [];
  pendingEntity = undefined;
  keys.clear();
  renderer.target = null;
  renderer.interior = makeInterior(entity);
  renderer.player = { x: 9 * 24, y: 11 * 24 };
  roomPath = [];
  document.body.classList.add("inside-building");
  if (!game.state.reducedMotion)
    renderer.canvas.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 350,
    });
  updateLocation();
}
function leaveBuilding() {
  renderer.interior = null;
  roomPath = [];
  roomDestination = undefined;
  keys.clear();
  renderer.player = { x: game.state.x * 24, y: game.state.y * 24 };
  document.body.classList.remove("inside-building");
  if (!game.state.reducedMotion)
    renderer.canvas.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 350,
    });
  updateLocation();
  refreshGuide(true);
}
function stepPlayer(dx: number, dy: number) {
  const room = renderer.interior;
  if (!room) return game.step(dx, dy);
  room.facing = dy > 0 ? 0 : dx < 0 ? 1 : dx > 0 ? 2 : 3;
  if (!roomWalkable(room, room.x + dx, room.y + dy)) return false;
  room.x += dx;
  room.y += dy;
  if (room.x === 9 && room.y === 12 && dy > 0) leaveBuilding();
  return true;
}
function inspectRoom(
  spot = renderer.interior ? roomSpot(renderer.interior) : undefined,
) {
  const room = renderer.interior;
  if (!room) return;
  if (!spot) {
    toast(
      "Walk up to the counter, a resident, or a gold floor marker and press E.",
    );
    return;
  }
  if (spot.action === "exit") {
    leaveBuilding();
    return;
  }
  if (spot.action === "heal") {
    game.heal();
    toast("Your team is fully rested. HP, PP, and status restored.");
    return;
  }
  if (spot.action === "shop") {
    openPanel("shop");
    return;
  }
  if (spot.action === "research") {
    overlayTab = "research";
    openPanel("journal");
    return;
  }
  if (spot.action === "read") {
    const region = room.entity.region,
      key = `memory-${region}`;
    const fresh = !game.state.claimed.includes(key);
    if (fresh) {
      game.state.claimed.push(key);
      game.state.money += 200;
      game.state.inventory.potion++;
      game.addLog(`Recovered a field-journal page in ${REGIONS[region].name}.`);
      game.save();
      renderHud();
    }
    const count = game.state.claimed.filter((k) =>
      k.startsWith("memory-"),
    ).length;
    dialogue(
      "The lost field journal",
      `${MEMORY_PAGES[region]}<br><br><strong>${count}/9 regional pages recovered.</strong> ${fresh ? "Received ₽200 and a Potion. Look for another page inside a home in each region." : "This page is already in your collection. Visit homes in other regions to complete the journal."}`,
    );
    return;
  }
  if (room.entity.kind === "lab") {
    if (!game.state.starterChosen) starter();
    else
      dialogue(
        "Professor Fern",
        "“Your mother left pages of her journal with friends across all nine regions. Ask inside their homes. Every page tells you something the machines could never measure.”",
        "journal",
        "Open your journal",
      );
  } else
    dialogue(
      "A local friend",
      `${REGIONS[room.entity.region].description}<br><br>“You can rest here whenever you need. There’s a page of the old field journal on the table. And if you’re following the beacons, the gold dots outside point to your next task.”`,
    );
}
function walkRoomTo(x: number, y: number, spot?: Hotspot) {
  const room = renderer.interior;
  if (!room || !roomWalkable(room, x, y)) return;
  const q = [{ x: room.x, y: room.y }],
    prev = new Map<string, { x: number; y: number } | null>([
      [`${room.x},${room.y}`, null],
    ]);
  for (let i = 0; i < q.length; i++) {
    const p = q[i];
    if (p.x === x && p.y === y) break;
    for (const [dx, dy] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]) {
      const n = { x: p.x + dx, y: p.y + dy },
        k = `${n.x},${n.y}`;
      if (!prev.has(k) && roomWalkable(room, n.x, n.y)) {
        prev.set(k, p);
        q.push(n);
      }
    }
  }
  if (!prev.has(`${x},${y}`)) return;
  roomPath = [];
  let p = { x, y };
  while (p.x !== room.x || p.y !== room.y) {
    roomPath.unshift(p);
    p = prev.get(`${p.x},${p.y}`)!;
  }
  roomDestination = spot;
  if (!roomPath.length && spot) {
    roomDestination = undefined;
    inspectRoom(spot);
  }
}

function hpBar(p: Pokemon) {
  return `<span class="hp-track"><i style="width:${(p.hp / maxHp(p)) * 100}%;background:${p.hp / maxHp(p) < 0.25 ? "#e86650" : p.hp / maxHp(p) < 0.5 ? "#edbd48" : "#55b779"}"></i></span>`;
}
function objectives() {
  const s = game.state,
    c = game.chapter;
  if (!c)
    return [
      { text: "All eight beacons shine again", done: true },
      { text: "Complete your field guide", done: s.caught.length >= 60 },
      { text: "Wander wherever you wish", done: false },
    ];
  return [
    {
      text: s.starterChosen
        ? `Hear the story of ${REGIONS[c.region].name}`
        : "Meet Professor Fern",
      done: s.briefed,
    },
    {
      text: `Befriend a Pokémon in ${c.region === 1 ? "the woods" : REGIONS[c.region].name}`,
      done: s.catches[c.region] > 0,
    },
    {
      text: `Challenge the trail wardens (${game.chapterWins}/2)`,
      done: game.chapterWins >= 2,
    },
  ];
}
function renderHud() {
  const s = game.state,
    p = s.party[0];
  document.querySelector("#party-hud")!.innerHTML =
    `<img class="hud-pokemon" src="${sprite(p.species)}" alt="${SPECIES[p.species].name}"/><span class="hud-pokemon-info"><span class="hud-pokemon-name">${SPECIES[p.species].name}<small>Lv.${p.level}</small></span><span class="hud-hp"><b>HP</b>${hpBar(p)}</span><span class="party-slots">${Array.from({ length: 6 }, (_, i) => `<span class="${s.party[i] ? (s.party[i].hp > 0 ? "occupied" : "fainted-slot") : ""}">${ball}</span>`).join("")}</span></span>`;
  const objective = !s.starterChosen
    ? "Meet Professor Fern"
    : game.bossReady
      ? `Find ${game.chapter!.keeper} at the beacon`
      : objectives().find((o) => !o.done)?.text || "Explore Aurelian";
  document.querySelector("#quest-hud")!.innerHTML =
    `<span class="quest-marker">!</span><span><small>${game.chapter ? `CHAPTER ${String(s.chapter + 1).padStart(2, "0")}` : "POSTGAME"}</small><strong>${objective}</strong></span><span class="quest-pointer">▶</span>`;
  document.querySelector("#save-indicator")!.textContent = game.saveError
    ? "SAVE FAILED · CHECK OPTIONS"
    : "AUTOSAVE ON";
  refreshGuide();
  updateLocation();
}
function updateLocation() {
  const s = game.state,
    r = REGIONS[game.region];
  const minutes = Math.floor(624 + s.played / 3) % 1440,
    hours = Math.floor(minutes / 60);
  document.querySelector(".weather-pill")!.innerHTML =
    `${icon(hours >= 19 || hours < 6 ? "moon" : "sun", 18)}<span>${hours % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}</span>`;
  document.querySelector("#location-name")!.textContent = r.name;
  if (renderer.interior) {
    const room = renderer.interior,
      spot = roomSpot(room);
    document.querySelector("#location-name")!.textContent = room.entity.name;
    document.querySelector(".region-caption")!.textContent =
      "INDOORS · " + REGIONS[room.entity.region].name;
    document.querySelector("#world-hint")!.innerHTML =
      `<kbd>E</kbd><span>${spot?.label || "EXPLORE"}</span>`;
    document
      .querySelector("#world-hint")!
      .setAttribute("aria-label", spot?.label || "Inspect room");
    document
      .querySelector("#world")!
      .setAttribute("data-position", `${room.x},${room.y}`);
    document
      .querySelector("#world")!
      .setAttribute(
        "aria-label",
        roomTitle(room) +
          ". Use movement keys to explore. E to interact. South door to exit.",
      );
    return;
  }
  document.querySelector(".region-caption")!.textContent = "AURELIAN REGION";
  document
    .querySelector("#world")!
    .setAttribute(
      "aria-label",
      "Pokémon overworld. Follow the gold dots to your next objective.",
    );
  const e = nearEntity(s.x, s.y);
  document.querySelector("#world-hint")!.innerHTML =
    `<kbd>E</kbd><span>${e ? (e.kind === "trainer" ? "BATTLE" : ["center", "shop", "lab", "house"].includes(e.kind) ? "ENTER" : e.kind === "shop" ? "SHOP" : e.kind === "chest" ? "OPEN" : "TALK") : "INTERACT"}</span>`;
  document
    .querySelector("#world-hint")!
    .setAttribute(
      "aria-label",
      e ? `Interact with ${e.name}` : "Interact with surroundings",
    );
  document
    .querySelector("#world")!
    .setAttribute("data-position", `${s.x},${s.y}`);
}
function renderMenu() {
  const s = game.state;
  showModal(
    "MENU",
    `<div class="pause-layout"><div class="pause-art"><div class="game-logo" aria-label="Pokémon Wildbound"><span>Pokémon</span><strong>WILDBOUND</strong></div><div class="pause-pokemon"><img src="${sprite(25)}" alt="Pikachu"/><img src="${sprite(s.party[0].species)}" alt="${SPECIES[s.party[0].species].name}"/></div><div class="trainer-card"><img src="${asset("ui/trainer.svg")}" alt="Your trainer"/><div><small>TRAINER</small><strong>${esc(s.name)}</strong><span>₽${s.money.toLocaleString()}</span></div><div class="trainer-stats"><span>POKÉDEX <b>${s.caught.length}/87</b></span><span>BEACONS <b>${s.badges.length}/8</b></span><span>PLAY TIME <b>${Math.floor(s.played / 3600)}:${String(Math.floor(s.played / 60) % 60).padStart(2, "0")}</b></span></div></div><div class="menu-objective"><span>▸ ${game.chapter?.title || "A world worth wandering"}</span><p>${!s.starterChosen ? "Professor Fern is waiting near the lab." : objectives().find((o) => !o.done)?.text || "All eight beacons are shining."}</p></div></div><nav class="pause-options" aria-label="Game menu">${[
      ["team", "POKÉMON", sprite(s.party[0].species), "P"],
      ["dex", "POKÉDEX", asset("ui/poke-ball.png"), ""],
      ["bag", "BAG", asset("ui/potion.png"), "B"],
      ["map", "TOWN MAP", asset("ui/town-map.png"), "M"],
      ["journal", "JOURNAL", asset("ui/exp-share.png"), "J"],
      ["save", "SAVE", asset("ui/great-ball.png"), ""],
      ["settings", "OPTIONS", asset("ui/ether.png"), ""],
      ["help", "CONTROLS", asset("ui/old-rod.png"), "H"],
      ["close", "RETURN", "", "ESC"],
    ]
      .map(
        ([action, label, art, key]) =>
          `<button data-action="${action}" class="pause-option"><span class="selection-arrow">▶</span>${art ? `<img src="${art}" alt=""/>` : '<span class="return-arrow">↩</span>'}<strong>${label}</strong>${key ? `<kbd>${key}</kbd>` : ""}</button>`,
      )
      .join(
        "",
      )}</nav></div><div class="pause-help"><span><kbd>↑ ↓</kbd> SELECT <kbd>ENTER</kbd> CONFIRM</span><span><kbd>ESC</kbd> RETURN TO GAME</span></div>`,
    true,
    "ADVENTURE PAUSED",
  );
}
function toast(message: string) {
  const el = document.querySelector("#toast")!;
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(
    () => el.classList.remove("visible"),
    Math.min(6500, 2000 + message.length * 18),
  );
}
function showModal(
  title: string,
  body: string,
  wide = false,
  subtitle = "AURELIAN FIELD GUIDE",
) {
  const wasOpen = !!document.querySelector(".modal");
  if (!wasOpen) previousFocus = document.activeElement as HTMLElement;
  keys.clear();
  for (const el of document.querySelectorAll<HTMLElement>(".game-screen"))
    el.inert = true;
  document.body.style.overflow = "hidden";
  document.querySelector("#modal-root")!.innerHTML =
    `<div class="modal-shade mode-${overlay}"><section class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header class="modal-header"><div><span class="eyebrow">${subtitle}</span><h2>${title}</h2></div><div class="menu-back-buttons">${["team", "dex", "map", "journal", "bag", "settings", "help"].includes(overlay) ? '<button class="back-menu-button" data-action="menu" aria-label="Back to game menu">◀ MENU</button>' : ""}<button class="icon-button" data-action="close" aria-label="Return to game">${icon("close")}</button></div></header><div class="modal-body">${body}</div></section></div>`;
  requestAnimationFrame(() => {
    if (overlay === "dex" && !wasOpen)
      (document.querySelector("#dex-search") as HTMLElement)?.focus();
    if (overlay !== "dex")
      (
        (document.querySelector(
          '.modal button:not([data-action="close"]):not([disabled])',
        ) as HTMLElement) ||
        (document.querySelector(".modal button") as HTMLElement)
      )?.focus();
  });
}
function clearModal() {
  document.querySelector("#modal-root")!.innerHTML = "";
  for (const el of document.querySelectorAll<HTMLElement>(".game-screen"))
    el.inert = false;
  document.body.style.overflow = "hidden";
}
function closeModal() {
  if (battleAnimating) return;
  if (game.battle) {
    if (game.battle.ended) {
      game.closeBattle();
    } else return;
  }
  overlay = "";
  overlayTab = "";
  clearModal();
  const focusTarget = previousFocus?.isConnected
    ? previousFocus
    : document.querySelector<HTMLElement>("#world");
  focusTarget?.focus({ preventScroll: true });
}
function openPanel(name: string) {
  if (game.battle && name !== "battle") return;
  const prior = overlay;
  overlay = name;
  keys.clear();
  if (!prior) previousFocus = document.activeElement as HTMLElement;
  renderPanel();
}
function renderPanel() {
  switch (overlay) {
    case "menu":
      renderMenu();
      break;
    case "team":
      renderTeam();
      break;
    case "dex":
      renderDex();
      break;
    case "map":
      renderMap();
      break;
    case "journal":
      renderJournal();
      break;
    case "bag":
      renderBag();
      break;
    case "settings":
      renderSettings();
      break;
    case "help":
      renderHelp();
      break;
    case "battle":
      renderBattle();
      break;
    case "shop":
      renderShop();
      break;
  }
}
function typeBadge(id: number) {
  const s = SPECIES[id];
  return `<span class="type-badge" style="--type:${COLORS[s.type]}">${s.type}</span>`;
}
function renderTeam() {
  selectedParty = Math.min(selectedParty, game.state.party.length - 1);
  const p = game.state.party[selectedParty];
  const swap = selectedBox >= 0 && overlayTab === "storage";
  showModal(
    "POKÉMON",
    `<div class="tabs"><button data-action="team-tab" data-id="party" class="${overlayTab !== "storage" ? "active" : ""}">PARTY ${game.state.party.length}/6</button><button data-action="team-tab" data-id="storage" class="${overlayTab === "storage" ? "active" : ""}">PC STORAGE ${game.state.box.length}</button></div>${overlayTab === "storage" ? `<p class="muted">${game.state.party.length < 6 ? "Choose a Pokémon to withdraw." : "Select a stored Pokémon, then choose a party member to swap."}</p><div class="storage-grid">${game.state.box.length ? game.state.box.map((mon, i) => `<button class="storage-mon ${selectedBox === i ? "chosen" : ""}" data-action="box-pick" data-id="${i}"><img src="${sprite(mon.species)}" alt=""/><strong>${SPECIES[mon.species].name}</strong><span>Lv.${mon.level} · ${mon.hp}/${maxHp(mon)} HP</span></button>`).join("") : '<div class="empty-state">No Pokémon in storage.</div>'}</div>` : ""}<div class="party-screen"><article class="pokemon-summary"><div class="summary-heading"><span>SUMMARY</span>${typeBadge(p.species)}</div><div class="summary-art"><img src="${sprite(p.species)}" alt="${SPECIES[p.species].name}"/></div><h3>${SPECIES[p.species].name}${p.shiny ? " ✦" : ""}<small>Lv.${p.level}</small></h3><div class="health-label"><span>${p.status || "HP"}</span><span>${p.hp}/${maxHp(p)}</span></div>${hpBar(p)}<div class="xp-track"><i style="width:${(p.xp / xpNeeded(p)) * 100}%"></i></div><p class="xp-label">NEXT LEVEL: ${xpNeeded(p) - p.xp} EXP.</p><div class="summary-moves">${p.moves.map((m, i) => `<div><span>${MOVES[m].name}</span><small>PP ${p.pp[i]}/${MOVES[m].pp}</small></div>`).join("")}</div>${swap ? `<button class="button primary full" data-action="box-swap" data-id="${selectedParty}">SWAP POKÉMON</button>` : `<button class="button primary full" data-action="lead" data-id="${selectedParty}" ${selectedParty === 0 || p.hp <= 0 ? "disabled" : ""}>${selectedParty === 0 ? "LEAD POKÉMON" : "MOVE TO FRONT"}</button>`}</article><div class="party-selection">${Array.from(
      { length: 6 },
      (_, i) => {
        const mon = game.state.party[i];
        return mon
          ? `<button class="party-slot ${selectedParty === i ? "selected" : ""}" data-action="party-select" data-id="${i}"><span class="party-cursor">▶</span><img src="${sprite(mon.species)}" alt=""/><span class="slot-info"><strong>${SPECIES[mon.species].name}<small>Lv.${mon.level}</small></strong><span class="slot-hp"><b>HP</b>${hpBar(mon)}</span><span class="slot-health">${mon.hp}/${maxHp(mon)} ${mon.status ? " · " + mon.status.toUpperCase() : ""}</span></span></button>`
          : `<div class="party-slot empty-slot">${ball}<span>— — —</span></div>`;
      },
    ).join(
      "",
    )}</div></div><div class="party-prompt">${swap ? "Choose a Pokémon to swap." : "Choose a Pokémon to view its moves or change your lead."}</div>`,
    true,
    "PARTY & PC STORAGE",
  );
}
function renderDex() {
  const all = Object.values(SPECIES);
  const filtered = all.filter(
    (s) =>
      s.name.toLowerCase().includes(dexFilter.toLowerCase()) &&
      (dexType === "all" ||
        (dexType === "caught" && game.state.caught.includes(s.id)) ||
        s.type === dexType),
  );
  showModal(
    "POKÉDEX",
    `<div class="dex-summary"><strong>${game.state.caught.length}<small> / ${all.length} registered</small></strong><span>${game.state.seen.length} seen · ${game.state.caught.length} caught</span></div><div class="filters"><label class="search-box">${icon("search", 18)}<input id="dex-search" aria-label="Search Pokémon" placeholder="Find a Pokémon…" value="${esc(dexFilter)}"/></label><select id="dex-type" aria-label="Filter Pokémon"><option value="all">All Pokémon</option><option value="caught" ${dexType === "caught" ? "selected" : ""}>Caught Pokémon</option>${Object.keys(
      COLORS,
    )
      .map((t) => `<option ${dexType === t ? "selected" : ""}>${t}</option>`)
      .join("")}</select></div><div class="dex-grid">${
      filtered
        .map((s) => {
          const caught = game.state.caught.includes(s.id),
            seen = game.state.seen.includes(s.id);
          return `<button class="dex-card ${caught ? "caught" : ""}" data-action="dex-detail" data-id="${s.id}"><span class="dex-number">#${String(s.id).padStart(3, "0")}${caught ? ball : ""}</span><img src="${sprite(s.id)}" class="${seen ? "" : "silhouette"}" alt="${seen ? s.name : "Undiscovered Pokémon"}"/><strong>${seen ? s.name : "Unknown"}</strong>${seen ? typeBadge(s.id) : '<span class="unknown-type">Waiting to be discovered</span>'}</button>`;
        })
        .join("") ||
      '<div class="empty-state">No Pokémon match your search.</div>'
    }</div>`,
    true,
    "YOUR POKÉDEX",
  );
}
function renderMap(selected = game.region) {
  const s = game.state;
  showModal(
    "TOWN MAP",
    `<p class="modal-intro">Nine places. Countless little discoveries. Walk freely between regions; travel instantly to places you’ve visited.</p><div class="map-layout"><div class="region-map">${REGIONS.map((r, i) => `<button class="map-region ${selected === i ? "chosen" : ""}" data-action="map-select" data-id="${i}" style="--landscape:url('${thumbs[i]}')"><span class="map-region-number">0${i + 1}</span><strong>${r.name}</strong><span>${s.visited.includes(i) ? `${icon(i === game.region ? "location" : "check", 12)} ${i === game.region ? "You are here" : "Discovered"}` : "Uncharted · Lv. " + r.level + "+"}</span>${s.badges.includes(i) ? '<b class="map-beacon">✦</b>' : ""}</button>`).join("")}</div><div class="map-detail"><img src="${thumbs[selected]}" alt="${REGIONS[selected].biome} landscape"/><span class="eyebrow">REGION ${String(selected + 1).padStart(2, "0")}</span><h3>${REGIONS[selected].name}</h3><p>${REGIONS[selected].description}</p><div class="map-pool">${REGIONS[
      selected
    ].pool
      .slice(0, 5)
      .map(
        (id) =>
          `<img src="${sprite(id)}" alt="${SPECIES[id].name}" title="${SPECIES[id].name}"/>`,
      )
      .join(
        "",
      )}</div><small>Wild Pokémon around level ${REGIONS[selected].level}</small><button class="button primary full" data-action="travel" data-id="${selected}">${selected === game.region ? "Explore this region" : s.visited.includes(selected) ? "Travel here" : "Set a course"} ${icon("arrow", 16)}</button><p class="travel-note">${s.visited.includes(selected) ? "The homeward stones remember your footsteps." : "You’ll follow the connected trails on foot. Move manually to cancel."}</p></div></div>`,
    true,
    "THE AURELIAN REGION",
  );
}
function renderJournal() {
  const c = game.chapter,
    s = game.state;
  showModal(
    "JOURNAL",
    `<div class="tabs"><button class="${overlayTab !== "research" && overlayTab !== "memories" ? "active" : ""}" data-action="journal-tab" data-id="story">The eight beacons</button><button class="${overlayTab === "research" ? "active" : ""}" data-action="journal-tab" data-id="research">Field research</button><button class="${overlayTab === "memories" ? "active" : ""}" data-action="journal-tab" data-id="memories">Your memories</button></div>${
      overlayTab === "research"
        ? `<div class="research-list">${SIDE_QUESTS.map((q) => {
            const progress = game.progress(q.kind),
              claimed = s.claimed.includes(q.id);
            return `<article class="research-card"><span class="research-icon">${icon(claimed ? "check" : q.kind === "caught" ? "dex" : q.kind === "steps" ? "compass" : "star", 23)}</span><div><h3>${q.name}</h3><p>${q.desc}</p><div class="xp-track"><i style="width:${Math.min(100, (progress / q.target) * 100)}%"></i></div><small>${Math.min(q.target, progress)} / ${q.target} · Reward: ₽${q.reward.toLocaleString()}</small></div><button class="button ${progress >= q.target && !claimed ? "primary" : "pale"}" data-action="claim" data-id="${q.id}" ${claimed || progress < q.target ? "disabled" : ""}>${claimed ? "Collected" : "Claim"}</button></article>`;
          }).join("")}</div>`
        : overlayTab === "memories"
          ? `<h3>The lost field journal · ${s.claimed.filter((k) => k.startsWith("memory-")).length}/9 pages</h3><p class="muted">Visit homes in each region and read the notes left on their tables.</p><div class="memory-pages">${MEMORY_PAGES.map((page, r) => `<article class="memory-page"><h3>${REGIONS[r].name}</h3><p>${s.claimed.includes(`memory-${r}`) ? page : "An undiscovered page. Ask inside a local home."}</p></article>`).join("")}</div><div class="memories">${s.log.map((l, i) => `<article><span>${i === 0 ? "LATEST MEMORY" : "FIELD NOTE"}</span><p>${esc(l)}</p></article>`).join("")}</div>`
          : `<article class="story-intro"><span class="eyebrow">${c ? "YOUR CURRENT CHAPTER" : "THE STORY CONTINUES"}</span><h3>${c?.title || "A world worth wandering"}</h3><p>${c?.intro || "The eight beacons sing again. Your mother is home. Complete your Pokédex, challenge the wardens to rematches, and see what waits beyond the next bend."}</p>${c ? `<button class="button primary" data-action="brief">${s.starterChosen ? "Follow this chapter" : "Meet Professor Fern"} ${icon("arrow", 16)}</button>` : ""}</article><div class="chapter-list">${CHAPTERS.map((ch, i) => `<article class="chapter-item ${i === s.chapter ? "current" : ""}"><span class="chapter-number">${i < s.chapter ? icon("check", 17) : String(i + 1).padStart(2, "0")}</span><div><span>${REGIONS[ch.region].name}</span><h3>${i <= s.chapter ? ch.title : "An unwritten chapter"}</h3>${i < s.chapter ? `<p>${ch.reveal}</p>` : ""}</div><span>${i < s.chapter ? "RESTORED" : i === s.chapter ? "IN PROGRESS" : icon("lock", 16)}</span></article>`).join("")}</div>`
    }`,
    true,
    "YOUR ADVENTURE JOURNAL",
  );
}
function itemArt(id: ItemId) {
  const files = {
    ball: "poke-ball",
    great: "great-ball",
    potion: "potion",
    super: "super-potion",
    revive: "revive",
    ether: "ether",
  };
  return `<img src="${asset(`ui/${files[id]}.png`)}" alt=""/>`;
}
function renderBag() {
  showModal(
    "BAG",
    `<div class="wallet">${ball}<span>Your travel fund</span><strong>₽${game.state.money.toLocaleString()}</strong></div><p class="modal-intro">Choose a supply, then a companion. Find more supplies in markets, hidden chests, and research rewards.</p><div class="item-list">${(Object.entries(ITEMS) as [ItemId, (typeof ITEMS)[ItemId]][]).map(([id, item]) => `<article class="item-row"><span class="item-icon ${id}">${itemArt(id)}</span><div><h3>${item.name}</h3><p>${item.description}</p></div><strong>×${game.state.inventory[id]}</strong><button class="button pale" data-action="item-target" data-id="${id}" ${game.state.inventory[id] < 1 || ["ball", "great"].includes(id) ? "disabled" : ""}>${["ball", "great"].includes(id) ? "In battle" : "Use"}</button></article>`).join("")}</div>`,
    false,
    "YOUR ADVENTURE BAG",
  );
}
function itemTarget(id: ItemId) {
  showModal(
    `Use ${ITEMS[id].name}`,
    `<p class="modal-intro">Choose a companion. ${ITEMS[id].description}</p><div class="target-list">${game.state.party.map((p, i) => `<button class="target-mon" data-action="use-item" data-item="${id}" data-id="${i}"><img src="${sprite(p.species)}" alt=""/><div><strong>${SPECIES[p.species].name}</strong>${hpBar(p)}<small>${p.hp} / ${maxHp(p)} HP · Lv. ${p.level}</small></div>${icon("chevron", 18)}</button>`).join("")}</div><button class="button pale" data-action="${game.battle ? "battle-back" : "bag"}">Back</button>`,
  );
}
function renderShop() {
  showModal(
    "POKÉ MART",
    `<div class="shop-welcome"><span>“A well-packed bag leaves more room for adventure.”</span><strong>₽${game.state.money.toLocaleString()}</strong></div><div class="item-list">${(Object.entries(ITEMS) as [ItemId, (typeof ITEMS)[ItemId]][]).map(([id, item]) => `<article class="item-row"><span class="item-icon ${id}">${itemArt(id)}</span><div><h3>${item.name} <small>In bag: ${game.state.inventory[id]}</small></h3><p>${item.description}</p></div><button class="button pale" data-action="buy" data-id="${id}" ${game.state.money < item.price ? "disabled" : ""}>₽${item.price} ${icon("plus", 12)}</button></article>`).join("")}</div><p class="muted">Rest houses are always free. Look for the red cross in every town.</p>`,
    false,
    "TRAILSIDE MARKET",
  );
}
function renderSettings() {
  const s = game.state;
  showModal(
    "OPTIONS",
    `<label class="setting-row"><span><strong>Trainer name</strong><small>Your name on the trail.</small></span><input id="trainer-name" value="${esc(s.name)}" maxlength="20" aria-label="Trainer name"/></label><div class="setting-row"><span><strong>Quiet moments</strong><small>Soft, synthesized ambient music.</small></span><button class="toggle ${s.volume ? "on" : ""}" data-action="sound" aria-label="Toggle music" aria-pressed="${s.volume}"><i></i></button></div><div class="setting-row"><span><strong>Reduced motion</strong><small>Turn off drifting petals and sprite bobbing.</small></span><button class="toggle ${s.reducedMotion ? "on" : ""}" data-action="motion" aria-label="Toggle reduced motion" aria-pressed="${s.reducedMotion}"><i></i></button></div><div class="setting-row"><span><strong>Your adventure, safely kept</strong><small>${Math.floor(s.played / 60)} minutes traveled · ${s.steps.toLocaleString()} steps taken</small></span>${icon("save", 22)}</div><div class="settings-buttons"><button class="button primary" data-action="save">${icon("save", 17)} Save now</button><button class="button pale" data-action="export">Export backup</button><label class="button pale file-button">Import backup<input type="file" id="import-save" accept="application/json,.json"/></label></div><p class="muted">Saves stay in this browser. Export a backup to keep your progress or move to another device.</p><div class="danger-zone"><div><strong>A fresh beginning</strong><p>Start a new adventure. Export your save first if you want to return.</p></div><button class="text-button danger" data-action="reset-confirm">New game</button></div>`,
    false,
    "SETTINGS",
  );
}
function renderHelp() {
  showModal(
    "CONTROLS",
    `<div class="help-hero">${icon("compass", 38)}<p>Take the long way. Talk to everyone.<br>There’s no wrong way to find your story.</p></div><div class="help-grid">${[
      ["W A S D / ↑ ↓ ← →", "Walk around the world"],
      ["SHIFT", "Hold to run"],
      ["E / SPACE", "Talk, shop, heal, or inspect"],
      ["CLICK", "Walk to a place or interactable"],
      ["M", "Open the world map"],
      ["P / B / J", "Team, bag, or journal"],
      ["ESC / ENTER", "Open the game menu"],
    ]
      .map(([k, v]) => `<div><kbd>${k}</kbd><span>${v}</span></div>`)
      .join(
        "",
      )}</div><div class="help-tips"><h3>A few trail notes</h3><p><strong>Start with Professor Fern.</strong> She’s just north of the signpost. Your quest button will lead you to her.</p><p><strong>Tall grass is full of life.</strong> Walk through it to encounter Pokémon. Lower their HP before throwing a ball. You can carry six companions.</p><p><strong>Types matter.</strong> Water beats Fire, Fire beats Grass, and Grass beats Water. Check move colors, switch your team, and keep an eye on PP.</p><p><strong>Rest is free.</strong> Every settlement has a red-roofed rest house. Press E near it to restore HP, PP, and clear status effects.</p><p><strong>Follow the eight beacons.</strong> For each chapter, read the briefing, catch a local Pokémon, and defeat two different trail wardens. Then challenge the beacon keeper.</p><p><strong>Take your time.</strong> Find 36 supply chests, meet 36 trainers, complete eight research projects, and discover 87 Pokémon. Every route is open from the beginning, but distant regions are challenging.</p></div>`,
    false,
    "WELCOME TO WILDBOUND",
  );
}
function starter() {
  overlay = "starter";
  showModal(
    "CHOOSE YOUR POKÉMON",
    `<div class="dialogue-person"><span class="portrait fern"><img src="${asset("ui/professor.svg")}" alt="Professor Fern"/></span><div><span>PROFESSOR FERN</span><p>“Eevee seems to like you already. But the road ahead is long — you could both use another friend. Who would you like to come along?”</p></div></div><div class="starter-grid">${[1, 4, 7].map((id) => `<button class="starter-card" data-action="starter" data-id="${id}"><img src="${sprite(id)}" alt="${SPECIES[id].name}"/>${typeBadge(id)}<h3>${SPECIES[id].name}</h3><p>${id === 1 ? "Patient, loyal, and a little curious." : id === 4 ? "A small spark with a brave heart." : "Easygoing, until a friend needs help."}</p><span>Choose ${SPECIES[id].name} ${icon("arrow", 14)}</span></button>`).join("")}</div><p class="muted center-text">All three can also be found in the wild. Follow your heart.</p>`,
    true,
    "A SMALL HELLO, A GREAT BEGINNING",
  );
}
function dialogue(name: string, text: string, action?: string, label?: string) {
  overlay = "dialogue";
  showModal(
    name,
    `<div class="dialogue-person"><span class="portrait"><img src="${asset(`ui/${name === "Ivy" ? "ivy" : name.includes("Fern") ? "professor" : "trainer"}.svg`)}" alt=""/></span><div><span>${name === "Ivy" ? "YOUR CHILDHOOD FRIEND" : "A VOICE FROM AURELIAN"}</span><p>${text}</p></div></div><button class="button primary" data-action="${action || "close"}">${label || "Back to the adventure"} ${icon("arrow", 16)}</button>`,
    false,
    REGIONS[game.region].name.toUpperCase(),
  );
}
function interact(e = nearEntity(game.state.x, game.state.y)) {
  if (game.battle || overlay) return;
  if (renderer.interior) {
    inspectRoom();
    return;
  }
  if (e && ["center", "shop", "house", "lab"].includes(e.kind)) {
    enterBuilding(e);
    return;
  }
  if (!e) {
    toast("Get closer to a person, building, or chest, then press E.");
    return;
  }
  if (e.kind === "center") {
    game.heal();
    return;
  }
  if (e.kind === "shop") {
    openPanel("shop");
    return;
  }
  if (e.kind === "chest") {
    game.openChest(e);
    return;
  }
  if (e.kind === "trainer") {
    overlay = "trainer";
    showModal(
      e.name,
      `<div class="dialogue-person"><span class="portrait"><img src="${asset("ui/trainer.svg")}" alt=""/></span><div><span>TRAIL WARDEN · Lv. ${REGIONS[e.region].level + e.variant + 1}</span><p>“The best part of the trail is who you meet along the way. How about a friendly battle?”</p></div></div><div class="dialogue-actions"><button class="button pale" data-action="close">Maybe another time</button><button class="button primary" data-action="challenge" data-id="${e.id}">${game.state.defeated.includes(e.id) ? "A friendly rematch" : "Let’s battle"} ${icon("bolt", 17)}</button></div>`,
    );
    return;
  }
  if (e.kind === "beacon") {
    if (e.region === 0) {
      dialogue(
        "The homeward stone",
        "The stone is warm beneath your hand. Wherever you go, you can return to any place you’ve discovered using the world map.",
      );
      return;
    }
    if (game.state.badges.includes(e.region)) {
      dialogue(
        "A light that lasts",
        "The beacon hums with a familiar warmth. You helped bring this light back. Somewhere, another traveler is finding their way by it.",
      );
      return;
    }
    if (game.chapter?.region !== e.region) {
      dialogue(
        "The silent beacon",
        "A quiet pulse waits beneath the stone. Your journal may have the next piece of this story.",
        "journal",
        "Read your journal",
      );
      return;
    }
    if (!game.bossReady) {
      dialogue(
        game.chapter.keeper,
        "“Before we wake the beacon, learn what this place is protecting. Read this chapter’s briefing, befriend a local Pokémon, and defeat two different trail wardens.”",
        "journal",
        "Open the chapter",
      );
      return;
    }
    dialogue(
      game.chapter.keeper,
      `“${game.chapter.bossLine}”`,
      "boss",
      "Challenge the keeper",
    );
    return;
  }
  if (e.name === "Professor Fern" || e.kind === "lab") {
    if (!game.state.starterChosen) {
      starter();
      return;
    }
    dialogue(
      "Professor Fern",
      "“The beacons connect every living thing in Aurelian. Your mother understood them better than anyone. Start in Whispering Woods, east of here. And remember: your journal will always point you toward the next chapter.”",
      "journal",
      "Look at your journal",
    );
    return;
  }
  if (e.name === "Ivy") {
    dialogue(
      "Ivy",
      game.state.chapter === 0
        ? "“You always said you’d leave when you were ready. I don’t think anyone’s ever ready. Let’s just go! The road east leads to Whispering Woods. I’ll race you to the first beacon.”"
        : "“Look at how far we’ve come. When this is over, let’s take a trip without any world-saving. Just us, our Pokémon, and a very large picnic.”",
      game.state.starterChosen ? "rival" : undefined,
      game.state.starterChosen ? "How about a friendly battle?" : undefined,
    );
    return;
  }
  if (e.kind === "sign") {
    dialogue(
      e.name,
      `${REGIONS[e.region].description}<br><br><strong>Trail guide:</strong> Red roofs offer free rest. Blue roofs sell supplies. Wardens wear a “!” marker. An ancient beacon stands to the northeast.`,
    );
    return;
  }
  if (
    e.kind === "npc" &&
    game.chapter?.region === e.region &&
    !game.state.briefed
  ) {
    dialogue(e.name, game.chapter.intro, "brief", "Hear the chapter briefing");
    return;
  }
  const lines = [
    "“Some of us travel to find something. Some travel to leave something behind. And some just like the walk.”",
    "“Try talking to the people with a little marker above them. A good battle teaches you something — win or lose.”",
    "“I hear the Pokédex research fund pays rather well. Check the Field Research tab in your journal.”",
    "“There are four supply chests in every region. Look off the main trail, near the edges.”",
    "“Your companions all share experience. Even a tiny Caterpie can surprise you if you give it time.”",
    "“Vale used to visit here. He was kind. Grief can make even kind people lose their way.”",
    "“The mountains are cold, but the rest house always has a bed and a hot meal.”",
    "“A Great Ball makes a difference. So does lowering the Pokémon’s HP. Patience matters more than luck.”",
    "“I thought reaching the summit would feel like an ending. It feels like a beginning.”",
  ];
  dialogue(e.name, lines[e.region]);
}
function navigateTo(x: number, y: number, e?: Entity) {
  const route = pathTo(game.state.x, game.state.y, x, y);
  if (!route.length && !(x === game.state.x && y === game.state.y)) {
    toast("That spot is out of reach. Try the path nearby.");
    return;
  }
  path = route;
  pendingEntity = e;
  renderer.target = { x, y };
  if (!path.length && pendingEntity) {
    const target = pendingEntity;
    pendingEntity = undefined;
    interact(target);
  }
}
function approach(e: Entity) {
  const target = entityApproach(game, e);
  if (target) navigateTo(target.destination.x, target.destination.y, e);
  else toast("Look for another way around.");
}
function trackQuest() {
  closeModal();
  if (renderer.interior) leaveBuilding();
  refreshGuide(true);
  const guide = renderer.guide;
  if (guide) {
    navigateTo(guide.destination.x, guide.destination.y, guide.entity);
    toast(`${guide.label}. Follow the gold dots; movement keys take over.`);
  } else openPanel("journal");
  renderHud();
}
let battleAnimating = false;
let battleView: BattleFrame | null = null;
async function battleAction(action: () => unknown) {
  if (battleAnimating || !game.battle || game.battle.ended) return;
  let previous = game.battleFrame()!;
  battleAnimating = true;
  game.battleCues = [];
  overlayTab = "";
  try {
    action();
    const final = game.battleFrame();
    for (const cue of game.battleCues) {
      battleView = cue;
      renderBattle();
      await playBattleCue(cue, previous, game.state.reducedMotion);
      previous = cue;
    }
    battleView = final;
  } finally {
    battleAnimating = false;
    battleView = null;
    game.battleCues = [];
    renderBattle();
    renderHud();
  }
}
function renderBattle() {
  const b = battleView?.battle ?? game.battle;
  if (!b) return;
  const party = battleView?.party ?? game.state.party,
    p = party[b.active],
    e = b.enemy,
    ps = SPECIES[p.species],
    es = SPECIES[e.species];
  const struggle = p.pp.every((n) => n === 0);
  const disabled = battleAnimating ? "disabled" : "";
  const nav = `<nav class="combat-nav" aria-label="Battle choices">${[
    ["moves", "FIGHT", "Choose a move", "⚔"],
    [
      "balls",
      "CATCH",
      b.trainer ? "Wild Pokémon only" : "Throw a Poké Ball",
      "◉",
    ],
    ["switch", "POKÉMON", "Switch your partner", "↔"],
    ["items", "BAG", "Heal or restore PP", "✚"],
  ]
    .map(
      ([tab, label, hint, symbol]) =>
        `<button data-action="battle-tab" data-id="${tab}" class="${overlayTab === tab ? "selected" : ""}" ${disabled} ${tab === "balls" && b.trainer ? "disabled" : ""}><b>${symbol}</b><span>${label}<small>${hint}</small></span></button>`,
    )
    .join(
      "",
    )}<button data-action="flee" ${disabled} ${b.trainer ? "disabled" : ""}><b>➜</b><span>RUN<small>${b.trainer ? "Trainer battle" : "Try to escape"}</small></span></button></nav>`;
  let commands = "";
  if (battleAnimating)
    commands = `<div class="turn-wait"><span class="turn-spinner">◈</span><h3>Turn ${b.turn || 1} · Watch the action</h3><p>Each action resolves in order. Your choices return in a moment.</p></div>`;
  else if (b.ended)
    commands = `<div class="battle-result"><h3>${b.result}</h3><button class="button primary full" data-action="battle-close">${b.rewarded ? "The beacon awakens" : "Continue adventure"} →</button></div>`;
  else if (overlayTab === "moves")
    commands = `<h3>Choose ${ps.name}’s move</h3><div class="move-grid">${(struggle
      ? ["tackle"]
      : p.moves
    )
      .map((key, i) => {
        const m = MOVES[key],
          eff = effectiveness(m, e);
        return `<button class="move-button" data-action="move" data-id="${i}" style="--type:${COLORS[m.type]}" ${!struggle && p.pp[i] === 0 ? "disabled" : ""}><strong>${struggle ? "Struggle" : m.name}</strong><span>${m.type} · ${m.power ? `Power ${m.power}` : m.kind}<b>${struggle ? "∞" : p.pp[i]} PP</b></span><small>${m.power ? (eff > 1 ? "SUPER EFFECTIVE ×2" : eff === 0 ? "NO EFFECT" : eff < 1 ? "RESISTED ×½" : "Normal damage") : m.kind === "guard" ? "Block most incoming damage" : m.kind === "heal" ? "Recover half your HP" : "Put the opponent to sleep"}</small></button>`;
      })
      .join("")}</div>`;
  else if (overlayTab === "balls")
    commands = `<h3>Weaken it, then throw!</h3><div class="battle-items">${(["ball", "great"] as ItemId[]).map((id) => `<button data-action="catch" data-id="${id}" ${game.state.inventory[id] < 1 ? "disabled" : ""}>${itemArt(id)} ${ITEMS[id].name}<span>×${game.state.inventory[id]}</span></button>`).join("")}</div><p class="combat-tip">Lower HP and sleep improve your catch chance.</p>`;
  else if (overlayTab === "switch")
    commands = `<h3>Switch Pokémon · The opponent gets a turn</h3><div class="battle-switch">${party.map((mon, i) => `<button data-action="switch" data-id="${i}" ${i === b.active || mon.hp === 0 ? "disabled" : ""}><img src="${sprite(mon.species)}" alt=""/><span>${SPECIES[mon.species].name}<small>${mon.hp}/${maxHp(mon)} HP ${i === b.active ? "· Active" : ""}</small></span></button>`).join("")}</div>`;
  else if (overlayTab === "items")
    commands = `<h3>Use an item · The opponent gets a turn</h3><div class="battle-items">${(["potion", "super", "revive", "ether"] as ItemId[]).map((id) => `<button data-action="item-target" data-id="${id}" ${game.state.inventory[id] < 1 ? "disabled" : ""}>${itemArt(id)} ${ITEMS[id].name}<span>×${game.state.inventory[id]}</span></button>`).join("")}</div>`;
  else
    commands = `<div class="battle-prompt"><img src="${sprite(p.species)}" alt=""/><div><h3>What will ${ps.name} do?</h3><p>${b.trainer ? "Defeat the opposing team. Switch for a type advantage or use your bag to recover." : "Battle to gain experience, or weaken this Pokémon and choose CATCH to recruit it."}</p></div></div>`;
  const messages = b.log.slice(-3);
  showModal(
    b.trainer
      ? b.trainer.startsWith("rival")
        ? "RIVAL IVY"
        : b.boss !== undefined
          ? `${CHAPTERS[b.boss].keeper.toUpperCase()} · BEACON CHALLENGE`
          : "TRAIL WARDEN"
      : "WILD ENCOUNTER",
    `<div class="battle-field" data-turn="${b.turn}" style="--battle-landscape:url('${thumbs[b.region]}')"><div class="battle-atmosphere"></div><div class="battle-info enemy-info"><div><strong>${es.name}${e.shiny ? " ✦" : ""}</strong><span>Lv.${e.level}</span></div><span class="combat-type" style="color:${COLORS[es.type]}">${es.type.toUpperCase()} ${e.status ? `· ${e.status.toUpperCase()}` : ""}</span>${hpBar(e)}<small>${e.hp} / ${maxHp(e)} HP ${b.trainer ? `· ${b.queue.length + 1} opponent${b.queue.length ? "s" : ""} left` : ""}</small></div><div class="battle-platform enemy-platform"></div><img class="battle-sprite enemy-sprite ${e.hp <= 0 ? "fainted" : ""}" src="${sprite(e.species)}" alt="${es.name}"/><div class="battle-platform player-platform"></div><img class="battle-sprite player-sprite ${p.hp <= 0 ? "fainted" : ""}" src="${asset(`sprites/back-${p.species}.png`)}" alt="${ps.name}"/><div class="battle-info player-info"><div><strong>${ps.name}</strong><span>Lv.${p.level}</span></div><span class="combat-type" style="color:${COLORS[ps.type]}">${ps.type.toUpperCase()} ${p.status ? `· ${p.status.toUpperCase()}` : ""}</span>${hpBar(p)}<small>${p.hp} / ${maxHp(p)} HP</small><div class="xp-track"><i style="width:${(p.xp / xpNeeded(p)) * 100}%"></i></div></div><span class="battle-weather">${REGIONS[b.region].name} · Turn ${b.turn}</span></div><div class="battle-lower"><div class="battle-log" role="log" aria-live="polite">${messages.map((line, i) => `<p class="${i === messages.length - 1 ? "latest" : ""}">${esc(line)}</p>`).join("")}</div><div class="battle-commands">${commands}</div>${!b.ended || battleAnimating ? nav : ""}</div>`,
    true,
    battleAnimating
      ? "ACTION IN PROGRESS"
      : b.ended
        ? "BATTLE COMPLETE"
        : "CHOOSE YOUR NEXT ACTION",
  );
  document.querySelector(".modal")?.classList.add("battle-modal");
  document
    .querySelector(".battle-modal")
    ?.classList.toggle("reduced-motion", game.state.reducedMotion);
  const close = document.querySelector<HTMLButtonElement>(
    '.modal [data-action="close"]',
  );
  if (close) close.disabled = !b.ended || battleAnimating;
}

let audioCtx: AudioContext | undefined,
  musicTimer: ReturnType<typeof setInterval> | undefined,
  note = 0;
function toggleMusic(force?: boolean) {
  game.state.volume = force ?? !game.state.volume;
  if (game.state.volume) {
    audioCtx ??= new AudioContext();
    void audioCtx.resume();
    if (!musicTimer) {
      const play = () => {
        if (!audioCtx || document.hidden) return;
        const melody = [261.63, 329.63, 392, 523.25, 440, 392, 329.63, 293.66];
        const now = audioCtx.currentTime;
        for (const [freq, gain] of [
          [melody[note++ % 8], 0.025],
          [130.81, 0.012],
        ]) {
          const o = audioCtx.createOscillator(),
            g = audioCtx.createGain();
          o.type = "sine";
          o.frequency.value = freq;
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(gain, now + 0.25);
          g.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
          o.connect(g);
          g.connect(audioCtx.destination);
          o.start(now);
          o.stop(now + 2.6);
        }
      };
      play();
      musicTimer = setInterval(play, 1600);
    }
  } else {
    clearInterval(musicTimer);
    musicTimer = undefined;
    void audioCtx?.suspend();
  }

  game.save();
  if (overlay === "settings") renderSettings();
}
document.addEventListener("click", (event) => {
  const el = (event.target as HTMLElement).closest<HTMLElement>(
    "[data-action]",
  );
  if (!el || (el as HTMLButtonElement).disabled || battleAnimating) return;
  const a = el.dataset.action,
    id = el.dataset.id!;
  if (
    game.battle &&
    ![
      "move",
      "catch",
      "switch",
      "flee",
      "battle-tab",
      "battle-back",
      "battle-close",
      "close",
      "item-target",
      "use-item",
    ].includes(a!)
  )
    return;
  switch (a) {
    case "menu":
    case "team":
    case "dex":
    case "journal":
    case "bag":
    case "map":
    case "settings":
    case "help":
      openPanel(a);
      break;
    case "sound":
      toggleMusic();
      break;
    case "close":
      closeModal();
      break;
    case "track":
      trackQuest();
      break;
    case "interact":
      interact();
      break;
    case "region":
      openPanel("map");
      renderMap(Number(id));
      break;
    case "map-select":
      renderMap(Number(id));
      break;
    case "travel": {
      const r = Number(id);
      if (renderer.interior) leaveBuilding();
      closeModal();
      path = [];
      pendingEntity = undefined;
      if (game.state.visited.includes(r)) {
        game.travel(r);
      } else {
        const p = town(r);
        navigateTo(p.x, p.y);
        toast(
          `Following the trail to ${REGIONS[r].name}. Press a movement key to take over.`,
        );
      }
      break;
    }
    case "party-select":
      selectedParty = Number(id);
      renderTeam();
      break;
    case "team-tab":
      overlayTab = id;
      selectedBox = -1;
      renderTeam();
      break;
    case "box-pick":
      selectedBox = Number(id);
      if (game.state.party.length < 6) {
        game.swapStorage(selectedBox, 0);
        selectedBox = -1;
      }
      renderTeam();
      break;
    case "box-swap":
      game.swapStorage(selectedBox, Number(id));
      selectedBox = -1;
      renderTeam();
      break;
    case "lead": {
      const i = Number(id);
      if (i > 0 && game.state.party[i]?.hp > 0) {
        const p = game.state.party.splice(i, 1)[0];
        game.state.party.unshift(p);
        selectedParty = 0;
        game.save();
        renderHud();
        renderTeam();
      }
      break;
    }
    case "journal-tab":
      overlayTab = id;
      renderJournal();
      break;
    case "claim":
      game.claim(id);
      renderJournal();
      break;
    case "brief":
      if (!game.state.starterChosen) starter();
      else {
        game.brief();
        closeModal();
        trackQuest();
      }
      break;
    case "starter":
      game.chooseStarter(Number(id));
      dialogue(
        "Professor Fern",
        `“${SPECIES[Number(id)].name} and Eevee will make a wonderful team. The first beacon is in Whispering Woods, to the east. Catch a local Pokémon and meet the trail wardens. They’ll help you understand what’s happening.”`,
        "track",
        "Our journey begins",
      );
      break;
    case "challenge": {
      const e = entities.find((e) => e.id === id);
      overlay = "";
      clearModal();
      if (e) game.challenge(e);
      break;
    }
    case "rival":
      overlay = "";
      clearModal();
      game.challengeRival();
      break;
    case "boss":
      overlay = "";
      clearModal();
      game.challengeBoss();
      break;
    case "move":
      overlayTab = "";
      void battleAction(() => game.actMove(Number(id)));
      break;
    case "catch":
      void battleAction(() => game.throwBall(id === "great"));
      break;
    case "switch":
      overlayTab = "";
      void battleAction(() => game.switchPokemon(Number(id)));
      break;
    case "flee":
      void battleAction(() => game.flee());
      break;
    case "battle-tab":
      overlayTab = id;
      renderBattle();
      break;
    case "battle-back":
      overlayTab = "";
      renderBattle();
      break;
    case "battle-close": {
      const boss = game.battle?.boss,
        won = game.battle?.rewarded;
      game.closeBattle();
      overlay = "";
      overlayTab = "";
      clearModal();
      if (won && boss !== undefined)
        dialogue(
          `The ${["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "final"][boss]} light`,
          CHAPTERS[boss].reveal,
          "journal",
          "Continue your story",
        );
      else
        (document.querySelector("#world") as HTMLElement)?.focus({
          preventScroll: true,
        });
      break;
    }
    case "item-target":
      itemTarget(id as ItemId);
      break;
    case "use-item": {
      const item = el.dataset.item as ItemId;
      if (game.battle) {
        void battleAction(() => {
          const ok = game.useItem(item, Number(id));
          if (!ok) toast("That companion doesn’t need this item right now.");
        });
        break;
      }
      const ok = game.useItem(item, Number(id));
      if (!ok) toast("That companion doesn’t need this item right now.");
      if (game.battle) {
        overlayTab = "";
        renderBattle();
      } else {
        renderBag();
        if (ok) toast(`${ITEMS[item].name} used.`);
      }
      break;
    }
    case "buy":
      game.buy(id as ItemId);
      renderShop();
      break;
    case "dex-detail": {
      const s = SPECIES[Number(id)],
        caught = game.state.caught.includes(s.id),
        seen = game.state.seen.includes(s.id);
      const regions = REGIONS.filter((r) => r.pool.includes(s.id));
      showModal(
        seen ? s.name : "An undiscovered friend",
        `<div class="dex-detail"><img class="${seen ? "" : "silhouette"}" src="${sprite(s.id)}" alt="${seen ? s.name : "Unknown Pokémon"}"/>${seen ? typeBadge(s.id) : ""}<p>${seen ? s.desc : "There’s still so much to discover. Keep exploring Aurelian’s wild places."}</p><h3>Where to look</h3><p>${regions.length ? regions.map((r) => r.name).join(" · ") : "Evolve a companion to discover this Pokémon."}</p>${s.id === 151 ? "<p>This elusive Pokémon only appears after the final beacon is restored.</p>" : ""}<span class="dex-status">${caught ? "Registered in your Pokédex" : seen ? "Seen, but not yet caught" : "Not yet discovered"}</span><button class="button pale" data-action="dex">Back to Pokédex</button></div>`,
      );
      break;
    }
    case "motion":
      game.state.reducedMotion = !game.state.reducedMotion;
      game.save();
      renderSettings();
      break;
    case "save":
      game.save();
      renderHud();
      toast(
        game.saveError
          ? "Saving failed. Export a backup to keep your progress."
          : "Your adventure is saved.",
      );
      break;
    case "export": {
      game.save();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(game.state, null, 2)], {
          type: "application/json",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `wildbound-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Your adventure backup is ready.");
      break;
    }
    case "reset-confirm":
      showModal(
        "Start a new chapter?",
        `<p class="modal-intro">This replaces the adventure saved on this device. Export a backup in Settings if you’d like to keep it.</p><div class="dialogue-actions"><button class="button pale" data-action="settings">Keep exploring</button><button class="button danger-button" data-action="reset">Start a new adventure</button></div>`,
      );
      break;
    case "reset":
      toggleMusic(false);
      if (renderer.interior) leaveBuilding();
      game.state = newGame();
      path = [];
      pendingEntity = undefined;
      game.save();
      closeModal();
      renderHud();
      toast("Welcome home. Your new adventure is waiting.");
      break;
  }
});
document.addEventListener("input", (e) => {
  const target = e.target as HTMLInputElement;
  if (target.id === "dex-search") {
    dexFilter = target.value;
    const cursor = target.selectionStart;
    renderDex();
    const input = document.querySelector("#dex-search") as HTMLInputElement;
    input.focus();
    input.setSelectionRange(cursor, cursor);
  }
  if (target.id === "trainer-name") {
    game.state.name = target.value.trim().slice(0, 20) || "Alex";
    game.save();
    renderHud();
  }
});
document.addEventListener("change", async (e) => {
  const target = e.target as HTMLInputElement;
  if (target.id === "dex-type") {
    dexType = target.value;
    renderDex();
  }
  if (target.id === "import-save" && target.files?.[0]) {
    try {
      if (target.files[0].size > 2_000_000)
        throw new Error("This save file is too large.");
      const state = parseSave(await target.files[0].text());
      showModal(
        "Continue this adventure?",
        `<p class="modal-intro">Import ${esc(state.name)}’s adventure with ${state.badges.length} beacons and ${state.caught.length} registered Pokémon? This replaces your current local save.</p><div class="dialogue-actions"><button class="button pale" data-action="settings">Cancel</button><button class="button primary" id="confirm-import">Continue this adventure</button></div>`,
      );
      document
        .querySelector("#confirm-import")!
        .addEventListener("click", () => {
          if (renderer.interior) leaveBuilding();
          game.state = state;
          toggleMusic(state.volume);
          path = [];
          pendingEntity = undefined;
          game.save();
          closeModal();
          renderHud();
          toast("Your adventure is ready to continue.");
        });
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "That backup could not be loaded.",
      );
    }
  }
});
const movement: Record<string, number[]> = {
  w: [0, -1],
  ArrowUp: [0, -1],
  s: [0, 1],
  ArrowDown: [0, 1],
  a: [-1, 0],
  ArrowLeft: [-1, 0],
  d: [1, 0],
  ArrowRight: [1, 0],
};
document.addEventListener("keydown", (e) => {
  const target = e.target as HTMLElement;
  if (battleAnimating) {
    e.preventDefault();
    return;
  }
  if (e.key === "Tab" && overlay) {
    const focusable = [
      ...document.querySelectorAll<HTMLElement>(
        ".modal button:not([disabled]),.modal input,.modal select",
      ),
    ];
    const first = focusable[0],
      last = focusable.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
    return;
  }
  if (e.key === "Escape") {
    path = [];
    pendingEntity = undefined;
    renderer.target = null;
    if (game.battle) closeModal();
    else if (
      overlay === "menu" ||
      ["dialogue", "starter", "trainer"].includes(overlay)
    )
      closeModal();
    else openPanel("menu");
    return;
  }
  if (["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) return;
  if (overlay === "menu" && ["ArrowUp", "ArrowDown"].includes(e.key)) {
    e.preventDefault();
    const options = [
      ...document.querySelectorAll<HTMLButtonElement>(".pause-option"),
    ];
    const current = options.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    options[
      (current + (e.key === "ArrowDown" ? 1 : -1) + options.length) %
        options.length
    ]?.focus();
    return;
  }
  if (overlay) return;
  if (e.key === "Enter") {
    e.preventDefault();
    openPanel("menu");
    return;
  }
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (movement[key] || key === " ") {
    e.preventDefault();
  }
  if (movement[key]) {
    path = [];
    roomPath = [];
    roomDestination = undefined;
    pendingEntity = undefined;
    renderer.target = null;
    keys.add(key);
    if (!e.repeat) {
      lastStep = performance.now();
      stepPlayer(...(movement[key] as [number, number]));
      updateLocation();
    }
  }
  if (key === "Shift") keys.add(key);
  if (e.repeat) return;
  if (key === "e" || key === " ") {
    interact();
    return;
  }
  const shortcuts: Record<string, string> = {
    m: "map",
    p: "team",
    b: "bag",
    j: "journal",
    h: "help",
  };
  if (shortcuts[key]) openPanel(shortcuts[key]);
});
document.addEventListener("keyup", (e) =>
  keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key),
);
window.addEventListener("blur", () => keys.clear());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    keys.clear();
    if (!game.battle) game.save();
  }
});
const canvas = document.querySelector("#world") as HTMLCanvasElement;
canvas.addEventListener("click", (e) => {
  if (overlay || game.battle) return;
  canvas.focus({ preventScroll: true });
  const p = renderer.screenToWorld(e.clientX, e.clientY);
  if (renderer.interior) {
    const spot = renderer.interior.spots.find(
      (s) => Math.abs(s.x - p.x) + Math.abs(s.y - p.y) <= 1,
    );
    walkRoomTo(spot?.x ?? p.x, spot?.y ?? p.y, spot);
    return;
  }
  const entity = entities.find(
    (en) =>
      p.x >= en.x && p.x < en.x + en.w && p.y >= en.y - 1 && p.y < en.y + en.h,
  );
  if (entity) approach(entity);
  else navigateTo(p.x, p.y);
});
for (const button of document.querySelectorAll<HTMLElement>("[data-dir]")) {
  const [dx, dy] = button.dataset.dir!.split(",").map(Number);
  const key = dx < 0 ? "a" : dx > 0 ? "d" : dy < 0 ? "w" : "s";
  button.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    path = [];
    pendingEntity = undefined;
    roomPath = [];
    roomDestination = undefined;
    keys.add(key);
    if (!overlay && !game.battle) {
      lastStep = performance.now();
      stepPlayer(dx, dy);
      updateLocation();
    }
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    button.addEventListener(event, () => keys.delete(key));
}
renderer.onFrame = () => {
  if (overlay || game.battle || document.hidden) return;
  const now = performance.now();
  if (now - lastStep < (keys.has("Shift") ? 65 : 125)) return;
  const dir = [...keys].find((k) => movement[k]);
  if (renderer.interior) {
    const room = renderer.interior;
    if (dir) {
      lastStep = now;
      stepPlayer(...(movement[dir] as [number, number]));
    } else if (roomPath.length) {
      lastStep = now;
      const next = roomPath.shift()!;
      stepPlayer(next.x - room.x, next.y - room.y);
      if (!roomPath.length && roomDestination && renderer.interior) {
        const spot = roomDestination;
        roomDestination = undefined;
        inspectRoom(spot);
      }
    }
    updateLocation();
    return;
  }
  refreshGuide();
  if (dir) {
    lastStep = now;
    stepPlayer(...(movement[dir] as [number, number]));
    updateLocation();
  } else if (path.length) {
    lastStep = now;
    const p = path.shift()!;
    if (Math.abs(p.x - game.state.x) + Math.abs(p.y - game.state.y) !== 1) {
      path = [];
      pendingEntity = undefined;
    } else if (!game.step(p.x - game.state.x, p.y - game.state.y)) {
      path = [];
      pendingEntity = undefined;
    }
    updateLocation();
    if (!path.length && !game.battle) {
      renderer.target = null;
      const entity = pendingEntity;
      pendingEntity = undefined;
      if (entity) interact(entity);
    }
  }
  if (lastRegion !== game.region) {
    lastRegion = game.region;
    renderHud();
  }
};
game.on(() => {
  if (battleAnimating) return;
  renderHud();
  if (game.notice) {
    toast(game.notice);
    game.notice = "";
  }
  if (game.battle) {
    if (overlay !== "battle") {
      clearTimeout(noticeTimer);
      document.querySelector("#toast")!.classList.remove("visible");
    }
    path = [];
    pendingEntity = undefined;
    renderer.target = null;
    overlay = "battle";
    renderBattle();
  }
});
setInterval(() => {
  if (!game.battle) {
    game.save();
    renderHud();
  }
}, 15000);
window.addEventListener("pagehide", () => {
  if (!game.battle) game.save();
});
renderHud();
if (saveLoadError)
  toast(
    "Your existing save could not be read. It has been kept as a backup. A fresh adventure is ready.",
  );
if (saveLoadError) {
  try {
    const raw = localStorage.getItem("wildbound-save-v1");
    if (raw) localStorage.setItem("wildbound-save-recovery", raw);
  } catch {}
}
if (game.state.volume) {
  game.state.volume = false;
}
