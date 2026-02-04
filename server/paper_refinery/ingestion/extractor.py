"""
Insight Extractor - Extract structured insights from paper sections using Llama via Together.ai
"""

import json
from typing import List, Optional

from together import Together

from ..config import settings
from ..models import Section, ExtractedInsight, SectionExtraction, PaperExtraction


# System prompt for insight extraction
EXTRACTION_SYSTEM_PROMPT = """You are a medical research analyst specializing in stroke rehabilitation research.
Your task is to extract key insights from scientific paper sections.

For each section, identify distinct insights that would be valuable for stroke survivors and caregivers.

Focus on:
- Rehabilitation techniques and their effectiveness
- Recovery timelines and outcomes
- Treatment recommendations
- Risk factors and prevention
- Quality of life improvements
- Specific metrics and statistics

For each insight, extract:
1. claim: The main finding (1-2 sentences)
2. evidence: Supporting methodology or data (if mentioned)
3. quantitative_result: Specific numbers, percentages, p-values
4. stroke_types: Which stroke types this applies to (ischemic, hemorrhagic, tbi, or empty if general)
5. recovery_phase: When this applies (acute: 0-7 days, subacute: 1 week-6 months, chronic: 6+ months, or null)
6. intervention: The treatment/therapy discussed (if any)
7. sample_size: Number of participants (if mentioned)

Return your response as a JSON object with this exact structure:
{
    "insights": [
        {
            "claim": "string",
            "evidence": "string or null",
            "quantitative_result": "string or null",
            "stroke_types": ["ischemic", "hemorrhagic"],
            "recovery_phase": "subacute",
            "intervention": "physical therapy",
            "sample_size": 150
        }
    ]
}

If the section has no relevant insights (e.g., references, acknowledgments), return {"insights": []}.
Only extract factual findings, not speculations or future research suggestions."""


def create_extraction_prompt(section: Section) -> str:
    """Create the user prompt for a section."""
    return f"""Extract insights from this {section.section_name.upper()} section of a stroke research paper:

---
{section.raw_text}
---

Return JSON with the extracted insights."""


def parse_llm_response(response_text: str) -> List[ExtractedInsight]:
    """Parse LLM response into ExtractedInsight objects."""

    # Try to extract JSON from the response
    try:
        # Sometimes the model wraps JSON in markdown code blocks
        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()
        elif "```" in response_text:
            json_start = response_text.find("```") + 3
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end].strip()

        data = json.loads(response_text)

        insights = []
        for item in data.get("insights", []):
            insight = ExtractedInsight(
                claim=item.get("claim", ""),
                evidence=item.get("evidence"),
                quantitative_result=item.get("quantitative_result"),
                stroke_types=item.get("stroke_types", []),
                recovery_phase=item.get("recovery_phase"),
                intervention=item.get("intervention"),
                sample_size=item.get("sample_size")
            )
            # Only add insights with actual claims
            if insight.claim:
                insights.append(insight)

        return insights

    except (json.JSONDecodeError, KeyError, TypeError) as e:
        print(f"Warning: Failed to parse LLM response: {e}")
        return []


def extract_insights_from_section(
    client: Together,
    section: Section,
    model: Optional[str] = None
) -> SectionExtraction:
    """
    Extract insights from a single section using Llama.

    Args:
        client: Together.ai client
        section: The section to extract from
        model: Model to use (defaults to settings.together_model)

    Returns:
        SectionExtraction with list of insights
    """
    model = model or settings.together_model

    # Skip sections that typically don't have insights
    skip_sections = {"references", "acknowledgments", "acknowledgements", "preamble"}
    if section.section_name.lower() in skip_sections:
        return SectionExtraction(section_name=section.section_name, insights=[])

    # Skip very short sections
    if len(section.raw_text) < 100:
        return SectionExtraction(section_name=section.section_name, insights=[])

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                {"role": "user", "content": create_extraction_prompt(section)}
            ],
            temperature=0.1,  # Low temperature for consistent extraction
            max_tokens=2000,
        )

        response_text = response.choices[0].message.content
        insights = parse_llm_response(response_text)

        return SectionExtraction(
            section_name=section.section_name,
            insights=insights
        )

    except Exception as e:
        print(f"Error extracting from section {section.section_name}: {e}")
        return SectionExtraction(section_name=section.section_name, insights=[])


def extract_insights_from_paper(
    sections: List[Section],
    model: Optional[str] = None
) -> PaperExtraction:
    """
    Extract insights from all sections of a paper.

    Args:
        sections: List of paper sections
        model: Model to use (defaults to settings.together_model)

    Returns:
        PaperExtraction with all extracted insights
    """
    client = Together(api_key=settings.together_api_key)

    section_extractions = []
    for section in sections:
        print(f"  Extracting from: {section.section_name}...")
        extraction = extract_insights_from_section(client, section, model)
        section_extractions.append(extraction)
        print(f"    Found {len(extraction.insights)} insights")

    return PaperExtraction(sections=section_extractions)


def extract_insights_from_text(
    text: str,
    section_name: str = "full_paper",
    model: Optional[str] = None
) -> List[ExtractedInsight]:
    """
    Extract insights from raw text (convenience function).

    Args:
        text: The text to extract from
        section_name: Name to assign to this text block
        model: Model to use

    Returns:
        List of extracted insights
    """
    section = Section(section_name=section_name, raw_text=text, section_order=0)
    client = Together(api_key=settings.together_api_key)
    extraction = extract_insights_from_section(client, section, model)
    return extraction.insights
