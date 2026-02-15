"""
Stroke Bite Generator Service

Generates personalized daily stroke bite cards using LLM (Llama via Together.ai)
and research insights from the paper_refinery database.
"""

import json
import re
from datetime import date, datetime
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from supabase import create_client, Client
from together import Together
from openai import OpenAI

from app.core.config import get_settings
from app.models.patient_profile import PatientProfile
from app.models.stroke_bite import StrokeBite, StrokeBiteAnswer
from app.schemas.stroke_bite import BiteCard, BiteOption

settings = get_settings()


def get_recovery_phase(stroke_date: date) -> str:
    """Compute recovery phase from stroke date."""
    if not stroke_date:
        return "unknown"

    days_since = (date.today() - stroke_date).days
    if days_since <= 7:
        return "acute"
    elif days_since <= 180:
        return "subacute"
    else:
        return "chronic"


def get_supabase_client() -> Client:
    """Get Supabase client for insights queries."""
    return create_client(settings.supabase_url, settings.supabase_key)


def fetch_insights(
    profile: PatientProfile,
    exclude_ids: List[str],
    db: Session
) -> List[Dict]:
    """
    Fetch research insights using two-step strategy:
    1. Try semantic search based on user's therapies
    2. Fall back to random selection if <5 results
    """
    client = get_supabase_client()
    insights = []

    # Step 1: Try semantic search if user has therapies
    if profile.current_therapies and len(profile.current_therapies) > 0:
        try:
            # Build query from therapies and recovery phase
            recovery_phase = get_recovery_phase(profile.stroke_date)
            query_parts = []

            if profile.current_therapies:
                query_parts.append(" ".join(profile.current_therapies))
            if profile.stroke_type:
                query_parts.append(f"{profile.stroke_type} stroke")
            if recovery_phase != "unknown":
                query_parts.append(f"{recovery_phase} phase recovery")

            query_string = " ".join(query_parts)

            # Get embedding for query
            openai_client = OpenAI(api_key=settings.openai_api_key)
            embedding_response = openai_client.embeddings.create(
                model=settings.embedding_model,
                input=query_string
            )
            query_embedding = embedding_response.data[0].embedding

            # Semantic search via match_insights RPC
            result = client.rpc(
                "match_insights",
                {
                    "query_embedding": query_embedding,
                    "match_count": 5,
                    "filter_stroke_types": [profile.stroke_type] if profile.stroke_type else None,
                    "filter_recovery_phase": recovery_phase if recovery_phase != "unknown" else None
                }
            ).execute()

            if result.data:
                insights = [r for r in result.data if r.get('id') not in exclude_ids]
        except Exception as e:
            print(f"Semantic search failed: {e}, falling back to random")

    # Step 2: Supplement with random selection if needed
    if len(insights) < 5:
        try:
            recovery_phase = get_recovery_phase(profile.stroke_date)
            needed = 6 - len(insights)

            # Use Supabase table query with filters
            query = client.table("insights").select("id, claim, evidence, quantitative_result, stroke_types, recovery_phase, intervention, sample_size")

            # Apply filters
            if profile.stroke_type:
                query = query.contains("stroke_types", [profile.stroke_type])
            if recovery_phase != "unknown":
                query = query.eq("recovery_phase", recovery_phase)
            if exclude_ids:
                # Exclude already-shown IDs and already-fetched IDs
                all_exclude = exclude_ids + [i['id'] for i in insights]
                query = query.not_.in_("id", all_exclude)

            # Random selection via limit
            result = query.limit(needed).execute()
            if result.data:
                insights.extend(result.data)
        except Exception as e:
            print(f"Random selection failed: {e}")
            # If all fails, just use what we have

    return insights[:6]  # Max 6 insights


