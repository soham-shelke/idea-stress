import requests

url = "https://g4lh4l2jej.execute-api.ap-south-1.amazonaws.com/prod/status?executionArn=arn%3Aaws%3Astates%3Aap-south-1%3A498976383061%3Aexecution%3Aidea-stress%3Aa54204dc-cd83-49cb-8203-e9ca2189c043&gate=gate1"

try:
    response = requests.get(url)
    print(f"Status Code: {response.status_code}")
    print(f"Headers: {response.headers}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Request failed: {e}")
