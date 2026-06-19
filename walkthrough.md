# Walkthrough: Weaviate Setup and Excavator Lambda (Gemini Edition)

We have successfully completed the core backend logic for the Idea Stress Tester, entirely bypassing AWS Marketplace costs and Weaviate sandbox limits!

Here's a breakdown of what has been built and fully tested:

## 1. Single-Collection Vector Database
To bypass the strict 1-collection limit on Weaviate's free sandbox tier, we designed a unified schema.

- **[weaviate_schema.py](file:///c:/Users/Asus/Desktop/idea-stress/backend/weaviate_schema.py):** Connects to Weaviate Cloud and creates a single `IdeaStressData` collection. It uses the `text2vec-google-aistudio` module with the `gemini-embedding-2` model so that all your text embeddings are generated for free.
- **[batch_ingest.py](file:///c:/Users/Asus/Desktop/idea-stress/backend/batch_ingest.py):** Seeds the database with the mock `RealWorldFact` and `FailurePattern` records. By storing them in one collection, we use a `record_type` property to distinguish them.

## 2. Excavator AWS Lambda Function
We completely removed the dependency on AWS Bedrock (and the associated credit card verification errors) by calling the Gemini REST API directly.

- **[lambda_function.py](file:///c:/Users/Asus/Desktop/idea-stress/backend/excavator/lambda_function.py):** The AWS Lambda handler.
  1. Receives the `user_idea`.
  2. Generates a unique `session_id`.
  3. Sends the idea and a strict system prompt to Google's **`gemini-2.5-flash`** model via standard HTTP requests.
  4. Parses the JSON response to extract the 4-8 core assumptions.
  5. Inserts those new `UserAssumption` records into your Weaviate `IdeaStressData` collection.
  6. Returns a perfectly formatted JSON object representing the state of the session.

## 3. Deployment Artifacts
- **[excavator_payload.zip](file:///c:/Users/Asus/Desktop/idea-stress/backend/excavator_payload.zip):** The final zipped bundle containing the Lambda function and the `weaviate-client` dependencies, ready for AWS deployment.
- **[.env](file:///c:/Users/Asus/Desktop/idea-stress/backend/.env):** Your local environment variables securely storing `WEAVIATE_URL`, `WEAVIATE_API_KEY`, and `GEMINI_API_KEY`.

---

## What's Next?
At this point, **Task 1 (Database)** and **Task 2 (Excavator Lambda)** are fully completed and successfully tested end-to-end.

The next typical steps in the hackathon project would be:
1. **Task 3: Validator Lambda / Step Functions:** Building the logic that cross-references the extracted assumptions against the real-world facts to generate an optimism score.
2. **Task 4: Frontend UI:** Building the actual web application where users type in their idea.
