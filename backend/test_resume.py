import requests

url = "https://g4lh4l2jej.execute-api.ap-south-1.amazonaws.com/prod/resume"
payload = {
    "executionArn": "arn:aws:states:ap-south-1:123456789012:execution:IdeaStressMachine:test",
    "gate": "gate1",
    "payload": {"validated_assumptions": []}
}

response = requests.post(url, json=payload)
print(f"Status Code: {response.status_code}")
print(f"Response Body: {response.text}")
