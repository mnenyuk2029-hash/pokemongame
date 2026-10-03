import test from "node:test";
import assert from "node:assert/strict";
import {
  Game,
  newGame,
  makePokemon,
  maxHp,
  damage,
  effectiveness,
  catchChance,
  parseSave,
  xpNeeded,
} from "../src/engine";
import { SPECIES, MOVES, CHAPTERS, REGIONS } from "../src/data";
import { entities, town, pathTo, walkable, WIDTH, HEIGHT } from "../src/world";
const rng = () => 0.25;
function fresh() {
  return new Game(newGame(), rng);
}
test("every species, evolution and encounter references complete content", () => {
  assert.equal(Object.keys(SPECIES).length, 87);
  for (const s of Object.values(SPECIES)) {
    s.moves.forEach((m) => assert.ok(MOVES[m]));
    if (s.evolve) assert.ok(SPECIES[s.evolve[1]]);
  }
  for (const r of REGIONS) for (const id of r.pool) assert.ok(SPECIES[id]);
});
test("damage respects STAB, strengths, resistances and immunities", () => {
  const fire = makePokemon(4, 15, rng),
    grass = makePokemon(1, 15, rng),
    water = makePokemon(7, 15, rng),
    ghost = makePokemon(92, 15, rng);
  assert.equal(effectiveness(MOVES.ember, grass), 2);
  assert.equal(effectiveness(MOVES.ember, water), 0.5);
  assert.ok(
    damage(fire, grass, MOVES.ember, rng) >
      damage(fire, water, MOVES.ember, rng),
  );
  assert.equal(damage(fire, ghost, MOVES.tackle, rng), 0);
  assert.equal(effectiveness(MOVES.spark, makePokemon(27, 10, rng)), 0);
});
test("starter is a one-time choice and registers with the Pokédex", () => {
  const g = fresh();
  g.chooseStarter(4);
  g.chooseStarter(7);
  assert.equal(g.state.party.length, 2);
  assert.equal(g.state.party[1].species, 4);
  assert.ok(g.state.caught.includes(4));
  assert.ok(g.state.briefed);
});
test("catch rate rewards low HP, better balls and status conditions", () => {
  const p = makePokemon(25, 10, rng),
    full = catchChance(p);
  p.hp = 1;
  assert.ok(catchChance(p) > full);
  assert.ok(catchChance(p, true) > catchChance(p));
  const base = catchChance(p);
  p.status = "sleep";
  assert.ok(catchChance(p) > base);
});
test("catch consumes a ball, records the region, and handles a full party", () => {
  const g = fresh();
  g.state.party = Array.from({ length: 6 }, () => makePokemon(133, 10, rng));
  g.startBattle([makePokemon(25, 7, rng)]);
  g.battle!.enemy.hp = 1;
  g.random = () => 0;
  g.throwBall();
  assert.equal(g.state.inventory.ball, 11);
  assert.equal(g.state.box.length, 1);
  assert.equal(g.state.catches[0], 1);
  assert.equal(g.battle!.result, "A new friendship");
  g.throwBall();
  assert.equal(g.state.inventory.ball, 11);
  assert.equal(g.state.box.length, 1);
});
test("trainer Pokémon cannot be caught and cannot be escaped from", () => {
  const g = fresh();
  g.startBattle([makePokemon(25, 5, rng)], "trainer");
  g.throwBall();
  g.flee();
  assert.equal(g.state.inventory.ball, 12);
  assert.equal(g.battle!.ended, false);
});
test("winning trainer battles grants money, XP and a unique completion", () => {
  const g = fresh();
  g.state.party = [makePokemon(6, 40, rng), makePokemon(1, 5, rng)];
  const id = "1-trainer-12-13";
  g.startBattle([makePokemon(10, 5, rng)], id);
  g.actMove(0);
  assert.ok(g.battle!.ended);
  assert.ok(g.state.money > 1200);
  assert.equal(g.state.wins, 1);
  assert.deepEqual(g.state.defeated, [id]);
  assert.ok(g.state.party[1].xp > 0 || g.state.party[1].level > 5);
  g.closeBattle();
  g.startBattle([makePokemon(10, 5, rng)], id);
  g.actMove(0);
  assert.deepEqual(g.state.defeated, [id]);
});
test("boss prerequisites require a briefing, local catch, and two unique wardens", () => {
  const g = fresh();
  g.chooseStarter(1);
  assert.equal(g.bossReady, false);
  g.state.catches[1] = 1;
  g.state.defeated = ["1-trainer-a", "1-trainer-b"];
  assert.ok(g.bossReady);
  g.challengeBoss();
  assert.equal(g.battle!.boss, 0);
  assert.equal(g.battle!.queue.length, 1);
});
test("complete all eight chapters and reward each beacon exactly once", () => {
  const g = fresh();
  g.chooseStarter(4);
  g.state.party = [makePokemon(149, 100, rng)];
  for (let i = 0; i < 8; i++) {
    g.state.briefed = true;
    g.state.catches[i + 1] = 1;
    g.state.defeated.push(`${i + 1}-trainer-a`, `${i + 1}-trainer-b`);
    assert.ok(g.bossReady);
    g.challengeBoss();
    let turns = 0;
    while (!g.battle!.ended && turns++ < 100) {
      g.battle!.enemy.hp = 1;
      const p = g.state.party[g.battle!.active];
      const move = p.moves.findIndex(
        (m, j) =>
          p.pp[j] > 0 &&
          MOVES[m].power > 0 &&
          effectiveness(MOVES[m], g.battle!.enemy) > 0,
      );
      g.actMove(Math.max(0, move));
    }
    assert.ok(g.battle!.rewarded);
    assert.equal(g.state.chapter, i + 1);
    const money = g.state.money;
    g.actMove(0);
    assert.equal(g.state.money, money);
    g.closeBattle();
  }
  assert.deepEqual(g.state.badges, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(g.chapter, undefined);
  assert.equal(g.state.inventory.great, 40);
  assert.equal(g.state.log.length, 10);
});
test("evolution registers evolved species and preserves usable moves", () => {
  const g = fresh(),
    p = makePokemon(10, 6, rng);
  g.state.party = [p];
  g.gainXp(p, xpNeeded(p));
  assert.equal(p.species, 11);
  g.gainXp(p, 10000);
  assert.equal(p.species, 12);
  assert.ok(g.state.caught.includes(12));
  assert.ok(p.hp > 0 && p.hp <= maxHp(p));
  assert.equal(p.moves.length, p.pp.length);
});
test("fainting replaces the active Pokémon and complete defeat recovers safely", () => {
  const g = fresh();
  g.chooseStarter(1);
  g.state.party.forEach((p) => (p.hp = 1));
  g.startBattle([makePokemon(6, 50, rng)]);
  g.actMove(0);
  assert.equal(g.battle!.active, 1);
  g.actMove(0);
  assert.equal(g.battle!.ended, true);
  assert.equal(g.battle!.result, "A moment to rest");
  g.closeBattle();
  assert.ok(g.state.party.every((p) => p.hp === maxHp(p)));
  assert.ok(walkable(g.state.x, g.state.y));
});
test("potions, revives and ether consume only when useful; rest restores PP and status", () => {
  const g = fresh(),
    p = g.state.party[0];
  assert.equal(g.useItem("potion", 0), false);
  assert.equal(g.state.inventory.potion, 5);
  p.hp = 0;
  assert.equal(g.useItem("potion", 0), false);
  assert.ok(g.useItem("revive", 0));
  assert.equal(p.hp, Math.ceil(maxHp(p) / 2));
  p.pp[0] = 0;
  p.status = "poison";
  g.heal();
  assert.equal(p.hp, maxHp(p));
  assert.equal(p.pp[0], MOVES[p.moves[0]].pp);
  assert.equal(p.status, undefined);
});
test("empty PP permits a fallback attack without negative PP", () => {
  const g = fresh();
  g.startBattle([makePokemon(19, 3, rng)]);
  g.state.party[0].pp.fill(0);
  const hp = g.battle!.enemy.hp;
  g.actMove(0);
  assert.ok(g.battle!.enemy.hp < hp);
  assert.ok(g.state.party[0].pp.every((n) => n === 0));
});
test("shop guards balance and quantities", () => {
  const g = fresh();
  g.buy("great", 2);
  assert.equal(g.state.money, 300);
  assert.equal(g.state.inventory.great, 2);
  g.buy("great");
  g.buy("ball", -1);
  assert.equal(g.state.money, 300);
  assert.equal(g.state.inventory.great, 2);
});
test("chests and research cannot be claimed twice", () => {
  const g = fresh(),
    e = entities.find((e) => e.kind === "chest")!;
  g.openChest(e);
  const money = g.state.money;
  g.openChest(e);
  assert.equal(g.state.money, money);
  g.state.steps = 2000;
  g.claim("walker");
  assert.equal(g.state.money, money + 1200);
  g.claim("walker");
  assert.equal(g.state.money, money + 1200);
});
test("travel only uses visited regions and is disabled in battle", () => {
  const g = fresh();
  g.travel(3);
  assert.equal(g.region, 0);
  g.state.visited.push(3);
  g.travel(3);
  assert.equal(g.region, 3);
  g.startWild();
  g.travel(0);
  assert.equal(g.region, 3);
});
test("round-trip save retains progression and rejects corrupt content", () => {
  const g = fresh();
  g.chooseStarter(7);
  const parsed = parseSave(JSON.stringify(g.state));
  assert.deepEqual(parsed, g.state);
  for (const mutate of [
    (s: any) => (s.party[0].species = 999),
    (s: any) => (s.inventory.ball = -10),
    (s: any) => (s.chapter = 10),
    (s: any) => (s.x = -50),
    (s: any) => (s.party[0].pp = [500]),
    (s: any) => (s.caught = [999]),
  ]) {
    const s = structuredClone(g.state);
    mutate(s);
    assert.throws(() => parseSave(JSON.stringify(s)));
  }
});
test("every town and interactable is reachable from the starting town", () => {
  const start = town(0),
    seen = new Set<string>([`${start.x},${start.y}`]),
    queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = p.x + dx,
        y = p.y + dy,
        k = `${x},${y}`;
      if (
        x >= 0 &&
        x < WIDTH &&
        y >= 0 &&
        y < HEIGHT &&
        !seen.has(k) &&
        walkable(x, y)
      ) {
        seen.add(k);
        queue.push({ x, y });
      }
    }
  }
  for (let r = 0; r < 9; r++) {
    const p = town(r);
    assert.ok(seen.has(`${p.x},${p.y}`), `Town ${r} unreachable`);
  }
  for (const e of entities) {
    let accessible = false;
    for (let x = e.x - 1; x <= e.x + e.w; x++)
      for (let y = e.y - 1; y <= e.y + e.h; y++)
        if (seen.has(`${x},${y}`)) accessible = true;
    assert.ok(accessible, `${e.name} (${e.id}) unreachable`);
  }
  assert.ok(pathTo(start.x, start.y, town(8).x, town(8).y).length > 0);
});

