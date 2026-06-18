# Requirements Document

## Introduction

This document specifies the requirements for the **IdeaStress System Design** — a set of
six technical design artifacts that together define how the IdeaStress: Zero-to-One
Builder is architected, deployed, and operated as a hackathon MVP. The artifacts are:

1. **System Architecture** — end-to-end component and data-flow design
2. **Database Design** — Weaviate schema, collection structure, and corpus strategy
3. **API Specification** — all HTTP endpoints exposed via API Gateway
4. **Authentication Flow** — session management without user accounts
5. **AI Integration Architecture** — agent pipeline, Bedrock model assignments, and RAG routing
6. **Deployment Architecture** — AWS infrastructure configuration for demo readiness

All design decisions must be achievable by a small student team within a 48-hour hackathon
and must satisfy every functional and non-functional requirement stated in
`docs/srs.md` (v1.0, June 18 2026).

---

## Glossary

- **API_Gateway**: The AWS API Gateway REST API that is the single entry point for all frontend HTTP calls.
- **Bedrock**: Amazon Bedrock, the managed service used to invoke Claude models.
- **Critic_Agent**: The fifth agent in the pipeline; scores the generated plan on four dimensions using Claude Haiku 4.5.
- **Excavator_Agent**: The first agent in the pipeline; extracts hidden assumptions from the user's free-text idea using Claude Sonnet 4.6.
- **Execution_ARN**: The Amazon Resource Name returned when a Step Functions execution is started; used by the frontend to poll for stage readiness.
- **FailurePattern**: The Weaviate collection that stores recurring startup/career failure patterns used by the Adversary and Critic agents.
- **Frontend**: The React/TypeScript single-page application served to the user's browser.
- **Human_Gate**: A Step Functions `waitForTaskToken` pause that blocks pipeline progress until the user explicitly confirms and resumes via the `/resume` endpoint.
- **Notify_Lambda**: A Lambda function invoked at each Human Gate to deliver the Task_Token and gate payload to the Frontend via the polling cache.
- **Pipeline**: The ordered sequence of five AI agents orchestrated by the State_Machine.
- **Planner_Agent**: The fourth agent; generates a track-specific 30/60/90-day plan using Claude Sonnet 4.6.
- **RealWorldFact**: The Weaviate collection storing ground-truth claims used for RAG validation by the Research Agent.
- **Research_Agent**: The second agent, run in parallel once per assumption; validates each assumption against Weaviate and Tavily using Claude Haiku 4.5.
- **Adversary_Agent**: The third agent; steelmans specific risks against the user's confirmed assumptions using Claude Sonnet 4.6.
- **Resume_Lambda**: The Lambda function backing the `/resume` endpoint that forwards the Task_Token to Step Functions to unblock a Human Gate.
- **Session_ID**: A UUID v4 generated per pipeline execution that scopes all writes to Weaviate and all polling keys; carries no user identity.
- **State_Machine**: The AWS Step Functions state machine that orchestrates the full Pipeline.
- **Status_Lambda**: The Lambda function backing the `/status` endpoint that the Frontend polls every 2 seconds to detect stage readiness.
- **Task_Token**: The opaque string issued by Step Functions at each `waitForTaskToken` state; must be returned verbatim to `SendTaskSuccess` to resume execution.
- **Tavily**: The Tavily Search API used as a web-search fallback when Weaviate cosine similarity is below the configured confidence threshold.
- **UserAssumption**: The Weaviate collection that stores per-session assumption data written by the Excavator Agent.
- **Weaviate**: The Weaviate Cloud vector database that stores the three collections.
- **Confidence_Threshold**: The configurable minimum cosine similarity score (default 0.72) below which the Research Agent falls back to Tavily.

---

## Requirements

### Requirement 1: System Architecture Design

**User Story:** As a student developer, I want a documented system architecture that maps every component, its technology, and the data flows between them, so that the team can implement each layer without ambiguity and demonstrate end-to-end flow during the demo.

#### Acceptance Criteria

1. THE System_Architecture_Document SHALL identify every component: Frontend, API_Gateway, State_Machine, Excavator_Agent, Research_Agent, Adversary_Agent, Planner_Agent, Critic_Agent, Notify_Lambda, Resume_Lambda, Status_Lambda, Weaviate, Bedrock, and Tavily.

2. THE System_Architecture_Document SHALL define the data flow for the happy-path pipeline from `POST /start` through all five agents and two Human Gates to the final output delivered to the Frontend.

