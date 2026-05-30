"""Read scraped candidate + job data from the Next.js side's Postgres.

The Next.js app (src/app/api/ingest/*) writes scraped markdown to:
  - candidate_documents(id, candidate_id, filename, content, doc_type, created_at)
  - candidates(id, name, goals jsonb)
  - jobs(id, company_id, title, description, hard_requirements, soft_requirements,
         comp_range, location, remote, active)
  - company_documents(id, company_id, job_id, filename, content, doc_type)
  - companies(id, name)

This module assembles those rows into the same `dict` shape that the existing
profile_builder / role_builder consume from mock_data. The agent layer treats
the dict as opaque context for the LLM, so we just need to bundle everything
that's known about a candidate or a role.
"""

from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Iterator, Optional

import psycopg
from psycopg.rows import dict_row

from src import config

logger = logging.getLogger(__name__)


class ScraperDBUnavailable(RuntimeError):
    """Raised when we can't talk to the scraper Postgres."""


@contextmanager
def _conn() -> Iterator[psycopg.Connection]:
    """Connect to the scraper Postgres, yielding a dict-row connection.

    Connect failures are translated to ScraperDBUnavailable so the API layer
    can return a clear 503 rather than leaking psycopg internals.
    """
    try:
        conn = psycopg.connect(config.SCRAPER_DATABASE_URL, row_factory=dict_row)
    except psycopg.OperationalError as e:
        raise ScraperDBUnavailable(
            f"Could not connect to scraper Postgres at {_redact(config.SCRAPER_DATABASE_URL)}: {e}"
        ) from e
    try:
        yield conn
    finally:
        conn.close()


def _redact(url: str) -> str:
    """Strip password from a connection string for logging/error messages."""
    if "@" not in url or ":" not in url:
        return url
    scheme, rest = url.split("://", 1) if "://" in url else ("", url)
    auth, host = rest.split("@", 1)
    if ":" in auth:
        user = auth.split(":", 1)[0]
        auth = f"{user}:***"
    return f"{scheme}://{auth}@{host}" if scheme else f"{auth}@{host}"


# ---- Candidate ---------------------------------------------------------------


def fetch_candidate_bundle(candidate_id: str) -> Optional[dict]:
    """Pull a candidate + all their documents from the scraper DB.

    Returns a dict in the shape `profile_builder.build_candidate_persona`
    expects, or None if the candidate doesn't exist.
    """
    with _conn() as c:
        row = c.execute(
            "SELECT id::text AS id, name, goals FROM candidates WHERE id = %s",
            (candidate_id,),
        ).fetchone()
        if not row:
            return None

        docs = c.execute(
            "SELECT id::text AS id, filename, content, doc_type, created_at "
            "FROM candidate_documents "
            "WHERE candidate_id = %s "
            "ORDER BY created_at ASC",
            (candidate_id,),
        ).fetchall()

    # Bundle documents by doc_type so the LLM has clean grouping. Each doc keeps
    # its full markdown content (the Next.js scrapers already produce
    # well-formed YAML-frontmatter markdown).
    sources: dict[str, list[dict]] = {}
    for d in docs:
        sources.setdefault(d["doc_type"], []).append(
            {
                "document_id": d["id"],
                "filename": d["filename"],
                "doc_type": d["doc_type"],
                "scraped_at": d["created_at"].isoformat() if d["created_at"] else None,
                "content": d["content"],
            }
        )

    return {
        "candidate_id": row["id"],
        "name": row["name"] or "Unknown Candidate",
        "goals": row["goals"] or {},
        "sources": sources,
        "_source": "scraper_db",
    }


# ---- Job / Role --------------------------------------------------------------


