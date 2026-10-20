import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
const modules = new Map();
function moduleURL(file) {
  file = path.resolve(file);
  if (modules.has(file)) return modules.get(file);
  let source = file.endsWith(".json")
    ? "export default " + readFileSync(file, "utf8") + ";"
    : ts.transpileModule(readFileSync(file, "utf8"), {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
        },
      }).outputText;
  source = source.replace(
    /((?:from\s*|import\s*)['"])(\.[^'"]+)(['"])/g,
    (_, prefix, spec, suffix) => {
      const base = path.resolve(path.dirname(file), spec),
        target = [base, base + ".ts", base + ".tsx", base + ".json"].find(
          existsSync,
        );
      if (!target) throw Error("Cannot resolve " + spec + " from " + file);
      return prefix + moduleURL(target) + suffix;
    },
  );
  const url =
    "data:text/javascript;base64," + Buffer.from(source).toString("base64");
  modules.set(file, url);
  return url;
}
export const importTypeScript = (file) => import(moduleURL(file));
