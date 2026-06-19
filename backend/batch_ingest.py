import weaviate
import os
import sys

def get_real_world_facts():
    return [
        {"text_content": "Most SaaS startups take 3 to 6 months to ship an MVP with robust core functionality.", "record_type": "RealWorldFact", "domain": "startup", "source": "Y Combinator", "confidence": 0.85, "recency_year": 2024, "contradicts": "Ship MVP in 2 weeks"},
        {"text_content": "Solo developers typically require double the estimated time for full-stack deployment.", "record_type": "RealWorldFact", "domain": "startup", "source": "Indie Hackers", "confidence": 0.80, "recency_year": 2023, "contradicts": "Ship MVP in 2 weeks"},
        {"text_content": "Getting 500 organic signups in the first month without paid acquisition is rare.", "record_type": "RealWorldFact", "domain": "startup", "source": "Lenny's Newsletter", "confidence": 0.90, "recency_year": 2025, "contradicts": "500 organic signups"},
        {"text_content": "Startups that try to undercut competitors by 20% often run out of cash before capturing market share.", "record_type": "RealWorldFact", "domain": "startup", "source": "Harvard Business Review", "confidence": 0.88, "recency_year": 2022, "contradicts": "Undercut by 20%"},
        {"text_content": "Capturing 10% market share in year 1 in a crowded market is historically anomalous.", "record_type": "RealWorldFact", "domain": "startup", "source": "CB Insights", "confidence": 0.95, "recency_year": 2024, "contradicts": "10% market share year 1"},
        {"text_content": "Organic growth typically plateaus after early adopters unless virality is built-in.", "record_type": "RealWorldFact", "domain": "startup", "source": "A16z", "confidence": 0.82, "recency_year": 2023, "contradicts": ""},
        {"text_content": "Price-based differentiation is one of the weakest moats for new SaaS entrants.", "record_type": "RealWorldFact", "domain": "startup", "source": "SaaStr", "confidence": 0.89, "recency_year": 2023, "contradicts": "Undercut by 20%"},
        {"text_content": "The average time from MVP launch to product-market fit is 18 to 24 months.", "record_type": "RealWorldFact", "domain": "startup", "source": "First Round Capital", "confidence": 0.91, "recency_year": 2025, "contradicts": ""},
        {"text_content": "Mastering machine learning foundations requires at least 6 months of dedicated study.", "record_type": "RealWorldFact", "domain": "education", "source": "Kaggle", "confidence": 0.87, "recency_year": 2024, "contradicts": "Learn ML in a month"},
        {"text_content": "Cramming ML theory in under a month leads to a lack of practical application skills.", "record_type": "RealWorldFact", "domain": "education", "source": "Coursera Data", "confidence": 0.84, "recency_year": 2023, "contradicts": "Learn ML in a month"},
        {"text_content": "Deep learning models require fundamental linear algebra knowledge which takes weeks to learn.", "record_type": "RealWorldFact", "domain": "education", "source": "MIT OpenCourseWare", "confidence": 0.92, "recency_year": 2022, "contradicts": ""},
        {"text_content": "Online bootcamp graduation rates are less than 50% for accelerated ML programs.", "record_type": "RealWorldFact", "domain": "education", "source": "Class Central", "confidence": 0.79, "recency_year": 2024, "contradicts": ""},
        {"text_content": "Transitioning to a Data Science role typically takes 6 to 12 months for beginners.", "record_type": "RealWorldFact", "domain": "career", "source": "Springboard", "confidence": 0.86, "recency_year": 2025, "contradicts": "Get DS job in 3 months"},
        {"text_content": "Entry-level DS roles often require a portfolio that takes months to build.", "record_type": "RealWorldFact", "domain": "career", "source": "Towards Data Science", "confidence": 0.88, "recency_year": 2024, "contradicts": "Get DS job in 3 months"},
        {"text_content": "The interview process for data science roles averages 4 to 6 weeks from screening to offer.", "record_type": "RealWorldFact", "domain": "career", "source": "Glassdoor", "confidence": 0.90, "recency_year": 2023, "contradicts": ""}
    ]

def get_failure_patterns():
    return [
        {"text_content": "Aggressive timeline compression leading to severe technical debt and burnout.", "record_type": "FailurePattern", "failure_category": "timeline", "frequency": "very_common", "early_warning_signal": "Skipping testing and QA phases.", "backup_plan_hint": "Reduce scope of MVP to core feature.", "assumption_type": "timeline"},
        {"text_content": "Underestimating integration time for third-party APIs.", "record_type": "FailurePattern", "failure_category": "timeline", "frequency": "common", "early_warning_signal": "Delayed milestones early in development.", "backup_plan_hint": "Use mocked data initially.", "assumption_type": "timeline"},
        {"text_content": "Failing to account for app store review delays.", "record_type": "FailurePattern", "failure_category": "timeline", "frequency": "common", "early_warning_signal": "Development finishing days before launch deadline.", "backup_plan_hint": "Launch web app first.", "assumption_type": "timeline"},
        {"text_content": "Assuming low price will automatically steal customers from established players.", "record_type": "FailurePattern", "failure_category": "market", "frequency": "very_common", "early_warning_signal": "High customer acquisition cost despite low prices.", "backup_plan_hint": "Target a niche underserved by incumbents.", "assumption_type": "market_size"},
        {"text_content": "Overestimating the total addressable market in early projections.", "record_type": "FailurePattern", "failure_category": "market", "frequency": "very_common", "early_warning_signal": "Lower than expected search volume for problem.", "backup_plan_hint": "Re-evaluate market size with bottom-up analysis.", "assumption_type": "market_size"},
        {"text_content": "Building a solution for a problem users won't pay to solve.", "record_type": "FailurePattern", "failure_category": "market", "frequency": "very_common", "early_warning_signal": "High signups but zero conversions.", "backup_plan_hint": "Interview users on willingness to pay.", "assumption_type": "user_behavior"},
        {"text_content": "Choosing an unfamiliar tech stack to learn it, resulting in slow development.", "record_type": "FailurePattern", "failure_category": "technical", "frequency": "common", "early_warning_signal": "Struggling with basic framework tutorials.", "backup_plan_hint": "Switch to familiar stack for MVP.", "assumption_type": "skill"},
        {"text_content": "Overengineering the architecture for scale before acquiring first 10 users.", "record_type": "FailurePattern", "failure_category": "technical", "frequency": "very_common", "early_warning_signal": "Spending weeks on infrastructure setup.", "backup_plan_hint": "Deploy simple monolith.", "assumption_type": "cost"},
        {"text_content": "Solo founder overwhelmed by marketing, sales, and development context switching.", "record_type": "FailurePattern", "failure_category": "team", "frequency": "very_common", "early_warning_signal": "No progress on product for weeks.", "backup_plan_hint": "Timebox tasks strictly.", "assumption_type": "skill"},
        {"text_content": "Co-founder conflict over equity splits early in product development.", "record_type": "FailurePattern", "failure_category": "team", "frequency": "common", "early_warning_signal": "Refusal to sign vesting agreements.", "backup_plan_hint": "Establish clear roles and vesting immediately.", "assumption_type": "skill"}
    ]

from dotenv import load_dotenv

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
        facts = get_real_world_facts()
        patterns = get_failure_patterns()
        
        collection = client.collections.get("IdeaStressData")
        collection.data.insert_many(facts)
        collection.data.insert_many(patterns)
        
        print(f"Successfully inserted {len(facts)} RealWorldFact records and {len(patterns)} FailurePattern records into IdeaStressData.")

    finally:
        client.close()

if __name__ == "__main__":
    main()