3. WHEN the Research_Agent map state executes, THE System_Architecture_Document SHALL show each assumption being processed by an independent parallel invocation with a maximum concurrency of 5.

4. THE System_Architecture_Document SHALL define the `waitForTaskToken` pause-and-resume cycle for both Human_Gate 1 (after Research) and Human_Gate 2 (after Adversary), including the role of Notify_Lambda in storing the Task_Token for Frontend retrieval.

5. THE System_Architecture_Document SHALL document the Critic revision loop: the document SHALL state that the State_Machine re-invokes Planner_Agent exactly once when `revision_needed` is true, and that no further agent invocations occur after the revision regardless of the revised plan's score.

6. THE System_Architecture_Document SHALL map each agent to its assigned Bedrock model: Excavator_Agent, Adversary_Agent, and Planner_Agent to Claude Sonnet 4.6; Research_Agent and Critic_Agent to Claude Haiku 4.5.

7. THE System_Architecture_Document SHALL document all external service dependencies: Bedrock (region us-east-1), Weaviate Cloud (free tier), OpenAI embeddings API (text-embedding-3-small), and Tavily Search API.

8. THE System_Architecture_Document SHALL specify that all cross-origin requests are mediated by API_Gateway CORS headers and that no direct backend URL is exposed to the Frontend other than the API_Gateway base URL.

9. THE System_Architecture_Document SHALL note that each Lambda function is deployed independently to support independent versioning and hot-fix during the hackathon.

10. THE System_Architecture_Document SHALL document the Session_ID generation point (Excavator_Agent invocation) and explicitly state that Session_ID is included as a named field in the Step Functions execution input and passed unmodified through every downstream state's Parameters block so that every Weaviate write references the same Session_ID.

11. THE System_Architecture_Document SHALL be produced as a named, versioned section of the design document containing: (a) a component diagram listing all components from criterion 1 with their technology labels, and (b) a data-flow narrative describing each hop in the happy-path pipeline in ordered steps.

---

### Requirement 2: Database Design

**User Story:** As a developer responsible for the Weaviate layer, I want a precise database design document that defines every collection schema, property type, vectorisation strategy, and corpus pre-population plan, so that I can run `weaviate_schema.py` and `batch_ingest.py` exactly once before the demo without errors or schema conflicts.

#### Acceptance Criteria

1. THE Database_Design_Document SHALL define exactly three Weaviate collections: RealWorldFact, UserAssumption, and FailurePattern.

2. THE Database_Design_Document SHALL specify, for each collection, the full property list with property name, data type (TEXT, NUMBER, INT, BOOL), and whether the property is the primary vectorised field for semantic search.

3. THE Database_Design_Document SHALL specify that all three collections use the `text2vec-openai` vectoriser configured with model `text-embedding-3-small`.

4. THE Database_Design_Document SHALL define the vectorised (embedded) field per collection: `claim` for RealWorldFact, `assumption_text` for UserAssumption, and `pattern_description` for FailurePattern.

5. THE Database_Design_Document SHALL document the RealWorldFact schema with properties: `claim` (TEXT, vectorised), `domain` (TEXT), `source` (TEXT), `confidence` (NUMBER), `contradicts` (TEXT), and `recency_year` (INT).

6. THE Database_Design_Document SHALL document the UserAssumption schema with properties: `assumption_text` (TEXT, vectorised), `assumption_type` (TEXT), `optimism_level` (TEXT), `session_id` (TEXT), and `validated` (BOOL).

7. THE Database_Design_Document SHALL document the FailurePattern schema with properties: `pattern_description` (TEXT, vectorised), `failure_category` (TEXT), `frequency` (TEXT), `early_warning_signal` (TEXT), `backup_plan_hint` (TEXT), and `assumption_type` (TEXT).

8. THE Database_Design_Document SHALL specify the minimum corpus size required before the demo: at least 15 RealWorldFact records spanning startup, education, and career domains, and at least 10 FailurePattern records; each example prompt's key assumptions SHALL have at least one directly relevant record in each collection.

9. THE Database_Design_Document SHALL specify that `weaviate_schema.py` is idempotent: WHEN the script is executed against a cluster where a collection already exists, THE script SHALL skip creation of that collection and continue creating any remaining collections that do not yet exist, completing without raising an error.

