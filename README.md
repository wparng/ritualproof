# RitualProof

**Proof, not promises.**

RitualProof helps people track whether a beauty-from-within ritual coincides with measurable changes in their skin over time. It combines consistent photo check-ins with the YouCam Skin Analysis API to turn a subjective selfie diary into a cautious, numerical comparison journey.

## The problem

Collagen, beauty supplements, and functional drinks often require long-term, consistent use. People may feel that something is working, but memory, lighting, selfie angle, makeup, and expectations make progress difficult to judge.

RitualProof does not claim to prove that a product caused a change. It helps a user observe whether goal-relevant skin indicators changed during the same period.

## MVP experience

1. Name one beauty-from-within ritual.
2. Choose one primary focus: Hydration, Firmness, or Fine-line condition.
3. Record whether the first scan is before starting or after the ritual has already begun.
4. Follow standardized photo guidance and consent to third-party YouCam processing.
5. Run a real YouCam analysis for moisture, firmness, and wrinkle-related scores.
6. Establish a starting point without treating one scan as a verdict.
7. Explore Maya's clearly labeled simulated Day 0 / Day 14 / Day 28 journey to understand future comparisons.

The selected focus becomes the primary indicator. The other two scores provide additional context without requiring the user to interpret a long list of metrics.

## Real API vs. simulated data

- **Live first scan:** a real server-side YouCam Skin Analysis API call.
- **Maya's journey:** seeded, simulated longitudinal data used to demonstrate the future return experience within a hackathon timeframe.
- **Current limitation:** this MVP does not yet persist a visitor's result or perform a real returning-user comparison.

All simulated content is labeled in the interface. A simulated trend is never presented as evidence from a real person.

## How YouCam is essential

```text
User photo
    ↓
RitualProof server-side API route
    ↓
YouCam Skin Analysis API
    ↓
Moisture, firmness, and wrinkle-related numerical outputs
    ↓
Primary indicator + supporting context
    ↓
Starting point and future comparison journey
```

Without standardized numerical skin outputs from YouCam, RitualProof would only be a subjective photo journal.

## Responsible interpretation

RitualProof uses cautious language such as **Possible improvement** and **No clear change**. Results represent observed change during a tracking period; they do not establish product causality, diagnose a condition, or provide medical advice.

Photo conditions can affect results. The experience reminds users to keep lighting, angle, expression, makeup, and device as consistent as possible.

The app does not create a personal photo gallery. A selected image is sent to the third-party YouCam service for analysis. Exact provider-side processing and retention must be described according to the applicable YouCam service terms before making stronger deletion claims.

## Run locally

Requirements: Node.js 22.13 or later.

```bash
npm install
cp .env.example .env.local
# Add a real YOUCAM_API_KEY to .env.local
npm run dev
```

The API key is read only by the server route and must never be placed in browser code, screenshots, a demo video, or source control.

Build and test:

```bash
npm run build
npm test
```

## MVP boundaries

Not included in this hackathon version:

- accounts or login
- Supabase or a persistent follow-up database
- reminders or notifications
- product rankings or supplement recommendations
- medical diagnosis or treatment advice
- a claim that a product caused a measured change

## Roadmap

- Store numerical starting-point and follow-up results, without requiring face-photo retention.
- Start a new tracking plan when the user changes products.
- Add photo-condition confidence signals.
- Calibrate comparison thresholds using same-image repeatability and lighting-variance tests.
- Support real returning check-ins and longer-term trend views.

## Hackathon validation checklist

- Confirm a successful end-to-end YouCam call.
- Analyze the same permitted test image three times and document score variation.
- Compare same-day images under different lighting.
- Record photo-quality error messages, latency, and quota behavior.
- Verify provider-side image handling before finalizing privacy copy.
- Test whether first-time users understand that an observed change does not prove causality.
