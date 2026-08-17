# RitualProof

**Proof, not promises.**

RitualProof helps people track whether a beauty-from-within ritual coincides with measurable changes in their skin over time. It combines consistent photo check-ins with the YouCam Skin Analysis API to turn a subjective selfie diary into a cautious, numerical comparison journey.

## The problem

Collagen, beauty supplements, and functional drinks often require long-term, consistent use. People may feel that something is working, but memory, lighting, selfie angle, makeup, and expectations make progress difficult to judge.

RitualProof does not claim to prove that a product caused a change. It helps a user observe whether goal-relevant skin indicators changed during the same period.

## MVP experience

1. Name one beauty-from-within ritual.
2. Choose one primary focus: Hydration, Firmness, or Fine-line condition.
3. Record whether the first scan is before starting or after the ritual has already begun, including an approximate start date when relevant.
4. Follow standardized photo guidance and consent to third-party YouCam processing.
5. Run a real YouCam analysis for moisture, firmness, and wrinkle-related scores.
6. Save the scores and tracking context as a device-local starting reference, without saving the photo.
7. Return for a second live YouCam scan and calculate the change from the saved reference.
8. Read a cautious comparison that distinguishes observed movement from product causality.
9. Explore Maya's clearly labeled simulated Day 0 / Day 14 / Day 28 journey to understand how several check-ins could form an early pattern.

The selected focus becomes the primary indicator. The other two scores provide additional context without requiring the user to interpret a long list of metrics.

## Real API vs. simulated data

- **Personal first scan:** a real server-side YouCam Skin Analysis API call. The returned scores and tracking setup are stored in that browser as the user's starting reference.
- **Personal follow-up scan:** a second real YouCam API call. RitualProof retrieves the starting reference and dynamically calculates the score changes.
- **Maya's journey:** seeded, simulated Day 0 / Day 14 / Day 28 data used to demonstrate a longer-term journey without pretending that several weeks passed during the hackathon.

The personalized two-scan comparison is not simulated. All sample content in Maya's journey is explicitly labeled and is never presented as evidence from a real person.

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
Device-local starting reference
    ↓
Second live YouCam scan
    ↓
Dynamic baseline-to-follow-up comparison
```

Without standardized numerical skin outputs from YouCam, RitualProof would only be a subjective photo journal.

## Responsible interpretation

RitualProof uses cautious language such as **Possible improvement** and **No clear change**. Results represent observed change during a tracking period; they do not establish product causality, diagnose a condition, or provide medical advice.

Photo conditions can affect results. The experience reminds users to keep lighting, angle, expression, makeup, and device as consistent as possible.

RitualProof also keeps product timing and tracking timing separate. A user who has already taken a supplement for a month does not receive a misleading "before product" or "Product Day 0" label. If the user reports other changes to skincare, sleep, diet, or another routine, the comparison preserves that context and asks for extra caution.

The app does not create a personal photo gallery. A selected image is sent to the third-party YouCam service for analysis. RitualProof stores the numerical scores and tracking setup in the user's browser, not the photo. Provider-side processing and retention are governed by the applicable YouCam service terms.

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
- cloud sync, Supabase, or a cross-device database
- reminders or notifications
- product rankings or supplement recommendations
- medical diagnosis or treatment advice
- a claim that a product caused a measured change

Device-local references remain available in the same browser unless the user clears that browser's storage. They are not synchronized to another browser or device.

## Roadmap

- Add optional accounts and cross-device history without requiring face-photo retention.
- Start a new tracking plan when the user changes products.
- Add photo-condition confidence signals.
- Calibrate comparison thresholds using same-image repeatability and lighting-variance tests.
- Support reminders, adherence context, and longer-term trend views across several live check-ins.

## Hackathon validation checklist

- Confirm a successful end-to-end YouCam call.
- Confirm the first live result remains in the same browser after refresh.
- Confirm a second live scan produces a dynamically calculated comparison.
- Analyze the same permitted test image three times and document score variation.
- Compare same-day images under different lighting.
- Record photo-quality error messages, latency, and quota behavior.
- Verify provider-side image handling before finalizing privacy copy.
- Test whether first-time users understand that an observed change does not prove causality.
