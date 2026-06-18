# Implementation Plan: IdeaStress — Zero-to-One Builder

## Overview

This plan converts the six design artifacts (System Architecture, Database Design, API
Specification, Authentication Flow, AI Integration Architecture, Deployment Architecture)
into discrete, ordered coding tasks for a four-person student team working within a
48-hour hackathon window. Tasks are grouped by system layer and sequenced so that each
step produces tested, runnable code before the next begins. All implementation is in
Python 3.12 (Lambda) and TypeScript/React (Frontend).

---

## Tasks

- [ ] 1. Weaviate schema and corpus setup
  - [ ] 1.1 Implement `weaviate_schema.py` with idempotent collection creation
    - Create the three Weaviate collections: `RealWorldFact`, `UserAssumption`,
      `FailurePattern` using the `weaviate-client` Python library.
    - Configure `text2vec-openai` vectoriser with `text-embedding-3-small` on each
      collection, applying the vectorised fields defined in §2.4.
    - Implement the idempotency guard: call `client.collections.exists()` before every
      `client.collections.create()`; skip creation if collection already exists and exit
      with code 0 on all skip paths.
    - Apply all property definitions from §2.2–§2.4 (data types, constraints, allowed
      enum values).
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.9_

  - [ ]* 1.2 Write property test for schema idempotency (Property 3)
    - **Property 3: Schema creation is idempotent**
    - Use Hypothesis to parameterise the pre-existing collection state over all 8
      subsets of {RealWorldFact, UserAssumption, FailurePattern} (0–3 collections
      pre-existing in any combination).
    - Assert: function terminates without exception; all three collections exist after
      each call.
    - **Validates: Requirements 2.9, NFR-27**

  - [ ] 1.3 Implement `batch_ingest.py` corpus pre-population script
    - Insert a minimum of 15 `RealWorldFact` records spanning startup (8), education
      (4), and career (3) domains, covering all key assumptions from the three example
      prompts (§2.6 coverage matrix).
    - Insert a minimum of 10 `FailurePattern` records spanning timeline (3), market (3),
      technical (2), and team (2) failure categories.
    - Set `confidence`, `source`, `recency_year`, `domain` fields as specified in §2.2
      and §2.4; do not hardcode API credentials.
    - _Requirements: 2.8, FR-58_

  - [ ]* 1.4 Write unit tests for batch_ingest record counts and field values
    - Assert ≥15 RealWorldFact and ≥10 FailurePattern records are inserted.
    - Assert each record's `assumption_type` (where present) is in the allowed enum set.
    - Assert no PII fields appear in any inserted record.
    - _Requirements: 2.12, 4.7_


- [ ] 2. Excavator Lambda (`excavator`)
  - [ ] 2.1 Implement the Excavator Lambda handler and Bedrock call
    - Generate `session_id = str(uuid.uuid4())` at invocation start; embed it in the
      Step Functions result under `ResultPath: $.excavator_output`.
    - Validate that the incoming `user_idea` is a non-empty, non-whitespace string;
      return HTTP 400 to SFN if validation fails — no Weaviate writes occur.
    - Call `bedrock.invoke_model` with model `anthropic.claude-sonnet-4-6`,
      `max_tokens=1500`, `anthropic_version="bedrock-2023-05-31"`, system prompt, and
      the user idea as the user message.
    - Parse the Bedrock response as UTF-8 JSON; if `json.loads` raises, re-raise the
      exception so Step Functions can trigger its built-in retry policy.
    - Return `{ "session_id", "idea_summary", "domain", "assumptions": [...] }` with
      4–8 assumptions; each assumption must contain `id`, `text`, `type`,
      `optimism_level`, `why_it_matters`, `hidden`.
    - Write each assumption to Weaviate `UserAssumption` collection tagged with
      `session_id`; read all credentials from environment variables.
    - _Requirements: 1.6, 1.10, 4.2, 4.3, 5.4, FR-06, FR-07, FR-08, FR-09, FR-10, FR-11_

  - [ ]* 2.2 Write property test for Excavator enumeration invariants (Property 6)
    - **Property 6: Excavator output enumeration invariants**
    - Use Hypothesis `@given(st.text(min_size=1).filter(lambda s: s.strip()))` to
      generate arbitrary non-empty idea texts.
    - Mock `bedrock.invoke_model` to return parameterised JSON outputs; assert:
      `4 <= len(assumptions) <= 8`; every `type` ∈ {timeline, market_size, skill, cost,
      user_behavior, competition}; every `optimism_level` ∈ {aggressive, moderate,
      conservative}.
    - **Validates: Requirements 2.12, 5.4, FR-06, FR-08, FR-09**

  - [ ]* 2.3 Write property test for Session_ID UUID v4 invariant (Property 5)
    - **Property 5: Session_ID UUID v4 invariant**
    - Use Hypothesis to drive 100 independent Excavator invocations with distinct idea
      texts.
    - For each invocation, assert the returned `session_id` matches the UUID v4 regex
      pattern `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`.
    - Assert all UserAssumption write calls carry the same `session_id` that was
      generated at invocation start.
    - **Validates: Requirements 2.11, 4.2, 4.3, FR-10, FR-11**

  - [ ]* 2.4 Write unit tests for Excavator input validation and error paths
    - Test: empty string input → HTTP 400, no Weaviate writes.
    - Test: whitespace-only input → HTTP 400, no Weaviate writes.
    - Test: `json.loads` failure on Bedrock response → exception propagated (not swallowed).
    - Test: missing `session_id` in downstream event → HTTP 400.
    - _Requirements: 3.1, 4.3, 5.14, FR-03_


