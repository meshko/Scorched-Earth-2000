"use strict";

const CLIENT_VERSION = "v1.2, 5/15/2026";
let WIDTH = 800;
let HEIGHT = 600;
const MAX_POWER = 1000;
const MIN_POWER = 200;
const START_POWER = 300;
const START_ANGLE = 30;
const EARTH_GRAVITY = 9.8;
const STEP_SIZE = 0.1;
const TANK_COLOR = rgb(0, 180, 0);
const TURRET_COLOR = rgb(0, 181, 0);
const DARK_GRAY = rgb(64, 64, 64);
const WHITE = rgb(255, 255, 255);
const PLAYER_COLORS = [
  rgb(255, 0, 0), rgb(255, 255, 0), rgb(255, 255, 255), rgb(43, 112, 79),
  rgb(0, 255, 255), rgb(0, 0, 150), rgb(0, 150, 0), rgb(255, 0, 255)
];

const WEAPONS = [
  { name: "Missile", radius: 10, ammo: 999, price: 0, bundle: 1, kind: "simple", infinite: true },
  { name: "Baby Nuke", radius: 60, ammo: 0, price: 20000, bundle: 1, kind: "simple" },
  { name: "Nuke", radius: 100, ammo: 0, price: 40000, bundle: 1, kind: "simple" },
  { name: "Sand Bomb", radius: 60, ammo: 0, price: 5000, bundle: 1, kind: "sand" },
  { name: "Baby Roller", radius: 15, ammo: 0, price: 7000, bundle: 1, kind: "roller" },
  { name: "Roller", radius: 30, ammo: 0, price: 13000, bundle: 1, kind: "roller" },
  { name: "Heavy Roller", radius: 55, ammo: 0, price: 20000, bundle: 1, kind: "roller" },
  { name: "Baby Digger", radius: 24, ammo: 0, price: 2000, bundle: 1, kind: "digger", duration: 1000 },
  { name: "Digger", radius: 38, ammo: 0, price: 4000, bundle: 1, kind: "digger", duration: 3000 },
  { name: "Heavy Digger", radius: 54, ammo: 0, price: 6000, bundle: 1, kind: "digger", duration: 5000 },
  { name: "Funky Bomb", radius: 38, ammo: 0, price: 30000, bundle: 1, kind: "funky", particles: 6 },
  { name: "Funky Nuke", radius: 62, ammo: 0, price: 50000, bundle: 1, kind: "funky", particles: 10 },
  { name: "Napalm", radius: 140, ammo: 0, price: 10000, bundle: 1, kind: "napalm", hot: false },
  { name: "Hot Napalm", radius: 280, ammo: 0, price: 20000, bundle: 1, kind: "napalm", hot: true },
  { name: "MIRV", radius: 25, ammo: 0, price: 35000, bundle: 1, kind: "mirv", particles: 5 },
  { name: "Death Head", radius: 55, ammo: 0, price: 90000, bundle: 1, kind: "mirv", particles: 9 },
  { name: "Laser", ammo: 0, price: 25000, bundle: 1, kind: "laser", beamWidth: 5, damage: 880 }
];
const ITEMS = [
  { name: "Shield", price: 20000, bundle: 1, max: 0, type: "shield", strength: 1, damage: 0.9, thickness: 1 },
  { name: "Medium Shield", price: 27000, bundle: 1, max: 0, type: "shield", strength: 2, damage: 0.95, thickness: 3 },
  { name: "Heavy Shield", price: 35000, bundle: 1, max: 0, type: "shield", strength: 3, damage: 0.99, thickness: 5 },
  { name: "Parachute", price: 2000, bundle: 1, max: 0, type: "parachute" },
  { name: "Battery", price: 4500, bundle: 1, max: 0, type: "battery", power: 100 },
  { name: "Tracer", price: 100, bundle: 1, max: 0, type: "tracer" },
  { name: "Auto Defense", price: 5000, bundle: 1, max: 0, type: "autodefense" },
  { name: "Fuel", price: 10000, bundle: 100, max: 1000, type: "fuel" }
];
const PARACHUTE_ICON = [
  [0,0,0,0,0,1,1,1,1,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [0,1,0,0,1,0,0,0,0,1,0,0,1,0],
  [0,0,1,0,0,1,0,0,1,0,0,1,0,0],
  [0,0,0,1,0,1,0,0,1,0,1,0,0,0],
  [0,0,0,0,1,0,1,1,0,1,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,0,0,0,0,0]
];
const DEFAULT_INITIAL_CASH = 50000;
let INITIAL_CASH = DEFAULT_INITIAL_CASH;
const UNLIMITED_INVENTORY_AMOUNT = 999;
var autoDefenseQueue = [];
var autoDefensePlayer = null;
var autoDefenseMode = false;
const AI_NAMES = ["Shooter", "Cyborg", "Killer"];
const AI_ACCURACY = [5, 4, 2];
const AI_RADIUS_FACTOR = [3.0, 2.0, 1.5];
const AI_WEAPON_PRICE_CENTER = [0.12, 0.52, 0.86];
const AI_WEAPON_PRICE_SPREAD = [0.34, 0.36, 0.28];

const tankData = [
  [
    [7,4,8,0,TURRET_COLOR,1,1,0,0,0,0,0,0],
    [TURRET_COLOR,TURRET_COLOR,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,TURRET_COLOR,TURRET_COLOR,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,TURRET_COLOR,TURRET_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0,0,0,0],
    [0,0,0,0,0,0,TANK_COLOR,TANK_COLOR,TANK_COLOR,0,0,0,0],
    [0,0,0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0,0],
    [0,0,0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0,0],
    [0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0],
    [TANK_COLOR,DARK_GRAY,TANK_COLOR,DARK_GRAY,TANK_COLOR,DARK_GRAY,TANK_COLOR,DARK_GRAY,TANK_COLOR,DARK_GRAY,TANK_COLOR,DARK_GRAY,TANK_COLOR],
    [0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0]
  ],
  [
    [7,5,9,0,TURRET_COLOR,1,1,0,0,0,0,0,0,0,0],
    [0,TURRET_COLOR,TURRET_COLOR,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,TURRET_COLOR,TURRET_COLOR,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,TURRET_COLOR,TURRET_COLOR,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,TANK_COLOR,TANK_COLOR,TANK_COLOR,0,0,0,0,0,0,0],
    [0,0,0,0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0,0,0,0,0],
    [0,0,0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0,0,0,0],
    [0,0,0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0,0,0,0],
    [0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0],
    [TANK_COLOR,DARK_GRAY,TANK_COLOR,DARK_GRAY,TANK_COLOR,DARK_GRAY,TANK_COLOR,DARK_GRAY,TANK_COLOR,DARK_GRAY,TANK_COLOR,DARK_GRAY,TANK_COLOR,DARK_GRAY,TANK_COLOR],
    [0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0]
  ],
  [
    [7,5,7,0,TURRET_COLOR,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,TURRET_COLOR,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,TURRET_COLOR,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,TURRET_COLOR,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,TANK_COLOR,TANK_COLOR,0,0,0,0,0,0],
    [0,0,0,0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0,0,0,0],
    [0,0,0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0,0,0],
    [0,0,TANK_COLOR,TANK_COLOR,DARK_GRAY,DARK_GRAY,TANK_COLOR,DARK_GRAY,DARK_GRAY,TANK_COLOR,DARK_GRAY,DARK_GRAY,TANK_COLOR,TANK_COLOR,0,0],
    [0,0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0,0],
    [0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0],
    [TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR]
  ],
  [
    [3,3,6,0,TURRET_COLOR,2,2,0,0,0,0,0,0,0],
    [0,0,0,0,0,TURRET_COLOR,0,0,0,0,0,0,0,0],
    [0,0,0,0,TURRET_COLOR,0,0,0,0,0,0,0,0,0],
    [0,0,0,TURRET_COLOR,0,0,0,0,0,0,0,0,0,0],
    [0,0,TANK_COLOR,TANK_COLOR,0,0,0,0,TANK_COLOR,TANK_COLOR,TANK_COLOR,0,0,0],
    [0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0,0,0,TANK_COLOR,0,0,TANK_COLOR,0,0],
    [0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0,0,0,TANK_COLOR,0,0,0,TANK_COLOR,0],
    [0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0],
    [TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR],
    [TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR],
    [0,TANK_COLOR,DARK_GRAY,TANK_COLOR,0,0,0,0,0,0,TANK_COLOR,DARK_GRAY,TANK_COLOR,0],
    [0,0,TANK_COLOR,0,0,0,0,0,0,0,0,TANK_COLOR,0,0]
  ],
  [
    [11,4,9,0,TURRET_COLOR,1,1,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,TURRET_COLOR,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,TURRET_COLOR,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,TANK_COLOR,TANK_COLOR,0,0,TURRET_COLOR,0,0,0],
    [0,0,0,0,0,0,0,0,0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TURRET_COLOR,0,0,0,0],
    [0,0,0,0,0,0,0,0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0,0,0,0],
    [0,0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0,0,0],
    [0,0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0,0,0],
    [0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0],
    [TANK_COLOR,DARK_GRAY,TANK_COLOR,DARK_GRAY,TANK_COLOR,DARK_GRAY,TANK_COLOR,DARK_GRAY,TANK_COLOR,DARK_GRAY,TANK_COLOR,DARK_GRAY,TANK_COLOR,DARK_GRAY,TANK_COLOR,DARK_GRAY,TANK_COLOR,DARK_GRAY,TANK_COLOR],
    [0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0]
  ],
  [
    [8,3,6,0,TURRET_COLOR,3,3,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,TURRET_COLOR,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,TURRET_COLOR,TURRET_COLOR,0,0],
    [0,0,0,0,0,0,0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0,TURRET_COLOR,0,0,0,0],
    [0,0,0,0,0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0,0,0,0,0],
    [0,0,0,0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0,0,0,0],
    [0,0,0,0,0,0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0,0,0,0,0,0],
    [0,0,0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0,0,0],
    [0,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,TANK_COLOR,0],
    [TANK_COLOR,TANK_COLOR,DARK_GRAY,DARK_GRAY,DARK_GRAY,DARK_GRAY,DARK_GRAY,DARK_GRAY,DARK_GRAY,DARK_GRAY,DARK_GRAY,DARK_GRAY,DARK_GRAY,DARK_GRAY,DARK_GRAY,TANK_COLOR,TANK_COLOR],
    [TANK_COLOR,DARK_GRAY,TANK_COLOR,DARK_GRAY,DARK_GRAY,TANK_COLOR,DARK_GRAY,DARK_GRAY,TANK_COLOR,DARK_GRAY,DARK_GRAY,TANK_COLOR,DARK_GRAY,DARK_GRAY,TANK_COLOR,DARK_GRAY,TANK_COLOR],
    [0,0,DARK_GRAY,DARK_GRAY,DARK_GRAY,DARK_GRAY,DARK_GRAY,DARK_GRAY,DARK_GRAY,DARK_GRAY,DARK_GRAY,DARK_GRAY,DARK_GRAY,DARK_GRAY,DARK_GRAY,0,0]
  ]
];

class Random {
  constructor(seed = Date.now() >>> 0) {
    this.initialSeed = seed >>> 0;
    this.seed = seed >>> 0;
  }
  next() {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 0x100000000;
  }
  int(max) {
    return Math.floor(this.next() * max);
  }
  pick(values) {
    return values[this.int(values.length)];
  }
}

class Bitmap {
  constructor(width, height, rand) {
    this.width = width;
    this.height = height;
    this.rand = rand;
    this.pixels = new Uint32Array(width * height);
    this.sand = rgb(52, 70, 32);
    this.bgMode = true;
    this.color = WHITE;
    this.density = 1;
    this.backgroundKind = "stars";
    this.plainColor = rgb(0, 0, 0);
    this.stars = new Int16Array(width);
    this.stars.fill(-1);
    this.gradientA = rgb(0, 0, 0);
    this.gradientB = rgb(0, 0, 0);
  }
  initStars() {
    for (let x = 0; x < this.width; x++) {
      this.stars[x] = x % 3 === 0 ? this.rand.int(this.height) : -1;
    }
  }
  backgroundColor(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0;
    if (this.backgroundKind === "stars") {
      if (this.stars[x] === y) {
        const i = 255 - Math.floor(255 * y / this.height);
        return rgb(i, i, i);
      }
      return rgb(0, 0, 0);
    }
    if (this.backgroundKind === "plain") return this.plainColor;
    const steps = 127;
    const strip = Math.max(0, Math.min(steps - 1, Math.floor(y / (this.height / steps))));
    return gradientStripColor(this.gradientA, this.gradientB, strip, steps);
  }
  setSandColor(color) {
    this.sand = color;
  }
  setColor(color) {
    this.bgMode = color == null;
    if (color != null) this.color = color;
  }
  setDensity(density) {
    this.density = density;
  }
  pixelIndex(x, y) {
    return y * this.width + x;
  }
  getPixel(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0;
    return this.pixels[this.pixelIndex(x, y)];
  }
  setPixel(x, y, color = undefined) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    if (this.density < 1 && this.rand.next() > this.density) return;
    this.pixels[this.pixelIndex(x, y)] = color ?? (this.bgMode ? this.backgroundColor(x, y) : this.color);
  }
  isBackground(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height && this.getPixel(x, y) === this.backgroundColor(x, y);
  }
  isGround(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height && this.getPixel(x, y) === this.sand;
  }
  fillRect(x, y, w, h) {
    for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) this.setPixel(px, py);
  }
  drawLine(x1, y1, x2, y2) {
    let dx = Math.abs(x2 - x1);
    let sx = x1 < x2 ? 1 : -1;
    let dy = -Math.abs(y2 - y1);
    let sy = y1 < y2 ? 1 : -1;
    let err = dx + dy;
    while (true) {
      this.setPixel(x1, y1);
      if (x1 === x2 && y1 === y2) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x1 += sx; }
      if (e2 <= dx) { err += dx; y1 += sy; }
    }
  }
  fillCircle(cx, cy, r) {
    const rr = r * r;
    for (let y = -r; y <= r; y++) {
      const yy = cy + y;
      const span = Math.floor(Math.sqrt(Math.max(0, rr - y * y)));
      for (let x = -span; x <= span; x++) this.setPixel(cx + x, yy);
    }
  }
  drawCircle(cx, cy, r) {
    let x = 0;
    let y = r;
    let d = 1 - r;
    const draw = () => {
      this.setPixel(cx + x, cy + y); this.setPixel(cx - x, cy + y);
      this.setPixel(cx + x, cy - y); this.setPixel(cx - x, cy - y);
      this.setPixel(cx + y, cy + x); this.setPixel(cx - y, cy + x);
      this.setPixel(cx + y, cy - x); this.setPixel(cx - y, cy - x);
    };
    draw();
    while (y > x) {
      if (d < 0) d += 2 * x + 3;
      else { d += 2 * (x - y) + 5; y--; }
      x++;
      draw();
    }
  }
  fillEllipse(cx, cy, a, b) {
    const aa = a * a;
    const bb = b * b;
    for (let y = -b; y <= b; y++) {
      const span = Math.floor(a * Math.sqrt(Math.max(0, 1 - (y * y) / bb)));
      for (let x = -span; x <= span; x++) this.setPixel(cx + x, cy + y);
    }
  }
  fillEllipsePreservingGround(cx, cy, a, b) {
    const aa = a * a;
    const bb = b * b;
    for (let y = -b; y <= b; y++) {
      const span = Math.floor(a * Math.sqrt(Math.max(0, 1 - (y * y) / bb)));
      for (let x = -span; x <= span; x++) {
        const px = cx + x;
        const py = cy + y;
        if (!this.isGround(px, py)) this.setPixel(px, py);
      }
    }
  }
  drawSprite(x, y, sprite, transparent = 0, colorIndex = -1) {
    const body = colorIndex >= 0 ? PLAYER_COLORS[colorIndex] : TANK_COLOR;
    for (let row = 1; row < sprite.length; row++) {
      for (let col = 0; col < sprite[row].length; col++) {
        let color = sprite[row][col];
        if (color === transparent) continue;
        if (color === TANK_COLOR) color = body;
        if (color === TURRET_COLOR && colorIndex >= 0) color = sprite[0][3];
        this.setPixel(x + col, y + row - 1, color);
      }
    }
  }
  intersectLine(x1, y1, x2, y2) {
    let dx = Math.abs(x2 - x1);
    let sx = x1 < x2 ? 1 : -1;
    let dy = -Math.abs(y2 - y1);
    let sy = y1 < y2 ? 1 : -1;
    let err = dx + dy;
    while (true) {
      if (!this.isBackground(x1, y1)) return { x: x1, y: y1 };
      if (x1 === x2 && y1 === y2) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x1 += sx; }
      if (e2 <= dx) { err += dx; y1 += sy; }
    }
    return null;
  }
}

class Player {
  constructor(id, name, tankType, ai = false, aiType = 0) {
    this.id = id;
    this.name = name;
    this.tankType = tankType;
    this.ai = ai;
    this.aiType = aiType;
    this.x = 0;
    this.y = 0;
    this.angle = START_ANGLE;
    this.power = START_POWER;
    this.powerLimit = MAX_POWER;
    this.alive = true;
    this.kills = 0;
    this.earnedCash = 0;
    this.overallKills = 0;
    this.overallGain = 0;
    this.cash = INITIAL_CASH;
    this.weapons = WEAPONS.map((weapon) => weapon.ammo);
    this.lastWeapon = 0;
    this.preferredWeapon = 0;
    this.items = ITEMS.map(() => 0);
    this.shield = null;
    this.parachutes = 0;
    this.falling = false;
    this.tracer = false;
    this.autoDefense = false;
  }
  get sprite() { return tankData[this.tankType]; }
  get width() { return this.sprite[0].length; }
  get height() { return this.sprite.length - 1; }
  turretX(q = 1) {
    return this.x + this.sprite[0][0] + Math.trunc(this.sprite[0][2] * q * Math.cos(this.angle * Math.PI / 180));
  }
  turretY(q = 1) {
    return this.y + this.sprite[0][1] - Math.trunc(this.sprite[0][2] * q * Math.sin(this.angle * Math.PI / 180));
  }
}

class ScorchGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.rand = new Random();
    this.players = [];
    this.active = 0;
    this.wind = 0;
    this.maxWind = PhysicsMaxWind();
    this.changingWinds = false;
    this.unlimitedInventory = false;
    this.weapon = 0;
    this.animating = false;
    this.roundOver = false;
    this.roundRestartTimer = null;
    this.hoverPlayer = null;
    this.hoverX = 0;
    this.hoverY = 0;
    this.tracerTrails = [];
    this.chatMessages = [];
    this.chatTimer = null;
    this.galslaMode = false;
    this.galslaTimer = null;
    this.statsSnapshot = [];
    this.resize(WIDTH, HEIGHT);
    this.rebuildPlayers(4, 2);
    this.newRound(false);
  }
  rebuildPlayers(count, aiCount, humanTankType = 0) {
    const players = [];
    const humans = Math.max(1, count - aiCount);
    for (let i = 0; i < count; i++) {
      const ai = i >= humans;
      const aiType = ai ? (i - humans) % AI_NAMES.length : 0;
      const name = ai ? AI_NAMES[aiType] : `Player ${i + 1}`;
      const tankType = ai ? aiType : (i === 0 ? humanTankType : i % tankData.length);
      players.push(new Player(i, name, tankType, ai, aiType));
    }
    this.players = players;
    this.applyUnlimitedInventory();
    this.active = 0;
  }
  startMultiplayerRound(config) {
    const [width, height] = String(config.resolution || "800x600").split("x").map(Number);
    this.resize(width || 800, height || 600);
    this.rand = new Random(Number(config.seed) >>> 0);
    const maxWind = Number(config.maxWind);
    const initialCash = Number(config.initialCash);
    this.maxWind = Number.isFinite(maxWind) ? Math.max(0, Math.trunc(maxWind)) : PhysicsMaxWind();
    this.changingWinds = !!config.changingWinds;
    this.unlimitedInventory = !!config.unlimitedInventory;
    INITIAL_CASH = Number.isFinite(initialCash) ? Math.max(0, Math.trunc(initialCash)) : DEFAULT_INITIAL_CASH;
    const previousPlayers = this.players;
    this.players = config.players.map((entry, index) => {
      const player = new Player(index, entry.name, entry.tankType ?? (index % tankData.length), !!entry.ai, entry.aiType ?? 0);
      const previous = previousPlayers[index];
      if (previous && previous.name === player.name && previous.ai === player.ai) {
        player.lastWeapon = previous.lastWeapon;
        player.preferredWeapon = previous.preferredWeapon;
      }
      return player;
    });
    this.active = Number(config.active) || 0;
    this.newRound();
    if (Number.isFinite(Number(config.wind))) this.wind = Number(config.wind);
    this.syncConfiguredStats(config.players);
    this.captureStatsSnapshot();
    this.active = Number(config.active) || 0;
    this.weapon = preferredWeaponFor(this.players[this.active], this.weapon);
    this.render(`Game ${config.game} started.`);
    setControlsDisabled(false);
  }
  syncConfiguredStats(players) {
    if (!Array.isArray(players)) return;
    for (const entry of players) {
      const player = this.players[entry.id];
      if (!player) continue;
      this.applyConfiguredInventory(player, entry);
      player.overallKills = Number(entry.overallKills) || 0;
      player.overallGain = Number(entry.overallGain) || 0;
    }
  }
  applyConfiguredInventory(player, entry) {
    if (Array.isArray(entry.weapons)) {
      player.weapons = WEAPONS.map((weapon, index) => {
        const value = Number(entry.weapons[index]);
        return Number.isFinite(value) ? Math.max(0, value) : weapon.ammo;
      });
    }
    if (Array.isArray(entry.items)) {
      player.items = ITEMS.map((_, index) => Math.max(0, Number(entry.items[index]) || 0));
      player.parachutes = Math.min(player.parachutes, player.items[3] || 0);
    }
    if (entry.cash != null) player.cash = Math.max(0, Number(entry.cash) || 0);
  }
  applyUnlimitedInventory() {
    if (!this.unlimitedInventory) return;
    for (const player of this.players) {
      player.weapons = WEAPONS.map(() => UNLIMITED_INVENTORY_AMOUNT);
      player.items = ITEMS.map(() => UNLIMITED_INVENTORY_AMOUNT);
      player.cash = Math.max(player.cash, INITIAL_CASH);
    }
  }
  randomizeWind() {
    this.wind = this.maxWind > 0 ? this.rand.int(this.maxWind * 2 + 1) - this.maxWind : 0;
    return this.wind;
  }
  captureStatsSnapshot() {
    this.statsSnapshot = this.players.map((player) => ({
      id: player.id,
      name: player.name,
      kills: player.kills,
      earnedCash: player.earnedCash,
      overallKills: player.overallKills,
      overallGain: player.overallGain
    }));
  }
  checksum() {
    let hash = 2166136261;
    const stride = Math.max(1, Math.floor(this.bitmap.pixels.length / 1024));
    for (let i = 0; i < this.bitmap.pixels.length; i += stride) {
      hash ^= this.bitmap.pixels[i];
      hash = Math.imul(hash, 16777619);
    }
    for (const player of this.players) {
      hash ^= player.alive ? 1 : 0;
      hash = Math.imul(hash, 16777619);
      hash ^= (player.x << 16) ^ player.y ^ player.powerLimit;
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }
  resize(width, height) {
    WIDTH = width;
    HEIGHT = height;
    this.canvas.width = width;
    this.canvas.height = height;
    document.documentElement.style.setProperty("--field-width", `${width}px`);
    document.documentElement.style.setProperty("--field-height", `${height}px`);
    this.image = this.ctx.createImageData(width, height);
  }
  newRound(resetControls = true) {
    const previousWeapon = this.weapon;
    if (this.roundRestartTimer) {
      clearTimeout(this.roundRestartTimer);
      this.roundRestartTimer = null;
    }
    this.roundOver = false;
    this.bitmap = new Bitmap(WIDTH, HEIGHT, this.rand);
    this.groundColor = this.randomBackground();
    this.bitmap.setSandColor(this.groundColor);
    this.randomizeWind();
    this.generateTerrain();
    this.tracerTrails = [];
    this.applyUnlimitedInventory();
    for (const player of this.players) {
      player.alive = true;
      player.powerLimit = MAX_POWER;
      player.power = START_POWER;
      player.angle = player.id < this.players.length / 2 ? START_ANGLE : 150;
      player.kills = 0;
      player.earnedCash = 0;
      player.shield = null;
    }
    this.placeTanks();
    this.active = this.players.findIndex((p) => p.alive);
    this.weapon = preferredWeaponFor(this.players[this.active], previousWeapon);
    this.render("New round.");
    if (resetControls) setControlsDisabled(false);
    this.scheduleAiTurn();
  }
  applyAutoDefense(player) {
    if (!player.autoDefense || player.items[6] <= 0) return;
    for (const index of [2, 1, 0]) {
      if (player.items[index] <= 0) continue;
      const item = ITEMS[index];
      player.items[6]--;
      player.items[index]--;
      player.shield = { strength: item.strength, maxStrength: item.strength, damage: item.damage, thickness: item.thickness };
      return;
    }
  }
  randomBackground() {
    const colors = [
      { r: 0, g: 0, b: 0 },
      { r: 0, g: 150, b: 0 },
      { r: 254, g: 0, b: 0 },
      { r: 0, g: 0, b: 254 },
      { r: 254, g: 254, b: 254 },
      { r: 0, g: 254, b: 254 },
      { r: 254, g: 254, b: 0 },
      { r: 34, g: 23, b: 65 }
    ];
    const skyStartColors = colors.filter((color) =>
      !(color.r === 0 && color.g === 254 && color.b === 254) &&
      !(color.r === 254 && color.g === 254 && color.b === 0) &&
      !(color.r === 254 && color.g === 254 && color.b === 254)
    );
    let rc1 = { ...this.rand.pick(skyStartColors) };
    rc1.b = Math.min(255, rc1.b + 100);

    let ground = { ...this.rand.pick(colors) };
    ground = {
      r: Math.max(20, ground.r - 150),
      g: Math.max(20, ground.g - 150),
      b: Math.max(20, ground.b - 150)
    };

    switch (this.rand.int(3)) {
      case 0:
        this.bitmap.backgroundKind = "stars";
        this.bitmap.initStars();
        ground = {
          r: Math.min(255, ground.r + 30),
          g: Math.min(255, ground.g + 30),
          b: Math.min(255, ground.b + 30)
        };
        break;
      case 1: {
        const rc2 = this.rand.pick(colors);
        this.bitmap.backgroundKind = "gradient";
        this.bitmap.gradientA = rgb(rc1.r, rc1.g, rc1.b);
        this.bitmap.gradientB = rgb(rc2.r, rc2.g, rc2.b);
        break;
      }
      case 2:
        rc1 = {
          r: Math.max(20, rc1.r - 50),
          g: Math.max(20, rc1.g - 50),
          b: Math.min(255, rc1.b + 30)
        };
        this.bitmap.backgroundKind = "plain";
        this.bitmap.plainColor = rgb(rc1.r, rc1.g, rc1.b);
        break;
    }

    return rgb(ground.r, ground.g, ground.b);
  }
  generateTerrain() {
    const groundHeight = Math.round(3 / 8 * HEIGHT);
    this.bitmap.setColor(null);
    this.bitmap.fillRect(0, HEIGHT - groundHeight, WIDTH, groundHeight);
    this.bitmap.setColor(this.groundColor);
    this.bitmap.fillRect(0, 0, WIDTH, HEIGHT - groundHeight);
    this.bitmap.setColor(null);
    for (let i = 0; i < 20; i++) {
      this.bitmap.fillEllipse(this.rand.int(WIDTH), this.rand.int(HEIGHT), 10 + this.rand.int(90), 10 + this.rand.int(60));
    }
    this.bitmap.setDensity(1);
    this.bitmap.setColor(this.groundColor);
    this.bitmap.fillEllipse(Math.floor(WIDTH / 2), HEIGHT, WIDTH, Math.floor(HEIGHT / 8));
    this.drop(0, WIDTH);
  }
  placeTanks() {
    const slots = [...this.players.keys()];
    for (let i = 0; i < this.players.length; i++) {
      const slotIndex = this.rand.int(slots.length);
      const player = this.players[slots.splice(slotIndex, 1)[0]];
      const x = Math.floor(WIDTH / (this.players.length + 1) * (i + 1));
      for (let y = 1; y < HEIGHT; y++) {
        let count = 0;
        for (let k = 0; k < player.width; k++) {
          if (!this.bitmap.isBackground(x + k, y)) {
            count++;
            this.bitmap.setColor(null);
            this.bitmap.setPixel(x + k, y - 1);
          }
        }
        if (count >= player.width) {
          player.x = x;
          player.y = y - player.height;
          break;
        }
      }
    }
  }
  clearTankPocket(player) {
    this.bitmap.setColor(null);
    this.bitmap.fillRect(player.x - 2, player.y - 3, player.width + 4, player.height + 3);
  }
  drop(startX, endX) {
    startX = Math.max(0, Math.floor(startX));
    endX = Math.min(WIDTH - 1, Math.ceil(endX));
    for (let x = startX; x <= endX; x++) {
      let y = 0;
      while (y < HEIGHT) {
        let lowerBound = HEIGHT;
        const upperBound = y;
        let thickness = 0;
        for (; y < HEIGHT; y++) {
          if (this.bitmap.isGround(x, y)) thickness++;
          else if (!this.bitmap.isBackground(x, y)) {
            lowerBound = y++;
            break;
          }
        }
        if (thickness > 0) {
          this.bitmap.setColor(this.groundColor);
          this.bitmap.drawLine(x, lowerBound - thickness, x, lowerBound - 1);
          if (upperBound < lowerBound - thickness - 1) {
            this.bitmap.setColor(null);
            this.bitmap.drawLine(x, upperBound, x, lowerBound - thickness - 1);
          }
        }
      }
    }
  }
  drawWorld() {
    for (let i = 0; i < this.bitmap.pixels.length; i++) {
      writePixel(this.image.data, i, this.bitmap.pixels[i]);
    }
    this.ctx.putImageData(this.image, 0, 0);
    this.drawTracerTrails();
    for (const player of this.players) {
      if (!player.alive) continue;
      this.drawShield(player);
      this.drawParachute(player);
      this.drawTank(player);
    }
    this.drawWind();
    this.drawChatMessages();
    this.drawTooltip();
  }
  drawParachute(player) {
    if (!player.falling || player.parachutes <= 0) return;
    const startX = player.x + Math.floor((player.width - PARACHUTE_ICON[0].length) / 2);
    const startY = player.turretY(0) - PARACHUTE_ICON.length;
    const drawX = Math.max(0, startX);
    const drawY = Math.max(0, startY);
    const drawW = Math.min(PARACHUTE_ICON[0].length, WIDTH - drawX);
    const drawH = Math.min(PARACHUTE_ICON.length, HEIGHT - drawY);
    if (drawW <= 0 || drawH <= 0) return;
    const data = this.ctx.getImageData(
      drawX,
      drawY,
      drawW,
      drawH
    );
    for (let y = 0; y < PARACHUTE_ICON.length; y++) {
      for (let x = 0; x < PARACHUTE_ICON[y].length; x++) {
        if (!PARACHUTE_ICON[y][x]) continue;
        const dx = startX + x - drawX;
        const dy = startY + y - drawY;
        if (dx < 0 || dy < 0 || dx >= data.width || dy >= data.height) continue;
        writePixel(data.data, dy * data.width + dx, WHITE);
      }
    }
    this.ctx.putImageData(data, drawX, drawY);
  }
  startGalslaMode() {
    if (this.galslaMode) return;
    this.galslaMode = true;
    const tick = () => {
      if (!this.galslaMode) return;
      for (const player of this.players) {
        if (!player.alive) continue;
        player.x += (Math.random() > 0.5 ? 1 : -1) * Math.trunc(Math.random() * 4);
        player.y += (Math.random() > 0.51 ? 1 : -1) * Math.trunc(Math.random() * 4);
        player.angle = (player.angle + 10) % 180;
        player.x = Math.max(0, Math.min(WIDTH - player.width, player.x));
        player.y = Math.max(15, Math.min(HEIGHT - player.height, player.y));
      }
      this.drawWorld();
      this.galslaTimer = setTimeout(tick, 60);
    };
    tick();
  }
  addChatMessage(text) {
    this.chatMessages.push({ text, expires: Date.now() + 7500 });
    if (this.chatMessages.length > 8) this.chatMessages.splice(0, this.chatMessages.length - 8);
    this.drawWorld();
    this.scheduleChatRefresh();
  }
  scheduleChatRefresh() {
    if (this.chatTimer) clearTimeout(this.chatTimer);
    const now = Date.now();
    const next = this.chatMessages.reduce((soonest, message) => Math.min(soonest, message.expires), Infinity);
    if (!Number.isFinite(next)) {
      this.chatTimer = null;
      return;
    }
    this.chatTimer = setTimeout(() => {
      this.chatTimer = null;
      this.drawWorld();
      this.scheduleChatRefresh();
    }, Math.max(120, next - now + 20));
  }
  chatColor() {
    const bitmap = this.bitmap;
    let base = rgb(0, 0, 0);
    if (bitmap.backgroundKind === "plain") base = bitmap.plainColor;
    else if (bitmap.backgroundKind === "gradient") base = gradientStripColor(bitmap.gradientA, bitmap.gradientB, 48, 127);
    return cssColor(rgb(255 - ((base >> 16) & 255), 255 - ((base >> 8) & 255), 255 - (base & 255)));
  }
  drawChatMessages() {
    const now = Date.now();
    this.chatMessages = this.chatMessages.filter((message) => message.expires > now);
    if (!this.chatMessages.length) return;
    this.ctx.font = "12px Dialog, Arial, sans-serif";
    this.ctx.fillStyle = this.chatColor();
    this.ctx.strokeStyle = "#000";
    this.ctx.lineWidth = 2;
    for (let i = 0; i < this.chatMessages.length; i++) {
      const text = this.chatMessages[i].text;
      const y = 16 + i * 15;
      this.ctx.strokeText(text, 5, y);
      this.ctx.fillText(text, 5, y);
    }
  }
  drawWind() {
    if (this.wind === 0) return;
    const magnitude = String(Math.abs(this.wind));
    this.ctx.font = "bold 12px Dialog, Arial, sans-serif";
    this.ctx.fillStyle = "#ffff00";
    this.ctx.strokeStyle = "#ffff00";
    this.ctx.lineWidth = 1;
    const textWidth = Math.ceil(this.ctx.measureText(magnitude).width);
    const x = WIDTH - textWidth - 48;
    const y = 14;
    const shaftStart = this.wind < 0 ? x + 14 : x;
    const shaftEnd = this.wind < 0 ? x : x + 14;
    this.ctx.beginPath();
    this.ctx.moveTo(shaftStart + 0.5, y + 0.5);
    this.ctx.lineTo(shaftEnd + 0.5, y + 0.5);
    this.ctx.stroke();
    this.ctx.beginPath();
    if (this.wind < 0) {
      this.ctx.moveTo(x + 0.5, y + 0.5);
      this.ctx.lineTo(x + 5.5, y - 3.5);
      this.ctx.lineTo(x + 5.5, y + 4.5);
    } else {
      this.ctx.moveTo(x + 14.5, y + 0.5);
      this.ctx.lineTo(x + 9.5, y - 3.5);
      this.ctx.lineTo(x + 9.5, y + 4.5);
    }
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.fillText(magnitude, x + 21, 18);
  }
  drawTank(player) {
    const data = this.ctx.getImageData(player.x, player.y, player.width, player.height);
    for (let r = 1; r < player.sprite.length; r++) {
      for (let c = 0; c < player.sprite[r].length; c++) {
        let color = player.sprite[r][c];
        if (color === 0 || color === TURRET_COLOR) continue;
        if (color === TANK_COLOR) color = PLAYER_COLORS[player.id];
        const idx = ((r - 1) * player.width + c) * 4;
        writePixel(data.data, idx / 4, color);
      }
    }
    this.ctx.putImageData(data, player.x, player.y);
    const x1 = player.x + player.sprite[0][0];
    const y1 = player.y + player.sprite[0][1];
    const x2 = player.turretX(1);
    const y2 = player.turretY(1);
    const tx = Math.max(0, Math.min(x1, x2));
    const ty = Math.max(0, Math.min(y1, y2));
    const tw = Math.min(WIDTH, Math.max(x1, x2) + 1) - tx;
    const th = Math.min(HEIGHT, Math.max(y1, y2) + 1) - ty;
    if (tw <= 0 || th <= 0) return;
    const turretData = this.ctx.getImageData(tx, ty, tw, th);
    writeLine(
      turretData.data,
      tw,
      th,
      x1 - tx,
      y1 - ty,
      x2 - tx,
      y2 - ty,
      PLAYER_COLORS[player.id]
    );
    this.ctx.putImageData(turretData, tx, ty);
  }
  drawShield(player) {
    if (!player.shield) return;
    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;
    const width = player.width + 7 + player.shield.thickness * 2;
    const height = player.height + 7 + player.shield.thickness * 2;
    this.ctx.save();
    this.ctx.strokeStyle = "#d8d8d8";
    this.ctx.lineWidth = Math.max(1, player.shield.thickness);
    this.ctx.globalAlpha = 0.8;
    this.ctx.beginPath();
    this.ctx.ellipse(centerX, centerY, width / 2, height / 2, 0, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();
  }
  getTankAt(x, y) {
    return this.players.find((player) => {
      if (!player.alive) return false;
      if (x < player.x || x >= player.x + player.width || y < player.y || y >= player.y + player.height) return false;
      const row = y - player.y + 1;
      const col = x - player.x;
      return !!player.sprite[row]?.[col];
    }) ?? null;
  }
  setHover(x, y) {
    this.hoverX = x;
    this.hoverY = y;
    this.hoverPlayer = this.getTankAt(x, y);
    this.drawWorld();
  }
  drawTooltip() {
    if (!this.hoverPlayer || !this.hoverPlayer.alive) return;
    let tip = `${this.hoverPlayer.name} ${formatPercent(this.hoverPlayer.powerLimit / MAX_POWER * 100)}%`;
    if (this.hoverPlayer.shield) {
      tip += ` Shield ${formatPercent(this.hoverPlayer.shield.strength / this.hoverPlayer.shield.maxStrength * 100)}%`;
    }
    this.ctx.font = "12px Dialog, Arial, sans-serif";
    const width = Math.ceil(this.ctx.measureText(tip).width) + 6;
    const height = 18;
    const x = Math.min(this.hoverX, WIDTH - width - 1);
    const y = Math.max(0, this.hoverY - height);
    this.ctx.fillStyle = "rgb(255,255,223)";
    this.ctx.fillRect(x, y, width, height);
    this.ctx.strokeStyle = "#000";
    this.ctx.strokeRect(x + 0.5, y + 0.5, width, height);
    this.ctx.fillStyle = "#000";
    this.ctx.fillText(tip, x + 3, y + 13);
  }
  render(message = "") {
    this.drawWorld();
    updateUi(this, message);
  }
  networkTurnControlled() {
    const net = globalThis.multiplayerSession;
    return !!(net?.started && net.game === this);
  }
  finishShot(message, firedPlayerId = this.active) {
    this.animating = false;
    if (this.roundOver) {
      setControlsDisabled(this.networkTurnControlled());
      this.drawWorld();
      updateDebugConsole(this);
      return;
    }
    if (this.networkTurnControlled()) {
      const waitingForServerTurn = this.active === firedPlayerId;
      setControlsDisabled(waitingForServerTurn);
      const active = this.players[this.active];
      this.render(waitingForServerTurn ? message : (active ? `${active.name}'s turn.` : message));
      if (!waitingForServerTurn) this.scheduleAiTurn();
      return;
    }
    setControlsDisabled(false);
    this.render(message);
    this.scheduleAiTurn();
  }
  async fire() {
    if (this.animating || this.roundOver) return;
    const player = this.players[this.active];
    if (!player || !player.alive) return;
    if (!this.ensureUsableWeapon(player)) return;
    const firedPlayerId = this.active;
    this.animating = true;
    setControlsDisabled(true);
    beep(170, 0.04);
    const weapon = WEAPONS[this.weapon];
    player.lastWeapon = this.weapon;
    player.preferredWeapon = this.weapon;
    if (!weapon.infinite) player.weapons[this.weapon] = Math.max(0, player.weapons[this.weapon] - 1);
    const useTracer = player.tracer && player.items[5] > 0;
    if (useTracer) {
      player.items[5]--;
      if (player.items[5] <= 0) player.tracer = false;
    }
    if (weapon.kind === "mirv") {
      await this.fireMirv(player, weapon, useTracer);
      this.finishShot("Turn complete.", firedPlayerId);
      return;
    }
    if (weapon.kind === "laser") {
      await this.fireLaser(player, weapon);
      this.finishShot("Turn complete.", firedPlayerId);
      return;
    }
    const startX = player.turretX(2);
    const startY = HEIGHT - player.turretY(2);
    const angle = player.angle * Math.PI / 180;
    const speed = player.power / 8;
    const vx0 = speed * Math.cos(angle);
    const vy0 = speed * Math.sin(angle);
    let step = 0;
    let prevX = startX;
    let prevY = HEIGHT - startY;
    const tracerTrail = useTracer ? [[prevX, prevY]] : null;
    if (tracerTrail) this.tracerTrails.push(tracerTrail);
    let hit = null;
    this.render(`${player.name} fires ${weapon.name}.`);
    while (!hit) {
      const x = Math.trunc(startX + (this.wind + vx0) * step * STEP_SIZE);
      const y = Math.trunc(HEIGHT - (startY + step * STEP_SIZE * (vy0 - 0.5 * EARTH_GRAVITY * step * STEP_SIZE)));
      if (x < 0 || x >= WIDTH) break;
      if (y >= HEIGHT) {
        hit = { x, y: HEIGHT - 1 };
        if (tracerTrail) tracerTrail.push([hit.x, hit.y]);
        break;
      }
      if (y >= 0 && prevY >= 0 && step > 0) hit = this.intersectShot(prevX, prevY, x, y);
      if (tracerTrail) tracerTrail.push(hit ? [hit.x, hit.y] : [x, y]);
      this.drawWorld();
      this.ctx.fillStyle = "#fff";
      this.ctx.fillRect(x - 1, y - 1, 3, 3);
      prevX = x;
      prevY = y;
      step += 2;
      await sleep(18);
    }
    if (hit && weapon.kind === "roller") await this.rollAndExplode(hit.x, hit.y, vx0, weapon, player);
    else if (hit && weapon.kind === "napalm") await this.napalm(hit.x, hit.y, weapon, player);
    else if (hit && weapon.kind === "sand") await this.sandExplosion(hit.x, hit.y, weapon, player);
    else if (hit && weapon.kind === "digger") await this.diggerExplosion(hit.x, hit.y, weapon, player);
    else if (hit && weapon.kind === "funky") await this.funkyExplosion(hit.x, hit.y, weapon, player);
    else if (hit) await this.explode(hit.x, hit.y, weapon.radius, player, weapon);
    else this.nextTurn("Missile left the field.");
    this.finishShot(hit ? "Turn complete." : "Missile left the field.", firedPlayerId);
  }
  drawTracerTrails() {
    for (const trail of this.tracerTrails) this.drawTracerTrail(trail);
  }
  drawTracerTrail(points) {
    if (points.length < 2) return;
    this.ctx.save();
    this.ctx.strokeStyle = "#ffff00";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(points[0][0] + 0.5, points[0][1] + 0.5);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i][0] + 0.5, points[i][1] + 0.5);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }
  ensureUsableWeapon(player) {
    if ((player.weapons[this.weapon] ?? 0) > 0) return true;
    this.weapon = preferredWeaponFor(player, this.weapon);
    updateUi(this, "Out of ammo.");
    return false;
  }
  async fireMirv(player, weapon, useTracer = false) {
    const startX = player.turretX(2);
    const startY = HEIGHT - player.turretY(2);
    const angle = player.angle * Math.PI / 180;
    const speed = player.power / 8;
    const vx0 = speed * Math.cos(angle);
    const vy0 = speed * Math.sin(angle);
    let step = 0;
    let prevX = startX;
    let prevY = HEIGHT - startY;
    let apex = null;
    const mainTrail = useTracer ? [[startX, HEIGHT - startY]] : null;
    if (mainTrail) this.tracerTrails.push(mainTrail);
    this.render(`${player.name} fires ${weapon.name}.`);
      while (!apex) {
      const x = Math.trunc(startX + (this.wind + vx0) * step * STEP_SIZE);
      const worldY = startY + step * STEP_SIZE * (vy0 - 0.5 * EARTH_GRAVITY * step * STEP_SIZE);
      const y = Math.trunc(HEIGHT - worldY);
      if (x < 0 || x >= WIDTH) return this.nextTurn("Missile left the field.");
      if (y >= HEIGHT) {
        if (mainTrail) mainTrail.push([x, HEIGHT - 1]);
        await this.explode(x, HEIGHT - 1, weapon.radius, player, { ...weapon, kind: "simple" });
        return;
      }
      const hit = y >= 0 && prevY >= 0 && step > 0 ? this.intersectShot(prevX, prevY, x, y) : null;
      if (hit) {
        if (mainTrail) mainTrail.push([hit.x, hit.y]);
        await this.explode(hit.x, hit.y, weapon.radius, player, { ...weapon, kind: "simple" });
        return;
      }
      if (step > 4 && y > prevY) apex = { x, y, worldY };
      if (mainTrail) mainTrail.push([x, y]);
      this.drawWorld();
      this.ctx.fillStyle = "#fff";
      this.ctx.fillRect(x - 1, y - 1, 3, 3);
      prevX = x;
      prevY = y;
      step += 2;
      await sleep(18);
    }

    const particles = [];
    let power = vx0 - 5 * weapon.particles / 2;
    for (let i = 0; i < weapon.particles; i++) {
      const trail = useTracer ? [[apex.x, apex.y]] : null;
      if (trail) this.tracerTrails.push(trail);
      particles.push({ startX: apex.x, startY: HEIGHT - apex.y, vx: power, step: 0, done: false, prevX: apex.x, prevY: apex.y, trail });
      power += 5;
    }

    const impacts = [];
    let active = true;
    while (active) {
      active = false;
      this.drawWorld();
      for (const particle of particles) {
        if (particle.done) continue;
        active = true;
        const x = Math.trunc(particle.startX + (this.wind + particle.vx) * particle.step * STEP_SIZE);
        const y = Math.trunc(HEIGHT - (particle.startY + particle.step * STEP_SIZE * (0 - 0.5 * EARTH_GRAVITY * particle.step * STEP_SIZE)));
        if (x < 0 || x >= WIDTH) {
          particle.done = true;
          continue;
        }
        if (y >= HEIGHT) {
          particle.done = true;
          if (particle.trail) particle.trail.push([x, HEIGHT - 1]);
          impacts.push({ x, y: HEIGHT - 1, radius: weapon.radius, weapon: { ...weapon, kind: "simple" } });
          continue;
        }
        const hit = y >= 0 && particle.prevY >= 0 && particle.step > 0 ? this.intersectShot(particle.prevX, particle.prevY, x, y) : null;
        if (hit) {
          particle.done = true;
          if (particle.trail) particle.trail.push([hit.x, hit.y]);
          impacts.push({ x: hit.x, y: hit.y, radius: weapon.radius, weapon: { ...weapon, kind: "simple" } });
          continue;
        }
        if (particle.trail) particle.trail.push([x, y]);
        this.ctx.fillStyle = "#fff";
        this.ctx.fillRect(x - 1, y - 1, 3, 3);
        particle.prevX = x;
        particle.prevY = y;
        particle.step += 2;
      }
      await sleep(18);
    }
    if (impacts.length) await this.explodeMany(impacts, player);
    this.nextTurn("MIRV complete.");
  }
  laserEndpoint(player, weapon) {
    const startX = player.turretX(2);
    const startY = player.turretY(2);
    const angle = player.angle * Math.PI / 180;
    const range = Math.max(80, Math.round(player.power * 0.9));
    const dx = Math.cos(angle);
    const dy = -Math.sin(angle);
    let endX = startX + dx * range;
    let endY = startY + dy * range;
    const scales = [];
    if (dx > 0) scales.push((WIDTH - 1 - startX) / dx);
    if (dx < 0) scales.push((0 - startX) / dx);
    if (dy > 0) scales.push((HEIGHT - 1 - startY) / dy);
    if (dy < 0) scales.push((0 - startY) / dy);
    const clip = Math.min(range, ...scales.filter((value) => value >= 0));
    if (Number.isFinite(clip)) {
      endX = startX + dx * clip;
      endY = startY + dy * clip;
    }
    return {
      x1: Math.trunc(startX),
      y1: Math.trunc(startY),
      x2: Math.trunc(endX),
      y2: Math.trunc(endY)
    };
  }
  async fireLaser(player, weapon) {
    beep(460, 0.08);
    const beam = this.laserEndpoint(player, weapon);
    this.render(`${player.name} fires Laser.`);
    for (let frame = 0; frame < 16; frame++) {
      this.drawWorld();
      this.drawLaserBeam(beam, weapon.beamWidth ?? 5, frame);
      await sleep(frame < 5 ? 28 : 22);
    }
    this.carveLaserBeam(beam, weapon.beamWidth ?? 5);
    const deaths = this.damageLaserPlayers(beam, weapon, player);
    const minX = Math.max(0, Math.min(beam.x1, beam.x2) - (weapon.beamWidth ?? 5) - 1);
    const maxX = Math.min(WIDTH, Math.max(beam.x1, beam.x2) + (weapon.beamWidth ?? 5) + 1);
    this.drop(minX, maxX);
    await this.settleTanks(player);
    for (const dead of deaths) await this.randomTankExplosion(dead);
    this.nextTurn("Laser complete.");
  }
  drawLaserBeam(beam, width, frame) {
    this.ctx.save();
    this.ctx.lineCap = "round";
    this.ctx.globalCompositeOperation = "source-over";
    const colors = ["#ffffff", "#ffff00", "#ff2b00"];
    const pulse = 0.75 + 0.25 * Math.sin(frame * 1.7);
    for (let i = width + 4; i >= 1; i -= 2) {
      const color = colors[Math.min(colors.length - 1, Math.floor((width + 4 - i) / 3))];
      this.ctx.strokeStyle = color;
      this.ctx.globalAlpha = i > width ? 0.22 * pulse : 0.9;
      this.ctx.lineWidth = i;
      this.ctx.beginPath();
      this.ctx.moveTo(beam.x1 + 0.5, beam.y1 + 0.5);
      this.ctx.lineTo(beam.x2 + 0.5, beam.y2 + 0.5);
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1;
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = frame % 2 === 0 ? "#ffffff" : "#ffff66";
    this.ctx.beginPath();
    this.ctx.moveTo(beam.x1 + 0.5, beam.y1 + 0.5);
    this.ctx.lineTo(beam.x2 + 0.5, beam.y2 + 0.5);
    this.ctx.stroke();
    this.ctx.restore();
  }
  carveLaserBeam(beam, width) {
    this.bitmap.setColor(null);
    const radius = Math.max(1, Math.floor(width / 2));
    this.forEachLaserPoint(beam, (x, y) => this.bitmap.fillCircle(x, y, radius));
  }
  damageLaserPlayers(beam, weapon, shooter) {
    const deaths = [];
    const radius = Math.max(1, Math.floor((weapon.beamWidth ?? 5) / 2));
    for (const player of this.players) {
      if (!player.alive) continue;
      const hit = this.laserHitsPlayer(beam, radius, player);
      if (!hit) continue;
      const center = this.tankCenter(player);
      const centerDistance = pointToSegmentDistance(center.x, center.y, beam.x1, beam.y1, beam.x2, beam.y2);
      const damage = Math.max(500, Math.round((weapon.damage ?? 880) - centerDistance * 12));
      const applied = this.applyDamage(player, damage);
      if (player !== shooter) this.recordDamage(shooter, player, applied);
      if (player.powerLimit < MIN_POWER) {
        player.alive = false;
        deaths.push(player);
        this.recordKill(shooter, player);
      }
    }
    return deaths;
  }
  laserHitsPlayer(beam, radius, player) {
    const minX = Math.max(beam.x1, beam.x2) < player.x - radius || Math.min(beam.x1, beam.x2) > player.x + player.width + radius;
    const minY = Math.max(beam.y1, beam.y2) < player.y - radius || Math.min(beam.y1, beam.y2) > player.y + player.height + radius;
    if (minX || minY) return false;
    let hit = false;
    this.forEachLaserPoint(beam, (x, y) => {
      if (hit) return;
      for (let oy = -radius; oy <= radius && !hit; oy++) {
        for (let ox = -radius; ox <= radius; ox++) {
          if (ox * ox + oy * oy > radius * radius) continue;
          const px = x + ox;
          const py = y + oy;
          if (px < player.x || py < player.y || px >= player.x + player.width || py >= player.y + player.height) continue;
          const row = py - player.y + 1;
          const col = px - player.x;
          if (player.sprite[row]?.[col]) {
            hit = true;
            break;
          }
        }
      }
    });
    return hit;
  }
  forEachLaserPoint(beam, visit) {
    let x1 = beam.x1;
    let y1 = beam.y1;
    const x2 = beam.x2;
    const y2 = beam.y2;
    let dx = Math.abs(x2 - x1);
    let sx = x1 < x2 ? 1 : -1;
    let dy = -Math.abs(y2 - y1);
    let sy = y1 < y2 ? 1 : -1;
    let err = dx + dy;
    while (true) {
      visit(x1, y1);
      if (x1 === x2 && y1 === y2) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x1 += sx; }
      if (e2 <= dx) { err += dx; y1 += sy; }
    }
  }
  async funkyExplosion(x, y, weapon, shooter, completeTurn = true) {
    const colors = [rgb(255, 0, 0), rgb(255, 200, 0), rgb(255, 255, 0), rgb(0, 255, 0), rgb(0, 127, 255), rgb(0, 0, 255)];
    const particles = [];
    const count = weapon.particles ?? 6;
    for (let i = 0; i < count; i++) {
      const power = this.rand.int(500) / 8;
      const angleDeg = 20 + this.rand.int(140);
      const angle = angleDeg * Math.PI / 180;
      const xoffset = Math.trunc(Math.cos(angle) * 5);
      const yoffset = Math.trunc(Math.sin(angle) * 5);
      particles.push({
        startX: x + xoffset,
        startY: HEIGHT - y + yoffset,
        vx0: power * Math.cos(angle),
        vy0: power * Math.sin(angle),
        step: 0,
        prevX: x + xoffset,
        prevY: y - yoffset,
        done: false,
        color: colors[i % colors.length],
        trail: [[x + xoffset, y - yoffset]]
      });
    }

    const impacts = [];
    let active = true;
    while (active || impacts.some((impact) => impact.frame <= 24)) {
      active = false;
      this.drawWorld();
      for (const impact of impacts) {
        if (impact.frame <= 24) {
          this.drawColorStrip(impact.x, impact.y, 30, impact.color, impact.frame++);
        }
      }
      this.drawFunkyTrails(particles);
      for (const particle of particles) {
        if (particle.done) continue;
        active = true;
        const sx = particle.startX + (this.wind + particle.vx0) * particle.step * STEP_SIZE;
        const sy = particle.startY + particle.step * STEP_SIZE * (particle.vy0 - 0.5 * EARTH_GRAVITY * particle.step * STEP_SIZE);
        const px = Math.trunc(sx);
        const py = Math.trunc(HEIGHT - sy);
        if (px < 0 || px >= WIDTH) {
          particle.done = true;
          continue;
        }
        if (py >= HEIGHT) {
          particle.done = true;
          impacts.push({ x: px, y: HEIGHT - 1, color: particle.color, frame: 0 });
          continue;
        }
        const hit = py >= 0 && particle.prevY >= 0 && particle.step > 3 ? this.intersectShot(particle.prevX, particle.prevY, px, py) : null;
        if (hit) {
          particle.trail.push([hit.x, hit.y]);
          particle.done = true;
          impacts.push({ x: hit.x, y: hit.y, color: particle.color, frame: 0 });
          continue;
        }
        if (py >= 0) {
          particle.trail.push([px, py]);
        }
        particle.prevX = px;
        particle.prevY = py;
        particle.step += 1;
      }
      await sleep(18);
    }

    this.bitmap.setColor(null);
    const deaths = new Set();
    for (const impact of impacts) {
      this.bitmap.fillCircle(impact.x, impact.y, 30);
      for (const player of this.damagePlayers(impact.x, impact.y, 30, shooter)) deaths.add(player);
    }
    this.drop(0, WIDTH);
    await this.settleTanks(shooter);
    for (const player of deaths) await this.randomTankExplosion(player);
    await this.explode(x, y, Math.round(count * 10), shooter, { ...weapon, kind: "simple" }, completeTurn);
  }
  drawFunkyTrails(particles) {
    this.ctx.save();
    this.ctx.strokeStyle = "#ffff00";
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.95;
    for (const particle of particles) {
      if (particle.trail.length < 2) continue;
      this.ctx.beginPath();
      this.ctx.moveTo(particle.trail[0][0] + 0.5, particle.trail[0][1] + 0.5);
      for (let i = 1; i < particle.trail.length; i++) {
        this.ctx.lineTo(particle.trail[i][0] + 0.5, particle.trail[i][1] + 0.5);
      }
      this.ctx.stroke();
    }
    this.ctx.restore();
  }
  drawColorStrip(x, y, radius, color, frame) {
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const paletteScale = (1 + steps - ((frame + i) % steps)) / (steps + 1);
      const radiusScale = (steps - i) / steps;
      this.ctx.fillStyle = cssColor(scaleColor(color, paletteScale));
      this.ctx.beginPath();
      this.ctx.arc(x, y, Math.max(1, Math.floor(radius * radiusScale)), 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  intersectShot(x1, y1, x2, y2) {
    let dx = Math.abs(x2 - x1);
    let sx = x1 < x2 ? 1 : -1;
    let dy = -Math.abs(y2 - y1);
    let sy = y1 < y2 ? 1 : -1;
    let err = dx + dy;
    while (true) {
      if (y1 >= 0 && this.isSolidForShot(x1, y1)) return { x: x1, y: y1 };
      if (x1 === x2 && y1 === y2) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x1 += sx; }
      if (e2 <= dx) { err += dx; y1 += sy; }
    }
    return null;
  }
  isSolidForShot(x, y) {
    if (!this.bitmap.isBackground(x, y)) return true;
    for (const player of this.players) {
      if (!player.alive) continue;
      if (x < player.x || y < player.y || x >= player.x + player.width || y >= player.y + player.height) continue;
      const row = y - player.y + 1;
      const col = x - player.x;
      if (player.sprite[row]?.[col]) return true;
    }
    return false;
  }
  async rollAndExplode(x, y, speed, weapon, shooter) {
    const halfW = 2;
    const halfH = 2;
    let direction = 0;
    let frame = 0;
    y -= halfH;
    const canRollColumn = (cx) => {
      for (let yy = y - halfH; yy < y + halfH; yy++) {
        if (!this.bitmap.isBackground(cx, yy)) return false;
      }
      return true;
    };
    const hitsTank = () => this.players.some((player) => {
      if (!player.alive) return false;
      return x + halfW >= player.x && x - halfW < player.x + player.width &&
        y + halfH >= player.y && y - halfH < player.y + player.height;
    });
    for (let ticks = 0; ticks < 520; ticks++) {
      let falling = true;
      for (let i = 0; i < halfW * 2 && falling; i++) {
        falling = this.bitmap.isBackground(x - halfW + i, y + halfH);
      }
      if (falling) {
        y++;
      } else if (direction === 0) {
        if (speed < 0) direction = canRollColumn(x - halfW) ? -1 : (canRollColumn(x + halfW) ? 1 : 0);
        else direction = canRollColumn(x + halfW) ? 1 : (canRollColumn(x - halfW) ? -1 : 0);
        x += direction;
      } else if (canRollColumn(x + direction * (halfW + 1))) {
        x += direction;
      } else {
        break;
      }
      if (hitsTank()) break;
      this.drawWorld();
      this.drawRollerSprite(x, y, frame++);
      await sleep(28);
    }
    await this.explode(x, y, weapon.radius, shooter, { ...weapon, kind: "simple" });
  }
  drawRollerSprite(x, y, frame) {
    const a = frame % 2 === 0;
    const pixels = a
      ? [[0, WHITE, 0, 0], [WHITE, 0, WHITE, 0], [0, WHITE, 0, WHITE], [0, 0, WHITE, 0]]
      : [[0, 0, WHITE, 0], [0, WHITE, 0, WHITE], [WHITE, 0, WHITE, 0], [0, WHITE, 0, 0]];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (!pixels[row][col]) continue;
        this.ctx.fillStyle = cssColor(pixels[row][col]);
        this.ctx.fillRect(x - 2 + col, y - 2 + row, 1, 1);
      }
    }
  }
  async napalm(x, y, weapon, shooter) {
    const color = weapon.hot ? rgb(254, 254, 0) : rgb(200, 200, 0);
    const budget = weapon.hot ? 280 : 140;
    const burnDuration = weapon.hot ? 210 : 120;
    const cells = new Set();
    const addCell = (cx, cy, force = false) => {
      if (cx < 0 || cx >= WIDTH || cy < 0 || cy >= HEIGHT || (!force && !this.bitmap.isBackground(cx, cy))) return false;
      const key = `${cx},${cy}`;
      if (cells.has(key)) return false;
      cells.add(key);
      this.bitmap.setPixel(cx, cy, color);
      return true;
    };
    let seedY = Math.min(HEIGHT - 1, Math.max(0, y));
    addCell(x, seedY, true);
    const frontier = [{ x, y: seedY, left: x, right: x }];
    this.bitmap.setColor(null);
    this.bitmap.setPixel(x - 1, seedY);
    this.bitmap.setPixel(x + 1, seedY);
    this.bitmap.setPixel(x, seedY - 1);

    let used = 1;
    while (used < budget) {
      if (!frontier.length) {
        const edge = this.findNapalmEdge([...cells].map((key) => key.split(",").map(Number)));
        if (!edge) break;
        frontier.push(edge);
      }
      for (let i = 0; i < 4 && frontier.length && used < budget; i++) {
        const line = frontier.shift();
        let expanded = false;
        if (this.bitmap.isBackground(line.left, line.y + 1)) {
          if (addCell(line.left, line.y + 1)) {
            frontier.push({ x: line.left, y: line.y + 1, left: line.left, right: line.left });
            used++;
            expanded = true;
          }
        } else if (this.bitmap.isBackground(line.right, line.y + 1)) {
          if (addCell(line.right, line.y + 1)) {
            frontier.push({ x: line.right, y: line.y + 1, left: line.right, right: line.right });
            used++;
            expanded = true;
          }
        } else {
          if (addCell(line.left - 1, line.y)) {
            line.left--;
            used++;
            expanded = true;
          }
          if (used < budget && addCell(line.right + 1, line.y)) {
            line.right++;
            used++;
            expanded = true;
          }
          if (!expanded && this.bitmap.isBackground(line.x, line.y - 1) && addCell(line.x, line.y - 1)) {
            frontier.push({ x: line.x, y: line.y - 1, left: line.x, right: line.x });
            used++;
            expanded = true;
          }
          if (expanded) frontier.push(line);
        }
      }
      this.drawWorld();
      await sleep(18);
    }

    const cellList = [...cells].map((key) => key.split(",").map(Number));
    if (!cellList.length) {
      this.nextTurn("Napalm complete.");
      return;
    }
    const minX = Math.max(0, Math.min(...cellList.map(([cx]) => cx)) - 1);
    const maxX = Math.min(WIDTH - 1, Math.max(...cellList.map(([cx]) => cx)) + 1);
    const minY = Math.max(0, Math.min(...cellList.map(([, cy]) => cy)) - (weapon.hot ? 95 : 70));
    const maxY = Math.min(HEIGHT - 1, Math.max(...cellList.map(([, cy]) => cy)) + 2);
    const fireW = maxX - minX + 1;
    const fireH = maxY - minY + 1;
    let fireA = new Uint8Array(fireW * fireH);
    let fireB = new Uint8Array(fireW * fireH);
    const surface = this.napalmSurface(cellList);
    for (let frame = 0; frame < burnDuration; frame++) {
      this.drawWorld();
      fireB.fill(0);
      const energy = Math.max(20, Math.floor(220 * (1 - frame / (burnDuration + 24))));
      for (const [sx, sy] of surface) {
        const fx = sx - minX;
        const fy = sy - minY;
        fireA[fy * fireW + fx] = Math.max(fireA[fy * fireW + fx], energy + this.rand.int(35));
      }
      for (let fy = fireH - 2; fy >= 1; fy--) {
        for (let fx = 1; fx < fireW - 1; fx++) {
          const below = fireA[(fy + 1) * fireW + fx];
          const b1 = fireA[(fy + 1) * fireW + fx - 1];
          const b2 = fireA[(fy + 1) * fireW + fx + 1];
          const same = fireA[fy * fireW + fx];
          const value = Math.max(0, Math.floor((below + b1 + b2 + same) / 4) - (this.rand.int(5) + 1));
          fireB[fy * fireW + fx] = value;
        }
      }
      [fireA, fireB] = [fireB, fireA];
      for (let fy = 0; fy < fireH; fy++) {
        for (let fx = 0; fx < fireW; fx++) {
          const value = fireA[fy * fireW + fx];
          if (value < 8) continue;
          this.ctx.fillStyle = napalmColor(value);
          this.ctx.fillRect(minX + fx, minY + fy, 1, 1);
        }
      }
      await sleep(24);
    }
    await this.damageNapalm(cellList, weapon, shooter);
    this.bitmap.setColor(null);
    for (const [cx, cy] of cellList) this.bitmap.setPixel(cx, cy);
    this.drop(minX, maxX);
    await this.settleTanks(shooter);
    this.nextTurn("Napalm complete.");
  }
  async sandExplosion(x, y, weapon, shooter = null, completeTurn = true) {
    let currentSize = 3;
    let yl = y;
    const size = 250;
    let lineCount = 0;
    while (yl >= 0 && lineCount < size) {
      this.drawWorld();
      this.ctx.strokeStyle = cssColor(this.groundColor);
      for (let i = 0; i <= 7 && yl >= 0 && lineCount < size; i++) {
        this.ctx.globalAlpha = 0.35;
        this.ctx.beginPath();
        this.ctx.moveTo(x - Math.floor(currentSize / 2), yl);
        this.ctx.lineTo(x + Math.floor(currentSize / 2), yl);
        this.ctx.stroke();

        this.bitmap.setDensity(0.2);
        this.bitmap.setColor(this.groundColor);
        this.bitmap.drawLine(x - Math.floor(currentSize / 2), yl, x + Math.floor(currentSize / 2), yl);
        this.bitmap.setDensity(1);

        lineCount++;
        yl--;
        currentSize++;
      }
      this.ctx.globalAlpha = 1;
      await sleep(28);
    }
    this.drop(x - Math.floor(currentSize / 2) - 1, x + Math.floor(currentSize / 2) + 1);
    await this.settleTanks(shooter);
    if (completeTurn) this.nextTurn("Sand bomb complete.");
  }
  async diggerExplosion(x, y, weapon, shooter = null, completeTurn = true) {
    const duration = weapon.duration ?? 1000;
    const num = 10;
    const xs = Array(num).fill(Math.floor(x));
    const ys = Array(num).fill(Math.floor(y));
    let minX = Math.floor(x), maxX = Math.floor(x), minY = Math.floor(y), maxY = Math.floor(y);
    let frameNum = 0;
    this.bitmap.setColor(null);
    while (frameNum < duration) {
      for (let burst = 0; burst < 80 && frameNum < duration; burst++) {
        for (let i = 0; i < num && frameNum < duration; i++) {
          const moved = this.stepDiggerWalker(xs, ys, i);
          if (moved) frameNum++;
          minX = Math.min(minX, xs[i] - 1);
          maxX = Math.max(maxX, xs[i] + 1);
          minY = Math.min(minY, ys[i] - 1);
          maxY = Math.max(maxY, ys[i] + 1);
          this.clearDiggerBrush(xs[i], ys[i]);
        }
      }
      this.drawWorld();
      this.ctx.fillStyle = "#101010";
      for (let i = 0; i < num; i++) this.ctx.fillRect(xs[i] - 1, ys[i] - 1, 3, 3);
      await sleep(18);
    }
    this.drop(minX - 2, maxX + 2);
    await this.settleTanks(shooter);
    if (completeTurn) this.nextTurn("Digger complete.");
  }
  napalmSurface(cells) {
    const cellSet = new Set(cells.map(([x, y]) => `${x},${y}`));
    return cells.filter(([x, y]) => !cellSet.has(`${x},${y - 1}`));
  }
  findNapalmEdge(cells) {
    const cellSet = new Set(cells.map(([x, y]) => `${x},${y}`));
    for (const [x, y] of cells) {
      const candidates = [[x, y + 1], [x - 1, y], [x + 1, y], [x, y - 1]];
      for (const [nx, ny] of candidates) {
        if (nx < 0 || nx >= WIDTH || ny < 0 || ny >= HEIGHT) continue;
        if (!cellSet.has(`${nx},${ny}`) && this.bitmap.isBackground(nx, ny)) {
          return { x: nx, y: ny, left: nx, right: nx };
        }
      }
    }
    return null;
  }
  async damageNapalm(cells, weapon, shooter) {
    const deaths = [];
    for (const player of this.players) {
      if (!player.alive) continue;
      const centerX = player.x + player.width / 2;
      const centerY = player.y + player.height / 2;
      let damage = 0;
      for (const [x, y] of cells) {
        const dist = (centerX - x) ** 2 + (centerY - y) ** 2;
        if (dist <= 800) damage += (800 - dist) ** 2;
      }
      damage = this.applyDamage(player, Math.floor(damage / (weapon.hot ? 50000 : 80000)));
      if (player !== shooter) this.recordDamage(shooter, player, damage);
      if (player.powerLimit < MIN_POWER) {
        player.alive = false;
        deaths.push(player);
        this.recordKill(shooter, player);
      }
    }
    for (const player of deaths) await this.randomTankExplosion(player);
  }
  async explode(x, y, radius, shooter, weapon = WEAPONS[this.weapon], completeTurn = true) {
    beep(70, 0.12);
    if (weapon.kind === "simple") await this.animateSimpleExplosion(x, y, radius);
    else {
      let c = 150;
      const cStep = c / radius;
      for (let r = 0; r < radius; r += 3) {
        this.drawWorld();
        this.drawExplosionFrame(x, y, r, radius, c, weapon);
        c -= cStep;
        await sleep(24);
      }
    }
    this.applyWeaponToBitmap(x, y, radius, weapon);
    const deaths = this.damagePlayers(x, y, radius, shooter);
    this.drop(0, WIDTH);
    await this.settleTanks(shooter);
    for (const player of deaths) {
      await this.randomTankExplosion(player);
    }
    if (completeTurn) this.nextTurn("Explosion complete.");
  }
  async animateSimpleExplosion(x, y, radius) {
    let counter = 0;
    let c = 150;
    const cStep = c / radius;
    while (counter < radius) {
      this.bitmap.setDensity(0.2);
      this.bitmap.setColor(rgb(255, Math.max(0, Math.trunc(c)), 0));
      this.bitmap.fillCircle(x, y, counter);
      this.bitmap.setColor(rgb(255, 255, 0));
      this.bitmap.drawCircle(x, y, Math.trunc(counter * 0.8));
      this.bitmap.setColor(DARK_GRAY);
      this.bitmap.drawCircle(x, y, Math.trunc(counter * 0.5));
      this.bitmap.setColor(null);
      this.bitmap.drawCircle(x, y, Math.trunc(counter * 0.3));
      this.bitmap.setDensity(1);
      this.drawWorld();
      c -= cStep;
      counter += 3;
      await sleep(40);
    }

    let density = 0.3;
    let rd = 0.2;
    while (rd <= 1) {
      this.bitmap.setDensity(density);
      this.bitmap.setColor(rgb(Math.trunc(255 * (1 - rd)), 0, 0));
      this.bitmap.fillCircle(x, y, radius);
      this.bitmap.setDensity(1);
      this.drawWorld();
      rd += density;
      await sleep(40);
    }
  }
  async explodeMany(impacts, shooter) {
    beep(70, 0.12);
    const maxRadius = Math.max(...impacts.map((impact) => impact.radius));
    for (let r = 0; r < maxRadius; r += 3) {
      this.drawWorld();
      for (const impact of impacts) {
        if (r <= impact.radius) {
          const c = 150 - (150 / impact.radius) * r;
          this.drawExplosionFrame(impact.x, impact.y, r, impact.radius, c, impact.weapon);
        }
      }
      await sleep(24);
    }
    const deaths = new Set();
    for (const impact of impacts) {
      this.applyWeaponToBitmap(impact.x, impact.y, impact.radius, impact.weapon);
      for (const player of this.damagePlayers(impact.x, impact.y, impact.radius, shooter)) deaths.add(player);
    }
    this.drop(0, WIDTH);
    await this.settleTanks(shooter);
    for (const player of deaths) await this.randomTankExplosion(player);
  }
  drawExplosionFrame(x, y, r, radius, c, weapon) {
    this.ctx.globalAlpha = 0.85;
    if (weapon.kind === "napalm") {
      this.ctx.fillStyle = `rgb(255, ${Math.max(20, Math.floor(c))}, 0)`;
      for (let dx = -r * 2; dx <= r * 2; dx += 6) {
        const h = Math.max(2, Math.floor((1 - Math.abs(dx) / Math.max(1, r * 2)) * radius * 0.55));
        this.ctx.fillRect(x + dx, y - h, 4, h * 2);
      }
    } else if (weapon.kind === "digger") {
      this.ctx.fillStyle = "#202020";
      for (let i = 0; i < 10; i++) {
        const px = x + Math.trunc(Math.cos(i * 2.4 + r) * Math.max(1, r * 0.5));
        const py = y + Math.trunc(r * 0.9 + Math.sin(i * 1.7 + r) * Math.max(1, r * 0.35));
        this.ctx.fillRect(px, py, 2, 2);
      }
    } else if (weapon.kind === "sand") {
      this.ctx.fillStyle = cssColor(this.groundColor);
      const width = Math.max(3, Math.floor(r * 1.6));
      for (let ly = 0; ly < r; ly += 7) {
        this.ctx.fillRect(x - Math.floor((width + ly) / 2), y - ly, width + ly, 1);
      }
    } else {
      this.ctx.fillStyle = `rgb(255, ${Math.max(0, Math.floor(c))}, 0)`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, r, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
    this.ctx.strokeStyle = weapon.kind === "digger" ? "#808080" : "#ffff00";
    this.ctx.beginPath();
    this.ctx.arc(x, y, Math.max(1, r * 0.8), 0, Math.PI * 2);
    this.ctx.stroke();
  }
  async randomTankExplosion(player) {
    switch (this.rand.int(7)) {
      case 0: return this.fireTankExplosion(player);
      case 1: return this.roundTankExplosion(player, 10);
      case 2: return this.roundTankExplosion(player, 60);
      case 3: return this.roundTankExplosion(player, 100);
      case 4: return this.sandExplosion(this.tankCenter(player).x, this.tankCenter(player).y, { kind: "sand" }, null, false);
      case 5: return this.laserTankExplosion(player);
      default: return this.funkyExplosion(this.tankCenter(player).x, this.tankCenter(player).y, { kind: "funky", particles: 6 }, player, false);
    }
  }
  tankCenter(player) {
    return { x: player.x + Math.floor(player.width / 2), y: player.y + Math.floor(player.height / 2) };
  }
  async roundTankExplosion(player, radius) {
    const { x, y } = this.tankCenter(player);
    await this.explode(x, y, radius, player, { kind: "simple", radius }, false);
  }
  async tankExplosion(player) {
    return this.roundTankExplosion(player, 18);
  }
  async fireTankExplosion(player) {
    const x = player.x + Math.floor(player.width / 2);
    const y = player.y + Math.floor(player.height / 2);
    const width = Math.max(8, Math.floor(player.width * 1.5));
    const height = Math.max(24, player.height * 4);
    const left = Math.floor(x - width / 2);
    const top = y - height;
    let intensity = 0;
    let state = 0;
    let fireA = new Uint8Array(width * height);
    let fireB = new Uint8Array(width * height);
    for (let frame = 0; frame < 95; frame++) {
      if (state === 0) {
        intensity += 0.009;
        if (intensity > 0.2) state = 1;
      } else if (state === 1 && frame >= 50) {
        state = 2;
      } else if (state === 2) {
        intensity -= 0.007;
        if (intensity <= 0) break;
      }

      for (let fy = 1; fy < height - 4; fy += 2) {
        for (let fx = 0; fx < width; fx++) {
          const i = fy * width + fx;
          const p = Math.min(fireA.length - 1, i + width * 2);
          const topSum = fireA[p] + fireA[Math.max(0, p - 1)] + fireA[Math.min(fireA.length - 1, p + 1)];
          const bottom = fireA[Math.min(fireA.length - 1, i + width * 4)];
          const c1 = Math.max(0, ((topSum + bottom) >> 2) - 1);
          const c2 = (c1 + bottom) >> 1;
          fireB[i] = c1;
          if (i + width < fireB.length) fireB[i + width] = c2;
        }
      }
      const generator = width * (height - 4);
      for (let fx = 0; fx < width; fx += 4) {
        const color = this.rand.int(Math.max(1, Math.floor(255 * intensity)));
        for (let gy = 0; gy < 4; gy++) {
          for (let gx = 0; gx < 4 && fx + gx < width; gx++) {
            fireB[generator + gy * width + fx + gx] = color;
          }
        }
      }
      [fireA, fireB] = [fireB, fireA];
      this.drawWorld();
      for (let fy = 0; fy < height; fy++) {
        for (let fx = 0; fx < width; fx++) {
          const value = fireA[fy * width + fx];
          if (value < 8) continue;
          this.ctx.fillStyle = napalmColor(value);
          this.ctx.fillRect(left + fx, top + fy, 1, 1);
        }
      }
      await sleep(24);
    }
    this.bitmap.setColor(null);
    this.bitmap.fillEllipsePreservingGround(x, y + 20, Math.floor(width / 2), 40);
    this.drop(0, WIDTH);
  }
  async laserTankExplosion(player) {
    const { x, y } = this.tankCenter(player);
    const beamWidth = player.width;
    let yl = y;
    for (let i = 0; i < 60; i++) {
      this.drawWorld();
      for (let dx = Math.floor(beamWidth / 2); dx >= 0; dx--) {
        const shade = (32 - dx + i) % 32;
        const c = 255 - Math.abs(16 - shade) * 10;
        this.ctx.strokeStyle = `rgb(${c}, ${c}, 255)`;
        this.ctx.beginPath();
        this.ctx.moveTo(x + dx, yl);
        this.ctx.lineTo(x + dx, y + 5);
        this.ctx.moveTo(x - dx, yl);
        this.ctx.lineTo(x - dx, y + 5);
        this.ctx.stroke();
      }
      if (yl > 0) yl = Math.max(0, yl - 7);
      await sleep(20);
    }
    this.bitmap.setColor(null);
    this.bitmap.fillRect(x - Math.floor(beamWidth / 2), 0, beamWidth + 1, y + 6);
    this.drop(0, WIDTH);
  }
  applyWeaponToBitmap(x, y, radius, weapon) {
    if (weapon.kind === "sand") {
      this.drawSandExplosionToBitmap(x, y, 250);
      return;
    }
    this.bitmap.setColor(null);
    if (weapon.kind === "digger") {
      this.drawDiggerExplosionToBitmap(x, y, weapon.duration ?? 1000);
      return;
    }
    if (weapon.kind === "napalm") {
      for (let dx = -radius * 2; dx <= radius * 2; dx++) {
        const drop = Math.floor((1 - Math.abs(dx) / (radius * 2)) * radius * 0.65);
        this.bitmap.drawLine(x + dx, y - drop, x + dx, y + drop);
      }
      return;
    }
    if (weapon.kind === "funky") {
      for (let i = 0; i < 6; i++) {
        const ox = Math.trunc((this.rand.next() - 0.5) * radius * 2);
        const oy = Math.trunc((this.rand.next() - 0.5) * radius * 2);
        this.bitmap.fillCircle(x + ox, y + oy, Math.max(8, Math.floor(radius * (0.35 + this.rand.next() * 0.35))));
      }
      return;
    }
    if (weapon.kind === "mirv") {
      for (let i = -2; i <= 2; i++) {
        this.bitmap.fillCircle(x + i * Math.floor(radius * 0.8), y + Math.abs(i) * Math.floor(radius * 0.18), radius);
      }
      return;
    }
    this.bitmap.fillCircle(x, y, radius);
  }
  drawSandExplosionToBitmap(x, y, size) {
    let currentSize = 3;
    let yl = Math.floor(y);
    let lineCount = 0;
    this.bitmap.setDensity(0.2);
    this.bitmap.setColor(this.groundColor);
    while (yl >= 0 && lineCount < size) {
      this.bitmap.drawLine(x - Math.floor(currentSize / 2), yl, x + Math.floor(currentSize / 2), yl);
      lineCount++;
      yl--;
      currentSize++;
    }
    this.bitmap.setDensity(1);
  }
  drawDiggerExplosionToBitmap(x, y, duration) {
    const num = 10;
    const xs = Array(num).fill(Math.floor(x));
    const ys = Array(num).fill(Math.floor(y));
    this.bitmap.setColor(null);
    let frameNum = 0;
    while (frameNum < duration) {
      for (let i = 0; i < num && frameNum < duration; i++) {
        if (this.stepDiggerWalker(xs, ys, i)) frameNum++;
        this.clearDiggerBrush(xs[i], ys[i]);
      }
    }
  }
  stepDiggerWalker(xs, ys, i) {
    const d = this.rand.int(4);
    if (d === 0 && this.bitmap.isGround(xs[i] + 2, ys[i])) {
      xs[i]++;
      return true;
    }
    if (d === 1 && this.bitmap.isGround(xs[i] - 2, ys[i])) {
      xs[i]--;
      return true;
    }
    if (d === 2 && this.bitmap.isGround(xs[i], ys[i] - 2)) {
      ys[i]--;
      return true;
    }
    if (d === 3) {
      ys[i]++;
      return true;
    }
    return false;
  }
  clearDiggerBrush(x, y) {
    this.bitmap.setPixel(x, y);
    this.bitmap.setPixel(x - 1, y);
    this.bitmap.setPixel(x + 1, y);
    this.bitmap.setPixel(x, y - 1);
    this.bitmap.setPixel(x, y + 1);
  }
  damagePlayers(x, y, radius, shooter) {
    const deaths = [];
    for (const player of this.players) {
      if (!player.alive) continue;
      const damage = this.applyDamage(player, this.roundDamage(player, x, y, radius));
      if (player !== shooter) this.recordDamage(shooter, player, damage);
      if (player.powerLimit < MIN_POWER) {
        player.alive = false;
        deaths.push(player);
        this.recordKill(shooter, player);
      }
    }
    return deaths;
  }
  recordDamage(shooter, victim, damage = 0) {
    if (!shooter || shooter === victim || damage <= 0) return;
    this.recordGain(shooter, 10 * Math.max(0, damage));
  }
  recordKill(shooter, victim) {
    if (!shooter) return;
    if (shooter === victim) {
      this.recordGain(shooter, -10000);
      return;
    }
    this.recordGain(shooter, this.playerBounty(victim));
    shooter.kills++;
    shooter.overallKills++;
    this.captureStatsSnapshot();
  }
  recordGain(player, gain) {
    player.cash += gain;
    player.earnedCash += gain;
    player.overallGain += gain;
    this.captureStatsSnapshot();
  }
  playerBounty(player) {
    if (player?.ai) return [10000, 20000, 30000][player.aiType] ?? 10000;
    return 40000;
  }
  applyDamage(player, damage) {
    if (damage <= 0) return 0;
    let applied = damage;
    if (player.shield) {
      const shield = player.shield;
      const absorbed = Math.min(damage * shield.damage, shield.strength * MAX_POWER);
      shield.strength -= absorbed / MAX_POWER;
      applied = Math.round(damage - absorbed);
      if (shield.strength <= 0) player.shield = null;
      else if (shield.strength < 0.2) {
        shield.strength = 0;
        player.shield = null;
      }
    }
    player.powerLimit -= applied;
    player.power = Math.min(player.power, Math.max(0, player.powerLimit));
    return applied;
  }
  roundDamage(player, x, y, radius) {
    const lx = player.x;
    const rx = player.x + player.width;
    const uy = player.turretY(1);
    const ly = player.y + player.height;
    if (x >= lx && x <= rx && y >= uy && y <= ly) return Math.abs(player.powerLimit);
    const corners = [[lx, uy], [lx, ly], [rx, uy], [rx, ly]];
    const distance = Math.min(...corners.map(([px, py]) => Math.hypot(px - x, py - y)));
    const splash = 1.02 * radius;
    return splash > distance ? Math.trunc(MAX_POWER - (MAX_POWER * distance) / splash) : 0;
  }
  async settleTanks(shooter = null) {
    const deaths = [];
    for (const player of this.players) {
      if (!player.alive) continue;
      const fallCount = await this.settleOneTank(player, true);
      if (this.applyFallingDamage(player, fallCount)) {
        deaths.push(player);
        this.recordKill(shooter, player);
      }
    }
    for (const player of deaths) await this.randomTankExplosion(player);
    return deaths;
  }
  applyFallingDamage(player, fallCount) {
    if (fallCount <= 0) return false;
    if (fallCount > 5 && player.parachutes > 0 && player.items[3] > 0) {
      player.parachutes--;
      player.items[3]--;
    } else {
      this.applyDamage(player, fallCount);
    }
    if (player.powerLimit >= MIN_POWER) return false;
    player.alive = false;
    return true;
  }
  async massKillAll() {
    this.animating = true;
    setControlsDisabled(true);
    for (const player of this.players) {
      if (!player.alive) continue;
      player.alive = false;
      await this.randomTankExplosion(player);
    }
    this.animating = false;
    this.roundOver = true;
    this.captureStatsSnapshot();
    this.render("Mass kill.");
  }
  async settleOneTank(player, animate = false, options = {}) {
    const leftBase = player.sprite[0][5] ?? 0;
    const rightBase = player.sprite[0][6] ?? 0;
    const baseStart = leftBase;
    const baseEnd = Math.max(baseStart + 1, player.width - rightBase);
    let direction = 0;
    let fallCount = 0;
    const finish = () => {
      player.falling = false;
      return fallCount;
    };
    player.falling = false;
    for (let steps = 0; steps < HEIGHT * 2; steps++) {
      let s = -1;
      let e = -1;
      for (let i = baseStart; i < baseEnd; i++) {
        if (!this.bitmap.isBackground(player.x + i, player.y + player.height)) {
          if (s === -1) s = i;
          e = i;
        }
      }
      if (s < 0 && e < 0) {
        if (player.y + player.height >= HEIGHT - 1) return finish();
        player.y++;
        fallCount++;
        player.falling = true;
        if (animate && steps % 3 === 0) {
          this.drawWorld();
          await sleep(18);
        }
        continue;
      }
      if (options.usingFuel) return finish();
      for (let i = 0; i < player.height && (s < 0 || e < 0); i++) {
        if (!this.bitmap.isBackground(player.x - 1, player.y + i)) {
          s = 0;
          if (e < 0) e = s;
        }
        if (!this.bitmap.isBackground(player.x + player.width, player.y + i)) {
          e = player.width - 1;
          if (s < 0) s = e;
        }
      }
      if (s > player.width / 2 && (direction === -1 || direction === 0) && player.x > 0) {
        player.x--;
        fallCount++;
        player.falling = true;
        direction = -1;
        if (animate && steps % 3 === 0) {
          this.drawWorld();
          await sleep(18);
        }
        continue;
      }
      if (e < player.width / 2 && (direction === 1 || direction === 0) && player.x + player.width < WIDTH - 1) {
        player.x++;
        fallCount++;
        player.falling = true;
        direction = 1;
        if (animate && steps % 3 === 0) {
          this.drawWorld();
          await sleep(18);
        }
        continue;
      }
      return finish();
    }
    return finish();
  }
  nextTurn(message) {
    const alive = this.players.filter((p) => p.alive);
    if (this.networkTurnControlled()) {
      if (alive.length <= 1) this.roundOver = true;
      updateUi(this, alive.length <= 1 ? (alive.length ? `${alive[0].name} wins.` : "Everyone is gone.") : message);
      return;
    }
    if (alive.length <= 1) {
      this.roundOver = true;
      updateUi(this, alive.length ? `${alive[0].name} wins.` : "Everyone is gone.");
      this.scheduleRoundRestart();
      return;
    }
    do {
      this.active = (this.active + 1) % this.players.length;
    } while (!this.players[this.active].alive);
    if (this.changingWinds) this.randomizeWind();
    const player = this.players[this.active];
    document.getElementById("angle").value = String(player.angle);
    document.getElementById("power").value = String(player.power);
    this.weapon = preferredWeaponFor(player, this.weapon);
    updateUi(this, message);
    this.scheduleAiTurn();
  }
  scheduleRoundRestart() {
    if (this.roundRestartTimer) return;
    this.roundRestartTimer = setTimeout(() => {
      this.animating = false;
      setControlsDisabled(false);
      const final = !globalThis.multiplayerSession?.started &&
        singlePlayerSettings.currentRound >= singlePlayerSettings.rounds;
      if (final) singlePlayerSettings.gameOver = true;
      const winner = this.players.find((player) => player.alive);
      showRoundEnd({ final, winner });
    }, 1400);
  }
  scheduleAiTurn() {
    const player = this.players[this.active];
    if (!player || !player.alive || !player.ai || this.animating || this.roundOver || autoDefenseMode) return;
    const net = globalThis.multiplayerSession;
    if (net?.started && net.clientId !== net.hostId) return;
    setTimeout(() => this.takeAiTurn(player), 650);
  }
  async takeAiTurn(player) {
    if (this.players[this.active] !== player || this.animating || this.roundOver || autoDefenseMode) return;
    this.animating = true;
    setControlsDisabled(true);
    const weaponIndex = this.chooseAiWeapon(player);
    const weapon = WEAPONS[weaponIndex];
    const shot = await this.findAiShot(player, weapon);
    if (this.players[this.active] !== player || this.roundOver) {
      this.animating = false;
      setControlsDisabled(false);
      return;
    }
    player.angle = shot.angle;
    player.power = shot.power;
    this.weapon = weaponIndex;
    player.lastWeapon = this.weapon;
    player.preferredWeapon = this.weapon;
    document.getElementById("angle").value = String(player.angle);
    document.getElementById("power").value = String(player.power);
    this.render(`${player.name} fires ${weapon.name}.`);
    this.animating = false;
    if (globalThis.multiplayerSession?.started) globalThis.multiplayerSession.fire();
    else this.fire();
  }
  chooseAiWeapon(player) {
    const choices = WEAPONS
      .map((weapon, index) => ({ weapon, index, qty: player.weapons[index] ?? 0 }))
      .filter(({ weapon, qty }) => qty > 0 && weapon.kind !== "laser");
    if (!choices.length) return usableWeaponIndex(player, 0);
    if (choices.length === 1) return choices[0].index;
    const maxPrice = Math.max(1, ...choices.map(({ weapon }) => weapon.price || 0));
    const center = AI_WEAPON_PRICE_CENTER[player.aiType] ?? 0.45;
    const spread = AI_WEAPON_PRICE_SPREAD[player.aiType] ?? 0.35;
    let total = 0;
    const weighted = choices.map((choice) => {
      const pricePosition = (choice.weapon.price || 0) / maxPrice;
      const distance = (pricePosition - center) / spread;
      const fit = Math.exp(-0.5 * distance * distance);
      const ammoWeight = choice.weapon.infinite ? 1 : Math.min(2.2, 0.75 + Math.log2(Math.max(1, choice.qty) + 1) * 0.18);
      const weight = Math.max(0.04, fit) * ammoWeight;
      total += weight;
      return { ...choice, weight };
    });
    let pick = this.rand.next() * total;
    for (const choice of weighted) {
      pick -= choice.weight;
      if (pick <= 0) return choice.index;
    }
    return weighted[weighted.length - 1].index;
  }
  aiWeaponRadius(weapon) {
    if (weapon.kind === "mirv") return Math.round((weapon.radius || 10) * Math.min(3.2, 1 + (weapon.particles || 1) * 0.24));
    if (weapon.kind === "napalm") return Math.round((weapon.radius || 80) * 0.45);
    if (weapon.kind === "digger") return Math.max(18, Math.round((weapon.radius || 24) * 0.9));
    return weapon.radius || 10;
  }
  async findAiShot(player, weapon = WEAPONS[0]) {
    const accuracy = AI_ACCURACY[player.aiType] ?? 5;
    const radius = Math.round(this.aiWeaponRadius(weapon) * (AI_RADIUS_FACTOR[player.aiType] ?? 2));
    const startAngle = player.angle;
    const startPower = player.power;
    const path = [];
    const coarseAngleStep = Math.max(6, accuracy * 3);
    const coarsePowerStep = Math.max(60, accuracy * 30);
    let best = this.searchAiCandidates(player, radius, path, {
      angleCenter: startAngle,
      angleSpan: 180,
      angleStep: coarseAngleStep,
      powerCenter: startPower,
      powerSpan: player.powerLimit,
      powerStep: coarsePowerStep
    });

    if (best.score > 0) {
      best = this.searchAiCandidates(player, radius, path, {
        angleCenter: best.angle,
        angleSpan: coarseAngleStep * 2,
        angleStep: accuracy,
        powerCenter: best.power,
        powerSpan: coarsePowerStep * 2,
        powerStep: 10 * accuracy
      }, best);
      const shot = this.applyAiInaccuracy(player, { angle: best.angle, power: best.power });
      await this.animateAiAim(player, path, shot);
      return shot;
    }

    const fallback = this.searchAiCandidates(player, radius, path, {
      angleCenter: startAngle,
      angleSpan: 180,
      angleStep: Math.max(accuracy, 4),
      powerCenter: startPower,
      powerSpan: player.powerLimit,
      powerStep: Math.max(8 * accuracy, 24)
    });
    const shot = fallback.score > 0 ? this.applyAiInaccuracy(player, { angle: fallback.angle, power: fallback.power }) : { angle: startAngle, power: startPower };
    await this.animateAiAim(player, path, shot);
    return shot;
  }
  applyAiInaccuracy(player, shot) {
    const angleSpread = [3, 2, 0][player.aiType] ?? 2;
    const powerSpread = [35, 18, 0][player.aiType] ?? 25;
    const angleNoise = this.aiNoise(player, shot, 1) * 2 - 1;
    const powerNoise = this.aiNoise(player, shot, 2) * 2 - 1;
    const angle = Math.max(0, Math.min(179, Math.round(shot.angle + angleNoise * angleSpread)));
    const power = Math.max(0, Math.min(player.powerLimit, Math.round(shot.power + powerNoise * powerSpread)));
    return { angle, power };
  }
  aiNoise(player, shot, salt) {
    let x = (this.rand.seed ^ (player.id * 374761393) ^ (player.aiType * 668265263) ^ (shot.angle * 2246822519) ^ (shot.power * 3266489917) ^ salt) >>> 0;
    x ^= x >>> 16;
    x = Math.imul(x, 2246822507) >>> 0;
    x ^= x >>> 13;
    x = Math.imul(x, 3266489909) >>> 0;
    x ^= x >>> 16;
    return x / 0x100000000;
  }
  searchAiCandidates(player, radius, path, options, best = { score: 0, angle: player.angle, power: player.power }) {
    const angleStart = Math.max(0, Math.round(options.angleCenter - options.angleSpan / 2));
    const angleEnd = Math.min(179, Math.round(options.angleCenter + options.angleSpan / 2));
    const powerStart = Math.max(0, Math.round(options.powerCenter - options.powerSpan / 2));
    const powerEnd = Math.min(player.powerLimit, Math.round(options.powerCenter + options.powerSpan / 2));
    let candidateCount = 0;
    for (let angle = angleStart; angle <= angleEnd; angle += options.angleStep) {
      for (let power = powerStart; power <= powerEnd; power += options.powerStep) {
        candidateCount++;
        if (candidateCount % 9 === 1) this.recordAiAimCandidate(path, angle, power);
        const hit = this.simulateAiMissile(player, angle, power);
        if (!hit) continue;
        const score = this.scoreAiHit(hit.x, hit.y, radius, player);
        if (score > best.score) {
          best = { score, angle, power };
          this.recordAiAimCandidate(path, angle, power, true);
        }
      }
    }
    return best;
  }
  recordAiAimCandidate(path, angle, power, force = false) {
    const last = path[path.length - 1];
    if (!force && last && Math.abs(last.angle - angle) < 2 && Math.abs(last.power - power) < 35) return;
    path.push({ angle, power });
    if (path.length > 180) path.splice(0, path.length - 180);
  }
  async animateAiAim(player, path, finalShot) {
    const frameCount = Math.min(52, Math.max(18, path.length));
    const sampled = [];
    if (path.length) {
      for (let i = 0; i < frameCount; i++) {
        sampled.push(path[Math.floor(i * (path.length - 1) / Math.max(1, frameCount - 1))]);
      }
    }
    sampled.push(finalShot);
    for (const shot of sampled) {
      player.angle = shot.angle;
      player.power = shot.power;
      document.getElementById("angle").value = String(player.angle);
      document.getElementById("power").value = String(player.power);
      if (globalThis.multiplayerSession?.started) globalThis.multiplayerSession.aim(player);
      this.drawWorld();
      await sleep(26);
    }
  }
  simulateAiMissile(player, angleDeg, power) {
    const startX = player.x + player.sprite[0][0] + Math.trunc(player.sprite[0][2] * 2 * Math.cos(angleDeg * Math.PI / 180));
    const startY = HEIGHT - (player.y + player.sprite[0][1] - Math.trunc(player.sprite[0][2] * 2 * Math.sin(angleDeg * Math.PI / 180)));
    const angle = angleDeg * Math.PI / 180;
    const speed = power / 8;
    const vx0 = speed * Math.cos(angle);
    const vy0 = speed * Math.sin(angle);
    let prevX = startX;
    let prevY = HEIGHT - startY;
    for (let step = 4; step < 560; step += 4) {
      const x = Math.trunc(startX + (this.wind + vx0) * step * STEP_SIZE);
      const y = Math.trunc(HEIGHT - (startY + step * STEP_SIZE * (vy0 - 0.5 * EARTH_GRAVITY * step * STEP_SIZE)));
      if (x < 0 || x >= WIDTH) return null;
      if (y >= HEIGHT) return { x, y: HEIGHT - 1 };
      if (y >= 0 && prevY >= 0) {
        const hit = this.intersectShot(prevX, prevY, x, y);
        if (hit) return hit;
      }
      prevX = x;
      prevY = y;
    }
    return null;
  }
  scoreAiHit(x, y, radius, shooter) {
    let score = 0;
    for (const target of this.players) {
      if (!target.alive) continue;
      const damage = this.roundDamage(target, x, y, radius);
      if (target === shooter) score -= damage * MAX_PLAYERS_PENALTY();
      else score += damage;
    }
    return score;
  }
}

