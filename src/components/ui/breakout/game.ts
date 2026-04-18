import {
  layoutNextLine,
  prepareWithSegments,
  type LayoutCursor,
  type PreparedTextWithSegments,
} from "@chenglou/pretext";
import { env } from "@/lib/config/env";
import { gameAudio } from "./audio/manager";
import { PretextRenderer, type TextBlock } from "./pretext-renderer";

const APP_NAME = env.appName ?? "App";
const APP_NAME_LOWER = APP_NAME.toLowerCase();

const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 720;
const FRAME_DELTA_CAP = 1 / 20;
const FALLBACK_FAMILY =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";

function resolveMonoFamily(): string {
  if (typeof window === "undefined") return FALLBACK_FAMILY;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-mono")
    .trim();
  return value.length > 0 ? `${value}, ${FALLBACK_FAMILY}` : FALLBACK_FAMILY;
}

const FONT_FAMILY = resolveMonoFamily();

const FONTS = {
  ball: `800 24px ${FONT_FAMILY}`,
  border: `700 18px ${FONT_FAMILY}`,
  borderCompact: `700 11px ${FONT_FAMILY}`,
  brick: `800 24px ${FONT_FAMILY}`,
  footer: `600 15px ${FONT_FAMILY}`,
  overlay: `800 26px ${FONT_FAMILY}`,
  paddle: `800 20px ${FONT_FAMILY}`,
  powerUp: `800 18px ${FONT_FAMILY}`,
  status: `600 17px ${FONT_FAMILY}`,
  wall: `600 12px ${FONT_FAMILY}`,
  title: `800 40px ${FONT_FAMILY}`,
};

const LINE_HEIGHTS = {
  borderCompact: 12,
  overlay: 34,
  panel: 24,
  powerUp: 24,
  sprite: 24,
  title: 44,
  wall: 16,
};

const HUD_RECT = { x: 44, y: 28, width: VIEW_WIDTH - 88, height: 128 };
const PLAY_RECT = { x: 48, y: 166, width: VIEW_WIDTH - 96, height: 486 };
const FOOTER_RECT = { x: 44, y: 664, width: VIEW_WIDTH - 88, height: 38 };
const BRICK_REGION = {
  x: PLAY_RECT.x + 54,
  y: PLAY_RECT.y + 22,
  width: PLAY_RECT.width - 108,
  height: 208,
};

const BRICK_GAP = 12;
const BRICK_FONT_MIN = 20;
const BRICK_FONT_MAX = 34;
const INITIAL_LIVES = 3;
const PADDLE_SPEED = 540;
const PADDLE_MARGIN_BOTTOM = 34;
const PADDLE_TEXT = "⟦=== ROUTER ===⟧";
const PADDLE_TEXT_WIDE = "⟦===== ROUTER =====⟧";
const BALL_SPEED_BASE = 330;
const BALL_SPEED_STEP = 26;
const WALL_BOUNCE_PADDING = 10;
const POWER_UP_FALL_SPEED = 146;
const POWER_UP_SPAWN_CHANCE = 0.34;
const POWER_UP_SLOW_MULTIPLIER = 0.74;
const POWER_UP_SCORE_BONUS = 35;
const POWER_UP_MAX_GUARD_CHARGES = 2;
const MULTI_BALL_TARGET_COUNT = 3;
const MULTI_BALL_MAX = 5;
const MULTI_BALL_ANGLE_OFFSETS = [-0.42, 0.42, -0.24, 0.24];
const BALL_STUCK_OFFSET_Y = 28;
const GUARD_MARGIN_BOTTOM = 72;
const GUARD_TEXT = "⟦::: FALLBACK :::⟧";

const BRICK_COLORS = ["#ff9c5b", "#f0c35f", "#84d96c", "#55c6d9", "#8ba7ff"];
const SHADOW_COLOR = "rgba(6, 10, 17, 0.8)";
const TEXT_WALL_COLORS = ["#35586b", "#40637a", "#4d7285", "#58707d"];
const WAKE_SPAWN_DISTANCE = 16;
const BALL_WAKE_RADIUS = 38;
const OPENING_SEQUENCE_DURATION = 3.1;
const INTRO_SEQUENCE_DURATION = 2.34;
const CLEAR_SEQUENCE_DURATION = 2.18;
const SEQUENCE_CARD_WIDTH = 372;
const SEQUENCE_CARD_HEIGHT = 88;
const LEVEL_FALLBACK_WORDS = ["TOKEN", "STREAM", "MODEL", "ROUTE"];

const LEVEL_PARAGRAPHS = [
  `${APP_NAME} lights the gateway while bright tokens hold fast and the stream bends around the router edge.`,
  "Measured tokens stay fixed above the completion as the glowing packet opens clean gaps below.",
  "The response tightens near the router then reroutes back through each pocket the packet clears.",
  "Cached tokens slide from border to border and seal each break without dragging anchored targets aside.",
  "Model routing cursor and segment rewrite keep the token stream alive beneath the anchored target words.",
  "Inline retry and measured tokens thread through sparks wakes and fresh gaps around the waiting router line.",
  "Bounce trail track render and flow circle the glowing packet while the first power tokens drop through the response.",
  "Stream parallel throttle split and signal crowd the output while the router carves narrow lanes for harder returns.",
  "Measured labels stay fixed while drifting fragments wake holes and fast rebounds push the smaller tokens around collisions.",
  "Cursor segments fold around fallback lines multiplex arcs and falling power tokens without pulling the surviving targets from position.",
  `${APP_NAME} reflow keeps the arena streaming through collisions pickups rescue flashes and looping wakes behind the anchored tokens.`,
  "Break the final anchors hold the packet above the footer and let the whole completion close around each fresh opening.",
];

const POWER_UP_DEFS = {
  expand: {
    color: "#95edff",
    duration: 12,
    label: "WIDEN",
  },
  guard: {
    color: "#a4f094",
    duration: 0,
    label: "FALLBACK",
  },
  multi: {
    color: "#c7b2ff",
    duration: 0,
    label: "PARALLEL",
  },
  life: {
    color: "#ff9db8",
    duration: 0,
    label: "+QUOTA",
  },
  slow: {
    color: "#ffd577",
    duration: 10,
    label: "THROTTLE",
  },
} as const;

type Mode = "serve" | "playing" | "transition" | "game-over";
type SequenceKind = "opening" | "intro" | "clear";
type PowerUpKind = keyof typeof POWER_UP_DEFS;

type SequenceState = {
  duration: number;
  initialWave: boolean;
  kind: SequenceKind;
  level: number;
  timer: number;
};

type BallState = {
  radius: number;
  speed: number;
  stuckOffsetY: number;
  vx: number;
  vy: number;
  wakePoint: { x: number; y: number } | null;
  x: number;
  y: number;
};

type Brick = {
  alive: boolean;
  block: TextBlock;
  color: string;
  height: number;
  label: string;
  paddingX: number;
  paddingY: number;
  value: number;
  width: number;
  xTarget: number;
  yTarget: number;
  x: number;
  y: number;
};

type Particle = {
  alpha: number;
  affectsWall: boolean;
  block: TextBlock;
  color: string;
  life: number;
  maxLife: number;
  rotation: number;
  spin: number;
  vx: number;
  vy: number;
  wallRadius: number;
  x: number;
  y: number;
};

type PowerUp = {
  block: TextBlock;
  color: string;
  height: number;
  kind: PowerUpKind;
  label: string;
  rotation: number;
  spin: number;
  vx: number;
  vy: number;
  width: number;
  x: number;
  y: number;
};

type BackgroundGlyph = {
  alpha: number;
  block: TextBlock;
  speed: number;
  x: number;
  y: number;
};

type WakeHole = {
  life: number;
  maxLife: number;
  radius: number;
  x: number;
  y: number;
};

type Interval = {
  left: number;
  right: number;
};

type Rect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type WallRectObstacle = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

type PointerState = {
  active: boolean;
  x: number;
};

type ActiveEffects = {
  expand: number;
  guardCharges: number;
  slow: number;
};