- [ ] 3. Research Lambda (`research`) and RAG routing
  - [ ] 3.1 Implement the Research Lambda handler with Weaviate RAG queries
    - Accept input `{ "assumption": Assumption, "session_id": str }`; validate
      `session_id` is a non-empty UUID v4 — return HTTP 400 if absent or invalid.
    - Query `RealWorldFact` via `near_text(query=assumption_text, limit=3,
      return_metadata=["certainty"])` and `FailurePattern` via `near_text(limit=2,
      return_metadata=["certainty"])`.
    - Apply `where` filter `session_id == session_id` on the `UserAssumption` query
      only (RealWorldFact and FailurePattern are shared corpus — no session filter).
    - Compute `max_certainty = max(obj.metadata.certainty for obj in all_results)`.
    - Read `CONFIDENCE_THRESHOLD` from environment variable (default `"0.72"`).
    - _Requirements: 2.9, 5.5, 5.13, FR-15, FR-16, NFR-29_

  - [ ] 3.2 Implement Tavily fallback and write-back in the Research Lambda
    - If `max_certainty < CONFIDENCE_THRESHOLD`, call Tavily API with
      `query = assumption_text + " startup statistics"` and `max_results=3`.
    - Insert the top `min(2, N)` Tavily results into `RealWorldFact` with
      `confidence=0.65`, `source=result_url`, `recency_year=2025`, `domain="startup"`,
      `contradicts=""`.
    - If Weaviate query raises an exception, log a warning and proceed with empty
      evidence (no crash, no user-visible error).
    - If Tavily API raises an exception, log a warning and proceed with whatever
      Weaviate evidence is available.
    - _Requirements: 2.10, 5.5, FR-16, FR-17, NFR-07, NFR-08_

  - [ ]* 3.3 Write property test for Tavily write-back count (Property 4)
    - **Property 4: Tavily write-back count equals min(2, N)**
    - Use Hypothesis `@given(st.lists(st.text(), min_size=0, max_size=10))` to
      parameterise the number of Tavily results returned.
    - Mock Weaviate certainty below threshold and Tavily returning N results.
    - Assert the number of `RealWorldFact` inserts equals `min(2, N)`.
    - Assert all inserted records have `confidence=0.65` and `recency_year=2025`.
    - **Validates: Requirements 2.10, FR-17**

  - [ ] 3.4 Implement Research Agent Bedrock scoring call and output construction
    - Build `evidence_text` string from Weaviate/Tavily evidence; call
      `claude-haiku-4-5-20251001` with the Research system prompt, assumption, and
      evidence_text.
    - Parse response; return `{ "assumption_id", "assumption", "confidence_score",
      "verdict", "evidence_summary", "sources", "risk_level" }`.
    - If `json.loads` raises, re-raise so SFN retry policy is triggered.
    - _Requirements: 5.3, 5.6, 5.14, FR-13, FR-14_

  - [ ]* 3.5 Write property test for Research output value ranges (Property 11)
    - **Property 11: Research output values are within defined ranges**
    - Use Hypothesis to generate arbitrary valid assumption inputs with mocked Bedrock
      responses.
    - Assert: `0.0 <= confidence_score <= 1.0`; `verdict ∈ {optimistic, realistic,
      conservative}`; `risk_level ∈ {high, medium, low}`; `sources` is a list (not null).
    - **Validates: Requirements 5.6, FR-13, FR-14**

  - [ ]* 3.6 Write property test for concurrent session isolation (Property 14)
    - **Property 14: Concurrent sessions are fully isolated**
    - Use Hypothesis to generate two distinct UUIDs A and B; simulate concurrent
      Research Agent invocations using both session_ids writing to the same Weaviate
      mock.
    - Assert a query filtered by `session_id = A` returns zero objects with
      `session_id = B`, and vice versa.
    - **Validates: Requirements 4.6, NFR-30**

  - [ ]* 3.7 Write unit tests for Research Lambda routing and error paths
    - Test: certainty ≥ 0.72 → Tavily not called.
    - Test: certainty < 0.72 → Tavily called.
    - Test: Weaviate throws → proceeds with empty evidence (no crash).
    - Test: Tavily throws → proceeds with Weaviate evidence (no crash).
    - Test: Tavily returns 0 results → no write-back occurs.
    - _Requirements: 2.10, 5.5, NFR-07, NFR-08_


