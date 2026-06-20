import json
import logging
import os
import weaviate
from weaviate.classes.query import Filter

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def get_weaviate_client():
    weaviate_url = os.environ.get("WEAVIATE_URL")
    weaviate_api_key = os.environ.get("WEAVIATE_API_KEY")
    gemini_api_key = os.environ.get("GEMINI_API_KEY", "")
    if not weaviate_url or not weaviate_api_key:
        logger.error("Missing WEAVIATE_URL or WEAVIATE_API_KEY")
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

    action = event.get("action")
    
    # Internal Step Functions Invocation
    if action == "WRITE_CACHE":
        executionArn = event.get("executionArn")
        gate = event.get("gate")
        payload = event.get("payload")
        
        client = get_weaviate_client()
        if client:
            try:
                collection = client.collections.get("IdeaStressData")
                # Delete old cache for this gate
                collection.data.delete_many(
                    where=Filter.by_property("session_id").equal(f"{executionArn}#{gate}")
                )
                # Insert new cache
                collection.data.insert({
                    "record_type": "GateCache",
                    "session_id": f"{executionArn}#{gate}",
                    "text_content": json.dumps(payload)
                })
            finally:
                client.close()
        return {"status": "success"}
        
    elif action == "NOTIFY_WAITING":
        task_token = event.get("task_token")
        client = get_weaviate_client()
        if client:
            try:
                collection = client.collections.get("IdeaStressData")
                collection.data.delete_many(
                    where=Filter.by_property("record_type").equal("TaskToken")
                )
                collection.data.insert({
                    "record_type": "TaskToken",
                    "session_id": "LATEST_TOKEN",
                    "text_content": task_token
                })
            finally:
                client.close()
        return {"status": "success"}

    # API Gateway GET request
    httpMethod = event.get("httpMethod")
    if httpMethod == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}
        
    if httpMethod == "GET":
        qs = event.get("queryStringParameters") or {}
        executionArn = qs.get("executionArn")
        gate = qs.get("gate")
        
        if not executionArn or not gate:
            return {"statusCode": 400, "headers": headers, "body": "Missing executionArn or gate"}
            
        client = get_weaviate_client()
        if client:
            try:
                collection = client.collections.get("IdeaStressData")
                results = collection.query.fetch_objects(
                    filters=Filter.by_property("session_id").equal(f"{executionArn}#{gate}"),
                    limit=1
                )
                if results.objects:
                    payload = json.loads(results.objects[0].properties.get("text_content", "{}"))
                    return {
                        "statusCode": 200,
                        "headers": headers,
                        "body": json.dumps({"ready": True, "payload": payload})
                    }
            finally:
                client.close()
                
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({"ready": False, "payload": None})
        }

    return {"statusCode": 400, "headers": headers, "body": "Invalid method"}
