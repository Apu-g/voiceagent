# EXPLAINO / EXO — Frontend, Gamification & Backend Integration Handoff
> **Source of truth:** this file, the existing Next.js route handlers, and TypeScript modules in this repository. Updated 2026-11-17.
> **Target reader:** the UI/UX developer and AI coding agent who will replace the current visual theme WITHOUT breaking existing APIs or learning behavior.

## 0. Executive summary: what is Explaino?

Explaino is an evidence-aware conversational learning app for school science/mathematics, currently Next.js 16 + React 19 + TypeScript. Students talk or type to **EXO**, which interprets the current conversation and selected school topic, asks follow-up questions, distinguishes curiosity from evidence of understanding, produces a topic-specific learning roadmap, opens rich lesson content, provides **three independent learning lanes**, checks short quizzes **on the server**, tracks voluntarily reviewed lessons/videos, and generates a learning dashboard. A separate Study Arena supports small private group games.

**Differentiation from a general chatbot:** a persistent workflow linking a student's *actual statements* → provisional observations → relevant teaching → verified quiz results → saved learning activity → a comprehensible, repeatable student progress view. Do not claim a conversation/question/video view guarantees mastery.

**Keep backend modules and existing endpoints intact.** A gamified UI should be a new presentation layer that consumes these data contracts, not a replacement for the scoring/analysis providers.

## 1. Quick start and project landmarks

```bash
cd /home/apu/Desktop/voice-agent
npm install
npm run dev
# Open http://localhost:3000
npm test
npm run lint
npm run build
npm run test:e2e
npm run test:workflow
# With npm run dev active in a second terminal:
npm run test:contracts -- --base http://localhost:3000
# For isolated write-through testing of quiz results:
npm run test:contracts -- --base http://localhost:3000 --writes
```

Core locations:
- `app/page.tsx`: current integrated client screen, navigation, conversation, voice state, roadmap/lesson transitions. Large existing component; extract carefully into smaller hooks/components, preserving behavior.
- `app/api/*/route.ts`: server-owned endpoint contracts; avoid renaming without migrating all clients/tests.
- `lib/curriculum.ts`: concepts, IDs, grade, chapter, subject, supported objectives. Only use real concept IDs from `GET /api/catalog`.
- `lib/conversation-focus.ts`: chooses **most recently relevant** conversation topic, not an outdated selected topic.
- `lib/learning-engine.ts`: interprets student evidence and builds curriculum-compatible roadmaps. A question is NOT evidence of knowledge.
- `lib/conversation-journey.ts`: turns student statements into provisional timeline events, explanatory text, next actions.
- `lib/learning-quizzes.ts`: deterministic question banks, correct answers and server-side grading. **Do not ship this module's answer keys to the browser**; browser imports only types from it.
- `lib/quiz-progress.ts`, `lib/progress-memory.ts`, `lib/learning-history.ts`, `lib/student-dashboard.ts`: scoring records, review records, evidence snapshots, dashboard aggregation.
- `lib/youtube-cache.ts`, `lib/youtube-search.ts`, `data/youtube-video-cache.json`: validated video metadata. Cache currently covers all 61 curriculum concept IDs; videos are not downloaded.
- `lib/learning-lanes.ts`, `lib/visuals.ts`, `lib/lane-visual-brief.ts`: three lane content, concept schematics, graphic-generation prompts.
- `scripts/export-lane-visuals.mjs`: pre-generate diagrams and JSON learning-scene briefs. Run `npm run visuals:export -- --ids moon-tides,circuits` or `--all`.
- `components/*`: existing reference implementations, replace styling freely but preserve business logic.
- `tests/*.test.mjs` + `tests/e2e.spec.mjs`: regression specification.
- `requirements-video.txt` + `scripts/yt_niche_search.py`: optional yt-dlp search worker, **not necessary for cached topics**.
- `passwords.txt` and `.env.local`: PRIVATE credentials, **never** import into UI, print, upload, include in prompts, or commit.

The app is a prototype with anonymous sessions. Use HTTPS, authentication, authorization, consent and retention controls before school-wide deployment.

## 2. Stable identity and naming conventions

