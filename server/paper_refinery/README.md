# PaperRefinery

A semantic RAG (Retrieval-Augmented Generation) pipeline for processing scientific research papers and extracting structured insights for stroke recovery.

## Overview

PaperRefinery transforms stroke research PDFs into searchable, structured knowledge. Instead of naive text chunking, it uses a "Semantic Refinery" approach:

1. **Parse** PDFs preserving document structure
2. **Extract** structured insights using LLMs
3. **Embed** insights as vectors for semantic search
4. **Store** in PostgreSQL with pgvector for fast retrieval

This powers the "Daily Stroke Bites" feature — personalized, evidence-based content for stroke survivors.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        INPUT                                     │
│                          │                                       │
│                    PDF Research Paper                            │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PARSING LAYER                                 │
│                                                                  │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │   PyMuPDF   │ →  │   Section   │ →  │   Parsed    │        │
│   │  (PDF→Text) │    │  Detection  │    │   Paper     │        │
│   └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                  │
│   Output: Metadata + Sections (Abstract, Methods, Results, etc) │
└──────────────────────────┼───────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXTRACTION LAYER                               │
│                                                                  │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │   Section   │ →  │  Llama 3.3  │ →  │  Structured │        │
│   │    Text     │    │ (Together)  │    │   Insights  │        │
│   └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                  │
│   Each insight contains:                                         │
│   - claim: Main finding                                          │
│   - evidence: Supporting data                                    │
│   - quantitative_result: Stats, p-values                        │
│   - stroke_types: [ischemic, hemorrhagic, tbi]                  │
│   - recovery_phase: acute/subacute/chronic                      │
│   - intervention: Treatment discussed                            │
│   - sample_size: Study participants                              │
└──────────────────────────┼───────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EMBEDDING LAYER                                │
│                                                                  │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │   Insight   │ →  │   OpenAI    │ →  │   Vector    │        │
│   │    Text     │    │  Ada-002    │    │   [1536]    │        │
│   └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                  │
│   Embeds: claim + evidence + quantitative_result                │
└──────────────────────────┼───────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STORAGE LAYER                                 │
│                                                                  │
│                      Supabase                                    │
│   ┌─────────────────────────────────────────────────────┐       │
│   │                    PostgreSQL                        │       │
│   │                                                      │       │
│   │   papers ──────┐                                    │       │
│   │                │                                    │       │
│   │   paper_sections ──┼──► insights (with pgvector)    │       │
│   │                                                      │       │
│   └─────────────────────────────────────────────────────┘       │
└──────────────────────────┼───────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   RETRIEVAL                                      │
│                                                                  │
│   User Query: "How to prevent seizures after stroke?"           │
│                           │                                      │
│                           ▼                                      │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│   │   Embed     │ →  │   Vector    │ →  │   Top K     │        │
│   │   Query     │    │  Similarity │    │   Results   │        │
│   └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                  │
│   Returns: Most semantically similar insights                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## How It Works

### 1. PDF Parsing (`ingestion/parser.py`)

Uses PyMuPDF to extract text while detecting document structure:

```python
parsed = parse_pdf("paper.pdf")
# Returns:
#   - metadata: title, hash, filename
#   - sections: [Section(name="methods", text="..."), ...]
#   - full_text: Complete document text
```

**Section Detection:**
- Identifies headers (ABSTRACT, METHODS, RESULTS, DISCUSSION, etc.)
- Handles numbered sections (1. Introduction, 2.1 Methods)
- Normalizes variations ("Materials and Methods" → "methods")

**Deduplication:**
- SHA256 hash of file content
- Prevents reprocessing same paper

### 2. Insight Extraction (`ingestion/extractor.py`)

Sends each section to Llama 3.3 (via Together.ai) with a structured prompt:

```python
extraction = extract_insights_from_paper(parsed.sections)
# Returns list of ExtractedInsight objects
```

**Prompt Design:**
- Role: Medical research analyst specializing in stroke rehabilitation
- Focus: Findings valuable for stroke survivors and caregivers
- Output: Structured JSON with specific fields

**What Gets Extracted:**
| Field | Description | Example |
|-------|-------------|---------|
| claim | Main finding | "Walking 30 min daily improves mobility" |
| evidence | Supporting methodology | "Randomized controlled trial" |
| quantitative_result | Stats | "23% improvement, p<0.05" |
| stroke_types | Applicable types | ["ischemic", "hemorrhagic"] |
| recovery_phase | When applicable | "subacute" |
| intervention | Treatment discussed | "physical therapy" |
| sample_size | Participants | 150 |

### 3. Embedding Generation (`ingestion/embedder.py`)

Converts insights to 1536-dimensional vectors using OpenAI's text-embedding-ada-002:

```python
embeddings = embed_insights_batch(insights)
# Returns: List of 1536-float vectors
```

**What Gets Embedded:**
```
claim + evidence + quantitative_result + intervention
```

This creates a rich semantic representation for similarity search.

### 4. Storage (`db.py`)

Stores everything in Supabase (PostgreSQL + pgvector):

```python
paper_id = db.insert_paper(metadata)
section_id = db.insert_section(paper_id, section)
db.insert_insight(paper_id, section_id, insight, embedding)
```

### 5. Retrieval (`db.py` + `search`)

Semantic search using pgvector's cosine similarity:

```python
results = db.search_insights(
    query_embedding=embed_query("seizure prevention"),
    limit=10,
    stroke_types=["ischemic"],
    recovery_phase="acute"
)
```