10. WHEN the Research_Agent finds no Weaviate objects with cosine similarity ≥ the Confidence_Threshold for a given assumption, THE Database_Design_Document SHALL specify the write-back contract: IF Tavily returns 2 or more results, the top 2 results SHALL be inserted into RealWorldFact; IF Tavily returns exactly 1 result, that 1 result SHALL be inserted; IF Tavily returns 0 results, no write-back occurs. All inserted records use `confidence = 0.65`, `source = <result_url>`, and `recency_year = 2025`.

11. THE Database_Design_Document SHALL specify that `session_id` in UserAssumption is always a UUID v4 string and is the sole mechanism for scoping session data; no user-identity fields SHALL be stored in any collection.

12. THE Database_Design_Document SHALL include the enumerated allowed values for constrained TEXT fields: `assumption_type` ∈ {timeline, market_size, skill, cost, user_behavior, competition}; `optimism_level` ∈ {aggressive, moderate, conservative}; `failure_category` ∈ {timeline, technical, market, team}; `frequency` ∈ {very_common, common}.

---

### Requirement 3: API Specification

**User Story:** As the frontend developer, I want a complete API specification for every endpoint, including request and response schemas, HTTP methods, error codes, and CORS configuration, so that I can implement the polling and resume logic without asking the backend team for clarification.

#### Acceptance Criteria

1. THE API_Specification_Document SHALL define the `POST /start` endpoint: request body `{ "user_idea": string }`, successful response `{ "executionArn": string, "session_id": string }`, HTTP 400 for empty or whitespace-only input, and HTTP 500 for Step Functions invocation failure.

2. THE API_Specification_Document SHALL define the `GET /status` endpoint: required query parameter `executionArn` (string) and required query parameter `gate` (string, one of "gate1" | "gate2" | "output"); response `{ "ready": boolean, "payload": object | null }`; HTTP 400 if `executionArn` is absent or `gate` is not one of the three allowed values; HTTP 404 if `executionArn` is not found in the polling cache.

3. THE API_Specification_Document SHALL define the `POST /resume` endpoint: request body `{ "task_token": string, "gate": "gate1" | "gate2", "payload": object }`, successful response `{ "status": "resumed" }`, and HTTP 400 for a malformed or missing `task_token`.

4. THE API_Specification_Document SHALL define the gate-1 `POST /resume` payload schema: `{ "task_token": string, "confirmed_assumptions": ConfirmedAssumption[] }` where ConfirmedAssumption contains `assumption_id` (string), `assumption` (string), `confidence_score` (float), `verdict` (string), `evidence_summary` (string), `sources` (string[]), and `risk_level` ("high" | "medium" | "low").

5. THE API_Specification_Document SHALL define the gate-2 `POST /resume` payload schema: `{ "task_token": string, "chosen_track": "prototype" | "find_a_user" | "invalidate" }`.

6. THE API_Specification_Document SHALL define the gate-1 `GET /status` ready payload schema: `{ "task_token": string, "idea_summary": string, "validated_assumptions": ValidatedAssumption[] }` where ValidatedAssumption matches the ConfirmedAssumption schema from criterion 4.

7. THE API_Specification_Document SHALL define the gate-2 `GET /status` ready payload schema: `{ "task_token": string, "adversary_output": AdversaryOutput }`.

8. THE API_Specification_Document SHALL define the output `GET /status` ready payload schema: `{ "plan_output": PlanOutput, "critic_output": CriticOutput, "idea_summary": string }`.

9. THE API_Specification_Document SHALL specify that all endpoints return `Access-Control-Allow-Origin: *` headers in the hackathon configuration, with a note that this SHALL be restricted to the production frontend domain post-hackathon.

10. THE API_Specification_Document SHALL define the polling contract: THE Frontend SHALL issue `GET /status` requests at 2-second intervals. WHEN 30 consecutive attempts all return `{ "ready": false }`, THE Frontend SHALL stop polling and display a user-readable error message prompting the user to return to the Input Screen and resubmit their idea.

11. THE API_Specification_Document SHALL specify that `POST /resume` validates the `task_token` field to be a non-empty string before forwarding to Step Functions; IF the field is absent or empty, THE endpoint SHALL return HTTP 400 without invoking `SendTaskSuccess`.

12. THE API_Specification_Document SHALL define the full inline JSON schemas for `AdversaryOutput`, `PlanOutput`, and `CriticOutput` to serve as the contract between agent Lambda outputs and the Frontend rendering layer.

