"use client";

import { ChangeEvent, useMemo, useState } from "react";

type MetricKey = "firmness" | "moisture" | "wrinkle";
type ScanScores = Record<MetricKey, number>;
type StartTiming = "not-started" | "recently" | "a-while";

const metricLabels: Record<MetricKey, string> = { firmness: "Firmness", moisture: "Hydration", wrinkle: "Fine-line condition" };
const goalDescriptions: Record<MetricKey, string> = {
  moisture: "Track your skin's moisture-related score.",
  firmness: "Follow changes in skin firmness over time.",
  wrinkle: "Watch your wrinkle-related skin condition.",
};
const metricKeys: MetricKey[] = ["moisture", "firmness", "wrinkle"];
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

  return <div className="chart-wrap" aria-label="Simulated skin indicator trend from day 0 to day 28">
    <svg className="chart" viewBox="0 0 100 100" role="img">
      <title>Simulated firmness, hydration, and fine-line condition across three check-ins</title>
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

function JourneySteps({ active = 1 }: { active?: 1 | 2 | 3 }) {
  return <div className="journey-steps" aria-label={`Journey progress, step ${active} of 3`}>
    <span className={active >= 1 ? "complete" : ""}><b>{active > 1 ? "✓" : "1"}</b>Starting point</span><i />
    <span className={active >= 2 ? "complete" : ""}><b>{active > 2 ? "✓" : "2"}</b>First comparison</span><i />
    <span className={active >= 3 ? "complete" : ""}><b>3</b>Early pattern</span>
  </div>;
}

