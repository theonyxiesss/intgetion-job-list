/**
 * One-shot docs reorg (already applied 2026-10-07).
 * Do not re-run casually: a second MISSION_LOG shrink would archive the live tail.
 * Safe to re-run only to regenerate docs/tz/* from archive/tz/TZ_INTGETION_v6.md
 * after restoring a full MISSION_LOG / DECISIONS from git if needed.
 */
import fs from "fs";
import path from "path";

const root = process.cwd();
const docs = path.join(root, "docs");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function write(p, content) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, content, "utf8");
}
function read(p) {
  return fs.readFileSync(p, "utf8");
}

for (const d of [
  "tz",
  "how-it-works",
  "status",
  "archive",
  "archive/tz",
  "archive/mission-log",
  "archive/decisions",
  "archive/prompts-done",
]) {
  ensureDir(path.join(docs, d));
}

const tzSrc = path.join(docs, "TZ_INTGETION_v6.md");
let tzBody = read(tzSrc);
// If already stubbed, load from archive
if (tzBody.includes("Монолит v6 **заморожен**")) {
  tzBody = read(path.join(docs, "archive/tz/TZ_INTGETION_v6.md"));
} else {
  write(path.join(docs, "archive/tz/TZ_INTGETION_v6.md"), tzBody);
}

const lines = tzBody.split(/\r?\n/);

const domains = [
  {
    name: "00-protocol.md",
    title: "Протокол сессий, DoD, запреты",
    sections: [
      { start: "## 0. ", end: "## 1. " },
      { start: "## 23. ", end: "## 25. " },
    ],
  },
  {
    name: "01-product.md",
    title: "Продукт и scope MVP",
    sections: [
      { start: "## 1. ", end: "## 2. " },
      { start: "## 20. ", end: "## 22. " },
      { start: "## 25. ", end: "## 26. " },
      { start: "## 26. ", end: null },
    ],
  },
  {
    name: "02-decisions-registry.md",
    title: "Реестр решений D1–D30 (снимок)",
    sections: [{ start: "## 2. ", end: "## 3. " }],
    extra:
      "> Живые решения после D30: [../DECISIONS.md](../DECISIONS.md). Архив диапазонов: [../archive/decisions/](../archive/decisions/).\n\n",
  },
  {
    name: "03-stack.md",
    title: "Стек и архитектура",
    sections: [{ start: "## 3. ", end: "## 4. " }],
  },
  {
    name: "04-data.md",
    title: "Модель данных",
    sections: [{ start: "## 4. ", end: "## 5. " }],
    extra: "> ERD: [../ERD.md](../ERD.md).\n\n",
  },
  {
    name: "05-privacy-rights.md",
    title: "Права доступа",
    sections: [{ start: "## 5. ", end: "## 6. " }],
  },
  {
    name: "06-api.md",
    title: "API: правила и эндпоинты",
    sections: [{ start: "## 6. ", end: "## 8. " }],
  },
  {
    name: "08-pages-ux.md",
    title: "Страницы и UX",
    sections: [{ start: "## 8. ", end: "## 10. " }],
  },
  {
    name: "10-matching.md",
    title: "Matching v1",
    sections: [{ start: "## 10. ", end: "## 11. " }],
  },
  {
    name: "11-taxonomy.md",
    title: "Таксономия и полнота профиля",
    sections: [{ start: "## 11. ", end: "## 12. " }],
  },
  {
    name: "12-bot.md",
    title: "Бот (web chat)",
    sections: [{ start: "## 12. ", end: "## 13. " }],
  },
  {
    name: "13-import.md",
    title: "Импорт (ingestion)",
    sections: [{ start: "## 13. ", end: "## 14. " }],
  },
  {
    name: "14-moderation.md",
    title: "Верификация и модерация",
    sections: [{ start: "## 14. ", end: "## 15. " }],
  },
  {
    name: "15-notifications.md",
    title: "Уведомления",
    sections: [{ start: "## 15. ", end: "## 16. " }],
  },
  {
    name: "16-security.md",
    title: "Безопасность",
    sections: [{ start: "## 16. ", end: "## 17. " }],
  },
  {
    name: "17-gdpr.md",
    title: "Приватность / GDPR / retention",
    sections: [{ start: "## 17. ", end: "## 18. " }],
  },
  {
    name: "18-ops.md",
    title: "Мониторинг и эксплуатация",
    sections: [{ start: "## 18. ", end: "## 19. " }],
    extra: "> RUNBOOK: [../RUNBOOK.md](../RUNBOOK.md).\n\n",
  },
  {
    name: "19-tests.md",
    title: "Тесты",
    sections: [{ start: "## 19. ", end: "## 20. " }],
  },
  {
    name: "22-roadmap.md",
    title: "Roadmap подфаз",
    sections: [{ start: "## 22. ", end: "## 23. " }],
    extra:
      "> Параллельная работа: [../PARALLEL_WORK.md](../PARALLEL_WORK.md).\n\n",
  },
];

