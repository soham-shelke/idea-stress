# Software Requirements Specification
## IdeaStress: Zero-to-One Builder
**Version:** 1.0  
**Date:** June 18, 2026  
**Hackathon:** USAII 2026 — Challenge Brief 3, Direction B, Undergraduate Track  
**Status:** Draft

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Problem Statement](#2-problem-statement)
3. [Target Users](#3-target-users)
4. [User Personas](#4-user-personas)
5. [User Stories](#5-user-stories)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [User Flows](#8-user-flows)
9. [Feature List](#9-feature-list)
10. [MVP Scope](#10-mvp-scope)
11. [Future Scope](#11-future-scope)

---

## 1. Product Vision

IdeaStress is an AI-powered execution planning tool that transforms a vague idea into a
risk-weighted, evidence-backed 30/60/90-day action plan. It does this by excavating the
hidden assumptions baked into a user's own language, validating them against real-world
data, stress-testing them with adversarial AI reasoning, and generating a structured plan
complete with backup paths — all while keeping the human in control of every critical
decision.

**Vision Statement:**  
To be the honest co-pilot that every aspiring founder, career-switcher, and student
deserves — one that tells the truth about their plan before reality does.


---

## 2. Problem Statement

Students, recent graduates, and early-stage creators regularly pursue plans built on
unexamined assumptions — about timelines, skills, market size, and user behaviour. These
assumptions are rarely surfaced until the plan is already failing. Existing tools (notes
apps, business plan templates, AI chatbots) either generate generic advice or uncritically
validate whatever the user already believes.

**Core problems this product solves:**

- **Hidden assumption blindness:** Users state plans confidently ("I'll ship in 2 weeks,
  get 500 signups organically") without questioning whether those assumptions are
  grounded in reality.
- **Generic feedback:** Most AI tools produce optimistic, non-specific feedback that
  reinforces rather than challenges a user's existing thinking.
- **No human agency in AI pipelines:** Fully automated AI planners remove the user from
  critical decision points, causing over-reliance.
- **No backup planning:** Plans rarely account for the most likely failure modes specific
  to that idea.

---

## 3. Target Users

### Primary Users
- **College students and recent graduates** building their first startup, project, or
  career pivot plan.
- **Aspiring founders** at the pre-seed / idea stage with no prior validation.
- **Hackathon participants** who need a fast, structured sanity check on their idea.

### Secondary Users
- **Bootcamp students** assessing career transition timelines and skill gaps.
- **Solo creators** (indie hackers, freelancers) planning new products or services.
- **Mentors and accelerator staff** who want a structured way to run assumption-review
  sessions with mentees.


---

## 4. User Personas

### Persona 1 — Priya, the First-Time Founder
- **Age:** 22, final-year CS undergraduate
- **Situation:** Has a SaaS idea she wants to build over summer. Estimates 2-week MVP,
  500 organic signups. No prior startup experience.
- **Pain points:** Doesn't know which assumptions are dangerous. Gets generic advice from
  friends who don't want to discourage her.
- **Goal:** Understand what could go wrong *before* quitting her internship.
- **Behaviour:** Will engage deeply with assumption review; needs the adversary to be
  blunt but not discouraging.

### Persona 2 — Marcus, the Career Switcher
- **Age:** 25, working in finance, wants to break into data science
- **Situation:** Plans to "learn ML in a month" and land a job at a startup in 3 months.
- **Pain points:** Timeline assumptions are wildly optimistic. Not sure which skills
  actually matter. No one in his network has made this transition.
- **Goal:** Get a realistic plan with actual milestones rather than a YouTube course
  progression.
- **Behaviour:** Will be skeptical of the confidence scores; needs clear sourcing.

### Persona 3 — Sofia, the Campus Entrepreneur
- **Age:** 20, runs a small student club, wants to launch a food delivery service
- **Situation:** Believes she can undercut existing players by 20% and capture 10% market
  share in year 1.
- **Pain points:** Market size and competition assumptions are unvalidated. No financial
  model.
- **Goal:** Identify the 2-3 things most likely to kill the idea before she pitches to
  her university's entrepreneurship fund.
- **Behaviour:** Will use the track selection to go "find a user first" after seeing
  adversary output.


---

## 5. User Stories

### Idea Input
- As a user, I want to describe my idea in plain natural language so that I don't need
  to fill out a structured form.
- As a user, I want to see example ideas so that I can understand what level of detail
  is expected.

### Assumption Excavation
- As a user, I want the system to surface assumptions I didn't explicitly state so that
  I can confront blind spots I wouldn't have found myself.
- As a user, I want each assumption categorised by type (timeline, market_size, skill,
  cost, user_behavior, competition) so that I can understand what kind of risk it
  represents.
- As a user, I want to see an optimism level per assumption (aggressive / moderate /
  conservative) so that I know how much I'm stretching reality.

### Research Validation
- As a user, I want each assumption validated against real-world data so that I have
  evidence rather than gut feeling.
- As a user, I want to see the source of each evidence claim so that I can judge its
  credibility.
- As a user, I want a confidence score per assumption so that I can prioritise which
  risks to address first.

### Human Gate 1 — Assumption Review
- As a user, I want to review the extracted assumptions before the adversary runs so
  that errors in extraction don't corrupt the rest of the analysis.
- As a user, I want to be able to correct or dismiss assumptions that don't apply to my
  situation so that I remain in control of the inputs to my plan.
- As a user, I want a responsible AI disclaimer on the review screen so that I don't
  over-rely on confidence scores as verdicts.

### Adversarial Analysis
- As a user, I want the system to steelman the strongest case against my plan so that
  I hear the hardest objections before I start.
- As a user, I want the adversary's risks to be specific to my idea (not generic) so
  that the feedback is actually useful.
- As a user, I want to see early warning signals per risk so that I know what to watch
  for during execution.
- As a user, I want to see the single hardest unanswered question so that I know what
  to address first.

### Human Gate 2 — Track Selection
- As a user, I want to choose my execution track after reading the adversary output so
  that the plan reflects my actual risk tolerance.
- As a user, I want the AI to NOT choose my track for me so that I retain full agency
  over my plan.
- As a user, I want three clearly differentiated track options (full speed / find a user
  / rethink the core) so that I can honestly reflect on where I am.

### Plan Generation
- As a user, I want a 30/60/90-day plan with specific milestones so that I have an
  actionable roadmap, not a generic list of advice.
- As a user, I want risk flags embedded in each phase so that I know which milestones
  are load-bearing.
- As a user, I want backup plans with specific triggers so that I know what to do when
  (not if) something goes wrong.
- As a user, I want a "start here — tomorrow morning" first step so that I know
  exactly how to begin.
- As a user, I want a tension warning if my chosen track conflicts with high-severity
  risks so that I'm not blindly proceeding into a known conflict.

### Plan Quality
- As a user, I want the plan scored on 4 dimensions (feasibility, specificity,
  risk_coverage, first_step_clarity) so that I know where the plan is weak.
- As a user, I want the system to automatically revise the plan if its quality score
  is below threshold so that I always receive a plan worth acting on.


---

## 6. Functional Requirements

### 6.1 Idea Input Screen

| ID    | Requirement |
|-------|-------------|
| FR-01 | The system shall accept a free-text idea description of any length via a multi-line text input. |
| FR-02 | The system shall provide at least 3 pre-written example prompts that populate the text input on click. |
| FR-03 | The system shall disable the submit button when the input field is empty or contains only whitespace. |
| FR-04 | The system shall display a loading state ("Excavating assumptions…") after submission while the pipeline is running. |
| FR-05 | The system shall initiate an AWS Step Functions execution upon idea submission and return an execution ARN. |

### 6.2 Assumption Excavation (Agent 1 — Excavator)

| ID    | Requirement |
|-------|-------------|
| FR-06 | The system shall extract between 4 and 8 assumptions from the user's free-text input using a large language model. |
| FR-07 | Each extracted assumption shall include: text, type, optimism_level, why_it_matters, and a hidden flag. |
| FR-08 | Assumption types shall be one of: timeline, market_size, skill, cost, user_behavior, competition. |
| FR-09 | Optimism levels shall be one of: aggressive, moderate, conservative. |
| FR-10 | The system shall store each extracted assumption in the Weaviate UserAssumption collection with a session ID. |
| FR-11 | The system shall generate a unique session ID (UUID) per pipeline execution. |

### 6.3 Research Validation (Agent 2 — Research)

| ID    | Requirement |
|-------|-------------|
| FR-12 | The system shall run Research Agent analysis on each extracted assumption independently and in parallel. |
| FR-13 | Each research result shall include: confidence_score (0.0–1.0), verdict, evidence_summary, sources, and risk_level. |
| FR-14 | Risk level shall be one of: high, medium, low. |
| FR-15 | The system shall query the Weaviate RealWorldFact and FailurePattern collections using cosine similarity search. |
| FR-16 | If the highest cosine similarity score across all Weaviate results is below 0.72, the system shall fall back to a live Tavily web search. |
| FR-17 | Web search results retrieved via fallback shall be written back to the Weaviate RealWorldFact collection to improve the corpus over time. |

### 6.4 Human Gate 1 — Assumption Review Screen

| ID    | Requirement |
|-------|-------------|
| FR-18 | The system shall pause the Step Functions execution and present all validated assumptions to the user before running adversarial analysis. |
| FR-19 | Each assumption card shall display: assumption text, type badge, optimism level badge, risk level badge, evidence summary, confidence score, and a visual confidence bar. |
| FR-20 | Risk level shall be colour-coded: high = red, medium = yellow, low = green. |
| FR-21 | The system shall display the idea summary generated by the Excavator for user reference. |
| FR-22 | The system shall display a responsible AI disclaimer advising users that confidence scores are decision inputs, not verdicts. |
| FR-23 | The system shall resume the Step Functions execution only after the user explicitly confirms the assumptions by clicking the proceed button. |
| FR-24 | The confirmed assumption set shall be passed downstream to the Adversary Agent. |

### 6.5 Adversarial Analysis (Agent 3 — Adversary)

| ID    | Requirement |
|-------|-------------|
| FR-25 | The system shall generate adversarial analysis specific to the user's confirmed assumptions, not generic risk categories. |
| FR-26 | The adversary output shall include: top_risks (2–5 items), hardest_question, and steelman_counterplan. |
| FR-27 | Each risk item shall include: risk name, argument (2–3 sentences), severity (critical / high / medium), and early_warning signal. |

### 6.6 Human Gate 2 — Execution Track Selection Screen

| ID    | Requirement |
|-------|-------------|
| FR-28 | The system shall pause the Step Functions execution and present the adversary output to the user before generating a plan. |
| FR-29 | The system shall display top risks with severity badges and early warning signals. |
| FR-30 | The system shall display the hardest unanswered question prominently. |
| FR-31 | The system shall present exactly three execution tracks: "Full speed ahead" (prototype), "Find a user first" (find_a_user), and "Rethink the core" (invalidate). |
| FR-32 | The system shall not recommend or pre-select any track. |
| FR-33 | The system shall disable the proceed button until a track is explicitly selected. |
| FR-34 | The selected track shall be passed to the Planner Agent. |

### 6.7 Plan Generation (Agent 4 — Planner)

| ID    | Requirement |
|-------|-------------|
| FR-35 | The system shall generate a 30/60/90-day plan tailored to the user's idea, confirmed assumptions, adversary risks, and chosen track. |
| FR-36 | Each phase (day 30, 60, 90) shall include: goal, milestones (2–4 items), risk_flags, and assumption_load score (1–5). |
| FR-37 | The Day 30 phase shall additionally include a first_real_step — a single concrete action the user can take the next morning. |
| FR-38 | The Day 90 phase shall include a success_metric defining how the user will know the plan worked. |
| FR-39 | The plan shall include at least one backup plan with a specific trigger condition and a corresponding pivot action. |
| FR-40 | The system shall generate a tension_warning if the chosen track conflicts with critical or high-severity adversary findings. |
| FR-41 | Track-specific milestone logic shall apply: prototype track focuses on MVP scope and first deploy; find_a_user track focuses on ICP definition and user conversations; invalidate track focuses on hypothesis testing and pivot exploration. |

### 6.8 Plan Quality Check (Agent 5 — Critic)

| ID    | Requirement |
|-------|-------------|
| FR-42 | The system shall score the generated plan on 4 dimensions: feasibility, specificity, risk_coverage, and first_step_clarity, each on a 0–10 scale. |
| FR-43 | The system shall compute an overall score and set revision_needed = true if overall score < 7. |
| FR-44 | If revision is needed, the system shall automatically re-invoke the Planner Agent with revision instructions, completing one revision loop before presenting the final plan. |
| FR-45 | The final output shall display all 4 dimension scores, the top improvement suggestion, and the full 30/60/90 plan. |

### 6.9 Output Screen

| ID    | Requirement |
|-------|-------------|
| FR-46 | The system shall display the plan title, critic scores, tension warning (if any), first real step, 30/60/90 milestones, and backup plans on the final output screen. |
| FR-47 | Critic dimension scores shall be colour-coded: ≥7 = green, 5–6 = yellow, <5 = red. |

### 6.10 Pipeline Orchestration

| ID    | Requirement |
|-------|-------------|
| FR-48 | The system shall implement the full agent pipeline using AWS Step Functions with waitForTaskToken pauses at both human gates. |
| FR-49 | The Research Agent shall be invoked in parallel for each assumption using a Step Functions Map state with a maximum concurrency of 5. |
| FR-50 | The system shall support a /resume API endpoint that accepts a task_token, gate identifier, and payload to resume a paused execution. |
| FR-51 | The frontend shall poll a /status endpoint every 2 seconds (up to 30 attempts) to detect when the pipeline is ready for the next stage. |
| FR-52 | The system shall support an automatic Planner revision loop (one iteration maximum) triggered by the Critic's revision_needed flag. |

### 6.11 Vector Database

| ID    | Requirement |
|-------|-------------|
| FR-53 | The system shall maintain three Weaviate collections: RealWorldFact, UserAssumption, and FailurePattern. |
| FR-54 | RealWorldFact shall store: claim, domain, source, confidence, contradicts, and recency_year. |
| FR-55 | UserAssumption shall store: assumption_text, assumption_type, optimism_level, session_id, and validated flag. |
| FR-56 | FailurePattern shall store: pattern_description, failure_category, frequency, early_warning_signal, backup_plan_hint, and assumption_type. |
| FR-57 | All text fields designated for semantic search shall be vectorised using OpenAI text-embedding-3-small. |
| FR-58 | The corpus shall be pre-populated with a minimum synthetic dataset (15 facts, 10 failure patterns) before demo execution. |


---

## 7. Non-Functional Requirements

### 7.1 Performance

| ID     | Requirement |
|--------|-------------|
| NFR-01 | The Excavator Agent shall return a result within 10 seconds of idea submission under normal load. |
| NFR-02 | The parallel Research Agent map shall complete all per-assumption calls within 20 seconds for up to 8 assumptions. |
| NFR-03 | The Adversary Agent shall return a result within 15 seconds. |
| NFR-04 | The Planner Agent shall return a result within 15 seconds. |
| NFR-05 | The full pipeline (end-to-end, excluding human gate wait time) shall complete within 90 seconds. |
| NFR-06 | Frontend polling shall detect pipeline stage readiness within 4 seconds of the backend reaching that state. |

### 7.2 Reliability

| ID     | Requirement |
|--------|-------------|
| NFR-07 | The system shall handle Weaviate query failures gracefully by falling back to the Tavily web search without surfacing errors to the user. |
| NFR-08 | The system shall handle Tavily API failures gracefully by proceeding with whatever Weaviate evidence is available, even at low confidence. |
| NFR-09 | The Step Functions state machine shall not lose execution state across the human gate pauses. |
| NFR-10 | The frontend polling timeout (30 attempts × 2 seconds = 60 seconds per stage) shall surface a user-readable error if exceeded. |

### 7.3 Security and Privacy

| ID     | Requirement |
|--------|-------------|
| NFR-11 | No personally identifiable information (PII) shall be stored. Session IDs shall be UUIDs with no link to user identity. |
| NFR-12 | All API credentials (Weaviate, OpenAI, Tavily, Bedrock) shall be stored as environment variables, never hardcoded. |
| NFR-13 | The /resume API endpoint shall validate the task_token format before forwarding to Step Functions. |
| NFR-14 | The API Gateway shall enforce CORS headers; the frontend domain shall be the only permitted origin in production. |

### 7.4 Responsible AI

| ID     | Requirement |
|--------|-------------|
| NFR-15 | Confidence scores shall always be labelled as "Reality check" or "decision inputs", never as "AI verdict" or definitive truth. |
| NFR-16 | The system shall display a responsible AI disclaimer on the Gate 1 assumption review screen at all times. |
| NFR-17 | Verdict labels shall use "optimistic / realistic / conservative", not "correct / incorrect". |
| NFR-18 | The system shall never recommend or pre-select an execution track; track selection must be an active user choice. |
| NFR-19 | The tension_warning field shall surface conflicts between user track and adversary severity without blocking the user from proceeding. |
| NFR-20 | Uncertainty shall be shown explicitly via confidence bars, score ranges, and source citations. |

### 7.5 Usability

| ID     | Requirement |
|--------|-------------|
| NFR-21 | The application shall be fully usable on a desktop browser without requiring account creation or login. |
| NFR-22 | The step indicator ("Step N of 4") shall be visible in the header at all times during the pipeline. |
| NFR-23 | Each screen shall have a single primary call-to-action button with a clear, state-aware label (e.g., "Excavating assumptions…" during loading). |
| NFR-24 | The colour palette shall maintain sufficient contrast for readability against the dark background (#0a0e1a). |
| NFR-25 | The UI shall be responsive to viewport widths from 375px (mobile) to 1440px (desktop). |

### 7.6 Maintainability

| ID     | Requirement |
|--------|-------------|
| NFR-26 | Each agent shall be deployed as an independent AWS Lambda function to allow independent versioning and updates. |
| NFR-27 | The Weaviate schema creation script shall be idempotent — safe to re-run without creating duplicate collections. |
| NFR-28 | The Weaviate corpus shall be expandable by adding new sources to the ingestion script without modifying agent logic. |
| NFR-29 | The confidence threshold for Weaviate vs. web fallback (currently 0.72) shall be configurable via an environment variable. |

### 7.7 Scalability

| ID     | Requirement |
|--------|-------------|
| NFR-30 | The architecture shall support concurrent pipeline executions without shared state conflicts (each execution is scoped by session_id). |
| NFR-31 | The Research Agent Map state's MaxConcurrency shall be configurable to handle more assumptions without architectural changes. |


---

## 8. User Flows

### 8.1 Happy Path — Full Pipeline

```
User lands on Input Screen
  │
  ├─ Reads tagline: "Turn your idea into an honest plan."
  ├─ Types idea OR selects an example prompt
  └─ Clicks "Analyse my idea →"
        │
        ▼
  [Pipeline starts — Step Functions execution initiated]
  Excavator Agent runs → Research Agents run in parallel (per assumption)
        │
        ▼
  Gate 1 Screen — "Step 2 of 4"
  ├─ Sees N assumption cards with confidence bars, risk badges, evidence
  ├─ Reads responsible AI disclaimer
  ├─ Reviews / mentally corrects any misread assumptions
  └─ Clicks "These look right — stress-test my plan →"
        │
        ▼
  [Adversary Agent runs]
        │
        ▼
  Gate 2 Screen — "Step 3 of 4"
  ├─ Reads top risks with severity and early warning signals
  ├─ Reads the hardest unanswered question
  ├─ Selects one of three execution tracks
  └─ Clicks "Build my 30/60/90-day plan →"
        │
        ▼
  [Planner Agent runs → Critic Agent scores → optional revision loop]
        │
        ▼
  Output Screen — "Complete ✓"
  ├─ Sees plan title
  ├─ Reads tension warning (if applicable)
  ├─ Reviews critic dimension scores
  ├─ Notes "Start here — tomorrow morning" first step
  ├─ Reads 30 / 60 / 90-day milestones with risk flags
  └─ Reviews backup plans
```

### 8.2 Low-Confidence Evidence Fallback Flow

```
Research Agent queries Weaviate
  └─ Cosine similarity score < 0.72 for a given assumption
        │
        ▼
  Tavily web search triggered automatically
  └─ Top 2 results written back to Weaviate RealWorldFact
        │
        ▼
  Research result returned with web-sourced evidence
  (user experience unchanged — no error shown)
```

### 8.3 Plan Revision Flow

```
Critic Agent scores plan
  └─ overall score < 7 → revision_needed = true
        │
        ▼
  Planner Agent re-invoked with revision_instructions
        │
        ▼
  Revised plan returned → Critic does NOT re-score
        │
        ▼
  Revised plan displayed on Output Screen
```

### 8.4 Pipeline Timeout Flow

```
Frontend polls /status endpoint
  └─ 30 attempts × 2 seconds = 60 seconds without a ready signal
        │
        ▼
  Timeout error surfaced to user
  User prompted to retry from Input Screen
```

---

## 9. Feature List

### Core Features (Pipeline)
| # | Feature | Description |
|---|---------|-------------|
| F-01 | Free-text idea input | Single textarea with example prompts |
| F-02 | Assumption excavation | 4–8 hidden assumptions extracted per idea |
| F-03 | Assumption categorisation | Type + optimism level + why_it_matters per assumption |
| F-04 | Parallel RAG validation | Each assumption validated against Weaviate vector corpus |
| F-05 | Confidence scoring | 0.0–1.0 score per assumption with visual bar |
| F-06 | Web search fallback | Tavily search auto-triggered when RAG confidence < 0.72 |
| F-07 | Self-improving corpus | Web fallback results written back to Weaviate |
| F-08 | Human Gate 1 | Assumption review and correction before adversary runs |
| F-09 | Responsible AI disclaimer | Permanent advisory on Gate 1 screen |
| F-10 | Adversarial analysis | Idea-specific risk steelmanning by Adversary Agent |
| F-11 | Risk severity + early warnings | Per-risk severity badge and observable early signal |
| F-12 | Hardest unanswered question | Single most important gap surfaced per analysis |
| F-13 | Human Gate 2 | User-driven execution track selection (AI does not choose) |
| F-14 | Three execution tracks | Prototype / Find a user / Rethink the core |
| F-15 | Track-specific plan | 30/60/90-day plan shaped by chosen track and risks |
| F-16 | Backup plans | Trigger → pivot pairs for likely failure modes |
| F-17 | Tension warning | Conflict alert if track clashes with high-severity risks |
| F-18 | First real step | Single actionable next-morning task from Day 30 |
| F-19 | Plan quality scoring | 4-dimension Critic scores on each generated plan |
| F-20 | Automatic plan revision | One revision loop if Critic overall score < 7 |

### Infrastructure Features
| # | Feature | Description |
|---|---------|-------------|
| F-21 | Step Functions orchestration | waitForTaskToken pauses at human gates |
| F-22 | Parallel Lambda map | Research Agents run concurrently per assumption |
| F-23 | Session tracking | UUID session IDs scoping UserAssumption writes |
| F-24 | Vector schema | 3 Weaviate collections with text2vec-openai embeddings |
| F-25 | Batch corpus ingestion | Pre-populated fact + failure pattern corpus for demo |

### UI Features
| # | Feature | Description |
|---|---------|-------------|
| F-26 | Progress indicator | "Step N of 4" header label across all screens |
| F-27 | Loading state labels | Context-aware button labels during pipeline waits |
| F-28 | Dark theme UI | Consistent #0a0e1a dark palette across all screens |
| F-29 | Colour-coded risk badges | Green / yellow / red risk level visual coding |
| F-30 | Critic score colouring | Green ≥7, yellow 5–6, red <5 for plan dimension scores |


---

## 10. MVP Scope

The MVP is scoped to demonstrate the full end-to-end pipeline reliably in a hackathon
demo setting. Every item below is required for a working demo.

### In Scope for MVP

**Weaviate (Owner: Samruddhi)**
- [ ] `weaviate_schema.py` — create 3 collections (run once before demo)
- [ ] `batch_ingest.py` — pre-populate corpus with synthetic facts and failure patterns
- [ ] Minimum corpus: 15 RealWorldFact records, 10 FailurePattern records, pre-seeded for the 3 example prompts

**Agents (Owner: You + Suzanaa)**
- [ ] Excavator Agent — Claude Sonnet 4.6, returns 4–8 typed assumptions as JSON
- [ ] Research Agent — Claude Haiku 4.5, Weaviate RAG + Tavily fallback, confidence scoring
- [ ] Adversary Agent — Claude Sonnet 4.6, idea-specific risks + hardest question (Suzanaa)
- [ ] Planner Agent — Claude Sonnet 4.6, track-specific 30/60/90 plan with backup plans
- [ ] Critic Agent — Claude Haiku 4.5, 4-dimension scoring + revision trigger

**Backend (Owner: You — Soham)**
- [ ] 5 Lambda handlers (excavator, research, adversary, planner, critic)
- [ ] Lambda 6: gate resume handler (`/resume` POST endpoint)
- [ ] Step Functions state machine with waitForTaskToken at Gate 1 and Gate 2
- [ ] Research parallel Map state (MaxConcurrency: 5)
- [ ] Planner revision loop (CheckRevision → PlannerRevision)
- [ ] `/status` polling endpoint
- [ ] API Gateway configured with CORS

**Frontend (Owner: Joshita)**
- [ ] Screen 1: Idea Input (textarea, 3 example buttons, submit)
- [ ] Screen 2: Gate 1 — Assumption review cards with confidence bars and responsible AI note
- [ ] Screen 3: Gate 2 — Adversary output display + 3-track radio selection
- [ ] Screen 4: Output — Critic scores, first step, 30/60/90 phases, backup plans
- [ ] Step progress indicator in header
- [ ] Loading state labels on all primary buttons
- [ ] Polling logic with 60-second timeout handling

### Explicitly Out of Scope for MVP
- User authentication or account system
- Plan export (PDF, email)
- Conversation-style refinement after plan generation
- Scraper integration (Samruddhi's optional scraper.py)
- Production domain / SSL (demo uses API Gateway URL)
- Mobile-optimised layout (desktop demo sufficient)
- Analytics or usage tracking

---

## 11. Future Scope

The following capabilities are explicitly deferred post-hackathon but are architecturally
consistent with the current design.

### Near-Term (v1.1 — Post-Demo)
| Feature | Description |
|---------|-------------|
| Plan export | Export the 30/60/90 plan as PDF or Notion page |
| Assumption editing | Gate 1 allows inline editing of assumption text, not just review |
| Progress tracking | User marks milestones complete; system tracks plan adherence over time |
| Repeat analysis | User re-runs the pipeline after 30 days to compare against original plan |
| Email delivery | Send the final plan to the user's email without requiring an account |

### Medium-Term (v2.0)
| Feature | Description |
|---------|-------------|
| User accounts | Persistent sessions; history of all idea analyses |
| Scraper pipeline | Samruddhi's scraper.py ingests live sources (PG essays, BLS, CB Insights) to keep corpus current |
| Corpus recency decay | recency_year field used to down-weight outdated facts automatically |
| Multi-language support | Idea input and output in languages beyond English |
| Team mode | Multiple collaborators review assumptions together at Gate 1 |
| Mentor view | Mentor-facing dashboard to run IdeaStress sessions with students/mentees |

### Long-Term (v3.0+)
| Feature | Description |
|---------|-------------|
| Domain-specific corpora | Separate validated corpora for startup, career, education, and health domains |
| API / embeddable widget | Third-party integration for accelerators and university entrepreneurship centres |
| Cohort benchmarking | Compare a user's assumption risk profile against anonymised historical cohorts |
| Adaptive confidence threshold | Dynamic Weaviate/web fallback threshold tuned per domain based on corpus density |
| Longitudinal outcome tracking | Optional opt-in: users report outcomes at 90 days; data feeds back into FailurePattern corpus |

---

## Appendix A — System Architecture Summary

```
User (Browser)
    │  POST /start {user_idea}
    ▼
API Gateway
    │
    ▼
Step Functions State Machine
    ├─ Excavator Lambda      → Weaviate UserAssumption write
    ├─ Research Map Lambda   → Weaviate RealWorldFact + FailurePattern read
    │                          └─ Tavily fallback + Weaviate write-back
    ├─ [waitForTaskToken] ←── notify-frontend Lambda ←── Gate 1 UI
    ├─ Adversary Lambda
    ├─ [waitForTaskToken] ←── notify-frontend Lambda ←── Gate 2 UI
    ├─ Planner Lambda
    ├─ Critic Lambda
    ├─ CheckRevision (Choice state)
    │    └─ PlannerRevision Lambda (if score < 7)
    └─ Done

External Services:
  Amazon Bedrock  — Claude Sonnet 4.6 (Excavator, Adversary, Planner)
                  — Claude Haiku 4.5  (Research, Critic)
  Weaviate Cloud  — Vector DB, text-embedding-3-small
  OpenAI API      — text-embedding-3-small embeddings
  Tavily API      — Web search fallback
```

## Appendix B — Agent Model Assignments

| Agent     | Model                          | Rationale |
|-----------|-------------------------------|-----------|
| Excavator | Claude Sonnet 4.6 (smart)      | Requires nuanced language understanding to surface *implied* assumptions |
| Research  | Claude Haiku 4.5 (fast)        | Runs N times in parallel; speed matters more than depth |
| Adversary | Claude Sonnet 4.6 (smart)      | Requires specific, non-generic argumentation; quality is critical |
| Planner   | Claude Sonnet 4.6 (smart)      | Must reflect idea-specific context, track logic, and risk integration |
| Critic    | Claude Haiku 4.5 (fast)        | Structured scoring task; speed and format compliance over nuance |

## Appendix C — Weaviate Confidence Threshold

The system uses a configurable confidence threshold (`CONFIDENCE_THRESHOLD = 0.72`) to
decide whether Weaviate cosine similarity results are sufficient or whether a live web
search is needed. This threshold was chosen to balance:

- **Too high (e.g. 0.90):** Excessive web fallback calls; higher cost and latency
- **Too low (e.g. 0.50):** Poor evidence quality passed to agents; degraded plan accuracy

The threshold shall be exposed as an environment variable for tuning without code changes.

## Appendix D — Execution Track Logic

| Track ID     | Plan Focus | When to Choose |
|-------------|------------|----------------|
| `prototype` | MVP scope, first deploy, first real user feedback | User believes the adversary risks are manageable and wants to build |
| `find_a_user` | ICP definition, 5 real conversations this week | User believes the idea but hasn't validated demand with real people |
| `invalidate` | Hypothesis testing, pivot exploration | Adversary made a compelling case; user wants to rethink the core assumption |

