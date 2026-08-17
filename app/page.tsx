"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";

type MetricKey = "firmness" | "moisture" | "wrinkle";
type ScanScores = Record<MetricKey, number>;
type StartTiming = "not-started" | "recently" | "a-while";
type BaselineData = {
  scores: ScanScores;
  createdAt: string;
  ritual: string;
  category: string;
  frequency: string;
  primaryGoal: MetricKey;
  startTiming: StartTiming;
  productStartDate: string | null;
  routineChanged: boolean;
};
type ComparisonData = { followupScores: ScanScores; createdAt: string };

const metricLabels: Record<MetricKey, string> = { firmness: "Firmness", moisture: "Hydration", wrinkle: "Fine-line condition" };
const goalDescriptions: Record<MetricKey, string> = {
  moisture: "Track your skin's moisture-related score.",
  firmness: "Follow changes in skin firmness over time.",
  wrinkle: "Watch your wrinkle-related skin condition.",
};
const metricKeys: MetricKey[] = ["moisture", "firmness", "wrinkle"];
const maxUploadBytes = 1_250_000;
const maxUploadSide = 2048;
const baselineStorageKey = "ritualproof.baseline.v1";
const formatFileSize = (bytes: number) => bytes < 100_000 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const formatDate = (value: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
const productDay = (startDate: string | null | undefined, onDate = new Date().toISOString()) => {
  if (!startDate) return null;
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(onDate);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return null;
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1);
};
const trackingDay = (baselineDate: string, followupDate: string) => Math.max(0, Math.floor((new Date(followupDate).getTime() - new Date(baselineDate).getTime()) / 86_400_000));
const timingLanguage = (timing: StartTiming, startDate: string | null, onDate = new Date().toISOString()) => {
  const day = productDay(startDate, onDate);
  if (timing === "not-started") return {
    scanTitle: "Take your before-you-start scan.",
    context: "PRE-START · Before first use",
    resultTitle: "Before-you-start reference established",
    meaning: "You can now begin your ritual. Future check-ins will compare with this before-first-use reference.",
  };
  if (timing === "recently") return {
    scanTitle: "Take your first tracking scan.",
    context: `STARTED RECENTLY · ${day ? `Product Day ${day}` : "Start date not recorded"}`,
    resultTitle: "Tracking reference established",
    meaning: `${day ? `This scan was recorded around Product Day ${day}` : "You had already started"}, so it is your first tracking reference—not a pre-product result.`,
  };
  return {
    scanTitle: "Set your current reference point.",
    context: `EXISTING ROUTINE · ${day ? `Product Day ${day}` : "Start date not recorded"} · Not pre-product`,
    resultTitle: "Current reference point established",
    meaning: "We can track changes from today forward, but cannot measure what changed before this scan.",
  };
};
const demoPoints = [
  { day: 0, firmness: 62, moisture: 54, wrinkle: 58 },
  { day: 14, firmness: 65, moisture: 57, wrinkle: 59 },
  { day: 28, firmness: 68, moisture: 61, wrinkle: 61 },
];

function EvidenceChart({ points = demoPoints }: { points?: typeof demoPoints }) {
  const colors = { firmness: "#7047a6", moisture: "#e3826c", wrinkle: "#617a3c" };
  const makePath = (key: MetricKey) => points.map((point, index) => {
    const x = 8 + (index * 84) / Math.max(points.length - 1, 1);
    const y = 88 - ((point[key] - 45) / 35) * 72;
    return `${index ? "L" : "M"} ${x} ${y}`;
  }).join(" ");

  return <div className="chart-wrap" aria-label="Example skin indicator trend from day 0 to day 28">
    <svg className="chart" viewBox="0 0 100 100" role="img">
      <title>Example firmness, hydration, and fine-line condition across three check-ins</title>
      {[20, 50, 80].map((y) => <line key={y} x1="5" x2="95" y1={y} y2={y} className="grid-line" />)}
      {metricKeys.map((key) => <path key={key} d={makePath(key)} fill="none" stroke={colors[key]} strokeWidth="2.2" strokeLinecap="round" />)}
      {metricKeys.flatMap((key) => points.map((point, index) => {
        const x = 8 + (index * 84) / Math.max(points.length - 1, 1);
        const y = 88 - ((point[key] - 45) / 35) * 72;
        return <circle key={`${key}-${index}`} cx={x} cy={y} r="2.2" fill={colors[key]} />;
      }))}
    </svg>
    <div className="chart-days">{points.map((point) => <span key={point.day}>Day {point.day}</span>)}</div>
  </div>;
}

