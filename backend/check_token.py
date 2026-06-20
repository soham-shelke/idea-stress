import os
import weaviate
from weaviate.classes.query import Filter
from dotenv import load_dotenv

load_dotenv()

weaviate_url = os.environ.get("WEAVIATE_URL")
weaviate_api_key = os.environ.get("WEAVIATE_API_KEY")

if not weaviate_url or not weaviate_api_key:
    print("Local .env missing Weaviate keys")
    exit(1)

client = weaviate.connect_to_weaviate_cloud(
    cluster_url=weaviate_url,
    auth_credentials=weaviate.auth.AuthApiKey(weaviate_api_key)
)

try:
    collection = client.collections.get("IdeaStressData")
    results = collection.query.fetch_objects(
        filters=Filter.by_property("record_type").equal("TaskToken"),
        limit=1
    )
    if results.objects:
        print("FOUND TASK TOKEN:")
        print(results.objects[0].properties.get("text_content")[:50] + "...")
    else:
        print("NO TASK TOKEN FOUND IN WEAVIATE")
finally:
    client.close()