function rgb(r, g, b) {
  return ((255 << 24) | (r << 16) | (g << 8) | b) >>> 0;
}

function PhysicsMaxWind() {
  return 10;
}

function MAX_PLAYERS_PENALTY() {
  return 8;
}

function lerpColor(a, b, q) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return rgb(Math.trunc(ar + (br - ar) * q), Math.trunc(ag + (bg - ag) * q), Math.trunc(ab + (bb - ab) * q));
}

function gradientStripColor(a, b, strip, steps) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return rgb(
    ar + Math.trunc((br - ar) / steps) * strip,
    ag + Math.trunc((bg - ag) / steps) * strip,
    ab + Math.trunc((bb - ab) / steps) * strip
  );
}

function scaleColor(color, scale) {
  const r = Math.max(0, Math.min(255, Math.round(((color >> 16) & 255) * scale)));
  const g = Math.max(0, Math.min(255, Math.round(((color >> 8) & 255) * scale)));
  const b = Math.max(0, Math.min(255, Math.round((color & 255) * scale)));
  return rgb(r, g, b);
}

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const lengthSq = vx * vx + vy * vy;
  if (lengthSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / lengthSq));
  return Math.hypot(px - (x1 + vx * t), py - (y1 + vy * t));
}

function cssColor(color) {
  return `rgb(${(color >>> 16) & 255}, ${(color >>> 8) & 255}, ${color & 255})`;
}

