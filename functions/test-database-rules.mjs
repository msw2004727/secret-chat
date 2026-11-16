import fs from "node:fs";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const rules = JSON.parse(fs.readFileSync(new URL("../database.rules.json", import.meta.url), "utf8"));

function walk(node, path, out) {
  if (typeof node === "string") out.push([path, node]);
  else if (node && typeof node === "object") {
    for (const key of Object.keys(node)) walk(node[key], path + "/" + key, out);
  }
}
const exprs = [];
walk(rules, "", exprs);
const stringMatches = exprs.filter(([, expr]) => /\.matches\(\s*['"]/.test(expr));
assert.deepEqual(stringMatches, [], "matches() must take a /regex/ literal, not a string");
const cells = exprs.find(([path]) => path.endsWith("/games/ooxx/cells/.validate"));
assert.ok(cells, "ooxx cells rule is present");
assert.match(cells[1], /\.matches\(\/\^\[mf\.\]\{9\}\$\/\)/);

const firebase = new URL("../node_modules/.bin/firebase", import.meta.url);
const result = spawnSync(
  firebase.pathname,
  ["emulators:exec", "--only", "database", "--project", "demo-secret-chat", "node -e \"process.exit(0)\""],
  { cwd: new URL("..", import.meta.url), encoding: "utf8", timeout: 120000 },
);
for (const name of ["database-debug.log", "firebase-debug.log", "ui-debug.log"]) {
  fs.rmSync(new URL("../" + name, import.meta.url), { force: true });
}
assert.equal(result.status, 0, (result.stdout || "") + (result.stderr || ""));
assert.doesNotMatch((result.stdout || "") + (result.stderr || ""), /Failed to (load|update) .*rules/i);
console.log("PASS: database rules compile in the Firebase emulator.");
