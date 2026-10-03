# Промпты для агентов

Каждый файл — готовый промпт для одного агента. Правила и распределение подфаз — в `docs/PARALLEL_WORK.md`.

| Файл                     | Агент       | Когда запускать                    |
| ------------------------ | ----------- | ---------------------------------- |
| `antigravity-review.md`  | Antigravity | сейчас                             |
| `codex-3a.md`            | Codex       | после слияния 1B в `master`        |
| `cursor-2b.md`           | Cursor      | после слияния 1B и 2A в `master`   |
| `codex-3b.md`            | Codex       | после слияния 3A (и 2A) в `master` |
| `antigravity-llm-lib.md` | Antigravity | сейчас                             |
| `glm-lib.md`             | GLM         | сдано                              |
| `glm-matching-score.md`  | GLM         | сейчас                             |
| `codex-4a.md`            | Codex       | сейчас (вместо `glm-4a.md`)        |
| `antigravity-8a.md`      | Antigravity | после слияния 3B (и 2A) в `master` |
| `cursor-5a-rules.md`     | Cursor      | сейчас                             |
| `cursor-5a.md`           | Cursor      | после слияния 3B и 2B в `master`   |