function hexColor(color) {
  return `#${(color >>> 0).toString(16).padStart(6, "0").slice(-6)}`;
}

function formatPercent(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function napalmColor(value) {
  if (value > 220) return "#ffffff";
  if (value > 170) return "#ffff00";
  if (value > 110) return "#ff9800";
  if (value > 55) return "#e02000";
  if (value > 22) return "#220018";
  return "#000000";
}

function writePixel(data, i, color) {
  const p = i * 4;
  data[p] = (color >>> 16) & 255;
  data[p + 1] = (color >>> 8) & 255;
  data[p + 2] = color & 255;
  data[p + 3] = 255;
}

function writeLine(data, width, height, x1, y1, x2, y2, color) {
  x1 = Math.trunc(x1);
  y1 = Math.trunc(y1);
  x2 = Math.trunc(x2);
  y2 = Math.trunc(y2);
  const put = (x, y) => {
    if (x >= 0 && y >= 0 && x < width && y < height) writePixel(data, y * width + x, color);
  };
  if (y1 === y2) {
    if (x1 > x2) [x1, x2] = [x2, x1];
    for (let x = x1; x <= x2; x++) put(x, y1);
    return;
  }
  if (x1 === x2) {
    if (y1 > y2) [y1, y2] = [y2, y1];
    for (let y = y1; y <= y2; y++) put(x1, y);
    return;
  }

  const dx = x2 - x1;
  const dy = y2 - y1;
  const ix = Math.abs(dx);
  const iy = Math.abs(dy);
  const inc = Math.max(ix, iy);
  let plotX = x1;
  let plotY = y1;
  let x = 0;
  let y = 0;

  put(plotX, plotY);
  for (let i = 0; i <= inc; i++) {
    x += ix;
    y += iy;
    if (x > inc) {
      x -= inc;
      plotX += dx > 0 ? 1 : -1;
    }
    if (y > inc) {
      y -= inc;
      plotY += dy > 0 ? 1 : -1;
    }
    put(plotX, plotY);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let audioCtx = null;
function beep(freq, duration) {
  try {
    audioCtx ??= new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    osc.type = "square";
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {
    /* Audio is optional, matching applet sounds=false by default. */
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

const PLAYER_NAME_STORAGE_KEY = "scorch2000.multiplayerName";

function cleanPlayerName(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 24);
}

function formatCountdown(ms) {
  if (ms == null) return "No auto-start";
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

const singlePlayerSettings = {
  maxWind: PhysicsMaxWind(),
  changingWinds: false,
  unlimitedInventory: false,
  initialCash: DEFAULT_INITIAL_CASH,
  rounds: 1,
  currentRound: 1,
  gameOver: false
};

function suggestedGameName(playerName) {
  const name = cleanPlayerName(playerName) || "Player";
  return `${name}'s game`.slice(0, 32);
}

const game = new ScorchGame(document.getElementById("field"));

function startNextSinglePlayerRound() {
  singlePlayerSettings.currentRound = Math.min(
    singlePlayerSettings.rounds,
    singlePlayerSettings.currentRound + 1
  );
  singlePlayerSettings.gameOver = false;
  game.newRound();
  beginAutoDefensePhase();
}

class MultiplayerSession {
  constructor(game) {
    this.game = game;
    this.socket = null;
    this.connected = false;
    this.started = false;
    this.room = "";
    this.clientId = null;
    this.playerId = null;
    this.hostId = null;
    this.players = [];
    this.games = [];
    this.title = "";
    this.private = false;
    this.settings = { resolution: "800x600", maxWind: 10, changingWinds: false, unlimitedInventory: false, initialCash: DEFAULT_INITIAL_CASH, rounds: 3, currentRound: 0 };
    this.activeTurnId = 0;
    this.gameOver = false;
    this.chatLog = [];
    this.lobbyChatLog = [];
    this.lastChecksum = "";
    this.socketReady = null;
    this.helloReady = null;
    this.resolveHello = null;
    this.joinPending = null;
    this.joinRetryTimer = null;
    this.autoStartAt = null;
    this.countdownTimer = null;
    this.screen = "name";
    this.pendingJoinCode = new URLSearchParams(location.search).get("join")?.trim().toUpperCase().slice(0, 6) || "";
  }
  status(text) {
    document.getElementById("multiplayerStatus").textContent = text;
    updateDebugConsole();
  }
  showScreen(name) {
    this.screen = name;
    for (const screen of document.querySelectorAll("[data-multiplayer-screen]")) {
      screen.classList.toggle("hidden", screen.dataset.multiplayerScreen !== name);
    }
    document.querySelector("#multiplayerBox .multiplayer-window")?.classList.toggle("name-mode", name === "name");
    document.getElementById("createGameBox").classList.add("hidden");
    this.updateCountdown();
  }
  loadSavedName() {
    const saved = cleanPlayerName(localStorage.getItem(PLAYER_NAME_STORAGE_KEY));
    if (saved) document.getElementById("multiplayerName").value = saved;
    document.getElementById("multiplayerLobbyName").textContent = saved || "Choose a name";
    return saved;
  }
  saveName() {
    const name = cleanPlayerName(document.getElementById("multiplayerName").value);
    if (!name) {
      this.status("Enter a name before joining multiplayer.");
      this.showScreen("name");
      return "";
    }
    localStorage.setItem(PLAYER_NAME_STORAGE_KEY, name);
    document.getElementById("multiplayerName").value = name;
    document.getElementById("multiplayerLobbyName").textContent = name;
    const gameName = document.getElementById("multiplayerGameName");
    if (!gameName.value.trim()) gameName.value = suggestedGameName(name);
    return name;
  }
  async enterLobby() {
    if (!this.saveName()) return;
    this.showScreen("lobby");
    await this.ensureSocket();
    this.send({ type: "list-games" });
    if (this.pendingJoinCode) {
      document.getElementById("multiplayerRoom").value = this.pendingJoinCode;
      const code = this.pendingJoinCode;
      this.pendingJoinCode = "";
      await this.join(code);
    }
  }
  roster() {
    syncGameModeUi();
    const box = document.getElementById("multiplayerRoster");
    box.innerHTML = this.players.map((player) =>
      `<div>${player.id === this.playerId ? ">" : ""} ${escapeHtml(player.name)}${player.clientId === this.hostId ? " [host]" : ""}${player.ai ? " [AI]" : ""}</div>`
    ).join("") || "<div>No game joined.</div>";
    const isHost = this.clientId === this.hostId;
    document.getElementById("startRoom").disabled = !this.connected || this.started || !isHost || this.players.length < 2;
    document.getElementById("createRoom").disabled = !this.connected || !!this.room || !!this.joinPending;
    document.getElementById("openCreateGame").disabled = !this.connected || !!this.room || !!this.joinPending;
    document.getElementById("shareRoom").disabled = !this.room;
    document.getElementById("joinUrl").value = this.shareUrl();
    for (const id of ["multiplayerTank", "multiplayerGameName", "multiplayerPrivate", "multiplayerResolution", "multiplayerWind", "multiplayerChangingWinds", "multiplayerUnlimitedInventory", "multiplayerCash", "multiplayerRounds"]) {
      document.getElementById(id).disabled = !!this.room || this.started;
    }
    syncTankPickers();
    for (const button of document.querySelectorAll("[data-add-ai]")) {
      button.disabled = !this.room || this.started || this.clientId !== this.hostId || this.players.length >= 8;
    }
    document.getElementById("startRoom").classList.toggle("hidden", !isHost);
    document.getElementById("waitingGameCode").textContent = this.private ? `Private Game ${this.room}` : `Game ${this.room}`;
    document.getElementById("waitingGameTitle").textContent = this.title || "Waiting for players";
    document.getElementById("waitingOptions").innerHTML = [
      `${escapeHtml(this.settings.resolution)}`,
      `Wind ${this.settings.maxWind}${this.settings.changingWinds ? " changing" : ""}`,
      `$${this.settings.initialCash} cash`,
      this.settings.unlimitedInventory ? "Unlimited items" : "Shop inventory",
      `${this.settings.rounds} rounds`,
      this.private ? "Private game: no auto-start" : "Public game"
    ].map((line) => `<span>${line}</span>`).join(" | ");
    this.updateCountdown();
  }
  gameList() {
    const box = document.getElementById("multiplayerGames");
    box.innerHTML = this.games.map((entry) => `
      <div class="multiplayer-game-row">
        <div class="multiplayer-game-main">
          <strong>${entry.code}${entry.title ? ` ${escapeHtml(entry.title)}` : ""}</strong>
          <span>${entry.players}/8 ${entry.started ? `round ${entry.currentRound}/${entry.rounds}` : "open"} | ${escapeHtml(entry.resolution)} | wind ${entry.maxWind}${entry.changingWinds ? " changing" : ""} | ${entry.unlimitedInventory ? "unlimited items" : `$${entry.initialCash}`} | ${entry.rounds} rounds</span>
          <span class="game-meta">${entry.started ? "playing" : `starts ${formatCountdown(entry.autoStartAt ? entry.autoStartAt - Date.now() : null)}`}</span>
          <span class="game-meta">Host: ${escapeHtml(entry.host)} | ${entry.names.map(escapeHtml).join(", ")}</span>
        </div>
        <button data-join-game="${entry.code}" ${entry.started || this.started || this.room || this.joinPending ? "disabled" : ""}>${this.joinPending?.room === entry.code ? "Joining..." : "Join"}</button>
      </div>
    `).join("") || "<div>No public games.</div>";
  }
  appendChat(targetId, lines, text) {
    lines.push(text);
    if (lines.length > 80) lines.splice(0, lines.length - 80);
    document.getElementById(targetId).innerHTML = lines.map((line) => `<div>${escapeHtml(line)}</div>`).join("");
    const log = document.getElementById(targetId);
    log.scrollTop = log.scrollHeight;
  }
  chat(text) {
    this.appendChat("multiplayerChatLog", this.chatLog, text);
    if (this.started) this.game.addChatMessage(text);
  }
  lobbyChat(text) {
    this.appendChat("lobbyChatLog", this.lobbyChatLog, text);
  }
  updateCountdown() {
    if (this.countdownTimer) clearTimeout(this.countdownTimer);
    this.countdownTimer = null;
    const waitingText = this.private
      ? "Private game: no auto-start"
      : `Auto-start in ${formatCountdown(this.autoStartAt ? this.autoStartAt - Date.now() : null)}`;
    const waitingEl = document.getElementById("waitingCountdown");
    if (waitingEl) waitingEl.textContent = waitingText;
    if (this.screen === "lobby") this.gameList();
    if ((this.room && !this.started && !this.private && this.autoStartAt) || this.screen === "lobby") {
      this.countdownTimer = setTimeout(() => this.updateCountdown(), 1000);
    }
  }
  ensureSocket() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      if (this.clientId != null) return Promise.resolve();
      return this.helloReady || Promise.resolve();
    }
    if (this.socket?.readyState === WebSocket.CONNECTING && this.socketReady) return this.socketReady;
    this.helloReady = new Promise((resolve) => {
      this.resolveHello = resolve;
    });
    this.socketReady = new Promise((resolve, reject) => {
      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      this.socket = new WebSocket(`${protocol}//${location.host}/ws`);
      this.socket.addEventListener("open", () => {
        this.connected = true;
        this.status("Connected. Create or join a game.");
        this.roster();
        resolve(this.helloReady);
      }, { once: true });
      this.socket.addEventListener("error", () => {
        this.socketReady = null;
        this.helloReady = null;
        this.resolveHello = null;
        reject(new Error("WebSocket connection failed."));
      }, { once: true });
      this.socket.addEventListener("close", () => {
        this.socketReady = null;
        this.helloReady = null;
        this.resolveHello = null;
        this.clearJoinPending();
        this.connected = false;
        this.started = false;
        this.room = "";
        this.autoStartAt = null;
        this.status("Disconnected.");
        this.roster();
        this.showScreen(this.name() ? "lobby" : "name");
        setControlsDisabled(false);
      });
      this.socket.addEventListener("message", (event) => this.handle(JSON.parse(event.data)));
    });
    return this.socketReady.then((hello) => hello);
  }
  send(payload) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(payload));
  }
  clearJoinPending() {
    if (this.joinRetryTimer) clearTimeout(this.joinRetryTimer);
    this.joinRetryTimer = null;
    this.joinPending = null;
    this.gameList();
    this.roster();
  }
  sendJoinPayload(payload, attempt = 1) {
    this.joinPending = payload;
    this.status(attempt === 1 ? `Joining game ${payload.room}...` : `Retrying game ${payload.room}...`);
    this.gameList();
    this.send(payload);
    if (this.joinRetryTimer) clearTimeout(this.joinRetryTimer);
    this.joinRetryTimer = setTimeout(() => {
      if (!this.joinPending || this.room || attempt >= 3) return;
      this.sendJoinPayload(payload, attempt + 1);
    }, 1200);
  }
  async create() {
    await this.ensureSocket();
    if (!this.saveName()) return;
    document.getElementById("createRoom").disabled = true;
    this.send({
      type: "create",
      name: this.name(),
      gameName: document.getElementById("multiplayerGameName").value,
      private: document.getElementById("multiplayerPrivate").checked,
      tankType: Number(document.getElementById("multiplayerTank").value),
      resolution: document.getElementById("multiplayerResolution").value,
      maxWind: Number(document.getElementById("multiplayerWind").value),
      changingWinds: document.getElementById("multiplayerChangingWinds").checked,
      unlimitedInventory: document.getElementById("multiplayerUnlimitedInventory").checked,
      initialCash: Number(document.getElementById("multiplayerCash").value),
      rounds: Number(document.getElementById("multiplayerRounds").value)
    });
  }
  async join(code = "") {
    await this.ensureSocket();
    if (!this.saveName()) return;
    this.sendJoinPayload({
      type: "join",
      room: code || document.getElementById("multiplayerRoom").value,
      name: this.name(),
      tankType: Number(document.getElementById("multiplayerTank").value)
    });
  }
  leave() {
    this.send({ type: "leave" });
    this.room = "";
    this.players = [];
    this.autoStartAt = null;
    this.chatLog = [];
    document.getElementById("multiplayerChatLog").innerHTML = "";
    document.getElementById("multiplayerRoom").value = "";
    this.showScreen("lobby");
    this.roster();
    this.send({ type: "list-games" });
  }
  start() {
    this.send({ type: "start" });
  }
  shareUrl() {
    if (!this.room) return "";
    const url = new URL(location.href);
    url.searchParams.set("join", this.room);
    return url.href;
  }
  async share() {
    const url = this.shareUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      this.status(`Join URL copied: ${url}`);
    } catch {
      this.status(`Join URL: ${url}`);
    }
  }
  addAi(aiType) {
    this.send({ type: "add-ai", aiType });
  }
  applyActiveRoster(players) {
    if (!Array.isArray(players) || !this.started) return;
    const previous = this.game.players;
    const used = new Set();
    this.game.players = players.map((entry, index) => {
      const matchIndex = previous.findIndex((player, oldIndex) => {
        if (used.has(oldIndex)) return false;
        if (entry.clientId != null && this.players[oldIndex]?.clientId === entry.clientId) return true;
        return entry.clientId == null && player.name === entry.name && !!player.ai === !!entry.ai;
      });
      const player = matchIndex >= 0
        ? previous[matchIndex]
        : new Player(index, entry.name, entry.tankType ?? (index % tankData.length), !!entry.ai, entry.aiType ?? 0);
      if (matchIndex >= 0) used.add(matchIndex);
      player.id = index;
      player.name = entry.name;
      player.ai = !!entry.ai;
      player.aiType = Number(entry.aiType) || 0;
      return player;
    });
    if (this.game.active >= this.game.players.length) this.game.active = 0;
  }
  syncRoster(players, options = {}) {
    if (!Array.isArray(players)) return;
    if (this.started && players.length !== this.game.players.length) this.applyActiveRoster(players);
    this.players = players;
    if (!this.started) {
      this.game.players = players.map((entry, index) => {
        const player = this.game.players[index] ?? new Player(index, entry.name, entry.tankType ?? (index % tankData.length), !!entry.ai, entry.aiType ?? 0);
        player.id = index;
        player.name = entry.name;
        player.ai = !!entry.ai;
        player.aiType = Number(entry.aiType) || 0;
        return player;
      });
      if (this.game.active >= this.game.players.length) this.game.active = 0;
    }
    for (const entry of players) {
      const player = this.game.players[entry.id];
      if (!player) continue;
      player.name = entry.name;
      player.ai = !!entry.ai;
      player.aiType = Number(entry.aiType) || 0;
      this.game.applyConfiguredInventory(player, entry);
      if (options.replaceStats) {
        player.kills = Number(entry.kills) || 0;
        player.earnedCash = Number(entry.gain) || 0;
        player.overallKills = Number(entry.overallKills) || 0;
        player.overallGain = Number(entry.overallGain) || 0;
      } else {
        player.kills = Math.max(Number(player.kills) || 0, Number(entry.kills) || 0);
        player.earnedCash = Math.max(Number(player.earnedCash) || 0, Number(entry.gain) || 0);
        player.overallKills = Math.max(Number(player.overallKills) || 0, Number(entry.overallKills) || 0);
        player.overallGain = Math.max(Number(player.overallGain) || 0, Number(entry.overallGain) || 0);
      }
    }
    this.game.captureStatsSnapshot();
  }
  applyIdentity(message) {
    this.hostId = message.hostId ?? this.hostId;
    if (Number.isInteger(message.selfPlayerId) && message.selfPlayerId >= 0) {
      this.playerId = message.selfPlayerId;
      return;
    }
    this.playerId = message.players?.find((player) => player.clientId === this.clientId)?.id ?? this.playerId;
  }
  applySettings(message) {
    this.title = message.title || "";
    this.private = !!message.private;
    this.settings = {
      resolution: message.resolution || this.settings.resolution,
      maxWind: Number(message.maxWind ?? this.settings.maxWind),
      changingWinds: !!message.changingWinds,
      unlimitedInventory: !!message.unlimitedInventory,
      initialCash: Number(message.initialCash ?? this.settings.initialCash),
      rounds: Number(message.rounds ?? this.settings.rounds),
      currentRound: Number(message.currentRound ?? this.settings.currentRound)
    };
    this.autoStartAt = message.autoStartAt ?? null;
    document.getElementById("multiplayerResolution").value = this.settings.resolution;
    document.getElementById("multiplayerGameName").value = this.title;
    document.getElementById("multiplayerPrivate").checked = this.private;
    document.getElementById("multiplayerWind").value = String(this.settings.maxWind);
    document.getElementById("multiplayerChangingWinds").checked = this.settings.changingWinds;
    document.getElementById("multiplayerUnlimitedInventory").checked = this.settings.unlimitedInventory;
    document.getElementById("multiplayerCash").value = String(this.settings.initialCash);
    document.getElementById("multiplayerRounds").value = String(this.settings.rounds);
  }
  name() {
    return cleanPlayerName(document.getElementById("multiplayerName").value);
  }
  isLocalTurn() {
    if (!this.started) return false;
    const active = this.game.players[this.game.active];
    if (active?.ai) return this.clientId === this.hostId;
    return this.game.active === this.playerId;
  }
  aim(player) {
    if (!this.isLocalTurn()) return;
    this.send({ type: "aim", playerId: player.id, activeTurnId: this.activeTurnId, angle: player.angle, power: player.power });
  }
  fire() {
    if (!this.isLocalTurn() || this.game.animating) return;
    const player = this.game.players[this.game.active];
    setControlsDisabled(true);
    this.send({ type: "fire", playerId: this.game.active, activeTurnId: this.activeTurnId, angle: player.angle, power: player.power, weapon: this.game.weapon });
  }
  massKill() {
    if (!this.started || this.game.animating) return;
    if (this.clientId !== this.hostId) {
      this.status("Only the game master can mass kill.");
      return;
    }
    this.send({ type: "mass-kill" });
  }
  sendChat(text) {
    this.send({ type: "chat", text });
  }
  sendLobbyChat(text) {
    const name = this.name();
    if (!name) {
      this.showScreen("name");
      return;
    }
    this.send({ type: "lobby-chat", name, text });
  }
  readyForNextRound() {
    this.send({ type: "round-ready" });
  }
  autoDefenseReady(player = null) {
    this.send({
      type: "auto-defense-ready",
      weapons: player?.weapons ?? null,
      items: player?.items ?? null,
      cash: player?.cash ?? null
    });
  }
  useItem(itemId, arg = null, playerId = this.game.active) {
    const autoDefenseUse = autoDefenseMode && playerId === this.playerId;
    if ((!autoDefenseUse && !this.isLocalTurn()) || this.game.animating) return;
    this.send({ type: "use-item", playerId, activeTurnId: this.activeTurnId, itemId, arg });
  }
  sendShopUpdate(player) {
    this.send({
      type: "shop-update",
      weapons: player.weapons,
      items: player.items,
      cash: player.cash
    });
  }
  applyShopUpdate(message) {
    const player = this.game.players[message.playerId];
    if (!player) return;
    if (Array.isArray(message.weapons)) {
      player.weapons = WEAPONS.map((weapon, index) => {
        const value = Number(message.weapons[index]);
        return Number.isFinite(value) ? Math.max(0, value) : weapon.ammo;
      });
    }
    if (Array.isArray(message.items)) player.items = message.items.map((value) => Math.max(0, Number(value) || 0));
    player.cash = Math.max(0, Number(message.cash) || 0);
    this.game.render();
  }
  sendTurnComplete(message) {
    this.lastChecksum = this.game.checksum();
    this.game.captureStatsSnapshot();
    this.send({
      type: "turn-complete",
      turnId: message.turnId,
      playerId: message.playerId,
      checksum: this.lastChecksum,
      alive: this.game.players.filter((entry) => entry.alive).map((entry) => entry.id),
      stats: this.game.players.map((entry) => ({
        id: entry.id,
        kills: entry.kills,
        gain: entry.earnedCash,
        overallKills: entry.overallKills,
        overallGain: entry.overallGain
      })),
      inventory: this.game.players.map((entry) => ({
        id: entry.id,
        weapons: entry.weapons,
        items: entry.items,
        cash: entry.cash
      }))
    });
  }
  async handle(message) {
    if (message.type === "hello") {
      this.clientId = message.clientId;
      if (this.resolveHello) this.resolveHello();
      this.resolveHello = null;
      this.helloReady = null;
      this.socketReady = null;
      this.send({ type: "list-games" });
      return;
    }
    if (message.type === "error") {
      this.clearJoinPending();
      this.status(message.message);
      document.getElementById("createRoom").disabled = false;
      return;
    }
    if (message.type === "game-list") {
      this.games = message.games;
      this.gameList();
      this.updateCountdown();
      return;
    }
    if (message.type === "lobby-chat") {
      this.lobbyChat(message.text);
      return;
    }
    if (message.type === "left") {
      this.room = "";
      this.players = [];
      this.autoStartAt = null;
      this.chatLog = [];
      document.getElementById("multiplayerChatLog").innerHTML = "";
      this.showScreen("lobby");
      this.roster();
      this.gameList();
      return;
    }
    if (message.type === "lobby") {
      this.clearJoinPending();
      this.room = message.game;
      this.applyIdentity(message);
      this.applySettings(message);
      this.syncRoster(message.players, { replaceStats: true });
      document.getElementById("multiplayerRoom").value = this.room;
      this.status(`${this.private ? "Private " : ""}Game ${this.room}${this.title ? ` (${this.title})` : ""} ready. ${this.settings.resolution}, wind ${this.settings.maxWind}${this.settings.changingWinds ? " changing" : ""}, ${this.settings.unlimitedInventory ? "unlimited items" : `cash ${this.settings.initialCash}`}, ${this.settings.rounds} rounds.`);
      document.getElementById("createGameBox").classList.add("hidden");
      this.showScreen("waiting");
      this.roster();
      this.gameList();
      return;
    }
    if (message.type === "player-left" && this.started) {
      this.applyIdentity(message);
      this.syncRoster(message.players, { replaceStats: true });
      this.hostId = message.hostId ?? this.hostId;
      this.game.active = Number(message.active ?? this.game.active);
      this.activeTurnId = Number(message.activeTurnId ?? this.activeTurnId);
      const active = this.game.players[this.game.active];
      this.status(`${message.leftName || "A player"} left game ${this.room}.`);
      this.roster();
      this.game.render(active ? `${message.leftName || "A player"} left. ${active.name}'s turn.` : `${message.leftName || "A player"} left.`);
      setControlsDisabled(false);
      this.game.scheduleAiTurn();
      return;
    }
    if (message.type === "start") {
      this.started = true;
      this.gameOver = false;
      this.room = message.game;
      this.activeTurnId = Number(message.activeTurnId ?? 0);
      initialShopOpened = false;
      this.applyIdentity(message);
      this.applySettings(message);
      this.game.startMultiplayerRound(message);
      this.syncRoster(message.players, { replaceStats: true });
      document.getElementById("multiplayerBox").classList.add("hidden");
      this.autoStartAt = null;
      this.status(`Game ${this.room} round ${this.settings.currentRound}/${this.settings.rounds}. You are player ${this.playerId + 1}.`);
      this.roster();
      maybeOpenInitialShop();
      return;
    }
    if (message.type === "round-start") {
      this.started = true;
      this.gameOver = false;
      this.activeTurnId = Number(message.activeTurnId ?? 0);
      this.applyIdentity(message);
      this.applySettings(message);
      hideWaitingBox();
      document.getElementById("roundEndBox").classList.add("hidden");
      this.game.startMultiplayerRound(message);
      this.syncRoster(message.players, { replaceStats: true });
      this.status(`Game ${this.room} round ${this.settings.currentRound}/${this.settings.rounds}.`);
      this.roster();
      return;
    }
    if (message.type === "round-waiting" && this.started) {
      showWaitingBox(message.readyClientIds, message.waiting);
      return;
    }
    if (message.type === "round-ready-complete" && this.started) {
      hideWaitingBox();
      this.activeTurnId = Number(message.activeTurnId ?? this.activeTurnId);
      this.game.active = Number(message.active ?? this.game.active);
      if (Number.isFinite(Number(message.wind))) this.game.wind = Number(message.wind);
      this.syncRoster(message.players);
      const active = this.game.players[this.game.active];
      this.game.weapon = preferredWeaponFor(active, this.game.weapon);
      this.status(`Game ${this.room} round ${this.settings.currentRound}/${this.settings.rounds}.`);
      this.game.render(active ? `${active.name}'s turn.` : "Round ready.");
      setControlsDisabled(false);
      this.game.scheduleAiTurn();
      return;
    }
    if (message.type === "auto-defense-start" && this.started) {
      hideWaitingBox();
      this.activeTurnId = Number(message.activeTurnId ?? this.activeTurnId);
      this.game.active = Number(message.active ?? this.game.active);
      this.syncRoster(message.players);
      setControlsDisabled(true);
      beginAutoDefensePhase({ multiplayer: true });
      return;
    }
    if (message.type === "chat") {
      this.chat(message.text);
      return;
    }
    if (message.type === "galsla") {
      this.game.startGalslaMode();
      return;
    }
    if (message.type === "shop-update" && this.started) {
      this.applyShopUpdate(message);
      return;
    }
    if (message.type === "use-item" && this.started) {
      await applyItemUse(message.playerId, message.itemId, message.arg);
      if (autoDefenseMode && autoDefensePlayer && message.playerId === autoDefensePlayer.id) {
        showInventory(autoDefensePlayer, { autoDefense: true });
      }
      return;
    }
    if (message.type === "aim" && this.started) {
      const player = this.game.players[message.playerId];
      if (!player) return;
      player.angle = message.angle;
      player.power = message.power;
      this.game.render();
      return;
    }
    if (message.type === "fire" && this.started) {
      const player = this.game.players[message.playerId];
      if (!player) return;
      this.activeTurnId = Number(message.activeTurnId ?? this.activeTurnId);
      this.game.active = message.playerId;
      player.angle = message.angle;
      player.power = message.power;
      this.game.weapon = message.weapon || 0;
      player.lastWeapon = this.game.weapon;
      player.preferredWeapon = this.game.weapon;
      document.getElementById("angle").value = String(player.angle);
      document.getElementById("power").value = String(player.power);
      await this.game.fire();
      this.sendTurnComplete(message);
      return;
    }
    if (message.type === "mass-kill" && this.started) {
      this.activeTurnId = Number(message.activeTurnId ?? this.activeTurnId);
      this.game.active = message.playerId;
      await this.game.massKillAll();
      this.sendTurnComplete(message);
      return;
    }
    if (message.type === "turn" && this.started) {
      this.activeTurnId = Number(message.activeTurnId ?? this.activeTurnId);
      this.game.active = message.active;
      if (Number.isFinite(Number(message.wind))) this.game.wind = Number(message.wind);
      this.syncRoster(message.players);
      this.lastChecksum = message.checksum || this.lastChecksum;
      const active = this.game.players[this.game.active];
      this.game.weapon = preferredWeaponFor(active, this.game.weapon);
      if (active) {
        document.getElementById("angle").value = String(active.angle);
        document.getElementById("power").value = String(active.power);
      }
      this.game.render(active ? `${active.name}'s turn.` : `Player ${message.active + 1}'s turn.`);
      setControlsDisabled(false);
      this.game.scheduleAiTurn();
      return;
    }
    if (message.type === "round-over" && this.started) {
      this.syncRoster(message.players);
      this.settings.currentRound = Number(message.currentRound ?? this.settings.currentRound);
      this.settings.rounds = Number(message.rounds ?? this.settings.rounds);
      const winner = Number.isInteger(message.winner) ? this.game.players[message.winner] : null;
      this.game.roundOver = true;
      this.game.animating = false;
      this.game.render(winner ? `${winner.name} wins round ${this.settings.currentRound}.` : `Round ${this.settings.currentRound} ended.`);
      setControlsDisabled(true);
      if (message.final) {
        hideWaitingBox();
        this.started = false;
        this.gameOver = true;
        this.room = "";
        this.players = [];
        this.status(`Game complete. ${winner ? `${winner.name} was last standing.` : "No tanks survived."}`);
        this.roster();
        this.gameList();
        setControlsDisabled(true);
        showRoundEnd({ final: true, winner });
      } else {
        this.status(`Round ${this.settings.currentRound}/${this.settings.rounds} complete. Shop or continue when ready.`);
        showRoundEnd({ final: false, winner });
      }
      return;
    }
    if (message.type === "desync" && this.started) {
      this.syncRoster(message.players);
      this.started = false;
      this.game.roundOver = true;
      this.game.animating = false;
      this.status(message.message || "Game ended because clients are out of sync.");
      this.game.render(message.message || "Game ended because clients are out of sync.");
      setControlsDisabled(false);
      return;
    }
  }
}
const multiplayer = new MultiplayerSession(game);
globalThis.multiplayerSession = multiplayer;
function renderTankIcon(canvas, tankType) {
  const sprite = tankData[tankType];
  const pixels = [];
  for (let row = 1; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const color = sprite[row][col];
      if (color === 0 || color === TURRET_COLOR) continue;
      pixels.push({ x: col, y: row - 1, color });
    }
  }
  const barrelStartX = sprite[0][0];
  const barrelStartY = sprite[0][1];
  const barrelEndX = barrelStartX + Math.trunc(sprite[0][2] * Math.cos(START_ANGLE * Math.PI / 180));
  const barrelEndY = barrelStartY - Math.trunc(sprite[0][2] * Math.sin(START_ANGLE * Math.PI / 180));
  const allX = [...pixels.map((pixel) => pixel.x), barrelStartX, barrelEndX];
  const allY = [...pixels.map((pixel) => pixel.y), barrelStartY, barrelEndY];
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const pad = 2;
  canvas.width = maxX - minX + 1 + pad * 2;
  canvas.height = maxY - minY + 1 + pad * 2;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.style.background = "transparent";
  const xOffset = pad - minX;
  const yOffset = pad - minY;
  const data = ctx.createImageData(canvas.width, canvas.height);
  for (const pixel of pixels) {
    const iconColor = pixel.color === DARK_GRAY ? rgb(88, 88, 88) : rgb(0, 0, 0);
    writePixel(data.data, (yOffset + pixel.y) * canvas.width + xOffset + pixel.x, iconColor);
  }
  const x1 = xOffset + barrelStartX;
  const y1 = yOffset + barrelStartY;
  const x2 = xOffset + barrelEndX;
  const y2 = yOffset + barrelEndY;
  writeLine(data.data, canvas.width, canvas.height, x1, y1, x2, y2, rgb(0, 0, 0));
  ctx.putImageData(data, 0, 0);
}