---

### Requirement 4: Authentication Flow

**User Story:** As a user, I want to use IdeaStress without creating an account or logging in, so that I can start analysing my idea immediately from any browser with no friction; and as a developer, I want the session model documented so that multiple concurrent users never see each other's data.

#### Acceptance Criteria

1. THE Authentication_Flow_Document SHALL specify that IdeaStress requires no user authentication: no login screen, no credentials, no cookies, and no tokens linked to user identity.

2. THE Authentication_Flow_Document SHALL define the Session_ID as the sole mechanism for scoping per-user pipeline data, generated as a UUID v4 by the Excavator_Agent Lambda at execution start and returned to the Frontend in the `POST /start` response.

3. WHEN the Excavator_Agent Lambda generates a Session_ID, THE Session_ID SHALL be embedded in the Step Functions execution input and propagated unchanged through all downstream states so that every Weaviate write is tagged with the same Session_ID. IF any downstream Lambda receives an invocation event without a valid UUID v4 `session_id` field, THAT Lambda SHALL return an HTTP 400 error to Step Functions without performing any Weaviate write.

4. THE Authentication_Flow_Document SHALL specify that the Frontend stores the Session_ID and Execution_ARN in component state (React `useState`) for the lifetime of the browser session only; neither value SHALL be persisted to `localStorage`, `sessionStorage`, or any cookie.

5. THE Authentication_Flow_Document SHALL specify that the Task_Token issued at each Human_Gate is stored server-side in the Status_Lambda polling cache keyed by `{executionArn}#{gate}` and delivered to the Frontend as part of the `GET /status` ready payload. The Frontend SHALL NOT store the Task_Token beyond the single `POST /resume` call that consumes it. IF `POST /resume` returns a non-200 response, the Task_Token remains valid server-side and is re-deliverable via the next successful `GET /status` poll for the same gate.

6. THE Authentication_Flow_Document SHALL specify that concurrent pipeline executions are fully isolated: two simultaneous users generate distinct Session_IDs and distinct Execution_ARNs; WHEN the Research_Agent queries UserAssumption objects, it SHALL apply a `session_id` equality filter so that zero objects from other sessions are returned. IF the filtered query returns zero results, THE Research_Agent SHALL treat this as an empty evidence set for that assumption and proceed to the Tavily fallback.

7. THE Authentication_Flow_Document SHALL specify that no personally identifiable information (PII) is stored anywhere in the system: Weaviate collections store only UUID Session_IDs, free-text idea content, and assumption data; API Gateway access logs shall not be used to correlate requests to individuals in the hackathon configuration.

8. IF a browser tab is closed or refreshed mid-pipeline, THEN the Step Functions execution SHALL continue running server-side. The Frontend SHALL lose all in-memory state (Session_ID, Execution_ARN, Task_Token) with no reconnect mechanism. The user SHALL be presented with the Input Screen and must resubmit their idea to begin a new pipeline execution; no partial results from the abandoned execution are recoverable.

---

### Requirement 5: AI Integration Architecture

**User Story:** As the AI/backend lead, I want an AI integration architecture document that specifies every agent's model, system prompt contract, input/output JSON schema, RAG routing logic, and the revision loop, so that I can implement all five Lambda functions and their prompts without re-reading the SRS mid-hackathon.

#### Acceptance Criteria

1. THE AI_Integration_Document SHALL define the full agent sequence: Excavator_Agent → Research_Agent (parallel map, one invocation per assumption) → Human_Gate_1 → Adversary_Agent → Human_Gate_2 → Planner_Agent → Critic_Agent → (optional) Planner_Revision.

2. THE AI_Integration_Document SHALL specify the Bedrock model ID for each agent: `anthropic.claude-sonnet-4-6` for Excavator_Agent, Adversary_Agent, and Planner_Agent; `anthropic.claude-haiku-4-5-20251001` for Research_Agent and Critic_Agent.

3. THE AI_Integration_Document SHALL define the Bedrock API call contract shared by all agents: `anthropic_version: "bedrock-2023-05-31"`, `max_tokens: 1500`, `system: <agent system prompt>`, `messages: [{ "role": "user", "content": <prompt> }]`; all agents SHALL request and parse a JSON-only response with no markdown wrapper.

