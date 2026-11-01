import { describe, expect, it } from "vitest";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import fr from "@/messages/fr.json";
import itMessages from "@/messages/it.json";
import ptBR from "@/messages/pt-BR.json";
import ru from "@/messages/ru.json";
import {
  IDLE_STEPS,
  IDLE_STEP_MS,
  elapsedLabel,
  idleStep,
  stepForTool,
  type StatusStep,
} from "./thinking-status";

const catalogs = { de, en, es, fr, it: itMessages, "pt-BR": ptBR, ru };

const everyStep: StatusStep[] = [
  ...IDLE_STEPS,
  "searchJobs",
  "readJob",
  "events",
  "services",
  "account",
  "memory",
  "ugc",
  "working",
];

describe("chat status while Spoki works (D490)", () => {
  it("names the step of a known tool", () => {
    expect(stepForTool("search_jobs")).toBe("searchJobs");
    expect(stepForTool("get_job")).toBe("readJob");
    expect(stepForTool("find_events")).toBe("events");
    expect(stepForTool("find_services")).toBe("services");
    expect(stepForTool("get_my_profile")).toBe("account");
    expect(stepForTool("remember_fact")).toBe("memory");
  });

  it("reads any UGC tool as UGC and anything else as working", () => {
    expect(stepForTool("propose_ugc_campaign")).toBe("ugc");
    expect(stepForTool("get_ugc_summary")).toBe("ugc");
    expect(stepForTool("apply_to_job")).toBe("working");
    expect(stepForTool("not_a_tool")).toBe("working");
  });

  it("takes the idle words in turn and starts again", () => {
    expect(idleStep(0)).toBe("thinking");
    expect(idleStep(IDLE_STEP_MS - 1)).toBe("thinking");
    expect(idleStep(IDLE_STEP_MS)).toBe("pondering");
    expect(idleStep(IDLE_STEP_MS * IDLE_STEPS.length)).toBe("thinking");
    expect(idleStep(-5)).toBe("thinking");
  });

  it("advances the live idle label on the same cadence", () => {
    expect(idleStep(IDLE_STEP_MS * 2)).toBe("considering");
    expect(idleStep(IDLE_STEP_MS * 3)).toBe("mulling");
  });

  it("shows seconds only after a noticeable wait", () => {
    expect(elapsedLabel(0)).toBeNull();
    expect(elapsedLabel(1999)).toBeNull();
    expect(elapsedLabel(2000)).toBe("2s");
    expect(elapsedLabel(12_500)).toBe("12s");
  });

  it("has every step in every locale, the same English words", () => {
    for (const step of everyStep) {
      const english = en.chat.status[step];
      expect(english, `en ${step}`).toMatch(/^[A-Za-z ]+$/);
      for (const [locale, catalog] of Object.entries(catalogs))
        expect(catalog.chat.status[step], `${locale} ${step}`).toBe(english);
    }
  });
});