function syncTankPicker(targetId) {
  const select = document.getElementById(targetId);
  const picker = document.querySelector(`[data-tank-picker="${targetId}"]`);
  if (!select || !picker) return;
  const selected = Number(select.value);
  for (const button of picker.querySelectorAll(".tank-pick")) {
    const isSelected = Number(button.dataset.tank) === selected;
    button.classList.toggle("selected", isSelected);
    button.disabled = select.disabled;
    button.setAttribute("aria-pressed", String(isSelected));
  }
}

function syncTankPickers() {
  for (const picker of document.querySelectorAll("[data-tank-picker]")) syncTankPicker(picker.dataset.tankPicker);
}

function initTankPickers() {
  for (const picker of document.querySelectorAll("[data-tank-picker]")) {
    const targetId = picker.dataset.tankPicker;
    picker.innerHTML = tankData.map((_, index) => `
      <button class="tank-pick" type="button" data-tank="${index}" aria-label="Tank ${index + 1}">
        <canvas></canvas>
      </button>
    `).join("");
    for (const button of picker.querySelectorAll(".tank-pick")) {
      renderTankIcon(button.querySelector("canvas"), Number(button.dataset.tank));
      button.addEventListener("click", () => {
        document.getElementById(targetId).value = button.dataset.tank;
        syncTankPicker(targetId);
      });
    }
    syncTankPicker(targetId);
  }
}

