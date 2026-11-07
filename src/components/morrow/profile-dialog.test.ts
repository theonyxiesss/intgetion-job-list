import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import { profileRequest, type ProfileDraft } from "./profile-request";

const draft: ProfileDraft = {
  name: " Alex ",
  role: "Frontend developer",
  skills: "React, TypeScript",
  location: "",
  portfolio: "https://alex.dev",
  cv: null,
};

describe("profile window (TZ 53)", () => {
  it("asks Spoki with only the facts the person typed", () => {
    const t = createTranslator({
      locale: "en",
      messages: en,
      namespace: "morrow.profile",
    });
    const text = profileRequest(draft, (key, values) =>
      t(key as never, values as never),
    );
    expect(text).toBe(
      "Update my profile: name Alex; role Frontend developer; skills React, TypeScript; portfolio https://alex.dev. If a CV is attached, use it too.",
    );
    expect(text).not.toContain("location");
  });

  it("speaks the person's language", () => {
    const t = createTranslator({
      locale: "ru",
      messages: ru,
      namespace: "morrow.profile",
    });
    expect(
      profileRequest(draft, (key, values) => t(key as never, values as never)),
    ).toMatch(/^Обнови мой профиль: имя Alex;/);
  });
});