- [ ] 4. Adversary Lambda (`adversary`)
  - [ ] 4.1 Implement the Adversary Lambda handler
    - Accept input `{ "idea_summary": str, "validated_assumptions": ConfirmedAssumption[] }`.
    - Validate `session_id` is present and a valid UUID v4; return HTTP 400 if absent.
    - Call Bedrock with model `anthropic.claude-sonnet-4-6`, `max_tokens=1500`;
      construct user prompt from idea_summary and the confirmed assumptions list.
    - Parse JSON response; return `{ "top_risks": Risk[2–5], "hardest_question": str,
      "steelman_counterplan": str }` where each Risk has `risk`, `argument`,
      `severity ∈ {critical, high, medium}`, `early_warning`.
    - Re-raise any `json.loads` exception for SFN retry.
    - _Requirements: 1.6, 5.7, FR-25, FR-26, FR-27_

  - [ ]* 4.2 Write property test for Adversary top_risks count (Property 12)
    - **Property 12: Adversary top_risks count is within bounds**
    - Use Hypothesis to generate non-empty lists of ConfirmedAssumption objects
      (1–8 items); mock Bedrock to return parameterised risk arrays.
    - Assert: `2 <= len(top_risks) <= 5`; every `severity ∈ {critical, high, medium}`.
    - **Validates: Requirements 5.7, FR-26, FR-27**

  - [ ]* 4.3 Write unit tests for Adversary Lambda error paths
    - Test: `json.loads` failure on Bedrock response → exception propagated.
    - Test: empty `validated_assumptions` list → handled gracefully (no KeyError).
    - _Requirements: 5.3, 5.14_

- [ ] 5. Planner Lambda (`planner`) and revision loop
  - [ ] 5.1 Implement the Planner Lambda handler with track-specific logic
    - Accept input `{ "idea_summary", "validated_assumptions", "adversary_output",
      "user_track", "revision_instructions": null | str }`.
    - Validate `user_track ∈ {prototype, find_a_user, invalidate}`; apply track-specific
      milestone focus per §5.5 table (prototype → MVP/deploy; find_a_user → ICP/interviews;
      invalidate → hypothesis testing/pivot).
    - Set `tension_warning` to a non-null string if the chosen track conflicts with any
      critical or high-severity adversary risk; otherwise set to null.
    - Return full `PlanOutput` JSON including `plan_title`, `tension_warning`,
      `plan{day_30, day_60, day_90}`, `backup_plans`, `confidence_score`.
    - `day_30` must include `first_real_step`; `day_90` must include `success_metric`.
    - If `revision_instructions` is non-null, incorporate it in the system prompt.
    - Re-raise any `json.loads` exception for SFN retry.
    - _Requirements: 5.8, 5.9, 5.11, FR-35, FR-36, FR-37, FR-38, FR-39, FR-40, FR-41_

  - [ ]* 5.2 Write unit tests for track-specific planning behaviour
    - Test: `prototype` track → Day 30 milestones reference MVP/first deploy language.
    - Test: `find_a_user` track → Day 30 milestones reference ICP/user interviews.
    - Test: `invalidate` track → Day 30 milestones reference hypothesis/pivot testing.
    - Test: non-null `revision_instructions` are included in the prompt.
    - Test: `json.loads` failure → exception propagated.
    - _Requirements: 5.9, 5.11, FR-41_

