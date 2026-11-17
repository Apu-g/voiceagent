# Instructions for AI frontend and gamification agents

This repository is **Explaino / EXO**, a learning platform with an existing backend. For frontend/UX/game work, **read [UI_GAME_INTEGRATION_GUIDE.md](UI_GAME_INTEGRATION_GUIDE.md) first**. Then inspect the current source and API routes; the code is authoritative if it differs from a document.

## Nonnegotiable integration requirements

1. Retain all current `app/api/*` endpoints unless a backward-compatible migration is implemented and tested.
2. Keep `conceptId` as the canonical key, `lane` as `logic|course|future`, and a stable `sessionId` across requests. Never key game state by translated display text.
3. All quiz questions come from GET `/api/learning-quiz`. All scoring, pass status, per-question corrections and provisional points come from POST `/api/learning-quiz`. Do **not** import server-side answer keys into client components.
4. Never count the student's question or EXO's explanation as evidence that the student understood something. A roadmap requires conversation-topic analysis first, then lessons.
5. Keep the student dashboard, learning graph, learning lanes, lesson progress, visual briefs, YouTube fallback, speech input/output and Study Arena features wired.
6. YouTube embedding should use `www.youtube.com/embed/VIDEO_ID` and always have an external `www.youtube.com/watch?v=VIDEO_ID` fallback; external playback may be blocked by the provider/network.
7. A learner's video review and pathway-reviewed checkboxes are self-reported learning activity, **not mastery**, and have separate achievement requirements.
8. Keep startup/loading, empty, failed, bounded-retry and reconnect states in every new UI flow. Do not discard working content due to a transient auxiliary API failure.
9. `passwords.txt`, `.env.local`, and other secrets never belong in source bundles, prompts, screenshots or UI state.
10. Before handing over UI changes run `npm test`, `npm run lint`, `npm run build`, `npm run test:e2e`, and `npm run test:workflow`. If a dev server is running, also run `npm run test:contracts -- --base http://localhost:3000`.

## Where to start

See **UI_GAME_INTEGRATION_GUIDE.md**, especially the *Canonical student workflow*, *Core API contracts*, *Screens and components*, *State machine*, and *Acceptance criteria* sections. Implement gamification as a presentation layer and server-authoritative achievement handling, not a duplicated backend.