export default function Home() {
  const [view, setView] = useState<"home" | "demo" | "start" | "scan">("home");
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3>(1);
  const [ritual, setRitual] = useState("Daily Collagen");
  const [category, setCategory] = useState("Collagen");
  const [frequency, setFrequency] = useState("Daily");
  const [primaryGoal, setPrimaryGoal] = useState<MetricKey>("moisture");
  const [startTiming, setStartTiming] = useState<StartTiming>("not-started");
  const [routineChanged, setRoutineChanged] = useState(false);
  const [consented, setConsented] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scores, setScores] = useState<ScanScores | null>(null);
  const [scanStatus, setScanStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const supportingGoals = useMemo(() => metricKeys.filter((key) => key !== primaryGoal), [primaryGoal]);
  const latestDeltas = useMemo(() => ({
    firmness: demoPoints.at(-1)!.firmness - demoPoints[0].firmness,
    moisture: demoPoints.at(-1)!.moisture - demoPoints[0].moisture,
    wrinkle: demoPoints.at(-1)!.wrinkle - demoPoints[0].wrinkle,
  }), []);

  const openStart = () => { setOnboardingStep(1); setView("start"); };
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
      if (longSide > 4096 || picked.size > 10 * 1024 * 1024 || !["image/jpeg", "image/png"].includes(picked.type)) {
        const scale = Math.min(4096 / longSide, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.naturalWidth * scale);
        canvas.height = Math.round(image.naturalHeight * scale);
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        const outputType = picked.type === "image/png" ? "image/png" : "image/jpeg";
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, .9));
        if (!blob) throw new Error("We couldn't prepare this photo. Try choosing another JPG or PNG.");
        prepared = new File([blob], outputType === "image/png" ? "skin-check.png" : "skin-check.jpg", { type: outputType, lastModified: picked.lastModified });
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
      const response = await fetch(new URL("/api/analyze", window.location.href).toString(), { method: "POST", body: form });
      const payload = await response.json() as { scores?: ScanScores; error?: string };
      if (!response.ok || !payload.scores) throw new Error(payload.error || "Analysis could not be completed.");
      setScores(payload.scores); setScanStatus("done");
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Analysis could not be completed.";
      const friendlyMessage = /expected pattern/i.test(rawMessage)
        ? "We couldn't prepare or send this phone photo. Choose it from your library, or retake it in even light, and try again."
        : rawMessage;
      setScanStatus("error"); setMessage(friendlyMessage);
    }
  };
  const timingCopy = startTiming === "not-started"
    ? { label: "Before-you-start scan", title: "Your starting skin snapshot is ready" }
    : { label: "First recorded scan", title: "Your tracking starting point is ready" };

  return <main>
    <header className="topbar">
      <button className="wordmark" onClick={() => setView("home")}>RitualProof<span>✦</span></button>
      <div className="top-actions"><span className="privacy-note">Private by design · not medical advice</span><button className="nav-button" onClick={() => setView("demo")}>View simulated demo</button></div>
    </header>

    {view === "home" && <>
      <section className="hero"><div className="hero-copy"><p className="kicker">Proof, not promises ✦</p><h1>See what changes—not what&apos;s promised.</h1><p className="hero-text">Track whether your beauty-from-within ritual coincides with measurable changes in your skin over time.</p><div className="hero-actions"><button className="button primary" onClick={openStart}>Take my first scan</button><button className="button secondary" onClick={() => setView("demo")}>Explore Maya&apos;s simulated journey</button></div><div className="trust-row"><span>Real YouCam analysis</span><span>Consistent check-ins</span><span>Cautious conclusions</span></div></div><DemoCard onOpen={() => setView("demo")} /></section>
      <section className="how"><p className="kicker">Your personal evidence loop</p><h2>One scan is a snapshot.<br />Consistency reveals the pattern.</h2><div className="steps"><article><b>01</b><h3>Choose one focus</h3><p>Track one beauty ritual and the skin change that matters most to you.</p></article><article><b>02</b><h3>Scan consistently</h3><p>Repeat photos with similar light, angle, expression, makeup, and device.</p></article><article><b>03</b><h3>Read the change</h3><p>See possible movement, uncertainty, and other explanations—not a causal claim.</p></article></div></section>
    </>}

    {view === "demo" && <section className="workspace">
      <div className="simulation-notice"><b>Simulated longitudinal demo</b><span>Every profile, scan, and score below is seeded demo data—not a real user record.</span></div>
      <div className="workspace-head demo-overview-head"><div><p className="kicker">Maya&apos;s journey overview</p><h1>How one starting point became an early pattern.</h1><p>Follow the whole 28-day experience—from choosing a ritual to reading a cautious result.</p></div><button className="button primary" onClick={openStart}>Start my real journey</button></div>

      <article className="demo-plan-card"><div><span className="eyebrow">Maya&apos;s tracking plan</span><h2>Daily Collagen</h2><p>She chose one product and one question before looking at any results.</p></div><dl><div><dt>Category</dt><dd>Collagen</dd></div><div><dt>Primary focus</dt><dd>Hydration</dd></div><div><dt>Starting status</dt><dd>Not started yet</dd></div><div><dt>Frequency</dt><dd>Daily</dd></div></dl></article>

      <div className="demo-journey" aria-label="Maya's simulated 28-day journey">
        <article><div className="journey-marker"><b>1</b><span>SETUP</span></div><div><span className="eyebrow">Before Day 0</span><h3>Name the question</h3><p>Maya chose hydration as her primary focus. Firmness and fine-line condition stayed as supporting context.</p><small>Plan created · no conclusion yet</small></div></article>
        <article><div className="journey-marker"><b>2</b><span>DAY 0</span></div><div><span className="eyebrow">Starting point</span><h3>First scan recorded</h3><p>She scanned before starting collagen, using even light, a neutral expression, and no filter.</p><small>Hydration reference recorded · one scan cannot show a trend</small></div></article>
        <article><div className="journey-marker"><b>3</b><span>DAY 14</span></div><div><span className="eyebrow">First comparison</span><h3>No clear change yet</h3><p>Hydration moved by 3 points. That is visible movement, but not enough evidence for a confident pattern.</p><small>Keep conditions consistent · continue observing</small></div></article>
        <article><div className="journey-marker"><b>4</b><span>DAY 28</span></div><div><span className="eyebrow">Early pattern</span><h3>Possible improvement</h3><p>Hydration moved upward again, reaching a simulated +7 from the first scan across three check-ins.</p><small>Observed change · product causality not proven</small></div></article>
      </div>

      <div className="result-intro"><span className="eyebrow">Journey result</span><h2>What Maya sees after three check-ins</h2><p>The conclusion comes after the journey—not before it.</p></div>
      <JourneySteps active={3} />
      <div className="dashboard-grid"><article className="panel trend-panel"><div className="panel-head"><div><span className="eyebrow">Observed pattern</span><h2>Small, consistent movement</h2></div><span className="day-badge">DAY 28</span></div><EvidenceChart /><div className="legend"><span className="moisture">Hydration · primary</span><span className="firmness">Firmness</span><span className="wrinkle">Fine-line condition</span></div></article><article className="panel verdict-panel"><span className="eyebrow">Current read</span><div className="verdict-icon">↗</div><h2>Possible improvement</h2><p>Hydration moved upward across three simulated check-ins.</p><div className="confidence"><span>Evidence confidence</span><b>Moderate</b></div><p className="fineprint">Observed change does not prove that collagen caused it.</p></article></div>
      <div className="metric-row">{metricKeys.map((key) => <article className={`metric-card ${key === "moisture" ? "primary-metric" : ""}`} key={key}><span>{metricLabels[key]}{key === "moisture" && <em>PRIMARY</em>}</span><strong>+{latestDeltas[key]}</strong><small>since first scan · simulated</small></article>)}</div>
      <article className="explanation"><div><span className="eyebrow">What we observed</span><h2>Keep building evidence</h2></div><div className="explain-grid"><p><b>Pattern</b> Hydration moved upward over two consecutive simulated comparisons.</p><p><b>Uncertainty</b> Sleep improved during this period, so the ritual cannot be isolated as the cause.</p><p><b>Next check-in</b> Keep the routine and photo conditions steady. Check in again around Day 42.</p></div></article>
    </section>}

    {view === "start" && <section className="flow-shell"><button className="back" onClick={() => onboardingStep === 1 ? setView("home") : setOnboardingStep((onboardingStep - 1) as 1 | 2)}>← Back</button><div className="flow-card"><span className="step-count">SETUP · STEP {onboardingStep} OF 3</span>
      {onboardingStep === 1 && <><p className="kicker">One ritual at a time</p><h1>What are you tracking?</h1><label>Ritual or product name<input value={ritual} onChange={(e) => setRitual(e.target.value)} placeholder="e.g. Daily collagen powder" /></label><div className="field-pair"><label>Category<select value={category} onChange={(e) => setCategory(e.target.value)}><option>Collagen</option><option>Beauty supplement</option><option>Functional drink or powder</option><option>Other</option></select></label><label>How often?<select value={frequency} onChange={(e) => setFrequency(e.target.value)}><option>Daily</option><option>Weekdays</option><option>3–4 times a week</option><option>Occasionally</option></select></label></div><button className="button primary full" disabled={!ritual.trim()} onClick={() => setOnboardingStep(2)}>Choose my focus</button></>}
      {onboardingStep === 2 && <><p className="kicker">Choose one focus</p><h1>What change matters most?</h1><p className="flow-intro">We&apos;ll make this your primary indicator and use the other two as additional context.</p><div className="goal-list">{metricKeys.map((goal) => <button type="button" key={goal} className={primaryGoal === goal ? "goal selected" : "goal"} onClick={() => setPrimaryGoal(goal)}><span className="goal-radio">{primaryGoal === goal ? "✓" : ""}</span><span><b>{metricLabels[goal]}</b><small>{goalDescriptions[goal]}</small></span></button>)}</div><button className="button primary full" onClick={() => setOnboardingStep(3)}>Set my starting point</button></>}
      {onboardingStep === 3 && <><p className="kicker">Add the right context</p><h1>When did you start?</h1><p className="flow-intro">This helps us describe your first scan honestly.</p><div className="timing-list"><label className={startTiming === "not-started" ? "choice selected" : "choice"}><input type="radio" name="timing" checked={startTiming === "not-started"} onChange={() => setStartTiming("not-started")} /><span><b>I haven&apos;t started yet</b><small>This can be your before-you-start scan.</small></span></label><label className={startTiming === "recently" ? "choice selected" : "choice"}><input type="radio" name="timing" checked={startTiming === "recently"} onChange={() => setStartTiming("recently")} /><span><b>I started recently</b><small>This will be your first recorded scan.</small></span></label><label className={startTiming === "a-while" ? "choice selected" : "choice"}><input type="radio" name="timing" checked={startTiming === "a-while"} onChange={() => setStartTiming("a-while")} /><span><b>I&apos;ve used it for a while</b><small>We won&apos;t describe this as a true before-product result.</small></span></label></div><label className="check"><input type="checkbox" checked={routineChanged} onChange={(e) => setRoutineChanged(e.target.checked)} /> I&apos;m also changing skincare, sleep, diet, or another routine</label><button className="button primary full" onClick={() => setView("scan")}>Continue to my first scan</button></>}
    </div></section>}

    {view === "scan" && <section className="flow-shell"><button className="back" onClick={() => { setView("start"); setOnboardingStep(3); }}>← Back to setup</button><div className="scan-layout"><div><span className="step-count">LIVE YOUCAM ANALYSIS</span><p className="kicker">Same conditions, stronger evidence</p><h1>Take your first scan.</h1><div className="plan-summary"><span>Tracking</span><b>{ritual}</b><small>{category} · {frequency} · Focus: {metricLabels[primaryGoal]}</small></div><div className="capture-tips"><span>Face forward</span><span>Even light</span><span>Neutral expression</span><span>No filter</span><span>Similar makeup</span><span>Same device next time</span></div><p className="privacy-copy">Your photo will be sent to the third-party YouCam API for skin analysis. RitualProof does not create a personal photo gallery; provider-side processing and retention are governed by YouCam&apos;s service.</p>{routineChanged && <p className="context-note">You noted another routine change. We&apos;ll treat future comparisons with extra caution.</p>}</div><article className="upload-card"><div className="photo-guide"><span className="eyebrow">BEFORE YOU CHOOSE</span><h2>Use one clear, front-facing photo</h2><ul><li><b>Center one face</b><span>Keep your full face visible, with hair away from your eyes and cheeks.</span></li><li><b>Use even front light</b><span>Avoid strong shadows, backlight, and colored lighting.</span></li><li><b>Keep a neutral expression</b><span>Look straight ahead. Avoid filters and beauty effects.</span></li><li><b>Choose an original image</b><span>Use a clear photo at least 480 px on the shorter side. Common phone formats are converted when supported.</span></li></ul></div><label className={preview ? "dropzone has-photo" : "dropzone"}>{preview ? <img src={preview} alt="Selected selfie preview" /> : <><span className="camera">◎</span><b>Take a photo or choose from your library</b><small>Phone photos, JPG or PNG · prepared automatically</small></>}<input type="file" accept="image/*" aria-label="Take a photo or choose an image from your library" onChange={choosePhoto} /></label>{file && <div className="file-row"><span>{file.name}</span><button onClick={removePhoto}>Choose another</button></div>}<label className="consent"><input type="checkbox" checked={consented} onChange={(e) => setConsented(e.target.checked)} /><span>I understand my photo will be sent to YouCam for third-party analysis.</span></label><button className="button primary full" disabled={!file || !consented || scanStatus === "loading"} onClick={analyze}>{scanStatus === "loading" ? "Analyzing with YouCam…" : "Analyze my first scan"}</button>{scanStatus === "loading" && <div className="loading-steps"><span>Uploading securely</span><span>Checking skin indicators</span><span>Preparing your starting point</span></div>}{scanStatus === "error" && <div className="error-box"><b>We couldn&apos;t complete this scan.</b><span>{message}</span><small>Your setup is still here. Try another clear photo or retry this one.</small></div>}{scores && <div className="result-box"><span className="eyebrow">{timingCopy.label} · LIVE RESULT</span><h2>{timingCopy.title}</h2><div className="primary-result"><span>{metricLabels[primaryGoal]}</span><b>Starting point recorded</b><small>One scan cannot show a trend yet.</small></div><div className="supporting-results"><span>Additional context</span>{supportingGoals.map((key) => <b key={key}>✓ {metricLabels[key]} recorded</b>)}</div><JourneySteps active={1} /><div className="next-checkin"><b>What happens next?</b><p>Return around Day 14 under similar conditions to create your first comparison. This timing supports consistent tracking; it does not promise when a product should work.</p><button className="button secondary" onClick={() => setView("demo")}>See what a future comparison looks like</button></div><details className="technical-scores"><summary>View technical YouCam scores</summary><div>{[primaryGoal, ...supportingGoals].map((key) => <span key={key}><b>{Math.round(scores[key])} / 100</b>{metricLabels[key]}</span>)}</div><p>Higher indicates a healthier condition in the YouCam scoring system. RitualProof uses these values for comparison, not as a grade of your skin.</p></details></div>}</article></div></section>}

    <footer><div className="wordmark static">RitualProof<span>✦</span></div><p>Proof, not promises. Built with YouCam Skin Analysis API.</p><p>Cosmetic tracking only · Not medical advice</p></footer>
  </main>;
}

function DemoCard({ onOpen }: { onOpen: () => void }) {
  return <article className="hero-card"><div className="journey-banner"><div><small>SIMULATED JOURNEY</small><h2>Daily Collagen</h2><div className="mini-tags"><span>Hydration · primary</span><span>2 supporting</span></div></div><div className="progress-ring"><b>3/3</b><small>scans</small></div></div><div className="card-heading"><div><small>EARLY PATTERN</small><h3>Three consistent check-ins</h3></div><span>Day 28</span></div><EvidenceChart /><div className="mini-verdict"><span className="arrow">↗</span><div><b>Possible improvement</b><p>Hydration moved upward across three simulated scans.</p></div></div><button className="card-link" onClick={onOpen}>Explore the simulated journey →</button><span className="demo-tag corner">SIMULATED DATA</span></article>;
}