- [ ] 6. Critic Lambda (`critic`) and revision trigger
  - [ ] 6.1 Implement the Critic Lambda handler
    - Accept input `{ "plan": PlanOutput, "idea_summary": str }`.
    - Call Bedrock with model `anthropic.claude-haiku-4-5-20251001`, `max_tokens=1500`.
    - Return `CriticOutput`: `scores{feasibility, specificity, risk_coverage,
      first_step_clarity}` each with `score [0–10]` and `comment`; `overall [0–10]`;
      `revision_needed: bool`; `revision_instructions: str|null`; `top_improvement: str`.
    - Enforce: `revision_needed = (overall < 7)` — this boolean must match the
      arithmetic condition regardless of what the LLM returns; validate and override if
      necessary.
    - If `revision_needed` is true, ensure `revision_instructions` is a non-null,
      non-empty string; if the LLM returns null, set it to `top_improvement` as fallback.
    - Re-raise `json.loads` exceptions for SFN retry.
    - _Requirements: 5.10, 5.11, FR-42, FR-43, FR-44_

  - [ ]* 6.2 Write property test for Critic revision_needed invariant (Property 13)
    - **Property 13: Critic revision_needed is equivalent to overall < 7**
    - Use Hypothesis `@given(st.integers(min_value=0, max_value=10))` to generate all
      possible `overall` scores.
    - Assert: `revision_needed == (overall < 7)` holds for every integer in [0, 10].
    - Assert: when `revision_needed == True`, `revision_instructions` is a non-null,
      non-empty string.
    - **Validates: Requirements 5.10, FR-42, FR-43**

  - [ ]* 6.3 Write unit tests for Critic Lambda edge cases
    - Test: `overall == 7` → `revision_needed = False`.
    - Test: `overall == 6` → `revision_needed = True`; `revision_instructions` is set.
    - Test: LLM returns `revision_needed = False` with `overall = 5` → override to `True`.
    - Test: `json.loads` failure → exception propagated.
    - _Requirements: 5.10, FR-42, FR-43_


- [ ] 7. Checkpoint — Agent Lambda layer complete
  - Ensure all five agent Lambdas (excavator, research, adversary, planner, critic)
    pass their unit and property tests locally.
  - Deploy each Lambda to AWS with the correct environment variables from §6.3.
  - Run each Lambda individually from the AWS console with mock inputs; verify expected
    JSON output shapes before wiring Step Functions.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Notify / Status Lambda (`gate-status`) and polling cache
  - [ ] 8.1 Implement the combined `gate-status` Lambda with action dispatcher
    - Implement the module-level `_GATE_CACHE = {}` in-process dictionary.
    - Handle `action = "WRITE_CACHE"` (invoked by Step Functions notify states):
      store `event["payload"]` under key `f"{event['executionArn']}#{event['gate']}"`.
    - Handle `httpMethod = "GET"` (invoked by API Gateway `GET /status`):
      read `executionArn` and `gate` query params; validate both are present and
      `gate ∈ {gate1, gate2, output}`; return `{ "ready": false, "payload": null }` if
      key not found, or `{ "ready": true, "payload": <stored_payload> }` if found.
    - Return HTTP 400 for missing `executionArn`; HTTP 400 for invalid `gate`;
      HTTP 404 for unknown `executionArn`.
    - All responses include `Access-Control-Allow-Origin: *` headers.
    - _Requirements: 3.2, 6.7, 6.8, FR-51, NFR-06, NFR-10_

  - [ ]* 8.2 Write property test for polling cache key determinism (Property 15)
    - **Property 15: Polling cache key format is deterministic**
    - Use Hypothesis `@given(st.text(), st.sampled_from(["gate1","gate2","output"]))` to
      parameterise `executionArn` and `gate`.
    - Assert the cache key equals exactly `f"{executionArn}#{gate}"` — same inputs
      always produce the same key with no random or timestamp component.
    - **Validates: Requirements 6.8**

  - [ ]* 8.3 Write unit tests for GET /status parameter validation
    - Test: missing `executionArn` → HTTP 400.
    - Test: missing `gate` → HTTP 400.
    - Test: `gate = "Gate1"` (wrong case) → HTTP 400.
    - Test: `gate = "output"`, unknown ARN → HTTP 404.
    - Test: valid ARN + gate, cache populated → HTTP 200, `ready: true`.
    - Test: valid ARN + gate, cache empty → HTTP 200, `ready: false`.
    - _Requirements: 3.2, FR-51_

- [ ] 9. Resume Lambda (`resume-gate`) and Step Functions integration
  - [ ] 9.1 Implement the Resume Lambda handler
    - Accept `POST /resume` body `{ "task_token": str, "gate": str, "payload": obj }`.
    - Validate: `task_token` is a non-empty string — return HTTP 400 if absent or empty
      string; do NOT invoke `send_task_success` for invalid tokens.
    - Validate: `gate ∈ {gate1, gate2}` — return HTTP 400 otherwise.
    - Validate: `payload` is present — return HTTP 400 if absent.
    - Call `sfn.send_task_success(taskToken=task_token, output=json.dumps(payload))`.
    - Return `{ "status": "resumed" }` on success; HTTP 500 if `send_task_success`
      raises.
    - Read `STATE_MACHINE_ARN` from environment variable.
    - All responses include `Access-Control-Allow-Origin: *` headers.
    - _Requirements: 3.3, 3.4, 3.5, 3.11, 4.5, FR-50, NFR-13_

  - [ ]* 9.2 Write property test for absent/empty task_token rejection (Property 9)
    - **Property 9: Absent or empty task_token is rejected**
    - Use Hypothesis to generate requests where `task_token` is absent, null, or drawn
      from `st.text(max_size=0)`.
    - Assert HTTP 400 is returned and `send_task_success` is never called, regardless of
      valid `gate` and `payload` values.
    - **Validates: Requirements 3.3, 3.11, NFR-13**

  - [ ]* 9.3 Write unit tests for Resume Lambda validation
    - Test: `gate = "output"` → HTTP 400 (only gate1/gate2 accepted).
    - Test: `payload` absent → HTTP 400.
    - Test: `send_task_success` raises → HTTP 500 returned.
    - Test: valid gate1 input with `confirmed_assumptions` payload → HTTP 200.
    - Test: valid gate2 input with `chosen_track` payload → HTTP 200.
    - _Requirements: 3.3, 3.4, 3.5, FR-50_


