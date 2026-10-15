/**
 * Dot-matrix pictures for the home features (D428), drawn on the server as
 * SVG: one pattern for the dim grid, one path per colour for the lit dots.
 * Grid: 50 × 40 cells of 8 units in a 400 × 320 box (5:4).
 */
const PITCH = 8;
const COLS = 50;
const ROWS = 40;

type Tone = "off" | "on" | "accent";
type Dot = [col: number, row: number, tone: Tone];

const toneClass: Record<Tone, string> = {
  off: "fill-line-strong",
  on: "fill-fg-muted",
  accent: "fill-accent",
};
const toneSize: Record<Tone, number> = { off: 2.2, on: 2.6, accent: 2.8 };

function block(c0: number, r0: number, w: number, h: number, tone: Tone) {
  const dots: Dot[] = [];
  for (let r = r0; r < r0 + h; r += 1)
    for (let c = c0; c < c0 + w; c += 1) dots.push([c, r, tone]);
  return dots;
}

function frame(c0: number, r0: number, w: number, h: number, tone: Tone) {
  return [
    ...block(c0, r0, w, 1, tone),
    ...block(c0, r0 + h - 1, w, 1, tone),
    ...block(c0, r0 + 1, 1, h - 2, tone),
    ...block(c0 + w - 1, r0 + 1, 1, h - 2, tone),
  ];
}

/** 09–18 local: you at UTC+3 are 06–15 UTC, the team at UTC−1 is 10–19 UTC. */
function timeZoneDots(): Dot[] {
  const dots: Dot[] = [];
  const band = (from: number, to: number, row: number) => {
    for (let hour = 0; hour < 24; hour += 1) {
      const working = hour >= from && hour < to;
      const overlap = hour >= 10 && hour < 15;
      const tone: Tone = working ? (overlap ? "accent" : "on") : "off";
      dots.push(...block(1 + hour * 2, row, 2, 6, tone));
    }
  };
  band(6, 15, 9);
  band(10, 19, 22);
  dots.push(...block(21, 16, 1, 5, "accent"), ...block(30, 16, 1, 5, "accent"));
  for (const hour of [0, 6, 12, 18, 24]) dots.push([1 + hour * 2, 31, "on"]);
  return dots;
}

function salaryDots(): Dot[] {
  const dots: Dot[] = [];
  const base = 33;
  for (let i = 0; i < 18; i += 1) {
    const t = (i - 8.5) / 4.2;
    const height = Math.max(1, Math.round(22 * Math.exp((-t * t) / 2)));
    const tone: Tone = i >= 7 && i <= 11 ? "accent" : "on";
    dots.push(...block(7 + i * 2, base - height, 2, height, tone));
  }
  dots.push(...block(7, base + 2, 36, 1, "off"));
  dots.push([21, base + 3, "accent"], [30, base + 3, "accent"]);
  return dots;
}

function agentDots(): Dot[] {
  return [
    ...frame(22, 4, 25, 6, "on"),
    ...block(25, 6, 16, 1, "on"),
    ...block(4, 12, 25, 7, "off"),
    ...block(7, 14, 18, 1, "on"),
    ...block(7, 16, 12, 1, "on"),
    ...frame(4, 22, 31, 8, "accent"),
    ...block(7, 24, 14, 1, "accent"),
    ...block(7, 26, 9, 1, "on"),
  ];
}

const pictures = {
  timeZone: timeZoneDots,
  salary: salaryDots,
  agent: agentDots,
} as const;

export type DotPicture = keyof typeof pictures;

function pathFor(dots: Dot[], tone: Tone) {
  const size = toneSize[tone];
  return dots
    .filter((dot) => dot[2] === tone)
    .map(([c, r]) => {
      const x = (c * PITCH + PITCH / 2 - size / 2).toFixed(1);
      const y = (r * PITCH + PITCH / 2 - size / 2).toFixed(1);
      return `M${x} ${y}h${size}v${size}h-${size}z`;
    })
    .join("");
}

export function DotArt({ picture }: { picture: DotPicture }) {
  const dots = pictures[picture]();
  const patternId = `dot-grid-${picture}`;
  return (
    <svg
      viewBox={`0 0 ${COLS * PITCH} ${ROWS * PITCH}`}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
    >
      <defs>
        <pattern
          id={patternId}
          width={PITCH}
          height={PITCH}
          patternUnits="userSpaceOnUse"
        >
          <rect
            x="3.2"
            y="3.2"
            width="1.6"
            height="1.6"
            className="fill-line"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      {(["off", "on", "accent"] as const).map((tone) => (
        <path key={tone} d={pathFor(dots, tone)} className={toneClass[tone]} />
      ))}
    </svg>
  );
}
