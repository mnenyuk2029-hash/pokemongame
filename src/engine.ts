import {
  SPECIES,
  MOVES,
  ADVANTAGES,
  RESISTANCES,
  IMMUNITIES,
  REGIONS,
  CHAPTERS,
  SIDE_QUESTS,
  ITEMS,
  type ItemId,
  type Move,
} from "./data";
import { town, regionAt, tileAt, walkable, type Entity } from "./world";
export type Pokemon = {
  uid: string;
  species: number;
  level: number;
  xp: number;
  hp: number;
  moves: string[];
  pp: number[];
  shiny: boolean;
  status?: "poison" | "sleep";
  sleepTurns?: number;
};
export type State = {
  version: 1;
  name: string;
  x: number;
  y: number;
  facing: number;
  party: Pokemon[];
  box: Pokemon[];
  inventory: Record<ItemId, number>;
  money: number;
  chapter: number;
  briefed: boolean;
  catches: number[];
  defeated: string[];
  badges: number[];
  visited: number[];
  chests: string[];
  claimed: string[];
  seen: number[];
  caught: number[];
  steps: number;
  wins: number;
  started: number;
  played: number;
  starterChosen: boolean;
  volume: boolean;
  reducedMotion: boolean;
  log: string[];
};
export type Battle = {
  enemy: Pokemon;
  queue: Pokemon[];
  trainer?: string;
  boss?: number;
  active: number;
  log: string[];
  turn: number;
  ended: boolean;
  result?: string;
  guard: boolean;
  enemyGuard: boolean;
  region: number;
  rewarded: boolean;
};
export const maxHp = (p: Pokemon) =>
  Math.floor((SPECIES[p.species].hp * 2 * p.level) / 100) + p.level + 15;
export const stat = (p: Pokemon, k: "atk" | "def" | "speed") =>
  Math.floor((SPECIES[p.species][k] * 2 * p.level) / 100) + 7;
