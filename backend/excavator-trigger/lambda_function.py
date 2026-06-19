import json
import os
import boto3
import uuid

sfn = boto3.client('stepfunctions')

def lambda_handler(event, context):
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    }
    
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}
        
    try:
        body = json.loads(event.get("body", "{}"))
    except:
        return {"statusCode": 400, "headers": headers, "body": "Invalid JSON"}
        
    user_idea = body.get("user_idea", "")
    if not user_idea or not user_idea.strip():
        return {"statusCode": 400, "headers": headers, "body": "Missing user_idea"}
        
    state_machine_arn = os.environ.get("STATE_MACHINE_ARN")
    if not state_machine_arn:
        return {"statusCode": 500, "headers": headers, "body": "Missing STATE_MACHINE_ARN environment variable"}
        
    session_id = str(uuid.uuid4())
    
    try:
        response = sfn.start_execution(
            stateMachineArn=state_machine_arn,
            input=json.dumps({"user_idea": user_idea, "session_id": session_id})
        )
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({
                "executionArn": response["executionArn"],
                "session_id": session_id
            })
        }
    except Exception as e:
        return {"statusCode": 500, "headers": headers, "body": str(e)}