4. THE AI_Integration_Document SHALL specify the Excavator_Agent output schema: `{ "idea_summary": string, "domain": string, "assumptions": Assumption[] }` where each Assumption contains `id` (string), `text` (string), `type` (string), `optimism_level` (string), `why_it_matters` (string), and `hidden` (boolean); between 4 and 8 assumptions SHALL be returned per invocation.

5. THE AI_Integration_Document SHALL specify the Research_Agent RAG routing logic: THE Research_Agent SHALL first query Weaviate RealWorldFact (limit=3) and FailurePattern (limit=2) using `near_text`; IF the highest `certainty` score across all results is below Confidence_Threshold, THEN THE Research_Agent SHALL invoke the Tavily API and write back up to 2 results to RealWorldFact before constructing the evidence prompt.

6. THE AI_Integration_Document SHALL specify the Research_Agent output schema: `{ "assumption_id": string, "assumption": string, "confidence_score": float [0.0–1.0], "verdict": "optimistic"|"realistic"|"conservative", "evidence_summary": string, "sources": string[], "risk_level": "high"|"medium"|"low" }`.

7. THE AI_Integration_Document SHALL specify the Adversary_Agent output schema: `{ "top_risks": Risk[], "hardest_question": string, "steelman_counterplan": string }` where each Risk contains `risk` (string), `argument` (string), `severity` ("critical"|"high"|"medium"), and `early_warning` (string); between 2 and 5 risks SHALL be returned.

8. THE AI_Integration_Document SHALL specify the Planner_Agent output schema: `{ "plan_title": string, "tension_warning": string|null, "plan": { "day_30": Phase30, "day_60": Phase, "day_90": Phase90 }, "backup_plans": BackupPlan[], "confidence_score": float [0.0–1.0] }` where Phase30 includes `first_real_step` (string), Phase90 includes `success_metric` (string), every Phase includes `goal` (string), `milestones` (string[]), `risk_flags` (string[]), and `assumption_load` (integer 1–5), and BackupPlan contains `trigger` (string) and `pivot_action` (string).

9. THE AI_Integration_Document SHALL specify the Planner_Agent track logic: WHEN `user_track` is "prototype", milestones SHALL focus on MVP scope and first deploy; WHEN "find_a_user", milestones SHALL focus on ICP definition and user conversations; WHEN "invalidate", milestones SHALL focus on hypothesis testing and pivot exploration.

10. THE AI_Integration_Document SHALL specify the Critic_Agent output schema: `{ "scores": { "feasibility": ScoreDim, "specificity": ScoreDim, "risk_coverage": ScoreDim, "first_step_clarity": ScoreDim }, "overall": integer [0–10], "revision_needed": boolean, "revision_instructions": string|null, "top_improvement": string }` where ScoreDim contains `score` (integer 0–10) and `comment` (string); `revision_needed` SHALL be true if and only if `overall` < 7.

11. THE AI_Integration_Document SHALL specify the revision loop contract: IF `revision_needed` is true, THEN THE State_Machine SHALL re-invoke Planner_Agent exactly once; the Planner revision invocation SHALL include all original inputs plus `revision_instructions` (string from Critic output) and the original `adversary_output`; THE Critic_Agent SHALL NOT re-score the revised plan; the revised plan is the final output regardless of score.

12. THE AI_Integration_Document SHALL specify the Confidence_Threshold as the environment variable `CONFIDENCE_THRESHOLD` (default `"0.72"`) read at Lambda cold-start by the five agent Lambda functions; changing this value SHALL require no code change.

13. THE AI_Integration_Document SHALL document the Weaviate search parameters used by the Research_Agent: `near_text` query using the assumption text, `limit=3` on RealWorldFact, `limit=2` on FailurePattern, and `return_metadata=["certainty"]` on both queries.

14. THE AI_Integration_Document SHALL specify that all agent Lambda functions call Bedrock synchronously and parse the response body as UTF-8 JSON; IF `json.loads` raises an exception, THE Lambda SHALL return an HTTP 500 error to Step Functions to trigger its built-in retry policy.

15. THE AI_Integration_Document SHALL define the input schemas for Research_Agent, Adversary_Agent, and Planner_Agent Lambda handlers: Research_Agent input: `{ "assumption": Assumption, "session_id": string }`; Adversary_Agent input: `{ "idea_summary": string, "validated_assumptions": ConfirmedAssumption[] }`; Planner_Agent input: `{ "idea_summary": string, "validated_assumptions": ConfirmedAssumption[], "adversary_output": AdversaryOutput, "user_track": string, "revision_instructions": string|null }`.

