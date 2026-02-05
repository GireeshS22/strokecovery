"""
Insight Extractor - Extract structured insights from paper sections using Llama via Together.ai
"""

import json
from typing import List, Optional

from together import Together

from ..config import settings
from ..models import Section, ExtractedInsight, SectionExtraction, PaperExtraction


# System prompt for insight extraction
EXTRACTION_SYSTEM_PROMPT = """You extract practical stroke recovery insights from research papers for an app used by stroke survivors and their caregivers. These are non-medical people looking for actionable, encouraging, evidence-based information.

ONLY extract an insight if a stroke survivor or caregiver could:
- DO something with it (exercise, diet, therapy technique, lifestyle change)
- UNDERSTAND their recovery better (timelines, what to expect, why something happens)
- FEEL informed about a treatment option to discuss with their doctor
- GAIN hope from a concrete, evidence-backed outcome

DO NOT extract:
- Study methodology or design descriptions ("This was a randomized controlled trial...")
- Statistical techniques or analysis methods ("We used Cox regression...")
- Background/literature review claims not from this paper's own findings
- Raw biomarker or imaging data without patient-relevant interpretation
- Findings about animal models, cell cultures, or non-human subjects
- Purely clinical details only relevant to doctors (drug pharmacokinetics, surgical techniques)
- Vague or generic statements ("More research is needed", "Stroke is a leading cause of disability")
- Duplicate findings — if the same result appears in the abstract and discussion, extract it only once

QUALITY BAR: If you are unsure whether an insight is useful to a patient, leave it out. Fewer high-quality insights are far better than many irrelevant ones. Most sections should yield 0-3 insights. Return an empty list rather than stretch to fill it.

WRITING STYLE for the "claim" field:
- Write in plain language a non-medical person can understand
- Be specific: "Walking 30 minutes daily improved arm movement by 23%" not "Exercise improved outcomes"
- Include the timeframe and magnitude when available
- Avoid jargon — use "blood clot stroke" not "ischemic cerebrovascular accident"

For each insight, extract these fields:
1. claim: The main finding in plain language (1-2 sentences, written for patients)
2. evidence: Brief description of how strong the evidence is (e.g., "Randomized trial with 200 patients" or "Small pilot study"). Null if unclear.
3. quantitative_result: Key numbers that show the size of the effect (e.g., "23% improvement in walking speed, p<0.05"). Null if not reported.
4. stroke_types: Which stroke types this applies to. Use: "ischemic", "hemorrhagic", "tbi". Leave empty [] if the finding applies generally.
5. recovery_phase: When in recovery this applies. Use: "acute" (first week), "subacute" (1 week to 6 months), "chronic" (6+ months). Null if not phase-specific.
6. intervention: The specific treatment, therapy, or activity (e.g., "constraint-induced movement therapy", "daily walking", "anti-seizure medication"). Null if this is an observational finding.
7. sample_size: Number of human participants. Null if not stated.

Return JSON:
{
    "insights": [
        {
            "claim": "string",
            "evidence": "string or null",
            "quantitative_result": "string or null",
            "stroke_types": [],
            "recovery_phase": "subacute",
            "intervention": "physical therapy",
            "sample_size": 150
        }
    ]
}

If the section has no patient-relevant insights, return {"insights": []}. This is expected for methods, references, and many technical sections."""


SECTION_GUIDANCE = {
    "abstract": "This is the abstract — it may summarize the key finding. Extract only the main patient-relevant result, not background or methodology.",
    "introduction": "Introductions mostly contain background. Only extract if there is a specific, cited statistic about recovery outcomes that a patient would find useful.",
    "methods": "Methods sections rarely contain patient-relevant insights. Only extract if there is a description of a specific therapy protocol a patient could ask their therapist about.",
    "results": "This is where the key findings are. Focus on outcomes that show how much a treatment helped and for whom.",
    "discussion": "Discussions interpret results. Only extract new patient-relevant interpretations not already covered in the results. Avoid speculation and 'future research' statements.",
    "conclusion": "Extract only if the conclusion states a clear, actionable takeaway not already captured from earlier sections.",
}


def create_extraction_prompt(section: Section) -> str:
    """Create the user prompt for a section."""
    section_lower = section.section_name.lower()
    guidance = SECTION_GUIDANCE.get(section_lower, "Extract only findings that are directly useful to a stroke survivor or caregiver.")

    return f"""Extract patient-relevant insights from this {section.section_name.upper()} section of a stroke research paper.

Guidance for this section type: {guidance}

---
{section.raw_text}
---

Return JSON. If nothing here is useful for a patient, return {{"insights": []}}."""


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

    # Skip sections that typically don't have patient-relevant insights
    skip_sections = {
        "references", "acknowledgments", "acknowledgements", "preamble",
        "funding", "declarations", "conflicts of interest", "conflict of interest",
        "author contributions", "supplementary", "supplementary materials",
        "appendix", "abbreviations", "ethics", "ethics statement",
        "data availability", "competing interests",
    }
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
