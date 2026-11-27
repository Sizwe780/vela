# Vela LMS

A modular learning workspace for UNISA B.Ed study, built with Next.js, TypeScript, Prisma and PostgreSQL/pgvector.

Create an account, select a qualification and enroll in modules, then study their conceptual sessions, attempt examples before revealing solutions, and use a source-grounded AI companion. Notes, active recall and session progress are linked to the signed-in learner. MAT1512 and MAT1503 contain authored lessons; source OCR is tracked separately from lesson publication.

- [Setup and local development](docs/SETUP.md)

- [API contracts and authentication](docs/API.md)

- [Contributing and verification](CONTRIBUTING.md)
- [Site-wide audit and page-by-page changes](.vela/engineering/site-wide-audit.md)

- [Teaching workspace and qualification administration](docs/TEACHING_WORKSPACE.md)

- [Accounts, support and institution administration](docs/ACCOUNT_AND_INSTITUTION.md)

- [Enrollment, access and conversion readiness](docs/ENROLLMENT.md)

- [Competitive gaps: implemented features and launch limits](docs/COMPETITIVE_GAPS.md)

- [Welcome emails and opt-in recall reminders](docs/EMAIL_SETUP.md)

- [Focused study time and weekly goals](docs/ACTIVITY.md)

- [Matrix, Riemann sum and limit sandboxes](docs/VISUAL_SANDBOXES.md)

- [Private practice copies and mistake notebook](docs/PRACTICE_NOTEBOOK.md)

- [Change history](CHANGELOG.md)

- [Contributor architecture, restrictions and module specifications](.vela/README.md)

## Quick start

Run commands from this directory (`outputs`):

```powershell

npm ci

Copy-Item .env.example .env

# Configure database, Neon Auth and AI settings privately.

npm run build

npm start -- --port 3200

```

See [docs/SETUP.md](docs/SETUP.md) before provisioning or changing a database. Cloudflare is the configured default; Ollama supports local AI. The sample tutor is illustrative, and the free heuristic quiz does not require an AI key. Neon AI Gateway remains pending on the Free plan.

## Learning architecture

Qualification → module → unit → conceptual session. [Learning specs](.vela/specs/) define original synthesis, visible teaching, question-first exercises, mathematical validation and publication gates. Personal completion and self-rated recall are distinct from assessed mastery and institutional marks.

Profiles, a dedicated review queue, saved passages, enrolled-content search and persistent session resume are available from the learning navigation. Staff analytics are qualification-scoped. Email verification uses a one-time code. Welcome and opt-in recall email use a durable queue with Resend/Brevo adapters; Resend is connected for the approved development inbox. Wider delivery requires an approved sender. See [email setup and scheduling limits](docs/EMAIL_SETUP.md).

Choose Reader Focus, Balanced Split or Companion Focus as a starting point. Drag the divider or use its arrow keys to adjust the split. Vela remembers your width on this browser. Select Focus for a fullscreen study workspace. On phones, switch between Study material and Learning companion. Notes, sources and active recall are under More tools when the header is compact. Light is the default and your explicit theme choice is saved.

**Practical Lab** brings the scratchpad, private notebook and module-specific visual simulations together. See [Practical Lab guide](docs/MATH_PRACTICE.md).

`AI tutor tools`: see [docs/AI_TUTOR_TOOLS.md](docs/AI_TUTOR_TOOLS.md) for cropped-photo diagnosis, teach-the-tutor practice and opt-in browser voice conversation.

`Visuals`: explore editable matrix transformations, Riemann partitions and two-sided limit zooms in lessons, tutor cards or the standalone gallery. These local models are free to use and keep exploration separate from assessed mastery.

`Progress`: `/progress` separates recent quiz evidence, AI conceptual feedback and the legacy mixed aggregate, and explains personalized next steps. `/review?unit=…` focuses a due unit.

`Social learning`: `/lounge` offers opt-in anonymous module presence and a synchronized quiet Pomodoro. Enable paragraph discussions in a lesson/source to ask and reply under a source-version anchor. Private notes/highlights stay private. Reports are available to scoped staff at `/discussions/moderation`. Participation never awards mastery.

Open a module and select a unit to see its learning sessions, completion, outcomes and quiz. Quizzes show one question at a time and preserve answers when you move between questions. After submission, the result shows feedback and source links for every question.

In the study workspace, open **Tutor tools** beside the message field for guided hints, math entry and the tools enabled for that module. The public preview uses sample tutor responses. Adaptive hints, debate and AI transcription are available on eligible enrolled lessons.

`Academic Master`: the home briefing and Ctrl/Cmd+Shift+K dock connect your own assessed concept practice, short original refreshers and entered study availability. Explore `/learning-map` for the eight-concept starter graph across MAT1503/MAT1512. Concept estimates are provisional and remain separate from course grades. Tutor context and cross-module summaries are separately opt-in; see [.vela adaptive-learning rules](.vela/specs/adaptive-learning-spec.md).

Ollama guided hints/debate use `llama3.2:3b` as an operator-selected initial local candidate. The earlier 1B model failed live quality checks and should not be used for guided modes. The 3B model has passed an initial structured JSON probe, but broader mathematics, independence and subject evaluation remains necessary before calling it certified.
