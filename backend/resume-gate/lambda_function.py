import json
import os
import boto3
import weaviate
from weaviate.classes.query import Filter

sfn = boto3.client('stepfunctions')

def get_weaviate_client():
    weaviate_url = os.environ.get("WEAVIATE_URL")
    weaviate_api_key = os.environ.get("WEAVIATE_API_KEY")
    gemini_api_key = os.environ.get("GEMINI_API_KEY", "")
    if not weaviate_url or not weaviate_api_key:
        return None
        
    return weaviate.connect_to_weaviate_cloud(
        cluster_url=weaviate_url,
        auth_credentials=weaviate.auth.AuthApiKey(weaviate_api_key),
        headers={"X-Goog-Studio-Api-Key": gemini_api_key}
    )

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
        
    gate = body.get("gate")
    payload = body.get("payload")
    
    if gate not in ["gate1", "gate2"]:
        return {"statusCode": 400, "headers": headers, "body": "Invalid gate"}
        
    if payload is None:
        return {"statusCode": 400, "headers": headers, "body": "Missing payload"}
        
    # Retrieve task token from Weaviate
    task_token = None
    client = get_weaviate_client()
    if client:
        try:
            collection = client.collections.get("IdeaStressData")
            results = collection.query.fetch_objects(
                filters=Filter.by_property("record_type").equal("TaskToken"),
                limit=1
            )
            if results.objects:
                task_token = results.objects[0].properties.get("text_content")
        except Exception as e:
            return {"statusCode": 500, "headers": headers, "body": f"Weaviate error: {str(e)}"}
        finally:
            client.close()
            
    if not task_token:
        return {"statusCode": 400, "headers": headers, "body": "Missing task_token in Weaviate. Wait For Human step might not have executed yet."}
        
    try:
        sfn.send_task_success(
            taskToken=task_token,
            output=json.dumps(payload)
        )
        return {"statusCode": 200, "headers": headers, "body": json.dumps({"status": "resumed"})}
    except Exception as e:
        return {"statusCode": 500, "headers": headers, "body": str(e)}
