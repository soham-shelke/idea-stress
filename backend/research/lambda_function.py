import json
import os
import urllib.request
import weaviate
from weaviate.classes.query import Filter, MetadataQuery

def lambda_handler(event, context):
    assumption = event.get("assumption", {})
    session_id = event.get("session_id", "")
    
    if not assumption or not assumption.get("text"):
        return {
            "statusCode": 400,
            "body": "Missing or invalid assumption object"
        }
        
    assumption_text = assumption.get("text", "")
    
    weaviate_url = os.environ.get("WEAVIATE_URL")
    weaviate_api_key = os.environ.get("WEAVIATE_API_KEY")
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    
    client = weaviate.connect_to_weaviate_cloud(
        cluster_url=weaviate_url,
        auth_credentials=weaviate.auth.AuthApiKey(weaviate_api_key),
        headers={"X-Goog-Studio-Api-Key": gemini_api_key}
    )
    
    evidence_pieces = []
    max_certainty = 0.0
    
    try:
        collection = client.collections.get("IdeaStressData")
        
        fact_results = collection.query.near_text(
            query=assumption_text,
            limit=3,
            filters=Filter.by_property("record_type").equal("RealWorldFact"),
            return_metadata=MetadataQuery(certainty=True)
        )
        
        pattern_results = collection.query.near_text(
            query=assumption_text,
            limit=2,
            filters=Filter.by_property("record_type").equal("FailurePattern"),
            return_metadata=MetadataQuery(certainty=True)
        )
        
        for obj in fact_results.objects:
            cert = obj.metadata.certainty or 0.0
            max_certainty = max(max_certainty, cert)
            props = obj.properties
            evidence_pieces.append(f"[Fact] {props.get('text_content', '')} (Confidence: {props.get('confidence', '')}, Source: {props.get('source', '')})")
            
        for obj in pattern_results.objects:
            cert = obj.metadata.certainty or 0.0
            max_certainty = max(max_certainty, cert)
            props = obj.properties
            evidence_pieces.append(f"[Failure Pattern] {props.get('text_content', '')} - Early Warning: {props.get('early_warning_signal', '')}")
            
        # Tavily Fallback
        CONFIDENCE_THRESHOLD = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.72"))
        
        if max_certainty < CONFIDENCE_THRESHOLD:
            tavily_api_key = os.environ.get("TAVILY_API_KEY")
            if tavily_api_key:
                try:
                    tavily_url = "https://api.tavily.com/search"
                    payload = {
                        "api_key": tavily_api_key,
                        "query": assumption_text + " startup statistics data",
                        "search_depth": "basic",
                        "include_answer": False,
                        "max_results": 3
                    }
                    req = urllib.request.Request(tavily_url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
                    with urllib.request.urlopen(req) as response:
                        tavily_data = json.loads(response.read().decode('utf-8'))
                        
                    results = tavily_data.get("results", [])
                    objects_to_insert = []
                    for res in results[:2]:
                        text = res.get("content", "")
                        url = res.get("url", "")
                        evidence_pieces.append(f"[Web Search] {text} (Source: {url})")
                        
                        objects_to_insert.append({
                            "record_type": "RealWorldFact",
                            "text_content": text,
                            "source": url,
                            "confidence": 0.65,
                            "recency_year": 2025,
                            "domain": "startup",
                            "contradicts": ""
                        })
                    
                    if objects_to_insert:
                        collection.data.insert_many(objects_to_insert)
                        
                except Exception as e:
                    print(f"Tavily fallback failed: {e}")
    finally:
        client.close()

    # Gemini Evaluation
    system_prompt = '''You are an expert startup research agent. Your job is to evaluate a core assumption made by a founder based ONLY on the provided evidence.
Return the output ONLY as valid JSON in the following format:
{
    "assumption_id": "the original assumption id",
    "assumption": "the original assumption text",
    "confidence_score": 0.8,
    "verdict": "optimistic|realistic|conservative",
    "risk_level": "high|medium|low",
    "evidence_summary": "A 2-3 sentence summary of what the evidence says about this assumption.",
    "sources": ["List", "of", "sources", "used"]
}'''

    user_prompt = f"Assumption:\n{assumption_text}\n\nEvidence:\n" + "\n".join(evidence_pieces)
    
    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_api_key}"
    gemini_payload = {
        "systemInstruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": [{
            "parts": [{"text": user_prompt}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2
        }
    }
    
    req = urllib.request.Request(gemini_url, data=json.dumps(gemini_payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
    
    try:
        with urllib.request.urlopen(req) as response:
            response_body = json.loads(response.read().decode('utf-8'))
            content_text = response_body["candidates"][0]["content"]["parts"][0]["text"]
            parsed_output = json.loads(content_text)
            
            parsed_output["assumption_id"] = assumption.get("id", "")
            parsed_output["assumption"] = assumption_text
            
            return parsed_output
            
    except Exception as e:
        return {
            "statusCode": 500,
            "body": f"Error calling Gemini API: {str(e)}"
        }