game.canvas.addEventListener("mousemove", (event) => {
  const rect = game.canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) * game.canvas.width / rect.width);
  const y = Math.floor((event.clientY - rect.top) * game.canvas.height / rect.height);
  game.setHover(x, y);
});
game.canvas.addEventListener("mouseleave", () => {
  game.hoverPlayer = null;
  game.drawWorld();
});

function updateUi(game, message = "") {
  syncGameModeUi();
  const activePlayer = game.players[game.active];
  if (activePlayer) game.weapon = preferredWeaponFor(activePlayer, game.weapon);
  const weaponOptions = WEAPONS
    .map((weapon, index) => ({ weapon, index, qty: activePlayer ? activePlayer.weapons[index] : weapon.ammo }))
    .filter(({ qty }) => qty > 0)
    .map(({ weapon, index }) => `<option value="${index}">${weapon.name}</option>`)
    .join("");
  document.getElementById("weaponSelect").innerHTML = weaponOptions;
  document.getElementById("turnLabel").textContent = activePlayer?.alive ? `${activePlayer.name}'s turn` : "";
  document.getElementById("status").textContent = message || `Wind ${game.wind} | ${WEAPONS[game.weapon].name}`;
  document.getElementById("angleReadout").textContent = activePlayer ? String(activePlayer.angle) : "";
  document.getElementById("powerReadout").textContent = activePlayer ? String(activePlayer.power) : "";
  document.getElementById("ammoOut").textContent = String(activePlayer ? activePlayer.weapons[game.weapon] : WEAPONS[game.weapon].ammo);
  document.getElementById("weaponSelect").value = String(game.weapon);
  document.getElementById("windOut").textContent = String(game.wind);
  document.getElementById("roundOut").textContent = roundReadoutText();
  const players = document.getElementById("players");
  players.innerHTML = game.players.map((player) => {
    const pct = Math.max(0, Math.min(100, Math.round(player.powerLimit / MAX_POWER * 100)));
    const nameColor = player.alive ? cssColor(PLAYER_COLORS[player.id]) : "#000";
    return `<div class="player-row ${player.alive ? "" : "dead"} ${player === activePlayer ? "active-player" : ""}">
      <span class="chip" style="background:${cssColor(PLAYER_COLORS[player.id])}"></span>
      <span style="color:${nameColor}">${player.name}${player.ai ? " *" : ""}</span>
      <span class="meter"><span style="width:${pct}%"></span></span>
    </div>`;
  }).join("");
  updateDebugConsole(game);
}

