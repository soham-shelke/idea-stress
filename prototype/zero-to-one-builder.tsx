import { useState } from "react";

// ─── NAV SECTIONS ────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "overview",      label: "System Overview",     icon: "⬡" },
  { id: "weaviate",      label: "Weaviate Schema",      icon: "◈" },
  { id: "ingestion",     label: "Batch Ingestion",      icon: "⬇" },
  { id: "agents",        label: "Agent Prompts + RAG",  icon: "◎" },
  { id: "backend",       label: "Lambda Handlers",      icon: "λ" },
  { id: "stepfunctions", label: "Step Functions ASL",   icon: "⟳" },
  { id: "frontend",      label: "Frontend (React)",     icon: "⬚" },
  { id: "devpost",       label: "Devpost Fields",       icon: "✦" },
];

const SECTION_META = {
  overview:      { title: "System Overview",       description: "Full agent pipeline · 2 human gates · AWS + Weaviate stack" },
  weaviate:      { title: "Weaviate Schema",        description: "3 collections — run once before demo · Owner: Samruddhi" },
  ingestion:     { title: "Batch Ingestion",        description: "Pre-populate corpus before demo day · Owner: Samruddhi" },
  agents:        { title: "Agent Prompts + RAG",    description: "All 5 agents: system prompts, Bedrock calls, confidence router · Owner: You + Suzanaa" },
  backend:       { title: "Lambda Handlers",        description: "Each agent as a serverless function · Owner: You (Soham)" },
  stepfunctions: { title: "Step Functions ASL",     description: "State machine with waitForTaskToken at each human gate · Owner: You" },
  frontend:      { title: "Frontend (React)",       description: "4 screens: Input → Gate 1 → Gate 2 → Output · Owner: Joshita" },
  devpost:       { title: "Devpost Fields",         description: "Pre-written text for every required submission field" },
};

