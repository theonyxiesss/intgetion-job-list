/**
 * Colours come from design tokens only (docs/DESIGN.md 3, 13; D140): no
 * Tailwind palette classes (`bg-zinc-900`, `text-white`, ...) and no
 * arbitrary hex values (`bg-[#fff]`) in class strings.
 * @type {import("eslint").Rule.RuleModule}
 */
const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const UTILITY =
  "bg|text|border|border-[trblxy]|ring|ring-offset|outline|fill|stroke|divide|decoration|placeholder|caret|accent|shadow|from|via|to";

const RAW = new RegExp(
  String.raw`(?:^|[\s:!])(?:${UTILITY})-(?:black|white|(?:${PALETTE})-\d{2,3})(?:\/\d+)?(?=$|[\s"'\`])|\[#[0-9a-fA-F]{3,8}\]`,
);

/** Class strings: className values and arguments of cn()/clsx(). */
function isClassContext(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (
      current.type === "JSXAttribute" &&
      current.name?.type === "JSXIdentifier" &&
      current.name.name === "className"
    ) {
      return true;
    }
    if (
      current.type === "CallExpression" &&
      current.callee.type === "Identifier" &&
      ["cn", "clsx", "buttonClass"].includes(current.callee.name)
    ) {
      return true;
    }
    if (current.type === "Program") return false;
  }
  return false;
}

const rule = {
  meta: {
    type: "problem",
    docs: { description: "Forbid raw colours outside design tokens." },
    schema: [],
    messages: {
      raw: "Use a design token class (bg-surface, text-fg-muted, border-line, ...) instead of a raw colour.",
    },
  },
  create(context) {
    function check(node, value) {
      if (
        typeof value === "string" &&
        RAW.test(value) &&
        isClassContext(node)
      ) {
        context.report({ node, messageId: "raw" });
      }
    }
    return {
      Literal(node) {
        check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.cooked);
      },
    };
  },
};

export default rule;