- [ ] 10. Excavator Trigger Lambda (`excavator-trigger`) and POST /start
  - [ ] 10.1 Implement the excavator-trigger Lambda and POST /start endpoint
    - Accept `POST /start` body `{ "user_idea": str }`.
    - Validate: `user_idea` is a non-empty, non-whitespace-only string — return HTTP 400
      if validation fails; do NOT call `sfn.start_execution`.
    - Call `sfn.start_execution(stateMachineArn=STATE_MACHINE_ARN,
      input=json.dumps({ "user_idea": user_idea }))`.
    - Return `{ "executionArn": "<arn>", "session_id": "<uuid>" }` on success.
    - Note: `session_id` is generated inside the Excavator Lambda (Step 5 in §1.3);
      for the `POST /start` response, the trigger Lambda generates a preliminary UUID
      to return to the frontend immediately — this UUID is then embedded in the SFN
      input so both the trigger response and the Excavator share the same value.
    - Return HTTP 500 if `sfn.start_execution` raises.
    - All responses include `Access-Control-Allow-Origin: *` headers.
    - _Requirements: 3.1, 1.2, FR-05, FR-11_

  - [ ]* 10.2 Write property test for empty/whitespace input rejection (Property 7)
    - **Property 7: Empty and whitespace idea input is rejected**
    - Use Hypothesis `@given(st.one_of(st.just(""), st.text(alphabet=" \t\n\r")))` to
      generate whitespace-only and empty inputs.
    - Assert HTTP 400 is returned and `sfn.start_execution` is never called.
    - **Validates: Requirements 3.1, FR-03**

  - [ ]* 10.3 Write unit tests for POST /start error handling
    - Test: missing `user_idea` key → HTTP 400.
    - Test: `sfn.start_execution` raises → HTTP 500.
    - Test: valid idea → HTTP 200 with `executionArn` and `session_id`.
    - _Requirements: 3.1_

- [ ] 11. Step Functions ASL state machine definition
  - [ ] 11.1 Write the Step Functions ASL JSON definition
    - Define the state machine `IdeaStress-StateMachine` (Standard type) with states
      as specified in §6.6 table: Excavator (Task) → ResearchParallel (Map,
      MaxConcurrency=5) → HumanGate1 (waitForTaskToken) → Adversary (Task) →
      HumanGate2 (waitForTaskToken) → Planner (Task) → Critic (Task) → CheckRevision
      (Choice) → PlannerRevision (Task) | NotifyOutput (Task) → Done (Pass).
    - Configure `ResultPath` for each Task state as per §6.6.
    - Apply retry configuration on all Task states: ErrorEquals for Lambda error types,
      `IntervalSeconds=2`, `MaxAttempts=3`, `BackoffRate=2.0`; Catcher → PipelineFail.
    - Wire the ResearchParallel Map to iterate over `$.excavator_output.assumptions` and
      pass `session_id.$` from `$.session_id` in each iterator's Parameters block.
    - Set CheckRevision Choice rule: `$.critic_output.revision_needed == true` →
      PlannerRevision; default → NotifyOutput.
    - _Requirements: 1.3, 1.4, 1.5, 6.7, FR-48, FR-49, FR-52_

  - [ ]* 11.2 Write property test for Research results count equals assumption count (Property 1)
    - **Property 1: Research results count equals assumption count**
    - Use Hypothesis `@given(st.lists(assumption_strategy(), min_size=1, max_size=8))`
      to generate assumption lists of length N.
    - Mock the Research Lambda and the Map execution; assert the output array contains
      exactly N items each with a distinct `assumption_id` from the input list.
    - **Validates: Requirements 1.3, 5.4**

  - [ ]* 11.3 Write property test for revision loop executing at most once (Property 2)
    - **Property 2: Revision loop executes at most once**
    - Use Hypothesis to parameterise Critic output with `overall ∈ [0, 6]`
      (triggering revision) and mocked Planner/Critic call counters.
    - Assert: Planner is invoked exactly twice (once original, once revision); Critic
      is invoked exactly once; no second CheckRevision occurs after PlannerRevision.
    - **Validates: Requirements 1.5, 5.11, FR-44, FR-52**

  - [ ]* 11.4 Write property test for invalid gate parameter rejection (Property 8)
    - **Property 8: Invalid gate parameter is rejected**
    - Use Hypothesis `@given(st.text().filter(lambda g: g not in {"gate1","gate2","output"}))`
      to generate arbitrary non-gate strings.
    - Call the gate-status Lambda handler with each generated `gate` value; assert
      HTTP 400 is returned.
    - **Validates: Requirements 3.2**

  - [ ]* 11.5 Write property test for valid JSON response from all agents (Property 10)
    - **Property 10: Agent Bedrock responses are always valid JSON**
    - Use Hypothesis to generate mock Bedrock responses (valid JSON, invalid JSON,
      markdown-wrapped JSON) for each of the five agent Lambdas.
    - Assert: valid JSON → `json.loads` succeeds and the Lambda returns correctly.
    - Assert: invalid JSON → Lambda raises an exception (does not swallow it).
    - **Validates: Requirements 5.3, 5.14**