function JourneySteps({ active = 1, comparisonDay = 14 }: { active?: 1 | 2 | 3; comparisonDay?: number }) {
  return <div className="journey-steps" aria-label={`Journey progress, step ${active} of 3`}>
    <span className={active >= 1 ? "complete" : ""}><b>{active > 1 ? "✓" : "1"}</b><em>Tracking Day 0<small>First check-in</small></em></span><i />
    <span className={active >= 2 ? "complete" : ""}><b>{active > 2 ? "✓" : "2"}</b><em>{active >= 2 ? `Tracking Day ${comparisonDay}` : "Around Tracking Day 14"}<small>First comparison</small></em></span><i />
    <span className={active >= 3 ? "complete" : ""}><b>3</b><em>Several check-ins<small>Look for a pattern</small></em></span>
  </div>;
}

function ScoreReference({ label, score }: { label: string; score: number }) {
  const roundedScore = Math.round(score);

  return <div className="primary-result">
    <span>STARTING REFERENCE</span>
    <strong>{label}</strong>
    <div className="score-value"><b>{roundedScore}</b><small>/ 100</small></div>
    <p className="score-name">YouCam {label.toLowerCase()} condition score</p>
    <div className="score-scale" role="img" aria-label={`${label} condition score ${roundedScore} out of 100`}>
      <i style={{ width: `${roundedScore}%` }} />
      <b style={{ left: `${roundedScore}%` }} />
    </div>
    <div className="score-scale-labels"><small>Lower measured condition</small><small>Higher measured condition</small></div>
    <p>This number is saved for your next scan. It does not show progress on its own.</p>
  </div>;
}

function ExampleScoreStory() {
  const hydrationScores = demoPoints.map(({ day, moisture }) => ({ day, score: moisture }));

  return <article className="example-score-story">
    <div className="example-score-head">
      <div><span className="eyebrow">EXAMPLE · PRIMARY FOCUS</span><h2>Hydration condition score</h2></div>
      <div className="example-score-total"><b>61</b><small>/ 100</small></div>
    </div>
    <p>A YouCam 1–100 condition score—not a percentage. Higher scores indicate a healthier measured condition in YouCam&apos;s scoring system.</p>
    <div className="example-score-checkins">
      {hydrationScores.map(({ day, score }, index) => <div key={day}>
        <span>Day {day}</span><b>{score}<small>/100</small></b>
        <div className="example-score-scale" aria-label={`Example Day ${day} hydration score ${score} out of 100`}><i style={{ width: `${score}%` }} /></div>
        <small>{index === 0 ? "Starting reference" : `${score - hydrationScores[0].score > 0 ? "+" : ""}${score - hydrationScores[0].score} from Day 0`}</small>
      </div>)}
    </div>
    <div className="score-scale-labels"><small>Lower measured condition</small><small>Higher measured condition</small></div>
    <p className="example-score-note"><b>What this means:</b> the repeated upward movement supports “Possible improvement.” It does not prove collagen caused the change.</p>
  </article>;
}

