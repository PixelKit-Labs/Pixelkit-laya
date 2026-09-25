import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const base = process.argv[2];
const failures = [];

if (base) {
  if (!/^[0-9a-f]{40}$/i.test(base)) throw new Error(`Invalid base commit SHA: ${base}`);
  const changed = execFileSync("git", ["diff", "--name-only", base, "--"], {
    cwd: root, encoding: "utf8",
  }).trim().split(/\r?\n/).filter(Boolean);
  const implementationChanged = changed.some((file) =>
    !["README.md", "CHANGELOG.md", "AGENTS.md", "RELEASING.md", "LICENSE", "NOTICE"].includes(file) &&
    !file.startsWith("docs/")
  );
  if (implementationChanged) {
    for (const required of ["README.md", "CHANGELOG.md"]) {
      if (!changed.includes(required)) failures.push(`${required} must change with SDK or CI changes`);
    }
    const previous = JSON.parse(execFileSync("git", ["show", `${base}:package.json`], {
      cwd: root, encoding: "utf8",
    })).version;
    if (previous === version) failures.push(`SDK version must change from ${previous} with SDK or CI changes`);
  }
}

const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");
if (!changelog.includes(`## ${version}\n`) && !changelog.includes(`## ${version}\r\n`)) {
  failures.push(`CHANGELOG.md must have a section for ${version}`);
}

let temporaryDocs = null;
try {
  let docsRoot = process.env.PIXELKIT_DOCS_DIR;
  if (!docsRoot) {
    temporaryDocs = mkdtempSync(join(tmpdir(), "pixelkit-laya-docs-"));
    execFileSync("git", ["clone", "--quiet", "--depth", "1", "https://github.com/PixelKit-Labs/pixelkit-docs.git", temporaryDocs], {
      stdio: "pipe",
    });
    docsRoot = temporaryDocs;
  }

  const guide = readFileSync(join(resolve(docsRoot), "docs", "guides", "laya.md"), "utf8");
  const documentedVersion = guide.match(/^\*\*SDK version:\*\* `([^`]+)`/m)?.[1];
  if (documentedVersion !== version) {
    failures.push(`PixelKit Laya guide must name SDK version ${version}; found ${documentedVersion ?? "none"}`);
  }

  const modules = {
    "": await import(pathToFileURL(join(root, "dist", "index.js")).href),
    "/mobile": await import(pathToFileURL(join(root, "dist", "mobile.js")).href),
  };
  if (modules[""].VERSION !== version) failures.push(`SDK VERSION export must equal package version ${version}`);
  let mobileImport = false;
  for (const match of guide.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]@pixelkit-labs\/laya(\/mobile)?['"]/g)) {
    const subpath = match[2] ?? "";
    if (subpath === "/mobile") mobileImport = true;
    for (const raw of match[1].split(",")) {
      const name = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0];
      if (name && !(name in modules[subpath])) {
        failures.push(`PixelKit Laya guide imports missing ${subpath || "main"} export ${name}`);
      }
    }
  }
  if (!mobileImport) failures.push("PixelKit Laya guide must show a named mobile SDK import");
} finally {
  if (temporaryDocs) {
    const target = resolve(temporaryDocs);
    if (!target.startsWith(`${resolve(tmpdir())}${sep}`)) throw new Error(`Unsafe temporary docs path: ${target}`);
    rmSync(target, { recursive: true, force: true });
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`Documentation contract: ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Documentation contract passed for @pixelkit-labs/laya ${version}`);
}