---

### Requirement 6: Deployment Architecture

**User Story:** As Soham (AWS lead), I want a deployment architecture document that specifies every AWS resource, its configuration, IAM permission requirements, and the exact sequence of setup steps, so that I can have the full stack running within the first 12 hours of the hackathon and fix any infrastructure issues before the demo deadline.

#### Acceptance Criteria

1. THE Deployment_Architecture_Document SHALL enumerate every AWS resource required: one API Gateway REST API, one Step Functions state machine, seven Lambda functions (excavator, research, adversary, planner, critic, resume-gate, status), and the IAM execution role.

2. THE Deployment_Architecture_Document SHALL specify the Lambda runtime as Python 3.12 and the memory and timeout per function: excavator (512 MB, 30s), research (256 MB, 30s), adversary (512 MB, 30s), planner (512 MB, 30s), critic (256 MB, 15s), resume-gate (128 MB, 10s), status (128 MB, 10s).

3. THE Deployment_Architecture_Document SHALL specify all required environment variables: the five agent Lambda functions (excavator, research, adversary, planner, critic) SHALL each receive `WEAVIATE_URL`, `WEAVIATE_API_KEY`, `OPENAI_API_KEY`, `TAVILY_API_KEY`, and `CONFIDENCE_THRESHOLD`; the resume-gate Lambda SHALL receive `STATE_MACHINE_ARN`; the status Lambda requires no additional environment variables.

4. THE Deployment_Architecture_Document SHALL specify that all API credentials are stored as Lambda environment variables and SHALL NOT be hardcoded in source files or committed to version control.

5. THE Deployment_Architecture_Document SHALL define the IAM execution role permissions: `bedrock:InvokeModel` on `anthropic.claude-*` resources; `states:StartExecution` and `states:DescribeExecution` on the State_Machine ARN; `lambda:InvokeFunction` on all agent Lambda ARNs (granted to Step Functions); and `states:SendTaskSuccess` on the State_Machine ARN (granted to the resume-gate Lambda).

6. THE Deployment_Architecture_Document SHALL define the API Gateway route table: `POST /start` → excavator-trigger Lambda; `GET /status` → status Lambda; `POST /resume` → resume-gate Lambda; and `OPTIONS /{proxy+}` → CORS mock integration returning the required `Access-Control-Allow-*` headers.

7. THE Deployment_Architecture_Document SHALL specify the Step Functions state machine structure: Excavator Task → ResearchParallel Map (MaxConcurrency: 5) → HumanGate1 waitForTaskToken Task → Adversary Task → HumanGate2 waitForTaskToken Task → Planner Task → Critic Task → CheckRevision Choice → (PlannerRevision Task | Done Pass).

8. THE Deployment_Architecture_Document SHALL specify that the status Lambda stores gate-ready payloads in an in-process dictionary cache keyed by `{executionArn}#{gate}` for retrieval by Frontend polling; this in-process cache is acceptable for the hackathon due to Lambda execution environment reuse within a single demo session.

9. THE Deployment_Architecture_Document SHALL specify the setup sequence: (1) create Weaviate schema, (2) run batch ingestion, (3) deploy all Lambda functions with environment variables, (4) deploy State_Machine ASL, (5) configure API Gateway routes and CORS, (6) update Frontend `API_BASE` constant, (7) run one full end-to-end test execution.

10. THE Deployment_Architecture_Document SHALL specify that the Weaviate Cloud free-tier cluster and Tavily free-tier API key are sufficient for the hackathon demo load; this is satisfied when up to 20 concurrent pipeline executions complete without receiving HTTP 429 or service-throttle errors from either external service.

11. THE Deployment_Architecture_Document SHALL note that no custom domain, TLS certificate, or Route 53 configuration is required for the MVP; the API Gateway default HTTPS URL is the production URL for the hackathon.

12. THE Deployment_Architecture_Document SHALL specify the Weaviate cluster region as the nearest available region to us-east-1 to minimise Research_Agent latency.

13. WHEN a Lambda function fails after 3 Step Functions retry attempts (exponential backoff, initial interval 2 seconds), THE State_Machine SHALL transition to a Fail state; the Frontend polling SHALL time out after 60 seconds (30 attempts × 2 seconds) and display a user-readable error prompting retry from the Input Screen; no manual recovery step is required from the team during the demo.
