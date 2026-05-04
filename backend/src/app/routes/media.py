from __future__ import annotations

import os
import re
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlmodel import Session

from app.database import get_session
from app.models import MediaAsset
from app.schemas import MediaKind, UploadedMediaRead

router = APIRouter(prefix="/api/media", tags=["media"])

_DEFAULT_MEDIA_ROOT = Path(__file__).resolve().parents[3] / "data" / "media"
_SAFE_CHARS = re.compile(r"[^A-Za-z0-9._-]+")


def _media_root() -> Path:
    raw = os.getenv("CONTENT_STUDIO_MEDIA_ROOT", "").strip()
    return Path(raw) if raw else _DEFAULT_MEDIA_ROOT


def _safe_filename(filename: str) -> str:
    name = Path(filename or "archivo").name.strip() or "archivo"
    safe = _SAFE_CHARS.sub("-", name).strip(".-")
    return safe[:180] or "archivo"


def _kind_for_mime(mime_type: str | None) -> MediaKind:
    if (mime_type or "").startswith("image/"):
        return "image"
    if (mime_type or "").startswith("video/"):
        return "video"
    return "reference"


def _file_url(asset_id: str) -> str:
    return f"/api/media/files/{asset_id}"


def media_file_url(asset_id: str | None) -> str | None:
    return _file_url(asset_id) if asset_id else None


@router.post("/files", response_model=list[UploadedMediaRead])
def upload_media_files(
    files: list[UploadFile] = File(...),
    session: Session = Depends(get_session),
) -> list[UploadedMediaRead]:
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
    media_root = _media_root()
    media_root.mkdir(parents=True, exist_ok=True)
    uploaded: list[UploadedMediaRead] = []
    for index, file in enumerate(files):
        original_filename = _safe_filename(file.filename or "archivo")
        stored_name = f"{uuid4().hex}-{original_filename}"
        destination = media_root / stored_name
        size = 0
        with destination.open("wb") as handle:
            while chunk := file.file.read(1024 * 1024):
                size += len(chunk)
                handle.write(chunk)
        asset = MediaAsset(
            stored_name=stored_name,
            original_filename=original_filename,
            mime_type=file.content_type,
            size_bytes=size,
        )
        session.add(asset)
        session.commit()
        session.refresh(asset)
        kind = _kind_for_mime(file.content_type)
        uploaded.append(
            UploadedMediaRead(
                asset_id=asset.id,
                kind=kind,
                ref=asset.original_filename,
                description=asset.original_filename,
                position=index,
                original_filename=asset.original_filename,
                mime_type=asset.mime_type,
                size_bytes=asset.size_bytes,
                file_url=_file_url(asset.id),
            )
        )
    return uploaded


@router.get("/files/{asset_id}")
def get_media_file(
    asset_id: str,
    session: Session = Depends(get_session),
) -> FileResponse:
    asset = session.get(MediaAsset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Media file not found")
    path = (_media_root() / asset.stored_name).resolve()
    root = _media_root().resolve()
    if root not in path.parents or not path.is_file():
        raise HTTPException(status_code=404, detail="Media file not found")
    return FileResponse(
        path,
        media_type=asset.mime_type,
        filename=asset.original_filename,
    )