def fetch_job_bundle(job_id: str) -> Optional[dict]:
    """Pull a job (+ its company + all related company_documents) from the scraper DB.

    Returns a dict in the shape `role_builder.build_role_persona` expects,
    or None if the job doesn't exist.
    """
    with _conn() as c:
        row = c.execute(
            """
            SELECT j.id::text         AS job_id,
                   j.title            AS job_title,
                   j.description      AS job_description,
                   j.hard_requirements,
                   j.soft_requirements,
                   j.comp_range,
                   j.location,
                   j.remote,
                   j.active,
                   c.id::text         AS company_id,
                   c.name             AS company_name
              FROM jobs j
              JOIN companies c ON c.id = j.company_id
             WHERE j.id = %s
            """,
            (job_id,),
        ).fetchone()
        if not row:
            return None

        docs = c.execute(
            "SELECT id::text AS id, filename, content, doc_type, created_at "
            "FROM company_documents "
            "WHERE job_id = %s OR (job_id IS NULL AND company_id = %s) "
            "ORDER BY created_at ASC",
            (job_id, row["company_id"]),
        ).fetchall()

    documents: list[dict] = [
        {
            "document_id": d["id"],
            "filename": d["filename"],
            "doc_type": d["doc_type"],
            "scraped_at": d["created_at"].isoformat() if d["created_at"] else None,
            "content": d["content"],
        }
        for d in docs
    ]

    return {
        "role_id": row["job_id"],
        "company": {
            "id": row["company_id"],
            "name": row["company_name"] or "Unknown Company",
        },
        "role": {
            "title": row["job_title"] or "Unknown Role",
            "description": row["job_description"] or "",
            "hard_requirements": list(row["hard_requirements"] or []),
            "soft_requirements": list(row["soft_requirements"] or []),
            "comp_range": row["comp_range"] or {},
            "location": row["location"] or "",
            "remote": bool(row["remote"]),
            "active": bool(row["active"]),
        },
        "documents": documents,
        "_source": "scraper_db",
    }


# ---- Listing helpers ---------------------------------------------------------


def list_candidates(limit: int = 50) -> list[dict]:
    """Light list of candidates in the scraper DB (id, name, document count)."""
    with _conn() as c:
        rows = c.execute(
            """
            SELECT c.id::text                              AS candidate_id,
                   c.name,
                   COUNT(d.id)::int                        AS document_count,
                   c.created_at
              FROM candidates c
              LEFT JOIN candidate_documents d ON d.candidate_id = c.id
             GROUP BY c.id
             ORDER BY c.created_at DESC
             LIMIT %s
            """,
            (limit,),
        ).fetchall()
    return [
        {
            "candidate_id": r["candidate_id"],
            "name": r["name"] or "(unnamed)",
            "document_count": r["document_count"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        }
        for r in rows
    ]


def list_jobs(limit: int = 50) -> list[dict]:
    """Light list of jobs in the scraper DB."""
    with _conn() as c:
        rows = c.execute(
            """
            SELECT j.id::text     AS job_id,
                   j.title,
                   c.name         AS company_name,
                   j.active,
                   j.created_at
              FROM jobs j
              JOIN companies c ON c.id = j.company_id
             ORDER BY j.created_at DESC
             LIMIT %s
            """,
            (limit,),
        ).fetchall()
    return [
        {
            "job_id": r["job_id"],
            "title": r["title"],
            "company_name": r["company_name"] or "(unnamed)",
            "active": bool(r["active"]),
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        }
        for r in rows
    ]


def healthcheck() -> dict:
    """Return whether the scraper DB is reachable + row counts."""
    try:
        with _conn() as c:
            cands = c.execute("SELECT COUNT(*)::int AS n FROM candidates").fetchone()["n"]
            docs = c.execute("SELECT COUNT(*)::int AS n FROM candidate_documents").fetchone()["n"]
            jobs = c.execute("SELECT COUNT(*)::int AS n FROM jobs").fetchone()["n"]
    except ScraperDBUnavailable as e:
        return {"reachable": False, "error": str(e)}
    except psycopg.Error as e:
        return {"reachable": False, "error": f"DB query failed: {e}"}
    return {
        "reachable": True,
        "candidates": cands,
        "candidate_documents": docs,
        "jobs": jobs,
    }
