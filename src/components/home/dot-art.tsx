/**
 * Dot-matrix pictures for the home features (D428), drawn on the server as
 * SVG. Each colour has a dot pattern: the dim grid fills the box, and each
 * lit block is one rect filled with its colour's pattern. A path per dot
 * carried ~37 KB of markup twice (HTML and RSC payload); a few rects draw the
 * same dots (D434).
 * Grid: 50 × 40 cells of 8 units in a 400 × 320 box (5:4).
 */
const PITCH = 8;
const COLS = 50;
const ROWS = 40;

type Tone = "off" | "on" | "accent";
type Block = [col: number, row: number, w: number, h: number, tone: Tone];

const TONES = ["off", "on", "accent"] as const;
const toneClass: Record<Tone, string> = {
  off: "fill-line-strong",
  on: "fill-fg-muted",
  accent: "fill-accent",
};
const toneSize: Record<Tone, number> = { off: 2.2, on: 2.6, accent: 2.8 };

function block(c0: number, r0: number, w: number, h: number, tone: Tone) {
  return [c0, r0, w, h, tone] satisfies Block;
}

function frame(c0: number, r0: number, w: number, h: number, tone: Tone) {
  return [
    block(c0, r0, w, 1, tone),
    block(c0, r0 + h - 1, w, 1, tone),
    block(c0, r0 + 1, 1, h - 2, tone),
    block(c0 + w - 1, r0 + 1, 1, h - 2, tone),
  ];
}

/** 09–18 local: you at UTC+3 are 06–15 UTC, the team at UTC−1 is 10–19 UTC. */
function timeZoneBlocks(): Block[] {
  const blocks: Block[] = [];
  const band = (from: number, to: number, row: number) => {
    for (let hour = 0; hour < 24; hour += 1) {
      const working = hour >= from && hour < to;
      const overlap = hour >= 10 && hour < 15;
      const tone: Tone = working ? (overlap ? "accent" : "on") : "off";
      blocks.push(block(1 + hour * 2, row, 2, 6, tone));
    }
  };
  band(6, 15, 9);
  band(10, 19, 22);
  blocks.push(block(21, 16, 1, 5, "accent"), block(30, 16, 1, 5, "accent"));
  for (const hour of [0, 6, 12, 18, 24])
    blocks.push(block(1 + hour * 2, 31, 1, 1, "on"));
  return blocks;
}

function salaryBlocks(): Block[] {
  const blocks: Block[] = [];
  const base = 33;
  for (let i = 0; i < 18; i += 1) {
    const t = (i - 8.5) / 4.2;
    const height = Math.max(1, Math.round(22 * Math.exp((-t * t) / 2)));
    const tone: Tone = i >= 7 && i <= 11 ? "accent" : "on";
    blocks.push(block(7 + i * 2, base - height, 2, height, tone));
  }
  blocks.push(block(7, base + 2, 36, 1, "off"));
  blocks.push(block(21, base + 3, 1, 1, "accent"));
  blocks.push(block(30, base + 3, 1, 1, "accent"));
  return blocks;
}

function agentBlocks(): Block[] {
  return [
    ...frame(22, 4, 25, 6, "on"),
    block(25, 6, 16, 1, "on"),
    block(4, 12, 25, 7, "off"),
    block(7, 14, 18, 1, "on"),
    block(7, 16, 12, 1, "on"),
    ...frame(4, 22, 31, 8, "accent"),
    block(7, 24, 14, 1, "accent"),
    block(7, 26, 9, 1, "on"),
  ];
}

const pictures = {
  timeZone: timeZoneBlocks,
  salary: salaryBlocks,
  agent: agentBlocks,
} as const;

export type DotPicture = keyof typeof pictures;

/** One square of `size` centred in every grid cell. */
function DotPattern({
  id,
  size,
  className,
}: {
  id: string;
  size: number;
  className: string;
}) {
  const offset = (PITCH - size) / 2;
  return (
    <pattern id={id} width={PITCH} height={PITCH} patternUnits="userSpaceOnUse">
      <rect
        x={offset}
        y={offset}
        width={size}
        height={size}
        className={className}
      />
    </pattern>
  );
}

export function DotArt({ picture }: { picture: DotPicture }) {
  const blocks = pictures[picture]();
  const patternId = (tone: Tone | "grid") => `dot-${picture}-${tone}`;
  return (
    <svg
      viewBox={`0 0 ${COLS * PITCH} ${ROWS * PITCH}`}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
    >
      <defs>
        <DotPattern id={patternId("grid")} size={1.6} className="fill-line" />
        {TONES.map((tone) => (
          <DotPattern
            key={tone}
            id={patternId(tone)}
            size={toneSize[tone]}
            className={toneClass[tone]}
          />
        ))}
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId("grid")})`} />
      {TONES.flatMap((tone) =>
        blocks
          .filter((b) => b[4] === tone)
          .map(([c, r, w, h], i) => (
            <rect
              key={`${tone}-${i}`}
              x={c * PITCH}
              y={r * PITCH}
              width={w * PITCH}
              height={h * PITCH}
              fill={`url(#${patternId(tone)})`}
            />
          )),
      )}
    </svg>
  );
}