- [ ] 12. Checkpoint — Backend layer complete
  - Verify all Lambda functions are deployed with correct environment variables.
  - Deploy the Step Functions state machine ASL; trigger a manual test execution from
    the AWS console with `{ "user_idea": "I'll build a SaaS app in 2 weeks" }`.
  - Confirm the execution reaches HumanGate1 and the polling cache is populated by
    calling `GET /status?executionArn=<arn>&gate=gate1`.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. API Gateway configuration
  - [ ] 13.1 Configure API Gateway routes, Lambda integrations, and CORS
    - Create REST API `IdeaStress-API` with `prod` stage; no custom domain.
    - Configure Lambda Proxy integrations: `POST /start` → excavator-trigger;
      `GET /status` → gate-status; `POST /resume` → resume-gate.
    - Configure OPTIONS mock integrations on `/start`, `/status`, `/resume`, and
      `/{proxy+}` returning the CORS headers from §6.5 (
      `Access-Control-Allow-Origin: *`,
      `Access-Control-Allow-Headers: Content-Type,...`,
      `Access-Control-Allow-Methods: GET,POST,OPTIONS`).
    - Deploy to `prod` stage; note the API Gateway base URL.
    - _Requirements: 3.9, 6.5, 6.6, FR-14, NFR-12, NFR-14_

  - [ ]* 13.2 Write unit tests for CORS headers on all response paths
    - Test: `POST /start` success response includes `Access-Control-Allow-Origin: *`.
    - Test: `POST /start` HTTP 400 response includes CORS headers.
    - Test: `GET /status` ready response includes CORS headers.
    - Test: `POST /resume` HTTP 400 response includes CORS headers.
    - _Requirements: 3.9, NFR-14_

- [ ] 14. Frontend screens — Input and Gate 1
  - [ ] 14.1 Implement Screen 1: Idea Input with API call and loading state
    - Wire the textarea to component state; disable the submit button when input is
      empty or whitespace-only (FR-03).
    - On submit, call `POST /start` with `{ "user_idea": text }`; store `executionArn`
      and `session_id` in React `useState` only — not in localStorage or any cookie.
    - Show loading state label "Excavating assumptions…" on the button during the API
      call; render at least 3 clickable example prompt buttons that populate the textarea.
    - Start polling `GET /status?executionArn=<arn>&gate=gate1` every 2 seconds after
      receiving the `executionArn`.
    - _Requirements: 4.4, FR-01, FR-02, FR-03, FR-04, FR-05, NFR-21, NFR-23_

  - [ ] 14.2 Implement Screen 2: Gate 1 assumption review cards
    - Render one card per assumption from the `validated_assumptions` payload; each
      card displays: assumption text, type badge, optimism level badge, risk level badge
      (red/yellow/green), evidence summary, confidence score, and visual confidence bar.
    - Display the `idea_summary` from the gate-1 payload for user reference.
    - Display the responsible AI disclaimer (FR-22) at all times on this screen.
    - The "Proceed" button is enabled immediately (no gate 1 assumption editing in MVP).
    - On "Proceed", call `POST /resume` with `{ "task_token", "gate": "gate1",
      "payload": { "confirmed_assumptions": [...] } }`; do not persist `task_token`
      beyond this call.
    - Start polling `GET /status?gate=gate2` after resuming.
    - _Requirements: 3.4, 3.6, 4.5, FR-18, FR-19, FR-20, FR-21, FR-22, FR-23, FR-24,
      NFR-15, NFR-16_

  - [ ]* 14.3 Write unit tests for Input Screen validation
    - Test: empty textarea → submit button is disabled.
    - Test: whitespace-only textarea → submit button is disabled.
    - Test: non-empty text → submit button is enabled.
    - Test: example prompt click → textarea is populated.
    - _Requirements: FR-01, FR-02, FR-03_


