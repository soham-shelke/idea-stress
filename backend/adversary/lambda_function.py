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
        
    import boto3
    bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
    
    try:
        response = bedrock.converse(
            modelId="amazon.nova-lite-v1:0",
            messages=[{"role": "user", "content": [{"text": user_prompt}]}],
            system=[{"text": system_prompt}],
            inferenceConfig={"temperature": 0.5}
        )
        content_text = response['output']['message']['content'][0]['text'].strip()
        
        # Clean markdown code blocks if present
        if content_text.startswith("```json"):
            content_text = content_text[7:]
        if content_text.startswith("```"):
            content_text = content_text[3:]
        if content_text.endswith("```"):
            content_text = content_text[:-3]
            
        parsed_output = json.loads(content_text.strip())
        
        return parsed_output
            
    except Exception as e:
        return {
            "statusCode": 500,
            "body": f"Error calling Amazon Nova API: {str(e)}"
        }