- `conceptId` is the canonical topic key, e.g. `photosynthesis`, `circuits`, `moon-tides`. Use it for every API call, cache, quiz, game, achievement, mission and diagram. Do **not** use display titles as keys.
- `lane` is EXACTLY one of `logic` (Crack the Logic), `course` (Ace Your Course), `future` (Beyond the Classroom). Retain these backend values even if the game renames the labels.
- `sessionId`: the client currently creates a UUID in `sessionStorage` under `exo-session` and reuses it for a student's session. Valid backend format: alphanumeric, underscores, hyphens; 12–80 chars. **Never generate a new UUID for each API request.** It is NOT an authentication credential.
- `learningFocus`: optional objective from the current roadmap's **unverified/misconception** evidence, used to reorder quiz questions/videos. Do not pass unrelated chat text or arbitrary learning objectives.
- `student turns`: student's utterances, NOT EXO replies. Never count EXO's answers as a student's demonstrated learning.
- `questions` in the quiz GET response contain NO answers or explanations. Keep scoring on POST.

## 3. The canonical student workflow (follow this order)

```text
1. Open app → GET /api/catalog (+ optional /api/health) → select Grade/Subject/Concept
2. Type or speak → browser SpeechRecognition by default
                 → optional POST /api/speech/transcribe (Sarvam, limited budget)
3. POST /api/chat/stream with message, history, selected concept, mode, sessionId
   → display streamed EXO answer; optionally speak with browser TTS or Sarvam
4. Student speaks/explains/asks more; append each student turn to conversation state
5. Student clicks "Let's learn"
   → POST /api/roadmap with selected concept + last ≤24 student utterances + sessionId
   → SHOW ANALYSIS BEFORE ROADMAP:
      - topicDetection (detected concept + confidence + reasoning)
      - analysis.evidence: correct / misconception / unverified and quote
      - analysis.studentTurns: number of explanation turns actually assessed
      - journey: turn-by-turn questions, supported claims, topic shifts
   → Only then show roadmap.lessons (correct topic and prerequisites)
   → If no student explanations: label "starter recommendations; not yet assessed"
6. Open lesson by its returned conceptId → GET /api/lesson + /api/visual
   → render text, worked example when present, concept diagram
7. Show three tabs (logic/course/future), their topics, scenarios and visuals
   → GET /api/visual-brief?conceptId=...&lane=... for scene/mind-map data
   → GET /api/learning-quiz?conceptId=...&lane=...&sessionId=...&focus=...
   → student answers 3 questions → POST /api/learning-quiz
   → show server-returned score, per-question feedback and pass status
   → optionally POST /api/lesson-progress to mark lane explored
8. GET /api/videos?conceptId=...&focus=...
   → show cached video candidates, select video ID
   → embed https://www.youtube.com/embed/VIDEO_ID
   → ALWAYS provide https://www.youtube.com/watch?v=VIDEO_ID fallback
   → optional POST /api/lesson-progress with action:"video" (self-report)
9. GET /api/achievements?sessionId=... + GET /api/student-dashboard?sessionId=...
   → show badges, practiced topic totals, per-lane progress, evidence trend,
     what the student said and next step.
10. Student returns to EXO to explain something new → re-analyze, update dashboard.
```

**Critical bug regression:** after discussing the Moon, a newer question about *series/parallel circuits* MUST produce a circuits/Electricity roadmap; historical Moon text must not intrude. The topic detector has explicit recent-topic prioritization. The frontend must pass the real current turns, not stale selections or an EXO-generated summary.

## 4. Core API contracts (same-origin /api)

All calls are same-origin JSON unless specified. Use `fetch` with `cache:"no-store"` for quiz/progress/dashboard. Check `response.ok` and show `error` from non-2xx JSON. Handle loading, retry and empty states.

