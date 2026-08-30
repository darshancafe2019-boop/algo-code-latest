const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");

function getAllFiles(dir, exts = [".ts", ".tsx", ".js", ".jsx", ".mjs"]) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === "node_modules" || file === ".next" || file === ".git") continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, exts));
    } else {
      const ext = path.extname(file);
      if (exts.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const allFiles = getAllFiles(rootDir);
console.log(`Found ${allFiles.length} source files to inspect in frontend.`);

const importRegex = /(?:import\s+(?:(?:[\w*\s{},]+)\s+from\s+)?['"]([^'"]+)['"]|export\s+(?:(?:[\w*\s{},]+)\s+from\s+)['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g;

let brokenImports = [];
let potentialIssues = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, "utf8");
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1] || match[2] || match[3];
    if (!importPath) continue;

    // Check relative or alias imports (@/...)
    let resolved = null;
    if (importPath.startsWith(".")) {
      const dir = path.dirname(file);
      resolved = path.resolve(dir, importPath);
    } else if (importPath.startsWith("@/")) {
      resolved = path.resolve(rootDir, importPath.slice(2));
    }

    if (resolved) {
      const candidates = [
        resolved,
        resolved + ".ts",
        resolved + ".tsx",
        resolved + ".js",
        resolved + ".jsx",
        resolved + ".mjs",
        resolved + ".json",
        path.join(resolved, "index.ts"),
        path.join(resolved, "index.tsx"),
        path.join(resolved, "index.js"),
        path.join(resolved, "index.jsx"),
      ];

      const exists = candidates.some((c) => fs.existsSync(c));
      if (!exists) {
        brokenImports.push({
          file: path.relative(rootDir, file),
          importPath,
          line: content.slice(0, match.index).split("\n").length,
        });
      }
    }
  }
}

console.log("\n==================================================");
console.log("BROKEN IMPORT ANALYSIS RESULTS:");
console.log("==================================================");
if (brokenImports.length === 0) {
  console.log("No broken relative or @/ import paths found.");
} else {
  console.log(`Found ${brokenImports.length} broken imports:`);
  brokenImports.forEach((b) => console.log(`- ${b.file}:${b.line} -> "${b.importPath}"`));
}
