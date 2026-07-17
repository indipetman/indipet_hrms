import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const bundledSourcePath = path.join(projectRoot, "legacy", "hrms_dashboard_nav_visual.html");
const workspaceSourcePath = path.resolve(projectRoot, "..", "hrms_dashboard_nav_visual.html");
const sourcePath = fs.existsSync(bundledSourcePath)
  ? bundledSourcePath
  : workspaceSourcePath;
const source = fs.readFileSync(sourcePath, "utf8");

const styleMatch = source.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
const bodyMatch = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
const scriptMatches = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];

if (!styleMatch || !bodyMatch || scriptMatches.length !== 1) {
  throw new Error("The prototype structure changed; migration could not safely continue.");
}

const markup = bodyMatch[1]
  .replace(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi, "")
  .trim();
const css = `${styleMatch[1].trim()}\n`;
const runtime = `/* Migrated from hrms_dashboard_nav_visual.html. */\n${scriptMatches[0][1].trim()}\n`;

const prototypeDir = path.join(projectRoot, "src", "prototype");
fs.mkdirSync(prototypeDir, { recursive: true });
fs.mkdirSync(path.join(projectRoot, "public"), { recursive: true });

fs.writeFileSync(path.join(prototypeDir, "hrms-markup.html"), `${markup}\n`);
fs.writeFileSync(path.join(projectRoot, "app", "globals.css"), css);
fs.writeFileSync(path.join(projectRoot, "public", "hrms-runtime.js"), runtime);

console.log("Prototype markup, styles, and runtime migrated successfully.");
