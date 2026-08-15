import { NextResponse } from "next/server";

const API_ROOT = "https://yce-api-01.makeupar.com/s2s/v2.1";
const ACTIONS = ["firmness", "moisture", "wrinkle"];

type YouCamPayload = { status?: number; error?: string; error_code?: string; data?: Record<string, unknown>; files?: unknown[] };

function failure(message: string, status = 502) {
  return NextResponse.json({ error: message }, { status });
}

async function asJson(response: Response): Promise<YouCamPayload> {
  const payload = await response.json().catch(() => ({})) as YouCamPayload;
  if (!response.ok || (payload.status && payload.status >= 400)) throw new Error(payload.error || `YouCam returned ${response.status}.`);
  return payload;
}

function findScores(payload: YouCamPayload) {
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const results = data.results as Record<string, unknown> | undefined;
  const output = Array.isArray(results?.output) ? results.output as Array<Record<string, unknown>> : [];
  const fromOutput = Object.fromEntries(output.map((item) => [String(item.type).replace(/^hd_/, ""), Number(item.raw_score)]));
  const scoreInfo = (results?.score_info ?? data.score_info ?? results) as Record<string, unknown> | undefined;
  const get = (key: string) => {
    if (Number.isFinite(fromOutput[key])) return fromOutput[key];
    const entry = scoreInfo?.[key] as Record<string, unknown> | undefined;
    const whole = entry?.whole as Record<string, unknown> | undefined;
    return Number(whole?.raw_score ?? entry?.raw_score);
  };
  const scores = { firmness: get("firmness"), moisture: get("moisture"), wrinkle: get("wrinkle") };
  return Object.values(scores).every(Number.isFinite) ? scores : null;
}

export async function POST(request: Request) {
  const apiKey = process.env.YOUCAM_API_KEY;
  if (!apiKey) return failure("Live scan is ready, but YOUCAM_API_KEY has not been added to this site yet.", 503);
  try {
    const form = await request.formData();
    const image = form.get("image");
    if (!(image instanceof File)) return failure("Please choose an image first.", 400);
    if (!(["image/jpeg", "image/png"].includes(image.type))) return failure("Please use a JPG or PNG image.", 400);
    if (image.size > 10 * 1024 * 1024) return failure("Please use an image smaller than 10 MB.", 400);

    const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
    const initPayload = await asJson(await fetch(`${API_ROOT}/file/skin-analysis`, {
      method: "POST", headers, body: JSON.stringify({ files: [{ content_type: image.type, file_name: image.name || "skin-check.jpg", file_size: image.size }] }),
    }));
    const initData = (initPayload.data ?? initPayload) as Record<string, unknown>;
    const files = (initData.files ?? initPayload.files) as Array<Record<string, unknown>> | undefined;
    const uploaded = files?.[0];
    const uploadRequest = (uploaded?.requests as Array<Record<string, unknown>> | undefined)?.[0];
    if (!uploaded?.file_id || !uploadRequest?.url) throw new Error("YouCam did not provide an upload destination.");

    const uploadHeaders = new Headers(uploadRequest.headers as HeadersInit | undefined);
    if (!uploadHeaders.has("Content-Type")) uploadHeaders.set("Content-Type", image.type);
    const uploadResponse = await fetch(String(uploadRequest.url), { method: String(uploadRequest.method || "PUT"), headers: uploadHeaders, body: image });
    if (!uploadResponse.ok) throw new Error("The photo upload did not complete.");

    const taskPayload = await asJson(await fetch(`${API_ROOT}/task/skin-analysis`, {
      method: "POST", headers, body: JSON.stringify({ src_file_id: uploaded.file_id, dst_actions: ACTIONS, format: "json" }),
    }));
    const taskData = (taskPayload.data ?? {}) as Record<string, unknown>;
    const taskId = taskData.task_id ?? taskPayload.data?.task_id;
    if (!taskId) throw new Error("YouCam did not create an analysis task.");

    for (let attempt = 0; attempt < 18; attempt += 1) {
      if (attempt) await new Promise((resolve) => setTimeout(resolve, 1200));
      const statusPayload = await asJson(await fetch(`${API_ROOT}/task/skin-analysis/${encodeURIComponent(String(taskId))}`, { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" }));
      const statusData = (statusPayload.data ?? {}) as Record<string, unknown>;
      if (statusData.task_status === "error") throw new Error(String(statusData.error || "YouCam could not analyze this photo."));
      if (statusData.task_status === "success") {
        const scores = findScores(statusPayload);
        if (!scores) throw new Error("The scan completed but the requested scores were missing.");
        return NextResponse.json({ scores, scoreType: "raw", retained: false });
      }
    }
    return failure("The analysis is taking longer than expected. Please try again.", 504);
  } catch (error) {
    return failure(error instanceof Error ? error.message : "The scan could not be completed.");
  }
}