| Endpoint | Method | Client request | Data the UI must render |
|---|---|---|---|
| `/api/health` | GET | none | `status`, `mongodb`, `providers`, `stt` |
| `/api/catalog` | GET | none | `concepts[]` (`id,title,chapter,grade,subject,summary,essentials,misconception,question`), `books[]`, `chapters[]` |
| `/api/chat/stream` | POST | `{message,conceptId,chapter,mode,history:[{role:"student"|"exo",text}],sessionId,languageCode}` | SSE: `metadata`, `token`, `done`, optional error; see `lib/sse.ts` and existing page parser |
| `/api/chat` | POST | same core fields as streaming | JSON fallback: `answer,provider,concept,sources,decision` |
| `/api/roadmap` | POST | `{conceptId,turns:["student utterance",...],sessionId}` | `analysis`, `lessons[]`, `journey[]`, `topicDetection`, `reviewProvider`, `analysisTimeMs` |
| `/api/lesson` | GET | `?conceptId=...` | `concept`, source status, citations, prerequisites, optional workedExample/resource/warning |
| `/api/visual` | GET | `?conceptId=...` | `title,caption,nodes:[{label,detail}],links[],source` |
| `/api/visual-brief` | GET | `?conceptId=...&lane=logic|course|future` optional approved `objective` | `nodes[],edges[],scenePrompt,scenario,objective,source,title` |
| `/api/learning-quiz` | GET | `?conceptId=...&lane=...&sessionId=...&focus=...` | `questions:[{id,prompt,options:[3 strings]}]`, `best`, `version`, `grading` |
| `/api/learning-quiz` | POST | `{conceptId,lane,sessionId,focus,answers:[0,1,2]}` | `score,total,passed,points,results:[{questionId,correct,correctIndex,explanation,objective}],best,storage,version,note` |
| `/api/videos` | GET | `?conceptId=...&focus=...` | `status,provider,videos:[{id,title,channel,watchUrl,embedUrl,...}],searchUrl,cached` |
| `/api/lesson-progress` | GET | `?sessionId=...` | `items:[{conceptId,lanes:{logic,course,future},videoReviews?,updatedAt}],completed,storage` |
| `/api/lesson-progress` | POST | `{sessionId,conceptId,lane,completed:true|false}` | `ok,storage,note`; marks pathway **explored**, not mastered |
| `/api/lesson-progress` | POST | `{sessionId,conceptId,action:"video",videoId:"11CHAR_ID"}` | `ok,note`; student-reported watch event, not verified playback |
| `/api/achievements` | GET | `?sessionId=...` | `topics:[{conceptId,quizCount,reviewedCount,covered}],covered,points,badges[],quizResults[]` |
| `/api/student-dashboard` | GET | `?sessionId=...` | `topics[],focus,timeline[],totalTopics,activeTopics,coveredTopics,passedQuizzes,reviewedPaths,videosReviewed,storage,disclaimer` |
| `/api/learning-curve` | GET | `?sessionId=...` | `snapshots/timeline`, `topics[]`, `explored[]`, evidence counts and disclaimer |
| `/api/progress` | GET | `?sessionId=...` | Mongo-backed previous chat `turns[]`; absence means empty history, not failure |
| `/api/study-room` | POST | `{action:"create",conceptId,name}` then `{action:"join"|"begin"|"answer"|"next"|"leave"|"focus",code,token,...}` | `room` state; join/create responses also include host/player credentials |
| `/api/study-room` | GET | `?code=8CHAR_CODE` + `x-room-token` request header | `room` state for current authenticated-by-room-token player |
| `/api/speech/transcribe` | POST multipart | `audio` File, `sessionId`, `language` | `transcript,language,sourceLanguage,translated,provider` |
| `/api/speech/speak` | POST | `{sessionId,language,text}` | `audio/mpeg` bytes; browser speech is free default |
| `/api/textbooks` | GET | see server route for query | textbook index/resources and original references |

### Quiz request/response example (copy into a client hook)

```ts
const sessionId = sessionStorage.getItem("exo-session")!; // initialize once on app mount
const conceptId = "circuits";
const lane = "logic"; // "course" | "future"
const focus = ""; // optional validated curriculum objective

const query = new URLSearchParams({ conceptId, lane, sessionId, focus });
const quizResponse = await fetch("/api/learning-quiz?" + query, { cache: "no-store" });
if (!quizResponse.ok) throw new Error((await quizResponse.json()).error);
const quiz = await quizResponse.json();
// quiz.questions: [{id:string,prompt:string,options:string[]}], exactly 3 questions.
// No correctIndex/answer/explanation is exposed until submission.

const answers = [0, 2, 1]; // student's selected 0-based option index per question, in displayed order
const gradeResponse = await fetch("/api/learning-quiz", {
  method: "POST", headers: {"Content-Type":"application/json"},
  body: JSON.stringify({conceptId,lane,sessionId,focus,answers}),
});
if (!gradeResponse.ok) throw new Error((await gradeResponse.json()).error);
const graded = await gradeResponse.json();
// graded.score 0..3; graded.passed true at >=2; graded.points=score*100;
// graded.results[i] contains correct, correctIndex, explanation, objective;
// graded.best keeps the best attempt, graded.best.attempts counts attempts;
// graded.storage is "mongodb" or "temporary-server-memory".
```