**How Similarity Works:**
```
Query: "How to prevent seizures?"
        ↓
Embedding: [0.12, -0.08, 0.21, ...]
        ↓
Compare against ALL insight embeddings
        ↓
Return top matches by cosine similarity
```

---

## Database Schema

```sql
-- Papers (metadata)
CREATE TABLE papers (
    id UUID PRIMARY KEY,
    hash VARCHAR(64) UNIQUE,      -- SHA256 for deduplication
    filename TEXT,
    title TEXT,
    authors TEXT[],
    publication_year INT,
    study_type VARCHAR(50),       -- rct, meta-analysis, cohort
    processed_at TIMESTAMP
);

-- Sections (raw text for citations)
CREATE TABLE paper_sections (
    id UUID PRIMARY KEY,
    paper_id UUID REFERENCES papers(id),
    section_name TEXT,
    raw_text TEXT,
    section_order INT
);

-- Insights (searchable knowledge)
CREATE TABLE insights (
    id UUID PRIMARY KEY,
    paper_id UUID REFERENCES papers(id),
    section_id UUID REFERENCES paper_sections(id),

    -- Extracted fields
    claim TEXT,
    evidence TEXT,
    quantitative_result TEXT,
    stroke_types TEXT[],
    recovery_phase VARCHAR(20),
    intervention TEXT,
    sample_size INT,

    -- Vector for semantic search
    embedding vector(1536)
);

-- Vector index for fast similarity search
CREATE INDEX ON insights USING ivfflat (embedding vector_cosine_ops);
```

---

## Installation

### Prerequisites
- Python 3.10+
- Supabase account with pgvector enabled

### Setup

```bash
cd server

# Install dependencies
pip install -r requirements.txt

# Configure environment variables in .env:
# - SUPABASE_URL
# - SUPABASE_KEY
# - DATABASE_URL
# - TOGETHER_API_KEY
# - OPENAI_API_KEY

# Create database tables
python -m paper_refinery setup

# Test configuration
python -m paper_refinery test
```

---

## Usage

### CLI Commands

```bash
# Parse a PDF (view sections)
python -m paper_refinery parse data/papers/paper.pdf

# Extract insights (no storage)
python -m paper_refinery extract data/papers/paper.pdf

# Full pipeline: parse → extract → embed → store
python -m paper_refinery ingest data/papers/paper.pdf

# Process all PDFs in a folder
python -m paper_refinery ingest data/papers/

# Search insights
python -m paper_refinery search "mobility after stroke"
python -m paper_refinery search "seizure prevention" --type ischemic --phase acute

# View statistics
python -m paper_refinery stats
```

### Python API

```python
from paper_refinery.pipeline import process_paper
from paper_refinery import db
from paper_refinery.ingestion.embedder import embed_query

# Process a paper
parsed, extraction, result = process_paper("paper.pdf", store=True)

# Search
query_vec = embed_query("walking rehabilitation")
results = db.search_insights(query_vec, limit=5)

for r in results:
    print(f"{r['claim']} (similarity: {r['similarity']:.2f})")
```

---

## File Structure

```
paper_refinery/
├── __init__.py
├── __main__.py          # Entry point
├── config.py            # Environment settings
├── models.py            # Pydantic schemas
├── db.py                # Supabase operations
├── pipeline.py          # Orchestrates full flow
├── setup_schema.py      # Creates database tables
├── cli.py               # Command-line interface
├── README.md            # This file
└── ingestion/
    ├── __init__.py
    ├── parser.py        # PDF → structured text
    ├── extractor.py     # Text → insights (LLM)
    └── embedder.py      # Insights → vectors
```

---

## Configuration

Environment variables (`.env`):

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-anon-key
DATABASE_URL=postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres

# Together.ai (Llama)
TOGETHER_API_KEY=your-key
TOGETHER_MODEL=meta-llama/Llama-3.3-70B-Instruct-Turbo

# OpenAI (Embeddings)
OPENAI_API_KEY=your-key
EMBEDDING_MODEL=text-embedding-ada-002
```

---

## How This Powers Daily Stroke Bites

1. **Ingest papers** → Build knowledge base of stroke research insights
2. **User opens app** → Get user profile (stroke type, days since stroke)
3. **Query insights** → Filter by stroke_type, recovery_phase
4. **Return personalized bite** → Show relevant, unseen insight
5. **Track history** → Don't repeat same insights

Example flow:
```python
def get_daily_bite(user):
    # Determine recovery phase from days since stroke
    phase = "acute" if user.days_since_stroke < 7 else \
            "subacute" if user.days_since_stroke < 180 else "chronic"

    # Find relevant insights
    insights = db.search_insights(
        query_embedding=embed_query("recovery tips"),
        stroke_types=[user.stroke_type],
        recovery_phase=phase,
        limit=10
    )

    # Filter out seen insights
    unseen = [i for i in insights if i['id'] not in user.seen_bites]

    return unseen[0] if unseen else None
```

---

## Performance

| Operation | Time |
|-----------|------|
| Parse PDF | ~1s |
| Extract insights (per section) | ~2-3s |
| Generate embeddings (batch of 20) | ~1s |
| Store in database | <1s |
| **Total per paper** | **~30-60s** |
| Vector search (1000 insights) | <100ms |

---

## Future Improvements

- [ ] Better section detection for varied PDF formats
- [ ] Confidence scoring for extracted insights
- [ ] Conflict detection (contradicting findings)
- [ ] Evidence hierarchy weighting (meta-analysis > case study)
- [ ] Batch processing with progress tracking
- [ ] API endpoint for mobile app integration
