# Design Document: IdeaStress — Zero-to-One Builder

**Version:** 1.0  
**Hackathon:** USAII 2026 — Challenge Brief 3, Direction B  
**Status:** Draft  
**Team:** Soham (You) · AI Lead (Suzanaa) · Data Lead (Samruddhi) · Frontend Lead (Joshita)

---

## Overview

IdeaStress is a five-agent AI pipeline that transforms a free-text idea into a
risk-weighted, evidence-backed 30/60/90-day action plan. Two human gates keep the user
in control of every critical decision. The system is implemented as a React SPA backed
by AWS Step Functions, seven AWS Lambda functions, Amazon Bedrock (Claude models), a
Weaviate Cloud vector database, and Tavily Search as a live-web fallback.

This document covers six design artifacts:
1. System Architecture
2. Database Design
3. API Specification
4. Authentication Flow
5. AI Integration Architecture
6. Deployment Architecture

All decisions are optimised for a 48-hour hackathon MVP by a four-person student team.
Every trade-off is annotated with a hackathon rationale.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Database Design](#2-database-design)
3. [API Specification](#3-api-specification)
4. [Authentication Flow](#4-authentication-flow)
5. [AI Integration Architecture](#5-ai-integration-architecture)
6. [Deployment Architecture](#6-deployment-architecture)
7. [Correctness Properties](#7-correctness-properties)
8. [Error Handling](#8-error-handling)
9. [Testing Strategy](#9-testing-strategy)

---

## Architecture

### 1.1 Technology Stack

| Component | Technology | Owner | Hackathon Rationale |
|-----------|-----------|-------|---------------------|
| Frontend SPA | React 18 + TypeScript (Vite) | Joshita | Pre-existing prototype reduces risk |
| API Entry Point | AWS API Gateway (REST API) | Soham | Managed CORS, no server to maintain |
| Orchestration | AWS Step Functions (Standard) | Soham | Built-in waitForTaskToken for human gates |
| Excavator Agent | AWS Lambda (Python 3.12) | Soham | Independent deploy, hot-fix ready |
| Research Agent | AWS Lambda (Python 3.12) | Soham | Parallel Map state per assumption |
| Adversary Agent | AWS Lambda (Python 3.12) | Suzanaa | Isolated prompt ownership |
| Planner Agent | AWS Lambda (Python 3.12) | Soham | Re-used for revision loop |
| Critic Agent | AWS Lambda (Python 3.12) | Soham | Haiku for cost control |
| Notify Lambda | AWS Lambda (Python 3.12) | Soham | Writes gate payload to cache |
| Resume Lambda | AWS Lambda (Python 3.12) | Soham | Forwards Task_Token to SFN |
| Status Lambda | AWS Lambda (Python 3.12) | Soham | Serves polling cache to frontend |
| LLM — Smart | Amazon Bedrock claude-sonnet-4-6 | Soham | Excavator / Adversary / Planner |
| LLM — Fast | Amazon Bedrock claude-haiku-4-5 | Soham | Research / Critic — lower cost + latency |
| Vector DB | Weaviate Cloud (free tier) | Samruddhi | Managed vector search, no infra cost |
| Embeddings | OpenAI text-embedding-3-small | Samruddhi | Built into text2vec-openai vectoriser |
| Web Fallback | Tavily Search API (free tier) | Soham | Fallback only — minimal quota usage |

### 1.2 Component Diagram

```
Browser (React SPA)
  │
  │  HTTPS  (API Gateway base URL only — no direct Lambda URLs exposed)
  ▼
┌─────────────────────────────────────────────────────────────┐
│  AWS API Gateway  (REST API)                                │
│  POST /start  │  GET /status  │  POST /resume  │  OPTIONS  │
└────┬──────────────────┬──────────────────┬──────────────────┘
     │                  │                  │
     ▼                  ▼                  ▼
 Excavator-        Status Lambda       Resume-Gate
 Trigger Lambda    (polling cache)     Lambda
     │                  │                  │
     │  StartExecution   │ Read cache        │ SendTaskSuccess
     ▼                  │                  ▼
┌────────────────────────────────────────────────────────────┐
│  AWS Step Functions State Machine                          │
│                                                            │
│  [Excavator] → [ResearchParallel Map] → [HumanGate1]      │
│      ↓                ↓ (×N, max 5)          ↓             │
│  session_id      Research Lambda       Notify Lambda       │
│  generated       (per assumption)      writes cache        │
│                                              ↓             │
│                                        [Adversary] →       │
│                                        [HumanGate2]        │
│                                              ↓             │
│                                        Notify Lambda       │
│                                        writes cache        │
│                                              ↓             │
│                              [Planner] → [Critic]          │
│                                   ↑          ↓             │
│                          [PlannerRevision] ← [CheckRevision│
│                                              Choice]       │
│                                    ↓ (Done)                │
│                              Notify Lambda (output)        │
└────────────────────────────────────────────────────────────┘
     │                  │
     ▼                  ▼
Amazon Bedrock      Weaviate Cloud
(us-east-1)         (nearest region)
claude-sonnet-4-6       │
claude-haiku-4-5    OpenAI Embeddings
                    text-embedding-3-small
                        │
                    Tavily Search API
                    (fallback only)
```

### 1.3 Happy-Path Data Flow (POST /start → Final Output)

The following numbered steps describe every network hop in the happy path:

**Phase A — Pipeline Start**

1. User submits idea text. Frontend calls `POST /start` with `{ "user_idea": "<text>" }`.
2. API Gateway routes to `excavator-trigger` Lambda.
3. `excavator-trigger` Lambda calls `sfn.start_execution` with the state machine ARN and input `{ "user_idea": "<text>" }`. It returns `{ "executionArn": "<arn>", "session_id": "<uuid>" }` to the frontend. *(Note: session_id is generated by the Excavator Lambda, embedded into the SFN input, and returned simultaneously.)*
4. Frontend stores `executionArn` and `session_id` in React component state. Begins polling `GET /status?executionArn=<arn>&gate=gate1` every 2 seconds.

**Phase B — Excavator + Research (Agent 1 and 2)**

5. Step Functions starts the **Excavator** Task state. Invokes `excavator` Lambda with `{ "user_idea": "<text>", "session_id": "<uuid>" }`.
6. Excavator Lambda calls Bedrock (claude-sonnet-4-6). Receives JSON with 4–8 typed assumptions.
7. Excavator Lambda writes each assumption to Weaviate `UserAssumption` collection (tagged with session_id). Returns `{ "session_id", "idea_summary", "domain", "assumptions": [...] }` to SFN.
8. Step Functions enters **ResearchParallel** Map state. Invokes `research` Lambda once per assumption (up to 5 in parallel), each with `{ "assumption": <obj>, "session_id": "<uuid>" }`.
9. Each `research` Lambda queries Weaviate `RealWorldFact` (limit=3) and `FailurePattern` (limit=2) via `near_text`. If max certainty < `CONFIDENCE_THRESHOLD` (0.72), calls Tavily API and writes back ≤2 results to `RealWorldFact`.
10. Each `research` Lambda calls Bedrock (claude-haiku-4-5) to score the assumption against evidence. Returns `{ "assumption_id", "confidence_score", "verdict", "evidence_summary", "sources", "risk_level" }`.
11. Map state completes. SFN collects all research results into `$.validated_assumptions`.

**Phase C — Human Gate 1**

12. Step Functions enters **HumanGate1** `waitForTaskToken` state. Invokes `notify` Lambda with `{ "task_token": "<token>", "gate": "gate1", "data": validated_assumptions, "idea_summary": "<text>" }`.
13. `notify` Lambda writes `{ "ready": true, "payload": { "task_token", "idea_summary", "validated_assumptions" } }` to the in-process polling cache under key `<executionArn>#gate1`.
14. Frontend poll receives `{ "ready": true, "payload": {...} }`. Frontend transitions to Gate 1 screen and renders assumption cards.
15. User reviews assumptions and clicks "Proceed". Frontend calls `POST /resume` with `{ "task_token": "<token>", "gate": "gate1", "payload": { "confirmed_assumptions": [...] } }`.
16. `resume-gate` Lambda calls `sfn.send_task_success(taskToken=<token>, output=json.dumps(payload))`. SFN unblocks.
17. SFN stores confirmed assumptions in `$.gate1_output`.

**Phase D — Adversary + Human Gate 2**

18. Step Functions enters **Adversary** Task state. Invokes `adversary` Lambda with `{ "idea_summary", "validated_assumptions": gate1_output.confirmed_assumptions }`.
19. `adversary` Lambda calls Bedrock (claude-sonnet-4-6). Returns `{ "top_risks", "hardest_question", "steelman_counterplan" }`.
20. Step Functions enters **HumanGate2** `waitForTaskToken` state. `notify` Lambda writes cache entry for `<executionArn>#gate2`.
21. Frontend poll receives gate-2 ready payload. Renders Adversary output screen with risks and track selector.
22. User selects a track and clicks "Proceed". Frontend calls `POST /resume` with `{ "task_token", "gate": "gate2", "payload": { "chosen_track": "prototype"|"find_a_user"|"invalidate" } }`.
23. SFN unblocks. Stores `$.gate2_output.chosen_track`.

**Phase E — Planner + Critic + Optional Revision**

24. Step Functions enters **Planner** Task. Invokes `planner` Lambda with `{ "idea_summary", "validated_assumptions", "adversary_output", "user_track", "revision_instructions": null }`.
25. `planner` Lambda calls Bedrock (claude-sonnet-4-6). Returns full 30/60/90-day plan JSON.
26. Step Functions enters **Critic** Task. Invokes `critic` Lambda with `{ "plan", "idea_summary" }`.
27. `critic` Lambda calls Bedrock (claude-haiku-4-5). Returns `{ "scores", "overall", "revision_needed", "revision_instructions", "top_improvement" }`.
28. Step Functions enters **CheckRevision** Choice state:
    - If `revision_needed == true` → enters **PlannerRevision** Task. Re-invokes `planner` Lambda with `revision_instructions` added. Stores revised plan in `$.plan_output`. Proceeds directly to Done.
    - If `revision_needed == false` → enters **Done** Pass state immediately.
29. **Done** state triggers `notify` Lambda (via ResultPath) to write final output cache entry under key `<executionArn>#output`.
30. Frontend poll (polling `gate=output`) receives `{ "ready": true, "payload": { "plan_output", "critic_output", "idea_summary" } }`. Renders Output screen.

### 1.4 Session_ID Propagation

Session_ID is generated as `str(uuid.uuid4())` inside the `excavator` Lambda during step 5 above. It travels through the system as follows:

| Step | Carrier | Field name |
|------|---------|-----------|
| SFN execution input | JSON body | `session_id` |
| Excavator → SFN result | `ResultPath: $.excavator_output` | `excavator_output.session_id` |
| Research Map item context | `Parameters` block | `session_id.$: "$.session_id"` |
| Weaviate `UserAssumption` writes | Collection property | `session_id` |
| Research Weaviate query filter | `where` filter | `session_id == <value>` |

No Lambda modifies the Session_ID. Any downstream Lambda that receives an event without a valid UUID v4 `session_id` field returns HTTP 400 without performing writes.

### 1.5 Human Gate Pause/Resume Cycle

Both Human Gates use the Step Functions `waitForTaskToken` pattern:

```
SFN reaches HumanGate state
  │
  ├─ Invokes Notify Lambda with Task_Token in payload
  │
  │   Notify Lambda writes to polling cache:
  │   cache["{executionArn}#{gate}"] = { ready: true, payload: { task_token, ... } }
  │
  └─ SFN thread PAUSES indefinitely (no timeout set — hackathon simplicity)
         │
         │   Frontend polls GET /status every 2s
         │   ← receives { ready: true, payload }
         │   ← renders gate screen to user
         │
         │   User interacts and clicks Proceed
         │
         ▼
  Frontend calls POST /resume
  { task_token, gate, payload: <user_data> }
         │
         ▼
  Resume Lambda calls sfn.send_task_success(taskToken=token, output=json.dumps(payload))
         │
         ▼
  SFN thread UNPAUSES — gate output stored in $.gateN_output
  Pipeline continues to next state
```

**Hackathon rationale for no gate timeout:** AWS Step Functions Standard workflows can wait up to one year. Omitting heartbeat timeouts removes failure modes during the demo. Post-hackathon, add a 10-minute HeartbeatSeconds to prevent zombie executions.


---

## Data Models

**Owner: Samruddhi**

### 2.1 Weaviate Collection Overview

IdeaStress maintains exactly three Weaviate collections. All three use the `text2vec-openai` vectoriser configured with `text-embedding-3-small`. Vectorisation happens automatically at insert time — the Lambda functions never call the OpenAI embeddings API directly.

| Collection | Purpose | Vectorised Field | Write Timing |
|-----------|---------|-----------------|-------------|
| `RealWorldFact` | Ground-truth claims for RAG validation | `claim` | Pre-populated (batch_ingest.py) + Tavily write-back |
| `UserAssumption` | Per-session assumption data | `assumption_text` | Excavator Agent at runtime |
| `FailurePattern` | Recurring failure patterns for Adversary/Critic RAG | `pattern_description` | Pre-populated only |

### 2.2 RealWorldFact Schema

Primary use: Research Agent queries via `near_text(query=assumption_text, limit=3)`.

| Property | Data Type | Vectorised | Description | Constraints |
|---------|-----------|-----------|-------------|-------------|
| `claim` | TEXT | **Yes** | Ground-truth declarative claim | Required; 1–500 chars |
| `domain` | TEXT | No | Topic domain of the claim | See allowed values below |
| `source` | TEXT | No | Origin URL or publication name | Required |
| `confidence` | NUMBER | No | Provider-assigned confidence [0.0–1.0] | 0.0 ≤ value ≤ 1.0 |
| `contradicts` | TEXT | No | The myth or misconception this claim refutes | Optional; may be empty string |
| `recency_year` | INT | No | Year the data was published or sourced | Integer; 2015–2025 range expected |

**Allowed values — `domain`:** `startup` · `education` · `career` · `health`

*(Additional domains may be added to batch_ingest.py without schema changes.)*

### 2.3 UserAssumption Schema

Primary use: Excavator writes per-assumption records; Research Agent filters by session_id.

| Property | Data Type | Vectorised | Description | Constraints |
|---------|-----------|-----------|-------------|-------------|
| `assumption_text` | TEXT | **Yes** | Full text of the assumption as a declarative statement | Required |
| `assumption_type` | TEXT | No | Category of assumption | See allowed values below |
| `optimism_level` | TEXT | No | How optimistic the assumption is | See allowed values below |
| `session_id` | TEXT | No | UUID v4 — sole session scoping mechanism | Must match UUID v4 format |
| `validated` | BOOL | No | Whether research has been run on this assumption | Default: false; set to true post-Research |

**Allowed values — `assumption_type`:** `timeline` · `market_size` · `skill` · `cost` · `user_behavior` · `competition`

**Allowed values — `optimism_level`:** `aggressive` · `moderate` · `conservative`

### 2.4 FailurePattern Schema

Primary use: Research Agent queries via `near_text(query=assumption_text, limit=2)`.

| Property | Data Type | Vectorised | Description | Constraints |
|---------|-----------|-----------|-------------|-------------|
| `pattern_description` | TEXT | **Yes** | Full description of the failure pattern | Required |
| `failure_category` | TEXT | No | Category of failure | See allowed values below |
| `frequency` | TEXT | No | How often this pattern appears in real projects | See allowed values below |
| `early_warning_signal` | TEXT | No | Observable leading indicator of this failure | Optional |
| `backup_plan_hint` | TEXT | No | Suggested mitigation or pivot strategy | Optional; feeds Planner backup_plans |
| `assumption_type` | TEXT | No | Matches Excavator assumption types for cross-referencing | See UserAssumption allowed values |

**Allowed values — `failure_category`:** `timeline` · `technical` · `market` · `team`

**Allowed values — `frequency`:** `very_common` · `common`

### 2.5 Vectorisation Strategy

```
Insert flow (all three collections):

Lambda inserts object with plain-text properties
        │
        ▼
Weaviate Cloud receives the object
        │
        ▼
text2vec-openai module calls OpenAI Embeddings API
using model: text-embedding-3-small
        │
        ▼
1536-dimensional vector stored alongside the object
        │
        ▼
Object is queryable via near_text immediately
```

**Why text-embedding-3-small?**
- 1536 dimensions — good semantic resolution at low cost
- ~$0.02 per million tokens; a full demo corpus of 500 records costs < $0.01
- Already supported natively by the `text2vec-openai` Weaviate module
- No separate embedding step needed in Lambda code

**Search query parameters (Research Agent):**
```
RealWorldFact.query.near_text(
    query = assumption_text,
    limit = 3,
    return_metadata = ["certainty"]
)

FailurePattern.query.near_text(
    query = assumption_text,
    limit = 2,
    return_metadata = ["certainty"]
)
```
`certainty` is Weaviate's normalised cosine similarity score in [0, 1].

### 2.6 Corpus Pre-Population Plan

**Owner: Samruddhi** — run `batch_ingest.py` exactly once before the demo.

| Collection | Minimum Records | Domains Covered | Seeding Priority |
|-----------|----------------|----------------|-----------------|
| `RealWorldFact` | 15 | startup (8), education (4), career (3) | Cover all 3 example prompts' key assumptions |
| `FailurePattern` | 10 | timeline (3), market (3), technical (2), team (2) | Cover all 3 example prompt failure modes |

**Example prompt coverage matrix** (minimum one matching record per cell):

| Assumption | RealWorldFact | FailurePattern |
|-----------|--------------|---------------|
| "Ship MVP in 2 weeks" | Solo dev timeline stats | Timeline compression pattern |
| "500 organic signups" | Organic growth failure rate | User acquisition cost pattern |
| "Learn ML in a month" | ML learning timeline data | Skill overestimation pattern |
| "Get DS job in 3 months" | Bootcamp/career switch timelines | Market demand pattern |
| "Undercut by 20%" | Price competition survival stats | Market entry pattern |
| "10% market share year 1" | First-year market share reality | Market size assumption pattern |

**Extended corpus (recommended for richer RAG results):**
Samruddhi's optional `scraper.py` can expand the corpus to 500–2000 records by ingesting
Paul Graham essays, CB Insights startup failure reports, and BLS Occupational Outlook data.
This is not required for the MVP demo but significantly improves Research Agent confidence
scores and reduces Tavily fallback frequency.

### 2.7 Tavily Fallback Write-Back Contract

When the Research Agent's Weaviate query returns a maximum certainty below `CONFIDENCE_THRESHOLD`:

| Tavily result count | Write-back action | Fields set |
|--------------------|--------------------|------------|
| 0 results | No write-back | — |
| 1 result | Insert 1 record to `RealWorldFact` | `claim=content[:500]`, `domain="startup"`, `source=url`, `confidence=0.65`, `recency_year=2025`, `contradicts=""` |
| ≥ 2 results | Insert top 2 records to `RealWorldFact` | Same field mapping |

**Rationale for confidence=0.65:** Web results are unvetted; this value is below the `CONFIDENCE_THRESHOLD` intentionally, preventing the just-written records from becoming the sole basis for a future query. Over multiple demo runs, the corpus self-improves as high-certainty records accumulate.

### 2.8 Idempotency Rules for weaviate_schema.py

The schema creation script must be safe to re-run mid-hackathon without corrupting the cluster.

**Implementation pattern:**
```
for each collection_name in ["RealWorldFact", "UserAssumption", "FailurePattern"]:
    if client.collections.exists(collection_name):
        print(f"  ↳ {collection_name} already exists — skipping")
        continue
    client.collections.create(collection_name, ...)
    print(f"  ✓ {collection_name} created")
```

**Rules:**
1. `collections.exists()` is called before every `collections.create()`.
2. If a collection exists with a different schema (from a botched prior run), the script skips it — it does NOT attempt to modify or delete the existing schema.
3. If a conflicting schema is detected and blocking, the team must manually delete the collection from the Weaviate Cloud console, then re-run the script.
4. The script exits with code 0 on all skip paths (not code 1), so CI pipelines do not flag re-runs as failures.

### 2.9 No PII in Any Collection

`session_id` in `UserAssumption` is the only identifier field. It is a UUID v4 with no link to user identity, IP address, browser fingerprint, or any other PII. No collection stores email addresses, names, or authentication tokens.


---

## Components and Interfaces

### 3. API Specification

**Owner: Soham**

### 3.1 Endpoint Table

| Method | Path | Lambda | Purpose |
|--------|------|--------|---------|
| `POST` | `/start` | `excavator-trigger` | Start a new pipeline execution |
| `GET` | `/status` | `status` | Poll for stage readiness |
| `POST` | `/resume` | `resume-gate` | Resume a paused Human Gate |
| `OPTIONS` | `/{proxy+}` | Mock integration | CORS preflight for all paths |

**Base URL:** `https://<api-id>.execute-api.us-east-1.amazonaws.com/prod`

All endpoints are served over HTTPS. The API Gateway default URL is the production URL for the hackathon — no custom domain required.

### 3.2 POST /start

**Purpose:** Accept a user's idea, trigger the Step Functions pipeline, return the execution identifier.

**Request:**
```json
{
  "user_idea": "string (required, non-empty, non-whitespace-only)"
}
```

**Successful Response — HTTP 200:**
```json
{
  "executionArn": "arn:aws:states:us-east-1:123456789:execution:IdeaStress:uuid",
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses:**

| HTTP Status | Condition | Body |
|------------|-----------|------|
| 400 | `user_idea` is absent, empty string, or whitespace-only | `{ "error": "user_idea is required and must not be empty" }` |
| 500 | Step Functions `start_execution` throws an exception | `{ "error": "Failed to start pipeline. Please retry." }` |

**CORS headers (all responses):**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type
Access-Control-Allow-Methods: POST, OPTIONS
```

### 3.3 GET /status

**Purpose:** Frontend polls this endpoint every 2 seconds to check if the pipeline has reached a gate or completion.

**Query Parameters:**

| Parameter | Type | Required | Allowed Values |
|-----------|------|---------|---------------|
| `executionArn` | string | Yes | Any valid SFN execution ARN |
| `gate` | string | Yes | `gate1` · `gate2` · `output` |

**Response — Not Ready (HTTP 200):**
```json
{ "ready": false, "payload": null }
```

**Response — Ready (HTTP 200):**
```json
{ "ready": true, "payload": <gate-specific object — see below> }
```

**Error Responses:**

| HTTP Status | Condition | Body |
|------------|-----------|------|
| 400 | `executionArn` absent | `{ "error": "executionArn query parameter is required" }` |
| 400 | `gate` absent or not one of the three allowed values | `{ "error": "gate must be one of: gate1, gate2, output" }` |
| 404 | `executionArn` not found in polling cache | `{ "error": "Execution not found. It may have expired or never started." }` |

**Gate-1 Ready Payload Schema:**
```json
{
  "task_token": "string (opaque SFN token)",
  "idea_summary": "string",
  "validated_assumptions": [
    {
      "assumption_id": "string",
      "assumption": "string",
      "confidence_score": 0.0,
      "verdict": "optimistic | realistic | conservative",
      "evidence_summary": "string",
      "sources": ["string"],
      "risk_level": "high | medium | low"
    }
  ]
}
```

**Gate-2 Ready Payload Schema:**
```json
{
  "task_token": "string (opaque SFN token)",
  "adversary_output": {
    "top_risks": [
      {
        "risk": "string",
        "argument": "string",
        "severity": "critical | high | medium",
        "early_warning": "string"
      }
    ],
    "hardest_question": "string",
    "steelman_counterplan": "string"
  }
}
```

**Output Ready Payload Schema:**
```json
{
  "plan_output": { /* PlanOutput — see §3.7 */ },
  "critic_output": { /* CriticOutput — see §3.7 */ },
  "idea_summary": "string"
}
```

### 3.4 POST /resume

**Purpose:** Unblock a Human Gate by sending the user's confirmed data back to Step Functions.

**Request (Gate-1):**
```json
{
  "task_token": "string (required, non-empty)",
  "gate": "gate1",
  "payload": {
    "confirmed_assumptions": [
      {
        "assumption_id": "string",
        "assumption": "string",
        "confidence_score": 0.85,
        "verdict": "optimistic | realistic | conservative",
        "evidence_summary": "string",
        "sources": ["string"],
        "risk_level": "high | medium | low"
      }
    ]
  }
}
```

**Request (Gate-2):**
```json
{
  "task_token": "string (required, non-empty)",
  "gate": "gate2",
  "payload": {
    "chosen_track": "prototype | find_a_user | invalidate"
  }
}
```

**Successful Response — HTTP 200:**
```json
{ "status": "resumed" }
```

**Error Responses:**

| HTTP Status | Condition | Body |
|------------|-----------|------|
| 400 | `task_token` field absent or empty string | `{ "error": "task_token is required and must not be empty" }` |
| 400 | `gate` not one of `gate1` · `gate2` | `{ "error": "gate must be gate1 or gate2" }` |
| 400 | `payload` absent | `{ "error": "payload is required" }` |
| 500 | `sfn.send_task_success` throws | `{ "error": "Failed to resume execution. Please retry." }` |

**Validation rule:** `task_token` must be a non-empty string. The Lambda does NOT validate the token's content (it is opaque) — Step Functions will reject an invalid token with its own error, which propagates as HTTP 500.

### 3.5 OPTIONS /{proxy+} — CORS Preflight

All preflight requests are handled by an API Gateway mock integration (no Lambda invoked):

**Response — HTTP 200:**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key
Access-Control-Allow-Methods: GET,POST,OPTIONS
```

**Post-hackathon:** Replace `*` with the specific frontend domain (e.g., `https://idea-stress.vercel.app`) in the API Gateway resource policy.

### 3.6 Polling Contract

The frontend implements the following polling algorithm:

```
MAX_ATTEMPTS = 30
POLL_INTERVAL_MS = 2000

attempts = 0
while attempts < MAX_ATTEMPTS:
    wait(POLL_INTERVAL_MS)
    response = GET /status?executionArn=<arn>&gate=<targetGate>
    if response.ready == true:
        return response.payload
    attempts += 1

// Timeout reached
display_error("Analysis is taking longer than expected. Please return to
               the start screen and resubmit your idea.")
navigate_to(InputScreen)
```

**Timeout behaviour:** After 30 failed polls (60 seconds), the frontend shows a user-readable error and resets to the Input Screen. The Step Functions execution continues running server-side; the user must start a new execution.

**Why 2s interval / 30 attempts?**
- NFR-06 requires stage readiness detected within 4 seconds; 2s interval satisfies this.
- 60 seconds is generous for any single stage (all agent SLAs are < 20s).
- Beyond 60s, a Lambda or Bedrock failure is likely; prompting retry is the right UX.

### 3.7 Complete Inline JSON Schemas

#### ValidatedAssumption / ConfirmedAssumption
*(Shared schema — same structure used in both gate-1 status payload and resume request)*
```json
{
  "assumption_id": "string",
  "assumption": "string (full assumption text)",
  "confidence_score": "number [0.0–1.0]",
  "verdict": "optimistic | realistic | conservative",
  "evidence_summary": "string (2–3 sentences)",
  "sources": ["string (URL or publication name)"],
  "risk_level": "high | medium | low"
}
```

#### AdversaryOutput
```json
{
  "top_risks": [
    {
      "risk": "string (concise risk name)",
      "argument": "string (2–3 sentence explanation specific to this idea)",
      "severity": "critical | high | medium",
      "early_warning": "string (observable signal)"
    }
  ],
  "hardest_question": "string (single most important unanswered question)",
  "steelman_counterplan": "string (most likely failure reason — 1 sentence)"
}
```
Constraint: `top_risks` array length is 2–5 items.

#### PlanOutput
```json
{
  "plan_title": "string",
  "tension_warning": "string | null",
  "plan": {
    "day_30": {
      "goal": "string",
      "milestones": ["string", "string", "string"],
      "risk_flags": ["string"],
      "first_real_step": "string (single concrete next-morning action)",
      "assumption_load": "integer [1–5]"
    },
    "day_60": {
      "goal": "string",
      "milestones": ["string", "string"],
      "risk_flags": ["string"],
      "assumption_load": "integer [1–5]"
    },
    "day_90": {
      "goal": "string",
      "milestones": ["string", "string"],
      "risk_flags": ["string"],
      "success_metric": "string (how you know this worked)",
      "assumption_load": "integer [1–5]"
    }
  },
  "backup_plans": [
    {
      "trigger": "string (if <specific condition> happens)",
      "pivot": "string (then do this instead)"
    }
  ],
  "confidence_score": "number [0.0–1.0]"
}
```

#### CriticOutput
```json
{
  "scores": {
    "feasibility":        { "score": "integer [0–10]", "comment": "string" },
    "specificity":        { "score": "integer [0–10]", "comment": "string" },
    "risk_coverage":      { "score": "integer [0–10]", "comment": "string" },
    "first_step_clarity": { "score": "integer [0–10]", "comment": "string" }
  },
  "overall": "integer [0–10]",
  "revision_needed": "boolean (true if and only if overall < 7)",
  "revision_instructions": "string | null (populated if revision_needed is true)",
  "top_improvement": "string"
}
```


---

## 4. Authentication Flow

### 4.1 Rationale for Anonymous/Sessionless Design

IdeaStress requires no user authentication. This is a deliberate design choice, not a
deferred feature:

| Design driver | Implication |
|--------------|-------------|
| Hackathon speed | No OAuth, JWT, or Cognito setup; saves 4–6 hours of hackathon time |
| Target user experience | Zero friction — user arrives and starts immediately |
| Demo reliability | No auth failures during the demo presentation |
| Privacy | No identity data to expose, breach, or misuse |
| MVP scope | SRS explicitly marks authentication as out of scope |

The isolation guarantee (multiple simultaneous users never see each other's data) is
achieved entirely through UUID-scoped execution contexts rather than authenticated sessions.

### 4.2 Session_ID Lifecycle

```
Step 1 — Generation
  excavator Lambda invoked by Step Functions
  session_id = str(uuid.uuid4())
  ↳ format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx (UUID v4)
  ↳ generated once per pipeline execution
  ↳ embedded into SFN execution input as top-level field

Step 2 — Propagation
  SFN execution input: { "user_idea": "...", "session_id": "uuid" }
  ↓
  Excavator ResultPath: $.excavator_output  (contains session_id)
  ↓
  Research Map Parameters: passes session_id from $.session_id
  ↓
  All subsequent states receive $.session_id via Parameters blocks
  ↓
  Notify Lambda receives session_id in payload → stored in cache alongside task_token
  ↓
  POST /start response: { "executionArn": "...", "session_id": "uuid" }
    → Frontend stores in React useState

Step 3 — In-flight scope
  Weaviate UserAssumption writes: all tagged with session_id
  Weaviate Research queries: filtered by session_id equality
  Polling cache keys: use executionArn (not session_id) as primary key

Step 4 — Expiry
  No explicit expiry mechanism in the MVP
  UserAssumption records for the session persist in Weaviate indefinitely
  Post-hackathon: add a TTL or nightly cleanup job that deletes
    UserAssumption records older than 24 hours
```

### 4.3 Execution_ARN and Task_Token Handling Rules

**Execution_ARN:**
- Returned by `sfn.start_execution()` — globally unique, immutable for the execution lifetime.
- Stored in React `useState` only — not in localStorage, sessionStorage, or cookies.
- Used as the primary key for all Status Lambda polling cache lookups.
- Format: `arn:aws:states:<region>:<account>:execution:<machine-name>:<execution-name>`

**Task_Token:**
- Issued by Step Functions at each `waitForTaskToken` state — opaque, single-use.
- Stored server-side in the Status Lambda in-process cache: key = `{executionArn}#{gate}`.
- Delivered to the frontend as part of the `GET /status` ready payload.
- Frontend holds the token only in memory for the duration of the `POST /resume` call.
- The token is consumed (invalidated by SFN) on first successful `send_task_success` call.
- If `POST /resume` fails (non-200), the token remains valid server-side and is re-delivered by the next successful `GET /status` poll.
- **The frontend must NOT cache, log, or persist the Task_Token beyond the single resume call.**

**Rules:**

| Rule | Enforcement point |
|------|-----------------|
| Task_Token is never logged to CloudWatch | Lambda code must not `print(task_token)` |
| Task_Token is validated as non-empty string before forwarding | Resume Lambda input validation |
| Execution_ARN is never sent to Weaviate | Session scoping uses session_id, not ARN |
| Session_ID absent → 400, no write | All agent Lambdas validate UUID v4 format |

### 4.4 Concurrent Isolation Model

Each pipeline execution is fully isolated from all others:

```
User A                          User B
  │                               │
  │ POST /start                   │ POST /start
  ▼                               ▼
session_id: "aaa-111"          session_id: "bbb-222"
executionArn: "sfn:...A"       executionArn: "sfn:...B"
  │                               │
  ▼                               ▼
SFN Execution A                SFN Execution B
  │                               │
  ▼                               ▼
UserAssumption.session_id       UserAssumption.session_id
  = "aaa-111" (filter)            = "bbb-222" (filter)
```

Weaviate queries by Research Agent always include a `where` equality filter:
```python
filters = weaviate.query.Filter.by_property("session_id").equal(session_id)
collection.query.near_text(query=..., filters=filters, limit=3)
```

This filter is the primary isolation mechanism. Two simultaneous executions can never
read each other's `UserAssumption` records regardless of similar assumption text.

The `RealWorldFact` and `FailurePattern` collections are shared (read-only) across all
sessions — this is intentional, as they are the shared knowledge corpus.

### 4.5 PII-Free Data Model

No PII is stored anywhere in the system:

| Data layer | What is stored | What is NOT stored |
|-----------|---------------|-------------------|
| Weaviate `UserAssumption` | UUID session_id, assumption text | Name, email, IP, device ID |
| Weaviate `RealWorldFact` | Fact claims, domain, source URL | Any user-originating data |
| Step Functions execution | user_idea text, intermediate outputs | Identity, auth tokens |
| API Gateway access logs | Request method, path, latency | User identity, full request body |
| Status Lambda cache | executionArn, task_token, payload | Identity, cookies |

**Note on free-text idea content:** The user's `user_idea` text is stored in the Step Functions execution input (accessible via `DescribeExecution` for the execution duration). This is free text that may contain personal context but is not PII by design — there is no identity attached to it, and it is not linked to any user account. Post-hackathon, consider encrypting execution inputs or expiring them.

### 4.6 Browser Refresh / Session Loss Behaviour

If a user closes, refreshes, or navigates away from the app mid-pipeline:

```
Browser event (refresh, close, navigate)
  │
  ▼
React component state is destroyed
  ↓
  session_id: LOST
  executionArn: LOST
  task_token: LOST (if held)
  │
  ▼
No reconnect mechanism exists in the MVP
  │
  ▼
Step Functions execution CONTINUES server-side
  │  (runs to completion or timeout — harmless zombie execution)
  ▼
User sees Input Screen on next visit
  │
  ▼
User must resubmit idea → new execution starts
  │
  ▼
No partial results from the abandoned execution are recoverable
```

**Hackathon rationale:** Implementing reconnect logic (e.g., storing `executionArn` in localStorage and offering "Resume last session") adds ~3 hours of development and edge-case handling. For a demo setting with a supervised presenter, this is never triggered. Post-hackathon, implement localStorage persistence with a TTL.

**Demo guidance for the team:** During the live demo, do not refresh the browser between screens. If a refresh happens, simply resubmit the same example prompt — the pipeline completes in ~90 seconds and the demo can continue.


---

## 5. AI Integration Architecture

**Owner: Soham (orchestration) · Suzanaa (Adversary prompt)**

### 5.1 Agent Pipeline Sequence

```
Frontend → POST /start
  │
  ▼
[1] Excavator Agent  (claude-sonnet-4-6)
    Input:  { user_idea, session_id }
    Output: { idea_summary, domain, assumptions[4–8] }
    Writes: UserAssumption × N records to Weaviate
  │
  ▼ (Step Functions Map — one parallel invocation per assumption, MaxConcurrency=5)
[2] Research Agent  ×N  (claude-haiku-4-5)
    Input:  { assumption, session_id }
    Query:  Weaviate near_text → certainty check → optional Tavily
    Output: { assumption_id, confidence_score, verdict, evidence_summary, sources, risk_level }
  │
  ▼
── HUMAN GATE 1 (waitForTaskToken) ──────────────────────────────────
    Notify Lambda stores: gate1 payload in cache
    User reviews assumption cards, clicks Proceed
    Resume Lambda unblocks SFN with confirmed_assumptions
────────────────────────────────────────────────────────────────────
  │
  ▼
[3] Adversary Agent  (claude-sonnet-4-6)
    Input:  { idea_summary, validated_assumptions: confirmed_assumptions }
    Output: { top_risks[2–5], hardest_question, steelman_counterplan }
  │
  ▼
── HUMAN GATE 2 (waitForTaskToken) ──────────────────────────────────
    Notify Lambda stores: gate2 payload in cache
    User reads adversary output, selects track, clicks Proceed
    Resume Lambda unblocks SFN with chosen_track
────────────────────────────────────────────────────────────────────
  │
  ▼
[4] Planner Agent  (claude-sonnet-4-6)
    Input:  { idea_summary, validated_assumptions, adversary_output, user_track, revision_instructions: null }
    Output: { plan_title, tension_warning, plan{day_30, day_60, day_90}, backup_plans, confidence_score }
  │
  ▼
[5] Critic Agent  (claude-haiku-4-5)
    Input:  { plan, idea_summary }
    Output: { scores{4 dims}, overall, revision_needed, revision_instructions, top_improvement }
  │
  ├─ revision_needed == false ──────────────────────────→ [Done]
  │
  └─ revision_needed == true
       │
       ▼
[4R] Planner Revision  (claude-sonnet-4-6) — ONE iteration only
     Input:  (all original Planner inputs) + { revision_instructions }
     Output: revised PlanOutput
       │
       ▼
     [Done] — Critic does NOT re-score the revised plan
  │
  ▼
Notify Lambda stores: output payload in cache
Frontend poll receives final result → Output screen rendered
```

### 5.2 Per-Agent Configuration Table

| Agent | Lambda Name | Bedrock Model ID | max_tokens | Temperature | Input Schema | Output Schema |
|-------|------------|-----------------|-----------|-------------|-------------|--------------|
| Excavator | `excavator` | `anthropic.claude-sonnet-4-6` | 1500 | default | `{ user_idea: str, session_id: str }` | ExcavatorOutput |
| Research | `research` | `anthropic.claude-haiku-4-5-20251001` | 1500 | default | `{ assumption: Assumption, session_id: str }` | ResearchOutput |
| Adversary | `adversary` | `anthropic.claude-sonnet-4-6` | 1500 | default | `{ idea_summary: str, validated_assumptions: ConfirmedAssumption[] }` | AdversaryOutput |
| Planner | `planner` | `anthropic.claude-sonnet-4-6` | 1500 | default | `{ idea_summary, validated_assumptions, adversary_output, user_track, revision_instructions }` | PlanOutput |
| Critic | `critic` | `anthropic.claude-haiku-4-5-20251001` | 1500 | default | `{ plan: PlanOutput, idea_summary: str }` | CriticOutput |

**Shared Bedrock API call contract (all agents):**
```python
response = bedrock.invoke_model(
    modelId=model_id,
    body=json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1500,
        "system": AGENT_SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user_prompt}],
    })
)
text = json.loads(response["body"].read())["content"][0]["text"]
result = json.loads(text)   # ← raises on non-JSON → HTTP 500 → SFN retry
```

**Why default temperature?** Claude's default temperature produces appropriately varied outputs for planning tasks without over-randomising structured JSON. Setting temperature=0 would make identical ideas produce identical plans, reducing the system's apparent intelligence during demos.

**Why 1500 max_tokens for all agents?** The largest expected output (Planner) fits comfortably in 1500 tokens. Haiku agents (Research, Critic) output much less; the shared limit simplifies configuration.

### 5.3 RAG Routing Decision Tree

The Research Agent follows this routing logic for each assumption:

```
                    assumption_text
                          │
                          ▼
              ┌─────────────────────────┐
              │  Query Weaviate         │
              │  RealWorldFact: limit=3 │
              │  FailurePattern: limit=2│
              │  return_metadata=[      │
              │    "certainty"]         │
              └───────────┬─────────────┘
                          │
                          ▼
              max_certainty = max(o.metadata.certainty
                                  for o in all_results)
                          │
              ┌───────────┴───────────────┐
              │                           │
         certainty                   certainty
         >= 0.72                      < 0.72
              │                           │
              ▼                           ▼
      Use Weaviate evidence        Tavily API call:
      directly                     query = assumption_text
              │                     + " startup statistics"
              │                     max_results = 3
              │                           │
              │                           ▼
              │                   ┌──────────────────┐
              │                   │  Write-back to   │
              │                   │  RealWorldFact   │
              │                   │  top min(2,N)    │
              │                   │  results         │
              │                   │  confidence=0.65 │
              │                   └────────┬─────────┘
              │                            │
              └──────────┬─────────────────┘
                         │
                         ▼
              Build evidence_text string:
              "\n".join([f"- {e['text']} (source: {e['source']})"
                          for e in evidence])
                         │
                         ▼
              Call claude-haiku-4-5 with Research system prompt
              + assumption + evidence_text
                         │
                         ▼
              Return ResearchOutput JSON
```

**Confidence_Threshold configuration:**
- Environment variable: `CONFIDENCE_THRESHOLD`
- Default: `"0.72"`
- Read at Lambda cold-start: `float(os.environ.get("CONFIDENCE_THRESHOLD", "0.72"))`
- Changing this value requires only an environment variable update — no code deploy.
- Value 0.72 was chosen to allow Weaviate's pre-populated corpus to serve most common
  startup/career/education assumptions while triggering web search for niche queries.

### 5.4 Revision Loop Contract

The Planner–Critic–PlannerRevision loop has strict invariants:

| Invariant | Description |
|-----------|-------------|
| Maximum 1 revision | PlannerRevision state goes directly to Done — there is no second CheckRevision |
| Critic does NOT re-score | After PlannerRevision, the Critic is not invoked again |
| Final output always includes original Critic scores | Even for revised plans, the CriticOutput from the first scoring round is included in the output payload |
| Revision uses all original context | PlannerRevision receives: idea_summary, validated_assumptions, adversary_output, user_track, AND revision_instructions |
| revision_instructions is never null on revision | If the Critic sets revision_needed=true, revision_instructions must be a non-null string; the Planner system prompt should treat a null revision_instructions as no-revision context |

**Revision trigger condition:** `critic_output.overall < 7`  
This is enforced by the CheckRevision Choice state:
```json
{
  "Variable": "$.critic_output.revision_needed",
  "BooleanEquals": true,
  "Next": "PlannerRevision"
}
```

### 5.5 Track-Specific Planning Logic

The Planner Agent receives `user_track` as one of three values. The system prompt instructs Claude to adjust milestone focus accordingly:

| Track value | Internal name | Day 30 focus | Day 60 focus | Day 90 focus |
|------------|--------------|-------------|-------------|-------------|
| `prototype` | Full speed ahead | MVP feature scope + first deploy | Real user feedback loop + iteration | Paying/active users + growth signal |
| `find_a_user` | Find a user first | ICP definition + 5 user interviews | Problem validation + solution prototype | Evidence of demand + go/no-go decision |
| `invalidate` | Rethink the core | Hypothesis definition + cheapest test | Pivot hypothesis testing + evidence | Validated pivot direction or kill decision |

**Tension warning logic:** If the Planner detects that the chosen track conflicts with a critical or high-severity adversary risk, it sets `tension_warning` to a non-null string explaining the conflict. For example, choosing `prototype` when the Adversary flagged a critical market-need risk triggers: *"Warning: building before validating demand conflicts with the critical market risk identified."*

The tension warning is advisory — it does not block the user from proceeding, satisfying NFR-19.

### 5.6 Error Handling for Agent Lambdas

| Failure scenario | Handling |
|-----------------|----------|
| `bedrock.invoke_model` raises exception | Lambda returns HTTP 500 → SFN built-in retry (3 attempts, 2s initial interval, exponential backoff) |
| `json.loads(response_text)` raises `JSONDecodeError` | Lambda returns HTTP 500 → SFN retry (Claude returned non-JSON; retrying usually resolves this) |
| Weaviate query raises exception | Log warning, set evidence = [] and score = 0.0, proceed to Tavily fallback |
| Tavily API raises exception | Log warning, set evidence = [] from Weaviate, proceed with empty evidence set |
| Tavily returns 0 results | No write-back; proceed with available Weaviate evidence (may be low confidence) |
| Step Functions exhausts 3 retries | SFN transitions to Fail state; frontend poll times out after 60s; user sees retry prompt |

**JSON parse failure — the most common agent error:**  
Claude occasionally wraps JSON in markdown code fences (```json ... ```) despite explicit "no markdown" instructions. The system prompts must include: *"Return ONLY valid JSON, no markdown, no preamble."* If this still occurs in testing, add a pre-parse cleanup step:
```python
text = text.strip()
if text.startswith("```"):
    text = text.split("```")[1]
    if text.startswith("json"):
        text = text[4:]
result = json.loads(text)
```


---

## 6. Deployment Architecture

**Owner: Soham**

### 6.1 AWS Resource Inventory

| Resource Type | Name | Key Configuration |
|--------------|------|------------------|
| API Gateway | `IdeaStress-API` | REST API, regional, prod stage |
| Step Functions | `IdeaStress-StateMachine` | Standard workflow, Express not used (human gate wait > 5min possible) |
| Lambda | `excavator` | Python 3.12, 512 MB, 30s timeout |
| Lambda | `research` | Python 3.12, 256 MB, 30s timeout |
| Lambda | `adversary` | Python 3.12, 512 MB, 30s timeout |
| Lambda | `planner` | Python 3.12, 512 MB, 30s timeout |
| Lambda | `critic` | Python 3.12, 256 MB, 15s timeout |
| Lambda | `resume-gate` | Python 3.12, 128 MB, 10s timeout |
| Lambda | `status` | Python 3.12, 128 MB, 10s timeout |
| Lambda | `notify` | Python 3.12, 128 MB, 10s timeout |
| IAM Role | `IdeaStress-LambdaRole` | Attached to all agent Lambdas |
| IAM Role | `IdeaStress-SFNRole` | Attached to Step Functions to invoke Lambdas |
| Weaviate Cloud | `ideastress-cluster` | Free tier, nearest region to us-east-1 |
| OpenAI API | — | External; key stored in Lambda env vars |
| Tavily API | — | External; key stored in Lambda env vars |

**Total AWS resources: 10 Lambdas + 1 SFN + 1 API Gateway + 2 IAM Roles**  
This is achievable in a single afternoon of infrastructure setup.

### 6.2 Lambda Function Configuration Table

| Function | Memory | Timeout | Why This Config |
|---------|--------|---------|----------------|
| `excavator` | 512 MB | 30s | Bedrock call + Weaviate writes; Sonnet can take 10–15s |
| `research` | 256 MB | 30s | Haiku is fast; Weaviate + Tavily can add latency |
| `adversary` | 512 MB | 30s | Sonnet reasoning on complex risk analysis |
| `planner` | 512 MB | 30s | Sonnet generating long structured JSON |
| `critic` | 256 MB | 15s | Haiku scoring is fast; smaller output |
| `resume-gate` | 128 MB | 10s | Simple pass-through; no heavy compute |
| `status` | 128 MB | 10s | Cache read only; no external calls |
| `notify` | 128 MB | 10s | Cache write only; no external calls |

### 6.3 Environment Variables Per Lambda

**Agent Lambdas** (excavator, research, adversary, planner, critic):

| Variable | Description | Example Value |
|---------|-------------|---------------|
| `WEAVIATE_URL` | Weaviate Cloud cluster URL | `https://xxx.weaviate.network` |
| `WEAVIATE_API_KEY` | Weaviate API key | `abc123...` |
| `OPENAI_API_KEY` | OpenAI API key (for text2vec-openai) | `sk-...` |
| `TAVILY_API_KEY` | Tavily Search API key | `tvly-...` |
| `CONFIDENCE_THRESHOLD` | RAG fallback threshold | `0.72` |

**resume-gate Lambda:**

| Variable | Description |
|---------|-------------|
| `STATE_MACHINE_ARN` | Full ARN of the IdeaStress state machine |

**status Lambda:** No additional environment variables required. The in-process cache is populated by the notify Lambda during the same execution environment lifecycle.

**Security note:** All values are stored as Lambda environment variables in plaintext in the AWS console for hackathon speed. Post-hackathon, migrate to AWS Secrets Manager and read at cold-start.

### 6.4 IAM Roles and Permissions

**IdeaStress-LambdaRole** (attached to all 8 Lambda functions):

| Permission | Resource | Purpose |
|-----------|---------|---------|
| `bedrock:InvokeModel` | `arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-*` | Call Claude models |
| `states:StartExecution` | IdeaStress-StateMachine ARN | Start new executions (excavator-trigger) |
| `states:DescribeExecution` | IdeaStress-StateMachine ARN | Not used in MVP; useful for debugging |
| `states:SendTaskSuccess` | IdeaStress-StateMachine ARN | Resume human gates (resume-gate Lambda) |
| `logs:CreateLogGroup` | `*` | CloudWatch logging |
| `logs:CreateLogStream` | `*` | CloudWatch logging |
| `logs:PutLogEvents` | `*` | CloudWatch logging |

**IdeaStress-SFNRole** (attached to the Step Functions state machine):

| Permission | Resource | Purpose |
|-----------|---------|---------|
| `lambda:InvokeFunction` | All 8 Lambda function ARNs | SFN invokes all Task and notify states |

**Hackathon simplification:** A single IAM role covers all 8 Lambdas. Post-hackathon, split into per-function roles with least-privilege (e.g., `resume-gate` only needs `SendTaskSuccess`, not `InvokeModel`).

### 6.5 API Gateway Route Table

| Method | Resource Path | Integration Type | Target | Notes |
|--------|--------------|-----------------|--------|-------|
| `POST` | `/start` | Lambda Proxy | `excavator-trigger` Lambda | |
| `GET` | `/status` | Lambda Proxy | `status` Lambda | Query params: executionArn, gate |
| `POST` | `/resume` | Lambda Proxy | `resume-gate` Lambda | |
| `OPTIONS` | `/{proxy+}` | Mock | — | Returns CORS headers |
| `OPTIONS` | `/start` | Mock | — | Returns CORS headers |
| `OPTIONS` | `/status` | Mock | — | Returns CORS headers |
| `OPTIONS` | `/resume` | Mock | — | Returns CORS headers |

**CORS mock integration response template (all OPTIONS):**
```
Status: 200
Headers:
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token
  Access-Control-Allow-Methods: GET,POST,OPTIONS
  Content-Type: application/json
Body: {}
```

**Stage:** `prod` (deployed immediately; no separate staging environment for the hackathon).

### 6.6 Step Functions ASL State Machine Structure

The state machine is described here as a prose/table specification. The actual ASL JSON is generated from this spec.

**State Machine name:** `IdeaStress-StateMachine`  
**Type:** Standard (not Express — Standard supports the waitForTaskToken pattern with unlimited wait duration)  
**Start state:** `Excavator`

| State Name | State Type | Description | Next State | On Error |
|-----------|-----------|-------------|-----------|---------|
| `Excavator` | Task | Invokes `excavator` Lambda. ResultPath: `$.excavator_output`. | `ResearchParallel` | Retry 3×, then Fail |
| `ResearchParallel` | Map | Iterates over `$.excavator_output.assumptions`. MaxConcurrency: 5. Each item invokes `research` Lambda. ResultPath: `$.validated_assumptions`. | `HumanGate1` | Retry 3×, then Fail |
| `HumanGate1` | Task (waitForTaskToken) | Invokes `notify` Lambda with task token, gate="gate1", validated_assumptions, idea_summary. ResultPath: `$.gate1_output`. | `Adversary` | Retry 3×, then Fail |
| `Adversary` | Task | Invokes `adversary` Lambda with idea_summary and gate1_output.confirmed_assumptions. ResultPath: `$.adversary_output`. | `HumanGate2` | Retry 3×, then Fail |
| `HumanGate2` | Task (waitForTaskToken) | Invokes `notify` Lambda with task token, gate="gate2", adversary_output, idea_summary. ResultPath: `$.gate2_output`. | `Planner` | Retry 3×, then Fail |
| `Planner` | Task | Invokes `planner` Lambda with idea_summary, confirmed_assumptions, adversary_output, user_track, revision_instructions=null. ResultPath: `$.plan_output`. | `Critic` | Retry 3×, then Fail |
| `Critic` | Task | Invokes `critic` Lambda with plan and idea_summary. ResultPath: `$.critic_output`. | `CheckRevision` | Retry 3×, then Fail |
| `CheckRevision` | Choice | If `$.critic_output.revision_needed == true` → PlannerRevision. Default → NotifyOutput. | — | — |
| `PlannerRevision` | Task | Re-invokes `planner` Lambda with original inputs + revision_instructions. ResultPath: `$.plan_output`. | `NotifyOutput` | Retry 3×, then Fail |
| `NotifyOutput` | Task | Invokes `notify` Lambda with gate="output", plan_output, critic_output, idea_summary. | `Done` | Retry 3×, then Fail |
| `Done` | Pass | End state. | — | — |
| `PipelineFail` | Fail | Catch state for unrecoverable errors. | — | — |

**Retry configuration (all Task states):**
```
Retriers:
  - ErrorEquals: ["Lambda.ServiceException", "Lambda.AWSLambdaException",
                  "Lambda.SdkClientException", "States.TaskFailed"]
    IntervalSeconds: 2
    MaxAttempts: 3
    BackoffRate: 2.0
Catcher:
  - ErrorEquals: ["States.ALL"]
    Next: "PipelineFail"
```

### 6.7 Status Lambda Polling Cache Design

**Problem:** The frontend polls `GET /status` to detect when a Human Gate is ready. The `notify` Lambda (invoked by SFN) and the `status` Lambda (invoked by API Gateway) are separate Lambda functions — they cannot share state via function arguments.

**Solution for hackathon:** In-process dictionary in the `status` Lambda.

```python
# Inside status Lambda module — module-level variable (survives across invocations
# within the same execution environment / warm container)
_GATE_CACHE = {}   # key: "{executionArn}#{gate}", value: full ready payload

# Notify Lambda writes to this cache by directly updating the module-level dict
# via an internal Lambda invoke:

# notify Lambda calls status Lambda internally via boto3.client("lambda").invoke()
# This is a synchronous internal call — the notify Lambda invokes the status Lambda
# with a special "write" action to populate the cache.
```

**Alternative (simpler for hackathon):** Both `notify` and `status` Lambdas can be the SAME Lambda function with an action dispatcher:

```python
def handler(event, context):
    action = event.get("action") or event.get("httpMethod")
    if action == "WRITE_CACHE":
        # Called by Step Functions notify state
        _GATE_CACHE[event["cache_key"]] = event["payload"]
        return {"statusCode": 200}
    elif action == "GET":
        # Called by API Gateway GET /status
        ...
```

**Recommended approach for the hackathon:** Combine `notify` and `status` into a single Lambda function `gate-status` with an action dispatcher. This eliminates the cross-Lambda invocation complexity and ensures the cache is always in the same execution environment.

**Cache key format:** `{executionArn}#{gate}`  
Example: `arn:aws:states:us-east-1:123:execution:IdeaStress:run-001#gate1`

**Cache lifetime:** Entries are never explicitly deleted (no TTL in hackathon MVP). The Lambda execution environment is recycled by AWS after ~15 minutes of inactivity, which naturally clears the cache. For a demo session, the same warm container serves all polls from the same browser session.

**Known limitation:** If the Lambda cold-starts between the `notify` write and the frontend poll, the cache entry is lost and the frontend sees `{ "ready": false }` indefinitely. Mitigation: keep the Lambda warm by ensuring the frontend's continuous 2-second polling keeps the container alive. Post-hackathon, replace with DynamoDB or ElastiCache.

### 6.8 Setup Sequence Checklist (7 Steps)

Complete these in order before the demo:

| Step | Action | Owner | Est. Time | Done |
|------|--------|-------|-----------|------|
| 1 | Create Weaviate Cloud cluster. Run `weaviate_schema.py` to create 3 collections. Verify with Weaviate Cloud console. | Samruddhi | 30 min | ☐ |
| 2 | Run `batch_ingest.py` to pre-populate corpus. Verify: ≥15 RealWorldFact, ≥10 FailurePattern records visible in console. | Samruddhi | 30 min | ☐ |
| 3 | Deploy all 8 Lambda functions with environment variables. Test each individually with the AWS console test feature using mock inputs. | Soham | 2 hrs | ☐ |
| 4 | Create Step Functions state machine. Paste the ASL definition. Test with a manual `start_execution` call from the AWS console. | Soham | 30 min | ☐ |
| 5 | Configure API Gateway routes and CORS. Deploy to `prod` stage. Test each endpoint with curl or Postman. | Soham | 45 min | ☐ |
| 6 | Update `API_BASE` constant in Frontend (`src/App.jsx` or equivalent) to the API Gateway prod URL. Run `npm run build`. | Joshita | 15 min | ☐ |
| 7 | Run one full end-to-end test execution using Example Prompt 1. Verify all 4 screens render correctly. Fix any integration issues. | Full team | 30 min | ☐ |

**Total infrastructure setup time estimate: ~4.5 hours**  
This is achievable in the first morning of the hackathon, leaving the afternoon for polish.

### 6.9 Free-Tier Capacity Analysis

#### Weaviate Cloud (Free Tier)
- **Storage:** Free tier provides ~1 GB storage — sufficient for 500–2000 records.
- **Requests:** No hard rate limit documented for Weaviate Cloud free tier queries.
- **Demo load:** Up to 20 concurrent executions × 5 Weaviate queries per execution = 100 concurrent queries.
- **Assessment:** Free tier is sufficient for the demo. No HTTP 429 expected.
- **Risk:** If Weaviate free tier has undocumented limits, reduce corpus to 50 records and rely more on Tavily.

#### Tavily Search API (Free Tier)
- **Limit:** 1,000 API calls per month on the free tier.
- **Demo load:** Each execution triggers Tavily only for assumptions with low Weaviate confidence. With a well-seeded corpus, expect ≤2 Tavily calls per execution.
- **For 20 demo executions:** ≤40 Tavily calls — well within the 1,000/month limit.
- **Assessment:** Free tier is sufficient for the demo.

#### Amazon Bedrock
- **Pricing:** Claude Sonnet 4.6 at ~$3/MTok input; Haiku 4.5 at ~$0.25/MTok input.
- **Demo load:** ~20 executions × average 3,000 tokens per Sonnet call × 3 Sonnet agents ≈ 180K tokens ≈ **$0.54**.
- **Assessment:** Demo cost is under $5 total — within any reasonable hackathon budget.

#### OpenAI Embeddings (text-embedding-3-small)
- **Pricing:** $0.02/MTok.
- **Demo load:** Corpus ingestion (500 records × ~100 tokens each) = 50K tokens ≈ **$0.001**.
- **Assessment:** Negligible cost.

### 6.10 Hackathon Constraints and Post-Hackathon Migration Notes

#### Active Hackathon Constraints

| Constraint | Reason | Post-Hackathon Fix |
|-----------|--------|-------------------|
| No custom domain | Saves DNS setup time | Configure Route 53 + ACM certificate |
| `CORS: *` wildcard | Simplifies frontend development | Restrict to specific frontend domain |
| Single IAM role for all Lambdas | Saves IAM design time | Least-privilege per-function roles |
| In-process Lambda cache | Avoids DynamoDB setup | Replace with DynamoDB or ElastiCache |
| No gate timeout in SFN | Prevents demo failures | Add 10-minute HeartbeatSeconds |
| No browser state persistence | Avoids edge-case handling | localStorage persistence with TTL |
| No plan export | Out of scope | PDF export via react-pdf or Notion API |
| Env vars in plain Lambda config | Fast to set up | Migrate to AWS Secrets Manager |
| Single execution environment assumption for cache | Works for single-demo session | Centralised cache service |
| No monitoring / alerting | Time constraint | CloudWatch dashboard + SNS alerts |

#### Post-Hackathon Migration Priority

1. **Replace in-process cache with DynamoDB** — eliminates the most critical reliability gap.
2. **Add Cognito or Clerk authentication** — enables persistent session history.
3. **Migrate secrets to Secrets Manager** — essential before any public launch.
4. **Add CloudWatch dashboards** — visibility into agent latency and failure rates.
5. **Implement corpus scraper** (Samruddhi's `scraper.py`) — improves RAG quality significantly.
6. **Add gate timeout (HeartbeatSeconds)** — prevents zombie SFN executions.
7. **Restrict CORS to production domain** — basic security hygiene.


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The IdeaStress pipeline involves several pure functions and deterministic logic rules that are excellent candidates for property-based testing. The following properties derive from acceptance criteria analysis — each is universally quantified and testable with a property-based testing library (e.g., Hypothesis for Python).

---

### Property 1: Research results count equals assumption count

*For any* list of N assumptions passed to the ResearchParallel Map state (where 1 ≤ N ≤ 8), the pipeline must return exactly N research output objects, each with a distinct `assumption_id` matching one of the input assumptions.

**Validates: Requirements 1.3, 5.4**

---

### Property 2: Revision loop executes at most once

*For any* Critic output with `overall < 7` (i.e., `revision_needed = true`), the state machine invokes the Planner Agent exactly twice total (once originally, once for revision) and the Critic Agent exactly once. Regardless of the quality of the revised plan, no further Planner or Critic invocations occur.

**Validates: Requirements 1.5, 5.11, FR-44, FR-52**

---

### Property 3: Schema creation is idempotent

*For any* state of the Weaviate cluster (with 0, 1, 2, or all 3 collections pre-existing in any combination), executing the schema creation function must always terminate without raising an exception and must result in all three collections (`RealWorldFact`, `UserAssumption`, `FailurePattern`) existing in the cluster.

**Validates: Requirements 2.9, NFR-27**

---

### Property 4: Tavily write-back count equals min(2, N)

*For any* Tavily API response containing N results (where N ≥ 0), the number of new records inserted into the `RealWorldFact` Weaviate collection must equal exactly `min(2, N)`. All inserted records must have `confidence = 0.65`, `recency_year = 2025`, and `source` set to the result's URL.

**Validates: Requirements 2.10, FR-17**

---

### Property 5: Session_ID UUID v4 invariant

*For any* pipeline execution, the `session_id` generated at execution start must be a valid UUID v4 string. Every `UserAssumption` record written during that execution must have a `session_id` property equal to the UUID v4 generated at execution start — no write may use a different session_id or null.

**Validates: Requirements 2.11, 4.2, 4.3, FR-10, FR-11**

---

### Property 6: Excavator output enumeration invariants

*For any* non-empty, non-whitespace idea text submitted to the Excavator Agent, the output must contain between 4 and 8 assumptions inclusive; every assumption's `type` field must be one of `{timeline, market_size, skill, cost, user_behavior, competition}`; every assumption's `optimism_level` must be one of `{aggressive, moderate, conservative}`.

**Validates: Requirements 2.12, 5.4, FR-06, FR-08, FR-09**

---

### Property 7: Empty and whitespace idea input is rejected

*For any* string composed entirely of whitespace characters (spaces, tabs, newlines) or the empty string, submitting that string to `POST /start` must return HTTP 400. No Step Functions execution must be started for such an input.

**Validates: Requirements 3.1, FR-03**

---

### Property 8: Invalid gate parameter is rejected

*For any* string that is not one of `"gate1"`, `"gate2"`, or `"output"`, calling `GET /status` with `gate=<string>` must return HTTP 400. This includes null, empty string, case variants like `"Gate1"`, and arbitrary strings.

**Validates: Requirements 3.2**

---

### Property 9: Absent or empty task_token is rejected

*For any* `POST /resume` request where the `task_token` field is absent, null, or an empty string, the endpoint must return HTTP 400 without invoking `sfn.send_task_success`. This must hold regardless of whether the `gate` and `payload` fields are valid.

**Validates: Requirements 3.3, 3.11, NFR-13**

---

### Property 10: Agent Bedrock responses are always valid JSON

*For any* valid agent input, each agent Lambda function (Excavator, Research, Adversary, Planner, Critic) must return a response body that is parseable as JSON via `json.loads` without raising a `JSONDecodeError`. If `json.loads` raises, the Lambda must propagate an exception (not swallow it) so that Step Functions can trigger its built-in retry policy.

**Validates: Requirements 5.3, 5.14**

---

### Property 11: Research output values are within defined ranges

*For any* Research Agent invocation with a valid assumption input, the output must satisfy: `confidence_score ∈ [0.0, 1.0]`; `verdict ∈ {optimistic, realistic, conservative}`; `risk_level ∈ {high, medium, low}`; `sources` is a non-null list (may be empty).

**Validates: Requirements 5.6, FR-13, FR-14**

---

### Property 12: Adversary top_risks count is within bounds

*For any* Adversary Agent invocation with a non-empty confirmed_assumptions list, the output must contain between 2 and 5 risk items in `top_risks` inclusive. Each risk item's `severity` must be one of `{critical, high, medium}`.

**Validates: Requirements 5.7, FR-26, FR-27**

---

### Property 13: Critic revision_needed is equivalent to overall < 7

*For any* Critic Agent invocation, `revision_needed` must be `true` if and only if `overall < 7`. This equivalence must hold for every possible overall score in [0, 10]. Additionally, if `revision_needed` is `true`, `revision_instructions` must be a non-null, non-empty string.

**Validates: Requirements 5.10, FR-42, FR-43**

---

### Property 14: Concurrent sessions are fully isolated

*For any* two concurrent pipeline executions with distinct session_ids A and B, a Weaviate `UserAssumption` query filtered by `session_id = A` must return zero objects with `session_id = B`, and vice versa. This must hold regardless of how similar the assumption texts are between the two sessions.

**Validates: Requirements 4.6, NFR-30**

---

### Property 15: Polling cache key format is deterministic

*For any* `executionArn` string and `gate` string, the cache key generated by the notify/status Lambda must be exactly the string `f"{executionArn}#{gate}"`. This is a pure function that must produce the same output for the same inputs and must not include any random, timestamp, or environment-dependent components.

**Validates: Requirements 6.8**

---

## Error Handling

### 8.1 Error Hierarchy

```
Level 1 — Input validation (handled in Lambda, return HTTP 400)
  ├── Empty/whitespace user_idea → POST /start returns 400
  ├── Missing executionArn → GET /status returns 400
  ├── Invalid gate value → GET /status returns 400
  ├── Missing/empty task_token → POST /resume returns 400
  └── Missing session_id in downstream Lambda event → return 400, no Weaviate write

Level 2 — Agent/LLM failures (handled by SFN retry)
  ├── Bedrock invoke_model throws → Lambda exception → SFN retry (3×, 2s backoff)
  ├── json.loads(response) raises JSONDecodeError → Lambda exception → SFN retry
  └── After 3 retries → SFN Fail state → frontend timeout → user retry prompt

Level 3 — External service degradation (graceful degradation, no user error shown)
  ├── Weaviate query throws → log warning, proceed with empty evidence → Tavily fallback
  ├── Tavily API throws → log warning, proceed with available evidence (may be low confidence)
  └── Tavily returns 0 results → proceed without web evidence, do not write to Weaviate

Level 4 — Frontend timeout (polling exhausted)
  └── 30 polls × 2s = 60s with no ready signal
       → Display: "Analysis is taking longer than expected. Please return to
                   the start screen and resubmit your idea."
       → Navigate to InputScreen
       → SFN execution continues server-side (harmless zombie)
```

### 8.2 Error Response Format

All Lambda functions that serve HTTP traffic (via API Gateway) return errors in this format:

```json
{
  "statusCode": 400,
  "headers": {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  },
  "body": "{\"error\": \"<human-readable message>\"}"
}
```

Note: `body` is always a JSON-encoded string (not an object) due to API Gateway Lambda Proxy integration requirements.

### 8.3 Agent Error Conventions

| Scenario | Lambda action | SFN action | Frontend experience |
|---------|--------------|------------|-------------------|
| Bedrock call fails (network, throttle) | Raise exception | Retry 3× with backoff | Loading indicator continues |
| Bedrock returns non-JSON | Raise exception | Retry 3× with backoff | Loading indicator continues |
| Retries exhausted | — | Transition to Fail state | Poll timeout → user error |
| Weaviate unavailable | Log, use empty evidence | None (graceful) | Unaffected |
| Tavily unavailable | Log, use Weaviate only | None (graceful) | Unaffected |
| Session_ID absent in Lambda event | Return HTTP 400 | SFN retries, then Fail | Poll timeout → user error |

---

## Testing Strategy

### 9.1 Testing Philosophy

The IdeaStress hackathon MVP uses a pragmatic testing approach optimised for demo
reliability within a 48-hour timeline. The goal is to catch integration-breaking bugs
before the demo — not to achieve full coverage.

**Priority order:**
1. End-to-end happy path test (single full execution with the demo prompts)
2. Property-based tests for pure logic functions (agent output validation, routing logic)
3. Unit tests for Lambda input validation and error paths
4. Manual smoke tests for infrastructure (Weaviate schema, API Gateway CORS)

### 9.2 Property-Based Testing

**Library:** Hypothesis (Python) — `pip install hypothesis`  
**Configuration:** Each property test runs minimum 100 iterations (`@settings(max_examples=100)`).  
**Tag format:** `# Feature: ideastress-system-design, Property N: <property_text>`

The 15 correctness properties in Section 7 should each be implemented as a single
Hypothesis test. Priority order for the hackathon:

| Priority | Property | Why High Priority |
|---------|---------|-----------------|
| P1 | Excavator enumeration invariants | Incorrect enums break downstream agents |
| P2 | Critic revision_needed ↔ overall < 7 | Revision loop bug could cause infinite state |
| P3 | Research output value ranges | Bad confidence_score breaks frontend bars |
| P4 | Tavily write-back count | Off-by-one bug would pollute corpus |
| P5 | Session_ID UUID v4 invariant | Session leak would cross-contaminate users |

### 9.3 Unit Testing

**Framework:** pytest  
**Focus areas:**

| Test Category | What to Test | Count |
|--------------|-------------|-------|
| Input validation | Empty/whitespace idea → 400; missing params → 400; empty task_token → 400 | 6–8 tests |
| Cache key format | Correct `{arn}#{gate}` formatting with various ARN formats | 3–4 tests |
| Confidence threshold | Values above/below 0.72 route correctly | 2–3 tests |
| Write-back count | 0, 1, 2, 3 Tavily results → correct insert count | 4 tests |
| JSON parse error | Mock Bedrock returning non-JSON → Lambda raises exception | 5 tests (one per agent) |

### 9.4 Integration Tests

Run after full infrastructure is deployed (Step 7 of setup checklist):

| Test | Description | Pass Criteria |
|------|-------------|--------------|
| Full happy path (Prompt 1) | Submit "I'll build a SaaS app in 2 weeks..." | All 4 screens render; plan generated |
| Full happy path (Prompt 2) | Submit "Learn ML in a month..." | All 4 screens render; plan generated |
| Gate 1 resume | Submit, wait for gate1, call POST /resume | Pipeline continues to gate2 |
| Gate 2 resume | All 3 track values | Pipeline continues to output |
| Revision loop | Submit a deliberately vague idea likely to score < 7 | Critic triggers PlannerRevision; output has revised plan |
| Timeout handling | Submit and do not resume gate | Frontend shows error after 60s |

### 9.5 Smoke Tests (Pre-Demo Checklist)

Run 30 minutes before demo presentation:

- [ ] `weaviate_schema.py` runs without error on live cluster
- [ ] `batch_ingest.py` shows correct record counts in Weaviate console
- [ ] `POST /start` returns executionArn and session_id
- [ ] `GET /status` returns `{ ready: false }` before gate is reached
- [ ] Lambda functions visible in AWS console with all env vars set
- [ ] Step Functions state machine shows execution running after POST /start
- [ ] Full pipeline completes with Example Prompt 1 in < 90 seconds
- [ ] Output screen renders plan title, critic scores, first step, 3 phases