export const xpNeeded = (p: Pokemon) => 30 + p.level * 17;
let uid = 0;
export function makePokemon(
  species: number,
  level: number,
  random = Math.random,
): Pokemon {
  const s = SPECIES[species];
  const count = Math.min(s.moves.length, level < 7 ? 2 : level < 15 ? 3 : 4);
  let moves = s.moves.slice(0, count);
  if (level >= 25) moves = s.moves.slice(-4);
  const p: Pokemon = {
    uid: `${Date.now().toString(36)}-${++uid}-${Math.floor(random() * 1e7)}`,
    species,
    level,
    xp: 0,
    hp: 1,
    moves,
    pp: moves.map((m) => MOVES[m].pp),
    shiny: random() < 1 / 512,
  };
  p.hp = maxHp(p);
  return p;
}
export function newGame(): State {
  return {
    version: 1,
    name: "Alex",
    x: 28,
    y: 26,
    facing: 0,
    party: [makePokemon(133, 5)],
    box: [],
    inventory: { ball: 12, great: 0, potion: 5, super: 0, revive: 1, ether: 2 },
    money: 1200,
    chapter: 0,
    briefed: false,
    catches: Array(9).fill(0),
    defeated: [],
    badges: [],
    visited: [0],
    chests: [],
    claimed: [],
    seen: [133],
    caught: [133],
    steps: 0,
    wins: 0,
    started: Date.now(),
    played: 0,
    starterChosen: false,
    volume: false,
    reducedMotion: false,
    log: ["You arrived in Verdant Hollow with Eevee. A new chapter begins."],
  };
}
export function effectiveness(move: Move, defender: Pokemon) {
  const type = SPECIES[defender.species].type;
  return IMMUNITIES[move.type]?.includes(type)
    ? 0
    : ADVANTAGES[move.type]?.includes(type)
      ? 2
      : RESISTANCES[move.type]?.includes(type)
        ? 0.5
        : 1;
}
export function damage(
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  random = Math.random,
) {
  let multi = effectiveness(move, defender);
  return multi === 0
    ? 0
    : Math.max(
        1,
        Math.floor(
          ((((2 * attacker.level) / 5 + 2) *
            move.power *
            stat(attacker, "atk")) /
            stat(defender, "def") /
            50 +
            2) *
            (SPECIES[attacker.species].type === move.type ? 1.5 : 1) *
            multi *
            (0.85 + random() * 0.15),
        ),
      );
}
export function catchChance(p: Pokemon, great = false) {
  return Math.min(
    0.94,
    ((3 * maxHp(p) - 2 * p.hp) / (3 * maxHp(p))) *
      (0.95 - SPECIES[p.species].rarity * 0.12) *
      (great ? 1.8 : 1) *
      (p.status ? 1.4 : 1),
  );
}
function validPokemon(v: unknown): v is Pokemon {
  if (!v || typeof v !== "object") return false;
  const p = v as Pokemon;
  return (
    (p.status === undefined || p.status === "poison" || p.status === "sleep") &&
    (p.sleepTurns === undefined ||
      (Number.isInteger(p.sleepTurns) &&
        p.sleepTurns >= 0 &&
        p.sleepTurns <= 2)) &&
    typeof p.shiny === "boolean" &&
    typeof p.uid === "string" &&
    !!SPECIES[p.species] &&
    Number.isInteger(p.level) &&
    p.level >= 1 &&
    p.level <= 100 &&
    Number.isFinite(p.hp) &&
    p.hp >= 0 &&
    p.hp <= maxHp(p) &&
    Number.isFinite(p.xp) &&
    p.xp >= 0 &&
    Array.isArray(p.moves) &&
    p.moves.length >= 1 &&
    p.moves.length <= 4 &&
    p.moves.every((m) => !!MOVES[m]) &&
    Array.isArray(p.pp) &&
    p.pp.length === p.moves.length &&
    p.pp.every(
      (n, i) => Number.isInteger(n) && n >= 0 && n <= MOVES[p.moves[i]].pp,
    )
  );
}
export function parseSave(raw: string): State {
  const s = JSON.parse(raw) as State;
  if (
    !s ||
    typeof s !== "object" ||
    s.version !== 1 ||
    !Array.isArray(s.party) ||
    s.party.length < 1 ||
    s.party.length > 6 ||
    !s.party.every(validPokemon) ||
    !Array.isArray(s.box) ||
    s.box.length > 1000 ||
    !s.box.every(validPokemon) ||
    !Number.isInteger(s.x) ||
    !Number.isInteger(s.y) ||
    !walkable(s.x, s.y) ||
    !Number.isInteger(s.chapter) ||
    s.chapter < 0 ||
    s.chapter > 8 ||
    typeof s.name !== "string" ||
    s.name.length > 30
  )
    throw new Error("This is not a valid Wildbound save.");
  for (const k of [
    "briefed",
    "starterChosen",
    "volume",
    "reducedMotion",
  ] as const)
    if (typeof s[k] !== "boolean") throw new Error("Invalid preferences.");
  if (!Number.isInteger(s.facing) || s.facing < 0 || s.facing > 3)
    throw new Error("Invalid position.");
  for (const k of ["defeated", "chests", "claimed", "log"] as const)
    if (!Array.isArray(s[k]) || !s[k].every((v) => typeof v === "string"))
      throw new Error("Incomplete save data.");
  for (const k of ["badges", "visited", "seen", "caught", "catches"] as const)
    if (
      !Array.isArray(s[k]) ||
      !s[k].every((v) => Number.isInteger(v) && v >= 0)
    )
      throw new Error("Incomplete exploration data.");
  if (
    s.catches.length !== 9 ||
    s.visited.some((r) => r > 8) ||
    s.badges.some((r) => r < 1 || r > 8) ||
    s.caught.some((id) => !SPECIES[id]) ||
    s.seen.some((id) => !SPECIES[id])
  )
    throw new Error("Invalid exploration data.");
  for (const k of ["money", "steps", "wins", "played", "started"] as const)
    if (!Number.isFinite(s[k]) || s[k] < 0)
      throw new Error("Invalid progress data.");
  for (const k of Object.keys(ITEMS) as ItemId[])
    if (!s.inventory || !Number.isInteger(s.inventory[k]) || s.inventory[k] < 0)
      throw new Error("Invalid bag data.");
  return s;
}
export class Game {
  state: State;
  battle: Battle | null = null;
  listeners = new Set<() => void>();
  notice = "";
  random: () => number;
  lastSave = Date.now();
  saveError = false;
  constructor(s = newGame(), random = Math.random) {
    this.state = s;
    this.random = random;
  }
  on(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit() {
    this.listeners.forEach((fn) => fn());
  }
  tell(message: string) {
    this.notice = message;
    this.emit();
  }
  addLog(message: string) {
    this.state.log.unshift(message);
    this.state.log = this.state.log.slice(0, 60);
  }
  save() {
    if (typeof localStorage === "undefined") return;
    try {
      this.state.played += Math.max(
        0,
        Math.min(60, (Date.now() - this.lastSave) / 1000),
      );
      this.lastSave = Date.now();
      localStorage.setItem("wildbound-save-v1", JSON.stringify(this.state));
      this.saveError = false;
    } catch {
      this.saveError = true;
    }
  }
  get region() {
    return regionAt(this.state.x, this.state.y);
  }
  get chapter() {
    return CHAPTERS[this.state.chapter];
  }
  get chapterWins() {
    return this.state.defeated.filter((id) =>
      id.startsWith(`${this.chapter?.region}-trainer`),
    ).length;
  }
  get bossReady() {
    return (
      !!this.chapter &&
      this.state.briefed &&
      this.state.catches[this.chapter.region] > 0 &&
      this.chapterWins >= 2
    );
  }
  step(dx: number, dy: number) {
    if (this.battle || !walkable(this.state.x + dx, this.state.y + dy))
      return false;
    this.state.x += dx;
    this.state.y += dy;
    this.state.facing = dy > 0 ? 0 : dx < 0 ? 1 : dx > 0 ? 2 : 3;
    this.state.steps++;
    if (!this.state.visited.includes(this.region)) {
      this.state.visited.push(this.region);
      this.tell(`Discovered ${REGIONS[this.region].name}`);
      this.addLog(`First footsteps in ${REGIONS[this.region].name}.`);
    }
    if (this.state.steps % 12 === 0) this.save();
    if (
      tileAt(this.state.x, this.state.y) === "tall" &&
      this.state.steps > 8 &&
      this.random() < 0.12
    ) {
      this.startWild();
    }
    return true;
  }
  chooseStarter(id: number) {
    if (this.state.starterChosen || ![1, 4, 7].includes(id)) return;
    this.state.party.push(makePokemon(id, 5, this.random));
    this.state.starterChosen = true;
    this.state.briefed = true;
    this.register(id);
    this.addLog(`Professor Fern entrusted you with ${SPECIES[id].name}.`);
    this.save();
    this.emit();
  }
  register(id: number) {
    if (!this.state.seen.includes(id)) this.state.seen.push(id);
    if (!this.state.caught.includes(id)) this.state.caught.push(id);
  }
  heal() {
    for (const p of this.state.party) {
      p.hp = maxHp(p);
      p.status = undefined;
      p.pp = p.moves.map((m) => MOVES[m].pp);
    }
    this.save();
    this.tell("Your whole team is rested and ready. All HP and PP restored.");
  }
  startWild(forced?: number) {
    if (this.battle) return;
    const r = REGIONS[this.region];
    const weighted = r.pool.flatMap((id) =>
      Array(Math.max(1, 6 - SPECIES[id].rarity)).fill(id),
    );
    let id = forced ?? weighted[Math.floor(this.random() * weighted.length)];
    if (id === 151 && this.state.chapter < 8) id = 147;
    const lv = Math.max(2, r.level + Math.floor(this.random() * 5) - 2);
    this.startBattle([makePokemon(id, lv, this.random)]);
  }
  startBattle(team: Pokemon[], trainer?: string, boss?: number) {
    if (this.battle) return;
    let active = this.state.party.findIndex((p) => p.hp > 0);
    if (active < 0) {
      this.heal();
      active = 0;
    }
    this.battle = {
      enemy: team[0],
      queue: team.slice(1),
      trainer,
      boss,
      active,
      log: [
        trainer
          ? `${trainer.startsWith("boss") ? CHAPTERS[boss!].keeper : trainer.startsWith("rival") ? "Ivy" : "A fellow trainer"} challenges you!`
          : `A wild ${SPECIES[team[0].species].name} appeared!`,
      ],
      turn: 0,
      ended: false,
      guard: false,
      enemyGuard: false,
      region: this.region,
      rewarded: false,
    };
    if (!this.state.seen.includes(team[0].species))
      this.state.seen.push(team[0].species);
    this.emit();
  }
  challenge(e: Entity) {
    if (this.battle) return;
    if (!this.state.starterChosen) {
      this.tell(
        "Meet Professor Fern by the lab before your first trainer battle.",
      );
      return;
    }
    const r = REGIONS[e.region];
    const repeat = this.state.defeated.includes(e.id);
    const lv = repeat
      ? Math.max(r.level + 2, Math.min(55, this.state.party[0].level))
      : r.level + e.variant + 1;
    this.startBattle(
      [
        makePokemon(r.pool[(e.variant * 2) % r.pool.length], lv, this.random),
        makePokemon(
          r.pool[(e.variant * 2 + 1) % r.pool.length],
          lv,
          this.random,
        ),
      ],
      e.id,
    );
  }
  challengeRival() {
    if (this.battle) return;
    if (!this.state.starterChosen) {
      this.tell("Ivy is waiting for you to meet Professor Fern first.");
      return;
    }
    const level = Math.max(
      6,
      REGIONS[Math.min(8, this.state.chapter)].level + 2,
    );
    const starter = this.state.caught.includes(4)
      ? 7
      : this.state.caught.includes(7)
        ? 1
        : 4;
    const evolved = (id: number) => {
      while (SPECIES[id].evolve && level >= SPECIES[id].evolve![0])
        id = SPECIES[id].evolve![1];
      return makePokemon(id, level, this.random);
    };
    this.startBattle(
      [
        evolved(starter),
        evolved(133),
        ...(this.state.chapter >= 2 ? [evolved(25)] : []),
      ],
      `rival-${this.state.chapter}`,
    );
  }
  challengeBoss() {
    if (!this.bossReady) return;
    const c = this.chapter!;
    const lv = REGIONS[c.region].level + 3;
    this.startBattle(
      [
        makePokemon(REGIONS[c.region].pool[2], lv - 1, this.random),
        makePokemon(c.boss, lv, this.random),
        ...(this.state.chapter >= 4
          ? [makePokemon(c.boss, lv + 1, this.random)]
          : []),
      ],
      `boss-${this.state.chapter}`,
      this.state.chapter,
    );
  }
  attack(p: Pokemon, target: Pokemon, key: string, guard = false) {
    const b = this.battle!;
    const m = MOVES[key];
    if (p.status === "sleep") {
      p.sleepTurns = (p.sleepTurns ?? 2) - 1;
      if (p.sleepTurns > 0) {
        b.log.push(`${SPECIES[p.species].name} is fast asleep.`);
        return;
      }
      p.status = undefined;
      b.log.push(`${SPECIES[p.species].name} woke up!`);
    }
    const idx = p.moves.indexOf(key);
    if (idx >= 0) p.pp[idx] = Math.max(0, p.pp[idx] - 1);
    b.log.push(`${SPECIES[p.species].name} used ${m.name}!`);
    if (this.random() * 100 > m.accuracy) {
      b.log.push("The move missed.");
      return;
    }
    if (m.kind === "heal") {
      const amount = Math.min(maxHp(p) - p.hp, Math.ceil(maxHp(p) * 0.5));
      p.hp += amount;
      b.log.push(`Recovered ${amount} HP.`);
      return;
    }
    if (m.kind === "guard") {
      if (p === this.state.party[b.active]) b.guard = true;
      else b.enemyGuard = true;
      b.log.push("Braced for the next attack.");
      return;
    }
    if (m.kind === "sleep") {
      target.status = "sleep";
      target.sleepTurns = 2;
      b.log.push(`${SPECIES[target.species].name} fell asleep.`);
      return;
    }
    let hit = damage(p, target, m, this.random);
    if (guard) hit = Math.ceil(hit * 0.25);
    target.hp = Math.max(0, target.hp - hit);
    b.log.push(
      `${hit} damage.${effectiveness(m, target) > 1 ? " It’s super effective!" : effectiveness(m, target) === 0 ? " It has no effect." : effectiveness(m, target) < 1 ? " It’s not very effective." : ""}`,
    );
    if (
      m.kind === "poison" &&
      target.hp > 0 &&
      this.random() < 0.25 &&
      SPECIES[target.species].type !== "Poison"
    )
      target.status = "poison";
  }
  actMove(index: number) {
    const b = this.battle;
    if (!b || b.ended) return;
    const p = this.state.party[b.active];
    if (p.hp <= 0) return;
    const struggle = p.pp.every((n) => n === 0);
    if (!struggle && (!p.moves[index] || p.pp[index] <= 0)) return;
    const key = struggle ? "tackle" : p.moves[index];
    b.turn++;
    b.guard = false;
    const enemyFirst =
      key !== "quick" &&
      stat(b.enemy, "speed") > stat(p, "speed") &&
      MOVES[key].kind !== "guard";
    if (enemyFirst) {
      this.enemyAttack();
      if (p.hp <= 0) {
        this.checkFaint();
        this.emit();
        return;
      }
    }
    this.attack(p, b.enemy, key, b.enemyGuard);
    b.enemyGuard = false;
    if (b.enemy.hp <= 0) {
      this.winEnemy();
      this.emit();
      return;
    }
    if (!enemyFirst) this.enemyAttack();
    this.endTurn();
  }
  enemyAttack() {
    const b = this.battle!,
      p = this.state.party[b.active];
    const available = b.enemy.moves.filter((_, i) => b.enemy.pp[i] > 0);
    const key = available.length
      ? available[Math.floor(this.random() * available.length)]
      : "tackle";
    this.attack(b.enemy, p, key, b.guard);
  }
  endTurn() {
    const b = this.battle!;
    for (const p of [this.state.party[b.active], b.enemy]) {
      if (p.status === "poison" && p.hp > 0) {
        const hit = Math.max(1, Math.floor(maxHp(p) / 10));
        p.hp = Math.max(0, p.hp - hit);
        b.log.push(`${SPECIES[p.species].name} lost ${hit} HP to poison.`);
      }
    }
    this.checkFaint();
    if (!b.ended && b.enemy.hp <= 0) this.winEnemy();
    this.emit();
  }
  checkFaint() {
    const b = this.battle!;
    if (this.state.party[b.active].hp > 0) return;
    const next = this.state.party.findIndex((p) => p.hp > 0);
    if (next >= 0) {
      b.log.push(
        `${SPECIES[this.state.party[b.active].species].name} fainted. Go, ${SPECIES[this.state.party[next].species].name}!`,
      );
      b.active = next;
    } else {
      b.ended = true;
      b.result = "A moment to rest";
      b.log.push(
        "Your team is exhausted. A ranger will bring you back to the nearest rest house.",
      );
      this.state.money = Math.max(0, this.state.money - 100);
    }
  }
  winEnemy() {
    const b = this.battle!;
    const enemy = b.enemy;
    b.log.push(`${SPECIES[enemy.species].name} fainted!`);
    const xp = Math.floor((25 + enemy.level * 8) * (b.trainer ? 1.5 : 1));
    for (let i = 0; i < this.state.party.length; i++) {
      const p = this.state.party[i];
      if (p.hp > 0)
        this.gainXp(p, Math.floor(xp * (i === b.active ? 1 : 0.65)));
    }
    if (b.queue.length) {
      b.enemy = b.queue.shift()!;
      if (!this.state.seen.includes(b.enemy.species))
        this.state.seen.push(b.enemy.species);
      b.log.push(`Next up: ${SPECIES[b.enemy.species].name}!`);
    } else {
      b.ended = true;
      b.result = "A well-earned victory";
      this.state.wins++;
      const money = b.trainer ? enemy.level * 45 : enemy.level * 8;
      this.state.money += money;
      b.log.push(
        `Earned ₽${money} and ${xp} XP. Your whole team shared the experience.`,
      );
      if (
        b.trainer &&
        !b.trainer.startsWith("boss") &&
        !this.state.defeated.includes(b.trainer)
      )
        this.state.defeated.push(b.trainer);
      if (b.boss !== undefined && !b.rewarded) {
        b.rewarded = true;
        this.state.badges.push(b.boss + 1);
        this.state.chapter++;
        this.state.briefed = false;
        this.state.inventory.great += 5;
        this.state.inventory.super += 4;
        this.state.money += 1000;
        this.addLog(CHAPTERS[b.boss].reveal);
        b.log.push(
          "Beacon restored! Received 5 Great Balls, 4 Super Potions, and ₽1,000.",
        );
      }
      this.save();
    }
  }
  gainXp(p: Pokemon, amount: number) {
    p.xp += amount;
    while (p.xp >= xpNeeded(p) && p.level < 100) {
      p.xp -= xpNeeded(p);
      const oldHp = maxHp(p);
      p.level++;
      p.hp += maxHp(p) - oldHp;
      this.battle?.log.push(
        `${SPECIES[p.species].name} grew to level ${p.level}!`,
      );
      const evo = SPECIES[p.species].evolve;
      if (evo && p.level >= evo[0]) {
        const oldName = SPECIES[p.species].name;
        p.species = evo[1];
        p.hp = maxHp(p);
        this.register(p.species);
        this.battle?.log.push(
          `${oldName} evolved into ${SPECIES[p.species].name}!`,
        );
        this.addLog(`${oldName} evolved into ${SPECIES[p.species].name}.`);
      }
      const s = SPECIES[p.species];
      const count = Math.min(
        s.moves.length,
        p.level < 7 ? 2 : p.level < 15 ? 3 : 4,
      );
      const next = p.level >= 25 ? s.moves.slice(-4) : s.moves.slice(0, count);
      if (next.join() !== p.moves.join()) {
        p.moves = next;
        p.pp = next.map((m) => MOVES[m].pp);
        this.battle?.log.push(`${s.name} learned new moves!`);
      }
    }
  }
  throwBall(great = false) {
    const b = this.battle;
    if (!b || b.ended || b.trainer) return;
    if (this.state.party.length >= 6 && this.state.box.length >= 1000) {
      this.tell(
        "Your Pokémon storage is full. You can still battle or return to the trail.",
      );
      return;
    }
    const item = great ? "great" : "ball";
    if (this.state.inventory[item] < 1) {
      this.tell("You’re out of that type of ball. Visit a market to stock up.");
      return;
    }
    this.state.inventory[item]--;
    if (this.random() < catchChance(b.enemy, great)) {
      const p = { ...b.enemy, moves: [...b.enemy.moves], pp: [...b.enemy.pp] };
      this.register(p.species);
      this.state.catches[b.region]++;
      if (this.state.party.length < 6) this.state.party.push(p);
      else this.state.box.push(p);
      b.ended = true;
      b.result = "A new friendship";
      b.log.push(
        `Gotcha! ${SPECIES[p.species].name} was caught${this.state.party.length === 6 && this.state.box.includes(p) ? " and sent to storage" : ""}!`,
      );
      this.addLog(
        `Caught ${SPECIES[p.species].name} in ${REGIONS[b.region].name}.`,
      );
      this.save();
    } else {
      b.log.push("Oh no! It broke free. Lower its HP or try a Great Ball.");
      this.enemyAttack();
      this.endTurn();
    }
    this.emit();
  }
  flee() {
    const b = this.battle;
    if (!b || b.ended || b.trainer) return;
    if (this.random() < 0.8) {
      b.ended = true;
      b.result = "Back to the trail";
      b.log.push("Got away safely.");
    } else {
      b.log.push("Couldn’t get away!");
      this.enemyAttack();
      this.endTurn();
    }
    this.emit();
  }
  switchPokemon(index: number) {
    const b = this.battle;
    if (
      !b ||
      b.ended ||
      index === b.active ||
      !this.state.party[index] ||
      this.state.party[index].hp <= 0
    )
      return;
    b.active = index;
    b.log.push(`Go, ${SPECIES[this.state.party[index].species].name}!`);
    this.enemyAttack();
    this.endTurn();
  }
  closeBattle() {
    if (!this.battle?.ended) return;
    const lost = this.state.party.every((p) => p.hp <= 0);
    const boss = this.battle.boss;
    const won = this.battle.rewarded;
    this.battle = null;
    if (lost) {
      Object.assign(this.state, town(this.region));
      this.heal();
    }
    if (won && boss !== undefined) {
      this.heal();
      this.tell(CHAPTERS[boss].reveal);
    }
    this.save();
    this.emit();
  }
  useItem(item: ItemId, index: number) {
    const p = this.state.party[index];
    if (
      !p ||
      this.state.inventory[item] < 1 ||
      ["ball", "great"].includes(item) ||
      this.battle?.ended
    )
      return false;
    const hp = maxHp(p);
    if (item === "revive") {
      if (p.hp > 0) return false;
      p.hp = Math.ceil(hp / 2);
      p.status = undefined;
    } else if (item === "ether") {
      if (p.pp.every((v, i) => v === MOVES[p.moves[i]].pp)) return false;
      p.pp = p.moves.map((m) => MOVES[m].pp);
    } else {
      if (p.hp === 0 || p.hp === hp) return false;
      p.hp = Math.min(hp, p.hp + (item === "super" ? 80 : 30));
    }
    this.state.inventory[item]--;
    if (this.battle) {
      this.battle.log.push(
        `Used ${ITEMS[item].name} on ${SPECIES[p.species].name}.`,
      );
      this.enemyAttack();
      this.endTurn();
    } else this.save();
    this.emit();
    return true;
  }
  buy(item: ItemId, qty = 1) {
    const price = ITEMS[item].price * qty;
    if (!Number.isInteger(qty) || qty < 1 || this.state.money < price) {
      this.tell("You need a few more Pokédollars for that.");
      return;
    }
    this.state.money -= price;
    this.state.inventory[item] += qty;
    this.save();
    this.tell(
      `Added ${qty} ${ITEMS[item].name}${qty > 1 ? "s" : ""} to your bag.`,
    );
  }
  openChest(e: Entity) {
    if (this.state.chests.includes(e.id)) {
      this.tell("You’ve already collected these supplies.");
      return;
    }
    this.state.chests.push(e.id);
    this.state.money += 150 + e.region * 80;
    this.state.inventory.ball += 3;
    this.state.inventory.potion += 2;
    this.save();
    this.tell(
      `A lucky find! +₽${150 + e.region * 80}, 3 Poké Balls, and 2 Potions.`,
    );
  }
  travel(region: number) {
    if (this.battle || !this.state.visited.includes(region)) return;
    Object.assign(this.state, town(region));
    this.save();
    this.tell(`Welcome back to ${REGIONS[region].name}.`);
  }
  brief() {
    if (!this.state.starterChosen) return;
    this.state.briefed = true;
    this.save();
    this.emit();
  }
  progress(kind: string) {
    return kind === "caught"
      ? this.state.caught.length
      : kind === "steps"
        ? this.state.steps
        : kind === "visited"
          ? this.state.visited.length
          : kind === "chests"
            ? this.state.chests.length
            : kind === "trainers"
              ? this.state.defeated.length
              : this.state.wins;
  }
  claim(id: string) {
    const q = SIDE_QUESTS.find((q) => q.id === id);
    if (
      !q ||
      this.state.claimed.includes(id) ||
      this.progress(q.kind) < q.target
    )
      return;
    this.state.claimed.push(id);
    this.state.money += q.reward;
    this.save();
    this.tell(`Research complete! You received ₽${q.reward.toLocaleString()}.`);
  }
  swapStorage(boxIndex: number, partyIndex: number) {
    if (this.battle || !this.state.box[boxIndex]) return;
    if (this.state.party.length < 6) {
      this.state.party.push(this.state.box.splice(boxIndex, 1)[0]);
    } else if (this.state.party[partyIndex]) {
      if (
        this.state.party.filter((p) => p.hp > 0).length === 1 &&
        this.state.party[partyIndex].hp > 0 &&
        this.state.box[boxIndex].hp === 0
      ) {
        this.tell("Keep at least one healthy Pokémon in your party.");
        return;
      }
      [this.state.party[partyIndex], this.state.box[boxIndex]] = [
        this.state.box[boxIndex],
        this.state.party[partyIndex],
      ];
    }
    this.save();
    this.emit();
  }
}