test("all 87 Pokémon are obtainable without a particular starter choice", () => {
  const reachable = new Set(REGIONS.flatMap((r) => r.pool));
  let previous = 0;
  while (previous !== reachable.size) {
    previous = reachable.size;
    for (const id of reachable) {
      const evolution = SPECIES[id].evolve;
      if (evolution) reachable.add(evolution[1]);
    }
  }
  assert.deepEqual(
    Object.values(SPECIES)
      .filter((s) => !reachable.has(s.id))
      .map((s) => s.name),
    [],
  );
});

test("imported save rejects markup in status and invalid preference fields", () => {
  for (const mutate of [
    (s: any) => (s.party[0].status = "<img src=x onerror=alert(1)>"),
    (s: any) => (s.volume = "yes"),
    (s: any) => (s.facing = 9),
    (s: any) => (s.party[0].sleepTurns = -3),
  ]) {
    const s = newGame();
    mutate(s);
    assert.throws(() => parseSave(JSON.stringify(s)));
  }
  assert.throws(() => parseSave("null"), /not a valid/);
});

test("an enemy Protect reduces the next attack and then wears off", () => {
  const g = fresh();
  const enemy = makePokemon(133, 10, rng);
  enemy.moves = ["guard"];
  enemy.pp = [10];
  g.startBattle([enemy]);
  const p = g.state.party[0];
  const normal = damage(p, enemy, MOVES.tackle, rng);
  const before = enemy.hp;
  g.actMove(0);
  assert.equal(before - enemy.hp, Math.ceil(normal * 0.25));
  assert.equal(g.battle!.enemyGuard, false);
});

