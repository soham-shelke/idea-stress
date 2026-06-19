import json
import os
import urllib.request

def lambda_handler(event, context):
    idea_summary = event.get("idea_summary", "")
    plan = event.get("plan", {})
    
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_api_key:
        return {"statusCode": 500, "body": "Missing GEMINI_API_KEY"}
        
    system_prompt = '''You are a strict grading agent evaluating a startup execution plan.
Grade the plan out of 10 for: feasibility, specificity, risk_coverage, and first_step_clarity.
Also provide an overall score out of 10.
If the overall score is less than 7, set revision_needed to true.
Return the output ONLY as valid JSON in the following format:
{
    "scores": {
        "feasibility": {"score": 8, "comment": "..."},
        "specificity": {"score": 5, "comment": "..."},
        "risk_coverage": {"score": 7, "comment": "..."},
        "first_step_clarity": {"score": 9, "comment": "..."}
    },
    "overall": 7,
    "revision_needed": false,
    "revision_instructions": null,
    "top_improvement": "The biggest thing that could be improved"
}'''

    user_prompt = f"Idea Summary:\n{idea_summary}\n\nProposed Plan:\n{json.dumps(plan, indent=2)}"
    
    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_api_key}"
    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2
        }
    }
    
    req = urllib.request.Request(gemini_url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
    
    try:
        with urllib.request.urlopen(req) as response:
            response_body = json.loads(response.read().decode('utf-8'))
            content_text = response_body["candidates"][0]["content"]["parts"][0]["text"]
            parsed_output = json.loads(content_text)
            
            # Enforce business rules strictly, bypassing LLM hallucinations
            overall = parsed_output.get("overall", 0)
            parsed_output["revision_needed"] = bool(overall < 7)
            
            if parsed_output["revision_needed"] and not parsed_output.get("revision_instructions"):
                parsed_output["revision_instructions"] = parsed_output.get("top_improvement", "Make the plan more specific and address the highest risks.")
                
            return parsed_output
    except Exception as e:
        return {"statusCode": 500, "body": f"Error calling Gemini API: {str(e)}"}
