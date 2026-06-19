import json
import uuid
import os
import weaviate
import urllib.request

def lambda_handler(event, context):
    session_id = event.get("session_id", str(uuid.uuid4()))
    
    user_idea = event.get("user_idea", "")
    if not isinstance(user_idea, str) or not user_idea.strip():
        return {
            "statusCode": 400,
            "body": "user_idea is required and must not be empty"
        }
        
    system_prompt = '''You are an expert startup analyst. Analyze the provided idea and extract 4-8 core assumptions. 
Return the output ONLY as valid JSON in the following format:
{
    "idea_summary": "Short summary of the idea",
    "domain": "startup|education|career|health",
    "assumptions": [
        {
            "id": "unique-assumption-id",
            "text": "The full declarative assumption text",
            "type": "timeline|market_size|skill|cost|user_behavior|competition",
            "optimism_level": "aggressive|moderate|conservative",
            "why_it_matters": "Why this assumption is critical",
            "hidden": false
        }
    ]
}'''
    
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_api_key}"
    payload = {
        "systemInstruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": [{
            "parts": [{"text": user_idea}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2
        }
    }
    
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
    
    try:
        with urllib.request.urlopen(req) as response:
            response_body = json.loads(response.read().decode('utf-8'))
            content_text = response_body["candidates"][0]["content"]["parts"][0]["text"]
            parsed_output = json.loads(content_text)
    except Exception as e:
        return {
            "statusCode": 500,
            "body": f"Error calling Gemini API: {str(e)}"
        }
    
    idea_summary = parsed_output.get("idea_summary", "")
    domain = parsed_output.get("domain", "")
    assumptions = parsed_output.get("assumptions", [])
    
    weaviate_url = os.environ.get("WEAVIATE_URL")
    weaviate_api_key = os.environ.get("WEAVIATE_API_KEY")
    
    client = weaviate.connect_to_weaviate_cloud(
        cluster_url=weaviate_url,
        auth_credentials=weaviate.auth.AuthApiKey(weaviate_api_key),
        headers={"X-Goog-Studio-Api-Key": gemini_api_key}
    )
    
    try:
        collection = client.collections.get("IdeaStressData")
        
        objects_to_insert = []
        for a in assumptions:
            objects_to_insert.append({
                "record_type": "UserAssumption",
                "text_content": a["text"],
                "assumption_type": a["type"],
                "optimism_level": a["optimism_level"],
                "session_id": session_id,
                "validated": False
            })
            
        if objects_to_insert:
            collection.data.insert_many(objects_to_insert)
    finally:
        client.close()
        
    return {
        "statusCode": 200,
        "session_id": session_id,
        "idea_summary": idea_summary,
        "domain": domain,
        "assumptions": assumptions
    }
