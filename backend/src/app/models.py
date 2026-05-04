from __future__ import annotations

from datetime import UTC, datetime
from datetime import date as Date
from typing import Literal
from uuid import uuid4

from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(UTC)


class PostCategory(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    name: str = Field(index=True, unique=True, min_length=1, max_length=80)
    color: str = Field(default="#2f6f8f", max_length=32)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


Medium = Literal[
    "linkedin",
    "instagram",
    "tiktok",
    "x",
    "facebook",
    "youtube",
    "blog",
    "email",
    "other",
]
ContentKind = Literal["image", "video"]
MediaKind = Literal["image", "video", "reference"]


class Post(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    date: Date = Field(index=True)
    name: str = Field(index=True, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=1200)
    medium: str = Field(default="instagram", index=True, max_length=40)
    caption: str | None = Field(default=None, max_length=5000)
    content_kind: str = Field(default="image", index=True, max_length=20)
    category_id: str | None = Field(default=None, foreign_key="postcategory.id")
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class ImageContent(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    post_id: str = Field(foreign_key="post.id", index=True, unique=True)
    visual_guidance: str | None = Field(default=None, max_length=4000)
    carousel_guidance: str | None = Field(default=None, max_length=4000)


class VideoContent(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    post_id: str = Field(foreign_key="post.id", index=True, unique=True)
    script: str | None = Field(default=None, max_length=10000)
    visual_guidance: str | None = Field(default=None, max_length=4000)
    hook: str | None = Field(default=None, max_length=500)
    shot_list: str | None = Field(default=None, max_length=4000)
    duration_seconds: int | None = Field(default=None, ge=1, le=86400)
    aspect_ratio: str | None = Field(default=None, max_length=40)
    posted: bool = Field(default=False, index=True)


class PostMedia(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    post_id: str = Field(foreign_key="post.id", index=True)
    kind: str = Field(default="image", max_length=40)
    ref: str = Field(min_length=1, max_length=1000)
    description: str | None = Field(default=None, max_length=1000)
    position: int = Field(default=0, ge=0)
    asset_id: str | None = Field(default=None, foreign_key="mediaasset.id", index=True)


class MediaAsset(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    stored_name: str = Field(index=True, unique=True, min_length=1, max_length=255)
    original_filename: str = Field(min_length=1, max_length=255)
    mime_type: str | None = Field(default=None, max_length=255)
    size_bytes: int = Field(default=0, ge=0)
    created_at: datetime = Field(default_factory=utcnow)
