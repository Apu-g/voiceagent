
# Explaino EXO v2 — Mentor → Assessment → Roadmap

The Vercel-ready Next.js app now has three student views: **mentor conversation**, **personal learning roadmap**, and **lesson studio**. It uses browser speech recognition and device TTS for a low-cost spoken interface, and Groq for natural tutor responses.

## Architecture and the parsing pipeline

```text
Microphone (Web Speech API) → final transcript → /api/chat
                                              ├─ quick mentor intent rules (<1 ms CPU)
                                              └─ Groq text model only if a substantive turn
                                             ↳ spoken with browser speech synthesis
                                        Mongo turn logging scheduled after response

"Let's learn" → POST /api/roadmap { conceptId, turns[], sessionId }
             → validate transcript / size / topic
             → ignore question-only turns
             → deterministic subject-specific concept checks
             → explicit evidence quote for each recognized claim
             → detect misconception BEFORE marking a correct claim
             → unverified = not assessed, never automatically incorrect
             → conditional NVIDIA NIM → OpenRouter review of uncertain statements
               (only long answers where ALL objectives were unverified)
             → validate AI output status and require exact quote from student utterance
             → deterministic lesson sequencing (prerequisite → focus → application)
             → return JSON evidence + horizontal roadmap
             → MongoDB optional snapshot (anonymous prototype)
             → topic lesson / follow-up EXO practice
```

**No LLM grades.** A matched statement is only evidence that a student expressed an idea. A later, independently phrased diagnostic question is required to verify learning. Model-generated findings are labeled as reviewed evidence, not guaranteed truth.

The current topic rules cover Photosynthesis, Electricity, Respiration, Chemical Reactions, Refraction, and Heredity. Other catalog topics deliberately remain *unverified* until the rubric is authored; they still receive a lesson plan. All 20 concepts have student-facing lesson material.

### Cost / latency

- Normal mentor greeting, onboarding and simple intent responses are rule-based; no LLM request.
- Most substantive user turns use one Groq LLM call and browser TTS.
- Assessment runs **only on a deliberate "Let's learn" action**. The deterministic classifier runs without any network inference.
- NVIDIA NIM or OpenRouter are used for difficult/ambiguous statements, not every turn. Each has a ~4.5s timeout. AI output is validated; on failure, rule-based analysis is returned.
- MongoDB session writing is a best-effort operation scheduled after the chat response. This is not durable background processing.
- Every lesson is fetched from the original catalog; no extra LLM call is needed to open it.

### UI behavior

1. EXO begins: "Do you have a science question, or would you like to tell me what you already know?"
2. The student asks a question or explains a concept. EXO asks a concise follow-up.
3. The student chooses **Let's learn** and the interface changes into a horizontal lesson roadmap.
4. The evidence panel explicitly separates *mentioned*, *possible misconception*, and *not checked* with quoted student speech.
5. The student clicks any lesson to enter a step-by-step learning view and can return to EXO for a spoken question.

Speech recognition remains browser-vendor-dependent and may use a vendor network service. "Auto-send when I finish speaking" is opt-in. This is turn-based speech, not a full-duplex WebRTC voice agent.

## Testing

```bash
npm test
npm run lint
npm run build
npm run dev
```

Test fixtures in `tests/learning-engine.test.mjs` include multiple correct/incorrect Science answers, no answer, questions only, misconception precedence, invalid AI quotes, and valid/unique roadmap sequences. The flow can also be tested over HTTP via `POST /api/roadmap` and `GET /api/lesson?conceptId=photosynthesis`.

**Known limits:** No full NCERT PDF scraping or ingestion (textbook licensing needs approval), no authentic calibrated mastery measure, no robust authentication or deletion controls, no persistent distributed rate limits, and no reliable production background queue. The assessment heuristics must undergo teacher review before being used to make educational claims.

## Why we did not install a heavy realtime voice framework yet

Open source patterns researched:

- [Pipecat](https://github.com/pipecat-ai/pipecat): modular audio→STT→LLM→TTS pipelines, turn-completion strategies and separate fast-voice / slower-tool paths.
- [LiveKit Agents](https://github.com/livekit/agents): interruption, VAD and semantic turn detection, false-interruption recovery, and a real-time sessions framework.
- [Vocode](https://github.com/vocodedev/vocode-core): clear abstraction for speech recognition, dialogue agent, speech synthesis, input and output devices.

For Vercel and a $0 budget, the current browser recognition + serverless text chat architecture is less complex and easier to deploy. Later, if user testing confirms the need for proper low-latency barge-in, implement a separate long-lived WebRTC agent worker (Pipecat or LiveKit) hosted outside Vercel functions while keeping this Next.js app for UI, curriculum, and roadmap API. Avoid maintaining persistent WebSocket audio sessions inside normal Vercel serverless routes.

## Mathematics, after Science

Reuse the same `Analysis`, `Roadmap`, and `Lesson` contracts. Replace Science's verbal-claim rubric with **step-level mathematical reasoning**:

1. Student chooses a Maths concept and states the goal.
2. Scribble captures equations via structured text/LaTeX or handwriting recognition.
3. Validate algebraic equivalence and mathematical constraints with SymPy or a similarly deterministic math engine; do not rely on LLM judgement alone.
4. Explain the first invalid transformation, offer a hint, then request a retry.
5. Store evidence per skill (fractions, factorization, substitution, etc.) and generate the same lesson roadmap.

Until that math verifier exists, do not score mathematical steps as mastered based solely on how fluently the student explains them.
