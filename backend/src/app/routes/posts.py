from __future__ import annotations

from datetime import date as Date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, delete, select

from app.database import get_session
from app.models import (
    ImageContent,
    MediaAsset,
    Post,
    PostCategory,
    PostMedia,
    VideoContent,
    utcnow,
)
from app.routes.media import media_file_url
from app.schemas import (
    ImageContentRead,
    PostMediaRead,
    PostRead,
    PostSummary,
    PostWrite,
    VideoContentRead,
)

router = APIRouter(prefix="/api/posts", tags=["posts"])


def _category(session: Session, category_id: str | None) -> PostCategory | None:
    return session.get(PostCategory, category_id) if category_id else None


def _summary(session: Session, post: Post) -> PostSummary:
    category = _category(session, post.category_id)
    return PostSummary(
        id=post.id,
        date=post.date,
        name=post.name,
        description=post.description,
        medium=post.medium,  # type: ignore[arg-type]
        caption=post.caption,
        content_kind=post.content_kind,  # type: ignore[arg-type]
        category_id=post.category_id,
        category_name=category.name if category else None,
        category_color=category.color if category else None,
        created_at=post.created_at,
        updated_at=post.updated_at,
    )


def _media_reads(session: Session, post_id: str) -> list[PostMediaRead]:
    rows = session.exec(
        select(PostMedia)
        .where(PostMedia.post_id == post_id)
        .order_by(PostMedia.position)
    ).all()
    return [
        _media_read(session, row)
        for row in rows
    ]


def _media_read(session: Session, row: PostMedia) -> PostMediaRead:
    asset = session.get(MediaAsset, row.asset_id) if row.asset_id else None
    return PostMediaRead(
        id=row.id,
        kind=row.kind,  # type: ignore[arg-type]
        ref=row.ref,
        description=row.description,
        position=row.position,
        asset_id=row.asset_id,
        original_filename=asset.original_filename if asset else None,
        mime_type=asset.mime_type if asset else None,
        size_bytes=asset.size_bytes if asset else None,
        file_url=media_file_url(asset.id) if asset else None,
    )


def _read(session: Session, post: Post) -> PostRead:
    image = session.exec(
        select(ImageContent).where(ImageContent.post_id == post.id)
    ).first()
    video = session.exec(
        select(VideoContent).where(VideoContent.post_id == post.id)
    ).first()
    return PostRead(
        **_summary(session, post).model_dump(),
        image_content=ImageContentRead(
            id=image.id,
            visual_guidance=image.visual_guidance,
            carousel_guidance=image.carousel_guidance,
        )
        if image
        else None,
        video_content=VideoContentRead(
            id=video.id,
            script=video.script,
            visual_guidance=video.visual_guidance,
            hook=video.hook,
            shot_list=video.shot_list,
            duration_seconds=video.duration_seconds,
            aspect_ratio=video.aspect_ratio,
            posted=video.posted,
        )
        if video
        else None,
        media=_media_reads(session, post.id),
    )


def _validate_category(session: Session, category_id: str | None) -> None:
    if category_id and not session.get(PostCategory, category_id):
        raise HTTPException(status_code=404, detail="Category not found")


def _apply(post: Post, payload: PostWrite) -> None:
    post.date = payload.date
    post.name = payload.name.strip()
    post.description = payload.description
    post.medium = payload.medium
    post.caption = payload.caption
    post.content_kind = payload.content_kind
    post.category_id = payload.category_id
    post.updated_at = utcnow()


def _replace_detail(session: Session, post: Post, payload: PostWrite) -> None:
    session.exec(delete(ImageContent).where(ImageContent.post_id == post.id))
    session.exec(delete(VideoContent).where(VideoContent.post_id == post.id))
    session.exec(delete(PostMedia).where(PostMedia.post_id == post.id))
    if payload.content_kind == "image":
        content = payload.image_content.model_dump() if payload.image_content else {}
        session.add(ImageContent(post_id=post.id, **content))
    if payload.content_kind == "video":
        content = payload.video_content.model_dump() if payload.video_content else {}
        session.add(VideoContent(post_id=post.id, **content))
    for index, item in enumerate(payload.media):
        if item.asset_id and not session.get(MediaAsset, item.asset_id):
            raise HTTPException(status_code=404, detail="Media file not found")
        session.add(
            PostMedia(
                post_id=post.id,
                kind=item.kind,
                ref=item.ref.strip(),
                description=item.description,
                position=item.position if item.position is not None else index,
                asset_id=item.asset_id,
            )
        )


@router.get("", response_model=list[PostSummary])
def list_posts(
    start: Date | None = Query(default=None),
    end: Date | None = Query(default=None),
    medium: str | None = Query(default=None),
    category_id: str | None = Query(default=None),
    session: Session = Depends(get_session),
) -> list[PostSummary]:
    statement = select(Post).order_by(Post.date, Post.created_at)
    rows = session.exec(statement).all()
    filtered = []
    for post in rows:
        if start and post.date < start:
            continue
        if end and post.date > end:
            continue
        if medium and post.medium != medium:
            continue
        if category_id and post.category_id != category_id:
            continue
        filtered.append(_summary(session, post))
    return filtered


@router.post("", response_model=PostRead)
def create_post(
    payload: PostWrite,
    session: Session = Depends(get_session),
) -> PostRead:
    _validate_category(session, payload.category_id)
    post = Post(date=payload.date, name=payload.name.strip())
    _apply(post, payload)
    session.add(post)
    session.commit()
    session.refresh(post)
    _replace_detail(session, post, payload)
    session.commit()
    session.refresh(post)
    return _read(session, post)


@router.get("/{post_id}", response_model=PostRead)
def get_post(post_id: str, session: Session = Depends(get_session)) -> PostRead:
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return _read(session, post)


@router.put("/{post_id}", response_model=PostRead)
def update_post(
    post_id: str, payload: PostWrite, session: Session = Depends(get_session)
) -> PostRead:
    _validate_category(session, payload.category_id)
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    _apply(post, payload)
    _replace_detail(session, post, payload)
    session.add(post)
    session.commit()
    session.refresh(post)
    return _read(session, post)


@router.delete("/{post_id}")
def delete_post(
    post_id: str,
    session: Session = Depends(get_session),
) -> dict[str, str]:
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    session.exec(delete(ImageContent).where(ImageContent.post_id == post.id))
    session.exec(delete(VideoContent).where(VideoContent.post_id == post.id))
    session.exec(delete(PostMedia).where(PostMedia.post_id == post.id))
    session.delete(post)
    session.commit()
    return {"status": "deleted"}
