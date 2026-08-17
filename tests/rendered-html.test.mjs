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
  assert.match(html, /Start tracking/);
  assert.match(html, /EXAMPLE DATA/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("mobile photo picker allows camera or library", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /Take a photo or choose from your library/);
  assert.match(source, /photo-guide-correct\.jpg/);
  assert.match(source, /GOOD EXAMPLE/);
  assert.match(source, /photo-guide-shadow\.jpg/);
  assert.match(source, /Forehead or chin cut off/);
  assert.match(source, /Forehead to chin/);
  assert.match(source, /Move close and center your face/);
  assert.doesNotMatch(source, /capture=["']user["']/);
  assert.match(source, /accept="image\/\*"/);
  assert.match(source, /skin-check\.jpg/);
  assert.match(source, /shorter side/);
  assert.match(source, /maxUploadBytes = 1_250_000/);
  assert.match(source, /Large files resize automatically/);
  assert.match(source, /response\.status === 413/);
  assert.doesNotMatch(source, /send this phone photo/);
  assert.match(source, /Upload prepared/);
  assert.match(source, /preview shows the full image/);
  assert.match(source, /Move close and center your face/);
  assert.match(source, /condition score/);
  assert.match(source, /Lower measured condition/);
  assert.match(source, /Higher measured condition/);
  assert.match(source, /not a percentage or medical diagnosis/);
  assert.match(source, /does not show progress on its own/);
  assert.match(source, /EXAMPLE · PRIMARY FOCUS/);
  assert.match(source, /A YouCam 1–100 condition score—not a percentage/);
  assert.match(source, /Starting reference/);
  assert.match(source, /supports .*Possible improvement/);
  assert.match(source, /ritualproof\.baseline\.v1/);
  assert.match(source, /localStorage\.setItem/);
  assert.match(source, /localStorage\.getItem/);
  assert.match(source, /Take a follow-up live scan/);
  assert.match(source, /LIVE YOUCAM COMPARISON/);
  assert.match(source, /Change:.*points/);
  assert.match(source, /No progress is shown until another live scan/);
  assert.doesNotMatch(source, /Preview my next check-in/);
  assert.doesNotMatch(source, /SIMULATED FOLLOW-UP/);
  assert.doesNotMatch(source, /Back to setup/);
  assert.match(source, /Accelerated technical demo/);
  assert.match(source, /One comparison is not a trend/);
  assert.match(source, /RitualProof does not save your photo/);
  assert.match(source, /Approximately when did you start/);
  assert.match(source, /type="date"/);
  assert.match(source, /Product Day/);
  assert.match(source, /Tracking Day 0/);
  assert.match(source, /Take your before-you-start scan/);
  assert.match(source, /Take your first tracking scan/);
  assert.match(source, /Set your current reference point/);
  assert.match(source, /Interpret with extra caution/);
  assert.match(source, /cannot measure what changed before this scan/);
  const apiSource = await readFile(new URL("../app/api/analyze/route.ts", import.meta.url), "utf8");
  assert.match(apiSource, /face_too_small/);
  assert.match(apiSource, /face fills most of the frame/);
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(styles, /object-fit:contain/);
});
