import json
import os
import urllib.request

def lambda_handler(event, context):
    idea_summary = event.get("idea_summary", "")
    plan = event.get("plan", {})
    

        
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
    
    import boto3
    bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
    
    try:
        response = bedrock.converse(
            modelId="amazon.nova-lite-v1:0",
            messages=[{"role": "user", "content": [{"text": user_prompt}]}],
            system=[{"text": system_prompt}],
            inferenceConfig={"temperature": 0.2}
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
        
        # Enforce business rules strictly, bypassing LLM hallucinations
        overall = parsed_output.get("overall", 0)
        parsed_output["revision_needed"] = bool(overall < 7)
        
        if parsed_output["revision_needed"] and not parsed_output.get("revision_instructions"):
            parsed_output["revision_instructions"] = parsed_output.get("top_improvement", "Make the plan more specific and address the highest risks.")
            
        return parsed_output
    except Exception as e:
        return {"statusCode": 500, "body": f"Error calling Amazon Nova API: {str(e)}"}
