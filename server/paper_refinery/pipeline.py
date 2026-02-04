"""
Paper processing pipeline - orchestrates parsing, extraction, embedding, and storage.
"""

import time
from pathlib import Path
from typing import Optional, List, Tuple

from rich.console import Console
from rich.table import Table

from .models import ProcessingResult, ParsedPaper, PaperExtraction
from .ingestion.parser import parse_pdf
from .ingestion.extractor import extract_insights_from_paper
from .ingestion.embedder import embed_insights_batch, get_client as get_openai_client
from . import db

console = Console()


def process_paper(
    file_path: str | Path,
    verbose: bool = True,
    store: bool = False
) -> Tuple[ParsedPaper, PaperExtraction, ProcessingResult]:
    """
    Process a single paper: parse PDF and extract insights.
    Optionally store in database.

    Args:
        file_path: Path to the PDF file
        verbose: Print progress to console
        store: If True, store results in Supabase

    Returns:
        Tuple of (ParsedPaper, PaperExtraction, ProcessingResult)
    """
    file_path = Path(file_path)
    start_time = time.time()

    if verbose:
        console.print(f"\n[bold blue]Processing:[/] {file_path.name}")

    try:
        # Step 1: Parse PDF
        if verbose:
            console.print("  [yellow]① Parsing PDF...[/]")
        parsed = parse_pdf(file_path)

        if verbose:
            console.print(f"  [green]✓[/] Parsed {len(parsed.sections)} sections")

        # Step 2: Check for duplicates if storing
        if store:
            if db.check_paper_exists(parsed.metadata.hash):
                if verbose:
                    console.print(f"  [yellow]⚠ Paper already exists in database, skipping[/]")
                return parsed, None, ProcessingResult(
                    filename=file_path.name,
                    success=True,
                    error="Duplicate - already in database",
                    sections_count=len(parsed.sections),
                    processing_time_seconds=time.time() - start_time
                )

        # Step 3: Extract insights
        if verbose:
            console.print("  [yellow]② Extracting insights...[/]")
        extraction = extract_insights_from_paper(parsed.sections)

        if verbose:
            console.print(f"  [green]✓[/] Extracted {extraction.total_insights} insights")

        # Step 4: Store in database if requested
        if store and extraction.total_insights > 0:
            if verbose:
                console.print("  [yellow]③ Generating embeddings...[/]")

            # Collect all insights for batch embedding
            all_insights = []
            insight_section_map = []  # Track which section each insight belongs to

            for section_ext in extraction.sections:
                for insight in section_ext.insights:
                    all_insights.append(insight)
                    insight_section_map.append(section_ext.section_name)

            # Generate embeddings in batch
            openai_client = get_openai_client()
            embeddings = embed_insights_batch(all_insights, openai_client)

            if verbose:
                console.print(f"  [green]✓[/] Generated {len(embeddings)} embeddings")
                console.print("  [yellow]④ Storing in database...[/]")

            # Store paper
            supabase_client = db.get_client()
            paper_id = db.insert_paper(parsed.metadata, supabase_client)

            # Store sections and get their IDs
            section_ids = {}
            for section in parsed.sections:
                section_id = db.insert_section(paper_id, section, supabase_client)
                section_ids[section.section_name] = section_id

            # Store insights with embeddings
            for insight, embedding, section_name in zip(all_insights, embeddings, insight_section_map):
                section_id = section_ids.get(section_name)
                db.insert_insight(paper_id, section_id, insight, embedding, supabase_client)

            if verbose:
                console.print(f"  [green]✓[/] Stored paper and {len(all_insights)} insights")

        elapsed = time.time() - start_time

        if verbose:
            console.print(f"  [bold green]✓ Complete in {elapsed:.1f}s[/]")

        result = ProcessingResult(
            filename=file_path.name,
            success=True,
            sections_count=len(parsed.sections),
            insights_count=extraction.total_insights,
            processing_time_seconds=elapsed
        )

        return parsed, extraction, result

    except Exception as e:
        elapsed = time.time() - start_time
        if verbose:
            console.print(f"  [red]✗ Error: {e}[/]")

        result = ProcessingResult(
            filename=file_path.name,
            success=False,
            error=str(e),
            processing_time_seconds=elapsed
        )

        return None, None, result


def process_folder(
    folder_path: str | Path,
    verbose: bool = True,
    store: bool = False
) -> List[Tuple[ParsedPaper, PaperExtraction, ProcessingResult]]:
    """
    Process all PDFs in a folder.

    Args:
        folder_path: Path to folder containing PDFs
        verbose: Print progress
        store: If True, store results in Supabase

    Returns:
        List of (ParsedPaper, PaperExtraction, ProcessingResult) tuples
    """
    folder_path = Path(folder_path)

    if not folder_path.exists():
        raise FileNotFoundError(f"Folder not found: {folder_path}")

    pdf_files = list(folder_path.glob("*.pdf"))

    if not pdf_files:
        console.print(f"[yellow]No PDF files found in {folder_path}[/]")
        return []

    if verbose:
        console.print(f"\n[bold]Found {len(pdf_files)} PDF files[/]")
        if store:
            console.print("[cyan]Storage mode: ON - will save to database[/]")

    results = []
    for pdf_file in pdf_files:
        result = process_paper(pdf_file, verbose=verbose, store=store)
        results.append(result)

    # Print summary
    if verbose:
        print_summary(results)

    return results


def print_summary(results: List[Tuple[ParsedPaper, PaperExtraction, ProcessingResult]]):
    """Print a summary table of processing results."""

    table = Table(title="\nProcessing Summary")
    table.add_column("File", style="cyan")
    table.add_column("Status", style="green")
    table.add_column("Sections", justify="right")
    table.add_column("Insights", justify="right")
    table.add_column("Time (s)", justify="right")

    total_insights = 0
    successful = 0

    for parsed, extraction, result in results:
        if result.success and not result.error:
            status = "[green]✓[/]"
            successful += 1
            total_insights += result.insights_count
        elif result.error and "Duplicate" in result.error:
            status = "[yellow]skip[/]"
        else:
            status = "[red]✗[/]"

        table.add_row(
            result.filename[:40],
            status,
            str(result.sections_count),
            str(result.insights_count),
            f"{result.processing_time_seconds:.1f}"
        )

    console.print(table)
    console.print(f"\n[bold]Total:[/] {successful}/{len(results)} papers, {total_insights} insights")
