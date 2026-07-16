const ARBITRARY_TAILWIND_VALUE = /(?:^|\s)[\w-]+-\[[^\]]+\]/;
const SECRET_NAME = /(SECRET|SERVICE_ROLE|API_KEY|TOKEN)/i;

function getEnvironmentVariableName(node) {
  if (
    node.type !== "MemberExpression" ||
    node.object.type !== "MemberExpression" ||
    node.object.object.type !== "Identifier" ||
    node.object.object.name !== "process" ||
    node.object.property.type !== "Identifier" ||
    node.object.property.name !== "env"
  ) {
    return undefined;
  }

  if (!node.computed && node.property.type === "Identifier") {
    return node.property.name;
  }

  if (
    node.computed &&
    node.property.type === "Literal" &&
    typeof node.property.value === "string"
  ) {
    return node.property.value;
  }

  return undefined;
}

function inspectTextNode(context, node) {
  if (ARBITRARY_TAILWIND_VALUE.test(node.value)) {
    context.report({
      node,
      message: "Tailwind arbitrary values are forbidden; use design tokens.",
    });
  }
}

const localRules = {
  rules: {
    "feature-boundaries": {
      meta: { type: "problem", schema: [] },
      create(context) {
        return {
          ImportDeclaration(node) {
            const source = node.source.value;
            if (typeof source !== "string") return;

            const match = source.match(
              /^@\/features\/([^/]+)\/(components|hooks|[^/]+-repository)(?:\/|$)/,
            );
            if (!match) return;

            const importer = context.filename.match(/src\/features\/([^/]+)\//)?.[1];
            if (importer && importer !== match[1]) {
              context.report({
                node,
                message:
                  "Features may import from another feature's services only, never components, hooks, or repositories.",
              });
            }
          },
        };
      },
    },
    "no-tailwind-arbitrary-values": {
      meta: { type: "problem", schema: [] },
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value === "string") inspectTextNode(context, node);
          },
          TemplateElement(node) {
            inspectTextNode(context, node);
          },
        };
      },
    },
    "no-public-secret": {
      meta: { type: "problem", schema: [] },
      create(context) {
        return {
          MemberExpression(node) {
            const name = getEnvironmentVariableName(node);
            if (name?.startsWith("NEXT_PUBLIC_") && SECRET_NAME.test(name)) {
              context.report({
                node,
                message: "Secrets must never use a NEXT_PUBLIC_ environment variable.",
              });
            }
          },
        };
      },
    },
    "no-raw-process-env": {
      meta: { type: "problem", schema: [] },
      create(context) {
        const normalizedFilename = context.filename.replaceAll("\\", "/");
        const isTypedAccessor = normalizedFilename.endsWith("/src/shared/lib/env.ts");

        return {
          MemberExpression(node) {
            if (!isTypedAccessor && getEnvironmentVariableName(node)) {
              context.report({
                node,
                message: "Read environment variables only through shared/lib/env.ts.",
              });
            }
          },
        };
      },
    },
  },
};

export default localRules;
