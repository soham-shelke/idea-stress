import json
import os
import boto3

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
        
    task_token = body.get("task_token")
    gate = body.get("gate")
    payload = body.get("payload")
    
    if not task_token or not task_token.strip():
        return {"statusCode": 400, "headers": headers, "body": "Missing task_token"}
        
    if gate not in ["gate1", "gate2"]:
        return {"statusCode": 400, "headers": headers, "body": "Invalid gate"}
        
    if payload is None:
        return {"statusCode": 400, "headers": headers, "body": "Missing payload"}
        
    try:
        sfn.send_task_success(
            taskToken=task_token,
            output=json.dumps(payload)
        )
        return {"statusCode": 200, "headers": headers, "body": json.dumps({"status": "resumed"})}
    except Exception as e:
        return {"statusCode": 500, "headers": headers, "body": str(e)}
