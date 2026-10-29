/* global document, innerWidth, getComputedStyle, location */
/**
 * Layout alignment audit (local tool, not part of the build).
 *
 * Paste the whole file into the browser console, or pass it to the Browser
 * pane's javascript tool, on any page of the running site. It reads layout and
 * changes nothing. Run it at 375 and 1280 px on the pages you care about.
 *
 * Reports, for the content inside <main>:
 *  - overflowX      page scrolls sideways by this many px (should be 0)
 *  - clipped        elements that start or end outside the viewport
 *                   (a chip row with `overflow-x-auto` is expected here)
 *  - dominantLefts  the most common left edges: the columns the page uses
 *  - nearMisses     left edges 1-3 px off a dominant column; `sr-only` labels
 *                   (margin -1px) show up here and are not visible
 *  - offGrid        margin/padding/gap values that are not a multiple of 4 px
 *  - smallTargets   links and controls under 24 x 24 px (WCAG 2.2 AA 2.5.8);
 *                   inline links inside text are skipped
 *  - listGaps       distinct vertical gaps between list items (one value = even)
 */
(() => {
  const vw = innerWidth;
  const main = document.querySelector("main") || document.body;
  const rect = (el) => el.getBoundingClientRect();
  const visible = (el) => {
    const r = rect(el);
    const cs = getComputedStyle(el);
    return (
      r.width > 0 &&
      r.height > 0 &&
      cs.visibility !== "hidden" &&
      cs.display !== "none" &&
      Number(cs.opacity) > 0
    );
  };
  const els = [
    ...main.querySelectorAll(
      "h1,h2,h3,p,a,button,input,textarea,select,label,li,article,section",
    ),
  ].filter(visible);

  const clipped = els
    .filter((el) => rect(el).right > vw + 1 || rect(el).left < -1)
    .slice(0, 5)
    .map((el) => ({
      tag: el.tagName,
      cls: String(el.className).slice(0, 40),
      left: Math.round(rect(el).left),
      right: Math.round(rect(el).right),
    }));

  const lefts = {};
  els.forEach((el) => {
    if (
      !["H1", "H2", "H3", "P", "A", "BUTTON", "INPUT", "LABEL"].includes(
        el.tagName,
      )
    )
      return;
    const left = Math.round(rect(el).left);
    lefts[left] = (lefts[left] || 0) + 1;
  });
  const sorted = Object.entries(lefts).sort((a, b) => b[1] - a[1]);
  const columns = sorted
    .filter(([, n]) => n >= 3)
    .map(([left]) => Number(left));
  const nearMisses = sorted
    .filter(
      ([left]) =>
        !columns.includes(Number(left)) &&
        columns.some(
          (c) =>
            Math.abs(c - Number(left)) >= 1 && Math.abs(c - Number(left)) <= 3,
        ),
    )
    .map(([left, count]) => ({
      left: Number(left),
      count,
      nearTo: columns.find((c) => Math.abs(c - Number(left)) <= 3),
    }));

  const offGrid = {};
  const spacing = [
    "marginTop",
    "marginBottom",
    "marginLeft",
    "marginRight",
    "paddingTop",
    "paddingBottom",
    "paddingLeft",
    "paddingRight",
    "rowGap",
    "columnGap",
  ];
  spacing.forEach((prop) =>
    els.forEach((el) => {
      const value = parseFloat(getComputedStyle(el)[prop]);
      if (!Number.isFinite(value) || value === 0) return;
      if (Math.abs(value / 4 - Math.round(value / 4)) > 0.01) {
        offGrid[`${value}px`] = (offGrid[`${value}px`] || 0) + 1;
      }
    }),
  );

  const smallTargets = [
    ...main.querySelectorAll("a,button,input,select,textarea,[role=button]"),
  ]
    .filter(visible)
    .filter((el) => {
      const r = rect(el);
      const inline =
        el.tagName === "A" && getComputedStyle(el).display === "inline";
      return (r.width < 24 || r.height < 24) && !inline;
    })
    .slice(0, 8)
    .map((el) => ({
      tag: el.tagName,
      text: (el.textContent || el.getAttribute("aria-label") || "")
        .trim()
        .slice(0, 20),
      width: Math.round(rect(el).width),
      height: Math.round(rect(el).height),
    }));

  const listGaps = [...main.querySelectorAll("ul")]
    .filter((ul) => ul.querySelectorAll(":scope > li").length >= 3)
    .slice(0, 3)
    .map((ul) => {
      const items = [...ul.querySelectorAll(":scope > li")].filter(visible);
      const gaps = [];
      for (let i = 1; i < items.length; i++) {
        gaps.push(Math.round(rect(items[i]).top - rect(items[i - 1]).bottom));
      }
      return { items: items.length, gaps: [...new Set(gaps)].slice(0, 5) };
    });

  return {
    url: location.pathname,
    viewport: vw,
    overflowX: document.documentElement.scrollWidth - vw,
    clipped,
    dominantLefts: sorted
      .slice(0, 5)
      .map(([left, n]) => ({ left: Number(left), n })),
    nearMisses: nearMisses.slice(0, 6),
    offGrid: Object.entries(offGrid)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8),
    smallTargets,
    listGaps,
  };
})();
