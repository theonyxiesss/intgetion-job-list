/**
 * User-facing copy belongs in src/messages, not in JSX.
 * @type {import("eslint").Rule.RuleModule}
 */
const visibleAttributes = new Set([
  "alt",
  "aria-label",
  "placeholder",
  "title",
]);

const letters = /[A-Za-z\u0400-\u04FF]/;

const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "Forbid hardcoded user-facing strings in JSX.",
    },
    schema: [],
    messages: {
      hardcoded: "Move this user-facing string into src/messages.",
    },
  },
  create(context) {
    return {
      JSXText(node) {
        if (letters.test(node.value)) {
          context.report({ node, messageId: "hardcoded" });
        }
      },
      JSXAttribute(node) {
        if (node.name.type !== "JSXIdentifier") return;
        if (!visibleAttributes.has(node.name.name)) return;
        if (
          node.value?.type === "Literal" &&
          typeof node.value.value === "string" &&
          letters.test(node.value.value)
        ) {
          context.report({ node, messageId: "hardcoded" });
        }
      },
    };
  },
};

export default rule;