**Never**: send answer keys in GET; compute scores in React; trust a client-reported `passed`, `points` or `correctIndex`; generate random answer ordering without saving that ordering on the server. The existing backend's quiz order is deterministic for the submitted `focus`. Use the same `focus` value for GET and POST; if changing it, re-fetch the quiz and clear previous selections.

**Gamification-ready data:** award animations *after* successful POST and use `graded` response. Never award permanent currency solely from `points` until you build authentication, idempotent attempts and a transaction/ledger (current `points` is a best-score summary, not a secure spendable balance). A student receives the `topic-covered-<conceptId>` badge only when ALL 3 quizzes are passed AND ALL 3 paths have been marked explored. A watched video is separate and must not imply mastery.

### Roadmap output fields and understanding

```ts
// POST /api/roadmap
{
  conceptId: "circuits",
  turns: ["Why does current stay the same in series?", "In parallel branches the voltage is the same."],
  sessionId
}
// response.analysis = {
//   conceptId, conceptTitle, confidence, rationale, analysisMethod,
//   studentTurns, needsReview, evidence:[{objective,status,quote?,note,source}],
//   recommendation
// }
// response.lessons = [{id,conceptId,title,chapter,objective,minutes,activity,status,...}]
// response.topicDetection = {conceptId,confidence,reason,relevantTurns,questions}
// response.journey = [{index,text,focus,kind:"question"|"supported"|"misconception"|"off-topic"|"unverified",signal,why,next,evidence?}]
```

Treat `analysis.evidence[].status` as an *observation*; `unverified` is not `wrong`; the graph is NOT an IQ/intelligence/mastery score. Never use EXO's generated answer as the source of student evidence. If `analysis.studentTurns===0`, show **starter roadmap**; do not show “you mastered” or “you failed”.

### Video contract, network and startup behavior

`GET /api/videos` first checks `data/youtube-video-cache.json` (61/61 concept IDs present). Valid results use **11-character YouTube IDs**; ignore any arbitrary external `embedUrl` supplied from an untrusted source. Generate the iframe URL yourself: `https://www.youtube.com/embed/VIDEO_ID?rel=0&playsinline=1&enablejsapi=1&origin=...`. Render the provided `watchUrl` / `https://www.youtube.com/watch?v=VIDEO_ID` as a **visible external fallback**. Some networks block embeds, some creators disable them (YouTube player errors 101/150), and error 153 may relate to missing referrer. Those are external limitations; never loop retries indefinitely. The player now shows a timeout warning and retry/next-video/external-watch choices.

YouTube playlist metadata is **not downloaded video content**, and titles returned from search are not teacher-vetted. Never mark “watched” automatically on iframe load; that does NOT prove viewing or learning. Runtime yt-dlp search only matters if the packaged cache is absent/outdated. On a serverless deployment without Python, rely on packaged cache or YouTube Data API. Never expose `YOUTUBE_API_KEY` in client code.

Startup recovery requirements: show skeleton → use built-in GET fallback + one bounded automatic retry → show a manual Retry action if still failing → always show YouTube search link even when discovery is unavailable. The quiz should load even if MongoDB is down; historical best score may temporarily be blank. If saving fails permanently, show a distinct error, not a false “saved”.

## 5. Screens and components a gamified UI needs to build

