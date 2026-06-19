import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Global in-process cache (MVP Hackathon tradeoff)
_GATE_CACHE = {}

def lambda_handler(event, context):
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    }

    # Step Functions notifies us (Internal invocation)
    action = event.get("action")
    if action == "WRITE_CACHE":
        executionArn = event.get("executionArn")
        gate = event.get("gate")
        payload = event.get("payload")
        if executionArn and gate:
            key = f"{executionArn}#{gate}"
            _GATE_CACHE[key] = payload
            logger.info(f"Stored payload in cache for {key}")
            return {"status": "success"}
        return {"status": "error", "message": "Missing arn or gate"}

    # API Gateway invokes us (Frontend GET request)
    httpMethod = event.get("httpMethod")
    if httpMethod == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}
        
    if httpMethod == "GET":
        qs = event.get("queryStringParameters") or {}
        executionArn = qs.get("executionArn")
        gate = qs.get("gate")
        
        if not executionArn or not gate:
            return {"statusCode": 400, "headers": headers, "body": "Missing executionArn or gate"}
            
        if gate not in ["gate1", "gate2", "output"]:
            return {"statusCode": 400, "headers": headers, "body": "Invalid gate"}
            
        key = f"{executionArn}#{gate}"
        if key in _GATE_CACHE:
            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps({"ready": True, "payload": _GATE_CACHE[key]})
            }
        else:
            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps({"ready": False, "payload": None})
            }

    return {"statusCode": 400, "headers": headers, "body": "Invalid method"}