def get_past_answers(patient_id: str, db: Session) -> Dict[str, str]:
    """Get past Q&A answers from last 30 days to build preference profile."""
    from datetime import timedelta
    cutoff_date = datetime.utcnow() - timedelta(days=30)

    answers = db.query(StrokeBiteAnswer).filter(
        StrokeBiteAnswer.patient_id == patient_id,
        StrokeBiteAnswer.created_at >= cutoff_date
    ).all()

    # Build preference dict
    preferences = {}
    for answer in answers:
        if answer.question_text and answer.selected_label:
            # Simple key-value format
            key = answer.question_text.lower().replace(" ", "_")[:50]
            preferences[key] = answer.selected_label

    return preferences


def build_prompt(
    profile: PatientProfile,
    insights: List[Dict],
    past_answers: Dict[str, str]
) -> Tuple[str, str]:
    """Build system and user prompts for LLM."""

    system_prompt = """You are a stroke recovery companion creating daily "Stroke Bites" - short, swipeable cards for a stroke survivor. You must output valid JSON only.

RULES:
1. Generate exactly 8-10 cards in a flat list
2. MUST include: 1 welcome card, 2-3 research fact cards (if insights provided), AT LEAST 1 Q&A card with 2 options, and conditional responses for each Q&A branch
3. Q&A cards are REQUIRED - each Q&A card has type="qa" with a "question" field and "options" array (no "body" field)
4. Each Q&A option must have next_card_id pointing to a conditional_response card
5. Both Q&A branches must rejoin the main sequence
6. Card IDs use format "c1", "c2", "c3", "c4a", "c4b", etc.
7. The last card in the main path has next_card_id: null
8. Research facts must be based ONLY on the provided insights - do not invent medical claims
9. Use warm, encouraging, plain language. The reader may have cognitive difficulties.
10. Each card body should be 1-3 short sentences max.
11. Do NOT include "background_color" field - colors will be assigned automatically based on card type

OUTPUT FORMAT:
{
  "cards": [...],
  "start_card_id": "c1",
  "card_sequence_length": 8
}"""

    # Build user prompt
    recovery_phase = get_recovery_phase(profile.stroke_date)
    days_since = (date.today() - profile.stroke_date).days if profile.stroke_date else 0

    user_prompt = f"""Generate today's Stroke Bites for this patient:
- Stroke type: {profile.stroke_type or 'not specified'}
- Recovery phase: {recovery_phase} ({days_since} days since stroke)
- Current therapies: {', '.join(profile.current_therapies) if profile.current_therapies else 'none'}
- Affected side: {profile.affected_side or 'not specified'}

Previous Q&A preferences (use to personalize):
{json.dumps(past_answers, indent=2) if past_answers else 'No previous answers'}

Research insights to use (reference by source_insight_id):
{json.dumps([{
    'id': i.get('id'),
    'claim': i.get('claim'),
    'evidence': i.get('evidence'),
    'intervention': i.get('intervention')
} for i in insights], indent=2)}

IMPORTANT: Generate 8-10 cards with AT LEAST 1 Q&A question that helps personalize future content.
The Q&A questions should ask about the patient's daily habits, therapy experience,
or recovery goals - things not already known from their profile.

Example Q&A card structure:
{
  "id": "c3",
  "type": "qa",
  "title": null,
  "body": "",
  "emoji": "🤔",
  "question": "Do you exercise regularly each week?",
  "options": [
    {"key": "a", "label": "Yes, 3+ times a week", "next_card_id": "c4a"},
    {"key": "b", "label": "No, not regularly", "next_card_id": "c4b"}
  ],
  "next_card_id": null,
  "source_insight_id": null
}

Return ONLY valid JSON, no markdown formatting."""

    return system_prompt, user_prompt


def call_llm(system_prompt: str, user_prompt: str) -> Dict:
    """Call Together.ai LLM and parse JSON response."""
    client = Together(api_key=settings.together_api_key)

    try:
        response = client.chat.completions.create(
            model=settings.together_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=3000,
        )

        content = response.choices[0].message.content

        # Parse JSON (handle markdown-wrapped JSON)
        content = content.strip()
        if content.startswith("```"):
            # Extract JSON from markdown code block
            content = re.sub(r'^```(?:json)?\s*', '', content)
            content = re.sub(r'\s*```$', '', content)

        return json.loads(content)

    except Exception as e:
        print(f"LLM call failed: {e}")
        raise