| Proposed game component | Read/emit | Keep from existing implementation |
|---|---|---|
| `AppShell` + `SubjectExplorer` | /api/catalog, conceptId | `app/page.tsx` grade/subject/chapter state |
| `ExoChatScene` + `VoiceControls` | /api/chat/stream, browser SpeechRecognition, optional Sarvam | `app/page.tsx`, `components/multilingual-speech.tsx`, `lib/sse.ts` |
| `ConversationEvidenceScene` | /api/roadmap `analysis`, `topicDetection`, `journey` | `components/conversation-journey.tsx` |
| `WorldMapRoadmap` | /api/roadmap `lessons[]` | roadmap UI inside `app/page.tsx` |
| `LessonQuest` + `LaneSwitcher` | /api/lesson + /api/visual | `components/learning-hub.tsx` |
| `LogicChallenge` | lane="logic", quiz GET/POST | `components/lane-quiz.tsx` |
| `CourseChallenge` | lane="course", quiz GET/POST | `components/lane-quiz.tsx` |
| `RealWorldMission` | lane="future", quiz GET/POST | `lib/learning-lanes.ts`, `components/lane-concept-visual.tsx` |
| `VideoLibrary` + `YouTubePlayer` | /api/videos, /api/lesson-progress | `components/youtube-lesson-player.tsx` |
| `LearningMindMap` | /api/visual + /api/visual-brief | `components/lane-concept-visual.tsx`, `components/roadmap-visual.tsx` |
| `ProgressHUD` + `Achievements` | /api/achievements + /api/student-dashboard | `components/student-dashboard.tsx` |
| `LearningCurveChart` + `EvidenceCards` | /api/learning-curve, /api/roadmap | `components/learning-curve-dashboard.tsx`, `components/conversation-journey.tsx` |
| `MultiplayerLobby` + `ArenaQuiz` | /api/study-room | `components/study-room-widget.tsx`, `lib/study-rooms.ts` |
| `GameNavigation` + `RetryStates` | all API status/error states | shared hook/client state, not API rewrites |

**Do not combine the three lane quizzes with the Study Arena room quiz.** Both use server-side scoring but different workflows/contracts. Design separate components, reuse visual elements.

## 6. State machine / transitions

```text
BOOTING → SELECTING_TOPIC → CONVERSING → ANALYZING → ROADMAP
ROADMAP → LESSON_LOADING → LANE_ACTIVE
LANE_ACTIVE → QUIZ_LOADING → QUIZ_READY → QUIZ_SUBMITTING → QUIZ_REVIEW
QUIZ_REVIEW → (RETRY_QUIZ | NEXT_LANE | CONTINUE_CHAT | DASHBOARD)
LANE_ACTIVE → VIDEO_LOADING → VIDEO_READY → (EMBED | WATCH_EXTERNALLY)
LANE_ACTIVE → MARKING_EXPLORED → LANE_ACTIVE
ANY_READY_STATE → DASHBOARD → (RESUME_LESSON | CHAT)
MULTIPLAYER: LOBBY → ROOM_JOINED → QUESTION_RUNNING → SCOREBOARD
API_ERROR → RETRY (bounded) → PREVIOUS_READY_STATE, never a dead end
```

UI state invariants:
- Never show stale topic A quiz questions while conceptId is topic B. Abort obsolete requests on unmount/topic change.
- Never change `sessionId` mid-session.
- Never enable `Submit` before three questions have loaded and all have selected answers.
- Disable `Submit` during one network request; prevent accidental double submissions and points inflation.
- Render `best` from server; local optimistic updates must be reconciled.
- Marking lane explored and passing its quiz are **independent** events; both feed achievements.
- Show precise error messages and Retry actions; empty video discovery must not hide the rest of the lesson.
- Browser-only speech and cached video metadata should still work without Groq/Sarvam/YouTube API keys. Optional cloud APIs are optimization paths, not prerequisites.
- Preserve real textbook grade, chapter and concept associations in every scene.

## 7. Storage & reliability considerations

- MongoDB is configured via `MONGODB_URI` / `MONGODB_DB`; when unavailable, some endpoints fall back to **temporary in-process memory**. That does NOT survive process restarts, serverless cold starts or scaling across multiple replicas. For a real student account/progression game, persistent DB + authenticated user IDs are mandatory.
- The quiz GET is intentionally **independent of MongoDB**; it serves deterministic questions immediately even if storage is unreachable, so startup DB errors must not prevent playing.
- Quiz POST validates answers on the backend and returns `storage` so the frontend can distinguish persistent from temporary progress.
- Quiz attempts and score history are not a transaction-safe real-money/gold economy. Do not use provisional `points` to purchase anything until you implement an idempotent immutable rewards ledger.
- For accessible game interfaces: focus management, keyboard navigation, captions/text alternatives, reduced-motion option, responsive design and high-contrast correctness indicators. Do not identify “correct” using color alone.
- For safeguarding: no passwords in client bundles, no secrets in documentation, student data minimization, deletion/revocation, content filtering and teacher-vetted links needed before external deployment.

