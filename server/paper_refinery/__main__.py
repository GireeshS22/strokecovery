"""
Entry point for running paper_refinery as a module.

Usage: python -m paper_refinery <command>
"""

from .cli import app

if __name__ == "__main__":
    app()
