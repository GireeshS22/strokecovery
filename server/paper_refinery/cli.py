"""
CLI interface for PaperRefinery.

Usage:
    python -m paper_refinery setup          # Create database tables
    python -m paper_refinery test           # Test configuration
    python -m paper_refinery parse <pdf>    # Parse a PDF
    python -m paper_refinery extract <pdf>  # Extract insights
    python -m paper_refinery ingest <path>  # Full pipeline with storage
    python -m paper_refinery search <query> # Search insights
    python -m paper_refinery stats          # Show database stats
"""

import json
from pathlib import Path

import typer
from rich.console import Console
from rich.table import Table

app = typer.Typer(help="PaperRefinery - Scientific paper processing pipeline")
console = Console()


@app.command()
def setup():
    """Create database tables in Supabase."""
    from .setup_schema import create_tables
    create_tables()


@app.command()
def test():
    """Test configuration and API connections."""
    from .config import settings

    console.print("\n[bold]Configuration Test[/]\n")
    console.print(f"[green]✓[/] Supabase URL: {settings.supabase_url[:30]}...")
    console.print(f"[green]✓[/] Together Model: {settings.together_model}")
    console.print(f"[green]✓[/] Embedding Model: {settings.embedding_model}")
    console.print(f"[green]✓[/] Papers Dir: {settings.papers_dir}")

    # Test Together.ai
    console.print("\n[yellow]Testing Together.ai...[/]")
    try:
        from together import Together
        client = Together(api_key=settings.together_api_key)
        response = client.chat.completions.create(
            model=settings.together_model,
            messages=[{"role": "user", "content": "Say 'OK'"}],
            max_tokens=10
        )
        console.print(f"[green]✓[/] Together.ai: {response.choices[0].message.content}")
    except Exception as e:
        console.print(f"[red]✗[/] Together.ai: {e}")

    # Test OpenAI
    console.print("\n[yellow]Testing OpenAI embeddings...[/]")
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)
        response = client.embeddings.create(
            model=settings.embedding_model,
            input="test"
        )
        dim = len(response.data[0].embedding)
        console.print(f"[green]✓[/] OpenAI: {dim} dimensions")
    except Exception as e:
        console.print(f"[red]✗[/] OpenAI: {e}")

    # Test Supabase
    console.print("\n[yellow]Testing Supabase...[/]")
    try:
        from . import db
        stats = db.get_stats()
        console.print(f"[green]✓[/] Supabase: {stats['papers']} papers, {stats['insights']} insights")
    except Exception as e:
        console.print(f"[red]✗[/] Supabase: {e}")


@app.command()
def parse(file_path: str):
    """Parse a PDF and show the extracted sections."""
    from .ingestion.parser import parse_pdf

    path = Path(file_path)
    if not path.exists():
        console.print(f"[red]File not found: {file_path}[/]")
        raise typer.Exit(1)

    console.print(f"\n[bold]Parsing:[/] {path.name}\n")

    try:
        parsed = parse_pdf(path)

        console.print(f"[bold]Title:[/] {parsed.metadata.title or 'Unknown'}")
        console.print(f"[bold]Hash:[/] {parsed.metadata.hash[:16]}...")
        console.print(f"\n[bold]Sections ({len(parsed.sections)}):[/]\n")

        for section in parsed.sections:
            preview = section.raw_text[:200].replace("\n", " ")
            if len(section.raw_text) > 200:
                preview += "..."
            console.print(f"[cyan]{section.section_name}[/] ({len(section.raw_text)} chars)")
            console.print(f"  {preview}\n")

    except Exception as e:
        console.print(f"[red]Error: {e}[/]")
        raise typer.Exit(1)


