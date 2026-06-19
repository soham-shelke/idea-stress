import json
import os
import urllib.request

def lambda_handler(event, context):
    idea_summary = event.get("idea_summary", "")
    validated_assumptions = event.get("validated_assumptions", [])
    session_id = event.get("session_id", "")
    
    if not session_id:
        return {
            "statusCode": 400,
            "body": "Missing session_id"
        }
        
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_api_key:
        return {
            "statusCode": 500,
            "body": "Missing GEMINI_API_KEY environment variable"
        }
        
    system_prompt = '''You are a ruthless, expert startup advisor playing devil's advocate. Your job is to tear this idea apart based on its highest-risk assumptions and find its fatal flaws.
Return the output ONLY as valid JSON in the following format:
{
    "top_risks": [
        {
            "risk": "Short title of the risk",
            "argument": "Detailed explanation of why this will kill the startup",
            "severity": "critical|high|medium",
            "early_warning": "What metric or event will prove this risk is happening?"
        }
    ],
    "hardest_question": "The single most painful question the founder needs to answer to prove you wrong.",
    "steelman_counterplan": "A pivot or alternative approach that addresses these flaws."
}
Limit top_risks to 2-5 items. Be extremely critical.'''

    user_prompt = f"Idea Summary:\n{idea_summary}\n\nValidated Assumptions (graded by Research agent):\n"
    for assumption in validated_assumptions:
        user_prompt += f"- {assumption.get('assumption', 'Unknown')} (Risk Level: {assumption.get('risk_level', 'Unknown')})\n"
        user_prompt += f"  Evidence Summary: {assumption.get('evidence_summary', 'None')}\n\n"
        
    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_api_key}"
    payload = {
        "systemInstruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": [{
            "parts": [{"text": user_prompt}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.5
        }
    }
    
    req = urllib.request.Request(gemini_url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
    
    try:
        with urllib.request.urlopen(req) as response:
            response_body = json.loads(response.read().decode('utf-8'))
            content_text = response_body["candidates"][0]["content"]["parts"][0]["text"]
            parsed_output = json.loads(content_text)
            
            return parsed_output
            
    except Exception as e:
        return {
            "statusCode": 500,
            "body": f"Error calling Gemini API: {str(e)}"
        }