for (const d of domains) {
  const body =
    d.sections
      .map(({ start, end }) => {
        const startIdx = lines.findIndex((l) => l.startsWith(start));
        if (startIdx < 0) throw new Error("missing start " + start);
        let endIdx = lines.length;
        if (end) {
          const e = lines.findIndex(
            (l, i) => i > startIdx && l.startsWith(end),
          );
          if (e >= 0) endIdx = e;
        }
        return lines.slice(startIdx, endIdx).join("\n").trimEnd();
      })
      .join("\n\n") + "\n";
  const header = `# ${d.title}\n\n> Живое ТЗ домена. Монолит v6: [archive/tz/TZ_INTGETION_v6.md](../archive/tz/TZ_INTGETION_v6.md).\n> Карта: [tz/INDEX.md](INDEX.md) · сейчас: [CURRENT.md](../CURRENT.md).\n\n${d.extra || ""}`;
  write(path.join(docs, "tz", d.name), header + body);
  console.log("tz/" + d.name);
}

write(
  tzSrc,
  `# INTGETION JOB LIST — ТЗ (указатель)

> Монолит v6 **заморожен**. Рабочий источник правды — разбитые файлы ниже.

## Читать сейчас

1. [CURRENT.md](CURRENT.md) — что работает / нет, активная задача
2. [OPEN_TASKS.md](OPEN_TASKS.md) — открытые хвосты
3. [tz/INDEX.md](tz/INDEX.md) — ТЗ по доменам (только нужный файл)
4. [how-it-works/INDEX.md](how-it-works/INDEX.md) — как устроено в коде
5. [status/INDEX.md](status/INDEX.md) — сводка OK / PARTIAL / BROKEN / DEFERRED

## Архив

- Полный монолит v6: [archive/tz/TZ_INTGETION_v6.md](archive/tz/TZ_INTGETION_v6.md)
- Карта архива: [archive/INDEX.md](archive/INDEX.md)

Реестр D1–D30 (снимок из ТЗ): [tz/02-decisions-registry.md](tz/02-decisions-registry.md).  
Новые решения — только в [DECISIONS.md](DECISIONS.md).
`,
);

// --- MISSION_LOG: keep last 15 entries in root ---
const missionPath = path.join(root, "MISSION_LOG.md");
const mission = read(missionPath);
const missionLines = mission.split(/\r?\n/);
const entryStarts = [];
for (let i = 0; i < missionLines.length; i++) {
  if (/^## \[\d{4}-\d{2}-\d{2}\]/.test(missionLines[i])) {
    entryStarts.push(i);
  }
}
const keepCount = 15;
const keepFromIdx =
  entryStarts.length > keepCount
    ? entryStarts[entryStarts.length - keepCount]
    : entryStarts[0] ?? 0;

const headerEnd = entryStarts[0] ?? 0;
const headerPart = missionLines.slice(0, headerEnd).join("\n");
const archiveBody = missionLines.slice(headerEnd, keepFromIdx).join("\n");
const recentBody = missionLines.slice(keepFromIdx).join("\n");

