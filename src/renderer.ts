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
    this.width = rect.width < 600 ? 480 : 960;
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
            this.player.y - 11,
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
      this.rect(px, py, 24, 3, "#9bceca");
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
        const dx = (i % 3) * 7 + 3,
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
    const h = n > 0.55 ? 46 : 39;
    this.shadow(x - 4, y + 14, 36, 12);
    this.rect(x + 9, y - 1, 9, 23, "#746549");
    this.rect(x + 11, y, 3, 20, "#a08855");
    this.rect(x + 7, y + 20, 13, 3, "#5f6744");
    this.poly(
      [
        [x - 6, y + 5],
        [x - 6, y - 10],
        [x - 1, y - 10],
        [x - 1, y - 24],
        [x + 4, y - 24],
        [x + 4, y - h],
        [x + 20, y - h],
        [x + 20, y - 29],
        [x + 27, y - 29],
        [x + 27, y - 17],
        [x + 32, y - 17],
        [x + 32, y + 2],
        [x + 26, y + 2],
        [x + 26, y + 10],
        [x + 1, y + 10],
        [x + 1, y + 5],
      ],
      p[5],
    );
    this.poly(
      [
        [x - 4, y - 9],
        [x + 1, y - 9],
        [x + 1, y - 25],
        [x + 7, y - 25],
        [x + 7, y - h + 3],
        [x + 18, y - h + 3],
        [x + 18, y - 27],
        [x + 25, y - 27],
        [x + 25, y - 13],
        [x + 29, y - 13],
        [x + 29, y - 2],
        [x + 21, y - 2],
        [x + 21, y + 4],
        [x + 2, y + 4],
        [x + 2, y - 2],
        [x - 4, y - 2],
      ],
      p[4],
    );
    this.rect(x + 6, y - h + 5, 10, 7, p[3]);
    this.rect(x + 1, y - 24, 8, 12, p[3]);
    this.rect(x - 3, y - 10, 9, 7, p[3]);
    this.rect(x + 14, y - 17, 9, 5, p[3]);
    this.rect(x + 8, y - 31, 3, 3, p[2] + "99");
    this.rect(x + 1, y - 17, 3, 3, p[2] + "77");
    this.rect(x + 19, y - 8, 3, 2, p[2] + "77");
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
  }
  person(x: number, y: number, dir: number, player = false, variant = 0) {
    const bob =
      player &&
      Math.abs(this.player.x - this.game.state.x * TILE) +
        Math.abs(this.player.y - this.game.state.y * TILE) >
        1
        ? Math.round(Math.sin(this.time / 65) * 2)
        : 0;
    this.shadow(x + 3, y + 19, 20, 6);
    const coat = player
      ? "#497f8b"
      : ["#b98154", "#b5a270", "#8a7994", "#d09275", "#6a8f7b"][variant % 5];
    this.rect(x + 7, y + 12, 5, 10 + bob, "#354f52");
    this.rect(x + 14, y + 12, 5, 10 - bob, "#354f52");
    this.rect(x + 6, y + 21 + bob, 7, 3, "#3c4943");
    this.rect(x + 14, y + 21 - bob, 7, 3, "#3c4943");
    this.rect(x + 6, y + 2, 14, 13, coat);
    this.rect(x + 3, y + 5, 4, 10, "#e6bd91");
    this.rect(x + 20, y + 5, 4, 10, "#e6bd91");
    this.rect(x + 7, y - 12, 13, 16, "#efd0a0");
    this.rect(x + 6, y - 13, 15, 6, "#5a493b");
    this.rect(x + 7, y - 6, 3, 6, "#6e5139");
    if (dir !== 3) {
      this.rect(x + (dir === 1 ? 9 : 15), y - 5, 2, 3, "#384943");
    }
    if (player) {
      this.rect(x + 5, y - 16, 17, 7, "#d97052");
      this.rect(x + 3, y - 10, 23, 3, "#ed9465");
      this.rect(x + 8, y - 15, 9, 2, "#efb080");
      this.rect(x + 8, y + 3, 10, 3, "#f2ddb4");
      this.rect(x + 6, y + 6, 3, 7, "#b9bd83");
    } else {
      this.rect(x + 5, y - 14, 17, 3, "#77674c");
      this.rect(x + 8, y - 18, 11, 5, "#c9b782");
    }
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
  c.width = 360;
  c.height = 140;
  const ctx = c.getContext("2d")!,
    p = palettes[biome];
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };
  rect(
    0,
    0,
    360,
    140,
    biome === "snow" ? "#d9e7e3" : biome === "coast" ? "#c2ddd6" : "#c7d0ac",
  );
  for (let i = 0; i < 5; i++) {
    const x = noise(i, 2) * 340;
    rect(x, 15 + i * 5, 26, 3, "#f0efdb55");
    rect(x + 7, 12 + i * 5, 16, 4, "#f0efdb55");
  }
  for (let i = 0; i < 7; i++) {
    const x = i * 63 - 30,
      h = 30 + noise(i, 3) * 60;
    ctx.fillStyle = i % 2 ? p[4] + "66" : p[3] + "88";
    ctx.beginPath();
    ctx.moveTo(x, 108);
    ctx.lineTo(x + 47, 120 - h);
    ctx.lineTo(x + 95, 108);
    ctx.fill();
    if (biome === "snow") {
      ctx.fillStyle = "#ecf1e6";
      ctx.beginPath();
      ctx.moveTo(x + 47, 120 - h);
      ctx.lineTo(x + 36, 141 - h);
      ctx.lineTo(x + 47, 136 - h);
      ctx.lineTo(x + 57, 141 - h);
      ctx.fill();
    }
  }
  rect(0, 90, 360, 50, p[1]);
  for (let i = 0; i < 180; i++)
    rect(
      noise(i, 9) * 360,
      92 + noise(i, 10) * 48,
      i % 3 ? 2 : 4,
      1,
      p[i % 2 ? 2 : 3] + "88",
    );
  if (biome === "coast") {
    rect(0, 108, 360, 32, p[8]);
    for (let i = 0; i < 35; i++)
      rect(noise(i, 4) * 360, 111 + noise(i, 7) * 27, 8, 1, "#d6e9d8aa");
  } else {
    ctx.fillStyle = p[6];
    ctx.beginPath();
    ctx.moveTo(135, 140);
    ctx.lineTo(185, 101);
    ctx.lineTo(180, 90);
    ctx.lineTo(186, 90);
    ctx.lineTo(196, 103);
    ctx.lineTo(190, 121);
    ctx.lineTo(209, 140);
    ctx.fill();
  }
  const trees = Array.from({ length: 28 }, (_, i) => ({
    x: noise(i, 7) * 360,
    y: 64 + noise(i, 4) * 69,
    n: noise(i, 5),
  })).sort((a, b) => a.y - b.y);
  for (const { x, y, n } of trees) {
    if ((x > 160 && x < 215) || (biome === "coast" && y > 100)) continue;
    const size = 15 + n * 12;
    rect(x + 3, y + 2, 22, 4, "#294d3329");
    rect(x + 10, y - 6, 4, 13, "#817952");
    rect(x, y - size + 7, 23, size - 9, p[5]);
    rect(x + 4, y - size, 16, size, p[4]);
    rect(x + 7, y - size - 6, 10, 9, p[4]);
    rect(x + 5, y - size + 1, 10, 6, p[3]);
    rect(x + 1, y - size + 10, 11, 6, p[3]);
    rect(x + 13, y - 9, 8, 4, p[3]);
    rect(x + 8, y - size, 3, 2, biome === "snow" ? "#e6ece0" : p[2]);
  }
  return c.toDataURL();
}
