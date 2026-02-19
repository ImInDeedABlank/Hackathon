# LinguaSim

LinguaSim is a multilingual language-practice web app built with Next.js. It combines adaptive placement, scenario role-play, speaking drills, and AI-generated feedback into one learner flow.

## What This Project Is

LinguaSim is designed for guided language practice in **English**, **Arabic**, and **Spanish**. A learner:

1. Picks UI and target language.
2. Completes an adaptive placement assessment.
3. Gets a level + recommendations.
4. Practices with scenario-based chat (text or speech).
5. Reviews a session summary and next-step focus areas.
6. Unlocks learning-video recommendations based on profile.

The app is resilient by design: when Gemini is unavailable or returns invalid output, server routes provide validated fallbacks so flows still work.

## Core Features

- Adaptive placement engine (interview + multi-cycle question rounds)
- Scenario-based role-play chat with per-turn corrective feedback
- Speak mode with:
  - Conversation mode (speech recognition + optional TTS playback)
  - Repeat mode (generated sentence + clarity evaluation)
- End-of-session summary with strengths, weaknesses, and next steps
- Placement-driven learning video recommendations
- Bilingual UI (`en`, `ar`) with target-language practice in English/Arabic/Spanish
- Defensive API normalization and fallback responses across routes

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS v4
- Gemini API integration for placement/chat/repeat/summary/recommendations
- YouTube-backed video retrieval (optional API key)

## App Flow (Routes)

- `/language` - select UI + target language
- `/main` - landing/overview
- `/placement` - adaptive placement start + cycles
- `/results` - placement result and recommendations
- `/mode-select` - choose Text or Speak mode
- `/scenarios` and `/speak-scenarios` - choose practice scenario
- `/chat` - active practice session
- `/summary` - session recap + coaching output
- `/learning-videos` - personalized video recommendations (unlocked post-placement)

## API Endpoints

- `POST /api/placement` - start/step adaptive placement flow
- `POST /api/chat` - scenario chat turn + feedback + score
- `POST /api/repeat` - repeat sentence generation and clarity evaluation
- `POST /api/summary` - session-level summary generation
- `POST /api/learning-videos` - personalized topics + videos + study plan hints
- `POST /api/tts` - currently disabled server TTS (client uses browser speech synthesis)

## Local Setup

Prerequisite: Node.js 20+

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` in the project root:

```bash
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.0-flash
GEMINI_MAX_RETRIES=3
GEMINI_MAX_CONCURRENCY=2
YOUTUBE_API_KEY=optional_key_here
```

3. Run the app:

```bash
npm run dev
```

4. Open `http://localhost:3000`

## Environment Variables

- `GEMINI_API_KEY` (required): enables AI features
- `GEMINI_MODEL` (optional): Gemini model name, defaults to `gemini-2.0-flash`
- `GEMINI_MAX_RETRIES` (optional): retry attempts for Gemini calls
- `GEMINI_MAX_CONCURRENCY` (optional): concurrent Gemini call cap
- `YOUTUBE_API_KEY` (optional): improves learning-video retrieval; app has fallback behavior when absent

## Scripts

- `npm run dev` - start development server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - lint checks
- `npm run diagnose:gemini` - test Gemini connectivity from local environment

## Project Notes

- Placement and recommendation APIs use in-memory session/cache structures (ephemeral per server process).
- Speech features depend on browser support for Web Speech APIs.
- `.env.local` is gitignored and should never be committed.

## Troubleshooting

- If AI replies look generic, verify `GEMINI_API_KEY` is set and valid.
- If learning videos are limited, add `YOUTUBE_API_KEY`.
- If mic features fail, test in a Chromium-based browser with microphone permission enabled.