// Split archive by rough waves using date/content heuristics
write(
  path.join(docs, "archive/mission-log/2026-10-early.md"),
  `# MISSION_LOG archive — early October 2026 (waves 0–integration)\n\n> Older session records. Live log: [../../../MISSION_LOG.md](../../../MISSION_LOG.md).\n\n${archiveBody.trimEnd()}\n`,
);

const newMission = `# MISSION_LOG

> Older entries: [docs/archive/mission-log/](docs/archive/mission-log/) — see [docs/archive/INDEX.md](docs/archive/INDEX.md).
> Session protocol: [docs/tz/00-protocol.md](docs/tz/00-protocol.md). Status now: [docs/CURRENT.md](docs/CURRENT.md).

${recentBody.trimStart()}
`;
write(missionPath, newMission);
console.log(
  "MISSION_LOG: archived",
  entryStarts.length - keepCount,
  "kept",
  Math.min(keepCount, entryStarts.length),
);

// --- DECISIONS: split ranges into archive, leave live stub + recent ---
const decPath = path.join(docs, "DECISIONS.md");
const dec = read(decPath);
const decLines = dec.split(/\r?\n/);

/** @type {{num:number, idx:number}[]} */
const dHeads = [];
for (let i = 0; i < decLines.length; i++) {
  const m = decLines[i].match(/^## D(\d+)\b/);
  if (m) dHeads.push({ num: Number(m[1]), idx: i });
}

function extractRange(minInclusive, maxInclusive) {
  const chunks = [];
  for (let i = 0; i < dHeads.length; i++) {
    const { num, idx } = dHeads[i];
    if (num < minInclusive || num > maxInclusive) continue;
    const end = i + 1 < dHeads.length ? dHeads[i + 1].idx : decLines.length;
    chunks.push(decLines.slice(idx, end).join("\n").trimEnd());
  }
  return chunks.join("\n\n") + "\n";
}

const ranges = [
  { file: "D001-D100.md", min: 1, max: 100 },
  { file: "D101-D200.md", min: 101, max: 200 },
  { file: "D201-D300.md", min: 201, max: 300 },
  { file: "D301-plus.md", min: 301, max: 9999 },
];

for (const r of ranges) {
  const body = extractRange(r.min, r.max);
  write(
    path.join(docs, "archive/decisions", r.file),
    `# Decisions archive ${r.file.replace(".md", "")}\n\n> Append-only history. Live pointer: [../../DECISIONS.md](../../DECISIONS.md).\n\n${body}`,
  );
  console.log("archive/decisions/" + r.file);
}

// Keep D1–D30 table + pointer + D301+ (or last range) in live file for append
const firstD31 = dHeads.find((h) => h.num >= 31);
const firstD301 = dHeads.find((h) => h.num >= 301);
const preamble = decLines
  .slice(0, firstD31 ? firstD31.idx : decLines.length)
  .join("\n")
  .trimEnd();
const recentDec = firstD301
  ? decLines.slice(firstD301.idx).join("\n").trimEnd()
  : "";

const liveDecisions = `${preamble}

---

## Где лежат решения

| Диапазон | Файл |
| -------- | ---- |
| D1–D30 (таблица выше) | этот файл |
| D31–D100 | [archive/decisions/D001-D100.md](archive/decisions/D001-D100.md) |
| D101–D200 | [archive/decisions/D101-D200.md](archive/decisions/D101-D200.md) |
| D201–D300 | [archive/decisions/D201-D300.md](archive/decisions/D201-D300.md) |
| D301+ (живой хвост ниже) | [archive/decisions/D301-plus.md](archive/decisions/D301-plus.md) + этот файл |

Новые решения **только дописывать в конец этого файла** (и дублировать хвост в archive/D301-plus при следующей уборке). Не переписывать смысл старых D.

---

${recentDec}
`;
write(decPath, liveDecisions + "\n");
console.log("DECISIONS.md shrunk");

console.log("done");
