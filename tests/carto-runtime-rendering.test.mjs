import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
test("does not prerender the map route because it needs the runtime CARTO key", () => {
  const manifestPath = resolve(projectRoot, ".next", "prerender-manifest.json");
  assert.ok(existsSync(manifestPath), "the production build must create a prerender manifest");

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.equal(
    Object.hasOwn(manifest.routes, "/mapa"),
    false,
    "/mapa must render at request time so API_CARTO_KEY is read from the running container",
  );
});
