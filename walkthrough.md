# Walkthrough: Weaviate Setup and Excavator Lambda

I've completed the core tasks for Tasks 1 and 2 by creating the backend scripts and lambda handler. Here's a breakdown of what was created and the exact steps you need to take to use them.

## Changes Made
All new files are located in the `backend` folder of your workspace.

- **[weaviate_schema.py](file:///c:/Users/Asus/Desktop/idea-stress/backend/weaviate_schema.py):** Connects to Weaviate Cloud and creates the `RealWorldFact`, `UserAssumption`, and `FailurePattern` collections. It uses `text2vec-openai` and handles idempotency so it can be re-run safely.
- **[batch_ingest.py](file:///c:/Users/Asus/Desktop/idea-stress/backend/batch_ingest.py):** Seeds the database with the minimum required `RealWorldFact` and `FailurePattern` records based on the mock data specs.
- **[lambda_function.py](file:///c:/Users/Asus/Desktop/idea-stress/backend/excavator/lambda_function.py):** Contains the Excavator AWS Lambda handler. It generates the required `session_id`, validates the user input, queries the `claude-sonnet-4-6` model, writes assumptions to Weaviate, and returns the expected Step Functions payload.
- **[requirements.txt](file:///c:/Users/Asus/Desktop/idea-stress/backend/requirements.txt):** Lists the Python dependencies required to run the scripts or the lambda.

---

## Action Required: Setup & Deployment

You will need to manually set up your environment variables and execute the scripts.

> [!IMPORTANT]
> The scripts and Lambda depend on three environment variables. You must set these in your terminal and in the AWS Lambda console:
> - `WEAVIATE_URL`: Your Weaviate Cloud instance URL
> - `WEAVIATE_API_KEY`: Your Weaviate Cloud API Key
> - `OPENAI_API_KEY`: Your OpenAI API key for text embeddings

### 1. Run the Setup Scripts Locally

Open your terminal in `c:\Users\Asus\Desktop\idea-stress\backend` and run:

```bash
# Install dependencies
pip install -r requirements.txt

# Set your environment variables (PowerShell format)
$env:WEAVIATE_URL="your-cluster-url"
$env:WEAVIATE_API_KEY="your-weaviate-key"
$env:OPENAI_API_KEY="your-openai-key"

# 1. Create the schema
python weaviate_schema.py

# 2. Ingest the mock data
python batch_ingest.py
```

### 2. Deploy the Excavator Lambda

1. In the AWS Console, create a new Lambda function named `excavator` using the **Python 3.12** runtime.
2. Give the Lambda's execution role permission to call **Amazon Bedrock**.
3. Under Configuration > Environment variables, add the three keys above (`WEAVIATE_URL`, `WEAVIATE_API_KEY`, `OPENAI_API_KEY`).
4. Package the code in `backend/excavator/` along with its dependencies (`weaviate-client`, `boto3`) into a deployment `.zip` and upload it to the function.
5. Create a test event with the following JSON to verify it works:
```json
{
  "user_idea": "I want to build a SaaS app in 2 weeks"
}
```