def assign_card_colors(cards_data: List[Dict]) -> List[Dict]:
    """
    Assign pleasant, eye-friendly background colors based on card type.
    Softer palette for better readability and less eye strain.
    """
    COLOR_PALETTE = {
        'welcome': '#0D9488',           # Soft teal
        'research_fact': '#3B82F6',     # Soft blue
        'motivation': '#10B981',        # Soft emerald green
        'qa': '#8B5CF6',                # Soft purple
        'conditional_response': '#F59E0B',  # Soft amber
        'tip': '#06B6D4',               # Soft cyan
    }

    for card in cards_data:
        card_type = card.get('type', 'motivation')
        card['background_color'] = COLOR_PALETTE.get(card_type, '#0D9488')

    return cards_data


def validate_card_graph(cards_data: List[Dict], start_id: str) -> bool:
    """Validate that all next_card_id references resolve correctly."""
    card_ids = {card['id'] for card in cards_data}

    # Check start_id exists
    if start_id not in card_ids:
        return False

    # Check all next_card_id references
    for card in cards_data:
        if card.get('next_card_id') and card['next_card_id'] not in card_ids:
            return False

        # Check Q&A option next_card_ids
        if card.get('options'):
            for option in card['options']:
                if option.get('next_card_id') and option['next_card_id'] not in card_ids:
                    return False

    return True


def generate_bites(profile: PatientProfile, db: Session) -> Dict:
    """
    Main orchestrator: fetch insights → build prompt → call LLM → validate → return.
    """
    print(f"[Bite Generator] Starting generation for patient {profile.id}")

    # Get past bites to avoid repeating insights
    from datetime import timedelta
    cutoff_date = date.today() - timedelta(days=14)
    past_bites = db.query(StrokeBite).filter(
        StrokeBite.patient_id == profile.id,
        StrokeBite.generated_date >= cutoff_date
    ).all()

    # Extract shown insight IDs
    exclude_ids = []
    for bite in past_bites:
        if bite.cards_json and isinstance(bite.cards_json, dict):
            cards = bite.cards_json.get('cards', [])
            for card in cards:
                if card.get('source_insight_id'):
                    exclude_ids.append(card['source_insight_id'])

    # Fetch insights
    print(f"[Bite Generator] Fetching insights...")
    insights = fetch_insights(profile, exclude_ids, db)
    print(f"[Bite Generator] Found {len(insights)} insights")

    # Get past Q&A answers
    print(f"[Bite Generator] Fetching past answers...")
    past_answers = get_past_answers(profile.id, db)
    print(f"[Bite Generator] Found {len(past_answers)} past preferences")

    # Build prompts
    print(f"[Bite Generator] Building prompts...")
    system_prompt, user_prompt = build_prompt(profile, insights, past_answers)

    # Call LLM
    print(f"[Bite Generator] Calling LLM (this may take 5-10 seconds)...")
    try:
        result = call_llm(system_prompt, user_prompt)
        print(f"[Bite Generator] LLM call successful, got {len(result.get('cards', []))} cards")
    except Exception as e:
        print(f"[Bite Generator] LLM call failed: {e}")
        # Fall back to static bites
        from app.services.fallback_bites import get_fallback_bites
        print(f"[Bite Generator] Using fallback bites")
        return get_fallback_bites()

    # Validate
    cards_data = result.get('cards', [])
    start_id = result.get('start_card_id', 'c1')

    if not validate_card_graph(cards_data, start_id):
        # Fall back to static bites
        from app.services.fallback_bites import get_fallback_bites
        return get_fallback_bites()

    # Assign colors based on card type (softer, eye-friendly palette)
    cards_data = assign_card_colors(cards_data)

    # Return result with metadata
    return {
        'cards': cards_data,
        'start_card_id': start_id,
        'total_cards': len(cards_data),
        'card_sequence_length': result.get('card_sequence_length', 8)
    }
