import type { Interior } from "./interiors";
import type { Guide } from "./navigation";
import { Game } from "./engine";
import { REGIONS, sprite } from "./data";
import {
  TILE,
  RW,
  RH,
  WIDTH,
  HEIGHT,
  tileAt,
  entities,
  noise,
  regionAt,
  type Entity,
} from "./world";
const palettes: Record<string, string[]> = {
  meadow: [
    "#8bb966",
    "#91bd6d",
    "#a2c77b",
    "#467d4b",
    "#306b49",
    "#205942",
    "#d5ca91",
    "#b9b981",
    "#75bec2",
  ],
  forest: [
    "#7ca360",
    "#83ab64",
    "#94b775",
    "#427c51",
    "#286148",
    "#205240",
    "#c6c38e",
    "#a8ae77",
    "#67aead",
  ],
  coast: [
    "#b9c680",
    "#bfca8d",
    "#cbd097",
    "#63976d",
    "#437d5b",
    "#32694e",
    "#e6d6a4",
    "#ccbb8e",
    "#66bfc6",
  ],
  desert: [
    "#c4ac77",
    "#cbb780",
    "#d3bf88",
    "#8b9870",
    "#72865e",
    "#59754f",
    "#e4c496",
    "#c7a673",
    "#72b4b4",
  ],
  autumn: [
    "#b6b371",
    "#c0b776",
    "#c9c082",
    "#cca352",
    "#b17c40",
    "#8c633b",
    "#deca91",
    "#bca572",
    "#86b6ad",
  ],
  marsh: [
    "#899a83",
    "#92a78d",
    "#a2b395",
    "#7c8e88",
    "#5f7b7c",
    "#436266",
    "#b6b89b",
    "#939b85",
    "#899fb9",
  ],
  snow: [
    "#d1e3dc",
    "#d9e8e0",
    "#e8eee3",
    "#abc8bd",
    "#78a79d",
    "#53877f",
    "#c4cfc3",
    "#a6bdb5",
    "#87bfce",
  ],
  storm: [
    "#92af92",
    "#9bb89a",
    "#aec4a2",
    "#698e76",
    "#477361",
    "#365e53",
    "#c8c6a0",
    "#a3af91",
    "#7bb4b8",
  ],
  summit: [
    "#b2bf8d",
    "#bfc99b",
    "#cdd4ae",
    "#8b9d6d",
    "#6c875c",
    "#526d50",
    "#e0d8ae",
    "#bfb88e",
    "#97bdb8",
  ],
};
export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  game: Game;
  images = new Map<number, HTMLImageElement>();
  camera = { x: 28 * TILE, y: 22 * TILE };
  player = { x: 28 * TILE, y: 26 * TILE };
  width = 1056;
  height = 624;
  time = 0;
  raf = 0;
  interior: Interior | null = null;
  guide: Guide | undefined;
  walking = false;
  stride = 0;
  roomTransform = { x: 0, y: 0, scale: 1 };
  target: { x: number; y: number } | null = null;
  onFrame?: () => void;
  constructor(canvas: HTMLCanvasElement, game: Game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.game = game;
    this.player = { x: game.state.x * TILE, y: game.state.y * TILE };
    this.camera = { x: this.player.x, y: this.player.y - 3 * TILE };
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width < 600 ? 384 : 768;
    this.height = Math.max(
      320,
      (this.width * rect.height) / Math.max(1, rect.width),
    );
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx.imageSmoothingEnabled = false;
  }
  image(id: number) {
    if (!this.images.has(id)) {
      const img = new Image();
      img.src = sprite(id);
      this.images.set(id, img);
    }
    return this.images.get(id)!;
  }
  screenToWorld(clientX: number, clientY: number) {
    const r = this.canvas.getBoundingClientRect();
    if (this.interior)
      return {
        x: Math.floor(
          (((clientX - r.left) / r.width) * this.width - this.roomTransform.x) /
            this.roomTransform.scale /
            TILE,
        ),
        y: Math.floor(
          (((clientY - r.top) / r.height) * this.height -
            this.roomTransform.y) /
            this.roomTransform.scale /
            TILE,
        ),
      };
    return {
      x: Math.floor(
        (((clientX - r.left) / r.width) * this.width +
          this.camera.x -
          this.width / 2) /
          TILE,
      ),
      y: Math.floor(
        (((clientY - r.top) / r.height) * this.height +
          this.camera.y -
          this.height / 2) /
          TILE,
      ),
    };
  }
  loop(t: number) {
    this.time = t;
    this.onFrame?.();
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  }
  rect(x: number, y: number, w: number, h: number, c: string) {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
  }
  poly(points: number[][], c: string) {
    this.ctx.fillStyle = c;
    this.ctx.beginPath();
    points.forEach(([x, y], i) =>
      i ? this.ctx.lineTo(x, y) : this.ctx.moveTo(x, y),
    );
    this.ctx.closePath();
    this.ctx.fill();
  }
  draw() {
    if (this.interior) {
      this.drawInterior();
      return;
    }
    this.walking =
      Math.abs(this.player.x - this.game.state.x * TILE) +
        Math.abs(this.player.y - this.game.state.y * TILE) >
      0.5;
    this.stride =
      this.walking && !this.game.state.reducedMotion
        ? Math.floor(this.time / 90) % 4
        : 0;
    const s = this.game.state,
      motion = s.reducedMotion ? 1 : 0.18;
    this.player.x += (s.x * TILE - this.player.x) * motion;
    this.player.y += (s.y * TILE - this.player.y) * motion;
    const clamp = (value: number, half: number, extent: number) =>
      Math.max(half, Math.min(extent - half, value));
    const cx = clamp(this.player.x + 12, this.width / 2, WIDTH * TILE),
      cy = clamp(this.player.y - 60, this.height / 2, HEIGHT * TILE);
    if (
      Math.abs(cx - this.camera.x) > 1200 ||
      Math.abs(cy - this.camera.y) > 1200
    ) {
      this.camera.x = cx;
      this.camera.y = cy;
    }
    this.camera.x = clamp(
      this.camera.x + (cx - this.camera.x) * (s.reducedMotion ? 1 : 0.07),
      this.width / 2,
      WIDTH * TILE,
    );
    this.camera.y = clamp(
      this.camera.y + (cy - this.camera.y) * (s.reducedMotion ? 1 : 0.07),
      this.height / 2,
      HEIGHT * TILE,
    );
    const ox = Math.floor(this.camera.x - this.width / 2),
      oy = Math.floor(this.camera.y - this.height / 2);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.rect(0, 0, this.width, this.height, "#497654");
    this.ctx.translate(-ox, -oy);
    const x0 = Math.max(0, Math.floor(ox / TILE) - 3),
      y0 = Math.max(0, Math.floor(oy / TILE) - 4),
      x1 = Math.min(WIDTH, Math.ceil((ox + this.width) / TILE) + 3),
      y1 = Math.min(HEIGHT, Math.ceil((oy + this.height) / TILE) + 4);
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) this.ground(x, y);
    for (const e of entities)
      if (
        e.x >= x0 - 8 &&
        e.x <= x1 &&
        e.y >= y0 - 8 &&
        e.y <= y1 &&
        ["house", "lab", "center", "shop"].includes(e.kind)
      )
        this.building(e);
    // Small garden details give the village its lived-in feel.
    for (let r = 0; r < 9; r++) {
      const bx = (r % 3) * RW * TILE,
        by = Math.floor(r / 3) * RH * TILE;
      if (
        bx + 56 * TILE < ox ||
        bx > ox + this.width ||
        by + 44 * TILE < oy ||
        by > oy + this.height
      )
        continue;
      this.fence(bx + 17 * TILE, by + 28 * TILE, 6);
      this.fence(bx + 32 * TILE, by + 14 * TILE, 6);
      this.fence(bx + 15 * TILE, by + 15 * TILE, 5);
      for (let i = 0; i < 6; i++) {
        this.flower(bx + (33 + i * 0.55) * TILE, by + 15 * TILE, "#efcb69");
        this.flower(bx + (17 + i * 0.6) * TILE, by + 27 * TILE, "#df9d95");
      }
      // picnic table and benches
      this.rect(bx + 33 * TILE, by + 25 * TILE, 45, 7, "#698153");
      this.rect(bx + 33 * TILE + 3, by + 25 * TILE - 8, 40, 10, "#b89361");
      this.rect(bx + 33 * TILE + 7, by + 25 * TILE + 3, 4, 9, "#80694b");
      this.rect(bx + 33 * TILE + 33, by + 25 * TILE + 3, 4, 9, "#80694b");
      this.rect(bx + 33 * TILE - 1, by + 25 * TILE + 10, 48, 5, "#af8b59");
      // lantern posts
      for (const [lx, ly] of [
        [26, 20],
        [30, 20],
        [26, 28],
        [30, 28],
      ]) {
        this.rect(bx + lx * TILE, by + ly * TILE - 22, 3, 28, "#5d6e50");
        this.rect(bx + lx * TILE - 4, by + ly * TILE - 28, 11, 10, "#667354");
        this.rect(bx + lx * TILE - 2, by + ly * TILE - 26, 7, 6, "#f3dc91");
        this.rect(bx + lx * TILE - 5, by + ly * TILE - 30, 13, 3, "#485b48");
      }
    }
    this.drawGuide();
    const props: { y: number; draw: () => void }[] = [];
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++)
        if (tileAt(x, y) === "tree")
          props.push({
            y: y * TILE + 20,
            draw: () =>
              this.tree(
                x * TILE,
                y * TILE,
                palettes[REGIONS[regionAt(x, y)].biome],
                noise(x, y),
              ),
          });
    for (const e of entities)
      if (
        e.x >= x0 - 8 &&
        e.x <= x1 &&
        e.y >= y0 - 8 &&
        e.y <= y1 &&
        !["house", "lab", "center", "shop"].includes(e.kind)
      )
        props.push({ y: (e.y + e.h) * TILE, draw: () => this.prop(e) });
    const region = this.game.region,
      bx = (region % 3) * RW,
      by = Math.floor(region / 3) * RH;
    for (const [i, id] of REGIONS[region].pool.slice(0, 5).entries()) {
      const x = (bx + [24, 31, 15, 34, 26][i]) * TILE,
        y = (by + [25, 30, 23, 14, 32][i]) * TILE;
      props.push({
        y: y + 15,
        draw: () => {
          const img = this.image(id);
          const bob = s.reducedMotion
            ? 0
            : Math.round(Math.sin(this.time / 600 + i) * 2);
          this.shadow(x + 5, y + 17, 23, 6);
          if (img.complete && img.naturalWidth)
            this.ctx.drawImage(img, x - 12, y - 25 + bob, 56, 56);
        },
      });
    }
    props.push({
      y: this.player.y + 22,
      draw: () => {
        this.person(this.player.x, this.player.y, s.facing, true);
        const img = this.image(s.party[0].species);
        const dx = s.facing === 1 ? 26 : -23;
        this.shadow(this.player.x + dx, this.player.y + 28, 20, 5);
        if (img.complete && img.naturalWidth)
          this.ctx.drawImage(
            img,
            this.player.x + dx - 11,
            this.player.y -
              11 +
              (this.walking && !s.reducedMotion
                ? Math.sin(this.time / 100) * 3
                : 0),
            46,
            46,
          );
      },
    });
    props.sort((a, b) => a.y - b.y).forEach((p) => p.draw());
    if (this.target) {
      const x = this.target.x * TILE,
        y = this.target.y * TILE;
      this.ctx.strokeStyle = "#fff3b2";
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x + 3, y + 3, 18, 18);
    }
    // Falling petals and soft sun rays.
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!s.reducedMotion) {
      for (let i = 0; i < 14; i++) {
        const x =
            (noise(i, 6) * this.width +
              this.time * 0.008 * (i % 2 ? 1 : -1) +
              this.width * 4) %
            this.width,
          y = (noise(i, 5) * this.height + this.time * 0.012) % this.height;
        this.rect(x, y, i % 3 === 0 ? 4 : 2, 2, "#f7eac0aa");
      }
    }
    const grad = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    grad.addColorStop(0, "#fff6ca18");
    grad.addColorStop(0.5, "#fff6ca00");
    grad.addColorStop(1, "#174b3b16");
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
  drawGuide() {
    const route = this.guide?.route;
    if (!route) return;
    for (let i = 0; i < route.length; i++) {
      const p = route[i],
        x = p.x * TILE + 12,
        y = p.y * TILE + 13;
      if (
        Math.abs(x - this.camera.x) > this.width / 2 + 24 ||
        Math.abs(y - this.camera.y) > this.height / 2 + 24
      )
        continue;
      const pulse = this.game.state.reducedMotion
        ? 1
        : 0.65 + Math.sin(this.time / 240 - i * 0.6) * 0.25;
      this.ctx.globalAlpha = pulse;
      this.shadow(x - 5, y - 3, 10, 6);
      this.rect(x - 3, y - 2, 6, 4, "#fff7a1");
      this.rect(x - 1, y - 3, 2, 6, "#ffffff");
    }
    this.ctx.globalAlpha = 1;
    const p = this.guide!.destination,
      x = p.x * TILE + 12,
      y = p.y * TILE;
    const lift = this.game.state.reducedMotion
      ? 0
      : Math.sin(this.time / 220) * 3;
    this.poly(
      [
        [x - 7, y - 11 + lift],
        [x + 7, y - 11 + lift],
        [x, y - 4 + lift],
      ],
      "#ffdf61",
    );
  }
  drawInterior() {
    const room = this.interior!,
      c = this.ctx;
    this.player.x += (room.x * TILE - this.player.x) * 0.25;
    this.player.y += (room.y * TILE - this.player.y) * 0.25;
    this.walking =
      Math.abs(this.player.x - room.x * TILE) +
        Math.abs(this.player.y - room.y * TILE) >
      0.6;
    this.stride =
      this.walking && !this.game.state.reducedMotion
        ? Math.floor(this.time / 105) % 4
        : 0;
    c.setTransform(1, 0, 0, 1, 0, 0);
    this.rect(0, 0, this.width, this.height, "#172b35");
    const scale =
      this.width < 500
        ? 1.2
        : Math.min(this.width / 500, (this.height - 130) / 360);
    const ox =
        this.width < 500
          ? Math.min(
              12,
              Math.max(
                this.width - 432 * scale - 12,
                this.width / 2 - (this.player.x + 12) * scale,
              ),
            )
          : (this.width - 432 * scale) / 2,
      oy = 65 + (this.height - 130 - 336 * scale) / 2;
    this.roomTransform = { x: ox, y: oy, scale };
    c.translate(ox, oy);
    c.scale(scale, scale);
    this.shadow(-10, 10, 452, 332);
    const blue = room.entity.kind === "shop",
      clinic = room.entity.kind === "center";
    this.rect(0, 0, 432, 336, "#443a3e");
    this.rect(5, 5, 422, 75, clinic ? "#e9c6bc" : blue ? "#b0cdda" : "#d5c39d");
    this.rect(5, 72, 422, 10, "#857661");
    this.rect(5, 82, 422, 5, "#504b49");
    for (let y = 4; y < 14; y++)
      for (let x = 0; x < 18; x++) {
        this.rect(
          x * 24 + 2,
          y * 24 - 9,
          23,
          23,
          clinic
            ? (x + y) % 2
              ? "#dbe3de"
              : "#eef1dc"
            : (x + y) % 2
              ? "#b88d63"
              : "#caa074",
        );
        this.rect(
          x * 24 + 2,
          y * 24 + 10,
          23,
          2,
          clinic ? "#baccc6" : "#a67f59",
        );
        if (!clinic) this.rect(x * 24 + 6, y * 24 - 4, 12, 1, "#dbb789");
      }
    this.rect(
      166,
      203,
      105,
      91,
      blue ? "#4b91a1" : clinic ? "#c97676" : "#5f8c83",
    );
    this.rect(171, 208, 95, 81, "#edcb8580");
    this.rect(
      177,
      214,
      83,
      69,
      blue ? "#4b91a1" : clinic ? "#c97676" : "#5f8c83",
    );
    for (const wx of [46, 328]) {
      this.rect(wx - 4, 18, 52, 43, "#85755e");
      this.rect(wx, 22, 44, 34, "#9ad1d4");
      this.rect(wx + 4, 25, 34, 4, "#eff7dd");
      this.rect(wx + 20, 22, 4, 34, "#f6e8bb");
      this.rect(wx, 38, 44, 3, "#f6e8bb");
      this.poly(
        [
          [wx, 58],
          [wx + 44, 58],
          [wx + 80, 140],
          [wx + 20, 140],
        ],
        "#fff3b51a",
      );
    }
    // framed regional map, skirting and open doorway
    this.rect(184, 18, 66, 45, "#6e5d4c");
    this.rect(189, 23, 56, 35, "#c9dca4");
    for (let i = 0; i < 7; i++)
      this.rect(
        193 + i * 7,
        30 + (i % 3) * 7,
        8,
        8,
        ["#80a371", "#7ebac2", "#e2c98a"][i % 3],
      );
    this.rect(204, 303, 48, 33, "#172b35");
    this.rect(207, 303, 42, 6, "#f2d68d");
    this.poly(
      [
        [218, 317],
        [238, 317],
        [228, 327],
      ],
      "#f0d182",
    );
    for (const f of room.furniture) {
      const x = f.x * 24,
        y = f.y * 24,
        w = f.w * 24,
        h = f.h * 24;
      this.shadow(x + 2, y + h - 7, w, 10);
      if (f.kind === "plant") {
        this.rect(x + 4, y + 6, 17, 17, "#b57450");
        for (let i = 0; i < 4; i++)
          this.poly(
            [
              [x + 12, y + 9],
              [x - 4 + i * 8, y - 18 - (i % 2) * 6],
              [x + 20, y - 6],
            ],
            i % 2 ? "#69a663" : "#387659",
          );
      } else if (f.kind === "bed") {
        this.rect(x, y - 7, w, h + 5, "#776754");
        this.rect(x + 3, y - 3, w - 6, 19, "#f8efda");
        this.rect(x + 3, y + 17, w - 6, h - 24, clinic ? "#8bb4c5" : "#a77eae");
        this.rect(x + 3, y + 19, w - 6, 5, "#e7dac8");
      } else if (f.kind === "shelf") {
        this.rect(x, y - 25, w, h + 21, "#6d5645");
        for (let row = 0; row < 2; row++)
          for (let i = 0; i < Math.floor(w / 8); i++) {
            this.rect(
              x + 3 + i * 8,
              y - 20 + row * 19,
              5,
              14,
              ["#d89566", "#83b59a", "#88a5c6", "#d9c784"][i % 4],
            );
          }
        this.rect(x, y - 3, w, 4, "#bf9a6f");
      } else if (f.kind === "terminal") {
        this.rect(x, y - 17, w, h + 14, "#526876");
        this.rect(x + 4, y - 13, w - 8, 20, "#82dad1");
        this.rect(x + 6, y - 9, w - 12, 3, "#d6ffdd");
        this.rect(x + 5, y + 11, w - 10, 4, "#263d51");
      } else if (f.kind === "stove") {
        this.rect(x, y - 20, w, h + 15, "#806454");
        this.rect(x + 8, y - 8, w - 16, 21, "#343844");
        this.poly(
          [
            [x + 13, y + 11],
            [x + 18, y - 5],
            [x + 24, y + 4],
            [x + 29, y - 9],
            [x + 35, y + 11],
          ],
          "#f6b869",
        );
      } else {
        this.rect(
          x,
          y - 10,
          w,
          h + 5,
          f.kind === "sofa" ? "#57868b" : "#8f694d",
        );
        this.rect(
          x + 3,
          y - 10,
          w - 6,
          h - 5,
          f.kind === "sofa" ? "#7eb1a6" : "#dfb783",
        );
        this.rect(x + 5, y + h - 8, w - 10, 4, "#634f45");
        if (f.kind === "table") {
          this.rect(x + 9, y - 6, 21, 16, "#f6ebc5");
          this.rect(x + 12, y - 3, 15, 2, "#9e8e71");
          this.rect(x + w - 20, y - 6, 9, 9, "#b45d5b");
        }
      }
    }
    if (["center", "shop", "lab"].includes(room.entity.kind))
      this.person(
        9 * TILE,
        3 * TILE,
        0,
        false,
        room.entity.kind === "center" ? 3 : 4,
      );
    else this.person(3 * TILE, 7 * TILE, 2, false, room.entity.variant);
    for (const spot of room.spots.filter((s) => s.action !== "exit")) {
      this.rect(spot.x * TILE + 8, spot.y * TILE + 14, 8, 3, "#fff2a08c");
    }
    this.person(this.player.x, this.player.y, room.facing, true);
    const buddy = this.image(this.game.state.party[0].species);
    if (buddy.complete && buddy.naturalWidth)
      c.drawImage(buddy, this.player.x - 26, this.player.y - 4, 36, 36);
    c.setTransform(1, 0, 0, 1, 0, 0);
  }

  shadow(x: number, y: number, w: number, h: number) {
    this.rect(x, y, w, h, "#234d3b35");
    this.rect(x + 3, y - 2, w - 6, h + 4, "#234d3b22");
  }
  ground(x: number, y: number) {
    const t = tileAt(x, y),
      p = palettes[REGIONS[regionAt(x, y)].biome],
      px = x * TILE,
      py = y * TILE,
      n = noise(x, y);
    this.rect(px, py, TILE, TILE, p[n > 0.5 ? 0 : 1]);
    if (t === "water") {
      this.rect(px, py, 24, 24, p[8]);
      for (const [dx, dy] of [
        [0, -1],
        [-1, 0],
        [1, 0],
        [0, 1],
      ])
        if (tileAt(x + dx, y + dy) !== "water") {
          this.rect(
            px + (dx === 1 ? 21 : 0),
            py + (dy === 1 ? 21 : 0),
            dx === 0 ? 24 : 3,
            dy === 0 ? 24 : 3,
            "#f1d7a3",
          );
        }
      const drift = this.game.state.reducedMotion
        ? 0
        : Math.floor(this.time / 700) % 3;
      this.rect(px + 3 + (x % 3) * 3, py + 8 + drift, 8, 2, "#b5e1d155");
      this.rect(px + 13, py + 18 - drift, 7, 2, "#daf1d555");
      if (tileAt(x, y - 1) !== "water") this.rect(px, py, 24, 4, "#5a9b8866");
      return;
    }
    if (t === "path" || t === "sand") {
      this.rect(px, py, 24, 24, p[6]);
      if (t === "path") {
        if (tileAt(x - 1, y) !== "path") this.rect(px, py, 2, 24, p[7]);
        if (tileAt(x, y - 1) !== "path") this.rect(px, py, 24, 2, p[7]);
      }
      for (let i = 0; i < 4; i++)
        this.rect(
          px + noise(x + i, y) * 22,
          py + noise(x, y + i + 9) * 22,
          2,
          1,
          p[7],
        );
      return;
    }
    if (t === "bridge") {
      this.rect(px, py, 24, 24, "#ac8759");
      for (let i = 0; i < 4; i++) this.rect(px, py + i * 6, 24, 1, "#725d41");
      return;
    }
    for (let i = 0; i < 3; i++) {
      let dx = noise(x + i, y + 2) * 20,
        dy = noise(x + 8, y + i) * 20;
      this.rect(px + dx, py + dy, 3, 1, p[2]);
    }
    if (t === "tall") {
      for (let i = 0; i < 7; i++) {
        const dx =
            (i % 3) * 7 +
            3 +
            (this.game.state.reducedMotion
              ? 0
              : Math.round(Math.sin(this.time / 450 + x + i))),
          dy = Math.floor(i / 3) * 7 + 5;
        this.rect(px + dx, py + dy, 2, 6, p[3] + "aa");
        this.rect(px + dx - 2, py + dy + 2, 2, 3, p[3] + "aa");
        this.rect(px + dx + 2, py + dy + 1, 2, 4, p[4] + "77");
        this.rect(px + dx, py + dy, 2, 2, p[2]);
      }
    }
    if (t === "flower") {
      for (let i = 0; i < 2; i++)
        this.flower(
          px + i * 11 + 5,
          py + n * 10 + 5,
          i === 0 ? "#f1d999" : "#f6ecbe",
        );
    }
    if (t === "rock") {
      this.shadow(px + 4, py + 16, 19, 7);
      this.poly(
        [
          [px + 3, py + 17],
          [px + 4, py + 9],
          [px + 9, py + 4],
          [px + 17, py + 6],
          [px + 21, py + 12],
          [px + 19, py + 20],
          [px + 7, py + 20],
        ],
        "#929c87",
      );
      this.rect(px + 7, py + 7, 10, 3, "#bdc1a7");
      this.rect(px + 17, py + 12, 3, 6, "#737f72");
    }
  }
  flower(x: number, y: number, c: string) {
    this.rect(x, y, 2, 7, "#517a46");
    this.rect(x - 2, y + 4, 5, 2, "#62894a");
    this.rect(x - 2, y - 2, 6, 2, c);
    this.rect(x, y - 4, 2, 6, c);
    this.rect(x, y - 2, 2, 2, "#e5b85b");
  }
  tree(x: number, y: number, p: string[], n: number) {
    const c = this.ctx;
    this.shadow(x - 8, y + 15, 43, 12);
    this.rect(x + 8, y - 13, 10, 37, "#514f3d");
    this.rect(x + 10, y - 12, 4, 32, "#9a8250");
    this.rect(x + 5, y + 20, 18, 4, "#5b6240");
    this.rect(x + 17, y - 8, 5, 8, "#7c6848");
    const cloud = (
      cx: number,
      cy: number,
      rx: number,
      ry: number,
      color: string,
    ) => {
      for (let yy = -ry; yy <= ry; yy += 3) {
        const width = Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry))) * rx;
        this.rect(cx - width, cy + yy, Math.ceil(width * 2), 3, color);
      }
    };
    cloud(x + 11, y - 16, 26, 27, p[5]);
    cloud(x - 2, y - 17, 15, 19, p[5]);
    cloud(x + 25, y - 20, 15, 17, p[5]);
    cloud(x + 8, y - 26, 23, 24, p[4]);
    cloud(x - 2, y - 20, 13, 14, p[3]);
    cloud(x + 20, y - 30, 15, 16, p[4]);
    cloud(x + 8, y - 39, 14, 12, p[3]);
    cloud(x + 22, y - 9, 12, 8, p[4]);
    cloud(x + 7, y - 14, 12, 10, p[4]);
    for (let i = 0; i < 34; i++) {
      const dx = noise(x + i, y) * 43 - 10,
        dy = noise(x, y + i) * 42 - 44;
      if ((dx - 9) ** 2 / 520 + (dy + 24) ** 2 / 590 > 1) continue;
      this.rect(
        x + dx,
        y + dy,
        3 + (i % 3),
        2,
        i % 4 === 0 ? p[2] : i % 3 ? p[3] : p[5] + "99",
      );
    }
    if (n > 0.83) {
      this.rect(x + 5, y - 19, 4, 4, "#df9771");
      this.rect(x + 22, y - 29, 4, 4, "#e0ba77");
    }
  }
  fence(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      this.rect(x + i * 20, y, 5, 20, "#947b51");
      this.rect(x + i * 20, y, 3, 17, "#d9c393");
      if (i < count - 1) {
        this.rect(x + i * 20, y + 4, 20, 3, "#d4be8e");
        this.rect(x + i * 20, y + 12, 20, 3, "#c4ad7c");
      }
    }
  }
  building(e: Entity) {
    const x = e.x * TILE,
      y = e.y * TILE,
      w = e.w * TILE,
      h = e.h * TILE,
      roof =
        e.kind === "center"
          ? ["#d9795e", "#bc604a", "#e89470"]
          : e.kind === "shop"
            ? ["#607f88", "#486b76", "#85a3a5"]
            : e.kind === "lab"
              ? ["#617f67", "#456354", "#86a481"]
              : e.variant % 2
                ? ["#b97750", "#915b41", "#d69463"]
                : ["#8b8881", "#636e69", "#a3a197"];
    this.shadow(x + 4, y + h - 4, w + 12, 16);
    this.rect(x + 4, y + 42, w - 8, h - 43, "#d9d0a7");
    this.rect(x + w - 23, y + 42, 19, h - 43, "#b7b08d");
    this.rect(x + 4, y + h - 8, w - 8, 10, "#a99778");
    for (let i = 0; i < 3; i++)
      this.rect(x + 7, y + 52 + i * 14, w - 15, 1, "#c5bf99");
    this.poly(
      [
        [x - 9, y + 47],
        [x + 2, y + 29],
        [x + 2, y + 14],
        [x + 18, y - 3],
        [x + w - 18, y - 3],
        [x + w - 1, y + 14],
        [x + w - 1, y + 29],
        [x + w + 9, y + 47],
      ],
      roof[1],
    );
    this.poly(
      [
        [x - 6, y + 40],
        [x + 19, y - 4],
        [x + w - 19, y - 4],
        [x + w + 6, y + 40],
      ],
      roof[0],
    );
    for (let row = 0; row < 6; row++) {
      const margin = 19 - row * 4;
      this.rect(x + margin, y + row * 7, w - margin * 2, 2, roof[2]);
      for (let col = 0; col < Math.floor((w - margin * 2) / 13); col++)
        this.rect(
          x + margin + col * 13 + (row % 2) * 5,
          y + row * 7 + 2,
          1,
          5,
          roof[1],
        );
    }
    this.rect(x - 9, y + 43, w + 18, 5, roof[1]);
    this.rect(x - 6, y + 41, w + 12, 2, roof[2]);
    this.rect(x + w - 29, y - 10, 12, 22, "#938975");
    this.rect(x + w - 32, y - 12, 17, 5, "#c2b393");
    const door = x + w / 2 - 9;
    this.rect(door - 3, y + h - 39, 24, 32, "#ac9672");
    this.rect(door, y + h - 36, 18, 31, "#62746b");
    this.rect(door + 3, y + h - 33, 12, 14, "#91b5ac");
    this.rect(door + 13, y + h - 15, 2, 2, "#e5cf94");
    this.rect(door - 5, y + h - 6, 28, 6, "#c8b792");
    this.rect(door - 8, y + h, 34, 5, "#b4a483");
    for (const wx of [x + 19, x + w - 40]) {
      this.rect(wx - 3, y + 55, 24, 25, "#a2916e");
      this.rect(wx, y + 57, 18, 19, "#749d9a");
      this.rect(wx + 2, y + 58, 6, 7, "#c0d9bd");
      this.rect(wx + 8, y + 56, 2, 21, "#e2d5aa");
      this.rect(wx, y + 65, 19, 2, "#e2d5aa");
      this.rect(wx - 3, y + 78, 25, 3, "#c2a875");
      this.rect(wx - 2, y + 82, 23, 5, "#826b49");
      for (let i = 0; i < 4; i++) this.flower(wx + i * 5, y + 80, "#e7aa96");
    }
    if (e.kind === "center") {
      this.rect(x + w / 2 - 10, y + 19, 20, 19, "#f5dfb4");
      this.rect(x + w / 2 - 3, y + 21, 6, 14, "#ca6456");
      this.rect(x + w / 2 - 7, y + 25, 14, 6, "#ca6456");
    }
    if (e.kind === "shop") {
      this.rect(x + 17, y + 47, w - 34, 10, "#d9be80");
      for (let i = 0; i < 7; i++)
        this.rect(x + 17 + i * 12, y + 47, 6, 10, "#ece0b1");
    }
    if (e.kind === "lab") {
      this.rect(x + w / 2 - 9, y + 17, 18, 18, "#d6d5b0");
      this.rect(x + w / 2 - 2, y + 19, 4, 13, "#68865a");
      this.rect(x + w / 2 - 6, y + 23, 12, 4, "#68865a");
    }
    // Storefront sign, doormat, chimney smoke and entrance lamps.
    const label =
      e.kind === "center"
        ? "REST"
        : e.kind === "shop"
          ? "MART"
          : e.kind === "lab"
            ? "LAB"
            : "HOME";
    this.rect(x + w / 2 - 19, y + h - 52, 38, 12, "#314b4d");
    this.ctx.fillStyle = "#fff0bd";
    this.ctx.font = "8px monospace";
    this.ctx.textAlign = "center";
    this.ctx.fillText(label, x + w / 2, y + h - 43);
    this.ctx.textAlign = "start";
    this.rect(x + w / 2 - 12, y + h + 4, 24, 8, "#c7a667");
    this.rect(x + w / 2 - 9, y + h + 6, 18, 2, "#f3d898");
    for (const lx of [x + 7, x + w - 11]) {
      this.rect(lx, y + h - 30, 5, 9, "#45544a");
      this.rect(lx + 1, y + h - 28, 3, 5, "#ffe5a0");
    }
    if (!this.game.state.reducedMotion)
      for (let i = 0; i < 3; i++) {
        const age = (this.time / 1100 + i * 0.35) % 1;
        this.rect(
          x + w - 25 + Math.sin(age * 3 + i) * 5,
          y - 17 - age * 23,
          5 + age * 6,
          4 + age * 4,
          `rgba(235,235,205,${0.3 * (1 - age)})`,
        );
      }
  }
  person(x: number, y: number, dir: number, player = false, variant = 0) {
    const phase = player ? this.stride : 0;
    const swing = [0, 3, 0, -3][phase],
      bob = phase % 2 ? -1 : 0;
    const c = player
      ? "#357cba"
      : ["#ce795d", "#8b9d55", "#9b79ad", "#df95a7", "#608d83"][variant % 5];
    const outline = "#253647",
      skin = "#f2c9a2",
      light = "#ffe2b7";
    this.shadow(x + 2, y + 21, 23, 6);
    // Four directional poses, alternating arms, knees and boot soles.
    const side = dir === 1 || dir === 2,
      back = dir === 3;
    this.rect(x + 6, y + 12, 6, 10 + swing, outline);
    this.rect(x + 15, y + 12, 6, 10 - swing, outline);
    this.rect(x + 6, y + 13, 4, 6 + swing, "#637e9c");
    this.rect(x + 15, y + 13, 4, 6 - swing, "#496582");
    this.rect(x + 4, y + 21 + swing, 8, 4, outline);
    this.rect(x + 15, y + 21 - swing, 8, 4, outline);
    this.rect(x + 4, y + 24 + swing, 8, 1, "#d9d8ba");
    this.rect(x + 15, y + 24 - swing, 8, 1, "#d9d8ba");
    y += bob;
    this.rect(x + 5, y + 1, 17, 15, outline);
    this.rect(x + 7, y + 2, 13, 12, c);
    this.rect(x + 7, y + 3, 3, 9, "#ffffff55");
    this.rect(x + 7, y + 13, 13, 3, "#f3e5c0");
    this.rect(x + 2, y + 3 - swing, 5, 10, c);
    this.rect(x + 3, y + 11 - swing, 4, 4, skin);
    this.rect(x + 21, y + 3 + swing, 4, 10, c);
    this.rect(x + 21, y + 11 + swing, 4, 4, skin);
    if (back || side) {
      const bx = dir === 1 ? 17 : dir === 2 ? 3 : 8;
      this.rect(x + bx, y + 3, 11, 13, "#493f3c");
      this.rect(x + bx + 1, y + 3, 9, 10, "#d6a25c");
      this.rect(x + bx + 2, y + 9, 7, 3, "#f0c17a");
    }
    this.rect(x + 5, y - 16, 17, 18, outline);
    this.rect(x + 7, y - 12, 13, 13, skin);
    this.rect(x + 7, y - 13, 13, 6, "#674b43");
    this.rect(x + 6, y - 6, 3, 5, "#694a40");
    if (back) this.rect(x + 7, y - 10, 13, 11, "#694a40");
    else if (side) {
      const eye = dir === 1 ? 8 : 18;
      this.rect(x + eye, y - 6, 2, 3, outline);
      this.rect(x + (dir === 1 ? 4 : 21), y - 5, 3, 5, skin);
    } else {
      this.rect(x + 9, y - 5, 2, 3, outline);
      this.rect(x + 17, y - 5, 2, 3, outline);
      this.rect(x + 12, y, 4, 1, "#b87969");
      this.rect(x + 12, y - 4, 3, 3, light);
    }
    this.rect(x + 5, y - 19, 17, 7, outline);
    this.rect(x + 7, y - 19, 13, 6, player ? "#ee6257" : "#d7bd88");
    this.rect(x + 9, y - 18, 7, 3, player ? "#fff0dc" : "#ead29f");
    this.rect(
      x + (dir === 1 ? 1 : dir === 2 ? 12 : 4),
      y - 13,
      side ? 14 : 20,
      3,
      player ? "#a63847" : "#8c7458",
    );
  }
  prop(e: Entity) {
    const x = e.x * TILE,
      y = e.y * TILE;
    if (e.kind === "npc" || e.kind === "trainer") {
      this.person(x, y, 0, false, e.variant);
      const done = this.game.state.defeated.includes(e.id);
      if (e.kind === "trainer" && !done) {
        this.rect(x + 7, y - 32, 12, 13, "#f5e4b7");
        this.rect(x + 12, y - 30, 2, 6, "#7b795a");
        this.rect(x + 12, y - 22, 2, 2, "#7b795a");
      }
      if (e.name === "Professor Fern" && !this.game.state.starterChosen) {
        const bob = this.game.state.reducedMotion
          ? 0
          : Math.sin(this.time / 300) * 2;
        this.rect(x + 6, y - 37 + bob, 15, 16, "#f2ce72");
        this.rect(x + 12, y - 34 + bob, 3, 7, "#665d3e");
        this.rect(x + 12, y - 25 + bob, 3, 2, "#665d3e");
      }
      return;
    }
    if (e.kind === "beacon") {
      const restored = this.game.state.badges.includes(e.region);
      this.shadow(x - 3, y + e.h * TILE - 12, 77, 20);
      this.rect(x + 2, y + 64, 68, 23, "#8c9a83");
      this.rect(x + 8, y + 57, 56, 14, "#bbc3a1");
      this.rect(x + 23, y + 14, 27, 50, "#aab795");
      this.rect(x + 28, y + 16, 5, 46, "#d3d6af");
      this.rect(x + 44, y + 16, 6, 46, "#7e937c");
      this.poly(
        [
          [x + 36, y - 6],
          [x + 49, y + 11],
          [x + 36, y + 28],
          [x + 23, y + 11],
        ],
        restored ? "#e7c770" : "#7eaeaa",
      );
      this.rect(x + 34, y + 1, 4, 14, restored ? "#fff1ae" : "#a7d6c6");
      for (let i = 0; i < 4; i++)
        this.rect(
          x + 15 + i * 12,
          y + 77,
          5,
          3,
          restored ? "#e5d58c" : "#637d70",
        );
      return;
    }
    if (e.kind === "chest") {
      const open = this.game.state.chests.includes(e.id);
      this.shadow(x + 1, y + 15, 25, 7);
      this.rect(x + 2, y + 4, 21, 16, "#926c3f");
      this.rect(x + 2, y + 4, 21, 5, open ? "#544c37" : "#c09850");
      this.rect(x + 3, y + 11, 19, 2, "#644f35");
      this.rect(x + 7, y + 4, 2, 16, "#dbba75");
      this.rect(x + 18, y + 4, 2, 16, "#dbba75");
      this.rect(x + 11, y + 10, 4, 5, "#edd592");
      return;
    }
    if (e.kind === "sign") {
      this.rect(x + 11, y + 6, 4, 20, "#8c7956");
      this.rect(x - 3, y - 1, 33, 13, "#bba478");
      this.rect(x - 1, y + 1, 29, 8, "#dfcc99");
      this.rect(x + 4, y + 4, 15, 2, "#897c55");
    }
  }
}
export function landscape(biome: string): string {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 320;
  const ctx = c.getContext("2d")!,
    p = palettes[biome];
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
  };
  const oval = (
    x: number,
    y: number,
    rx: number,
    ry: number,
    color: string,
  ) => {
    for (let yy = -ry; yy <= ry; yy += 2) {
      const w = Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry))) * rx;
      rect(x - w, y + yy, w * 2, 2, color);
    }
  };
  const sky = ctx.createLinearGradient(0, 0, 0, 200);
  sky.addColorStop(
    0,
    biome === "storm" ? "#627d9d" : biome === "marsh" ? "#8687b5" : "#77becf",
  );
  sky.addColorStop(1, biome === "autumn" ? "#f2d39d" : "#d8e9bd");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 640, 320);
  for (let i = 0; i < 7; i++) {
    const x = noise(i, 2) * 620,
      y = 18 + noise(i, 8) * 55;
    oval(x, y, 28, 8, "#f4f3d6aa");
    oval(x + 17, y - 5, 20, 10, "#fff9dfaa");
  }
  for (let layer = 0; layer < 3; layer++) {
    ctx.fillStyle = ["#89b6a5", p[3], p[4]][layer];
    ctx.beginPath();
    ctx.moveTo(0, 190);
    for (let x = 0; x <= 660; x += 12)
      ctx.lineTo(
        x,
        110 + layer * 20 + Math.sin(x / 80 + layer) * 18 + Math.cos(x / 37) * 9,
      );
    ctx.lineTo(640, 200);
    ctx.closePath();
    ctx.fill();
  }
  rect(0, 177, 640, 143, p[1]);
  const ground = ctx.createLinearGradient(0, 160, 0, 320);
  ground.addColorStop(0, p[0]);
  ground.addColorStop(
    1,
    biome === "snow" ? "#deede7" : biome === "desert" ? "#dcb57c" : "#a5bf73",
  );
  ctx.fillStyle = ground;
  ctx.fillRect(0, 175, 640, 145);
  if (biome === "coast" || biome === "marsh") {
    rect(0, 136, 640, 44, p[8]);
    for (let i = 0; i < 80; i++)
      rect(
        noise(i, 8) * 640,
        140 + noise(i, 2) * 35,
        8 + noise(i, 1) * 15,
        1,
        "#e0f5eaaa",
      );
    rect(0, 178, 640, 4, "#eee0ac");
  } else
    for (let i = 0; i < 30; i++) {
      const x = i * 24 - 15,
        y = 152 + noise(i, 2) * 32,
        h = 24 + noise(i, 9) * 44;
      rect(x - 3, y - h / 2, 7, h / 2 + 6, "#7c7254");
      oval(x, y - h * 0.6, 22, h * 0.55, p[5]);
      oval(x - 4, y - h * 0.75, 18, h * 0.4, p[4]);
      oval(x - 8, y - h * 0.9, 10, h * 0.2, p[3]);
      for (let j = 0; j < 12; j++)
        rect(
          x - 16 + noise(i, j) * 30,
          y - h + noise(j, i) * h * 0.7,
          3,
          2,
          biome === "snow" ? "#d2e4d8" : p[3],
        );
    }
  // Fine ground texture and a clear arena leave the combatants easy to read.
  for (let i = 0; i < 650; i++) {
    const x = noise(i, 12) * 640,
      y = 182 + noise(i, 15) * 138;
    rect(x, y, 2 + noise(i, 3) * 4, 1, i % 3 ? p[2] + "88" : p[3] + "77");
  }
  for (let side = 0; side < 2; side++)
    for (let i = 0; i < 50; i++) {
      const x = side ? 590 + noise(i, 5) * 50 : noise(i, 5) * 48,
        y = 210 + noise(i, 4) * 110;
      rect(x, y, 2, 8, p[4]);
      rect(x - 2, y + 3, 6, 2, p[3]);
      if (i % 4 === 0) {
        rect(x - 2, y - 2, 6, 3, biome === "autumn" ? "#eaa375" : "#ece4a0");
        rect(x, y - 4, 2, 7, "#fff3b9");
      }
    }
  return c.toDataURL();
}