// ─── CODE CONTENT ─────────────────────────────────────────────────────────────
const CODE = {
weaviate: `# weaviate_schema.py — Owner: Samruddhi — run ONCE before demo
import weaviate
from weaviate.classes.config import Configure, Property, DataType

client = weaviate.connect_to_weaviate_cloud(
    cluster_url="YOUR_WEAVIATE_CLOUD_URL",
    auth_credentials=weaviate.auth.AuthApiKey("YOUR_WEAVIATE_API_KEY"),
)

# ── Collection 1: Ground-truth facts corpus ──────────────────────────────────
client.collections.create(
    name="RealWorldFact",
    vectorizer_config=Configure.Vectorizer.text2vec_openai(
        model="text-embedding-3-small"
    ),
    properties=[
        Property(name="claim",        data_type=DataType.TEXT),    # ← EMBEDDED
        Property(name="domain",       data_type=DataType.TEXT),    # startup/career/education
        Property(name="source",       data_type=DataType.TEXT),    # YC blog, BLS, etc.
        Property(name="confidence",   data_type=DataType.NUMBER),  # 0.0–1.0
        Property(name="contradicts",  data_type=DataType.TEXT),    # myth this busts
        Property(name="recency_year", data_type=DataType.INT),     # facts decay
    ]
)

# ── Collection 2: User assumptions per session (runtime writes) ──────────────
client.collections.create(
    name="UserAssumption",
    vectorizer_config=Configure.Vectorizer.text2vec_openai(
        model="text-embedding-3-small"
    ),
    properties=[
        Property(name="assumption_text", data_type=DataType.TEXT),  # ← EMBEDDED
        Property(name="assumption_type", data_type=DataType.TEXT),  # timeline/market/skill
        Property(name="optimism_level",  data_type=DataType.TEXT),  # aggressive/moderate/conservative
        Property(name="session_id",      data_type=DataType.TEXT),
        Property(name="validated",       data_type=DataType.BOOL),
    ]
)

# ── Collection 3: Failure patterns — powers Adversary + Critic agents ────────
client.collections.create(
    name="FailurePattern",
    vectorizer_config=Configure.Vectorizer.text2vec_openai(
        model="text-embedding-3-small"
    ),
    properties=[
        Property(name="pattern_description",  data_type=DataType.TEXT),  # ← EMBEDDED
        Property(name="failure_category",     data_type=DataType.TEXT),  # timeline/technical/market/team
        Property(name="frequency",            data_type=DataType.TEXT),  # very_common/common
        Property(name="early_warning_signal", data_type=DataType.TEXT),  # what to watch for
        Property(name="backup_plan_hint",     data_type=DataType.TEXT),  # feeds backup plans feature
        Property(name="assumption_type",      data_type=DataType.TEXT),  # matches Excavator output types
    ]
)

client.close()
print("✓ Schema created — 3 collections ready")`,

ingestion: `# batch_ingest.py — Owner: Samruddhi — run ONCE before demo day
# Pre-populates Weaviate with ~500-2000 fact chunks
import weaviate
from weaviate.auth import AuthApiKey

client = weaviate.connect_to_weaviate_cloud(
    cluster_url="YOUR_WEAVIATE_CLOUD_URL",
    auth_credentials=AuthApiKey("YOUR_WEAVIATE_API_KEY"),
)

# ── Synthetic facts — pre-seeded for demo reliability ────────────────────────
SYNTHETIC_FACTS = [
    {
        "claim": "Most solo founders take 6–12 weeks to ship a functional MVP, not 2 weeks.",
        "domain": "startup", "source": "YC partner data",
        "confidence": 0.85, "recency_year": 2024,
        "contradicts": "Myth: you can ship an MVP in a weekend",
    },
    {
        "claim": "Organic growth without a defined acquisition channel is the #1 early-stage failure signal.",
        "domain": "startup", "source": "First Round Capital",
        "confidence": 0.90, "recency_year": 2024,
        "contradicts": "Myth: great products market themselves",
    },
    {
        "claim": "42% of startups fail due to no market need — not poor execution.",
        "domain": "startup", "source": "CB Insights 2021",
        "confidence": 0.88, "recency_year": 2021,
        "contradicts": "Myth: execution is the only thing that matters",
    },
    {
        "claim": "Learning a new programming language to production-level takes 3–6 months of consistent daily practice.",
        "domain": "education", "source": "Stack Overflow Dev Survey 2023",
        "confidence": 0.80, "recency_year": 2023,
        "contradicts": "Myth: you can learn to code in 30 days",
    },
    {
        "claim": "Bootcamp graduates report median time-to-first-job of 6 months, not 3 months as advertised.",
        "domain": "education", "source": "Course Report 2023",
        "confidence": 0.75, "recency_year": 2023,
        "contradicts": "Myth: bootcamps guarantee fast job placement",
    },
]

SYNTHETIC_FAILURES = [
    {
        "pattern_description": "Underestimated user acquisition cost — assuming users come for free.",
        "failure_category": "market", "frequency": "very_common",
        "early_warning_signal": "User says 'viral growth' or 'word of mouth' without a concrete channel",
        "backup_plan_hint": "Budget 3x for marketing; identify one paid channel to test at small scale",
        "assumption_type": "user_behavior",
    },
    {
        "pattern_description": "Timeline compression — 2-week MVPs become 3-month builds.",
        "failure_category": "timeline", "frequency": "very_common",
        "early_warning_signal": "Plan has no buffer; assumes everything works first try",
        "backup_plan_hint": "Add 50% time buffer to every milestone; identify the one must-have feature",
        "assumption_type": "timeline",
    },
    {
        "pattern_description": "Building without talking to users — solving an assumed problem.",
        "failure_category": "market", "frequency": "common",
        "early_warning_signal": "Idea description has no mention of user research or prior validation",
        "backup_plan_hint": "Schedule 5 user interviews before writing any code",
        "assumption_type": "market_size",
    },
    {
        "pattern_description": "Technical debt from rushing — MVP becomes unmaintainable within 30 days.",
        "failure_category": "technical", "frequency": "common",
        "early_warning_signal": "Team skipping tests or documentation to ship faster",
        "backup_plan_hint": "Allocate 20% of time to refactoring; choose boring, well-documented tech",
        "assumption_type": "skill",
    },
]

# ── Insert into Weaviate ───────────────────────────────────────────────────────
facts    = client.collections.get("RealWorldFact")
failures = client.collections.get("FailurePattern")

with facts.batch.dynamic() as batch:
    for f in SYNTHETIC_FACTS:
        batch.add_object(properties=f)

with failures.batch.dynamic() as batch:
    for f in SYNTHETIC_FAILURES:
        batch.add_object(properties=f)

# ── Sources to scrape at ingest time ─────────────────────────────────────────
# Uncomment when scraper.py is ready (Samruddhi builds this)
# SOURCES = [
#     {"url": "https://paulgraham.com/startupmistakes.html", "domain": "startup", "col": "RealWorldFact"},
#     {"url": "https://cbinsights.com/research/startup-failure-reasons-2019/", "domain": "startup", "col": "FailurePattern"},
#     {"url": "https://bls.gov/ooh/", "domain": "career", "col": "RealWorldFact"},
# ]
# for source in SOURCES:
#     chunks = fetch_and_chunk(source["url"])
#     col = facts if source["col"] == "RealWorldFact" else failures
#     with col.batch.dynamic() as batch:
#         for chunk in chunks:
#             batch.add_object(properties={
#                 "claim": chunk["text"], "domain": source["domain"],
#                 "source": source["url"], "confidence": 0.75, "recency_year": 2025,
#             })

client.close()
print("✓ Ingestion complete")`,

agents: `# agents.py — Owner: You (orchestration) + Suzanaa (adversary prompt)
import boto3, json, weaviate, requests, os

bedrock   = boto3.client("bedrock-runtime", region_name="us-east-1")
wv_client = weaviate.connect_to_weaviate_cloud(
    cluster_url=os.environ["WEAVIATE_URL"],
    auth_credentials=weaviate.auth.AuthApiKey(os.environ["WEAVIATE_API_KEY"]),
)

# ── LLM helper ────────────────────────────────────────────────────────────────
def call_claude(system_prompt, user_message, model="smart"):
    model_id = (
        "anthropic.claude-sonnet-4-6"         if model == "smart"
        else "anthropic.claude-haiku-4-5-20251001"  # fast agents
    )
    resp = bedrock.invoke_model(
        modelId=model_id,
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1500,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_message}],
        })
    )
    return json.loads(resp["body"].read())["content"][0]["text"]

# ── Confidence router — YOUR suggestion ───────────────────────────────────────
CONFIDENCE_THRESHOLD = 0.72  # below this → web search fallback

def search_weaviate(assumption_text):
    facts    = wv_client.collections.get("RealWorldFact")
    failures = wv_client.collections.get("FailurePattern")

    fact_results    = facts.query.near_text(query=assumption_text, limit=3, return_metadata=["certainty"])
    failure_results = failures.query.near_text(query=assumption_text, limit=2, return_metadata=["certainty"])

    all_results = fact_results.objects + failure_results.objects
    if not all_results:
        return None, 0.0

    best_score = max(o.metadata.certainty or 0 for o in all_results)
    evidence   = [
        {
            "text":   o.properties.get("claim") or o.properties.get("pattern_description"),
            "source": o.properties.get("source", "internal"),
            "score":  o.metadata.certainty,
        }
        for o in all_results
    ]
    return evidence, best_score

def web_search_fallback(assumption_text):
    """Only called when Weaviate score < 0.72"""
    resp = requests.post("https://api.tavily.com/search", json={
        "api_key": os.environ["TAVILY_API_KEY"],
        "query": assumption_text + " startup statistics real data",
        "max_results": 3,
        "search_depth": "basic",
    })
    results = resp.json().get("results", [])

    # Write back to Weaviate — self-improving corpus
    facts = wv_client.collections.get("RealWorldFact")
    for r in results[:2]:
        facts.data.insert(properties={
            "claim": r["content"][:500], "domain": "startup",
            "source": r["url"], "confidence": 0.65, "recency_year": 2025,
        })

    return [{"text": r["content"][:300], "source": r["url"], "score": 0.65} for r in results]

def get_evidence(assumption_text):
    evidence, score = search_weaviate(assumption_text)
    if score < CONFIDENCE_THRESHOLD:
        print(f"  ↳ Low confidence ({score:.2f}) — triggering web fallback")
        evidence = web_search_fallback(assumption_text)
    return evidence

# ── AGENT 1: Excavator ────────────────────────────────────────────────────────
EXCAVATOR_SYSTEM = """
You are an Assumption Excavator. Extract every hidden assumption baked into a
user's idea — things they state or imply without questioning.

Return ONLY valid JSON, no markdown, no preamble:
{
  "idea_summary": "one sentence summary of the core idea",
  "domain": "startup | career | education | health",
  "assumptions": [
    {
      "id": "a1",
      "text": "The assumption as a clear declarative statement",
      "type": "timeline | market_size | skill | cost | user_behavior | competition",
      "optimism_level": "aggressive | moderate | conservative",
      "why_it_matters": "one sentence on why this could break the plan",
      "hidden": true
    }
  ]
}

Extract 4–8 assumptions. Surface hidden (implied) ones aggressively.
If someone says "I'll build an app in 2 weeks", extract:
- timeline assumption (2 weeks for a solo dev is aggressive)
- skill assumption (assumes all required skills are already present)
- scope assumption (assumes feature set is small enough for 2 weeks)
"""

def excavator_agent(user_idea, session_id):
    raw    = call_claude(EXCAVATOR_SYSTEM, user_idea, model="smart")
    parsed = json.loads(raw)

    # Write to Weaviate for session tracking
    col = wv_client.collections.get("UserAssumption")
    for a in parsed["assumptions"]:
        col.data.insert(properties={
            "assumption_text": a["text"], "assumption_type": a["type"],
            "optimism_level": a["optimism_level"], "session_id": session_id, "validated": False,
        })
    return parsed

# ── AGENT 2: Research ─────────────────────────────────────────────────────────
RESEARCH_SYSTEM = """
You are a Research Analyst. Given one assumption and real-world evidence,
assign a confidence score and explain what the data says.

Return ONLY valid JSON:
{
  "assumption_id": "a1",
  "assumption": "the assumption text",
  "confidence_score": 0.0-1.0,
  "verdict": "optimistic | realistic | conservative",
  "evidence_summary": "2-3 sentences — what does real data say?",
  "sources": ["source1", "source2"],
  "risk_level": "high | medium | low"
}

Scoring: 0.8-1.0 = well-supported · 0.5-0.79 = partial · <0.5 = contradicted
Be honest. If evidence contradicts the assumption, say so constructively.
"""

def research_agent(assumption, session_id):
    evidence      = get_evidence(assumption["text"])
    evidence_text = "\\n".join([f"- {e['text']} (source: {e['source']})" for e in evidence])

    prompt = f"""
Assumption: {assumption["text"]}
Type: {assumption["type"]}
Optimism level: {assumption["optimism_level"]}

Evidence from real-world data:
{evidence_text}

Score and summarize this assumption against the evidence.
"""
    raw = call_claude(RESEARCH_SYSTEM, prompt, model="fast")
    return json.loads(raw)

# ── AGENT 3: Adversary — Owner: Suzanaa ─────────────────────────────────────────
ADVERSARY_SYSTEM = """
You are a Devil's Advocate — a brilliant mentor who genuinely wants this idea to 
succeed but knows unchallenged assumptions kill projects.

Your job: steelman the strongest case AGAINST this plan. Not to discourage,
but to surface what the user MUST address.

Return ONLY valid JSON:
{
  "top_risks": [
    {
      "risk": "concise risk name",
      "argument": "2-3 sentences — why this is dangerous, specific to THIS idea",
      "severity": "critical | high | medium",
      "early_warning": "what signal tells you this risk is materializing"
    }
  ],
  "hardest_question": "the single most important question the user has not answered",
  "steelman_counterplan": "if this plan fails, here is the most likely reason — 1 sentence"
}

CRITICAL: Generic risks like 'competition exists' are lazy. Attack the specific
assumptions this user made. Reference their actual idea.
"""

def adversary_agent(idea_summary, validated_assumptions):
    assumptions_text = "\\n".join([
        f"- {a['assumption']} (confidence: {a['confidence_score']:.0%}, risk: {a['risk_level']})"
        for a in validated_assumptions
    ])
    prompt = f"""
Idea: {idea_summary}

Validated assumptions with evidence scores:
{assumptions_text}

Steelman the case against this plan succeeding.
"""
    raw = call_claude(ADVERSARY_SYSTEM, prompt, model="smart")
    return json.loads(raw)

# ── AGENT 4: Planner ──────────────────────────────────────────────────────────
PLANNER_SYSTEM = """
You are an execution strategist. Build a realistic 30/60/90-day plan that
accounts for identified risks. NOT a generic roadmap — reflect the specific
idea, risks, and chosen track.

Return ONLY valid JSON:
{
  "plan_title": "short memorable name for this plan",
  "tension_warning": "if track conflicts with adversary severity — 1 sentence | null",
  "plan": {
    "day_30": {
      "goal": "what must be true by day 30",
      "milestones": ["milestone1", "milestone2", "milestone3"],
      "risk_flags": ["⚠ risk if X is not done by day 15"],
      "first_real_step": "the single action to take tomorrow morning",
      "assumption_load": 1-5
    },
    "day_60": {
      "goal": "what must be true by day 60",
      "milestones": ["milestone1", "milestone2"],
      "risk_flags": ["⚠ risk description"],
      "assumption_load": 1-5
    },
    "day_90": {
      "goal": "what must be true by day 90 for this to be a success",
      "milestones": ["milestone1", "milestone2"],
      "success_metric": "how you will know this worked",
      "assumption_load": 1-5
    }
  },
  "backup_plans": [
    { "trigger": "if [specific risk] happens", "pivot": "then do this instead" }
  ],
  "confidence_score": 0.0-1.0
}

Track rules:
- invalidate: milestones focus on evidence-gathering and pivot hypothesis testing
- find_a_user: milestones focus on ICP definition and 5 real conversations this week
- prototype: milestones focus on MVP scope, first deploy, first real user feedback
"""

def planner_agent(idea_summary, validated_assumptions, adversary_output, user_track):
    prompt = f"""
Idea: {idea_summary}
Chosen track: {user_track}

Validated assumptions:
{json.dumps(validated_assumptions, indent=2)}

Key risks from adversarial analysis:
{json.dumps(adversary_output["top_risks"], indent=2)}

Build the 30/60/90 plan.
"""
    raw = call_claude(PLANNER_SYSTEM, prompt, model="smart")
    return json.loads(raw)

# ── AGENT 5: Critic ───────────────────────────────────────────────────────────
CRITIC_SYSTEM = """
You are a plan evaluator. Score the 30/60/90-day plan on 4 dimensions.

Return ONLY valid JSON:
{
  "scores": {
    "feasibility":       { "score": 0-10, "comment": "one sentence" },
    "specificity":       { "score": 0-10, "comment": "one sentence" },
    "risk_coverage":     { "score": 0-10, "comment": "one sentence" },
    "first_step_clarity": { "score": 0-10, "comment": "one sentence" }
  },
  "overall": 0-10,
  "revision_needed": true | false,
  "revision_instructions": "if overall < 7 — what specifically to fix | null",
  "top_improvement": "the one change that would most improve this plan"
}

A score of 6 = adequate but real gaps. Be honest.
If overall < 7, set revision_needed to true.
"""

def critic_agent(plan, idea_summary):
    prompt = f"""
Idea: {idea_summary}

Plan to evaluate:
{json.dumps(plan, indent=2)}
"""
    raw = call_claude(CRITIC_SYSTEM, prompt, model="fast")
    return json.loads(raw)`,

backend: `# lambda_handlers.py — Owner: You (Soham)
# Each function deployed separately; Step Functions calls them in sequence
import json, uuid, os, boto3
from agents import excavator_agent, research_agent, adversary_agent, planner_agent, critic_agent

sfn = boto3.client("stepfunctions")

# ── Lambda 1: Excavator ───────────────────────────────────────────────────────
def handler_excavator(event, context):
    """
    INPUT:  { user_idea: string }
    OUTPUT: { session_id, idea_summary, domain, assumptions: [...] }
    """
    session_id = str(uuid.uuid4())
    result     = excavator_agent(event["user_idea"], session_id)
    return {
        "statusCode":   200,
        "session_id":   session_id,
        "idea_summary": result["idea_summary"],
        "domain":       result["domain"],
        "assumptions":  result["assumptions"],
    }

# ── Lambda 2: Research (called in parallel Map state) ────────────────────────
def handler_research(event, context):
    """
    INPUT:  { assumption: {...}, session_id: string }
    OUTPUT: { assumption_id, confidence_score, verdict, evidence_summary, risk_level }
    Called once per assumption in parallel — Step Functions Map state
    """
    result = research_agent(event["assumption"], event["session_id"])
    return {"statusCode": 200, **result}

# ── Lambda 3: Adversary ───────────────────────────────────────────────────────
def handler_adversary(event, context):
    """
    INPUT:  { idea_summary, validated_assumptions: [...] }
            validated_assumptions comes from gate1_output.confirmed_assumptions
    OUTPUT: { top_risks, hardest_question, steelman_counterplan }
    """
    result = adversary_agent(
        event["idea_summary"],
        event["validated_assumptions"],
    )
    return {"statusCode": 200, **result}

# ── Lambda 4: Planner ─────────────────────────────────────────────────────────
def handler_planner(event, context):
    """
    INPUT:  { idea_summary, validated_assumptions, adversary_output, user_track }
            user_track from gate2_output.chosen_track
    OUTPUT: { plan_title, tension_warning, plan: {day_30, day_60, day_90}, backup_plans }
    """
    result = planner_agent(
        event["idea_summary"],
        event["validated_assumptions"],
        event["adversary_output"],
        event["user_track"],
    )
    return {"statusCode": 200, **result}

# ── Lambda 5: Critic ──────────────────────────────────────────────────────────
def handler_critic(event, context):
    """
    INPUT:  { plan, idea_summary }
    OUTPUT: { scores, overall, revision_needed, top_improvement }
    """
    result = critic_agent(event["plan"], event["idea_summary"])
    return {"statusCode": 200, **result}

# ── Lambda 6: Human Gate resume handler ──────────────────────────────────────
def handler_resume_gate(event, context):
    """
    Called by frontend when user submits at Gate 1 or Gate 2.
    Sends the task token back to Step Functions to resume the paused execution.

    INPUT (from API Gateway POST /resume):
    {
      "task_token": "...",   ← stored on frontend from HumanGate notify-frontend call
      "gate": "gate1|gate2",
      "payload": { ... }     ← user's confirmed data
    }
    """
    body = json.loads(event["body"])
    sfn.send_task_success(
        taskToken=body["task_token"],
        output=json.dumps(body["payload"]),
    )
    return {
        "statusCode": 200,
        "headers": {"Access-Control-Allow-Origin": "*"},
        "body": json.dumps({"status": "resumed"}),
    }`,

stepfunctions: `// step_functions_definition.json — Owner: You (Soham)
// Deploy: AWS Console → Step Functions → Create State Machine → paste this
{
  "Comment": "IdeaStress — Zero to One Builder Agent Pipeline",
  "StartAt": "Excavator",
  "States": {

    "Excavator": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT:function:excavator",
      "ResultPath": "$.excavator_output",
      "Next": "ResearchParallel"
    },

    "ResearchParallel": {
      "Type": "Map",
      "Comment": "Run Research Agent on each assumption in parallel — one Lambda per assumption",
      "ItemsPath": "$.excavator_output.assumptions",
      "MaxConcurrency": 5,
      "Iterator": {
        "StartAt": "Research",
        "States": {
          "Research": {
            "Type": "Task",
            "Resource": "arn:aws:lambda:us-east-1:ACCOUNT:function:research",
            "End": true
          }
        }
      },
      "ResultPath": "$.validated_assumptions",
      "Next": "HumanGate1"
    },

    "HumanGate1": {
      "Type": "Task",
      "Comment": "Pause — wait for user to review/correct assumption extraction",
      "Resource": "arn:aws:states:::lambda:invoke.waitForTaskToken",
      "Parameters": {
        "FunctionName": "arn:aws:lambda:us-east-1:ACCOUNT:function:notify-frontend",
        "Payload": {
          "task_token.$": "$$.Task.Token",
          "gate": "gate1",
          "data.$": "$.validated_assumptions",
          "idea_summary.$": "$.excavator_output.idea_summary"
        }
      },
      "ResultPath": "$.gate1_output",
      "Next": "Adversary"
    },

    "Adversary": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT:function:adversary",
      "Parameters": {
        "idea_summary.$": "$.excavator_output.idea_summary",
        "validated_assumptions.$": "$.gate1_output.confirmed_assumptions"
      },
      "ResultPath": "$.adversary_output",
      "Next": "HumanGate2"
    },

    "HumanGate2": {
      "Type": "Task",
      "Comment": "Pause — wait for user to pick execution track",
      "Resource": "arn:aws:states:::lambda:invoke.waitForTaskToken",
      "Parameters": {
        "FunctionName": "arn:aws:lambda:us-east-1:ACCOUNT:function:notify-frontend",
        "Payload": {
          "task_token.$": "$$.Task.Token",
          "gate": "gate2",
          "adversary_data.$": "$.adversary_output",
          "idea_summary.$": "$.excavator_output.idea_summary"
        }
      },
      "ResultPath": "$.gate2_output",
      "Next": "Planner"
    },

    "Planner": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT:function:planner",
      "Parameters": {
        "idea_summary.$":          "$.excavator_output.idea_summary",
        "validated_assumptions.$": "$.gate1_output.confirmed_assumptions",
        "adversary_output.$":      "$.adversary_output",
        "user_track.$":            "$.gate2_output.chosen_track"
      },
      "ResultPath": "$.plan_output",
      "Next": "Critic"
    },

    "Critic": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT:function:critic",
      "Parameters": {
        "plan.$":         "$.plan_output.plan",
        "idea_summary.$": "$.excavator_output.idea_summary"
      },
      "ResultPath": "$.critic_output",
      "Next": "CheckRevision"
    },

    "CheckRevision": {
      "Type": "Choice",
      "Choices": [
        {
          "Variable": "$.critic_output.revision_needed",
          "BooleanEquals": true,
          "Next": "PlannerRevision"
        }
      ],
      "Default": "Done"
    },

    "PlannerRevision": {
      "Type": "Task",
      "Comment": "One revision loop if Critic score < 7",
      "Resource": "arn:aws:lambda:us-east-1:ACCOUNT:function:planner",
      "Parameters": {
        "idea_summary.$":            "$.excavator_output.idea_summary",
        "validated_assumptions.$":   "$.gate1_output.confirmed_assumptions",
        "adversary_output.$":        "$.adversary_output",
        "user_track.$":              "$.gate2_output.chosen_track",
        "revision_instructions.$":   "$.critic_output.revision_instructions"
      },
      "ResultPath": "$.plan_output",
      "Next": "Done"
    },

    "Done": {
      "Type": "Pass",
      "End": true
    }
  }
}`,

frontend: `// App.jsx — Owner: Joshita
// 4 screens: Input → Gate 1 (assumption review) → Gate 2 (track pick) → Output
// Connect API_BASE to your API Gateway URL
import { useState } from "react";

const API_BASE = "https://YOUR_API_GATEWAY_URL";

// ── Helpers ───────────────────────────────────────────────────────────────────
async function apiPost(path, body) {
  const res = await fetch(\`\${API_BASE}\${path}\`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiGet(path) {
  const res = await fetch(\`\${API_BASE}\${path}\`);
  return res.json();
}

async function pollForStage(executionArn, targetGate, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const data = await apiGet(
      \`/status?executionArn=\${encodeURIComponent(executionArn)}&gate=\${targetGate}\`
    );
    if (data.ready) return data.payload;
  }
  throw new Error("Timed out waiting for pipeline");
}

// ── Screen 1: Idea Input ──────────────────────────────────────────────────────
function InputScreen({ onSubmit, loading }) {
  const [idea, setIdea] = useState("");
  const EXAMPLES = [
    "I want to build a SaaS app for freelance designers to track invoices. I'll ship in 2 weeks and get 500 signups organically.",
    "I'm going to learn ML in a month then get a data science job at a startup within 3 months.",
    "My startup idea: a food delivery app for college campuses. I'll undercut existing players by 20% and capture 10% market share in year 1.",
  ];

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "60px 24px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", color: "#4f46e5", marginBottom: 16 }}>
        IDEASTRESS · ZERO TO ONE BUILDER
      </div>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(32px,5vw,52px)", fontWeight: 700, lineHeight: 1.1, letterSpacing: -1, marginBottom: 20, color: "#f0f0f5" }}>
        Turn your idea into<br /><span style={{ color: "#818cf8" }}>an honest plan.</span>
      </h1>
      <p style={{ fontSize: 17, color: "#8892b0", lineHeight: 1.6, marginBottom: 40 }}>
        Describe your idea. We'll excavate hidden assumptions, stress-test them against real data, and build a risk-weighted 30/60/90-day plan.
      </p>

      <textarea
        value={idea}
        onChange={e => setIdea(e.target.value)}
        placeholder="Describe your idea, startup, project, or goal in your own words..."
        style={{
          width: "100%", minHeight: 140, background: "#0f1428",
          border: "1px solid #1e2640", borderRadius: 12, padding: 20,
          color: "#f0f0f5", fontSize: 16, lineHeight: 1.6, resize: "vertical",
          outline: "none", fontFamily: "'Inter', sans-serif", boxSizing: "border-box",
        }}
        onFocus={e => e.target.style.borderColor = "#4f46e5"}
        onBlur={e => e.target.style.borderColor = "#1e2640"}
      />

      <div style={{ marginTop: 12, marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: "#4a5578", marginBottom: 8 }}>Try an example:</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {EXAMPLES.map((ex, i) => (
            <button key={i}
              onClick={() => setIdea(ex)}
              style={{ padding: "6px 14px", background: "#1e2640", border: "none", borderRadius: 6, color: "#8892b0", fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
              Example {i + 1}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => idea.trim() && onSubmit(idea)}
        disabled={!idea.trim() || loading}
        style={{
          marginTop: 20, padding: "14px 28px", background: "#4f46e5", color: "#fff",
          border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer",
          opacity: (!idea.trim() || loading) ? 0.5 : 1, fontFamily: "'Inter', sans-serif",
        }}>
        {loading ? "Excavating assumptions…" : "Analyse my idea →"}
      </button>
    </div>
  );
}

// ── Screen 2: Gate 1 — Review Assumptions ────────────────────────────────────
function Gate1Screen({ data, onConfirm, loading }) {
  const [assumptions, setAssumptions] = useState(data.validated_assumptions);
  const riskColor = l => l === "high" ? "#f87171" : l === "medium" ? "#fbbf24" : "#34d399";

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "60px 24px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", color: "#db2777", marginBottom: 16 }}>
        HUMAN GATE 1 · ASSUMPTION REVIEW
      </div>
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "#f0f0f5", marginBottom: 8 }}>
        We found {assumptions.length} hidden assumptions
      </h2>
      <p style={{ color: "#8892b0", marginBottom: 32, fontSize: 15 }}>
        <strong style={{ color: "#f0f0f5" }}>Your idea:</strong> {data.idea_summary}
        <br />Review and correct anything that's wrong. The plan is only as good as your assumptions.
      </p>

      {assumptions.map((a, i) => (
        <div key={i} style={{
          background: "#0f1428", borderRadius: 10, padding: "18px 20px", marginBottom: 12,
          border: \`1px solid \${a.risk_level === "high" ? "#7f1d1d" : a.risk_level === "medium" ? "#78350f" : "#1e2640"}\`,
        }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "#1a0a0a", color: riskColor(a.risk_level) }}>
              {a.risk_level === "high" ? "🔴 High risk" : a.risk_level === "medium" ? "🟡 Watch" : "🟢 Low"}
            </span>
            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: "#0a1020", color: "#818cf8" }}>
              {a.assumption_type}
            </span>
            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, background: "#0a1020", color: "#4a5578" }}>
              {a.optimism_level}
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#f0f0f5", marginBottom: 6 }}>{a.assumption}</div>
          <div style={{ fontSize: 13, color: "#8892b0", marginBottom: 12 }}>{a.evidence_summary}</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#4a5578", marginBottom: 4 }}>
            <span>Reality check</span>
            <span style={{ color: riskColor(a.risk_level), fontWeight: 700 }}>{(a.confidence_score * 100).toFixed(0)}% confidence</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: \`linear-gradient(to right, \${riskColor(a.risk_level)} \${a.confidence_score * 100}%, #1e2640 0)\` }} />
        </div>
      ))}

      <div style={{ background: "#0a0e1a", border: "1px solid #4f46e5", borderRadius: 10, padding: "14px 18px", marginTop: 24, marginBottom: 28, fontSize: 13, color: "#8892b0" }}>
        <strong style={{ color: "#818cf8" }}>⚠ Responsible AI note:</strong> These confidence scores are decision inputs, not verdicts. Correct anything that doesn't match your situation before continuing.
      </div>

      <button
        onClick={() => onConfirm({ task_token: data.task_token, confirmed_assumptions: assumptions })}
        disabled={loading}
        style={{ padding: "14px 28px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.5 : 1, fontFamily: "'Inter', sans-serif" }}>
        {loading ? "Running adversary analysis…" : "These look right — stress-test my plan →"}
      </button>
    </div>
  );
}

// ── Screen 3: Gate 2 — Adversary + Track Selection ───────────────────────────
function Gate2Screen({ data, onConfirm, loading }) {
  const [chosen, setChosen] = useState(null);
  const { adversary_output, task_token } = data;
  const TRACKS = [
    { id: "prototype",   label: "Full speed ahead", sub: "I'll address risks as I go — build the prototype" },
    { id: "find_a_user", label: "Find a user first", sub: "I believe it — help me get 5 real conversations this week" },
    { id: "invalidate",  label: "Rethink the core",  sub: "The adversary makes a point — help me pivot or validate" },
  ];

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "60px 24px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", color: "#db2777", marginBottom: 16 }}>
        HUMAN GATE 2 · EXECUTION TRACK
      </div>
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "#f0f0f5", marginBottom: 8 }}>
        The devil's advocate has spoken
      </h2>
      <p style={{ color: "#8892b0", marginBottom: 32, fontSize: 15 }}>
        Read carefully. The AI will NOT pick your track — that decision is yours.
      </p>

      <div style={{ background: "#0f1428", border: "1px solid #7f1d1d", borderRadius: 10, padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171", marginBottom: 16 }}>🎯 Top Risks</div>
        {adversary_output.top_risks.map((r, i) => (
          <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < adversary_output.top_risks.length - 1 ? "1px solid #1e2640" : "none" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: r.severity === "critical" ? "#2d0a0a" : "#2d1a00", color: r.severity === "critical" ? "#f87171" : "#fbbf24" }}>
                {r.severity.toUpperCase()}
              </span>
              <span style={{ fontWeight: 600, fontSize: 14, color: "#f0f0f5" }}>{r.risk}</span>
            </div>
            <div style={{ fontSize: 13, color: "#8892b0", marginBottom: 4 }}>{r.argument}</div>
            <div style={{ fontSize: 12, color: "#818cf8" }}>Early signal: {r.early_warning}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#0f1428", border: "1px solid #1e3a5f", borderRadius: 10, padding: "18px 24px", marginBottom: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#38bdf8", marginBottom: 8 }}>❓ The hardest question you haven't answered</div>
        <div style={{ fontSize: 16, fontStyle: "italic", color: "#f0f0f5" }}>"{adversary_output.hardest_question}"</div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", color: "#4f46e5", marginBottom: 16 }}>CHOOSE YOUR TRACK</div>
      {TRACKS.map(t => (
        <div key={t.id}
          onClick={() => setChosen(t.id)}
          style={{
            background: "#0f1428", border: \`1px solid \${chosen === t.id ? "#4f46e5" : "#1e2640"}\`,
            borderRadius: 10, padding: "16px 20px", marginBottom: 10, cursor: "pointer",
            transition: "border-color 0.2s",
          }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", flexShrink: 0, border: \`2px solid \${chosen === t.id ? "#4f46e5" : "#1e2640"}\`, background: chosen === t.id ? "#4f46e5" : "transparent" }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#f0f0f5" }}>{t.label}</div>
              <div style={{ fontSize: 13, color: "#8892b0" }}>{t.sub}</div>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={() => chosen && onConfirm({ task_token, chosen_track: chosen })}
        disabled={!chosen || loading}
        style={{ marginTop: 20, padding: "14px 28px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: (!chosen || loading) ? 0.5 : 1, fontFamily: "'Inter', sans-serif" }}>
        {loading ? "Building your plan…" : "Build my 30/60/90-day plan →"}
      </button>
    </div>
  );
}

// ── Screen 4: Final Output ────────────────────────────────────────────────────
function OutputScreen({ data }) {
  const { plan_output, critic_output, idea_summary } = data;
  const { plan, backup_plans, tension_warning } = plan_output;
  const scoreColor = s => s >= 7 ? "#34d399" : s >= 5 ? "#fbbf24" : "#f87171";
  const phases = [
    { days: 30, d: plan.day_30, color: "#4f46e5" },
    { days: 60, d: plan.day_60, color: "#7c3aed" },
    { days: 90, d: plan.day_90, color: "#a855f7" },
  ];

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "60px 24px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", color: "#34d399", marginBottom: 16 }}>
        YOUR PLAN · COMPLETE ✓
      </div>
      <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "#f0f0f5", marginBottom: 24 }}>
        {plan_output.plan_title}
      </h2>

      {tension_warning && (
        <div style={{ background: "#1a1200", border: "1px solid #78350f", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#fbbf24" }}>
          ⚠ {tension_warning}
        </div>
      )}

      {/* Critic scores */}
      <div style={{ background: "#0f1428", border: "1px solid #1e3a5f", borderRadius: 10, padding: "20px 24px", marginBottom: 32 }}>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 12 }}>
          {Object.entries(critic_output.scores).map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 11, color: "#4a5578", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>{k.replace(/_/g," ")}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: scoreColor(v.score) }}>{v.score}<span style={{ fontSize: 14, color: "#4a5578" }}>/10</span></div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, color: "#818cf8" }}>💡 {critic_output.top_improvement}</div>
      </div>

      {/* First real step */}
      <div style={{ background: "#0a0e1a", border: "1px solid #4f46e5", borderRadius: 10, padding: "18px 24px", marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", color: "#818cf8", marginBottom: 8 }}>START HERE — TOMORROW MORNING</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#f0f0f5" }}>{plan.day_30.first_real_step}</div>
      </div>

      {/* 30/60/90 */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", color: "#4f46e5", marginBottom: 16 }}>30 / 60 / 90-DAY MILESTONES</div>
      {phases.map(({ days, d, color }) => (
        <div key={days} style={{ background: "#0f1428", border: \`1px solid \${color}30\`, borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 8 }}>Day {days}</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#f0f0f5", marginBottom: 14 }}>{d.goal}</div>
          {d.milestones.map((m, i) => (
            <div key={i} style={{ fontSize: 13, color: "#8892b0", marginBottom: 6 }}>
              <span style={{ color }}>→</span> {m}
            </div>
          ))}
          {d.risk_flags?.map((flag, i) => (
            <div key={i} style={{ fontSize: 12, color: "#fbbf24", marginTop: 10 }}>{flag}</div>
          ))}
          {d.success_metric && (
            <div style={{ fontSize: 12, color: "#34d399", marginTop: 10 }}>✓ Success: {d.success_metric}</div>
          )}
        </div>
      ))}

      {/* Backup plans */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", color: "#4f46e5", marginBottom: 16, marginTop: 8 }}>BACKUP PLANS</div>
      {backup_plans.map((bp, i) => (
        <div key={i} style={{ background: "#0f1428", border: "1px solid #1e2640", borderRadius: 10, padding: "14px 18px", marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: "#f87171", marginBottom: 6 }}>If: {bp.trigger}</div>
          <div style={{ fontSize: 13, color: "#34d399" }}>Then: {bp.pivot}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [stage, setStage] = useState("input");
  const [loading, setLoading] = useState(false);
  const [stageData, setStageData] = useState(null);
  const [executionArn, setExecutionArn] = useState(null);

  async function handleIdeaSubmit(idea) {
    setLoading(true);
    try {
      const data = await apiPost("/start", { user_idea: idea });
      setExecutionArn(data.executionArn);
      const payload = await pollForStage(data.executionArn, "gate1");
      setStageData(payload);
      setStage("gate1");
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleGate1Confirm(payload) {
    setLoading(true);
    try {
      await apiPost("/resume", { ...payload, gate: "gate1" });
      const next = await pollForStage(executionArn, "gate2");
      setStageData(next);
      setStage("gate2");
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleGate2Confirm(payload) {
    setLoading(true);
    try {
      await apiPost("/resume", { ...payload, gate: "gate2" });
      const next = await pollForStage(executionArn, "output");
      setStageData(next);
      setStage("output");
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const STAGE_LABELS = { input: "Step 1 of 4", gate1: "Step 2 of 4", gate2: "Step 3 of 4", output: "Complete ✓" };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", color: "#f0f0f5", fontFamily: "'Inter', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=Inter:wght@400;600&display=swap" rel="stylesheet" />
      <header style={{ borderBottom: "1px solid #1e2640", padding: "18px 40px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: "#818cf8", letterSpacing: "-0.5px" }}>IdeaStress</span>
        <span style={{ fontSize: 11, padding: "3px 8px", background: "#1e2640", borderRadius: 4, color: "#818cf8", fontWeight: 600, letterSpacing: "0.5px" }}>USAII 2026</span>
        <span style={{ marginLeft: "auto", fontSize: 13, color: "#4a5578" }}>{STAGE_LABELS[stage]}</span>
      </header>

      {stage === "input"  && <InputScreen  onSubmit={handleIdeaSubmit}   loading={loading} />}
      {stage === "gate1"  && <Gate1Screen  data={stageData} onConfirm={handleGate1Confirm} loading={loading} />}
      {stage === "gate2"  && <Gate2Screen  data={stageData} onConfirm={handleGate2Confirm} loading={loading} />}
      {stage === "output" && <OutputScreen data={stageData} />}
    </div>
  );
}`,

devpost: `## Devpost Submission — IdeaStress: Zero-to-One Builder
## Challenge Brief 3 · Direction B · Undergraduate Track

---
### Project Description
IdeaStress is an AI-powered execution planning tool for students, aspiring
founders, and creators. It helps users move from a vague idea to a
risk-weighted 30/60/90-day plan by doing what no rules engine can: extracting
the hidden assumptions baked into the user's own language, validating them
against real-world evidence, stress-testing them with adversarial AI analysis,
and generating a structured plan with backup paths.

The user is a college student or recent grad who has an idea but doesn't know
where to start — or has already started and is running on optimistic
assumptions that will quietly break the plan before they realise it.

---
### AI Architecture Explanation

Inputs: Free-text idea description (unstructured natural language).

AI capabilities: NLU (assumption extraction from implicit language) + RAG
(validating assumptions against a real-world fact corpus) + Adversarial
reasoning (steelmanning risks specific to the user's idea) + Structured
generation (30/60/90-day plan with confidence scores).

Processing pipeline — 5 agents in sequence with 2 human gates:

1. Excavator Agent (Claude Sonnet 4.6 via Bedrock)
   Extracts 4–8 hidden assumptions. Surfaces implied ones
   (timeline, skill, market_size, cost, user_behavior, competition).

2. Research Agent (Claude Haiku 4.5 × parallel per assumption)
   Queries Weaviate vector DB (cosine similarity search) against a pre-ingested
   corpus of YC essays, BLS data, and CB Insights failure reports.
   Falls back to Tavily web search if cosine similarity < 0.72.
   Results written back to Weaviate to improve the corpus over time.

3. [HUMAN GATE 1] User reviews assumption extraction, corrects errors,
   sees confidence scores per assumption.

4. Adversary Agent (Claude Sonnet 4.6)
   Steelmans strongest risks, specific to THIS idea — not generic advice.
   Surfaces the hardest question the user hasn't answered.

5. [HUMAN GATE 2] User reads adversary output, then chooses execution track
   (prototype / find_a_user / invalidate). AI does NOT choose.

6. Planner Agent (Claude Sonnet 4.6)
   Builds a risk-weighted 30/60/90-day plan, track-specific milestones,
   backup plans, and tension warnings if chosen track conflicts with risks.

7. Critic Agent (Claude Haiku 4.5)
   Scores plan on 4 dimensions (feasibility, specificity, risk_coverage,
   first_step_clarity). Triggers one revision loop with Planner if score < 7.

Outputs: Assumption validation with confidence scores, adversarial risk
analysis, 30/60/90-day milestone plan with risk flags and backup plans.

---
### Human-in-the-Loop Design

Gate 1 (Assumption Review): The AI extracts assumptions but cannot know if
they reflect the user's actual context, resources, or risk tolerance. The user
must confirm or correct each assumption before adversarial analysis runs. If
the AI misreads the user's situation, the entire plan is built on a wrong
foundation — the human must remain in control here.

Gate 2 (Track Selection): After seeing the adversary's strongest case, the
user chooses which execution track to pursue. The AI deliberately does NOT
recommend a track. Risk tolerance is a personal value judgment, not a data
problem. The user decides.

---
### Responsible AI Guardrail

Risk: Over-reliance — users may treat confidence scores as definitive verdicts
and stop thinking critically about their own plan.

Mitigation:
- Confidence scores are labelled "Reality check" not "AI verdict"
- Every assumption card includes: "These scores are decision inputs, not
  verdicts. Correct anything that doesn't fit your situation."
- Human Gate 1 forces active review before the adversary runs — passive
  consumption is architecturally impossible
- Uncertainty shown explicitly: verdict labels are "optimistic / realistic /
  conservative", never "correct / incorrect"
- Planner surfaces a tension_warning if the chosen track conflicts with high-
  severity adversary findings — doesn't block, but makes the conflict visible

---
### Tools Used
- Amazon Bedrock · Claude Sonnet 4.6 (Excavator, Adversary, Planner) — AWS credits
- Amazon Bedrock · Claude Haiku 4.5 (Research, Critic) — AWS credits
- AWS Step Functions — agent pipeline with waitForTaskToken human gates
- AWS Lambda — serverless agent functions
- AWS API Gateway — frontend ↔ backend
- Weaviate Cloud — vector DB, free tier, text-embedding-3-small
- OpenAI Embeddings API — text-embedding-3-small for Weaviate vectorisation
- Tavily Search API — web fallback for low-confidence queries, free tier
- React — frontend (Joshita)
- Claude AI (claude.ai) — used to assist with architecture design and prompts (disclosed)

---
### Data Disclosure
Batch-ingested corpus (pre-demo, stored in Weaviate):
- Paul Graham essays (public, paulgraham.com) — startup timelines + failure reasons
- CB Insights startup failure reports (public research) — failure pattern corpus
- Bureau of Labor Statistics occupational data (public, bls.gov) — career/salary facts
- First Round Capital blog (public) — founder assumption post-mortems
- Course Report bootcamp outcome data (public) — learning timeline benchmarks

Synthetic data: 15 pre-seeded fact claims + 10 failure patterns created by the
team for demo reliability. Each marked source: "synthetic-demo" in Weaviate.

Runtime: User-provided free-text only. No PII stored — session IDs are UUIDs
with no user identity attached.`,
};

