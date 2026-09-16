"""
FastAPI Router for Automated Evidence Ingestion Pipeline (/api/v1/evidence-ingestion).
"""

import logging
import re
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.evidence_ingestion import (
    AutoIngestRequest,
    AutoIngestResponse,
    BatchAutoIngestRequest,
    BatchAutoIngestResponse,
    PresetEvidenceSource,
    RecentIngestionActivityItem,
)
from app.services.auth import require_official_or_admin
from app.services.evidence_ingestion import (
    PRESET_EVIDENCE_SOURCES,
    EvidenceIngestionService,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/evidence-ingestion", tags=["Auto Data Ingestion & Evidence Pipeline"])


def get_ingestion_service(db: Session = Depends(get_db)) -> EvidenceIngestionService:
    return EvidenceIngestionService(db)


@router.get(
    "/presets",
    response_model=List[PresetEvidenceSource],
    summary="List official demonstration evidence sources",
    description="Returns pre-curated official government and research evidence presets for 1-click live testing across Puri, Chilika, Bhubaneswar, and Konark.",
)
def get_preset_sources() -> List[PresetEvidenceSource]:
    return PRESET_EVIDENCE_SOURCES


@router.get(
    "/recent-activity",
    response_model=List[RecentIngestionActivityItem],
    summary="List recently ingested evidence documents and sources",
    description="Returns the history of recently ingested evidence publications, datasets, observation counts, and verification statuses.",
)
def get_recent_ingestion_activity(
    limit: Optional[int] = Query(None, description="Maximum number of records to return. If omitted, returns all."),
    offset: int = Query(0, description="Offset for pagination."),
    service: EvidenceIngestionService = Depends(get_ingestion_service),
) -> List[RecentIngestionActivityItem]:
    return service.get_recent_ingestions(limit=limit, offset=offset)


@router.post(
    "/auto-ingest",
    response_model=AutoIngestResponse,
    status_code=status.HTTP_200_OK,
    summary="Auto-ingest evidence from public URL, text bulletin, or document",
    description="Fetches, extracts, deterministically validates, and ingests an evidence source into the EcoTrace database, evaluating against existing observations via the 10-dimension comparability gate.",
)
async def auto_ingest_from_url_or_text(
    payload: AutoIngestRequest,
    service: EvidenceIngestionService = Depends(get_ingestion_service),
    _auth_role: Any = Depends(require_official_or_admin),
) -> AutoIngestResponse:
    try:
        response = await service.execute_auto_ingestion(request=payload)
        return response
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        logger.error("Auto-ingest exception: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evidence ingestion failed: {str(e)}",
        )


@router.post(
    "/upload-and-ingest",
    response_model=AutoIngestResponse,
    status_code=status.HTTP_200_OK,
    summary="Auto-ingest evidence from uploaded document (multipart or JSON)",
    description="Parses an uploaded file or document payload (PDF, CSV, JSON, TXT, XLSX), extracts structured metrics and evidence, validates data integrity, and records the observation in the active database.",
)
async def upload_and_ingest_document(
    request: Request,
    service: EvidenceIngestionService = Depends(get_ingestion_service),
    _auth_role: Any = Depends(require_official_or_admin),
) -> AutoIngestResponse:
    try:
        content_type = request.headers.get("content-type", "").lower()
        file_bytes: Optional[bytes] = None
        filename: Optional[str] = None
        auto_request: Optional[AutoIngestRequest] = None

        if "multipart/form-data" in content_type:
            form = None
            try:
                form = await request.form()
            except Exception as form_err:
                logger.warning("FastAPI request.form() parser fallback triggered: %s", form_err)

            if form is not None:
                file_field = form.get("file")
                if file_field is not None and hasattr(file_field, "read"):
                    file_bytes = await file_field.read()
                    filename = getattr(file_field, "filename", "uploaded_file.pdf")
                elif isinstance(file_field, str):
                    file_bytes = file_field.encode("utf-8")
                    filename = "uploaded_text.txt"

                dest_id_raw = form.get("destination_id")
                dest_id: Optional[int] = None
                if dest_id_raw is not None and str(dest_id_raw).strip() != "":
                    try:
                        dest_id = int(dest_id_raw)
                    except (ValueError, TypeError):
                        dest_id = None

                dry_run_raw = str(form.get("dry_run", "")).lower()
                dry_run = dry_run_raw in ["true", "1", "yes"]

                def _clean_str(v: Any) -> Optional[str]:
                    if v is None:
                        return None
                    s = str(v).replace("\x00", "").strip()
                    return s if s else None

                auto_request = AutoIngestRequest(
                    source_url=None,
                    raw_text=None,
                    file_name=_clean_str(filename),
                    document_title=_clean_str(form.get("document_title")) or _clean_str(filename) or "Uploaded Document",
                    source_organization=_clean_str(form.get("source_organization")),
                    destination_id=dest_id,
                    suggested_metric_code=_clean_str(form.get("suggested_metric_code")),
                    force_status=_clean_str(form.get("force_status")),
                    dry_run=dry_run,
                )
            else:
                # Built-in robust manual boundary extraction fallback
                raw_body = await request.body()
                boundary_match = re.search(r"boundary=(.+)", content_type)
                boundary = boundary_match.group(1).strip() if boundary_match else None
                
                dest_id = None
                doc_title = "Uploaded Flood Bulletin Document"
                src_org = None
                
                if boundary:
                    b_bytes = boundary.encode("latin-1")
                    parts = raw_body.split(b"--" + b_bytes)
                    for part in parts:
                        if b'name="file"' in part:
                            header_body = part.split(b"\r\n\r\n", 1)
                            if len(header_body) == 2:
                                headers, content = header_body
                                fn_match = re.search(r'filename="([^"]+)"', headers.decode("latin-1", errors="ignore"))
                                filename = fn_match.group(1) if fn_match else "uploaded_file.pdf"
                                file_bytes = content.rstrip(b"\r\n")
                        elif b'name="destination_id"' in part:
                            hb = part.split(b"\r\n\r\n", 1)
                            if len(hb) == 2:
                                try:
                                    dest_id = int(hb[1].decode("utf-8", errors="ignore").strip())
                                except Exception:
                                    pass
                        elif b'name="document_title"' in part:
                            hb = part.split(b"\r\n\r\n", 1)
                            if len(hb) == 2:
                                doc_title = hb[1].decode("utf-8", errors="ignore").strip()

                if not file_bytes:
                    file_bytes = raw_body
                    filename = "uploaded_document.pdf"

                auto_request = AutoIngestRequest(
                    source_url=None,
                    raw_text=None,
                    file_name=filename,
                    document_title=doc_title,
                    source_organization=src_org,
                    destination_id=dest_id,
                    suggested_metric_code=None,
                    force_status=None,
                    dry_run=False,
                )
        else:
            # Assume JSON payload
            body = await request.json()
            auto_request = AutoIngestRequest(**body)

        response = await service.execute_auto_ingestion(
            request=auto_request,
            file_bytes=file_bytes,
            filename=filename,
        )
        return response
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        logger.error("Upload and ingest exception: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document upload and ingestion failed: {str(e)}",
        )


@router.post(
    "/batch-csv-ingest",
    response_model=BatchAutoIngestResponse,
    status_code=status.HTTP_200_OK,
    summary="Batch CSV ingestion with row-level preview and safe validation",
    description="Processes tabular CSV data across multiple destination metrics. Supports row-level previews (dry-run), deterministic verification, semantic metric resolution, duplicate detection, and partial-success persistence.",
)
async def batch_csv_ingest(
    request: Request,
    service: EvidenceIngestionService = Depends(get_ingestion_service),
    _auth_role: Any = Depends(require_official_or_admin),
) -> BatchAutoIngestResponse:
    try:
        content_type = request.headers.get("content-type", "").lower()
        file_bytes: Optional[bytes] = None
        filename: Optional[str] = None
        batch_request: Optional[BatchAutoIngestRequest] = None

        if "multipart/form-data" in content_type:
            form = None
            try:
                form = await request.form()
            except Exception as form_err:
                logger.warning("Multipart form parse fallback in batch CSV: %s", form_err)

            if form is not None:
                file_field = form.get("file")
                if file_field is not None and hasattr(file_field, "read"):
                    file_bytes = await file_field.read()
                    filename = getattr(file_field, "filename", "batch_data.csv")
                elif isinstance(file_field, str):
                    file_bytes = file_field.encode("utf-8")
                    filename = "batch_data.csv"

                dest_id_raw = form.get("destination_id")
                dest_id: Optional[int] = None
                if dest_id_raw is not None and str(dest_id_raw).strip() != "":
                    try:
                        dest_id = int(dest_id_raw)
                    except (ValueError, TypeError):
                        dest_id = None

                dry_run_raw = str(form.get("dry_run", "")).lower()
                dry_run = dry_run_raw in ["true", "1", "yes"]

                raw_csv = form.get("raw_csv_text")
                raw_csv_str = str(raw_csv) if raw_csv else None

                batch_request = BatchAutoIngestRequest(
                    raw_csv_text=raw_csv_str,
                    file_name=filename,
                    document_title=str(form.get("document_title") or filename or "Bulk CSV Telemetry Audit"),
                    source_organization=str(form.get("source_organization")) if form.get("source_organization") else None,
                    destination_id=dest_id,
                    dry_run=dry_run,
                )
            else:
                raw_body = await request.body()
                file_bytes = raw_body
                filename = "batch_data.csv"
                batch_request = BatchAutoIngestRequest(
                    raw_csv_text=None,
                    file_name=filename,
                    document_title="Bulk CSV Telemetry Audit",
                    source_organization=None,
                    destination_id=None,
                    dry_run=False,
                )
        else:
            body = await request.json()
            batch_request = BatchAutoIngestRequest(**body)

        response = await service.execute_batch_csv_ingestion(
            request=batch_request,
            file_bytes=file_bytes,
            filename=filename,
        )
        return response
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        logger.error("Batch CSV ingest exception: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch CSV ingestion failed: {str(e)}",
        )

