"""
PDF Parser - Convert PDFs to structured text using PyMuPDF.
"""

import hashlib
import re
from pathlib import Path
from typing import List, Tuple

import fitz  # PyMuPDF

from ..models import PaperMetadata, Section, ParsedPaper


# Standard academic paper sections (normalized names)
STANDARD_SECTIONS = [
    "abstract",
    "introduction",
    "background",
    "methods",
    "methodology",
    "materials and methods",
    "results",
    "findings",
    "discussion",
    "conclusion",
    "conclusions",
    "references",
    "acknowledgments",
]


def calculate_file_hash(file_path: Path) -> str:
    """Calculate SHA256 hash of a file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def normalize_section_name(header: str) -> str:
    """Normalize section header to standard name."""
    header_lower = header.lower().strip()

    # Remove numbering (e.g., "1. Introduction" -> "introduction")
    header_lower = re.sub(r"^\d+\.?\s*", "", header_lower)

    # Map variations to standard names
    mappings = {
        "material and methods": "methods",
        "materials and methods": "methods",
        "methodology": "methods",
        "experimental": "methods",
        "experimental design": "methods",
        "study design": "methods",
        "findings": "results",
        "outcomes": "results",
        "conclusions": "conclusion",
        "summary": "conclusion",
        "concluding remarks": "conclusion",
        "literature review": "background",
        "related work": "background",
        "prior work": "background",
    }

    return mappings.get(header_lower, header_lower)


def extract_text_from_pdf(file_path: Path) -> str:
    """Extract all text from a PDF using PyMuPDF."""
    doc = fitz.open(file_path)
    text_parts = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text_parts.append(page.get_text())

    doc.close()
    return "\n".join(text_parts)


def detect_sections(text: str) -> List[Tuple[str, int]]:
    """
    Detect section headers and their positions in text.
    Returns list of (section_name, start_position) tuples.
    """
    sections = []

    # Common section header patterns
    patterns = [
        # All caps headers: "INTRODUCTION", "METHODS"
        r"^([A-Z][A-Z\s]{3,30})$",
        # Numbered headers: "1. Introduction", "2.1 Methods"
        r"^(\d+\.?\d*\.?\s*[A-Za-z][A-Za-z\s]{3,30})$",
        # Title case with colon: "Methods:", "Results:"
        r"^([A-Z][a-z]+(?:\s+[A-Za-z]+)*):?\s*$",
    ]

    lines = text.split("\n")
    current_pos = 0

    for line in lines:
        line_stripped = line.strip()

        for pattern in patterns:
            match = re.match(pattern, line_stripped)
            if match:
                header = match.group(1).strip().rstrip(":")
                normalized = normalize_section_name(header)

                # Check if it's a known section type
                if normalized in STANDARD_SECTIONS or any(
                    std in normalized for std in STANDARD_SECTIONS
                ):
                    sections.append((normalized, current_pos))
                    break

        current_pos += len(line) + 1  # +1 for newline

    return sections


def split_into_sections(text: str) -> List[Section]:
    """Split text into sections based on detected headers."""

    detected = detect_sections(text)

    if not detected:
        # No sections detected, return whole text as one section
        return [Section(
            section_name="full_text",
            raw_text=text.strip(),
            section_order=0
        )]

    sections = []

    for i, (section_name, start_pos) in enumerate(detected):
        # End position is start of next section or end of text
        if i + 1 < len(detected):
            end_pos = detected[i + 1][1]
        else:
            end_pos = len(text)

        content = text[start_pos:end_pos].strip()

        # Remove the header line from content
        lines = content.split("\n")
        if lines:
            content = "\n".join(lines[1:]).strip()

        if content:  # Only add non-empty sections
            sections.append(Section(
                section_name=section_name,
                raw_text=content,
                section_order=i
            ))

    return sections


def extract_title_from_text(text: str) -> str:
    """Try to extract paper title from first lines."""
    lines = text.split("\n")

    for line in lines[:20]:  # Check first 20 lines
        line = line.strip()
        # Title is usually a longer line near the start, not all caps
        if len(line) > 20 and len(line) < 200:
            if not line.isupper() and not line.startswith("http"):
                return line

    return None


def parse_pdf(file_path: str | Path) -> ParsedPaper:
    """
    Parse a PDF file into structured text with sections.

    Args:
        file_path: Path to the PDF file

    Returns:
        ParsedPaper with metadata, sections, and full text
    """
    file_path = Path(file_path)

    if not file_path.exists():
        raise FileNotFoundError(f"PDF not found: {file_path}")

    if not file_path.suffix.lower() == ".pdf":
        raise ValueError(f"Not a PDF file: {file_path}")

    # Calculate hash for deduplication
    file_hash = calculate_file_hash(file_path)

    # Extract text from PDF
    full_text = extract_text_from_pdf(file_path)

    # Extract title
    title = extract_title_from_text(full_text)

    # Create metadata
    metadata = PaperMetadata(
        filename=file_path.name,
        hash=file_hash,
        title=title,
        authors=[],
        publication_year=None,
        study_type=None
    )

    # Split into sections
    sections = split_into_sections(full_text)

    return ParsedPaper(
        metadata=metadata,
        sections=sections,
        full_text=full_text
    )


def parse_pdf_simple(file_path: str | Path) -> Tuple[str, str]:
    """
    Simple parsing - just get text and hash.

    Returns:
        Tuple of (full_text, file_hash)
    """
    file_path = Path(file_path)

    if not file_path.exists():
        raise FileNotFoundError(f"PDF not found: {file_path}")

    file_hash = calculate_file_hash(file_path)
    full_text = extract_text_from_pdf(file_path)

    return full_text, file_hash
