# IdeaStress: The Zero-to-One Builder
**USAII Global AI Hackathon 2026 Submission**  
**Track:** Undergraduate | AI for Life, Learning & Work  
**Challenge:** Direction B - Zero-to-One Builder  

---

## 🌐 Live Demo
**Try it now:** [https://main.dqqa45wohr6c.amplifyapp.com/](https://main.dqqa45wohr6c.amplifyapp.com/)

---

## 🚀 The Problem: The Ambiguity Paralysis
Modern aspiring founders, creators, and students have brilliant ideas but constantly suffer from **ambiguity paralysis**. When facing the leap from a "vague idea" to the "first real step," they are overwhelmed by hidden assumptions, uncalculated risks, and a lack of structured execution. Standard AI chatbots oversimplify this into generic "pros/cons" lists, generating output that lacks reasoning, factual grounding, or realistic pushback. 

## 💡 Our Solution: IdeaStress
**IdeaStress** is an autonomous, multi-agent "Second Brain" that forces users to confront the reality of their ideas. Instead of just generating a generic task list, it rigorously stress-tests the idea through a gauntlet of specialized AI agents. It extracts core assumptions, validates them against real-world data, plays Devil's Advocate to expose fatal flaws, and ultimately synthesizes a highly structured, risk-mitigated 30/60/90-day execution plan.

It moves users from **confusion → clarity → meaningful action**.

---

## 🧠 AI Architecture & Solution Design
*(Addresses Judging Criteria: Solution Design - 25%)*

Our architecture is a massive leap beyond a simple wrapper. We orchestrated a **Serverless Multi-Agent System** using **AWS Step Functions** to manage complex, parallel AI reasoning loops.

### The Input → AI → Output Pipeline
1. **Input:** The user submits a raw, unstructured idea.
2. **Phase 1: Excavation & RAG Validation:** The `Excavator` agent deconstructs the idea into core, falsifiable assumptions. The `Researcher` agent queries **Weaviate Cloud (Vector DB)** and live search APIs for real-world evidence, scoring the feasibility of each assumption.
3. **Phase 2: The Adversary (Red Teaming):** A `Devil's Advocate` agent actively tries to destroy the idea using the gathered research, highlighting critical market or technical risks.
4. **Phase 3: Synthesis & Planning:** If the user survives the critique and pivots appropriately, the `Planner` generates a 30/60/90-day execution plan, explicitly identifying the **very first literal action to take tomorrow**.
5. **Output:** A customized, dynamically graded dashboard scoring the final plan on Feasibility and Risk Coverage.

### Why LLMs over Rules-Engines?
*(Addresses Judging Criteria: AI Reasoning - 30%)*
A rules-engine cannot evaluate the infinite, unstructured nuance of a startup or project idea. Stress-testing requires deep semantic understanding of human ambition, market dynamics, and logical fallacies. We utilized **Amazon Nova (`amazon.nova-lite-v1:0`) via Amazon Bedrock** because it provides the immense reasoning capabilities required for contextual critique and adversarial red-teaming, which static logic trees simply cannot simulate.

---

## 🛡️ Responsible AI & Human-in-the-Loop (HITL)
*(Addresses Judging Criteria: Responsible AI - 10%)*

### Human-in-the-Loop Design
**What decision does the AI NOT make?**
The AI **never** decides whether the user should proceed with their idea or pivot. We implemented **Asynchronous HITL Gates** using AWS Step Functions `TaskTokens` and Weaviate as a persistent global state cache. 
- At **Gate 1**, the user must manually review the research validating or invalidating their assumptions. 
- At **Gate 2**, the user must read the Adversary's attack and make a conscious human decision: proceed with a Prototype, Pivot, or Invalidate. The AI guides reasoning; the human retains absolute agency.

### Responsible AI Guardrail: Mitigating False Certainty
**The Risk:** Generative AI often presents output with false certainty, leading to "over-reliance" where a student blindly follows a hallucinated business plan.
**The Mitigation:** We built an **Adversarial Architecture**. By forcing the idea through a `Devil's Advocate` agent that is hard-prompted to find flaws, we mathematically reduce confirmation bias. Furthermore, the `Critic` agent grades the final output, explicitly flagging if the plan's feasibility is too low and warning the user of outstanding risks. We represent uncertainty honestly.

---

## 🛠️ Tools & Data Disclosure

**Tools Used:**
- **AI Models:** Amazon Nova (`amazon.nova-lite-v1:0`) via AWS Bedrock (Paid/Cloud)
- **Orchestration:** AWS Step Functions & AWS Lambda (Python `boto3`)
- **Vector Database & State Cache:** Weaviate Cloud (WCD) for RAG and persistent step-function state caching.
- **Frontend:** React + Vite, deployed via AWS Amplify (Free/Open Source tools)

**Data Disclosure:**
- Weaviate is seeded with public startup failure patterns and real-world market facts.
- Live context is injected via Tavily Search APIs to ensure the AI's critique is grounded in the current reality of 2026, not stale training data.

---

## 📖 How to Use IdeaStress

1. **Submit Your Idea:** Go to the Live Demo URL and type in a brief description of your ambitious project, life goal, or startup idea.
2. **Review Assumptions (Gate 1):** The `Excavator` and `Researcher` agents will automatically break your idea down into core assumptions and fact-check them against real-world data. Review their findings.
3. **Face the Adversary (Gate 2):** Read the `Devil's Advocate` critique. Decide how you want to proceed: Prototype, Find a User, Pivot, or Invalidate.
4. **Execute:** The `Planner` will instantly generate a mathematically scored, deeply reasoned 30/60/90-day execution plan tailored to your decision.

---

## 🚀 How to Run Locally

### 1. Backend (AWS Serverless)
1. Ensure you have an AWS account with Bedrock access to `amazon.nova-lite-v1:0`.
2. Ensure you have a Weaviate Cloud Cluster.
3. Deploy the 5 Lambda functions using the custom `backend/build_lambdas.py` script to ensure AWS `manylinux` compatibility.
4. Set Lambda environment variables: `WEAVIATE_URL`, `WEAVIATE_API_KEY`, `GEMINI_API_KEY`.
5. Deploy the `step_functions.asl.json` state machine and connect the API Gateways.

### 2. Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`
4. Or, push to GitHub and deploy instantly via **AWS Amplify**!

---
*Built by Soham, Suzanaa, Samruddhi, and Joshita for the USAII Global AI Hackathon 2026.*