const POWER_UP_KINDS: PowerUpKind[] = [
  "expand",
  "slow",
  "multi",
  "guard",
  "life",
];
const POWER_UP_HISTORY_LIMIT = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function easeOutCubic(value: number): number {
  const t = clamp(value, 0, 1);
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(value: number): number {
  const t = clamp(value, 0, 1);
  if (t < 0.5) return 4 * t * t * t;
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutBack(value: number): number {
  const t = clamp(value, 0, 1);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function formatScore(score: number): string {
  return score.toString().padStart(5, "0");
}

function stripLabelDecorators(label: string): string {
  return label.replace(/^[\[\<]+|[\]\>]+$/g, "");
}

function tokenizeLevelParagraph(paragraph: string): string[] {
  const words = paragraph.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)*/g);
  if (words === null) return [...LEVEL_FALLBACK_WORDS];
  const normalized = words.filter((word) => word.length > 1);
  return normalized.length > 0 ? normalized : [...LEVEL_FALLBACK_WORDS];
}

function getBrickFont(size: number): string {
  return `800 ${size}px ${FONT_FAMILY}`;
}

function getBrickLineHeight(size: number): number {
  return Math.round(size * 1.08);
}

function getBrickPaddingX(size: number): number {
  return Math.round(size * 0.18);
}

function getBrickPaddingY(size: number): number {
  return Math.round(size * 0.12);
}

function getBrickRowGap(size: number): number {
  return Math.round(size * 0.2);
}

function pointInRect(x: number, y: number, rect: Rect): boolean {
  return (
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  );
}

export class TokenBreakout {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly renderer = new PretextRenderer();
  private readonly pointer: PointerState = { active: false, x: VIEW_WIDTH / 2 };
  private readonly keys = {
    launchQueued: false,
    left: false,
    right: false,
  };
  private readonly view = {
    dpr: 1,
    height: VIEW_HEIGHT,
    width: VIEW_WIDTH,
  };
  private readonly paddleBlock: TextBlock;
  private readonly expandedPaddleBlock: TextBlock;
  private readonly ballBlock: TextBlock;
  private readonly guardBlock: TextBlock;
  private readonly activeEffects: ActiveEffects = {
    expand: 0,
    guardCharges: 0,
    slow: 0,
  };
  private readonly overlayBlocks = {
    cleared: this.renderer.getBlock(
      "WAVE CLEAR\nPRESS UP OR TAP",
      FONTS.overlay,
      LINE_HEIGHTS.overlay,
      340,
      "pre-wrap",
    ),
    gameOver: this.renderer.getBlock(
      "THE WALL RETURNS\nPRESS R, UP OR TAP",
      FONTS.overlay,
      LINE_HEIGHTS.overlay,
      420,
      "pre-wrap",
    ),
    serve: this.renderer.getBlock(
      "HOLD THE LINE\nPRESS UP OR TAP TO LAUNCH",
      FONTS.overlay,
      LINE_HEIGHTS.overlay,
      420,
      "pre-wrap",
    ),
  };
  private readonly backgroundGlyphs: BackgroundGlyph[];
  private readonly textWallPrepared: PreparedTextWithSegments;
  private readonly paddle = {
    blockWidth: 0,
    x: PLAY_RECT.x + PLAY_RECT.width / 2,
    y: PLAY_RECT.y + PLAY_RECT.height - PADDLE_MARGIN_BOTTOM,
  };

  private animationFrame = 0;
  private destroyed = false;
  private ballRadius = 10;
  private bestScore = 0;
  private balls: BallState[] = [];
  private bricks: Brick[] = [];
  private clearedWave = false;
  private lastTimestamp = 0;
  private level = 1;
  private lives = INITIAL_LIVES;
  private mode: Mode = "serve";
  private particles: Particle[] = [];
  private powerUps: PowerUp[] = [];
  private recentPowerUpKinds: PowerUpKind[] = [];
  private score = 0;
  private screenShake = 0;
  private sequence: SequenceState | null = null;
  private hasShownOpeningIntro = false;
  private statusCopy = "";
  private wakeHoles: WakeHole[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("2D canvas not available");
    this.context = context;

    this.paddleBlock = this.renderer.getBlock(
      PADDLE_TEXT,
      FONTS.paddle,
      LINE_HEIGHTS.sprite,
      500,
    );
    this.expandedPaddleBlock = this.renderer.getBlock(
      PADDLE_TEXT_WIDE,
      FONTS.paddle,
      LINE_HEIGHTS.sprite,
      500,
    );
    this.ballBlock = this.renderer.getBlock(
      "◉",
      FONTS.ball,
      LINE_HEIGHTS.sprite,
    );
    this.guardBlock = this.renderer.getBlock(
      GUARD_TEXT,
      FONTS.powerUp,
      LINE_HEIGHTS.powerUp,
      520,
    );
    this.paddle.blockWidth = this.getCurrentPaddleBlock().width;
    this.ballRadius = Math.max(8, Math.min(14, this.ballBlock.width * 0.45));
    this.backgroundGlyphs = this.buildBackgroundGlyphs();
    this.textWallPrepared = prepareWithSegments(
      this.buildTextWallCopy(),
      FONTS.wall,
    );

    this.attachEvents();
    this.resetWave(true);
    gameAudio.setScene("serve");
    this.resize();
    this.animationFrame = requestAnimationFrame(this.frame);
  }

  private attachEvents(): void {
    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerUp);
    this.canvas.addEventListener("pointerleave", this.onPointerUp);
    this.canvas.style.touchAction = "none";
  }

  destroy(): void {
    this.destroyed = true;
    if (this.animationFrame !== 0) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
    }
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas.removeEventListener("pointerleave", this.onPointerUp);
    gameAudio.stop();
  }

  private isExpandActive(): boolean {
    return this.activeEffects.expand > 0;
  }

  private isSlowActive(): boolean {
    return this.activeEffects.slow > 0;
  }

  private getCurrentPaddleBlock(): TextBlock {
    return this.isExpandActive() ? this.expandedPaddleBlock : this.paddleBlock;
  }

  private syncPaddleWidth(): void {
    this.paddle.blockWidth = this.getCurrentPaddleBlock().width;
    this.paddle.x = clamp(
      this.paddle.x,
      PLAY_RECT.x + this.paddle.blockWidth / 2,
      PLAY_RECT.x + PLAY_RECT.width - this.paddle.blockWidth / 2,
    );
  }

  private getBaseBallSpeed(): number {
    return BALL_SPEED_BASE + (this.level - 1) * BALL_SPEED_STEP;
  }

  private getCurrentBallSpeed(): number {
    return (
      this.getBaseBallSpeed() *
      (this.isSlowActive() ? POWER_UP_SLOW_MULTIPLIER : 1)
    );
  }

  private createBallState(
    x = this.paddle.x,
    y = this.paddle.y - BALL_STUCK_OFFSET_Y,
  ): BallState {
    return {
      radius: this.ballRadius,
      speed: this.getCurrentBallSpeed(),
      stuckOffsetY: BALL_STUCK_OFFSET_Y,
      vx: 0,
      vy: 0,
      wakePoint: null,
      x,
      y,
    };
  }

  private resetBallsToServe(): void {
    this.balls = [this.createBallState()];
  }

  private getPrimaryBall(): BallState {
    if (this.balls.length === 0) {
      this.resetBallsToServe();
    }
    return this.balls[0]!;
  }

  private setBallAngle(ball: BallState, angle: number): void {
    const speed = this.getCurrentBallSpeed();
    ball.speed = speed;
    let vx = Math.cos(angle) * speed;
    let vy = Math.sin(angle) * speed;
    const minVertical = speed * 0.36;
    if (Math.abs(vy) < minVertical) {
      vy = (vy === 0 ? -1 : Math.sign(vy)) * minVertical;
      vx =
        (vx === 0 ? 1 : Math.sign(vx)) *
        Math.sqrt(Math.max(0, speed ** 2 - vy ** 2));
    }
    ball.vx = vx;
    ball.vy = vy;
  }

  private syncBallSpeed(): void {
    const nextSpeed = this.getCurrentBallSpeed();
    for (let index = 0; index < this.balls.length; index++) {
      const ball = this.balls[index]!;
      ball.speed = nextSpeed;
      if (this.mode !== "playing") continue;

      const magnitude = Math.hypot(ball.vx, ball.vy);
      if (magnitude < 0.001) continue;

      const scale = nextSpeed / magnitude;
      ball.vx *= scale;
      ball.vy *= scale;
    }
  }

  private getPowerUpBlock(kind: PowerUpKind): TextBlock {
    const { label } = POWER_UP_DEFS[kind];
    return this.renderer.getBlock(
      `[${label}]`,
      FONTS.powerUp,
      LINE_HEIGHTS.powerUp,
    );
  }

  private getGuardRect(): {
    centerX: number;
    centerY: number;
    height: number;
    left: number;
    right: number;
    top: number;
    width: number;
  } {
    const centerX = PLAY_RECT.x + PLAY_RECT.width / 2;
    const centerY = PLAY_RECT.y + PLAY_RECT.height - GUARD_MARGIN_BOTTOM;
    const width = this.guardBlock.width;
    const height = this.guardBlock.height;
    return {
      centerX,
      centerY,
      height,
      left: centerX - width / 2,
      right: centerX + width / 2,
      top: centerY - height / 2,
      width,
    };
  }

  private getAudioButtonRect(): Rect {
    return {
      height: 28,
      width: 86,
      x: HUD_RECT.x + HUD_RECT.width - 102,
      y: HUD_RECT.y + 12,
    };
  }

  private getOverlayRect(): Rect {
    const serveHeight = 208;
    const defaultHeight = 152;
    const height = this.mode === "serve" ? serveHeight : defaultHeight;
    return {
      x: VIEW_WIDTH / 2 - 228,
      y: PLAY_RECT.y + PLAY_RECT.height / 2 - 34,
      width: 456,
      height,
    };
  }

  private getOverlayAudioButtonRect(): Rect {
    const overlay = this.getOverlayRect();
    return {
      height: 32,
      width: 116,
      x: overlay.x + (overlay.width - 116) / 2,
      y: overlay.y + overlay.height - 52,
    };
  }

  private getSequenceProgress(kind: SequenceKind): number | null {
    if (this.sequence === null || this.sequence.kind !== kind) return null;
    return clamp(this.sequence.timer / this.sequence.duration, 0, 1);
  }

  private beginIntroSequence(initialWave: boolean): void {
    this.sequence = {
      duration: INTRO_SEQUENCE_DURATION + (initialWave ? 0.14 : 0),
      initialWave,
      kind: "intro",
      level: this.level,
      timer: 0,
    };
    this.mode = "transition";
    this.keys.launchQueued = false;
    this.pointer.active = false;
    this.wakeHoles = [];
    gameAudio.setScene("serve");
  }

  private beginOpeningSequence(): void {
    this.hasShownOpeningIntro = true;
    this.sequence = {
      duration: OPENING_SEQUENCE_DURATION,
      initialWave: true,
      kind: "opening",
      level: this.level,
      timer: 0,
    };
    this.mode = "transition";
    this.keys.launchQueued = false;
    this.pointer.active = false;
    this.wakeHoles = [];
    gameAudio.setScene("serve");
  }

  private beginClearSequence(): void {
    this.sequence = {
      duration: CLEAR_SEQUENCE_DURATION,
      initialWave: false,
      kind: "clear",
      level: this.level,
      timer: 0,
    };
    this.mode = "transition";
    this.clearedWave = true;
    this.keys.launchQueued = false;
    this.pointer.active = false;
    this.powerUps = [];
    this.wakeHoles = [];
    this.screenShake = Math.max(this.screenShake, 2.8);
    this.spawnPickupBurst(
      PLAY_RECT.x + PLAY_RECT.width / 2,
      PLAY_RECT.y + PLAY_RECT.height / 2 - 26,
      "CLEAR",
      "#ffcf73",
    );
    gameAudio.playWaveClear();
    gameAudio.setScene("serve");
  }

  private updateTransition(deltaSeconds: number): void {
    if (this.sequence === null) return;

    this.sequence.timer = Math.min(
      this.sequence.duration,
      this.sequence.timer + deltaSeconds,
    );
    this.keys.launchQueued = false;

    if (this.sequence.timer < this.sequence.duration) return;

    if (this.sequence.kind === "opening") {
      this.beginIntroSequence(true);
      return;
    }

    if (this.sequence.kind === "clear") {
      this.level += 1;
      this.resetWave(false);
      return;
    }

    this.sequence = null;
    this.mode = "serve";
  }

  private getEffectSummary(): string {
    const active: string[] = [];
    if (this.balls.length > 1) active.push(`${this.balls.length} BALLS`);
    if (this.isExpandActive())
      active.push(`WIDEN ${Math.ceil(this.activeEffects.expand)}s`);
    if (this.isSlowActive())
      active.push(`THROTTLE ${Math.ceil(this.activeEffects.slow)}s`);
    if (this.activeEffects.guardCharges > 0) {
      active.push(
        this.activeEffects.guardCharges > 1
          ? `FALLBACK x${this.activeEffects.guardCharges}`
          : "FALLBACK READY",
      );
    }
    return active.length === 0 ? "" : `ACTIVE TOKENS: ${active.join("  |  ")}`;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    void gameAudio.unlock();

    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a")
      this.keys.left = true;
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d")
      this.keys.right = true;

    if (event.key.toLowerCase() === "m" && !event.repeat) {
      event.preventDefault();
      gameAudio.toggleMute();
      return;
    }

    if (
      (event.key === "ArrowUp" || event.key === "Enter") &&
      this.mode !== "transition"
    ) {
      event.preventDefault();
      this.keys.launchQueued = true;
    }

    if (event.key.toLowerCase() === "r" && this.mode === "game-over") {
      this.restart();
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a")
      this.keys.left = false;
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d")
      this.keys.right = false;
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    void gameAudio.unlock();
    const point = this.toViewCoordinates(event);
    if (
      this.mode === "serve" &&
      pointInRect(point.x, point.y, this.getOverlayAudioButtonRect())
    ) {
      this.pointer.active = false;
      this.keys.launchQueued = false;
      gameAudio.toggleMute();
      return;
    }
    if (pointInRect(point.x, point.y, this.getAudioButtonRect())) {
      this.pointer.active = false;
      this.keys.launchQueued = false;
      gameAudio.toggleMute();
      return;
    }
    if (this.mode === "transition") {
      this.pointer.active = false;
      this.keys.launchQueued = false;
      return;
    }
    this.pointer.active = true;
    this.pointer.x = point.x;
    this.keys.launchQueued = true;
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const point = this.toViewCoordinates(event);
    this.pointer.x = point.x;
  };

  private readonly onPointerUp = (): void => {
    this.pointer.active = false;
  };

  private readonly resize = (): void => {
    const stage = this.canvas.parentElement;
    if (stage === null) return;

    const rect = stage.getBoundingClientRect();
    const scale = Math.min(rect.width / VIEW_WIDTH, rect.height / VIEW_HEIGHT);
    const displayWidth = Math.round(VIEW_WIDTH * scale);
    const displayHeight = Math.round(VIEW_HEIGHT * scale);

    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(VIEW_WIDTH * dpr);
    this.canvas.height = Math.round(VIEW_HEIGHT * dpr);
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.view.dpr = dpr;
    this.view.width = VIEW_WIDTH;
    this.view.height = VIEW_HEIGHT;
  };

  private readonly frame = (timestamp: number): void => {
    if (this.destroyed) return;
    const deltaSeconds =
      this.lastTimestamp === 0
        ? 1 / 60
        : Math.min(FRAME_DELTA_CAP, (timestamp - this.lastTimestamp) / 1000);

    this.lastTimestamp = timestamp;
    this.update(deltaSeconds);
    this.render();
    this.animationFrame = requestAnimationFrame(this.frame);
  };

  private update(deltaSeconds: number): void {
    this.updateBackgroundGlyphs(deltaSeconds);
    this.updateWakeHoles(deltaSeconds);
    this.updateParticles(deltaSeconds);
    this.updateActiveEffects(deltaSeconds);
    this.screenShake = Math.max(0, this.screenShake - deltaSeconds * 16);
    this.updateBrickAnimations(deltaSeconds);
    this.updatePaddle(deltaSeconds);
    this.updatePowerUps(deltaSeconds);

    if (this.mode === "transition") {
      this.updateTransition(deltaSeconds);
      this.updateStatusCopy();
      return;
    }

    if (this.mode === "serve") {
      const ball = this.getPrimaryBall();
      this.balls.length = 1;
      ball.x = this.paddle.x;
      ball.y = this.paddle.y - ball.stuckOffsetY;
      ball.vx = 0;
      ball.vy = 0;
      ball.speed = this.getCurrentBallSpeed();
      ball.wakePoint = { x: ball.x, y: ball.y };
      if (this.keys.launchQueued) {
        this.launchBall();
        this.keys.launchQueued = false;
      }
      this.updateStatusCopy();
      return;
    }

    if (this.mode === "game-over") {
      if (this.keys.launchQueued) {
        this.restart();
        this.keys.launchQueued = false;
      }
      this.updateStatusCopy();
      return;
    }

    this.keys.launchQueued = false;

    const lastLostBallX = this.updatePlayingBalls(deltaSeconds);

    if (this.bricks.every((brick) => !brick.alive)) {
      this.beginClearSequence();
    } else if (this.balls.length === 0) {
      this.loseLife(lastLostBallX ?? this.paddle.x);
    }

    this.updateStatusCopy();
  }

  private updatePlayingBalls(deltaSeconds: number): number | null {
    let lastLostBallX: number | null = null;
    const currentPaddleBlock = this.getCurrentPaddleBlock();
    const paddleTop = this.paddle.y;
    const paddleLeft = this.paddle.x - this.paddle.blockWidth / 2 - 2;
    const paddleRight = this.paddle.x + this.paddle.blockWidth / 2 + 2;
    const paddleBottom = paddleTop + currentPaddleBlock.height;
    const guard =
      this.activeEffects.guardCharges > 0 ? this.getGuardRect() : null;
    const guardBottom = guard === null ? 0 : guard.top + guard.height;

    for (let ballIndex = this.balls.length - 1; ballIndex >= 0; ballIndex--) {
      const ball = this.balls[ballIndex]!;
      const previousX = ball.x;
      const previousY = ball.y;

      ball.x += ball.vx * deltaSeconds;
      ball.y += ball.vy * deltaSeconds;
      this.trackWake(ball);

      const leftWall = PLAY_RECT.x + WALL_BOUNCE_PADDING + ball.radius;
      const rightWall =
        PLAY_RECT.x + PLAY_RECT.width - WALL_BOUNCE_PADDING - ball.radius;
      const topWall = PLAY_RECT.y + WALL_BOUNCE_PADDING + ball.radius;

      if (ball.x <= leftWall) {
        ball.x = leftWall;
        ball.vx = Math.abs(ball.vx);
      } else if (ball.x >= rightWall) {
        ball.x = rightWall;
        ball.vx = -Math.abs(ball.vx);
      }

      if (ball.y <= topWall) {
        ball.y = topWall;
        ball.vy = Math.abs(ball.vy);
      }

      if (
        ball.vy > 0 &&
        ball.y + ball.radius >= paddleTop &&
        ball.y - ball.radius <= paddleBottom &&
        ball.x >= paddleLeft &&
        ball.x <= paddleRight
      ) {
        const impact = clamp(
          (ball.x - this.paddle.x) / (this.paddle.blockWidth * 0.5),
          -1,
          1,
        );
        const impactDirection =
          impact === 0 ? (ball.vx >= 0 ? 1 : -1) : Math.sign(impact);
        const tunedImpact =
          Math.abs(impact) < 0.18 ? impactDirection * 0.18 : impact;
        ball.y = paddleTop - ball.radius - 1;
        ball.vx = tunedImpact * (ball.speed * 0.92);
        ball.vy = -Math.sqrt(Math.max(0, ball.speed ** 2 - ball.vx ** 2));
        this.screenShake = 1.2;
        gameAudio.playPaddle();
        this.spawnPaddleSpark(ball);
      }

      const ballLeft = ball.x - ball.radius;
      const ballRight = ball.x + ball.radius;
      const ballTop = ball.y - ball.radius;
      const ballBottom = ball.y + ball.radius;

      for (let brickIndex = 0; brickIndex < this.bricks.length; brickIndex++) {
        const brick = this.bricks[brickIndex]!;
        if (!brick.alive) continue;

        const brickLeft = brick.x;
        const brickRight = brick.x + brick.width;
        const brickTop = brick.y;
        const brickBottom = brick.y + brick.height;

        if (
          ballRight < brickLeft ||
          ballLeft > brickRight ||
          ballBottom < brickTop ||
          ballTop > brickBottom
        ) {
          continue;
        }

        brick.alive = false;
        this.score += brick.value;
        this.bestScore = Math.max(this.bestScore, this.score);
        this.screenShake = 2.2;
        gameAudio.playBrick(
          clamp(stripLabelDecorators(brick.label).length / 10, 0.2, 1),
        );
        this.spawnBurst(
          brick.x + brick.width / 2,
          brick.y + brick.height / 2,
          brick,
        );
        this.maybeSpawnPowerUp(
          brick.x + brick.width / 2,
          brick.y + brick.height / 2,
        );

        const overlapLeft = ballRight - brickLeft;
        const overlapRight = brickRight - ballLeft;
        const overlapTop = ballBottom - brickTop;
        const overlapBottom = brickBottom - ballTop;
        const smallestOverlap = Math.min(
          overlapLeft,
          overlapRight,
          overlapTop,
          overlapBottom,
        );

        if (smallestOverlap === overlapLeft) {
          ball.x = brickLeft - ball.radius - 1;
          ball.vx = -Math.abs(ball.vx);
        } else if (smallestOverlap === overlapRight) {
          ball.x = brickRight + ball.radius + 1;
          ball.vx = Math.abs(ball.vx);
        } else if (smallestOverlap === overlapTop) {
          ball.y = brickTop - ball.radius - 1;
          ball.vy = -Math.abs(ball.vy);
        } else {
          ball.y = brickBottom + ball.radius + 1;
          ball.vy = Math.abs(ball.vy);
        }
        break;
      }

      if (
        guard !== null &&
        ball.vy > 0 &&
        ball.y + ball.radius >= guard.top &&
        ball.y - ball.radius <= guardBottom &&
        ball.x >= guard.left &&
        ball.x <= guard.right
      ) {
        const guardImpact = clamp(
          (ball.x - guard.centerX) / (guard.width * 0.5),
          -0.58,
          0.58,
        );
        ball.x = clamp(
          ball.x,
          guard.left + ball.radius + 2,
          guard.right - ball.radius - 2,
        );
        ball.y = guard.top - ball.radius - 1;
        ball.vx = clamp(
          ball.vx + guardImpact * (ball.speed * 0.32),
          -ball.speed * 0.82,
          ball.speed * 0.82,
        );
        ball.vy = -Math.sqrt(Math.max(0, ball.speed ** 2 - ball.vx ** 2));
        this.activeEffects.guardCharges -= 1;
        this.screenShake = 1.8;
        gameAudio.playGuardSave();
        this.spawnPickupBurst(ball.x, guard.top + 8, "SAVE", "#a4f094");
      }

      if (ball.y - ball.radius > PLAY_RECT.y + PLAY_RECT.height + 10) {
        lastLostBallX = ball.x;
        this.balls.splice(ballIndex, 1);
        continue;
      }

      if (
        Math.abs(previousX - ball.x) > 0.5 ||
        Math.abs(previousY - ball.y) > 0.5
      ) {
        this.spawnTrailParticle(ball);
      }
    }

    return lastLostBallX;
  }

  private updatePaddle(deltaSeconds: number): void {
    if (this.mode === "transition") return;

    if (this.pointer.active) {
      const targetX = clamp(
        this.pointer.x,
        PLAY_RECT.x + this.paddle.blockWidth / 2,
        PLAY_RECT.x + PLAY_RECT.width - this.paddle.blockWidth / 2,
      );
      const distance = targetX - this.paddle.x;
      this.paddle.x += distance * Math.min(1, deltaSeconds * 16);
      return;
    }

    let direction = 0;
    if (this.keys.left) direction -= 1;
    if (this.keys.right) direction += 1;
    this.paddle.x = clamp(
      this.paddle.x + direction * PADDLE_SPEED * deltaSeconds,
      PLAY_RECT.x + this.paddle.blockWidth / 2,
      PLAY_RECT.x + PLAY_RECT.width - this.paddle.blockWidth / 2,
    );
  }

  private updateActiveEffects(deltaSeconds: number): void {
    if (this.mode !== "playing") return;

    const expandWasActive = this.isExpandActive();
    const slowWasActive = this.isSlowActive();

    this.activeEffects.expand = Math.max(
      0,
      this.activeEffects.expand - deltaSeconds,
    );
    this.activeEffects.slow = Math.max(
      0,
      this.activeEffects.slow - deltaSeconds,
    );

    if (expandWasActive !== this.isExpandActive()) this.syncPaddleWidth();
    if (slowWasActive !== this.isSlowActive()) this.syncBallSpeed();
  }

  private updatePowerUps(deltaSeconds: number): void {
    if (this.mode === "transition") return;

    const paddleBlock = this.getCurrentPaddleBlock();
    const paddleTop = this.paddle.y - 6;
    const paddleBottom = this.paddle.y + paddleBlock.height + 10;
    const paddleLeft = this.paddle.x - this.paddle.blockWidth / 2 - 10;
    const paddleRight = this.paddle.x + this.paddle.blockWidth / 2 + 10;

    for (let index = this.powerUps.length - 1; index >= 0; index--) {
      const powerUp = this.powerUps[index]!;
      powerUp.x += powerUp.vx * deltaSeconds;
      powerUp.y += powerUp.vy * deltaSeconds;
      powerUp.rotation += powerUp.spin * deltaSeconds;

      const left = powerUp.x - powerUp.width / 2;
      const right = powerUp.x + powerUp.width / 2;
      const top = powerUp.y - powerUp.height / 2;
      const bottom = powerUp.y + powerUp.height / 2;

      if (
        left <= PLAY_RECT.x + 10 ||
        right >= PLAY_RECT.x + PLAY_RECT.width - 10
      ) {
        powerUp.vx *= -1;
        powerUp.x = clamp(
          powerUp.x,
          PLAY_RECT.x + 10 + powerUp.width / 2,
          PLAY_RECT.x + PLAY_RECT.width - 10 - powerUp.width / 2,
        );
      }

      if (
        right >= paddleLeft &&
        left <= paddleRight &&
        bottom >= paddleTop &&
        top <= paddleBottom
      ) {
        this.powerUps.splice(index, 1);
        this.applyPowerUp(powerUp);
        continue;
      }

      if (top > PLAY_RECT.y + PLAY_RECT.height + 24) {
        this.powerUps.splice(index, 1);
      }
    }
  }

  private updateBrickAnimations(deltaSeconds: number): void {
    const ease = Math.min(1, deltaSeconds * 10);
    for (let index = 0; index < this.bricks.length; index++) {
      const brick = this.bricks[index]!;
      if (!brick.alive) continue;
      brick.x += (brick.xTarget - brick.x) * ease;
      brick.y += (brick.yTarget - brick.y) * ease;
    }
  }

  private render(): void {
    const context = this.context;
    context.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    const gradient = context.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    gradient.addColorStop(0, "#07111c");
    gradient.addColorStop(0.48, "#0f2030");
    gradient.addColorStop(1, "#1d1208");
    context.fillStyle = gradient;
    context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    const shakeX = (Math.random() - 0.5) * this.screenShake * 2.8;
    const shakeY = (Math.random() - 0.5) * this.screenShake * 2.2;

    context.save();
    context.translate(shakeX, shakeY);

    this.drawBackgroundGlyphs();
    const isOpening = this.getSequenceProgress("opening") !== null;

    if (!isOpening) {
      this.drawFrame(
        HUD_RECT,
        "#9bbce9",
        FONTS.borderCompact,
        LINE_HEIGHTS.borderCompact,
      );
      this.drawFrame(PLAY_RECT, "#75d7e6");
      this.drawFrame(
        FOOTER_RECT,
        "#f0c35f",
        FONTS.borderCompact,
        LINE_HEIGHTS.borderCompact,
      );
      this.drawHud();
      if (this.getSequenceProgress("intro") !== null) {
        this.drawIntroPlayfield();
      } else {
        this.drawPlayfield();
      }
      this.drawFooter();
    }

    if (this.mode === "transition") {
      this.drawTransitionSequence();
    } else if (this.mode !== "playing") {
      this.drawOverlay();
    }

    context.restore();
  }

  private drawPlayfield(): void {
    this.drawReflowingTextWall();
    this.drawBricks();
    this.drawPowerUps();
    this.drawParticles();
    this.drawGuard();
    this.drawPaddle();
    this.drawBall();
  }

  private drawIntroPlayfield(): void {
    const progress = this.getSequenceProgress("intro");
    if (progress === null) {
      this.drawPlayfield();
      return;
    }

    const wallProgress = easeOutCubic((progress - 0.02) / 0.22);
    const sweepProgress = clamp((progress - 0.16) / 0.28, 0, 1);
    const brickProgress = clamp((progress - 0.62) / 0.24, 0, 1);
    const foregroundProgress = easeOutBack((progress - 0.74) / 0.16);
    const inset = 12;
    const clipX = PLAY_RECT.x + inset;
    const clipY = PLAY_RECT.y + inset;
    const clipWidth = PLAY_RECT.width - inset * 2;
    const clipHeight = PLAY_RECT.height - inset * 2;
    const introRects: WallRectObstacle[] = [];
    const introCircles: Array<{ radius: number; x: number; y: number }> = [];

    if (foregroundProgress > 0.08) {
      const paddleDrawY = this.paddle.y + (1 - foregroundProgress) * 44;
      const paddleBlock = this.getCurrentPaddleBlock();
      introRects.push({
        bottom: paddleDrawY + paddleBlock.height + 6,
        left: this.paddle.x - this.paddle.blockWidth / 2 - 12,
        right: this.paddle.x + this.paddle.blockWidth / 2 + 12,
        top: paddleDrawY - 6,
      });

      const primaryBall = this.getPrimaryBall();
      introCircles.push({
        radius: BALL_WAKE_RADIUS,
        x: primaryBall.x,
        y: primaryBall.y + (1 - foregroundProgress) * 56,
      });

      if (this.activeEffects.guardCharges > 0) {
        const guard = this.getGuardRect();
        const guardOffsetY = (1 - foregroundProgress) * 34;
        introRects.push({
          bottom: guard.centerY + guardOffsetY + guard.height / 2 + 4,
          left: guard.left - 10,
          right: guard.right + 10,
          top: guard.centerY + guardOffsetY - guard.height / 2 - 4,
        });
      }
    }

    this.drawReflowingTextWall(
      (1 - wallProgress) * 14,
      0.24 + wallProgress * 0.76,
      brickProgress,
      introCircles,
      introRects,
      true,
    );

    this.context.save();
    this.context.beginPath();
    this.context.rect(clipX, clipY, clipWidth, clipHeight);
    this.context.clip();
    this.drawBricks(brickProgress);
    this.drawPowerUps();
    this.drawParticles();
    this.drawGuard(
      0.08 + foregroundProgress * 0.92,
      (1 - foregroundProgress) * 34,
    );
    this.drawPaddle(
      0.12 + foregroundProgress * 0.88,
      (1 - foregroundProgress) * 44,
    );
    this.drawBall(
      0.1 + foregroundProgress * 0.9,
      (1 - foregroundProgress) * 56,
    );
    this.context.restore();

    if (sweepProgress > 0 && sweepProgress < 1) {
      const sweepY = clipY + sweepProgress * clipHeight;
      this.context.save();
      this.context.beginPath();
      this.context.rect(clipX, clipY, clipWidth, clipHeight);
      this.context.clip();

      const sweepGradient = this.context.createLinearGradient(
        0,
        sweepY - 84,
        0,
        sweepY + 26,
      );
      sweepGradient.addColorStop(0, "rgba(117, 215, 230, 0)");
      sweepGradient.addColorStop(0.32, "rgba(117, 215, 230, 0.08)");
      sweepGradient.addColorStop(0.54, "rgba(117, 215, 230, 0.18)");
      sweepGradient.addColorStop(0.72, "rgba(255, 221, 153, 0.34)");
      sweepGradient.addColorStop(1, "rgba(255, 221, 153, 0)");
      this.context.fillStyle = sweepGradient;
      this.context.fillRect(clipX, sweepY - 84, clipWidth, 110);

      this.context.fillStyle = "rgba(255, 241, 199, 0.52)";
      this.context.fillRect(clipX + 18, sweepY - 1, clipWidth - 36, 2);
      this.context.restore();
    }
  }

  private drawHud(): void {
    const insetX = 24;
    const titleY = HUD_RECT.y + 18;
    const scoreY = HUD_RECT.y + 24;
    const statusLineHeight = 22;
    const audioRect = this.getAudioButtonRect();
    const title = this.renderer.getBlock(
      "TOKEN BREAKOUT",
      FONTS.title,
      LINE_HEIGHTS.title,
    );
    const scoreLine = this.renderer.getBlock(
      `SCORE ${formatScore(this.score)}   LIVES ${"♥".repeat(this.lives)}   LEVEL ${this.level
        .toString()
        .padStart(2, "0")}`,
      FONTS.status,
      LINE_HEIGHTS.panel,
      audioRect.x - HUD_RECT.x - insetX - 16,
    );
    const statusText = this.renderer.getBlock(
      this.statusCopy,
      FONTS.status,
      statusLineHeight,
      HUD_RECT.width - insetX * 2,
      "pre-wrap",
    );
    const statusY = Math.min(
      HUD_RECT.y + 66,
      HUD_RECT.y +
        HUD_RECT.height -
        LINE_HEIGHTS.borderCompact -
        statusText.height -
        6,
    );

    this.renderer.drawBlock(this.context, title, HUD_RECT.x + insetX, titleY, {
      color: "#f8f4e4",
      shadowBlur: 12,
      shadowColor: "rgba(117, 215, 230, 0.28)",
    });
    this.renderer.drawBlock(this.context, scoreLine, audioRect.x - 16, scoreY, {
      align: "right",
      color: "#ffdd99",
    });
    this.renderer.drawBlock(
      this.context,
      statusText,
      HUD_RECT.x + insetX,
      statusY,
      {
        color: "#9ad6ff",
      },
    );
    this.drawAudioButton(audioRect);
  }

  private drawAudioButton(rect: Rect): void {
    const muted = gameAudio.getMuted();
    const fill = this.context.createLinearGradient(
      0,
      rect.y,
      0,
      rect.y + rect.height,
    );
    if (muted) {
      fill.addColorStop(0, "rgba(33, 23, 18, 0.94)");
      fill.addColorStop(1, "rgba(68, 33, 25, 0.88)");
    } else {
      fill.addColorStop(0, "rgba(18, 33, 41, 0.94)");
      fill.addColorStop(1, "rgba(19, 58, 64, 0.88)");
    }

    this.context.save();
    this.context.fillStyle = fill;
    this.context.fillRect(
      rect.x + 6,
      rect.y + 6,
      rect.width - 12,
      rect.height - 12,
    );
    this.context.restore();

    this.drawFrame(
      rect,
      muted ? "#ffb38f" : "#95edff",
      FONTS.borderCompact,
      LINE_HEIGHTS.borderCompact,
    );

    const block = this.renderer.getBlock(
      muted ? "SND OFF" : "SND ON",
      FONTS.footer,
      16,
    );
    this.renderer.drawBlock(
      this.context,
      block,
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
      {
        align: "center",
        color: muted ? "#ffd6bf" : "#d9fbff",
        shadowBlur: 8,
        shadowColor: "rgba(7, 16, 26, 0.32)",
        verticalAlign: "middle",
      },
    );
  }

  private drawFooter(): void {
    const footerCopy =
      "MOVE: MOUSE, TOUCH, ARROWS, A/D. LAUNCH: UP/TAP. SOUND: ICON OR M. CATCH POWER TOKENS.";
    const footerHeight = this.renderer.measureParagraphHeight(
      footerCopy,
      FONTS.footer,
      16,
      FOOTER_RECT.width - 40,
      "normal",
    );
    const footerBlock = this.renderer.getBlock(
      footerCopy,
      FONTS.footer,
      16,
      FOOTER_RECT.width - 40,
      "normal",
    );

    this.renderer.drawBlock(
      this.context,
      footerBlock,
      FOOTER_RECT.x + 20,
      FOOTER_RECT.y + Math.floor((FOOTER_RECT.height - footerHeight) / 2) - 1,
      {
        color: "#f2e6bf",
      },
    );
  }

  private getBrickRenderState(
    brick: Brick,
    index: number,
    entryProgress: number,
  ): {
    alpha: number;
    drawX: number;
    drawY: number;
    rectX: number;
    rectY: number;
  } {
    const globalProgress = clamp(entryProgress, 0, 1);
    const delay = Math.min(0.46, index * 0.028);
    const localBase =
      globalProgress >= 1
        ? 1
        : clamp((globalProgress - delay) / Math.max(0.001, 1 - delay), 0, 1);
    const local = globalProgress >= 1 ? 1 : easeOutBack(localBase);
    const finalX = brick.x + brick.paddingX;
    const finalY = brick.y + brick.paddingY - 1;
    const orbit = 88 + (index % 5) * 24;

    let sourceX = finalX;
    let sourceY = finalY;

    switch (index % 6) {
      case 0:
        sourceX = PLAY_RECT.x - brick.width - 140 - orbit;
        sourceY = finalY - 48 - orbit * 0.25;
        break;
      case 1:
        sourceX = PLAY_RECT.x + PLAY_RECT.width + 120 + orbit;
        sourceY = finalY - 30 + orbit * 0.22;
        break;
      case 2:
        sourceX = finalX - 42 - orbit * 0.34;
        sourceY = PLAY_RECT.y - brick.height - 110 - orbit;
        break;
      case 3:
        sourceX = finalX + 36 + orbit * 0.28;
        sourceY = PLAY_RECT.y + PLAY_RECT.height + 120 + orbit;
        break;
      case 4:
        sourceX = PLAY_RECT.x - brick.width - 124 - orbit;
        sourceY = PLAY_RECT.y + PLAY_RECT.height + 86 + orbit * 0.3;
        break;
      default:
        sourceX = PLAY_RECT.x + PLAY_RECT.width + 124 + orbit;
        sourceY = PLAY_RECT.y - brick.height - 82 - orbit * 0.3;
        break;
    }

    const drawX = lerp(sourceX, finalX, local);
    const drawY = lerp(sourceY, finalY, local);
    return {
      alpha: 0.08 + localBase * 0.92,
      drawX,
      drawY,
      rectX: drawX - brick.paddingX,
      rectY: drawY - brick.paddingY + 1,
    };
  }

  private drawBricks(entryProgress = 1): void {
    for (let index = 0; index < this.bricks.length; index++) {
      const brick = this.bricks[index]!;
      if (!brick.alive) continue;

      const state = this.getBrickRenderState(brick, index, entryProgress);
      this.renderer.drawBlock(
        this.context,
        brick.block,
        state.drawX,
        state.drawY,
        {
          alpha: state.alpha,
          color: brick.color,
          strokeColor: "rgba(5, 10, 16, 0.65)",
          strokeWidth: 2,
          shadowBlur: 10,
          shadowColor: "rgba(255, 214, 153, 0.18)",
        },
      );
    }
  }

  private drawPowerUps(): void {
    for (let index = 0; index < this.powerUps.length; index++) {
      const powerUp = this.powerUps[index]!;
      this.context.save();
      this.context.translate(powerUp.x, powerUp.y);
      this.context.rotate(powerUp.rotation);
      this.renderer.drawBlock(this.context, powerUp.block, 0, 0, {
        align: "center",
        color: powerUp.color,
        shadowBlur: 14,
        shadowColor: "rgba(12, 18, 24, 0.42)",
        strokeColor: "rgba(7, 12, 18, 0.7)",
        strokeWidth: 2,
        verticalAlign: "middle",
      });
      this.context.restore();
    }
  }

  private drawGuard(alpha = 1, offsetY = 0): void {
    if (this.activeEffects.guardCharges <= 0) return;

    const guard = this.getGuardRect();
    this.renderer.drawBlock(
      this.context,
      this.guardBlock,
      guard.centerX,
      guard.centerY + offsetY,
      {
        alpha,
        align: "center",
        color: "#a4f094",
        shadowBlur: 12,
        shadowColor: "rgba(164, 240, 148, 0.22)",
        strokeColor: "rgba(6, 14, 10, 0.62)",
        strokeWidth: 2,
        verticalAlign: "middle",
      },
    );

    if (this.activeEffects.guardCharges > 1) {
      const countBlock = this.renderer.getBlock(
        `x${this.activeEffects.guardCharges}`,
        FONTS.footer,
        20,
      );
      this.renderer.drawBlock(
        this.context,
        countBlock,
        guard.right + 18,
        guard.centerY + offsetY - countBlock.height / 2,
        {
          alpha,
          color: "#ddffd7",
        },
      );
    }
  }

  private drawPaddle(alpha = 1, offsetY = 0): void {
    const paddleBlock = this.getCurrentPaddleBlock();
    this.renderer.drawBlock(
      this.context,
      paddleBlock,
      this.paddle.x,
      this.paddle.y + offsetY,
      {
        alpha,
        align: "center",
        color: "#f5f0df",
        shadowBlur: 14,
        shadowColor: "rgba(117, 215, 230, 0.35)",
      },
    );
  }

  private drawBall(alpha = 1, offsetY = 0): void {
    for (let index = 0; index < this.balls.length; index++) {
      const ball = this.balls[index]!;
      this.renderer.drawBlock(
        this.context,
        this.ballBlock,
        ball.x,
        ball.y + offsetY,
        {
          alpha,
          align: "center",
          color: "#ffd577",
          shadowBlur: 16,
          shadowColor: "rgba(255, 183, 76, 0.45)",
          verticalAlign: "middle",
        },
      );
    }
  }

  private drawTransitionSequence(): void {
    if (this.sequence === null) return;

    if (this.sequence.kind === "opening") {
      this.drawOpeningSequence(this.sequence);
      return;
    }

    if (this.sequence.kind === "intro") {
      this.drawIntroSequence(this.sequence);
      return;
    }

    this.drawClearSequence(this.sequence);
  }

  private drawOpeningSequence(sequence: SequenceState): void {
    const progress = clamp(sequence.timer / sequence.duration, 0, 1);
    const panelAlpha = 0.28 + easeOutCubic((progress - 0.04) / 0.18) * 0.72;
    const wallAlpha = 0.32 + easeOutCubic((progress - 0.08) / 0.2) * 0.52;
    const titleFont = `800 54px ${FONT_FAMILY}`;
    const titleLineHeight = 58;
    const pretextBlock = this.renderer.getBlock(
      "TOKEN",
      titleFont,
      titleLineHeight,
    );
    const breakerBlock = this.renderer.getBlock(
      "BREAKOUT",
      titleFont,
      titleLineHeight,
    );
    const tagline = this.renderer.getBlock(
      "BREAK TOKENS. REROUTE THE STREAM. LAUNCH THE PACKET.",
      FONTS.status,
      LINE_HEIGHTS.panel,
    );
    const readyLine = this.renderer.getBlock(
      `LEVEL ${sequence.level.toString().padStart(2, "0")}  TOKEN STREAM ONLINE`,
      FONTS.footer,
      18,
    );
    const titlePreProgress = easeOutBack((progress - 0.14) / 0.2);
    const titleBreakProgress = easeOutBack((progress - 0.24) / 0.22);
    const ballProgress = clamp((progress - 0.18) / 0.62, 0, 1);
    const paddleProgress = easeOutCubic((progress - 0.2) / 0.18);
    const taglineProgress = easeOutCubic((progress - 0.48) / 0.16);
    const readyProgress = easeOutCubic((progress - 0.62) / 0.18);
    const playCenterX = PLAY_RECT.x + PLAY_RECT.width / 2;
    const paddleBlock = this.getCurrentPaddleBlock();
    const demoPaddleX =
      playCenterX +
      Math.sin(progress * Math.PI * 2.2 + 0.4) * (PLAY_RECT.width * 0.16);
    const demoPaddleY = PLAY_RECT.y + PLAY_RECT.height - 46;
    const ballX = lerp(
      PLAY_RECT.x + 78,
      PLAY_RECT.x + PLAY_RECT.width - 78,
      ballProgress,
    );
    const ballArc = Math.abs(Math.sin(ballProgress * Math.PI * 2.1 + 0.2));
    const ballY = PLAY_RECT.y + 118 + (1 - ballArc) * (PLAY_RECT.height * 0.52);
    const titlePreX = lerp(
      PLAY_RECT.x - pretextBlock.width - 120,
      playCenterX,
      titlePreProgress,
    );
    const titleBreakX = lerp(
      PLAY_RECT.x + PLAY_RECT.width + breakerBlock.width + 120,
      playCenterX,
      titleBreakProgress,
    );
    const titlePreY = PLAY_RECT.y + 96 + Math.sin(progress * Math.PI * 3.2) * 4;
    const titleBreakY =
      PLAY_RECT.y + 170 + Math.sin(progress * Math.PI * 3.2 + 0.6) * 4;
    const openingRects: WallRectObstacle[] = [];

    if (titlePreProgress > 0.06) {
      openingRects.push({
        bottom: titlePreY + pretextBlock.height + 14,
        left: titlePreX - pretextBlock.width / 2 - 18,
        right: titlePreX + pretextBlock.width / 2 + 18,
        top: titlePreY - 10,
      });
    }

    if (titleBreakProgress > 0.06) {
      openingRects.push({
        bottom: titleBreakY + breakerBlock.height + 14,
        left: titleBreakX - breakerBlock.width / 2 - 18,
        right: titleBreakX + breakerBlock.width / 2 + 18,
        top: titleBreakY - 10,
      });
    }

    if (taglineProgress > 0.08) {
      openingRects.push({
        bottom: PLAY_RECT.y + 268 + tagline.height + 10,
        left: playCenterX - tagline.width / 2 - 18,
        right: playCenterX + tagline.width / 2 + 18,
        top: PLAY_RECT.y + 260,
      });
    }

    if (readyProgress > 0.08) {
      openingRects.push({
        bottom: PLAY_RECT.y + 318 + readyLine.height + 8,
        left: playCenterX - readyLine.width / 2 - 18,
        right: playCenterX + readyLine.width / 2 + 18,
        top: PLAY_RECT.y + 312,
      });
    }

    if (paddleProgress > 0.08) {
      const paddleDrawY = demoPaddleY + (1 - paddleProgress) * 22;
      openingRects.push({
        bottom: paddleDrawY + paddleBlock.height + 10,
        left: demoPaddleX - paddleBlock.width / 2 - 14,
        right: demoPaddleX + paddleBlock.width / 2 + 14,
        top: paddleDrawY - 8,
      });
    }

    this.context.save();
    const veil = this.context.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    veil.addColorStop(0, "rgba(4, 9, 15, 0.52)");
    veil.addColorStop(0.52, "rgba(7, 16, 26, 0.36)");
    veil.addColorStop(1, "rgba(18, 10, 6, 0.42)");
    this.context.fillStyle = veil;
    this.context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    this.context.restore();

    this.drawFrame(
      HUD_RECT,
      "#9bbce9",
      FONTS.borderCompact,
      LINE_HEIGHTS.borderCompact,
      panelAlpha,
    );
    this.drawFrame(
      PLAY_RECT,
      "#75d7e6",
      FONTS.border,
      LINE_HEIGHTS.sprite,
      panelAlpha,
    );
    this.drawFrame(
      FOOTER_RECT,
      "#f0c35f",
      FONTS.borderCompact,
      LINE_HEIGHTS.borderCompact,
      panelAlpha,
    );
    this.drawHud();
    this.drawFooter();

    this.context.save();
    this.context.beginPath();
    this.context.rect(
      PLAY_RECT.x + 12,
      PLAY_RECT.y + 12,
      PLAY_RECT.width - 24,
      PLAY_RECT.height - 24,
    );
    this.context.clip();

    this.drawReflowingTextWall(
      0,
      wallAlpha,
      null,
      ballProgress > 0.06
        ? [{ radius: BALL_WAKE_RADIUS + 10, x: ballX, y: ballY }]
        : [],
      openingRects,
      true,
    );

    const playGlow = this.context.createLinearGradient(
      0,
      PLAY_RECT.y,
      0,
      PLAY_RECT.y + PLAY_RECT.height,
    );
    playGlow.addColorStop(0, "rgba(117, 215, 230, 0.03)");
    playGlow.addColorStop(0.52, "rgba(117, 215, 230, 0)");
    playGlow.addColorStop(1, "rgba(255, 207, 115, 0.05)");
    this.context.fillStyle = playGlow;
    this.context.fillRect(
      PLAY_RECT.x + 12,
      PLAY_RECT.y + 12,
      PLAY_RECT.width - 24,
      PLAY_RECT.height - 24,
    );

    this.renderer.drawBlock(this.context, pretextBlock, titlePreX, titlePreY, {
      alpha: titlePreProgress,
      align: "center",
      color: BRICK_COLORS[0],
      strokeColor: "rgba(5, 10, 16, 0.65)",
      strokeWidth: 2,
      shadowBlur: 14,
      shadowColor: "rgba(255, 214, 153, 0.2)",
    });
    this.renderer.drawBlock(
      this.context,
      breakerBlock,
      titleBreakX,
      titleBreakY,
      {
        alpha: titleBreakProgress,
        align: "center",
        color: BRICK_COLORS[3],
        strokeColor: "rgba(5, 10, 16, 0.65)",
        strokeWidth: 2,
        shadowBlur: 14,
        shadowColor: "rgba(117, 215, 230, 0.22)",
      },
    );

    const titleRule = this.renderer.getBlock(
      "═════════════════════════",
      FONTS.border,
      LINE_HEIGHTS.sprite,
    );
    this.renderer.drawBlock(
      this.context,
      titleRule,
      playCenterX,
      PLAY_RECT.y + 248,
      {
        alpha: 0.12 + taglineProgress * 0.46,
        align: "center",
        color: "#75d7e6",
      },
    );

    this.renderer.drawBlock(
      this.context,
      tagline,
      playCenterX,
      PLAY_RECT.y + 268,
      {
        alpha: taglineProgress,
        align: "center",
        color: "#9ad6ff",
        shadowBlur: 10,
        shadowColor: "rgba(117, 215, 230, 0.18)",
      },
    );
    this.renderer.drawBlock(
      this.context,
      readyLine,
      playCenterX,
      PLAY_RECT.y + 318,
      {
        alpha: readyProgress,
        align: "center",
        color: "#f2e6bf",
      },
    );

    if (ballProgress > 0) {
      const trail = this.renderer.getBlock("·", FONTS.footer, 20);
      for (let index = 0; index < 9; index++) {
        const echoProgress = clamp(ballProgress - index * 0.05, 0, 1);
        if (echoProgress <= 0) continue;
        const echoX = lerp(
          PLAY_RECT.x + 78,
          PLAY_RECT.x + PLAY_RECT.width - 78,
          echoProgress,
        );
        const echoArc = Math.abs(Math.sin(echoProgress * Math.PI * 2.1 + 0.2));
        const echoY =
          PLAY_RECT.y + 118 + (1 - echoArc) * (PLAY_RECT.height * 0.52);
        const alpha = (0.08 + echoProgress * 0.2) * (1 - index / 10);
        this.renderer.drawBlock(this.context, trail, echoX - 8, echoY + 14, {
          alpha,
          align: "center",
          color: "#f2c56b",
          verticalAlign: "middle",
        });
      }

      this.context.save();
      const wakeGlow = this.context.createRadialGradient(
        ballX,
        ballY,
        6,
        ballX,
        ballY,
        54,
      );
      wakeGlow.addColorStop(0, "rgba(255, 221, 153, 0.28)");
      wakeGlow.addColorStop(0.42, "rgba(117, 215, 230, 0.12)");
      wakeGlow.addColorStop(1, "rgba(117, 215, 230, 0)");
      this.context.fillStyle = wakeGlow;
      this.context.beginPath();
      this.context.arc(ballX, ballY, 54, 0, Math.PI * 2);
      this.context.fill();
      this.context.restore();

      this.renderer.drawBlock(this.context, this.ballBlock, ballX, ballY, {
        alpha: 0.2 + ballProgress * 0.8,
        align: "center",
        color: "#ffd577",
        shadowBlur: 18,
        shadowColor: "rgba(255, 183, 76, 0.45)",
        verticalAlign: "middle",
      });
    }

    this.renderer.drawBlock(
      this.context,
      paddleBlock,
      demoPaddleX,
      demoPaddleY + (1 - paddleProgress) * 22,
      {
        alpha: 0.16 + paddleProgress * 0.84,
        align: "center",
        color: "#f5f0df",
        shadowBlur: 14,
        shadowColor: "rgba(117, 215, 230, 0.35)",
      },
    );

    this.context.restore();
  }

  private drawIntroSequence(sequence: SequenceState): void {
    const progress = clamp(sequence.timer / sequence.duration, 0, 1);
    const bannerIn = easeOutBack((progress - 0.04) / 0.18);
    const bannerOut = 1 - easeOutCubic((progress - 0.5) / 0.14);
    const bannerFade = clamp(bannerIn * clamp(bannerOut, 0, 1), 0, 1);
    const bannerLift = (1 - easeOutCubic(progress / 0.38)) * 20;
    const label = `STREAM ONLINE\nLEVEL ${sequence.level.toString().padStart(2, "0")}`;

    this.drawSequenceCard(
      {
        height: SEQUENCE_CARD_HEIGHT,
        width: SEQUENCE_CARD_WIDTH,
        x: VIEW_WIDTH / 2 - SEQUENCE_CARD_WIDTH / 2,
        y: PLAY_RECT.y + 42 - bannerLift,
      },
      label,
      "#95edff",
      "rgba(7, 16, 26, 0.84)",
      "rgba(9, 38, 49, 0.76)",
      "#e3fbff",
      bannerFade * 0.92,
    );
  }

  private drawClearSequence(sequence: SequenceState): void {
    const progress = clamp(sequence.timer / sequence.duration, 0, 1);
    const arenaX = PLAY_RECT.x + 10;
    const arenaY = PLAY_RECT.y + 10;
    const arenaWidth = PLAY_RECT.width - 20;
    const arenaHeight = PLAY_RECT.height - 20;
    const sweepProgress = easeInOutCubic((progress - 0.08) / 0.74);
    const sweepY = arenaY + sweepProgress * arenaHeight;

    this.context.save();
    this.context.beginPath();
    this.context.rect(arenaX, arenaY, arenaWidth, arenaHeight);
    this.context.clip();

    this.context.fillStyle = `rgba(255, 207, 115, ${0.03 + progress * 0.08})`;
    this.context.fillRect(arenaX, arenaY, arenaWidth, arenaHeight);

    const sweepGradient = this.context.createLinearGradient(
      0,
      sweepY - 84,
      0,
      sweepY + 84,
    );
    sweepGradient.addColorStop(0, "rgba(255, 207, 115, 0)");
    sweepGradient.addColorStop(0.28, "rgba(255, 207, 115, 0.08)");
    sweepGradient.addColorStop(0.5, "rgba(255, 245, 214, 0.3)");
    sweepGradient.addColorStop(0.72, "rgba(117, 215, 230, 0.12)");
    sweepGradient.addColorStop(1, "rgba(117, 215, 230, 0)");
    this.context.fillStyle = sweepGradient;
    this.context.fillRect(arenaX, sweepY - 84, arenaWidth, 168);

    this.context.fillStyle = "rgba(255, 241, 199, 0.55)";
    this.context.fillRect(arenaX + 24, sweepY - 1, arenaWidth - 48, 2);
    this.context.restore();

    const bannerIn = easeOutCubic((progress - 0.18) / 0.2);
    const bannerOut = 1 - easeOutCubic((progress - 0.84) / 0.12);
    const bannerFade = clamp(bannerIn * clamp(bannerOut, 0, 1), 0, 1);
    const bannerDrop = (1 - easeOutCubic(progress / 0.44)) * 28;
    this.drawSequenceCard(
      {
        height: SEQUENCE_CARD_HEIGHT,
        width: SEQUENCE_CARD_WIDTH,
        x: VIEW_WIDTH / 2 - SEQUENCE_CARD_WIDTH / 2,
        y:
          PLAY_RECT.y +
          PLAY_RECT.height / 2 -
          SEQUENCE_CARD_HEIGHT / 2 -
          28 +
          bannerDrop,
      },
      `LEVEL ${sequence.level.toString().padStart(2, "0")} CLEAR\nSTREAM REROUTED`,
      "#ffcf73",
      "rgba(21, 14, 8, 0.86)",
      "rgba(45, 24, 12, 0.76)",
      "#fff1cb",
      bannerFade,
    );
  }

  private drawSequenceCard(
    rect: Rect,
    text: string,
    frameColor: string,
    fillTop: string,
    fillBottom: string,
    textColor: string,
    alpha: number,
  ): void {
    const block = this.renderer.getBlock(
      text,
      FONTS.overlay,
      LINE_HEIGHTS.overlay,
      rect.width - 44,
      "pre-wrap",
    );

    this.context.save();
    this.context.globalAlpha = alpha;
    const gradient = this.context.createLinearGradient(
      0,
      rect.y,
      0,
      rect.y + rect.height,
    );
    gradient.addColorStop(0, fillTop);
    gradient.addColorStop(1, fillBottom);
    this.context.fillStyle = gradient;
    this.context.fillRect(
      rect.x + 10,
      rect.y + 10,
      rect.width - 20,
      rect.height - 20,
    );
    this.context.restore();

    this.context.save();
    this.drawFrame(
      rect,
      frameColor,
      FONTS.borderCompact,
      LINE_HEIGHTS.borderCompact,
      alpha,
    );
    this.context.restore();

    this.renderer.drawBlock(
      this.context,
      block,
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
      {
        alpha,
        align: "center",
        color: textColor,
        shadowBlur: 16,
        shadowColor: "rgba(7, 16, 26, 0.34)",
        verticalAlign: "middle",
      },
    );
  }

  private drawOverlay(): void {
    const block =
      this.mode === "game-over"
        ? this.overlayBlocks.gameOver
        : this.clearedWave
          ? this.overlayBlocks.cleared
          : this.overlayBlocks.serve;
    const isServe = this.mode === "serve";
    const rect = this.getOverlayRect();

    this.context.save();
    const overlayGradient = this.context.createLinearGradient(
      0,
      rect.y,
      0,
      rect.y + rect.height,
    );
    overlayGradient.addColorStop(0, "rgba(7, 16, 26, 0.94)");
    overlayGradient.addColorStop(1, "rgba(18, 12, 7, 0.9)");
    this.context.fillStyle = overlayGradient;
    this.context.fillRect(
      rect.x + 10,
      rect.y + 10,
      rect.width - 20,
      rect.height - 20,
    );

    this.context.fillStyle = "rgba(117, 215, 230, 0.08)";
    this.context.fillRect(
      rect.x + 20,
      rect.y + 18,
      rect.width - 40,
      rect.height - 36,
    );
    this.context.restore();

    this.drawFrame(rect, "#ffcf73");
    const blockY = isServe ? rect.y + 26 : rect.y + rect.height / 2;
    this.renderer.drawBlock(this.context, block, VIEW_WIDTH / 2, blockY, {
      align: "center",
      color: "#fff4cc",
      shadowBlur: 14,
      shadowColor: "rgba(255, 179, 71, 0.38)",
      verticalAlign: isServe ? "top" : "middle",
    });

    if (isServe) {
      this.drawAudioButton(this.getOverlayAudioButtonRect());
    }
  }

  private drawFrame(
    rect: { x: number; y: number; width: number; height: number },
    color: string,
    font = FONTS.border,
    lineHeight = LINE_HEIGHTS.sprite,
    alpha = 1,
  ): void {
    const topGlyph = this.renderer.getBlock("═", font, lineHeight);
    const sideGlyph = this.renderer.getBlock("║", font, lineHeight);
    const topLeft = this.renderer.getBlock("╔", font, lineHeight);
    const topRight = this.renderer.getBlock("╗", font, lineHeight);
    const bottomLeft = this.renderer.getBlock("╚", font, lineHeight);
    const bottomRight = this.renderer.getBlock("╝", font, lineHeight);

    this.renderer.drawBlock(this.context, topLeft, rect.x, rect.y, {
      alpha,
      color,
    });
    this.renderer.drawBlock(
      this.context,
      topRight,
      rect.x + rect.width - topRight.width,
      rect.y,
      {
        alpha,
        color,
      },
    );
    this.renderer.drawBlock(
      this.context,
      bottomLeft,
      rect.x,
      rect.y + rect.height - bottomLeft.height,
      { alpha, color },
    );
    this.renderer.drawBlock(
      this.context,
      bottomRight,
      rect.x + rect.width - bottomRight.width,
      rect.y + rect.height - bottomRight.height,
      { alpha, color },
    );

    for (
      let x = rect.x + topLeft.width;
      x <= rect.x + rect.width - topRight.width - topGlyph.width * 0.6;
      x += topGlyph.width
    ) {
      this.renderer.drawBlock(this.context, topGlyph, x, rect.y, {
        alpha,
        color,
      });
      this.renderer.drawBlock(
        this.context,
        topGlyph,
        x,
        rect.y + rect.height - topGlyph.height,
        { alpha, color },
      );
    }

    for (
      let y = rect.y + topLeft.height;
      y <= rect.y + rect.height - bottomLeft.height - sideGlyph.height * 0.5;
      y += sideGlyph.height
    ) {
      this.renderer.drawBlock(this.context, sideGlyph, rect.x, y, {
        alpha,
        color,
      });
      this.renderer.drawBlock(
        this.context,
        sideGlyph,
        rect.x + rect.width - sideGlyph.width,
        y,
        { alpha, color },
      );
    }
  }

  private buildWave(level: number): Brick[] {
    const paragraph = LEVEL_PARAGRAPHS[(level - 1) % LEVEL_PARAGRAPHS.length]!;
    const bricks: Brick[] = [];
    const words = tokenizeLevelParagraph(paragraph);

    for (let index = 0; index < words.length; index++) {
      const label = words[index]!;
      const minimumFont = getBrickFont(BRICK_FONT_MIN);
      const minimumLineHeight = getBrickLineHeight(BRICK_FONT_MIN);
      bricks.push({
        alive: true,
        block: this.renderer.getBlock(label, minimumFont, minimumLineHeight),
        color: BRICK_COLORS[index % BRICK_COLORS.length]!,
        height: minimumLineHeight,
        label,
        paddingX: 0,
        paddingY: 0,
        value: Math.max(
          20,
          stripLabelDecorators(label).replace(/[^a-z0-9]/gi, "").length * 12,
        ),
        width: 0,
        x: BRICK_REGION.x,
        xTarget: BRICK_REGION.x,
        y: BRICK_REGION.y,
        yTarget: BRICK_REGION.y,
      });
    }

    this.bricks = bricks;
    this.relayoutBricks(true);
    return bricks;
  }

  private resetWave(initialWave: boolean): void {
    this.bricks = this.buildWave(this.level);
    this.clearedWave = false;
    this.particles = [];
    this.powerUps = [];
    this.recentPowerUpKinds = [];
    this.syncPaddleWidth();
    this.resetBallsToServe();
    this.syncBallSpeed();
    this.wakeHoles = [];
    if (initialWave && !this.hasShownOpeningIntro) {
      this.beginOpeningSequence();
    } else {
      this.beginIntroSequence(initialWave);
    }
    this.updateStatusCopy();
  }

  private restart(): void {
    this.score = 0;
    this.level = 1;
    this.lives = INITIAL_LIVES;
    this.clearedWave = false;
    this.activeEffects.expand = 0;
    this.activeEffects.guardCharges = 0;
    this.activeEffects.slow = 0;
    this.particles = [];
    this.balls = [];
    this.powerUps = [];
    this.recentPowerUpKinds = [];
    this.sequence = null;
    this.wakeHoles = [];
    gameAudio.setScene("serve");
    this.resetWave(true);
  }

  private loseLife(lastBallX = this.paddle.x): void {
    this.lives -= 1;
    this.screenShake = 3.2;
    this.spawnFailureBurst(lastBallX);
    this.activeEffects.expand = 0;
    this.activeEffects.guardCharges = 0;
    this.activeEffects.slow = 0;
    this.balls = [];
    this.powerUps = [];
    this.recentPowerUpKinds = [];
    this.syncPaddleWidth();
    this.syncBallSpeed();

    if (this.lives <= 0) {
      this.mode = "game-over";
      this.bestScore = Math.max(this.bestScore, this.score);
      gameAudio.playGameOver();
      gameAudio.setScene("game-over");
      this.updateStatusCopy();
      return;
    }

    gameAudio.playLoseLife();
    this.mode = "serve";
    this.clearedWave = false;
    this.resetBallsToServe();
    this.wakeHoles = [];
    this.updateStatusCopy();
  }

  private launchBall(): void {
    if (this.mode === "game-over") {
      this.restart();
      return;
    }

    this.clearedWave = false;
    this.mode = "playing";
    gameAudio.setScene("playing");
    this.syncBallSpeed();
    const ball = this.getPrimaryBall();
    const pointerBias = clamp(
      (this.pointer.x - this.paddle.x) / 160,
      -0.82,
      0.82,
    );
    let horizontalBias =
      Math.abs(pointerBias) > 0.12
        ? pointerBias
        : (Math.random() > 0.5 ? 1 : -1) * (0.42 + Math.random() * 0.22);
    if (Math.abs(horizontalBias) < 0.35) {
      horizontalBias = (horizontalBias >= 0 ? 1 : -1) * 0.35;
    }
    ball.vx = horizontalBias * ball.speed;
    ball.vy = -Math.sqrt(Math.max(0, ball.speed ** 2 - ball.vx ** 2));
    gameAudio.playLaunch();
    ball.wakePoint = { x: ball.x, y: ball.y };
    this.wakeHoles = [];
    this.updateStatusCopy();
  }

  private updateStatusCopy(): void {
    const remaining = this.bricks.filter((brick) => brick.alive).length;
    const effectSummary = this.getEffectSummary();
    const withEffects = (text: string) =>
      effectSummary === "" ? text : `${text}\n${effectSummary}`;

    if (this.mode === "transition" && this.sequence !== null) {
      if (this.sequence.kind === "opening") {
        this.statusCopy = "Token Breakout is slamming onto the screen.";
        return;
      }

      if (this.sequence.kind === "intro") {
        const introProgress = clamp(
          this.sequence.timer / this.sequence.duration,
          0,
          1,
        );
        this.statusCopy =
          introProgress < 0.6
            ? `Stream online. Level ${this.sequence.level.toString().padStart(2, "0")} is forming.`
            : `Level ${this.sequence.level
                .toString()
                .padStart(2, "0")} tokens are flying into place.`;
        return;
      }

      this.statusCopy = `Level ${this.sequence.level
        .toString()
        .padStart(2, "0")} complete. The next completion is rerouting.`;
      return;
    }

    if (this.mode === "game-over") {
      this.statusCopy = `Final ${formatScore(this.score)}. Best ${formatScore(
        this.bestScore,
      )}. The stream reroutes around you.`;
      return;
    }

    if (this.mode === "serve" && this.clearedWave) {
      this.statusCopy = withEffects(
        `Wave cleared. ${remaining} tokens queued for level ${this.level}. Serve the next packet.`,
      );
      return;
    }

    if (this.mode === "serve") {
      this.statusCopy = withEffects(
        `Break ${remaining} tokens. Drag or tap to aim, then launch with the up arrow or another tap.`,
      );
      return;
    }

    this.statusCopy = withEffects(
      `${remaining} tokens remain. Angle the packet off the router and keep it above the footer.`,
    );
  }

  private getAliveBrickCount(): number {
    let aliveCount = 0;
    for (let index = 0; index < this.bricks.length; index++) {
      if (this.bricks[index]!.alive) aliveCount += 1;
    }
    return aliveCount;
  }

  private rememberPowerUpKind(kind: PowerUpKind): void {
    this.recentPowerUpKinds.push(kind);
    if (this.recentPowerUpKinds.length > POWER_UP_HISTORY_LIMIT) {
      this.recentPowerUpKinds.shift();
    }
  }

  private pickPowerUpKind(): PowerUpKind {
    const aliveBricks = this.getAliveBrickCount();
    const waveProgress = 1 - aliveBricks / Math.max(1, this.bricks.length);
    const rescuePressure = this.lives <= 1 ? 1 : this.lives === 2 ? 0.55 : 0.12;
    const visibleKinds = new Set(this.powerUps.map((powerUp) => powerUp.kind));
    const lastKind = this.recentPowerUpKinds.at(-1) ?? null;

    const weights: Record<PowerUpKind, number> = {
      expand: this.isExpandActive()
        ? this.activeEffects.expand > 4
          ? 0.06
          : 0.26
        : 1.18 - waveProgress * 0.16,
      slow: this.isSlowActive()
        ? this.activeEffects.slow > 4
          ? 0.06
          : 0.24
        : 0.92 + (this.balls.length > 1 ? 0.55 : 0.16) + waveProgress * 0.28,
      multi:
        this.balls.length >= MULTI_BALL_MAX - 1
          ? 0.04
          : (this.balls.length > 1 ? 0.42 : 1.08) *
            (aliveBricks <= 4 ? 0.35 : 1.14 - waveProgress * 0.6),
      guard:
        this.activeEffects.guardCharges >= POWER_UP_MAX_GUARD_CHARGES
          ? 0.05
          : 0.7 +
            (POWER_UP_MAX_GUARD_CHARGES - this.activeEffects.guardCharges) *
              0.34 +
            rescuePressure * 0.82 +
            waveProgress * 0.54,
      life:
        this.lives >= INITIAL_LIVES + 2
          ? 0.03
          : 0.1 + rescuePressure * 1.28 + waveProgress * 0.2,
    };

    for (let index = 0; index < POWER_UP_KINDS.length; index++) {
      const kind = POWER_UP_KINDS[index]!;
      if (visibleKinds.has(kind)) weights[kind] *= 0.28;
      if (lastKind === kind) {
        weights[kind] *= 0.12;
      } else if (this.recentPowerUpKinds.includes(kind)) {
        weights[kind] *= 0.48;
      }
    }

    let totalWeight = 0;
    for (let index = 0; index < POWER_UP_KINDS.length; index++) {
      const kind = POWER_UP_KINDS[index]!;
      totalWeight += Math.max(0, weights[kind]);
    }

    if (totalWeight <= 0) return "expand";

    let roll = Math.random() * totalWeight;
    for (let index = 0; index < POWER_UP_KINDS.length; index++) {
      const kind = POWER_UP_KINDS[index]!;
      roll -= Math.max(0, weights[kind]);
      if (roll <= 0) return kind;
    }

    return POWER_UP_KINDS[POWER_UP_KINDS.length - 1]!;
  }

  private maybeSpawnPowerUp(x: number, y: number): void {
    if (Math.random() > POWER_UP_SPAWN_CHANCE) return;

    // Bias drops toward effects the player can use immediately and away from repeats.
    const kind = this.pickPowerUpKind();
    this.rememberPowerUpKind(kind);
    const definition = POWER_UP_DEFS[kind];
    const block = this.getPowerUpBlock(kind);
    this.powerUps.push({
      block,
      color: definition.color,
      height: block.height,
      kind,
      label: definition.label,
      rotation: (Math.random() - 0.5) * 0.08,
      spin: (Math.random() - 0.5) * 0.45,
      vx: (Math.random() - 0.5) * 36,
      vy: POWER_UP_FALL_SPEED + Math.random() * 30,
      width: block.width,
      x,
      y,
    });
  }

  private applyPowerUp(powerUp: PowerUp): void {
    this.score += POWER_UP_SCORE_BONUS;
    this.bestScore = Math.max(this.bestScore, this.score);
    this.screenShake = 1.3;
    gameAudio.playPowerUp(powerUp.kind);
    this.spawnPickupBurst(powerUp.x, powerUp.y, powerUp.label, powerUp.color);

    switch (powerUp.kind) {
      case "expand":
        this.activeEffects.expand = POWER_UP_DEFS.expand.duration;
        this.syncPaddleWidth();
        break;
      case "slow":
        this.activeEffects.slow = POWER_UP_DEFS.slow.duration;
        this.syncBallSpeed();
        break;
      case "guard":
        this.activeEffects.guardCharges = Math.min(
          POWER_UP_MAX_GUARD_CHARGES,
          this.activeEffects.guardCharges + 1,
        );
        break;
      case "multi":
        this.spawnMultiBall();
        break;
      case "life":
        this.lives += 1;
        break;
    }

    this.updateStatusCopy();
  }

  private spawnMultiBall(): void {
    if (this.mode !== "playing" || this.balls.length === 0) return;

    const sources = [...this.balls];
    const targetCount = Math.min(
      MULTI_BALL_MAX,
      Math.max(MULTI_BALL_TARGET_COUNT, this.balls.length + 2),
    );
    const additionsNeeded = targetCount - this.balls.length;
    if (additionsNeeded <= 0) return;

    for (let index = 0; index < additionsNeeded; index++) {
      const source = sources[index % sources.length]!;
      const clone = this.createBallState(source.x, source.y);
      const baseAngle = Math.atan2(
        source.vy || -source.speed,
        source.vx || source.speed * 0.4,
      );
      const angleOffset =
        MULTI_BALL_ANGLE_OFFSETS[index % MULTI_BALL_ANGLE_OFFSETS.length]!;
      this.setBallAngle(clone, baseAngle + angleOffset);
      clone.wakePoint = { x: clone.x, y: clone.y };
      this.balls.push(clone);
    }
  }

  private spawnPickupBurst(
    x: number,
    y: number,
    label: string,
    color: string,
  ): void {
    const chars = label.split("").filter((char) => char !== " ");
    for (let index = 0; index < chars.length; index++) {
      const char = chars[index]!;
      const angle = -Math.PI / 2 + (index - (chars.length - 1) / 2) * 0.26;
      const speed = 48 + Math.random() * 42;
      const block = this.renderer.getBlock(char, FONTS.footer, 20);
      this.particles.push({
        alpha: 1,
        affectsWall: false,
        block,
        color,
        life: 0,
        maxLife: 0.55 + Math.random() * 0.15,
        rotation: 0,
        spin: (Math.random() - 0.5) * 4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 18,
        wallRadius: 0,
        x,
        y,
      });
    }
  }

  private spawnBurst(x: number, y: number, brick: Brick): void {
    const letters = stripLabelDecorators(brick.label).split("");
    for (let index = 0; index < letters.length; index++) {
      const char = letters[index]!;
      const angle =
        (Math.PI * 2 * index) / Math.max(1, letters.length) +
        Math.random() * 0.35;
      const speed = 80 + Math.random() * 120;
      const block = this.renderer.getBlock(
        char,
        FONTS.status,
        LINE_HEIGHTS.sprite,
      );
      this.particles.push({
        alpha: 1,
        affectsWall: true,
        block,
        color: brick.color,
        life: 0,
        maxLife: 0.7 + Math.random() * 0.35,
        rotation: 0,
        spin: (Math.random() - 0.5) * 5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        wallRadius: Math.max(10, Math.max(block.width, block.height) * 0.72),
        x,
        y,
      });
    }
  }

  private spawnFailureBurst(x: number): void {
    const chars = ["/", "\\", "!", "?", "_"];
    for (let index = 0; index < chars.length; index++) {
      const char = chars[index]!;
      const angle = -Math.PI / 2 + (index - 2) * 0.35;
      const block = this.renderer.getBlock(
        char,
        FONTS.status,
        LINE_HEIGHTS.sprite,
      );
      this.particles.push({
        alpha: 1,
        affectsWall: false,
        block,
        color: "#ff8d6b",
        life: 0,
        maxLife: 0.8,
        rotation: 0,
        spin: (Math.random() - 0.5) * 4,
        vx: Math.cos(angle) * (90 + Math.random() * 40),
        vy: Math.sin(angle) * (90 + Math.random() * 40),
        wallRadius: 0,
        x,
        y: PLAY_RECT.y + PLAY_RECT.height - 12,
      });
    }
  }

  private spawnPaddleSpark(ball: BallState): void {
    const chars = ["=", "=", ":", ":"];
    for (let index = 0; index < chars.length; index++) {
      const char = chars[index]!;
      const block = this.renderer.getBlock(char, FONTS.footer, 20);
      this.particles.push({
        alpha: 1,
        affectsWall: false,
        block,
        color: "#a9f1ff",
        life: 0,
        maxLife: 0.35 + Math.random() * 0.15,
        rotation: 0,
        spin: 0,
        vx: (Math.random() - 0.5) * 90,
        vy: -30 - Math.random() * 70,
        wallRadius: 0,
        x: ball.x,
        y: this.paddle.y,
      });
    }
  }

  private spawnTrailParticle(ball: BallState): void {
    if (Math.random() > 0.5) return;
    const char = Math.random() > 0.5 ? "." : "·";
    const block = this.renderer.getBlock(char, FONTS.footer, 20);
    this.particles.push({
      alpha: 0.7,
      affectsWall: false,
      block,
      color: "#ffe2a0",
      life: 0,
      maxLife: 0.26,
      rotation: 0,
      spin: 0,
      vx: (Math.random() - 0.5) * 22,
      vy: 16 + Math.random() * 20,
      wallRadius: 0,
      x: ball.x,
      y: ball.y,
    });
  }

  private updateParticles(deltaSeconds: number): void {
    for (let index = this.particles.length - 1; index >= 0; index--) {
      const particle = this.particles[index]!;
      particle.life += deltaSeconds;
      particle.x += particle.vx * deltaSeconds;
      particle.y += particle.vy * deltaSeconds;
      particle.vy += 90 * deltaSeconds;
      particle.rotation += particle.spin * deltaSeconds;
      particle.alpha = 1 - particle.life / particle.maxLife;

      if (particle.life >= particle.maxLife) {
        this.particles.splice(index, 1);
      }
    }
  }

  private updateWakeHoles(deltaSeconds: number): void {
    for (let index = this.wakeHoles.length - 1; index >= 0; index--) {
      const hole = this.wakeHoles[index]!;
      hole.life += deltaSeconds;
      if (hole.life >= hole.maxLife) {
        this.wakeHoles.splice(index, 1);
      }
    }
  }

  private drawParticles(): void {
    for (let index = 0; index < this.particles.length; index++) {
      const particle = this.particles[index]!;
      this.context.save();
      this.context.translate(particle.x, particle.y);
      this.context.rotate(particle.rotation);
      this.renderer.drawBlock(this.context, particle.block, 0, 0, {
        alpha: particle.alpha,
        align: "center",
        color: particle.color,
        shadowBlur: 8,
        shadowColor: SHADOW_COLOR,
        verticalAlign: "middle",
      });
      this.context.restore();
    }
  }

  private buildBackgroundGlyphs(): BackgroundGlyph[] {
    const chars = [".", ":", "·", "*", "+", ";"];
    const glyphs: BackgroundGlyph[] = [];

    for (let index = 0; index < 54; index++) {
      const char = chars[index % chars.length]!;
      glyphs.push({
        alpha: 0.1 + Math.random() * 0.18,
        block: this.renderer.getBlock(char, FONTS.footer, 20),
        speed: 8 + Math.random() * 18,
        x: Math.random() * VIEW_WIDTH,
        y: Math.random() * VIEW_HEIGHT,
      });
    }

    return glyphs;
  }

  private buildTextWallCopy(): string {
    const phrases = [
      `${APP_NAME_LOWER} gateway measure cursor segment rewrite packet inline retry stream parallel throttle fallback quota signal static dynamic vector module bounce trail track render flow`,
      "tokens snake between every obstacle and keep every model alive while the field reroutes around the moving packet and the waiting router",
      "small copy fills the arena from border to border and the larger block labels stay readable as targets floating above the token stream",
    ];
    return Array.from(
      { length: 80 },
      (_, index) => phrases[index % phrases.length]!,
    ).join(" ");
  }

  private relayoutBricks(immediate = false): void {
    const active = this.bricks.filter((brick) => brick.alive);
    if (active.length === 0) return;

    const arrangement = this.findBrickArrangement(active);
    for (let index = 0; index < arrangement.length; index++) {
      const item = arrangement[index]!;
      item.brick.block = item.block;
      item.brick.paddingX = item.paddingX;
      item.brick.paddingY = item.paddingY;
      item.brick.width = item.width;
      item.brick.height = item.height;
      item.brick.xTarget = item.x;
      item.brick.yTarget = item.y;
      if (immediate) {
        item.brick.x = item.x;
        item.brick.y = item.y;
      }
    }
  }

  private findBrickArrangement(active: Brick[]): Array<{
    block: TextBlock;
    brick: Brick;
    height: number;
    paddingX: number;
    paddingY: number;
    width: number;
    x: number;
    y: number;
  }> {
    for (let size = BRICK_FONT_MAX; size >= BRICK_FONT_MIN; size--) {
      const arrangement = this.computeBrickArrangement(active, size);
      if (arrangement !== null) return arrangement;
    }

    return this.computeBrickArrangement(active, BRICK_FONT_MIN) ?? [];
  }

  private computeBrickArrangement(
    active: Brick[],
    size: number,
  ): Array<{
    block: TextBlock;
    brick: Brick;
    height: number;
    paddingX: number;
    paddingY: number;
    width: number;
    x: number;
    y: number;
  }> | null {
    const font = getBrickFont(size);
    const lineHeight = getBrickLineHeight(size);
    const paddingX = getBrickPaddingX(size);
    const paddingY = getBrickPaddingY(size);
    const rowGap = getBrickRowGap(size);
    const gap = Math.max(BRICK_GAP - 2, Math.round(size * 0.32));
    const measuredWords = active.map((brick) => {
      const block = this.renderer.getBlock(brick.label, font, lineHeight);
      return {
        block,
        brick,
        height: block.height + paddingY * 2,
        width: block.width + paddingX * 2,
      };
    });

    const lines: (typeof measuredWords)[] = [];
    let currentLine: typeof measuredWords = [];
    let currentWidth = 0;

    for (let index = 0; index < measuredWords.length; index++) {
      const word = measuredWords[index]!;
      const candidateWidth =
        currentLine.length === 0 ? word.width : currentWidth + gap + word.width;

      if (currentLine.length > 0 && candidateWidth > BRICK_REGION.width + 0.5) {
        lines.push(currentLine);
        currentLine = [word];
        currentWidth = word.width;
        continue;
      }

      currentLine.push(word);
      currentWidth = candidateWidth;
    }

    if (currentLine.length > 0) lines.push(currentLine);

    const rowHeight = lineHeight + paddingY * 2;
    const totalHeight =
      lines.length * rowHeight + Math.max(0, lines.length - 1) * rowGap;
    if (totalHeight > BRICK_REGION.height) return null;

    const placements: Array<{
      block: TextBlock;
      brick: Brick;
      height: number;
      paddingX: number;
      paddingY: number;
      width: number;
      x: number;
      y: number;
    }> = [];
    let y = BRICK_REGION.y + (BRICK_REGION.height - totalHeight) / 2;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex]!;
      const visualWidth =
        line.reduce((sum, item) => sum + item.width, 0) +
        gap * Math.max(0, line.length - 1);
      let x = BRICK_REGION.x + (BRICK_REGION.width - visualWidth) / 2;

      for (let index = 0; index < line.length; index++) {
        const item = line[index]!;
        placements.push({
          block: item.block,
          brick: item.brick,
          height: item.height,
          paddingX,
          paddingY,
          width: item.width,
          x,
          y,
        });
        x += item.width + gap;
      }

      y += rowHeight + rowGap;
    }

    return placements;
  }

  private updateBackgroundGlyphs(deltaSeconds: number): void {
    for (let index = 0; index < this.backgroundGlyphs.length; index++) {
      const glyph = this.backgroundGlyphs[index]!;
      glyph.y += glyph.speed * deltaSeconds;
      if (glyph.y > VIEW_HEIGHT + 10) {
        glyph.y = -10;
        glyph.x = 20 + Math.random() * (VIEW_WIDTH - 40);
      }
    }
  }

  private drawBackgroundGlyphs(): void {
    for (let index = 0; index < this.backgroundGlyphs.length; index++) {
      const glyph = this.backgroundGlyphs[index]!;
      this.renderer.drawBlock(this.context, glyph.block, glyph.x, glyph.y, {
        alpha: glyph.alpha,
        color: "#c8e9ff",
        shadowBlur: 6,
        shadowColor: "rgba(117, 215, 230, 0.16)",
      });
    }
  }

  private drawReflowingTextWall(
    offsetY = 0,
    alphaMultiplier = 1,
    introBrickProgress: number | null = null,
    extraCircles: Array<{ radius: number; x: number; y: number }> = [],
    extraRects: WallRectObstacle[] = [],
    ignoreGameplayObstacles = false,
  ): void {
    const region = {
      x: PLAY_RECT.x + 14,
      y: PLAY_RECT.y + 14,
      width: PLAY_RECT.width - 28,
      height: PLAY_RECT.height - 28,
    };

    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };

    for (
      let lineTop = region.y;
      lineTop + LINE_HEIGHTS.wall <= region.y + region.height;
      lineTop += LINE_HEIGHTS.wall
    ) {
      const bandTop = lineTop + offsetY;
      const bandBottom = bandTop + LINE_HEIGHTS.wall;
      const slots = this.getTextWallSlots(
        region,
        bandTop,
        bandBottom,
        introBrickProgress,
        extraCircles,
        extraRects,
        ignoreGameplayObstacles,
      );
      if (slots.length === 0) continue;

      for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
        const slot = slots[slotIndex]!;
        const width = slot.right - slot.left;
        if (width < 18) continue;

        let line = layoutNextLine(this.textWallPrepared, cursor, width);
        if (line === null) {
          cursor = { segmentIndex: 0, graphemeIndex: 0 };
          line = layoutNextLine(this.textWallPrepared, cursor, width);
        }
        if (line === null) return;

        const block = this.renderer.getBlock(
          line.text,
          FONTS.wall,
          LINE_HEIGHTS.wall,
        );
        const color =
          TEXT_WALL_COLORS[
            (Math.floor(lineTop / LINE_HEIGHTS.wall) + slotIndex) %
              TEXT_WALL_COLORS.length
          ]!;
        this.renderer.drawBlock(
          this.context,
          block,
          slot.left,
          lineTop + offsetY,
          {
            alpha: 0.52 * alphaMultiplier,
            color,
          },
        );
        cursor = line.end;
      }
    }
  }

  private getTextWallSlots(
    region: { x: number; y: number; width: number; height: number },
    bandTop: number,
    bandBottom: number,
    introBrickProgress: number | null = null,
    extraCircles: Array<{ radius: number; x: number; y: number }> = [],
    extraRects: WallRectObstacle[] = [],
    ignoreGameplayObstacles = false,
  ): Interval[] {
    const blocked: Interval[] = [];

    if (!ignoreGameplayObstacles && introBrickProgress === null) {
      for (let index = 0; index < this.bricks.length; index++) {
        const brick = this.bricks[index]!;
        if (!brick.alive) continue;
        if (bandBottom <= brick.y - 3 || bandTop >= brick.y + brick.height + 3)
          continue;
        blocked.push({
          left: brick.x - 8,
          right: brick.x + brick.width + 8,
        });
      }
    } else if (introBrickProgress !== null && introBrickProgress > 0.001) {
      for (let index = 0; index < this.bricks.length; index++) {
        const brick = this.bricks[index]!;
        if (!brick.alive) continue;
        const state = this.getBrickRenderState(
          brick,
          index,
          introBrickProgress,
        );
        if (state.alpha <= 0.04) continue;
        if (
          bandBottom <= state.rectY - 3 ||
          bandTop >= state.rectY + brick.height + 3
        )
          continue;
        blocked.push({
          left: state.rectX - 8,
          right: state.rectX + brick.width + 8,
        });
      }
    }

    if (!ignoreGameplayObstacles) {
      const paddleBlock = this.getCurrentPaddleBlock();
      const paddleTop = this.paddle.y - 6;
      const paddleBottom = this.paddle.y + paddleBlock.height + 6;
      if (bandBottom > paddleTop && bandTop < paddleBottom) {
        blocked.push({
          left: this.paddle.x - this.paddle.blockWidth / 2 - 12,
          right: this.paddle.x + this.paddle.blockWidth / 2 + 12,
        });
      }

      for (let index = 0; index < this.balls.length; index++) {
        const ball = this.balls[index]!;
        this.pushCircleInterval(
          blocked,
          ball.x,
          ball.y,
          BALL_WAKE_RADIUS,
          bandTop,
          bandBottom,
        );
      }
      for (let index = 0; index < this.wakeHoles.length; index++) {
        const hole = this.wakeHoles[index]!;
        this.pushCircleInterval(
          blocked,
          hole.x,
          hole.y,
          hole.radius,
          bandTop,
          bandBottom,
        );
      }
    }

    for (let index = 0; index < extraCircles.length; index++) {
      const circle = extraCircles[index]!;
      this.pushCircleInterval(
        blocked,
        circle.x,
        circle.y,
        circle.radius,
        bandTop,
        bandBottom,
      );
    }

    for (let index = 0; index < extraRects.length; index++) {
      const rect = extraRects[index]!;
      if (bandBottom <= rect.top || bandTop >= rect.bottom) continue;
      blocked.push({
        left: rect.left,
        right: rect.right,
      });
    }

    if (!ignoreGameplayObstacles) {
      for (let index = 0; index < this.particles.length; index++) {
        const particle = this.particles[index]!;
        if (
          !particle.affectsWall ||
          particle.alpha <= 0.08 ||
          particle.wallRadius <= 0
        )
          continue;
        this.pushCircleInterval(
          blocked,
          particle.x,
          particle.y,
          particle.wallRadius,
          bandTop,
          bandBottom,
        );
      }

      for (let index = 0; index < this.powerUps.length; index++) {
        const powerUp = this.powerUps[index]!;
        const powerTop = powerUp.y - powerUp.height / 2 - 4;
        const powerBottom = powerUp.y + powerUp.height / 2 + 4;
        if (bandBottom <= powerTop || bandTop >= powerBottom) continue;
        blocked.push({
          left: powerUp.x - powerUp.width / 2 - 10,
          right: powerUp.x + powerUp.width / 2 + 10,
        });
      }

      if (this.activeEffects.guardCharges > 0) {
        const guard = this.getGuardRect();
        const guardBottom = guard.top + guard.height;
        if (bandBottom > guard.top - 4 && bandTop < guardBottom + 4) {
          blocked.push({
            left: guard.left - 10,
            right: guard.right + 10,
          });
        }
      }
    }

    return this.carveSlots(
      { left: region.x, right: region.x + region.width },
      blocked,
    );
  }

  private pushCircleInterval(
    blocked: Interval[],
    centerX: number,
    centerY: number,
    radius: number,
    bandTop: number,
    bandBottom: number,
  ): void {
    const sampleY = (bandTop + bandBottom) / 2;
    const dy = sampleY - centerY;
    if (Math.abs(dy) >= radius) return;

    const halfWidth = Math.sqrt(radius * radius - dy * dy);
    blocked.push({
      left: centerX - halfWidth,
      right: centerX + halfWidth,
    });
  }

  private carveSlots(base: Interval, blocked: Interval[]): Interval[] {
    if (blocked.length === 0) return [base];

    const merged = blocked
      .map((interval) => ({
        left: clamp(interval.left, base.left, base.right),
        right: clamp(interval.right, base.left, base.right),
      }))
      .filter((interval) => interval.right > interval.left)
      .sort((a, b) => a.left - b.left);

    const normalized: Interval[] = [];
    for (let index = 0; index < merged.length; index++) {
      const interval = merged[index]!;
      const previous = normalized[normalized.length - 1];
      if (previous === undefined || interval.left > previous.right) {
        normalized.push({ ...interval });
      } else {
        previous.right = Math.max(previous.right, interval.right);
      }
    }

    const slots: Interval[] = [];
    let cursor = base.left;
    for (let index = 0; index < normalized.length; index++) {
      const interval = normalized[index]!;
      if (interval.left - cursor >= 18) {
        slots.push({ left: cursor, right: interval.left });
      }
      cursor = Math.max(cursor, interval.right);
    }
    if (base.right - cursor >= 18) {
      slots.push({ left: cursor, right: base.right });
    }
    return slots;
  }

  private trackWake(ball: BallState): void {
    if (this.mode !== "playing") return;
    if (ball.wakePoint === null) {
      ball.wakePoint = { x: ball.x, y: ball.y };
      return;
    }

    const dx = ball.x - ball.wakePoint.x;
    const dy = ball.y - ball.wakePoint.y;
    if (dx * dx + dy * dy < WAKE_SPAWN_DISTANCE * WAKE_SPAWN_DISTANCE) return;

    this.wakeHoles.push({
      life: 0,
      maxLife: 0.42,
      radius: BALL_WAKE_RADIUS - 8,
      x: ball.x,
      y: ball.y,
    });
    ball.wakePoint = { x: ball.x, y: ball.y };
  }

  private toViewCoordinates(event: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * this.view.width,
      y: ((event.clientY - rect.top) / rect.height) * this.view.height,
    };
  }
}
