# Explaino Explore — three learning pathways and private group challenges

**Frontend/game developer handoff:** Read [UI_GAME_INTEGRATION_GUIDE.md](UI_GAME_INTEGRATION_GUIDE.md) and [AGENTS.md](AGENTS.md) before redesigning the UI. The guide documents all endpoints, data schemas, recovery flows, game/quiz state, video fallbacks and integration tests.

The Let's learn roadmap now includes a real-world mission and **EXO Study Arena**. Lessons have three connected pathways:

- **Crack the Logic:** simple foundations and misconceptions.
- **Ace Your Course:** NCERT-oriented explanations, examples, and practice.
- **Beyond the Classroom:** real-life missions and related fields, without career predictions.

## YouTube lesson discovery
Automatic search now defaults to **yt-dlp** through the server-side Python worker at `scripts/yt_niche_search.py`. Unlike a YouTube Data API search, it requires **no API key**. The worker only searches for video metadata (`ytsearch` with `extract_flat`, `skip_download`) and never downloads media. The server creates validated `youtube.com/embed/VIDEO_ID` URLs; do not render arbitrary HTML from a video title. The existing YouTube API is an optional fallback if `YOUTUBE_API_KEY` is configured.

### Local setup (Linux/macOS)

```bash
cd /home/apu/Desktop/voice-agent
uv venv .venv
uv pip install --python .venv/bin/python -r requirements-video.txt
npm run dev
```

Alternatively use a Python virtual environment and `pip install -r requirements-video.txt`. On Linux/Windows deployments, set `YTDLP_PYTHON` to the Python binary containing yt-dlp. The default server path is `.venv/bin/python`, with `python3` as fallback.

### Prefetch for lowest student-facing latency

```bash
npm run videos:prefetch
# The default batch fills six commonly used NCERT topics.
npm run videos:prefetch -- --ids photosynthesis,electricity,maths-10-preview-4
npm run videos:prefetch -- --all  # refresh all curriculum concepts (may take several minutes)
```

The tested cache contains real lesson metadata for photosynthesis, nutrition/digestion, electricity, and quadratic equations. It does not store video/audio files. Re-run the script to update links, then rebuild when deploying. Initial extraction is not necessarily faster than YouTube's official API; the performance benefit comes from **prefetching and caching**.

`VIDEO_SEARCH_PROVIDER=ytdlp` (default) tries yt-dlp first. Set `VIDEO_SEARCH_PROVIDER=youtube-api` to prioritize YouTube's official API when `YOUTUBE_API_KEY` is configured.

The worker is bounded to 12 seconds per request and limits its result set. The app first checks the pre-generated metadata cache in `data/youtube-video-cache.json`, so prefetched topics load immediately. On-demand results use an in-memory cache for 3 hours (3 minutes for empty searches). Initial searches can take several seconds or fail due to YouTube changes, restrictions, or network access. As a fallback, every topic has a direct YouTube search link. Some returned videos may disallow embedding; users can open the corresponding YouTube watch page.

**Deployment:** A pure Next.js serverless deployment may not have Python, the yt-dlp dependency, or the worker file available; install and package them on the target host or use the YouTube Data API fallback. The unofficial yt-dlp extraction is subject to breakage and provider terms. Results are algorithmically found and should be teacher-vetted for school use. Playback isn't proof of learning, and child-directed sites must comply with YouTube's applicable policies.

## Study Arena and progress

A host creates an eight-character room code; up to eight students join under nicknames. Everyone studies the same topic, then participates in a server-scored, three-question quiz; 100 points per correct answer. Hosts move to the next question after all members respond. Curated quiz banks currently cover photosynthesis, electricity, Grade 10 quadratics/trigonometry/probability and Grade 9 matter. The room **does not broadcast live video or voice** and does not synchronize YouTube playback; it synchronizes lesson/topic context and quiz state. There is no unmoderated chat.

Lesson progress is self-reported for each of the three learning pathways. MongoDB persists progress and rooms when connected; without MongoDB, temporary server memory is used. Anonymous session tokens are a prototype, not real student authentication. Public school deployment needs account security, age-appropriate consent, deletion policies, teacher review of video links, durable rate limiting, and additional moderation. Do not treat quiz scores as a scientific mastery assessment.

## Development checks

```bash
cd /home/apu/Desktop/voice-agent
npm run dev
# In another terminal
npm test
npm run lint
npm run build
npm run test:e2e
npm run test:workflow
```

The browser speech suite uses mocked speech devices. yt-dlp needs Python and network access to refresh results, but **prefetched videos need no runtime API key or Python execution**. The no-key iframe and fallback paths are tested.

---
# Explaino V3 — Maths chapter lessons and textbook status

## Grade 10 Mathematics

The current `maths10th.pdf` contains **14 pages of preliminary material and contents**, not a complete textbook. The project now includes **14 original teaching lessons**, one for each Grade 10 Mathematics chapter. Each lesson has an explanation, formulas, prerequisites, a check question, and a worked example. Chapter links open official NCERT chapter PDFs; the incomplete local file is never presented as textbook evidence.

To add a complete Grade 10 Maths PDF later, place it in this directory with a name such as `class10_math_complete.pdf` and run:

```bash
python3 scripts/update_math10.py
npm run build
```

The update command replaces only the Grade 10 Maths index entries, preserving previously indexed Grade 9 Maths and Grade 9/10 Science material. The script selects the largest readable Maths PDF with `10` or `class-x` in its filename. Restart the app after indexing. Keep textbook files and extracted passages private, and respect NCERT's permissions.

## Verification

```bash
npm test
npm run lint
npm run build
npm run test:e2e
# After starting npm run dev:
npm run test:workflow
```

The browser speech tests mock device recognition; manual Chrome/Edge testing remains necessary. Maths worked examples are original instructional content, not a formally calibrated mastery grader.

---

# Explaino EXO V2 — Personalized learning roadmap

The current app now supports a **mentor conversation → Let's learn → horizontal roadmap → lesson studio → spoken practice** workflow. See [ARCHITECTURE_V2.md](./ARCHITECTURE_V2.md) for the rules, AI-review gate, test fixtures, voice patterns, and a Maths extension plan.

**Run locally:** `npm install && npm run dev`, then open `http://localhost:3000`.

**Quality checks:** `npm test` (rule/roadmap cases), `npm run lint`, `npm run build`, `npm run test:e2e` (Playwright browser checks; starts the app if needed), and — with the app running — `npm run test:workflow`. For the browser suite, install Chromium once with `npx playwright install chromium`. To test the optional NVIDIA/OpenRouter ambiguity-review path separately, run `node scripts/test-workflow.mjs --with-ai`; it c