- [ ] 15. Frontend screens — Gate 2 and Output
  - [ ] 15.1 Implement Screen 3: Gate 2 adversary output and track selection
    - Render `top_risks` with severity badges (critical/high/medium) and
      `early_warning` signals; display `hardest_question` prominently.
    - Render exactly three track radio buttons: "Full speed ahead" (prototype),
      "Find a user first" (find_a_user), "Rethink the core" (invalidate).
    - Do NOT pre-select any track; do NOT indicate a recommended choice (FR-32, NFR-18).
    - Disable the "Build my 30/60/90-day plan →" button until a track is selected (FR-33).
    - On "Proceed", call `POST /resume` with `{ "task_token", "gate": "gate2",
      "payload": { "chosen_track": <selected_track> } }`.
    - Start polling `GET /status?gate=output` after resuming.
    - _Requirements: 3.5, 3.7, 4.5, FR-28, FR-29, FR-30, FR-31, FR-32, FR-33, FR-34,
      NFR-18, NFR-19_

  - [ ] 15.2 Implement Screen 4: Output screen with plan, critic scores, and backup plans
    - Render `plan_title`, `tension_warning` (if non-null), `first_real_step` from
      `day_30`, 30/60/90-day milestones with risk flags, and `backup_plans`.
    - Render critic dimension scores (`feasibility`, `specificity`, `risk_coverage`,
      `first_step_clarity`) with colour coding: ≥7 = green, 5–6 = yellow, <5 = red.
    - _Requirements: 3.8, FR-45, FR-46, FR-47, NFR-15, NFR-17_

  - [ ] 15.3 Implement the polling logic with 60-second timeout handling
    - Implement the polling algorithm from §3.6: `MAX_ATTEMPTS=30`,
      `POLL_INTERVAL_MS=2000`; stop polling after 30 attempts with no ready signal.
    - On timeout, display: "Analysis is taking longer than expected. Please return to
      the start screen and resubmit your idea." and navigate to the Input Screen.
    - Store `API_BASE` as a named constant (not hardcoded inline) that Joshita can update
      after Step 5 of the setup checklist.
    - _Requirements: 3.10, FR-51, NFR-06, NFR-10_

  - [ ] 15.4 Implement the step progress indicator and shared UI shell
    - Render "Step N of 4" in the header across all screens (FR-26); use the dark
      background `#0a0e1a` palette (NFR-24); ensure viewport responsiveness from 375px
      to 1440px (NFR-25).
    - Apply context-aware loading labels on all primary buttons (e.g., "Analysing risks…"
      while waiting for gate 2; "Building your plan…" while polling for output).
    - _Requirements: FR-04, NFR-22, NFR-23, NFR-24, NFR-25_

  - [ ]* 15.5 Write unit tests for Gate 2 track selection validation
    - Test: no track selected → proceed button is disabled.
    - Test: track selected → proceed button is enabled.
    - Test: AI recommendation UI elements are absent (no pre-selection or hint text).
    - _Requirements: FR-31, FR-32, FR-33, NFR-18_

  - [ ]* 15.6 Write unit tests for polling timeout behaviour
    - Test: 30 consecutive `{ "ready": false }` responses → error message shown;
      navigate to InputScreen.
    - Test: `{ "ready": true }` on attempt 15 → no error; correct screen rendered.
    - _Requirements: 3.10, NFR-10_