function ComparisonResult({ baseline, comparison, onHome }: { baseline: BaselineData; comparison: ComparisonData; onHome: () => void }) {
  const primary = baseline.primaryGoal;
  const baselineScore = Math.round(baseline.scores[primary]);
  const followupScore = Math.round(comparison.followupScores[primary]);
  const delta = followupScore - baselineScore;
  const direction = Math.abs(delta) <= 1 ? "No clear movement yet" : delta > 0 ? "Upward movement observed" : "Downward movement observed";
  const supporting = metricKeys.filter((key) => key !== primary);
  const signed = (value: number) => `${value > 0 ? "+" : ""}${value}`;
  const followupTrackingDay = trackingDay(baseline.createdAt, comparison.createdAt);
  const baselineContext = timingLanguage(baseline.startTiming, baseline.productStartDate, baseline.createdAt);
  const followupProductDay = productDay(baseline.productStartDate, comparison.createdAt);

  return <section className="workspace comparison-workspace">
    <div className="comparison-notice live">
      <b>LIVE YOUCAM COMPARISON</b>
      <span>Both scores come from real YouCam scans. The difference below is calculated from your saved starting reference.</span>
    </div>
    <button className="back" onClick={onHome}>← Back to home</button>
    <div className="comparison-heading"><span className="eyebrow">YOUR FIRST COMPARISON</span><h1>{metricLabels[primary]}: {baselineScore} → {followupScore}</h1><p>{baseline.ritual} · Tracking Day 0 → Tracking Day {followupTrackingDay}</p><small>{baselineContext.context}</small></div>
    <JourneySteps active={2} comparisonDay={followupTrackingDay} />
    <article className="comparison-primary">
      <div className="comparison-reading"><span>WHAT CHANGED</span><h2>{direction}</h2><p><b>Change: {signed(delta)} points</b> on YouCam&apos;s 1–100 condition scale—not a percentage.</p></div>
      <div className="comparison-values">
        <div><span>Starting reference · Tracking Day 0</span><b>{baselineScore}<small>/100</small></b><small>{formatDate(baseline.createdAt)}</small></div>
        <em>→</em>
        <div><span>Live follow-up · Tracking Day {followupTrackingDay}</span><b>{followupScore}<small>/100</small></b><small>{followupProductDay ? `Product Day ${followupProductDay}` : formatDate(comparison.createdAt)}</small></div>
      </div>
      <div className="comparison-scale" aria-label={`${metricLabels[primary]} moved from ${baselineScore} to ${followupScore} out of 100`}>
        <i className="baseline-marker" style={{ left: `${baselineScore}%` }}><small>{baselineScore}</small></i>
        <i className="followup-marker" style={{ left: `${followupScore}%` }}><small>{followupScore}</small></i>
      </div>
      <div className="score-scale-labels"><small>Lower measured condition</small><small>Higher measured condition</small></div>
    </article>
    <article className="comparison-meaning"><div><span className="eyebrow">WHAT THIS MEANS</span><h2>One comparison is not a trend.</h2></div><div><p>Repeat under similar conditions to see whether the same direction continues.</p>{baseline.routineChanged && <p className="caution-copy"><b>Interpret with extra caution.</b> Changes in skincare, sleep, diet, or another routine may also explain the movement.</p>}<p>{followupTrackingDay === 0 ? "Accelerated technical demo—not evidence of product effectiveness." : "The time between scans does not prove that the product caused the movement."}</p><p>Observed movement does not prove that {baseline.ritual} caused the change.</p></div></article>
    <details className="comparison-supporting"><summary>View supporting indicators</summary><div>{supporting.map((key) => {
      const before = Math.round(baseline.scores[key]);
      const after = Math.round(comparison.followupScores[key]);
      return <article key={key}><span>{metricLabels[key]}</span><b>{before} → {after}</b><small>{signed(after - before)} points · out of 100</small></article>;
    })}</div></details>
    <div className="comparison-actions"><button className="button primary" onClick={onHome}>Finish demo</button></div>
  </section>;
}

