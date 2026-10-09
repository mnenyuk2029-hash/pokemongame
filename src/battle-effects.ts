import { maxHp, type BattleCue, type BattleFrame } from "./engine";
import { asset } from "./assets";
const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
export async function playBattleCue(
  cue: BattleCue,
  before: BattleFrame,
  reduced: boolean,
) {
  const field = document.querySelector<HTMLElement>(".battle-field");
  if (!field) return;
  if (reduced) {
    await wait(750);
    return;
  }
  const player = field.querySelector<HTMLElement>(".player-sprite")!,
    enemy = field.querySelector<HTMLElement>(".enemy-sprite")!;
  const attacker = cue.side === "player" ? player : enemy;
  const target = cue.side === "player" ? enemy : player;
  const oldPlayer = before.party[before.battle.active],
    newPlayer = cue.party[cue.battle.active];
  const changes = [
    { side: "player", old: oldPlayer, current: newPlayer },
    { side: "enemy", old: before.battle.enemy, current: cue.battle.enemy },
  ];
  for (const change of changes) {
    const bar = field.querySelector<HTMLElement>(
      `.${change.side}-info .hp-track i`,
    );
    if (bar && change.old.uid === change.current.uid) {
      bar.style.width = `${(change.old.hp / maxHp(change.old)) * 100}%`;
      bar.style.transition = "none";
    }
  }
  const rect = field.getBoundingClientRect();
  const center = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - rect.left,
      y: r.top + r.height / 2 - rect.top,
    };
  };
  const from = center(attacker),
    to = center(target);
  const animations: Animation[] = [];
  const animate = (
    el: HTMLElement,
    frames: Keyframe[],
    duration: number,
    delay = 0,
  ) => {
    if (reduced) return;
    const animation = el.animate(frames, {
      duration,
      delay,
      easing: "ease-in-out",
      fill: "both",
    });
    animations.push(animation);
  };
  const fx = document.createElement("div");
  fx.className = "battle-effects";
  fx.setAttribute("aria-hidden", "true");
  field.append(fx);
  const particle = (x: number, y: number, color: string, size = 12) => {
    const el = document.createElement("i");
    el.className = "move-particle";
    el.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${color};box-shadow:0 0 12px ${color};`;
    fx.append(el);
    return el;
  };
  if (cue.kind === "attack" || cue.kind === "sleep") {
    animate(
      attacker,
      [
        { transform: "translate(0,0)" },
        { transform: `translate(${cue.side === "player" ? 26 : -26}px,-8px)` },
        { transform: "translate(0,0)" },
      ],
      450,
    );
    for (let i = 0; i < 9; i++) {
      const spark = particle(from.x, from.y, cue.color, i % 2 ? 9 : 15);
      animate(
        spark,
        [
          { transform: "translate(0,0) scale(.2)", opacity: 0 },
          { opacity: 1, offset: 0.12 },
          {
            transform: `translate(${to.x - from.x + ((i % 3) - 1) * 16}px,${to.y - from.y + ((i % 4) - 2) * 12}px) rotate(160deg)`,
            opacity: 1,
          },
          {
            transform: `translate(${to.x - from.x}px,${to.y - from.y}px) scale(2)`,
            opacity: 0,
          },
        ],
        520,
        i * 25,
      );
    }
    const hit =
      cue.side === "player"
        ? before.battle.enemy.hp - cue.battle.enemy.hp
        : oldPlayer.hp - newPlayer.hp;
    if (hit > 0)
      animate(
        target,
        [
          { filter: "brightness(1)", transform: "translateX(0)" },
          { filter: "brightness(4)", transform: "translateX(10px)" },
          { filter: "brightness(1)", transform: "translateX(-8px)" },
          { transform: "translateX(6px)" },
          { transform: "translateX(0)" },
        ],
        380,
        430,
      );
  } else if (cue.kind === "catch") {
    const ball = document.createElement("img");
    ball.src = asset("ui/poke-ball.png");
    ball.className = "thrown-ball";
    ball.style.left = `${center(player).x}px`;
    ball.style.top = `${center(player).y}px`;
    fx.append(ball);
    const goal = center(enemy),
      start = center(player);
    animate(
      ball,
      [
        { transform: "translate(0,0) rotate(0)" },
        {
          transform: `translate(${(goal.x - start.x) * 0.5}px,${goal.y - start.y - 80}px) rotate(360deg)`,
        },
        {
          transform: `translate(${goal.x - start.x}px,${goal.y - start.y + 40}px) rotate(720deg)`,
        },
        {
          transform: `translate(${goal.x - start.x}px,${goal.y - start.y + 40}px) rotate(690deg)`,
        },
        {
          transform: `translate(${goal.x - start.x}px,${goal.y - start.y + 40}px) rotate(750deg)`,
        },
        {
          transform: `translate(${goal.x - start.x}px,${goal.y - start.y + 40}px) rotate(720deg)`,
        },
      ],
      1200,
    );
    animate(
      enemy,
      [
        { opacity: 1, transform: "scale(1)" },
        { opacity: 0, transform: "scale(.1)", offset: 0.45 },
        {
          opacity: cue.battle.ended ? 0 : 1,
          transform: cue.battle.ended ? "scale(.1)" : "scale(1)",
        },
      ],
      1300,
    );
  } else if (cue.kind === "switch") {
    animate(
      player,
      [
        { opacity: 0, transform: "scale(.2)" },
        { opacity: 1, transform: "scale(1.15)" },
        { transform: "scale(1)" },
      ],
      600,
    );
  } else if (cue.kind === "run") {
    animate(
      player,
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-60px)", opacity: 0.2 },
      ],
      600,
    );
  } else {
    const focal = center(attacker);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6,
        el = particle(focal.x, focal.y, cue.color, 8);
      animate(
        el,
        [
          {
            transform: `translate(${Math.cos(a) * 55}px,${Math.sin(a) * 55}px)`,
            opacity: 0,
          },
          { opacity: 1, offset: 0.3 },
          {
            transform: `translate(${Math.cos(a) * 15}px,${Math.sin(a) * 15 - 25}px)`,
            opacity: 0,
          },
        ],
        800,
        i * 15,
      );
    }
  }
  await wait(reduced ? 50 : 420);
  for (const change of changes) {
    const bar = field.querySelector<HTMLElement>(
      `.${change.side}-info .hp-track i`,
    );
    if (bar) {
      bar.style.transition = reduced ? "none" : "width 650ms ease";
      bar.style.width = `${(change.current.hp / maxHp(change.current)) * 100}%`;
    }
    const delta =
      change.current.uid === change.old.uid
        ? change.current.hp - change.old.hp
        : 0;
    if (delta) {
      const el = document.createElement("span"),
        p = center(change.side === "player" ? player : enemy);
      el.className = `damage-number ${delta > 0 ? "healing" : ""}`;
      el.textContent = `${delta > 0 ? "+" : "−"}${Math.abs(delta)} HP`;
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y - 30}px`;
      fx.append(el);
      animate(
        el,
        [
          { transform: "translate(-50%,0)", opacity: 1 },
          { transform: "translate(-50%,-45px)", opacity: 0 },
        ],
        800,
      );
    }
  }
  await wait(reduced ? 700 : cue.kind === "catch" ? 1100 : 850);
  animations.forEach((a) => a.cancel());
  fx.remove();
}