function roundReadoutText() {
  const net = globalThis.multiplayerSession;
  if (net?.started || net?.settings?.currentRound) {
    const current = Math.max(1, Number(net.settings.currentRound) || 1);
    const total = Math.max(1, Number(net.settings.rounds) || 1);
    return `Round ${current} out of ${total}`;
  }
  const current = Math.max(1, Number(singlePlayerSettings.currentRound) || 1);
  const total = Math.max(1, Number(singlePlayerSettings.rounds) || 1);
  return `Round ${current} out of ${total}`;
}

function closeTopDialog() {
  if (!document.getElementById("waitingBox").classList.contains("hidden")) return false;
  for (const id of ["createGameBox", "licenseBox", "aboutBox", "inventoryBox", "shopBox", "roundEndBox", "statsBox", "debugBox", "multiplayerBox", "systemMenu", "roundSetup"]) {
    const element = document.getElementById(id);
    if (!element.classList.contains("hidden")) {
      element.classList.add("hidden");
      return true;
    }
  }
  return false;
}

function showWaitingBox(readyClientIds = [], waiting = []) {
  const net = globalThis.multiplayerSession;
  const ready = new Set(readyClientIds);
  const box = document.getElementById("waitingBox");
  if (!net?.clientId || !ready.has(net.clientId) || !waiting.length) {
    box.classList.add("hidden");
    return;
  }
  document.getElementById("waitingPlayers").innerHTML = `Waiting for:<br>${waiting.map((player) => escapeHtml(player.name)).join("<br>")}`;
  box.classList.remove("hidden");
}

function hideWaitingBox() {
  document.getElementById("waitingBox").classList.add("hidden");
}

function showStatistics() {
  document.getElementById("statsRows").innerHTML = statsRowsHtml(currentStatsPlayers());
  document.getElementById("statsBox").classList.remove("hidden");
}

function currentStatsPlayers() {
  const snapshot = new Map((game.statsSnapshot || []).map((entry) => [entry.id, entry]));
  return game.players.map((player) => {
    const saved = snapshot.get(player.id);
    if (!saved) return player;
    return {
      ...player,
      kills: Number(player.kills) || Number(saved.kills) || 0,
      earnedCash: Number(player.earnedCash) || Number(saved.earnedCash) || 0,
      overallKills: Number(player.overallKills) || Number(saved.overallKills) || 0,
      overallGain: Number(player.overallGain) || Number(saved.overallGain) || 0
    };
  });
}

function statsRowsHtml(players) {
  const rows = [...players].sort((a, b) => b.earnedCash - a.earnedCash || b.kills - a.kills || a.id - b.id);
  return rows.map((player) => `
    <div class="stats-grid">
      <span>${player.name.slice(0, 20)}</span>
      <span>${player.kills}</span>
      <span>${player.earnedCash}</span>
      <span>${player.overallKills}</span>
      <span>${player.overallGain}</span>
    </div>
  `).join("");
}

function showRoundEnd(options = {}) {
  game.captureStatsSnapshot();
  const final = !!options.final;
  const title = document.querySelector("#roundEndBox .window-title");
  if (title) {
    title.textContent = final
      ? `Game Over${options.winner ? ` - ${options.winner.name} was last standing` : ""}`
      : "Players Statistics";
  }
  const nextButton = document.getElementById("playNextRound");
  const shopButton = document.getElementById("goShopping");
  nextButton.textContent = final
    ? (globalThis.multiplayerSession?.started || globalThis.multiplayerSession?.gameOver ? "Back to games" : "New game")
    : "Play next round";
  shopButton.classList.toggle("hidden", final);
  document.getElementById("roundEndRows").innerHTML = statsRowsHtml(currentStatsPlayers());
  document.getElementById("roundEndBox").classList.remove("hidden");
}

function debugBackgroundLines(currentGame) {
  const bitmap = currentGame.bitmap;
  if (!bitmap) return ["Background: unavailable"];
  const lines = [`Background: ${bitmap.backgroundKind}`];
  if (bitmap.backgroundKind === "gradient") {
    lines.push(`  top/start: ${cssColor(bitmap.gradientA)} ${hexColor(bitmap.gradientA)}`);
    lines.push(`  bottom/end: ${cssColor(bitmap.gradientB)} ${hexColor(bitmap.gradientB)}`);
  } else if (bitmap.backgroundKind === "plain") {
    lines.push(`  color: ${cssColor(bitmap.plainColor)} ${hexColor(bitmap.plainColor)}`);
  } else if (bitmap.backgroundKind === "stars") {
    const starCount = bitmap.stars.reduce((count, y) => count + (y >= 0 ? 1 : 0), 0);
    lines.push(`  stars: ${starCount}`);
    lines.push("  sky color: rgb(0, 0, 0) #000000");
  }
  lines.push(`Ground: ${cssColor(currentGame.groundColor)} ${hexColor(currentGame.groundColor)}`);
  return lines;
}

function updateDebugConsole(currentGame = game) {
  const output = document.getElementById("debugOutput");
  if (!output) return;
  const active = activePlayer(currentGame);
  const lines = [
    "Scorch 2000 Debug",
    ...debugBackgroundLines(currentGame),
    `Seed: ${currentGame.rand.initialSeed}`,
    `RNG state: ${currentGame.rand.seed}`,
    `Resolution: ${WIDTH}x${HEIGHT}`,
    `Galsla mode: ${currentGame.galslaMode ? "on" : "off"}`,
    `Wind: ${currentGame.wind}`,
    `Round over: ${currentGame.roundOver}`,
    `Animating: ${currentGame.animating}`,
    `Active player: ${active ? `${active.name} #${active.id}` : "none"}`,
    `Weapon: ${WEAPONS[currentGame.weapon]?.name ?? "unknown"} (#${currentGame.weapon})`,
    `Tracer trails: ${currentGame.tracerTrails.length}`,
    `Hover: ${currentGame.hoverPlayer ? currentGame.hoverPlayer.name : "none"}`,
    `Multiplayer: ${globalThis.multiplayerSession?.started ? `game=${globalThis.multiplayerSession.room} self=${globalThis.multiplayerSession.playerId} turn=${currentGame.active}` : "offline"}`,
    `Last net checksum: ${globalThis.multiplayerSession?.lastChecksum || "n/a"}`,
    "",
    "Players:"
  ];
  for (const player of currentGame.players) {
    lines.push(
      `  #${player.id} ${player.name}${player.ai ? " [AI]" : ""}` +
      ` alive=${player.alive}` +
      ` pos=${player.x},${player.y}` +
      ` angle=${player.angle}` +
      ` power=${player.power}/${player.powerLimit}` +
      ` kills=${player.kills}` +
      ` cash=${player.cash}`
    );
  }
  output.textContent = lines.join("\n");
}

function toggleDebugConsole() {
  const box = document.getElementById("debugBox");
  const shouldOpen = box.classList.contains("hidden");
  if (shouldOpen) updateDebugConsole();
  box.classList.toggle("hidden", !shouldOpen);
}

function activePlayer(currentGame = game) {
  return currentGame.players[currentGame.active] ?? currentGame.players[0];
}

function usableWeaponIndex(player, preferred = 0) {
  if (player && (player.weapons[preferred] ?? 0) > 0) return preferred;
  return Math.max(0, player?.weapons.findIndex((qty) => qty > 0) ?? 0);
}

function preferredWeaponFor(player, fallback = 0) {
  if (!player) return fallback;
  const preferred = Number.isInteger(player.preferredWeapon) ? player.preferredWeapon : player.lastWeapon;
  if ((player.weapons[preferred] ?? 0) > 0) return preferred;
  if ((player.weapons[player.lastWeapon] ?? 0) > 0) return player.lastWeapon;
  if ((player.weapons[fallback] ?? 0) > 0) return fallback;
  return usableWeaponIndex(player, preferred);
}

function localHumanPlayer() {
  const net = globalThis.multiplayerSession;
  if (net?.started && net.playerId != null && game.players[net.playerId]) return game.players[net.playerId];
  return game.players.find((player) => !player.ai) ?? game.players[0];
}

function localShopPlayers() {
  const humans = game.players.filter((player) => !player.ai);
  return humans.length ? humans : [game.players[0]].filter(Boolean);
}

function autoDefenseEligibleItem(item, index) {
  return item.type !== "fuel" && item.type !== "autodefense";
}

function canUseAutoDefense(player) {
  return !!player && (player.items[6] || 0) > 0 && ITEMS.some((item, index) =>
    autoDefenseEligibleItem(item, index) && (player.items[index] || 0) > 0
  );
}

function showInventory(player = activePlayer(), options = {}) {
  const autoDefense = !!options.autoDefense;
  const rows = [];
  const title = document.querySelector("#inventoryBox .window-title");
  if (title) title.textContent = autoDefense ? `Auto Defense System - ${player.name}` : "Inventory";
  if (!autoDefense) {
    rows.push(...WEAPONS.map((weapon, index) => ({ name: weapon.name, qty: player.weapons[index], action: `<button data-select-weapon="${index}">Select</button>` }))
      .filter((row) => row.qty > 0));
  }
  rows.push(...ITEMS.map((item, index) => ({ name: item.name, qty: player.items[index], action: inventoryAction(item, index, player, autoDefense) }))
    .filter((row) => row.qty > 0 && row.action));
  document.getElementById("inventoryRows").innerHTML = rows.map((row) => `
    <div class="inventory-grid"><span>${row.name}</span><span>${row.qty}</span><span>${row.action}</span></div>
  `).join("") || (autoDefense
    ? `<div class="inventory-grid"><span>No defensive items available</span><span></span><span></span></div>`
    : `<div class="inventory-grid"><span>Missile</span><span>999</span><span><button data-select-weapon="0">Select</button></span></div>`);
  document.getElementById("inventoryBox").classList.remove("hidden");
}

function inventoryAction(item, index, player, autoDefense = false) {
  if (autoDefense && !autoDefenseEligibleItem(item, index)) return "";
  if (item.type === "battery") return `<button data-use-item="${index}">Install</button>`;
  if (item.type === "shield") return `<button data-use-item="${index}">Activate</button>`;
  if (item.type === "fuel") return autoDefense ? "" : `<span class="shop-row-buttons"><button data-use-item="${index}" data-use-arg="-1">Left</button><button data-use-item="${index}" data-use-arg="1">Right</button></span>`;
  if (item.type === "tracer") return `<button data-use-item="${index}">${player.tracer ? "Stop" : "Use"}</button>`;
  if (item.type === "parachute") return `<button data-use-item="${index}" data-use-arg="${player.parachutes > 0 ? 0 : player.items[index]}">${player.parachutes > 0 ? "Stop" : "Use"}</button>`;
  if (item.type === "autodefense") return "<span>Ready</span>";
  return "";
}

async function applyItemUse(playerId, index, arg = null) {
  const player = game.players[playerId];
  const item = ITEMS[index];
  if (!player || !item) return false;
  if (player.items[index] <= 0 && item.type !== "parachute") return false;
  if (item.type === "battery") {
    player.items[index]--;
    player.powerLimit = Math.min(MAX_POWER, player.powerLimit + item.power);
    player.power = Math.min(player.powerLimit, player.power + item.power);
  } else if (item.type === "shield") {
    player.items[index]--;
    player.shield = { strength: item.strength, maxStrength: item.strength, damage: item.damage, thickness: item.thickness };
  } else if (item.type === "fuel") {
    const dir = Number(arg) < 0 ? -1 : 1;
    if (player.items[index] <= 0) return false;
    const ty = player.y + player.height - 1;
    const tx = dir === 1 ? player.x + player.width : player.x - 1;
    if (tx + dir < 0 || tx + dir >= WIDTH || !game.bitmap.isBackground(tx + dir, ty - 1)) return false;
    player.items[index]--;
    const baseX = dir === 1
      ? tx - (player.sprite[0][6] ?? 0)
      : tx + (player.sprite[0][5] ?? 0);
    if (!game.bitmap.isBackground(baseX, ty)) player.y--;
    player.x = Math.max(0, Math.min(WIDTH - player.width - 1, player.x + dir));
    const fallCount = await game.settleOneTank(player, true, { usingFuel: true });
    game.applyFallingDamage(player, fallCount);
  } else if (item.type === "parachute") {
    player.parachutes = Math.max(0, Math.min(player.items[index], Number(arg) || 0));
  } else if (item.type === "tracer") {
    player.tracer = !player.tracer;
  } else if (item.type === "autodefense") {
    player.autoDefense = true;
  }
  game.render();
  if (!document.getElementById("inventoryBox").classList.contains("hidden") && player === activePlayer() && !autoDefenseMode) showInventory();
  return true;
}

function autoActivateDefaultItems(player) {
  if (!canUseAutoDefense(player)) return false;
  player.items[6]--;
  for (const index of [2, 1, 0]) {
    if (player.items[index] <= 0) continue;
    const item = ITEMS[index];
    player.items[index]--;
    player.shield = { strength: item.strength, maxStrength: item.strength, damage: item.damage, thickness: item.thickness };
    break;
  }
  if (player.items[3] > 0) player.parachutes = player.items[3];
  if (player.items[5] > 0) player.tracer = true;
  return true;
}

function localAutoDefensePlayers() {
  if (multiplayer.started) {
    const player = game.players[multiplayer.playerId];
    return player && !player.ai && canUseAutoDefense(player) ? [player] : [];
  }
  return game.players.filter((player) => !player.ai && canUseAutoDefense(player));
}

function beginAutoDefensePhase(options = {}) {
  let automaticUse = false;
  for (const player of game.players) {
    if (player.ai && autoActivateDefaultItems(player)) automaticUse = true;
  }
  autoDefenseQueue = localAutoDefensePlayers();
  if (!autoDefenseQueue.length) {
    finishAutoDefensePhase(options.multiplayer, automaticUse);
    return;
  }
  autoDefenseMode = true;
  setControlsDisabled(true);
  openNextAutoDefensePlayer(options.multiplayer);
}

function openNextAutoDefensePlayer(multiplayerPhase = false) {
  autoDefensePlayer = autoDefenseQueue.shift() ?? null;
  if (!autoDefensePlayer) {
    finishAutoDefensePhase(multiplayerPhase, true);
    return;
  }
  if (autoDefensePlayer.items[6] > 0) autoDefensePlayer.items[6]--;
  showInventory(autoDefensePlayer, { autoDefense: true });
  game.render(`${autoDefensePlayer.name} can enable defensive items.`);
}

