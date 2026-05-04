from __future__ import annotations

from datetime import date as Date
from datetime import datetime, timedelta
from typing import Literal

from pydantic import BaseModel, Field

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


class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    color: str = Field(default="#2f6f8f", max_length=32)


class CategoryRead(CategoryBase):
    id: str


class ImageContentWrite(BaseModel):
    visual_guidance: str | None = Field(default=None, max_length=4000)
    carousel_guidance: str | None = Field(default=None, max_length=4000)


class ImageContentRead(ImageContentWrite):
    id: str


class VideoContentWrite(BaseModel):
    script: str | None = Field(default=None, max_length=10000)
    visual_guidance: str | None = Field(default=None, max_length=4000)
    hook: str | None = Field(default=None, max_length=500)
    shot_list: str | None = Field(default=None, max_length=4000)
    duration_seconds: int | None = Field(default=None, ge=1, le=86400)
    aspect_ratio: str | None = Field(default=None, max_length=40)
    posted: bool = False


class VideoContentRead(VideoContentWrite):
    id: str


class PostMediaWrite(BaseModel):
    kind: MediaKind = "image"
    ref: str = Field(min_length=1, max_length=1000)
    description: str | None = Field(default=None, max_length=1000)
    position: int = Field(default=0, ge=0)
    asset_id: str | None = None


class PostMediaRead(PostMediaWrite):
    id: str
    original_filename: str | None = None
    mime_type: str | None = None
    size_bytes: int | None = None
    file_url: str | None = None


class UploadedMediaRead(BaseModel):
    asset_id: str
    kind: MediaKind
    ref: str
    description: str | None
    position: int = 0
    original_filename: str
    mime_type: str | None
    size_bytes: int
    file_url: str


class PostWrite(BaseModel):
    date: Date
    name: str = Field(min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=1200)
    medium: Medium = "instagram"
    caption: str | None = Field(default=None, max_length=5000)
    content_kind: ContentKind = "image"
    category_id: str | None = None
    image_content: ImageContentWrite | None = None
    video_content: VideoContentWrite | None = None
    media: list[PostMediaWrite] = Field(default_factory=list)


class PostSummary(BaseModel):
    id: str
    date: Date
    name: str
    description: str | None
    medium: Medium
    caption: str | None
    content_kind: ContentKind
    category_id: str | None
    category_name: str | None
    category_color: str | None
    created_at: datetime
    updated_at: datetime


class PostRead(PostSummary):
    image_content: ImageContentRead | None
    video_content: VideoContentRead | None
    media: list[PostMediaRead]


class WeekPlanRequest(BaseModel):
    start_date: Date
    topic: str = Field(min_length=1, max_length=300)
    tone: str = Field(default="claro y cercano", max_length=160)
    mediums: list[Medium] = Field(default_factory=lambda: ["linkedin", "instagram"])
    count: int = Field(default=5, ge=1, le=21)
    create: bool = True
    category_id: str | None = None


class RewriteToneRequest(BaseModel):
    tone: str = Field(min_length=1, max_length=160)
    apply: bool = False


def dates_for_week(start_date: Date, count: int) -> list[Date]:
    return [start_date + timedelta(days=index) for index in range(count)]