// ─── OVERVIEW FLOW ────────────────────────────────────────────────────────────
const FLOW = [
  { label: "User Input",    sub: "Free-text idea",               color: "#4f46e5", gate: false },
  { label: "Excavator",     sub: "Claude Sonnet · You",          color: "#6366f1", gate: false },
  { label: "Research ×N",   sub: "Claude Haiku · Weaviate RAG",  color: "#7c3aed", gate: false },
  { label: "HUMAN GATE 1",  sub: "User reviews assumptions",     color: "#db2777", gate: true  },
  { label: "Adversary",     sub: "Claude Sonnet · Suzanaa",        color: "#9333ea", gate: false },
  { label: "HUMAN GATE 2",  sub: "User picks track",             color: "#db2777", gate: true  },
  { label: "Planner",       sub: "Claude Sonnet · You",          color: "#a855f7", gate: false },
  { label: "Critic",        sub: "Claude Haiku · You",           color: "#c084fc", gate: false },
  { label: "Final Plan",    sub: "Risk-weighted 30/60/90",       color: "#34d399", gate: false },
];

const BUILD_ORDER = [
  ["Day 1 AM", "Weaviate schema + batch_ingest.py",         "Samruddhi"],
  ["Day 1 PM", "Agent prompts + Bedrock calls (agents.py)", "You"],
  ["Day 1 PM", "Adversary Agent prompt engineering",        "Suzanaa"],
  ["Day 2 AM", "Lambda handlers + Step Functions ASL",      "You (Soham)"],
  ["Day 2 PM", "Frontend — Gate 1 + Gate 2 screens",        "Joshita"],
  ["Day 3 AM", "End-to-end integration + full demo test",   "All"],
  ["Day 3 PM", "Devpost write-up + pitch video",            "All"],
];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function App() {
  const [active, setCurrent] = useState("overview");
  const [copied, setCopied]   = useState(false);

  function copy() {
    if (CODE[active]) {
      navigator.clipboard.writeText(CODE[active]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  const meta = SECTION_META[active];

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Inter', sans-serif", background: "#070a12", color: "#f0f0f5" }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=Inter:wght@400;600&family=Fira+Code&display=swap" rel="stylesheet" />

      {/* ── Sidebar ── */}
      <div style={{ width: 220, flexShrink: 0, borderRight: "1px solid #151c2e", padding: "24px 0", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 20px 24px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: "#818cf8", letterSpacing: "-0.5px", lineHeight: 1.3 }}>
          IdeaStress<br />
          <span style={{ fontSize: 10, fontWeight: 400, color: "#2a3550", letterSpacing: "1px" }}>IMPL DOC v1</span>
        </div>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setCurrent(s.id)} style={{
            display: "flex", alignItems: "center", gap: 10,
            width: "100%", textAlign: "left", padding: "10px 20px",
            border: "none", cursor: "pointer",
            background: active === s.id ? "#0d1220" : "transparent",
            color: active === s.id ? "#818cf8" : "#4a5578",
            fontSize: 13, fontWeight: active === s.id ? 600 : 400,
            borderLeft: active === s.id ? "2px solid #4f46e5" : "2px solid transparent",
            fontFamily: "'Inter', sans-serif", transition: "all 0.15s",
          }}>
            <span style={{ fontSize: 14, opacity: 0.7 }}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "36px 48px" }}>
        <div style={{ maxWidth: 900 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", color: "#2a3550", marginBottom: 8 }}>
            {meta.description}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, color: "#f0f0f5", margin: 0 }}>
              {meta.title}
            </h1>
            {CODE[active] && (
              <button onClick={copy} style={{
                padding: "8px 18px", background: copied ? "#0d2010" : "#151c2e",
                border: `1px solid ${copied ? "#34d399" : "#1e2640"}`,
                color: copied ? "#34d399" : "#8892b0", borderRadius: 8,
                fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif", flexShrink: 0,
              }}>
                {copied ? "✓ Copied" : "Copy code"}
              </button>
            )}
          </div>

          {/* Overview */}
          {active === "overview" && (
            <div>
              <p style={{ color: "#8892b0", fontSize: 15, lineHeight: 1.7, marginBottom: 36 }}>
                Your complete implementation guide. Each section in the sidebar contains copy-paste-ready code for one layer of the system.
                Build in this order: <strong style={{ color: "#818cf8" }}>Weaviate Schema → Batch Ingestion → Agents → Lambda → Step Functions → Frontend → Devpost</strong>.
              </p>

              {/* Pipeline */}
              <div style={{ marginBottom: 40 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", color: "#2a3550", marginBottom: 20 }}>AGENT PIPELINE</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {FLOW.map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 18 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: step.gate ? 8 : "50%",
                          background: step.gate ? "#1a0818" : "#0d1220",
                          border: `2px solid ${step.color}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: step.gate ? 14 : 16,
                        }}>
                          {step.gate ? "👤" : i === 0 ? "✎" : i === FLOW.length-1 ? "✓" : "◎"}
                        </div>
                        {i < FLOW.length - 1 && <div style={{ width: 2, height: 20, background: "#151c2e" }} />}
                      </div>
                      <div style={{ paddingBottom: i < FLOW.length - 1 ? 0 : 0, minWidth: 160 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: step.gate ? "#db2777" : "#f0f0f5" }}>{step.label}</div>
                        <div style={{ fontSize: 12, color: "#2a3550" }}>{step.sub}</div>
                      </div>
                      {step.gate && (
                        <div style={{ fontSize: 10, padding: "3px 10px", background: "#1a0818", border: "1px solid #7f1d1d", borderRadius: 4, color: "#db2777", fontWeight: 700, letterSpacing: "0.5px" }}>
                          AI STOPS · HUMAN DECIDES
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Build order */}
              <div style={{ background: "#0d1220", border: "1px solid #151c2e", borderRadius: 10, padding: "20px 24px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", color: "#4f46e5", marginBottom: 20 }}>BUILD ORDER — 3 DAYS LEFT</div>
                {BUILD_ORDER.map(([time, task, owner], i) => (
                  <div key={i} style={{ display: "flex", gap: 20, marginBottom: 14, fontSize: 13, alignItems: "flex-start" }}>
                    <span style={{ color: "#4f46e5", fontWeight: 600, minWidth: 76, flexShrink: 0 }}>{time}</span>
                    <span style={{ color: "#f0f0f5", flex: 1 }}>{task}</span>
                    <span style={{ color: "#4a5578", minWidth: 100, textAlign: "right", flexShrink: 0 }}>{owner}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Code */}
          {CODE[active] && (
            <pre style={{
              background: "#070a12", border: "1px solid #151c2e", borderRadius: 12,
              padding: "24px 28px", overflowX: "auto", fontSize: 13, lineHeight: 1.7,
              color: "#c9d1d9", margin: 0, whiteSpace: "pre",
              fontFamily: "'Fira Code', 'Cascadia Code', monospace",
            }}>
              {CODE[active]}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