@app.command()
def extract(file_path: str, output: str = None):
    """Parse a PDF and extract insights (no storage)."""
    from .pipeline import process_paper

    path = Path(file_path)
    if not path.exists():
        console.print(f"[red]File not found: {file_path}[/]")
        raise typer.Exit(1)

    parsed, extraction, result = process_paper(path, store=False)

    if not result.success:
        console.print(f"[red]Failed: {result.error}[/]")
        raise typer.Exit(1)

    # Display insights
    console.print(f"\n[bold green]Extracted {extraction.total_insights} insights:[/]\n")

    for section_ext in extraction.sections:
        if section_ext.insights:
            console.print(f"[bold cyan]== {section_ext.section_name.upper()} ==[/]\n")

            for i, insight in enumerate(section_ext.insights, 1):
                console.print(f"[yellow]{i}.[/] {insight.claim}")
                if insight.quantitative_result:
                    console.print(f"   [dim]Stats:[/] {insight.quantitative_result}")
                if insight.intervention:
                    console.print(f"   [dim]Intervention:[/] {insight.intervention}")
                if insight.recovery_phase:
                    console.print(f"   [dim]Phase:[/] {insight.recovery_phase}")
                if insight.stroke_types:
                    console.print(f"   [dim]Stroke types:[/] {', '.join(insight.stroke_types)}")
                console.print()

    # Save to JSON if requested
    if output:
        output_data = {
            "filename": parsed.metadata.filename,
            "title": parsed.metadata.title,
            "total_insights": extraction.total_insights,
            "sections": [
                {
                    "section_name": s.section_name,
                    "insights": [ins.model_dump() for ins in s.insights]
                }
                for s in extraction.sections
            ]
        }
        with open(output, "w") as f:
            json.dump(output_data, f, indent=2)
        console.print(f"[green]Saved to {output}[/]")


@app.command()
def ingest(
    path: str,
    store: bool = typer.Option(True, "--store/--no-store", help="Store in database")
):
    """Process PDF(s) and store in database."""
    from .pipeline import process_paper, process_folder

    target = Path(path)

    if not target.exists():
        console.print(f"[red]Path not found: {path}[/]")
        raise typer.Exit(1)

    if target.is_file():
        process_paper(target, store=store)
    else:
        process_folder(target, store=store)


@app.command()
def search(
    query: str,
    limit: int = typer.Option(5, "--limit", "-n", help="Number of results"),
    stroke_type: str = typer.Option(None, "--type", "-t", help="Filter by stroke type"),
    phase: str = typer.Option(None, "--phase", "-p", help="Filter by recovery phase")
):
    """Search insights by semantic similarity."""
    from .ingestion.embedder import embed_query
    from . import db

    console.print(f"\n[bold]Searching:[/] {query}\n")

    # Generate query embedding
    query_embedding = embed_query(query)

    # Parse filters
    stroke_types = [stroke_type] if stroke_type else None

    # Search
    results = db.search_insights(
        query_embedding=query_embedding,
        limit=limit,
        stroke_types=stroke_types,
        recovery_phase=phase
    )

    if not results:
        console.print("[yellow]No results found[/]")
        return

    console.print(f"[green]Found {len(results)} results:[/]\n")

    for i, r in enumerate(results, 1):
        similarity = r.get('similarity', 0) * 100
        console.print(f"[yellow]{i}.[/] [bold]{r['claim']}[/]")
        console.print(f"   [dim]Similarity:[/] {similarity:.1f}%")
        if r.get('quantitative_result'):
            console.print(f"   [dim]Stats:[/] {r['quantitative_result']}")
        if r.get('intervention'):
            console.print(f"   [dim]Intervention:[/] {r['intervention']}")
        if r.get('recovery_phase'):
            console.print(f"   [dim]Phase:[/] {r['recovery_phase']}")
        if r.get('stroke_types'):
            console.print(f"   [dim]Types:[/] {', '.join(r['stroke_types'])}")
        console.print()


@app.command()
def stats():
    """Show database statistics."""
    from . import db

    console.print("\n[bold]Database Statistics[/]\n")

    try:
        stats = db.get_stats()
        console.print(f"Papers:   {stats['papers']}")
        console.print(f"Insights: {stats['insights']}")
    except Exception as e:
        console.print(f"[red]Error: {e}[/]")
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