function finishAutoDefensePhase(multiplayerPhase = false, hadOpportunity = true) {
  document.getElementById("inventoryBox").classList.add("hidden");
  autoDefenseMode = false;
  const finishedPlayer = autoDefensePlayer;
  autoDefensePlayer = null;
  autoDefenseQueue = [];
  if (multiplayerPhase) {
    const player = finishedPlayer ?? game.players[multiplayer.playerId];
    multiplayer.autoDefenseReady(player);
    game.render(hadOpportunity ? "Auto defense complete. Waiting for players..." : "Waiting for players...");
    return;
  }
  setControlsDisabled(false);
  if (hadOpportunity) game.render("Auto defense complete.");
  else game.render();
  game.scheduleAiTurn();
}

async function useItem(index, arg = null, playerId = game.active) {
  if (multiplayer.started) {
    multiplayer.useItem(index, arg, playerId);
    return;
  }
  if (await applyItemUse(playerId, index, arg)) {
    if (autoDefenseMode && autoDefensePlayer) showInventory(autoDefensePlayer, { autoDefense: true });
    else showInventory();
  }
}

let shopOrders = [];
let shopPlayer = null;
let shopQueue = [];
let initialShopOpened = false;
let shopMode = "initial";
function openShop(mode = "initial", players = null) {
  shopMode = mode;
  shopQueue = (players ?? [localHumanPlayer()]).filter(Boolean);
  shopPlayer = shopQueue.shift() ?? localHumanPlayer();
  openCurrentShop();
}

function openCurrentShop() {
  shopOrders = Array(WEAPONS.length + ITEMS.length).fill(0);
  renderShop();
  document.getElementById("shopBox").classList.remove("hidden");
}

function finishShopSession(player, mode, message, sendUpdate = false) {
  document.getElementById("shopBox").classList.add("hidden");
  if (shopQueue.length) {
    shopPlayer = shopQueue.shift();
    openCurrentShop();
    return;
  }
  shopMode = "initial";
  shopPlayer = null;
  if (multiplayer.started) {
    if (sendUpdate && player) multiplayer.sendShopUpdate(player);
    if (mode === "between-round" || mode === "initial") {
      multiplayer.readyForNextRound();
      game.render(message);
      setControlsDisabled(true);
    } else {
      game.render(message);
      setControlsDisabled(false);
    }
  } else {
    if (mode === "initial") {
      game.render(message);
      beginAutoDefensePhase();
    } else {
      startNextSinglePlayerRound();
    }
  }
}

function maybeOpenInitialShop() {
  const net = globalThis.multiplayerSession;
  if (!net?.started || initialShopOpened || net.settings.currentRound !== 1 || net.settings.initialCash <= 0 || net.settings.unlimitedInventory) return;
  const player = localHumanPlayer();
  if (!player || player.ai) return;
  initialShopOpened = true;
  setControlsDisabled(true);
  openShop("initial");
}

function renderShop() {
  const player = shopPlayer ?? localHumanPlayer();
  const rows = shopRows(player);
  const orderedCost = rows.reduce((sum, row, slot) => sum + shopOrders[slot] / row.bundle * row.price, 0);
  const cashLeft = player.cash - orderedCost;
  document.getElementById("shopCash").textContent = `Please buy weapons and items for ${player.name}. You have $${cashLeft} left`;
  document.getElementById("shopRows").innerHTML = rows.map((row, slot) => {
    const maxOrder = row.max ? row.max - row.qty : Infinity;
    const canAdd = row.price > 0 && cashLeft >= row.price && shopOrders[slot] + row.bundle <= maxOrder;
    const canRemove = shopOrders[slot] > 0;
    return `<div class="shop-grid">
      <span>${row.name}</span><span>${row.price}</span><span>${row.qty}</span><span>${shopOrders[slot]}</span>
      <span class="shop-row-buttons"><button data-shop-add="${slot}" ${canAdd ? "" : "disabled"}>add</button><button data-shop-remove="${slot}" ${canRemove ? "" : "disabled"}>remove</button></span>
    </div>`;
  }).join("");
}

function shopRows(player) {
  return [
    ...WEAPONS.map((weapon, index) => ({ ...weapon, index, qty: player.weapons[index], kind: "weapon" })),
    ...ITEMS.map((item, index) => ({ ...item, index, qty: player.items[index], kind: "item" }))
  ];
}

function shopOrderCost(rows = shopRows(shopPlayer ?? localHumanPlayer())) {
  return rows.reduce((sum, row, slot) => sum + shopOrders[slot] / row.bundle * row.price, 0);
}

function changeShopOrder(slot, direction) {
  const player = shopPlayer ?? localHumanPlayer();
  const rows = shopRows(player);
  const row = rows[slot];
  if (!row) return;
  const cashLeft = player.cash - shopOrderCost(rows);
  if (direction > 0) {
    const maxOrder = row.max ? row.max - row.qty : Infinity;
    if (row.price > 0 && cashLeft >= row.price && shopOrders[slot] + row.bundle <= maxOrder) {
      shopOrders[slot] += row.bundle;
    }
  } else if (shopOrders[slot] > 0) {
    shopOrders[slot] = Math.max(0, shopOrders[slot] - row.bundle);
  }
  renderShop();
}

function confirmShop() {
  const player = shopPlayer ?? localHumanPlayer();
  let slot = 0;
  for (let i = 0; i < WEAPONS.length; i++, slot++) {
    player.weapons[i] += shopOrders[slot];
    player.cash -= shopOrders[slot] / WEAPONS[i].bundle * WEAPONS[i].price;
  }
  for (let i = 0; i < ITEMS.length; i++, slot++) {
    player.items[i] += shopOrders[slot];
    player.cash -= shopOrders[slot] / ITEMS[i].bundle * ITEMS[i].price;
  }
  const mode = shopMode;
  const message = multiplayer.started
    ? (mode === "initial" ? "Shopping complete. Waiting for players..." : "Shopping complete. Waiting for next round...")
    : (mode === "initial" ? "Shopping complete." : "Shopping complete. Starting next round...");
  finishShopSession(player, mode, message, true);
}

function cancelShop() {
  const mode = shopMode;
  const message = multiplayer.started
    ? (mode === "initial" ? "Shopping skipped. Waiting for players..." : "Shopping skipped. Waiting for next round...")
    : (mode === "initial" ? "Shopping skipped." : "Shopping skipped. Starting next round...");
  finishShopSession(shopPlayer, mode, message, false);
}

function setControlsDisabled(disabled) {
  syncGameModeUi();
  const remoteTurn = globalThis.multiplayerSession?.started && !globalThis.multiplayerSession.isLocalTurn();
  const active = game.players[game.active];
  const aiTurn = !!active?.ai;
  const finalDisabled = disabled || remoteTurn || aiTurn;
  for (const id of ["fire", "newRound", "angle", "power", "weaponSelect", "powerUp", "powerDown", "angleUp", "angleDown", "inventory"]) {
    document.getElementById(id).disabled = finalDisabled;
  }
}

function syncGameModeUi() {
  const net = globalThis.multiplayerSession;
  const multiplayerMode = !!(net?.started || net?.room || net?.gameOver);
  document.getElementById("newRound").classList.toggle("hidden", multiplayerMode);
  return multiplayerMode;
}

const weaponSelect = document.getElementById("weaponSelect");
document.title = `Scorched Earth 2000 HTML Port ${CLIENT_VERSION}`;
document.getElementById("clientVersionLabel").textContent = `Scorched Earth 2000 ${CLIENT_VERSION}`;
document.getElementById("aboutVersionLabel").textContent = CLIENT_VERSION;
weaponSelect.addEventListener("change", (event) => {
  game.weapon = Number(event.target.value);
  const player = activePlayer();
  if (player) player.lastWeapon = game.weapon;
  if (player) player.preferredWeapon = game.weapon;
  game.render();
});
initTankPickers();
document.getElementById("multiplayerBox").classList.remove("hidden");
const savedMultiplayerName = multiplayer.loadSavedName();
if (multiplayer.pendingJoinCode) document.getElementById("multiplayerRoom").value = multiplayer.pendingJoinCode;
multiplayer.roster();
if (savedMultiplayerName && multiplayer.pendingJoinCode) {
  multiplayer.enterLobby().catch((error) => multiplayer.status(error.message));
} else {
  multiplayer.showScreen("name");
}

function nudgeAngle(amount) {
  const player = game.players[game.active];
  player.angle = (player.angle + amount + 180) % 180;
  document.getElementById("angle").value = String(player.angle);
  game.render();
  multiplayer.aim(player);
}

function nudgePower(amount) {
  const player = game.players[game.active];
  player.power += amount;
  if (player.power < 0) player.power = player.powerLimit;
  if (player.power > player.powerLimit) player.power = 0;
  document.getElementById("power").value = String(player.power);
  game.render();
  multiplayer.aim(player);
}

document.getElementById("fire").addEventListener("click", () => {
  if (multiplayer.started) multiplayer.fire();
  else game.fire();
});
document.getElementById("newRound").addEventListener("click", () => {
  if (syncGameModeUi()) return;
  document.getElementById("roundSetup").classList.remove("hidden");
});
document.getElementById("playerCount").addEventListener("change", () => {
  const count = Number(document.getElementById("playerCount").value);
  const aiSelect = document.getElementById("aiCount");
  if (Number(aiSelect.value) > count - 1) aiSelect.value = String(count - 1);
});
document.getElementById("aiCount").addEventListener("change", () => {
  const count = Number(document.getElementById("playerCount").value);
  const aiCount = Math.min(Number(document.getElementById("aiCount").value), count - 1);
  document.getElementById("aiCount").value = String(aiCount);
});
document.getElementById("startRound").addEventListener("click", () => {
  const [width, height] = document.getElementById("resolutionSelect").value.split("x").map(Number);
  const count = Number(document.getElementById("playerCount").value);
  const aiCount = Math.min(Number(document.getElementById("aiCount").value), count - 1);
  const tankType = Number(document.getElementById("tankSelect").value);
  const maxWind = Number(document.getElementById("singlePlayerWind").value);
  const changingWinds = document.getElementById("singlePlayerChangingWinds").checked;
  const unlimitedInventory = document.getElementById("singlePlayerUnlimitedInventory").checked;
  const initialCash = Number(document.getElementById("singlePlayerCash").value);
  const rounds = Number(document.getElementById("singlePlayerRounds").value);
  document.getElementById("aiCount").value = String(aiCount);
  game.resize(width, height);
  game.maxWind = Number.isFinite(maxWind) ? Math.max(0, Math.trunc(maxWind)) : PhysicsMaxWind();
  game.changingWinds = changingWinds;
  game.unlimitedInventory = unlimitedInventory;
  INITIAL_CASH = Number.isFinite(initialCash) ? Math.max(0, Math.trunc(initialCash)) : DEFAULT_INITIAL_CASH;
  singlePlayerSettings.maxWind = game.maxWind;
  singlePlayerSettings.changingWinds = game.changingWinds;
  singlePlayerSettings.unlimitedInventory = game.unlimitedInventory;
  singlePlayerSettings.initialCash = INITIAL_CASH;
  singlePlayerSettings.rounds = Number.isFinite(rounds) ? Math.max(1, Math.trunc(rounds)) : 1;
  singlePlayerSettings.currentRound = 1;
  singlePlayerSettings.gameOver = false;
  game.rebuildPlayers(count, aiCount, tankType);
  game.newRound();
  document.getElementById("roundSetup").classList.add("hidden");
  if (singlePlayerSettings.initialCash > 0 && !singlePlayerSettings.unlimitedInventory) {
    setControlsDisabled(true);
    openShop("initial", localShopPlayers());
  } else {
    beginAutoDefensePhase();
  }
});
document.getElementById("cancelRoundSetup").addEventListener("click", () => {
  document.getElementById("roundSetup").classList.add("hidden");
});
document.getElementById("switchToMultiplayer").addEventListener("click", () => {
  document.getElementById("roundSetup").classList.add("hidden");
  multiplayer.roster();
  document.getElementById("multiplayerBox").classList.remove("hidden");
  multiplayer.ensureSocket().catch((error) => multiplayer.status(error.message));
});
document.getElementById("angleDown").addEventListener("click", () => nudgeAngle(1));
document.getElementById("angleUp").addEventListener("click", () => nudgeAngle(-1));
document.getElementById("powerUp").addEventListener("click", () => nudgePower(10));
document.getElementById("powerDown").addEventListener("click", () => nudgePower(-10));
document.getElementById("system").addEventListener("click", () => {
  document.getElementById("massKill").disabled = multiplayer.started && multiplayer.clientId !== multiplayer.hostId;
  document.getElementById("systemMenu").classList.remove("hidden");
});
document.getElementById("multiplayer").addEventListener("click", () => {
  document.getElementById("systemMenu").classList.add("hidden");
  multiplayer.roster();
  document.getElementById("multiplayerBox").classList.remove("hidden");
  multiplayer.ensureSocket().catch((error) => multiplayer.status(error.message));
});
document.getElementById("singlePlayerMode").addEventListener("click", () => {
  document.getElementById("createGameBox").classList.add("hidden");
  document.getElementById("multiplayerBox").classList.add("hidden");
  document.getElementById("roundSetup").classList.remove("hidden");
});
document.getElementById("singlePlayerModeName").addEventListener("click", () => {
  document.getElementById("createGameBox").classList.add("hidden");
  document.getElementById("multiplayerBox").classList.add("hidden");
  document.getElementById("roundSetup").classList.remove("hidden");
});
document.getElementById("singlePlayerModeWaiting").addEventListener("click", () => {
  if (multiplayer.room) multiplayer.leave();
  document.getElementById("createGameBox").classList.add("hidden");
  document.getElementById("multiplayerBox").classList.add("hidden");
  document.getElementById("roundSetup").classList.remove("hidden");
});
document.getElementById("continueMultiplayer").addEventListener("click", () => {
  multiplayer.enterLobby().catch((error) => multiplayer.status(error.message));
});
document.getElementById("multiplayerName").addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  multiplayer.enterLobby().catch((error) => multiplayer.status(error.message));
});
document.getElementById("changeMultiplayerName").addEventListener("click", () => multiplayer.showScreen("name"));
document.getElementById("openCreateGame").addEventListener("click", () => {
  if (!multiplayer.saveName()) return;
  document.getElementById("createRoom").disabled = !multiplayer.connected || !!multiplayer.room;
  document.getElementById("createGameBox").classList.remove("hidden");
  document.getElementById("multiplayerGameName").focus();
  document.getElementById("multiplayerGameName").select();
});
document.getElementById("cancelCreateGame").addEventListener("click", () => {
  document.getElementById("createGameBox").classList.add("hidden");
});
document.getElementById("createRoom").addEventListener("click", () => multiplayer.create().catch((error) => multiplayer.status(error.message)));
document.getElementById("startRoom").addEventListener("click", () => multiplayer.start());
document.getElementById("shareRoom").addEventListener("click", () => multiplayer.share());
document.getElementById("leaveRoom").addEventListener("click", () => multiplayer.leave());
document.getElementById("joinUrl").addEventListener("focus", (event) => event.target.select());
document.querySelector(".multiplayer-ai-actions").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-add-ai]");
  if (!button) return;
  multiplayer.addAi(Number(button.dataset.addAi));
});
document.getElementById("multiplayerGames").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-join-game]");
  if (!button) return;
  document.getElementById("multiplayerRoom").value = button.dataset.joinGame;
  multiplayer.join(button.dataset.joinGame).catch((error) => multiplayer.status(error.message));
});
document.getElementById("multiplayerChatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  sendChatFromInput(document.getElementById("multiplayerChatInput"));
});
document.getElementById("lobbyChatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.getElementById("lobbyChatInput");
  const text = input.value.trim();
  if (!text) return;
  multiplayer.sendLobbyChat(text);
  input.value = "";
});

document.getElementById("gameChatForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (sendChatFromInput(document.getElementById("gameChatInput"))) closeGameChat();
});

function sendChatFromInput(input) {
  const text = input.value.trim();
  if (!text || !multiplayer.room) return false;
  multiplayer.sendChat(text);
  input.value = "";
  return true;
}

function openGameChat(initial = "") {
  if (!multiplayer.started) return;
  const form = document.getElementById("gameChatForm");
  const input = document.getElementById("gameChatInput");
  form.classList.remove("hidden");
  input.value = initial;
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}

function closeGameChat() {
  document.getElementById("gameChatForm").classList.add("hidden");
  document.getElementById("gameChatInput").value = "";
  game.canvas.focus?.();
}

function isTextEntryTarget(target) {
  return target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}
document.getElementById("closeSystem").addEventListener("click", () => {
  document.getElementById("systemMenu").classList.add("hidden");
});
document.getElementById("statistics").addEventListener("click", () => {
  showStatistics();
});
document.getElementById("closeStats").addEventListener("click", () => {
  document.getElementById("statsBox").classList.add("hidden");
});
document.getElementById("closeDebug").addEventListener("click", () => {
  document.getElementById("debugBox").classList.add("hidden");
});
document.getElementById("inventory").addEventListener("click", () => {
  showInventory();
});
document.getElementById("closeInventory").addEventListener("click", () => {
  if (autoDefenseMode) {
    openNextAutoDefensePlayer(multiplayer.started);
    return;
  }
  document.getElementById("inventoryBox").classList.add("hidden");
});
document.getElementById("inventoryRows").addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.selectWeapon !== undefined) {
    const selected = Number(button.dataset.selectWeapon);
    const player = activePlayer();
    if ((player.weapons[selected] ?? 0) > 0) {
      game.weapon = selected;
      player.lastWeapon = selected;
      player.preferredWeapon = selected;
      document.getElementById("weaponSelect").value = String(selected);
      game.render(`${WEAPONS[selected].name} selected.`);
    }
  } else if (button.dataset.useItem !== undefined) {
    await useItem(Number(button.dataset.useItem), button.dataset.useArg ?? null, autoDefenseMode && autoDefensePlayer ? autoDefensePlayer.id : game.active);
  }
});
document.getElementById("shopRows").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.shopAdd !== undefined) changeShopOrder(Number(button.dataset.shopAdd), 1);
  else if (button.dataset.shopRemove !== undefined) changeShopOrder(Number(button.dataset.shopRemove), -1);
});
document.getElementById("confirmShop").addEventListener("click", () => {
  confirmShop();
});
document.getElementById("cancelShop").addEventListener("click", () => {
  cancelShop();
});
document.getElementById("playNextRound").addEventListener("click", () => {
  document.getElementById("roundEndBox").classList.add("hidden");
  if (multiplayer.gameOver) {
    multiplayer.gameOver = false;
    multiplayer.roster();
    multiplayer.gameList();
    document.getElementById("multiplayerBox").classList.remove("hidden");
    setControlsDisabled(true);
  } else if (multiplayer.started) {
    multiplayer.readyForNextRound();
    game.render("Waiting for next round...");
    setControlsDisabled(true);
  } else if (singlePlayerSettings.gameOver) {
    singlePlayerSettings.gameOver = false;
    document.getElementById("roundSetup").classList.remove("hidden");
    setControlsDisabled(true);
  } else {
    startNextSinglePlayerRound();
  }
});
document.getElementById("goShopping").addEventListener("click", () => {
  document.getElementById("roundEndBox").classList.add("hidden");
  if (multiplayer.started) openShop("between-round");
  else openShop("between-round", localShopPlayers());
});
document.getElementById("about").addEventListener("click", () => {
  document.getElementById("aboutBox").classList.remove("hidden");
});
document.getElementById("closeAbout").addEventListener("click", () => {
  document.getElementById("aboutBox").classList.add("hidden");
});
document.getElementById("license").addEventListener("click", () => {
  const frame = document.querySelector(".license-frame");
  if (!frame.src) frame.src = frame.dataset.src;
  document.getElementById("licenseBox").classList.remove("hidden");
});
document.getElementById("closeLicense").addEventListener("click", () => {
  document.getElementById("licenseBox").classList.add("hidden");
});
document.getElementById("massKill").addEventListener("click", async () => {
  document.getElementById("systemMenu").classList.add("hidden");
  if (multiplayer.started) {
    multiplayer.massKill();
    return;
  }
  await game.massKillAll();
  showRoundEnd();
});

document.addEventListener("keydown", (event) => {
  if (event.target === document.getElementById("gameChatInput")) {
    if (event.key === "Escape") {
      closeGameChat();
      event.preventDefault();
    }
    return;
  }
  if (isTextEntryTarget(event.target)) return;
  if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
    toggleDebugConsole();
    event.preventDefault();
    return;
  }
  if (event.key === "Escape") {
    if (!document.getElementById("waitingBox").classList.contains("hidden")) {
      event.preventDefault();
      return;
    }
    if (closeTopDialog()) event.preventDefault();
    return;
  }
  if (
    multiplayer.started &&
    event.key.length === 1 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    event.code !== "Space"
  ) {
    openGameChat(event.key);
    event.preventDefault();
    return;
  }
  if (
    game.animating ||
    game.roundOver ||
    document.getElementById("fire").disabled ||
    (multiplayer.started && !multiplayer.isLocalTurn())
  ) return;
  const player = game.players[game.active];
  if (event.key === "ArrowLeft") player.angle = (player.angle + 1) % 180;
  else if (event.key === "ArrowRight") player.angle = (player.angle + 179) % 180;
  else if (event.key === "ArrowUp") {
    player.power += 10;
    if (player.power > player.powerLimit) player.power = 0;
  }
  else if (event.key === "ArrowDown") {
    player.power -= 10;
    if (player.power < 0) player.power = player.powerLimit;
  }
  else if (event.code === "Space") {
    if (multiplayer.started) multiplayer.fire();
    else game.fire();
  }
  else return;
  event.preventDefault();
  document.getElementById("angle").value = String(player.angle);
  document.getElementById("power").value = String(player.power);
  game.render();
  if (event.code !== "Space") multiplayer.aim(player);
});

game.render();
