import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the research directory to sys.path so we can import the lambda
sys.path.append(os.path.join(os.path.dirname(__file__), "research"))

try:
    from lambda_function import lambda_handler
except ImportError as e:
    print(f"Failed to import lambda_function: {e}")
    sys.exit(1)

# Mock event that mimics what Step Functions passes to the Research lambda
mock_event = {
    "id": "test-123",
    "text": "There is a significant market of users who are interested in customized meal plans and grocery lists.",
    "type": "market_size",
    "optimism_level": "moderate",
    "session_id": "local-test-session"
}

# Ensure AWS credentials exist for Bedrock, or it will fail locally.
# Wait, we don't have AWS credentials locally!
# We will just print what would happen up until the Bedrock call.

print("Invoking Research lambda_handler locally...")
try:
    result = lambda_handler(mock_event, None)
    print("\n--- LAMBDA RESULT ---")
    import json
    print(json.dumps(result, indent=2))
except Exception as e:
    import traceback
    print("\n--- UNHANDLED EXCEPTION ---")
    traceback.print_exc()
