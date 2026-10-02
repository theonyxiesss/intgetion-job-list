/**
 * Repo imports stay inside the owning module.
 * contacts/repo may be imported only from contacts/service.
 * @type {import("eslint").Rule.RuleModule}
 */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid importing a module repo from outside that module. contacts/repo is limited to contacts/service.",
    },
    schema: [],
    messages: {
      foreignRepo:
        "Import another module's repo only through its service/index.ts. Repo imports are limited to the owning module.",
      contactsRepo: "contacts/repo may be imported only from contacts/service.",
    },
  },
  create(context) {
    /**
     * @param {import("eslint").Rule.Node} node
     * @param {unknown} source
     */
    function check(node, source) {
      if (typeof source !== "string") return;
      const filename = (context.filename ?? context.getFilename()).replaceAll(
        "\\",
        "/",
      );
      const target = resolveRepoModule(filename, source);
      if (!target) return;

      if (target === "contacts") {
        if (!filename.includes("/modules/contacts/service/")) {
          context.report({ node, messageId: "contactsRepo" });
        }
        return;
      }

      const owner = filename.match(/\/modules\/([^/]+)\//);
      if (!owner || owner[1] !== target) {
        context.report({ node, messageId: "foreignRepo" });
      }
    }

    return {
      ImportDeclaration(node) {
        check(node, node.source.value);
      },
      ExportNamedDeclaration(node) {
        if (node.source) check(node, node.source.value);
      },
      ExportAllDeclaration(node) {
        check(node, node.source.value);
      },
      ImportExpression(node) {
        if (
          node.source.type === "Literal" &&
          typeof node.source.value === "string"
        ) {
          check(node, node.source.value);
        }
      },
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "require" &&
          node.arguments[0]?.type === "Literal" &&
          typeof node.arguments[0].value === "string"
        ) {
          check(node, node.arguments[0].value);
        }
      },
    };
  },
};

/**
 * @param {string} filename
 * @param {string} source
 * @returns {string | null}
 */
function resolveRepoModule(filename, source) {
  let resolved = source.replaceAll("\\", "/");
  if (resolved.startsWith("@/")) {
    resolved = `/${resolved.slice(2)}`;
  } else if (resolved.startsWith(".")) {
    const dir = filename.split("/").slice(0, -1).join("/");
    resolved = normalizePath(`${dir}/${resolved}`);
  }

  const match = resolved.match(/(?:^|\/)modules\/([^/]+)\/repo(?:\/|$)/);
  return match?.[1] ?? null;
}

/**
 * @param {string} value
 */
function normalizePath(value) {
  const parts = [];
  for (const part of value.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return `/${parts.join("/")}`;
}

export default rule;