export default function Home() {
  const [view, setView] = useState<"home" | "demo" | "start" | "scan" | "compare">("home");
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3>(1);
  const [ritual, setRitual] = useState("Daily Collagen");
  const [category, setCategory] = useState("Collagen");
  const [frequency, setFrequency] = useState("Daily");
  const [primaryGoal, setPrimaryGoal] = useState<MetricKey>("moisture");
  const [startTiming, setStartTiming] = useState<StartTiming>("not-started");
  const [productStartDate, setProductStartDate] = useState("");
  const [routineChanged, setRoutineChanged] = useState(false);
  const [consented, setConsented] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scores, setScores] = useState<ScanScores | null>(null);
  const [scanStatus, setScanStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [scanMode, setScanMode] = useState<"baseline" | "followup">("baseline");
  const [savedBaseline, setSavedBaseline] = useState<BaselineData | null>(null);
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "session-only" | null>(null);
  const supportingGoals = useMemo(() => metricKeys.filter((key) => key !== primaryGoal), [primaryGoal]);
  const latestDeltas = useMemo(() => ({
    firmness: demoPoints.at(-1)!.firmness - demoPoints[0].firmness,
    moisture: demoPoints.at(-1)!.moisture - demoPoints[0].moisture,
    wrinkle: demoPoints.at(-1)!.wrinkle - demoPoints[0].wrinkle,
  }), []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(baselineStorageKey);
      if (!raw) return;
      const stored = JSON.parse(raw) as BaselineData;
      if (!stored?.scores || !metricKeys.includes(stored.primaryGoal) || !metricKeys.every((key) => Number.isFinite(stored.scores[key])) || !stored.createdAt || !stored.ritual) return;
      setSavedBaseline({ ...stored, productStartDate: stored.productStartDate || null });
    } catch {}
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [view, onboardingStep]);

  const resetScan = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(null); setScores(null); setConsented(false); setScanStatus("idle"); setMessage("");
  };
  const openStart = () => { resetScan(); setScanMode("baseline"); setStartTiming("not-started"); setProductStartDate(""); setRoutineChanged(false); setOnboardingStep(1); setView("start"); };
  const startLiveFollowup = () => {
    if (!savedBaseline) return;
    resetScan();
    setRitual(savedBaseline.ritual); setCategory(savedBaseline.category); setFrequency(savedBaseline.frequency); setPrimaryGoal(savedBaseline.primaryGoal); setStartTiming(savedBaseline.startTiming); setProductStartDate(savedBaseline.productStartDate || ""); setRoutineChanged(savedBaseline.routineChanged);
    setScanMode("followup"); setView("scan");
  };
  const choosePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    setScores(null); setMessage("");
    if (!picked) return;
    if (!picked.type.startsWith("image/")) {
      setFile(null); setPreview(null); setScanStatus("error");
      setMessage("Choose a photo from your camera or photo library.");
      event.target.value = "";
      return;
    }

    const objectUrl = URL.createObjectURL(picked);
    try {
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
      const shortSide = Math.min(image.naturalWidth, image.naturalHeight);
      const longSide = Math.max(image.naturalWidth, image.naturalHeight);
      if (shortSide < 480) throw new Error("This photo is too small. Choose one at least 480 px on its shorter side.");

      let prepared = picked;
      if (longSide > maxUploadSide || picked.size > maxUploadBytes || !["image/jpeg", "image/png"].includes(picked.type)) {
        let scale = Math.min(maxUploadSide / longSide, 1);
        let quality = .84;
        const canvas = document.createElement("canvas");
        let blob: Blob | null = null;
        for (let attempt = 0; attempt < 6; attempt += 1) {
          canvas.width = Math.round(image.naturalWidth * scale);
          canvas.height = Math.round(image.naturalHeight * scale);
          const context = canvas.getContext("2d");
          if (!context) break;
          context.fillStyle = "#fff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
          if (blob && blob.size <= maxUploadBytes) break;
          scale *= .82;
          quality = Math.max(.64, quality - .05);
        }
        if (!blob || blob.size > maxUploadBytes) throw new Error("This photo is too large to prepare automatically. Choose a smaller photo and try again.");
        prepared = new File([blob], "skin-check.jpg", { type: "image/jpeg", lastModified: picked.lastModified });
      }

      if (preview) URL.revokeObjectURL(preview);
      setFile(prepared); setPreview(URL.createObjectURL(prepared)); setScanStatus("idle");
    } catch (error) {
      setFile(null); setPreview(null); setScanStatus("error");
      setMessage(error instanceof Error ? error.message : "We couldn't read this photo. Try another JPG or PNG.");
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };
  const removePhoto = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(null); setScores(null); setScanStatus("idle"); setMessage("");
  };
  const analyze = async () => {
    if (!file || !consented) return;
    setScanStatus("loading"); setMessage("");
    const form = new FormData();
    const safeName = file.type === "image/png" ? "skin-check.png" : "skin-check.jpg";
    form.append("image", file, safeName);
    try {
      const response = await fetch("/api/analyze", { method: "POST", body: form });
      const isJson = response.headers.get("content-type")?.includes("application/json");
      const payload = isJson ? await response.json() as { scores?: ScanScores; error?: string } : null;
      if (response.status === 413) throw new Error("This photo is too large to upload. Choose it again so RitualProof can resize it, or choose a smaller photo.");
      if (!response.ok || !payload?.scores) throw new Error(payload?.error || "Analysis could not be completed.");
      if (scanMode === "followup" && savedBaseline) {
        setComparison({ followupScores: payload.scores, createdAt: new Date().toISOString() });
        setScanStatus("done"); setView("compare");
      } else {
        const baseline: BaselineData = { scores: payload.scores, createdAt: new Date().toISOString(), ritual, category, frequency, primaryGoal, startTiming, productStartDate: startTiming === "not-started" ? null : productStartDate, routineChanged };
        setSavedBaseline(baseline); setScores(payload.scores); setScanStatus("done");
        try {
          window.localStorage.setItem(baselineStorageKey, JSON.stringify(baseline));
          setSaveStatus("saved");
        } catch {
          setSaveStatus("session-only");
        }
      }
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Analysis could not be completed.";
      const friendlyMessage = /expected pattern/i.test(rawMessage)
        ? "We couldn't send this photo for analysis. Choose it again so RitualProof can prepare it, then retry."
        : rawMessage;
      setScanStatus("error"); setMessage(friendlyMessage);
    }
  };
  const timingCopy = timingLanguage(startTiming, productStartDate || null);
  const currentScanTiming = scanMode === "followup" && savedBaseline
    ? timingLanguage(savedBaseline.startTiming, savedBaseline.productStartDate)
    : timingCopy;
  const currentTrackingDay = scanMode === "followup" && savedBaseline ? trackingDay(savedBaseline.createdAt, new Date().toISOString()) : 0;

  return <main>
    <header className="topbar">
      <button className="wordmark" onClick={() => setView("home")}>RitualProof<span>✦</span></button>
      <div className="top-actions"><span className="privacy-note">Private by design · not medical advice</span><button className="nav-button" onClick={() => setView("demo")}>See an example journey</button></div>
    </header>

    {view === "home" && <>
      <section className="hero"><div className="hero-copy"><p className="kicker">A clearer answer to the “is it working?” question ✦</p><h1>Is your beauty supplement actually making a difference?</h1><p className="hero-question">Taking collagen or another beauty supplement and not sure if it&apos;s worth continuing?</p><p className="hero-text">RitualProof helps you track your routine and compare consistent skin scans over time so you can see how your skin is changing and make a more informed decision about whether to keep going.</p><div className="hero-actions"><button className="button primary" onClick={openStart}>Start tracking</button><button className="button secondary" onClick={() => setView("demo")}>See the example journey</button></div><p className="hero-disclaimer">We track observed skin changes over time. We do not diagnose conditions or claim what caused them.</p><div className="trust-row"><span>Real YouCam analysis</span><span>Consistent skin scans</span><span>You make the final decision</span></div></div><DemoCard onOpen={() => setView("demo")} /></section>
      {savedBaseline && <section className="saved-journey"><div><span className="eyebrow">STARTING REFERENCE SAVED</span><h2>Continue your {savedBaseline.ritual} journey</h2><p>{metricLabels[savedBaseline.primaryGoal]} starting reference: <b>{Math.round(savedBaseline.scores[savedBaseline.primaryGoal])}/100</b> · {formatDate(savedBaseline.createdAt)}</p><p className="saved-context">{timingLanguage(savedBaseline.startTiming, savedBaseline.productStartDate, savedBaseline.createdAt).context} · Tracking Day 0</p><small>Your scores and tracking setup are stored in this browser. Your photo is not stored by RitualProof.</small></div><div className="saved-journey-actions"><button className="button primary" onClick={startLiveFollowup}>Take a follow-up live scan</button><small>Return around Tracking Day 14, or scan now for an accelerated technical demo.</small></div></section>}
      <section className="how"><p className="kicker">Why tracking matters</p><h2>One selfie cannot tell you much.<br />A pattern can.</h2><p className="how-intro">A single scan is only a snapshot. RitualProof helps you build comparable observations over time before you decide what the pattern means for your ritual.</p><div className="steps"><article><b>01</b><h3>Choose one question</h3><p>Name your supplement and select the skin change you care about most.</p></article><article><b>02</b><h3>Create comparable scans</h3><p>Return around every 14 days and take photos under similar conditions.</p></article><article><b>03</b><h3>See the pattern, then you decide</h3><p>Review what changed, what remains uncertain, and whether you want to keep going.</p></article></div></section>
    </>}

    {view === "compare" && savedBaseline && comparison && <ComparisonResult baseline={savedBaseline} comparison={comparison} onHome={() => setView("home")} />}

    {view === "demo" && <section className="workspace">
      <button className="back" onClick={() => setView("home")}>← Back</button>
      <div className="simulation-notice"><b>Example 28-day journey</b><span>Maya is a fictional example using sample scores—not a real user or your personal result.</span></div>
      <div className="workspace-head demo-overview-head"><div><p className="kicker">Maya&apos;s journey overview</p><h1>How one starting point became an early pattern.</h1><p>Follow the whole 28-day experience—from choosing a ritual to reading a cautious result.</p></div><button className="button primary" onClick={openStart}>Start my real journey</button></div>

      <article className="demo-plan-card"><div><span className="eyebrow">Maya&apos;s tracking plan</span><h2>Daily Collagen</h2><p>She chose one product and one question before looking at any results.</p></div><dl><div><dt>Category</dt><dd>Collagen</dd></div><div><dt>Primary focus</dt><dd>Hydration</dd></div><div><dt>Starting status</dt><dd>Not started yet</dd></div><div><dt>Frequency</dt><dd>Daily</dd></div></dl></article>

      <div className="demo-journey" aria-label="Maya's example 28-day journey">
        <article><div className="journey-marker"><b>1</b><span>SETUP</span></div><div><span className="eyebrow">Before Day 0</span><h3>Name the question</h3><p>Maya chose hydration as her primary focus. Firmness and fine-line condition stayed as supporting context.</p><small>Plan created · no conclusion yet</small></div></article>
        <article><div className="journey-marker"><b>2</b><span>DAY 0</span></div><div><span className="eyebrow">Starting point</span><h3>First scan recorded</h3><p>She scanned before starting collagen, using even light, a neutral expression, and no filter.</p><small>Hydration reference recorded · one scan cannot show a trend</small></div></article>
        <article><div className="journey-marker"><b>3</b><span>DAY 14</span></div><div><span className="eyebrow">First comparison</span><h3>No clear change yet</h3><p>Hydration moved by 3 points. That is visible movement, but not enough evidence for a confident pattern.</p><small>Keep conditions consistent · continue observing</small></div></article>
        <article><div className="journey-marker"><b>4</b><span>DAY 28</span></div><div><span className="eyebrow">Early pattern</span><h3>Possible improvement</h3><p>In this example, hydration moved upward again, reaching +7 from the first scan across three check-ins.</p><small>Observed change · product causality not proven</small></div></article>
      </div>

      <div className="result-intro"><span className="eyebrow">Journey result</span><h2>What Maya sees after three check-ins</h2><p>The conclusion comes after the journey—not before it.</p></div>
      <JourneySteps active={3} />
      <ExampleScoreStory />
      <div className="dashboard-grid"><article className="panel trend-panel"><div className="panel-head"><div><span className="eyebrow">Observed pattern</span><h2>Small, consistent movement</h2></div><span className="day-badge">DAY 28</span></div><EvidenceChart /><div className="legend"><span className="moisture">Hydration · primary</span><span className="firmness">Firmness</span><span className="wrinkle">Fine-line condition</span></div></article><article className="panel verdict-panel"><span className="eyebrow">Current read</span><div className="verdict-icon">↗</div><h2>Possible improvement</h2><p>In this example, hydration moved upward across three check-ins.</p><div className="confidence"><span>Evidence confidence</span><b>Moderate</b></div><p className="fineprint">Observed change does not prove that collagen caused it.</p></article></div>
      <div className="metric-row">{metricKeys.map((key) => <article className={`metric-card ${key === "moisture" ? "primary-metric" : ""}`} key={key}><span>{metricLabels[key]}{key === "moisture" && <em>PRIMARY</em>}</span><strong>{demoPoints[0][key]} → {demoPoints.at(-1)![key]}</strong><small>+{latestDeltas[key]} points since first scan · out of 100 · example data</small></article>)}</div>
      <article className="explanation"><div><span className="eyebrow">What this example shows</span><h2>Keep building evidence</h2></div><div className="explain-grid"><p><b>Pattern</b> Hydration moved upward over two consecutive comparisons.</p><p><b>Uncertainty</b> Sleep improved during this period, so the ritual cannot be isolated as the cause.</p><p><b>Next check-in</b> Keep the routine and photo conditions steady. Check in again around Day 42.</p></div></article>
    </section>}

    {view === "start" && <section className="flow-shell"><button className="back" onClick={() => onboardingStep === 1 ? setView("home") : setOnboardingStep((onboardingStep - 1) as 1 | 2)}>← Back</button><div className="flow-card"><span className="step-count">SETUP · STEP {onboardingStep} OF 3</span>
      {onboardingStep === 1 && <><p className="kicker">One ritual at a time</p><h1>What are you tracking?</h1><p className="flow-intro">Collagen powders, gummies, beauty drinks, functional beverages, and other beauty from within routines.</p><label>Ritual or product name<input value={ritual} onChange={(e) => setRitual(e.target.value)} placeholder="e.g. Daily collagen powder" /></label><div className="field-pair"><label>Category<select value={category} onChange={(e) => setCategory(e.target.value)}><option>Collagen</option><option>Beauty supplement</option><option>Functional drink or powder</option><option>Other</option></select></label><label>How often?<select value={frequency} onChange={(e) => setFrequency(e.target.value)}><option>Daily</option><option>Weekdays</option><option>3–4 times a week</option><option>Occasionally</option></select></label></div><button className="button primary full" disabled={!ritual.trim()} onClick={() => setOnboardingStep(2)}>Choose my focus</button></>}
      {onboardingStep === 2 && <><p className="kicker">Choose one focus</p><h1>What change matters most?</h1><p className="flow-intro">We&apos;ll make this your primary indicator and use the other two as additional context.</p><div className="goal-list">{metricKeys.map((goal) => <button type="button" key={goal} className={primaryGoal === goal ? "goal selected" : "goal"} onClick={() => setPrimaryGoal(goal)}><span className="goal-radio">{primaryGoal === goal ? "✓" : ""}</span><span><b>{metricLabels[goal]}</b><small>{goalDescriptions[goal]}</small></span></button>)}</div><button className="button primary full" onClick={() => setOnboardingStep(3)}>Set my starting point</button></>}
      {onboardingStep === 3 && <><p className="kicker">Add the right context</p><h1>When did you start?</h1><p className="flow-intro">This helps us describe your first scan honestly.</p><div className="timing-list"><label className={startTiming === "not-started" ? "choice selected" : "choice"}><input type="radio" name="timing" checked={startTiming === "not-started"} onChange={() => { setStartTiming("not-started"); setProductStartDate(""); }} /><span><b>I haven&apos;t started yet</b><small>This can be your before-you-start scan.</small></span></label><label className={startTiming === "recently" ? "choice selected" : "choice"}><input type="radio" name="timing" checked={startTiming === "recently"} onChange={() => setStartTiming("recently")} /><span><b>I started recently</b><small>This will be your first recorded scan.</small></span></label><label className={startTiming === "a-while" ? "choice selected" : "choice"}><input type="radio" name="timing" checked={startTiming === "a-while"} onChange={() => setStartTiming("a-while")} /><span><b>I&apos;ve used it for a while</b><small>We won&apos;t describe this as a true before-product result.</small></span></label></div>{startTiming !== "not-started" && <label className="start-date-field">Approximately when did you start? <span className="required-badge">Required</span><input type="date" required aria-describedby="start-date-help" value={productStartDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setProductStartDate(e.target.value)} /><small id="start-date-help">{!productStartDate && <b>Choose an approximate date to continue. </b>}An estimate is okay. We use it to separate Product Day from Tracking Day.</small></label>}<label className="check"><input type="checkbox" checked={routineChanged} onChange={(e) => setRoutineChanged(e.target.checked)} /> I&apos;m also changing skincare, sleep, diet, or another routine</label><button className="button primary full" disabled={startTiming !== "not-started" && !productStartDate} onClick={() => setView("scan")}>{startTiming !== "not-started" && !productStartDate ? "Choose a start date to continue" : "Continue to my scan"}</button></>}
    </div></section>}

      {view === "scan" && <section className="flow-shell"><button className="back" onClick={() => scanMode === "followup" ? setView("home") : (setView("start"), setOnboardingStep(3))}>← {scanMode === "followup" ? "Back to journey" : "Back"}</button><div className="scan-layout"><div><span className="step-count">LIVE YOUCAM ANALYSIS · {scanMode === "followup" ? "FOLLOW-UP" : "FIRST CHECK-IN"}</span><p className="kicker">{scanMode === "followup" ? "Same conditions, stronger evidence" : "Create a clear starting reference"}</p><h1>{scanMode === "followup" ? "Take another tracking scan." : timingCopy.scanTitle}</h1><div className="plan-summary"><span>Tracking</span><b>{ritual}</b><small>{category} · {frequency} · Focus: {metricLabels[primaryGoal]}</small><small className="tracking-context">{currentScanTiming.context} · Tracking Day {currentTrackingDay}</small></div><div className="capture-tips"><span>Face forward</span><span>Even light</span><span>Neutral expression</span><span>No filter</span><span>Similar makeup</span><span>Same device next time</span></div><p className="privacy-copy">Your photo will be sent to the third-party YouCam API for skin analysis. RitualProof does not create a personal photo gallery; provider-side processing and retention are governed by YouCam&apos;s service.</p>{routineChanged && <p className="context-note">You noted another routine change. We&apos;ll treat future comparisons with extra caution.</p>}</div><article className="upload-card"><div className="photo-guide"><span className="eyebrow">PHOTO GUIDE</span><h2>Move close and center your face</h2><p className="guide-lead">Your face should fill most of the frame—from forehead to chin. A clear but distant photo may still be rejected.</p><div className="guide-visual"><img src="/photo-guide-correct.jpg" alt="Correct example: one face centered, close to the camera, and looking straight ahead in even light" /><i className="face-guide-ring" aria-hidden="true" /><span>GOOD EXAMPLE</span></div><div className="guide-points"><b><span>✓</span>Face fills frame</b><b><span>✓</span>Even front light</b><b><span>✓</span>Forehead to chin</b></div><div className="avoid-title"><span>AVOID THESE</span><small>These can prevent a reliable scan.</small></div><div className="avoid-grid"><figure><div><img src="/photo-guide-side-angle.jpg" alt="Avoid: face turned to the side" /></div><figcaption><span>×</span>Side angle</figcaption></figure><figure><div><img src="/photo-guide-shadow.jpg" alt="Avoid: strong shadow across the face" /></div><figcaption><span>×</span>Strong shadow</figcaption></figure><figure><div><img src="/photo-guide-cropped.jpg" alt="Avoid: forehead or chin cut off" /></div><figcaption><span>×</span>Forehead or chin cut off</figcaption></figure></div></div><label className={preview ? "dropzone has-photo" : "dropzone"}>{preview ? <img src={preview} alt="Full selected photo that will be sent for analysis" /> : <><span className="camera">◎</span><b>Take a photo or choose from your library</b><small>Large files resize automatically · YouCam checks face suitability during analysis</small></>}<input type="file" accept="image/*" aria-label="Take a photo or choose an image from your library" onChange={choosePhoto} /></label>{file && <><div className="file-row"><span>Upload prepared · {formatFileSize(file.size)}</span><button onClick={removePhoto}>Choose another</button></div><p className="file-help">This preview shows the full image that will be analyzed. YouCam checks face size and suitability after you tap Analyze.</p></>}<label className="consent"><input type="checkbox" checked={consented} onChange={(e) => setConsented(e.target.checked)} /><span>I understand my photo will be sent to YouCam for third-party analysis.</span></label><button className="button primary full" disabled={!file || !consented || scanStatus === "loading" || scanStatus === "done"} onClick={analyze}>{scanStatus === "loading" ? "Analyzing with YouCam…" : scanStatus === "done" ? "✓ Analysis complete" : scanMode === "followup" ? "Analyze my follow-up scan" : "Analyze my first scan"}</button>{scanStatus === "loading" && <div className="loading-steps"><span>Uploading securely</span><span>Checking face and photo</span><span>Measuring skin indicators</span></div>}{scanStatus === "error" && <div className="error-box"><b>We couldn&apos;t complete this scan.</b><span>{message}</span><small>Your setup is still here. Follow the suggestion above, then choose another photo or retry.</small></div>}{scores && <div className="result-box"><span className="eyebrow">✓ ANALYSIS COMPLETE · {timingCopy.context}</span><h2>{timingCopy.resultTitle}</h2><p className="result-intro-copy">YouCam measured three skin indicators and recorded them as Tracking Day 0. No progress is shown until another live scan is completed.</p><ScoreReference label={metricLabels[primaryGoal]} score={scores[primaryGoal]} /><div className="supporting-results"><span>Also tracking · YouCam scores out of 100</span>{supportingGoals.map((key) => <b key={key}><em>{metricLabels[key]}</em><strong>{Math.round(scores[key])}<small>/100</small></strong></b>)}</div><div className="result-meaning"><span>WHAT THIS MEANS TODAY</span><b>One scan cannot show change yet.</b><p>{timingCopy.meaning}</p></div><div className="baseline-saved"><span>{saveStatus === "saved" ? "✓ SAVED ON THIS DEVICE" : "AVAILABLE IN THIS SESSION"}</span><b>Your starting reference is ready for comparison.</b><p>{saveStatus === "saved" ? "Your scores and tracking setup will still be here when you return in this browser. RitualProof does not save your photo." : "This browser blocked device storage, so the reference will disappear when this tab closes."}</p></div><div className="next-checkin"><span>YOUR NEXT STEP</span><b>Return around Tracking Day 14</b><p>This is a consistent tracking interval—not a promise of when your product should work.</p><div className="result-actions"><button className="button primary" onClick={startLiveFollowup}>Take a follow-up live scan</button><button className="button secondary" onClick={() => setView("home")}>Finish for now</button></div><small>For this accelerated demo, you can scan again now. A real tracking journey should repeat under similar conditions after time has passed.</small></div><JourneySteps active={1} /><details className="technical-scores"><summary>How these scores work</summary><p>RitualProof uses YouCam&apos;s unadjusted raw scores. Each is a 1–100 model score, not a percentage or medical diagnosis. Higher scores indicate a healthier measured condition within YouCam&apos;s scoring system. We use them to compare your own check-ins over time—not to grade your appearance.</p></details></div>}</article></div></section>}

    <footer><div className="wordmark static">RitualProof<span>✦</span></div><p>Proof, not promises. Built with YouCam Skin Analysis API.</p><p>Cosmetic tracking only · Not medical advice</p></footer>
  </main>;
}

function DemoCard({ onOpen }: { onOpen: () => void }) {
  return <article className="hero-card"><div className="journey-banner"><div><small>EXAMPLE JOURNEY</small><h2>Daily Collagen</h2><div className="mini-tags"><span>Hydration · primary</span><span>2 supporting</span></div></div><div className="progress-ring"><b>3/3</b><small>scans</small></div></div><div className="card-heading"><div><small>EARLY PATTERN</small><h3>Three consistent check-ins</h3></div><span>Day 28</span></div><EvidenceChart /><div className="mini-verdict"><span className="arrow">↗</span><div><b>Possible improvement</b><p>In this example, hydration moved upward across three check-ins.</p></div></div><button className="card-link" onClick={onOpen}>Explore the example journey →</button><span className="demo-tag corner">EXAMPLE DATA</span></article>;
}
