# Walkthrough: Weaviate Setup and AWS Native AI Integration (Amazon Nova Edition)

We have successfully completed the core backend logic for the Idea Stress Tester, building a fully scalable, enterprise-grade architecture using native AWS AI models!

Here's a breakdown of what has been built and fully tested:

## 1. Single-Collection Vector Database
To bypass the strict 1-collection limit on Weaviate's free sandbox tier, we designed a unified schema.

- **[weaviate_schema.py](file:///c:/Users/Asus/Desktop/idea-stress/backend/weaviate_schema.py):** Connects to Weaviate Cloud and creates a single `IdeaStressData` collection. It uses the `text2vec-google-aistudio` module with the `gemini-embedding-2` model so that all your text embeddings are generated for free.
- **[batch_ingest.py](file:///c:/Users/Asus/Desktop/idea-stress/backend/batch_ingest.py):** Seeds the database with the mock `RealWorldFact` and `FailurePattern` records. By storing them in one collection, we use a `record_type` property to distinguish them.

## 2. Serverless AI Agents (AWS Bedrock & Amazon Nova)
# Idea Stress Tester - Final Hackathon Walkthrough

The **Idea Stress Tester** is now **100% operational**! We successfully pivoted the serverless architecture to use **Weaviate Cloud as a persistent global state cache**, solving the tricky AWS Step Functions asynchronous pausing limitations. with extreme concurrency (MaxConcurrency: 10), completing complex research loops in mere seconds without hitting 429 Too Many Requests errors.

## 3. Frontend Orchestration
- **React UI:** A highly polished, dynamic dark-mode React application (`App.jsx`) that smoothly polls the AWS backend for state updates, rendering beautiful Glassmorphism cards as the AWS Step Functions workflow progresses through Gate 1 and Gate 2.