- [ ] 16. Checkpoint — Full stack integration
  - Update `API_BASE` in the frontend to the API Gateway `prod` URL from Task 13.1.
  - Run `npm run build` (or equivalent) and serve the production build.
  - Execute the full happy path end-to-end test using Example Prompt 1:
    submit → Gate 1 → choose "prototype" track → Gate 2 → Output screen.
  - Confirm all four screens render without errors and the final plan is displayed
    within 90 seconds (NFR-05).
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 17. Integration tests and pre-demo smoke tests
  - [ ] 17.1 Write and run integration tests for all three example prompts
    - Test: Submit Example Prompt 1 ("SaaS app in 2 weeks") — all 4 screens render;
      plan generated with ≥1 backup plan.
    - Test: Submit Example Prompt 2 ("Learn ML in a month") — all 4 screens render;
      Research Agent Tavily fallback triggered for ≥1 assumption.
    - Test: Submit Example Prompt 3 ("Food delivery undercut by 20%") — all 4 screens
      render; adversary generates ≥2 risks with severity badges.
    - Test: All three execution tracks produce a rendered output screen without errors.
    - _Requirements: FR-35, FR-36, FR-41_

  - [ ] 17.2 Write and run integration test for the Critic revision loop
    - Submit a deliberately vague idea likely to score < 7 on the Critic; confirm
      `revision_needed = true` in the Step Functions execution history.
    - Confirm the output payload contains the original `critic_output` scores alongside
      the revised `plan_output`.
    - Confirm Planner is invoked exactly twice and Critic exactly once in the execution.
    - _Requirements: 5.11, FR-43, FR-44, FR-52_

  - [ ]* 17.3 Write integration test for polling timeout
    - Submit a pipeline, reach Gate 1 polling, do NOT call `/resume`; assert the
      frontend shows the timeout error message after 60 seconds.
    - _Requirements: 3.10, NFR-10_

  - [ ] 17.4 Run the pre-demo smoke test checklist from §9.5
    - Verify `weaviate_schema.py` runs without error on live cluster.
    - Verify `batch_ingest.py` shows correct record counts in Weaviate console.
    - Verify `POST /start` returns `executionArn` and `session_id`.
    - Verify `GET /status` returns `{ ready: false }` before gate is reached.
    - Verify all Lambda functions are visible in AWS console with all env vars set.
    - Verify Step Functions execution is visible after `POST /start`.
    - Verify full pipeline completes with Example Prompt 1 in < 90 seconds.
    - Verify Output screen renders plan title, critic scores, first step, 3 phases.
    - _Requirements: 6.9, NFR-01, NFR-02, NFR-03, NFR-04, NFR-05_

- [ ] 18. Final checkpoint — Demo ready
  - Confirm all property tests (Properties 1–15) are passing.
  - Confirm all unit and integration tests pass.
  - Confirm the full pipeline runs end-to-end in < 90 seconds on the live stack.
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; implement
  the un-starred tasks first to get to a working demo, then add property and unit tests.
- All five agent Lambdas must read credentials exclusively from environment variables —
  no API keys may be hardcoded or committed to version control (NFR-12).
- The in-process `_GATE_CACHE` in the gate-status Lambda is a known hackathon
  trade-off (§6.7); if the Lambda cold-starts between a notify write and a frontend
  poll, the cache entry is lost. Keep the container warm by ensuring the frontend's
  continuous 2-second polling runs uninterrupted.
- Tasks 1–6 (Weaviate + agent Lambdas) can be parallelised across team members:
  Samruddhi owns Tasks 1.1–1.4; Suzanaa owns Task 4.1 (Adversary prompt); Soham owns
  Tasks 2–3, 5–6, 8–13; Joshita owns Tasks 14–15.
- Property tests use `hypothesis` library (`pip install hypothesis`); unit tests use
  `pytest`; frontend tests use the project's existing testing setup (likely Vitest
  based on the Vite/React scaffold).
- Each property test MUST include the tag comment:
  `# Feature: ideastress-system-design, Property N: <property_text>`
  as specified in §9.2 of the design document.
- The setup sequence order from §6.8 (schema → ingest → Lambdas → SFN → API Gateway
  → Frontend → end-to-end test) corresponds to Tasks 1 → 2–6 → 7 → 8–11 → 13 → 14–15
  → 16 in this plan.


## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "2.1"]
    },
    {
      "id": 1,
      "tasks": ["1.2", "1.3", "2.2", "2.3", "2.4"]
    },
    {
      "id": 2,
      "tasks": ["1.4", "3.1", "5.1", "6.1"]
    },
    {
      "id": 3,
      "tasks": ["3.2", "5.2", "6.2", "6.3"]
    },
    {
      "id": 4,
      "tasks": ["3.3", "3.4", "4.1"]
    },
    {
      "id": 5,
      "tasks": ["3.5", "3.6", "3.7", "4.2", "4.3"]
    },
    {
      "id": 6,
      "tasks": ["8.1", "9.1", "10.1", "11.1"]
    },
    {
      "id": 7,
      "tasks": ["8.2", "8.3", "9.2", "9.3", "10.2", "10.3", "11.2", "11.3", "11.4", "11.5"]
    },
    {
      "id": 8,
      "tasks": ["13.1"]
    },
    {
      "id": 9,
      "tasks": ["13.2", "14.1", "14.2"]
    },
    {
      "id": 10,
      "tasks": ["14.3", "15.1", "15.2", "15.3", "15.4"]
    },
    {
      "id": 11,
      "tasks": ["15.5", "15.6", "17.1", "17.2"]
    },
    {
      "id": 12,
      "tasks": ["17.3", "17.4"]
    }
  ]
}
```