## 8. Smoke tests / acceptance criteria for the UI agent

```bash
npm test             # deterministic curriculum + all three quizzes for all 61 topics
npm run lint
npm run build
npm run test:e2e
npm run test:workflow
# With npm run dev active in a second terminal:
npm run test:contracts -- --base http://localhost:3000
# For isolated write-through testing of quiz results:
npm run test:contracts -- --base http://localhost:3000 --writes
```

Check manually:
1. Open a fresh session with MongoDB disconnected. `GET /api/learning-quiz?conceptId=circuits&lane=logic` must return 3 playable questions with HTTP 200.
2. Open all three tabs of each grade/subject; the exact conceptId and lane must be reflected in URLs, scene props and answers.
3. Submit right and wrong answers. Returned per-question feedback must correspond to the displayed questions; `best` persists when DB is available.
4. Refresh lesson and dashboard; show the same best result and separate explored flags where storage is connected.
5. Load videos for photosynthesis, circuits and Moon. The returned embed URL must use `www.youtube.com`, not `youtube-nocookie.com`; the external watch link must always be offered. If network blocks iframe, show fallback rather than a broken dead-end screen.
6. Deliberately fail one video/quiz fetch: bounded retry, visible Retry control, no loading spinner indefinitely.
7. Chat about Moon, then ask about series/parallel circuits; the new roadmap must stay within Electricity and must not attribute Moon misconceptions to circuits.
8. Ask only questions (no explanations): show *not yet assessed*, not a fake high grade.
9. Complete 3 quizzes and 3 lane reviews for one topic: badge `topic-covered-<conceptId>` appears through the achievements endpoint. Video-review flag is independent.
10. Mobile, keyboard, voice, AI unavailable, YouTube unavailable and MongoDB unavailable paths should remain navigable.

## 9. Guidance prompt for the UI/UX coding agent

> You are creating a fresh gamified visual frontend for Explaino (EXO) in Next.js. Your task is to replace the presentation and interaction layer, NOT the server's business logic. Read `UI_GAME_INTEGRATION_GUIDE.md`, then inspect `app/api/*/route.ts`, `lib/curriculum.ts`, `lib/learning-quizzes.ts`, `lib/student-dashboard.ts` and the existing components. Design a polished, accessible progression hub, three distinct learning quest types, a roadmapped lesson world, context-based evidence timeline, quiz review, topic video room, achievements HUD, science mind-map scenes and private Study Arena. Keep every current endpoint, conceptId, lane, sessionId and response field compatible. Questions originate from GET /api/learning-quiz; score only by POST /api/learning-quiz; NEVER expose answer keys before submission. Video embedding must allow external-watch fallback. Show conversation evidence before the roadmap, distinguish curiosity from demonstrated claims, do not label watching as mastery. Include clear loading/empty/retry states, robust navigation and all existing features. Add tests for any new component and run unit, build, lint and E2E checks. Never modify or leak `passwords.txt` or `.env.local`.

## 10. Scope that is NOT implemented yet

- Secure login and multi-device accounts; immutable XP ledger, anti-cheat, user inventory and asynchronous classroom tournaments.
- Teacher moderation, continuous speech streaming on all browsers, production-grade event analytics, push notifications.
- Verified YouTube playback on every device/network; this depends on YouTube, the uploader's embed permissions and client DNS/firewalls.
- A validated psychometric mastery model. Current “correct / misconception / unverified” are tentative evidence signals.
- Source-accurate generative imagery for every possible concept (original deterministic SVG diagrams and visual briefs exist; image-model integration is future UI work).

**Handoff acceptance rule:** A new UI is complete only when this existing API-driven end-to-end learning flow continues to pass, including quiz/server scoring, real topic alignment, video fallback, persistence checks and dashboard consistency. Keep this document updated when contracts intentionally change.
