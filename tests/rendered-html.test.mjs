import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders RitualProof", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>RitualProof/);
  assert.match(html, /Proof, not promises/);
  assert.match(html, /Take my first scan/);
  assert.match(html, /SIMULATED DATA/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("mobile photo picker allows camera or library", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /Take a photo or choose from your library/);
  assert.doesNotMatch(source, /capture=["']user["']/);
  assert.match(source, /accept="image\/\*"/);
  assert.match(source, /skin-check\.jpg/);
  assert.match(source, /shorter side/);
});
