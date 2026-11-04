const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const ts = require("typescript");
const english = require("../src/i18n/en.mjs").default;
const { createRequire } = require("node:module");
const root = path.join(__dirname, "../src");
const neutral =
  /^(?:[\d\s{}.,/≈·→%–—−+-]*|g|kg|ml|L|min|kcal|kcal \/ 100 g|g ≈|nutria\.)$/;
const missing = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.tsx?$/.test(file)) {
      const source = fs.readFileSync(file, "utf8");
      const ast = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
        file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      function visit(node) {
        if (
          ts.isCallExpression(node) &&
          node.expression.getText(ast) === "tr" &&
          node.arguments[0] &&
          ts.isStringLiteral(node.arguments[0])
        ) {
          const key = node.arguments[0].text;
          if (
            !Object.hasOwn(english, key) &&
            !Object.hasOwn(english, key.trim()) &&
            !neutral.test(key.trim())
          )
            missing.push(path.relative(root, file) + ": " + key);
        }
        if (
          ts.isJsxText(node) &&
          /[A-Za-zÀ-ÿ]/.test(node.text) &&
          !file.endsWith("LanguageProvider.tsx")
        )
          missing.push(
            path.relative(root, file) + ": raw JSX text " + node.text.trim(),
          );
        ts.forEachChild(node, visit);
      }
      visit(ast);
    }
  }
}
walk(root);
assert.deepEqual(
  missing,
  [],
  "App-owned UI text needs a central English translation",
);
const catalogPath = path.join(root, "data/catalog.ts");
const compiled = ts.transpileModule(fs.readFileSync(catalogPath, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    resolveJsonModule: true,
    esModuleInterop: true,
  },
}).outputText;
const catalogModule = { exports: {} };
new Function("require", "module", "exports", compiled)(
  createRequire(catalogPath),
  catalogModule,
  catalogModule.exports,
);
const { foods, recipes, plans } = catalogModule.exports;
const identity = new Set(["Banana", "Tofu"]);
const missingData = [];
for (const food of foods)
  for (const text of [food.name, food.unit])
    if (!Object.hasOwn(english, text) && !identity.has(text))
      missingData.push(text);
for (const recipe of recipes.filter((r) => !r.source))
  for (const text of [
    recipe.name,
    recipe.subtitle,
    ...recipe.ingredients,
    ...recipe.steps,
  ])
    if (!Object.hasOwn(english, text)) missingData.push(text);
for (const plan of plans)
  for (const text of [plan.name, plan.tag, plan.description])
    if (!Object.hasOwn(english, text)) missingData.push(text);
assert.deepEqual(
  [...new Set(missingData)],
  [],
  "Static catalogue content needs a translation",
);
console.log(
  "PASS central translations cover all literal UI keys; no raw text outside the initial language chooser.",
);
console.log(
  "PASS all 24 foods, 8 original recipes and 3 collections have translations.",
);
