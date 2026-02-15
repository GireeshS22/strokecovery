"""
Fallback Stroke Bites

Static, safe cards to use when LLM generation fails.
No research facts, no Q&A - just motivational and general recovery content.
"""

from typing import Dict


def get_fallback_bites() -> Dict:
    """Return static fallback bite cards."""
    return {
        "cards": [
            {
                "id": "f1",
                "type": "welcome",
                "title": None,
                "body": "Welcome! Here are today's recovery insights.",
                "emoji": "👋",
                "background_color": "#0D9488",
                "source_insight_id": None,
                "question": None,
                "options": None,
                "next_card_id": "f2"
            },
            {
                "id": "f2",
                "type": "motivation",
                "title": "Recovery is a Journey",
                "body": "Every small step forward is progress. Be patient with yourself.",
                "emoji": "🌱",
                "background_color": "#059669",
                "source_insight_id": None,
                "question": None,
                "options": None,
                "next_card_id": "f3"
            },
            {
                "id": "f3",
                "type": "tip",
                "title": "Stay Consistent",
                "body": "Regular therapy sessions help your brain form new connections. Consistency matters more than intensity.",
                "emoji": "🧠",
                "background_color": "#2563EB",
                "source_insight_id": None,
                "question": None,
                "options": None,
                "next_card_id": "f4"
            },
            {
                "id": "f4",
                "type": "motivation",
                "title": "You're Not Alone",
                "body": "Millions of stroke survivors are on this journey with you. Recovery takes time, and that's okay.",
                "emoji": "💙",
                "background_color": "#7C3AED",
                "source_insight_id": None,
                "question": None,
                "options": None,
                "next_card_id": "f5"
            },
            {
                "id": "f5",
                "type": "tip",
                "title": "Rest Matters",
                "body": "Your brain heals during sleep. Aim for 7-9 hours each night to support your recovery.",
                "emoji": "😴",
                "background_color": "#EC4899",
                "source_insight_id": None,
                "question": None,
                "options": None,
                "next_card_id": "f6"
            },
            {
                "id": "f6",
                "type": "motivation",
                "title": "Celebrate Small Wins",
                "body": "Did you do your therapy today? Take your meds? That's worth celebrating!",
                "emoji": "🎉",
                "background_color": "#EA580C",
                "source_insight_id": None,
                "question": None,
                "options": None,
                "next_card_id": "f7"
            },
            {
                "id": "f7",
                "type": "tip",
                "title": "Stay Hydrated",
                "body": "Drinking enough water helps your body and brain function better. Keep a water bottle nearby.",
                "emoji": "💧",
                "background_color": "#2563EB",
                "source_insight_id": None,
                "question": None,
                "options": None,
                "next_card_id": "f8"
            },
            {
                "id": "f8",
                "type": "motivation",
                "title": "Keep Going",
                "body": "You're doing great. Come back tomorrow for more insights!",
                "emoji": "✨",
                "background_color": "#0D9488",
                "source_insight_id": None,
                "question": None,
                "options": None,
                "next_card_id": None
            }
        ],
        "start_card_id": "f1",
        "total_cards": 8,
        "card_sequence_length": 8
    }
