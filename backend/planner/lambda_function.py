import json
import os
import urllib.request

def lambda_handler(event, context):
    idea_summary = event.get("idea_summary", "")
    validated_assumptions = event.get("validated_assumptions", [])
    adversary_output = event.get("adversary_output", {})
    user_track = event.get("user_track", "prototype")
    revision_instructions = event.get("revision_instructions")
    
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_api_key:
        return {"statusCode": 500, "body": "Missing GEMINI_API_KEY"}
        
    system_prompt = f'''You are a masterful startup execution planner. Your goal is to map out a 30/60/90-day plan.
The user chose the track: "{user_track}". 
If 'prototype', focus Day 30 on MVP and deploy.
If 'find_a_user', focus Day 30 on ICP and interviews.
If 'invalidate', focus Day 30 on hypothesis testing and pivot.

Return the output ONLY as valid JSON in the following format:
{{
    "plan_title": "Title of the Plan",
    "tension_warning": "Warning string if the chosen track ignores a critical adversary risk, otherwise null",
    "plan": {{
        "day_30": {{
            "milestones": ["...", "..."],
            "first_real_step": "The very first literal action to take tomorrow"
        }},
        "day_60": {{
            "milestones": ["...", "..."]
        }},
        "day_90": {{
            "milestones": ["...", "..."],
            "success_metric": "What number proves this 90 day sprint worked"
        }}
    }},
    "backup_plans": [
        "Plan B approach 1",
        "Plan C approach 2"
    ]
}}'''

    if revision_instructions:
        system_prompt += f"\n\nCRITICAL REVISION INSTRUCTIONS FROM CRITIC:\n{revision_instructions}"
        
    user_prompt = f"Idea Summary:\n{idea_summary}\n\nTop Risks from Adversary:\n{json.dumps(adversary_output.get('top_risks', []), indent=2)}\n\nSteelman Counterplan:\n{adversary_output.get('steelman_counterplan', '')}"
    
    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_api_key}"
    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.4
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
        return {"statusCode": 500, "body": f"Error calling Gemini API: {str(e)}"}
