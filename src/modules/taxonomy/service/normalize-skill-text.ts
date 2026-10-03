/**
 * Skill text keys. Stored aliases use `toAliasNormalized`.
 * The lookup key is `normalizeSkillText` (D42).
 */

const VERSION_TOKEN = /^v?\d+(?:\.\d+)*$/;
const GLUED_VERSION = /^([a-z]{3,})(\d+(?:\.\d+)*)$/;

/** Lowercase key stored in `skills_aliases.alias_normalized`. */
export function toAliasNormalized(raw: string): string {
  let value = raw.toLowerCase().trim();
  value = value.replace(/c\+\+/g, "cpp");
  value = value.replace(/c#/g, "csharp");
  value = value.replace(/f#/g, "fsharp");
  value = value.replace(/\.net\b/g, "dotnet");
  value = value.replace(/\.js\b/g, " ");
  value = value.replace(/[^a-z0-9]+/g, " ");

  const tokens = value
    .split(" ")
    .filter(Boolean)
    .filter((token) => !VERSION_TOKEN.test(token))
    .map((token) => {
      const glued = GLUED_VERSION.exec(token);
      return glued?.[1] ?? token;
    });

  return tokens.join("");
}

/**
 * Lookup key: alias form, then a trailing `js` suffix when the stem
 * still has at least two characters (`reactjs` → `react`, bare `js` stays).
 */
export function normalizeSkillText(raw: string): string {
  const alias = toAliasNormalized(raw);
  if (alias.endsWith("js") && alias.length >= 4) {
    return alias.slice(0, -2);
  }
  return alias;
}
