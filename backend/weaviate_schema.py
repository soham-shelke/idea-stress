import weaviate
import os
import sys
from dotenv import load_dotenv
from weaviate.classes.config import Configure, Property, DataType

def main():
    load_dotenv()
    weaviate_url = os.environ.get("WEAVIATE_URL")
    weaviate_api_key = os.environ.get("WEAVIATE_API_KEY")
    gemini_api_key = os.environ.get("GEMINI_API_KEY")

    if not weaviate_url or not weaviate_api_key or not gemini_api_key:
        print("Missing required environment variables (WEAVIATE_URL, WEAVIATE_API_KEY, GEMINI_API_KEY).")
        sys.exit(1)

    client = weaviate.connect_to_weaviate_cloud(
        cluster_url=weaviate_url,
        auth_credentials=weaviate.auth.AuthApiKey(weaviate_api_key),
        headers={"X-Goog-Studio-Api-Key": gemini_api_key}
    )

    try:
        collection_name = "IdeaStressData"
        properties = [
            Property(name="text_content", data_type=DataType.TEXT),
            Property(name="record_type", data_type=DataType.TEXT, skip_vectorization=True),
            Property(name="domain", data_type=DataType.TEXT, skip_vectorization=True),
            Property(name="source", data_type=DataType.TEXT, skip_vectorization=True),
            Property(name="confidence", data_type=DataType.NUMBER, skip_vectorization=True),
            Property(name="contradicts", data_type=DataType.TEXT, skip_vectorization=True),
            Property(name="recency_year", data_type=DataType.INT, skip_vectorization=True),
            Property(name="failure_category", data_type=DataType.TEXT, skip_vectorization=True),
            Property(name="frequency", data_type=DataType.TEXT, skip_vectorization=True),
            Property(name="early_warning_signal", data_type=DataType.TEXT, skip_vectorization=True),
            Property(name="backup_plan_hint", data_type=DataType.TEXT, skip_vectorization=True),
            Property(name="assumption_type", data_type=DataType.TEXT, skip_vectorization=True),
            Property(name="optimism_level", data_type=DataType.TEXT, skip_vectorization=True),
            Property(name="session_id", data_type=DataType.TEXT, skip_vectorization=True),
            Property(name="validated", data_type=DataType.BOOL, skip_vectorization=True),
        ]
        
        if client.collections.exists(collection_name):
            print(f"  ↳ {collection_name} already exists — skipping")
        else:
            client.collections.create(
                name=collection_name,
                properties=properties,
                vectorizer_config=Configure.Vectorizer.text2vec_google_aistudio(
                    model_id="gemini-embedding-2"
                )
            )
            print(f"  [Success] {collection_name} created")
            
    finally:
        client.close()

if __name__ == "__main__":
    main()
