import Module from "node:module";

// TypeScript 7 ships no compiler API, and typescript-eslint throws on sight of
// it. Point its bare `typescript` require at the 6.x compat package, which is
// the workaround its own error message recommends. Must run before the configs
// below load, hence the dynamic imports.
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  return resolveFilename.call(
    this,
    request === "typescript" ? "@typescript/typescript6" : request,
    ...rest,
  );
};

const { defineConfig, globalIgnores } = await import("eslint/config");
const { default: nextVitals } = await import(
  "eslint-config-next/core-web-vitals"
);
const { default: nextTs } = await import("eslint-config-next/typescript");

// TODO: remove react plugin overrides when eslint-plugin-react supports ESLint 10
// The plugin uses the removed `getFilename` API. Track: https://github.com/jsx-eslint/eslint-plugin-react/issues/3878
const disableReactPlugin = Object.fromEntries(
  [
    "display-name",
    "jsx-key",
    "jsx-no-comment-textnodes",
    "jsx-no-duplicate-props",
    "jsx-no-target-blank",
    "jsx-no-undef",
    "jsx-uses-react",
    "jsx-uses-vars",
    "no-children-prop",
    "no-danger-with-children",
    "no-deprecated",
    "no-direct-mutation-state",
    "no-find-dom-node",
    "no-is-mounted",
    "no-render-return-value",
    "no-string-refs",
    "no-unescaped-entities",
    "no-unknown-property",
    "no-unsafe",
    "prop-types",
    "react-in-jsx-scope",
    "require-render-return",
    "self-closing-comp",
    "jsx-no-useless-fragment",
  ].map((rule) => [`react/${rule}`, "off"]),
);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/openapi.ts",
  ]),
  {
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    rules: {
      ...disableReactPlugin,
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/incompatible-library": "off",
    },
  },
  {
    // SQLocal's transactionMutex deadlocks every later DB call if a statement
    // inside the transaction throws; use bare exec loops + ON CONFLICT.
    files: ["src/lib/db/client/**", "src/hooks/**", "src/components/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name='transaction'][callee.object.name=/sql|local/i]",
          message:
            "No sql.transaction() in client SQLocal code (transactionMutex deadlock). See CLAUDE.md rules.",
        },
      ],
    },
  },
]);

export default eslintConfig;