test("Ivy waits for the starter and her rival team grows with the story", () => {
  const g = fresh();
  g.challengeRival();
  assert.equal(g.battle, null);
  g.chooseStarter(4);
  g.challengeRival();
  assert.equal(g.battle!.enemy.species, 7);
  assert.equal(g.battle!.queue.length, 1);
  assert.equal(g.battle!.trainer, "rival-0");
  g.battle = null;
  g.state.chapter = 8;
  g.challengeRival();
  assert.equal(g.battle!.enemy.species, 9);
  assert.equal(g.battle!.queue.length, 2);
  assert.equal(g.battle!.enemy.level, 48);
});

test("storage swaps preserve companions and retain a healthy traveling Pokémon", () => {
  const g = fresh();
  g.state.party = Array.from({ length: 6 }, () => makePokemon(133, 10, rng));
  g.state.party.slice(1).forEach((p) => (p.hp = 0));
  const stored = makePokemon(25, 10, rng);
  stored.hp = 0;
  g.state.box = [stored];
  const original = g.state.party[0];
  g.swapStorage(0, 0);
  assert.equal(g.state.party[0], original);
  stored.hp = maxHp(stored);
  g.swapStorage(0, 0);
  assert.equal(g.state.party[0], stored);
  assert.equal(g.state.box[0], original);
  assert.equal(
    new Set([...g.state.party, ...g.state.box].map((p) => p.uid)).size,
    7,
  );
});

test("a full storage box refuses a catch before consuming supplies or corrupting a save", () => {
  const g = fresh();
  g.state.party = Array.from({ length: 6 }, () => makePokemon(133, 10, rng));
  g.state.box = Array.from({ length: 1000 }, () => makePokemon(25, 10, rng));
  g.startBattle([makePokemon(10, 3, rng)]);
  g.random = () => 0;
  g.throwBall();
  assert.equal(g.state.inventory.ball, 12);
  assert.equal(g.state.box.length, 1000);
  assert.equal(g.battle!.ended, false);
  assert.doesNotThrow(() => parseSave(JSON.stringify(g.state)));
});
