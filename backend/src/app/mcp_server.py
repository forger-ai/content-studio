from __future__ import annotations

from datetime import date as Date
from typing import Any

from fastapi import HTTPException
from sqlmodel import Session, select

from app.database import engine
from app.database_ext import init_app_db
from app.mcp_runtime import ToolError, ToolRegistry, main
from app.models import Post, PostCategory, VideoContent, utcnow
from app.routes.categories import create_category as create_category_route
from app.routes.categories import update_category as update_category_route
from app.routes.posts import create_post as create_post_route
from app.routes.posts import delete_post as delete_post_route
from app.routes.posts import get_post as get_post_route
from app.routes.posts import list_posts as list_posts_route
from app.routes.posts import update_post as update_post_route
from app.schemas import (
    CategoryBase,
    PostWrite,
    RewriteToneRequest,
    WeekPlanRequest,
    dates_for_week,
)

registry = ToolRegistry()


def _dump(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json")
    return value


def _tool_error(exc: HTTPException) -> ToolError:
    code = "not_found" if exc.status_code == 404 else "invalid_input"
    if exc.status_code == 409:
        code = "conflict"
    return ToolError(str(exc.detail), code=code)


def _parse_date(value: object, name: str) -> Date:
    if not isinstance(value, str):
        raise ToolError(f"{name} must be an ISO date", code="invalid_input")
    try:
        return Date.fromisoformat(value)
    except ValueError as exc:
        raise ToolError(f"{name} must be an ISO date", code="invalid_input") from exc


@registry.tool(
    "list_posts",
    (
        "List Content Studio posts, optionally filtered by start date, end date, "
        "medium, and category."
    ),
    {
        "type": "object",
        "properties": {
            "start": {"type": "string"},
            "end": {"type": "string"},
            "medium": {"type": "string"},
            "category_id": {"type": "string"},
        },
        "additionalProperties": False,
    },
)
def list_posts(args: dict[str, Any]) -> dict[str, Any]:
    init_app_db()
    start = _parse_date(args["start"], "start") if "start" in args else None
    end = _parse_date(args["end"], "end") if "end" in args else None
    with Session(engine) as session:
        posts = list_posts_route(
            start=start,
            end=end,
            medium=args.get("medium") if isinstance(args.get("medium"), str) else None,
            category_id=args.get("category_id")
            if isinstance(args.get("category_id"), str)
            else None,
            session=session,
        )
        return {"success": True, "posts": [_dump(post) for post in posts]}


@registry.tool(
    "get_post",
    "Get one Content Studio post with content detail and media.",
    {
        "type": "object",
        "properties": {"post_id": {"type": "string"}},
        "required": ["post_id"],
        "additionalProperties": False,
    },
)
def get_post(args: dict[str, Any]) -> dict[str, Any]:
    init_app_db()
    with Session(engine) as session:
        try:
            post = get_post_route(str(args["post_id"]), session)
        except HTTPException as exc:
            raise _tool_error(exc) from exc
        return {"success": True, "post": _dump(post)}


@registry.tool(
    "create_post",
    "Create one Content Studio post with image or video content.",
    {
        "type": "object",
        "properties": {
            "date": {"type": "string"},
            "name": {"type": "string"},
            "description": {"type": ["string", "null"]},
            "medium": {"type": "string"},
            "caption": {"type": ["string", "null"]},
            "content_kind": {"type": "string"},
            "category_id": {"type": ["string", "null"]},
            "image_content": {"type": ["object", "null"]},
            "video_content": {"type": ["object", "null"]},
            "media": {"type": "array"},
        },
        "required": ["date", "name"],
        "additionalProperties": False,
    },
)
def create_post(args: dict[str, Any]) -> dict[str, Any]:
    init_app_db()
    payload = PostWrite(**args)
    with Session(engine) as session:
        try:
            post = create_post_route(payload, session)
        except HTTPException as exc:
            raise _tool_error(exc) from exc
        return {"success": True, "post": _dump(post)}


@registry.tool(
    "update_post",
    "Update one Content Studio post. Send the full post payload.",
    {
        "type": "object",
        "properties": {
            "post_id": {"type": "string"},
            "date": {"type": "string"},
            "name": {"type": "string"},
            "description": {"type": ["string", "null"]},
            "medium": {"type": "string"},
            "caption": {"type": ["string", "null"]},
            "content_kind": {"type": "string"},
            "category_id": {"type": ["string", "null"]},
            "image_content": {"type": ["object", "null"]},
            "video_content": {"type": ["object", "null"]},
            "media": {"type": "array"},
        },
        "required": ["post_id", "date", "name"],
        "additionalProperties": False,
    },
)
def update_post(args: dict[str, Any]) -> dict[str, Any]:
    init_app_db()
    post_id = str(args.pop("post_id"))
    payload = PostWrite(**args)
    with Session(engine) as session:
        try:
            post = update_post_route(post_id, payload, session)
        except HTTPException as exc:
            raise _tool_error(exc) from exc
        return {"success": True, "post": _dump(post)}


@registry.tool(
    "delete_post",
    "Delete one Content Studio post.",
    {
        "type": "object",
        "properties": {"post_id": {"type": "string"}},
        "required": ["post_id"],
        "additionalProperties": False,
    },
)
def delete_post(args: dict[str, Any]) -> dict[str, Any]:
    init_app_db()
    with Session(engine) as session:
        try:
            return {"success": True, **delete_post_route(str(args["post_id"]), session)}
        except HTTPException as exc:
            raise _tool_error(exc) from exc


@registry.tool("list_categories", "List Content Studio post categories.")
def list_categories(_args: dict[str, Any]) -> dict[str, Any]:
    init_app_db()
    with Session(engine) as session:
        rows = session.exec(select(PostCategory).order_by(PostCategory.name)).all()
        return {"success": True, "categories": [_dump(row) for row in rows]}


@registry.tool(
    "create_category",
    "Create one Content Studio category with a calendar color.",
    {
        "type": "object",
        "properties": {"name": {"type": "string"}, "color": {"type": "string"}},
        "required": ["name"],
        "additionalProperties": False,
    },
)
def create_category(args: dict[str, Any]) -> dict[str, Any]:
    init_app_db()
    payload = CategoryBase(**args)
    with Session(engine) as session:
        try:
            category = create_category_route(payload, session)
        except HTTPException as exc:
            raise _tool_error(exc) from exc
        return {"success": True, "category": _dump(category)}


@registry.tool(
    "update_category",
    "Update one Content Studio category name and color.",
    {
        "type": "object",
        "properties": {
            "category_id": {"type": "string"},
            "name": {"type": "string"},
            "color": {"type": "string"},
        },
        "required": ["category_id", "name", "color"],
        "additionalProperties": False,
    },
)
def update_category(args: dict[str, Any]) -> dict[str, Any]:
    init_app_db()
    payload = CategoryBase(name=str(args["name"]), color=str(args["color"]))
    with Session(engine) as session:
        try:
            category = update_category_route(str(args["category_id"]), payload, session)
        except HTTPException as exc:
            raise _tool_error(exc) from exc
        return {"success": True, "category": _dump(category)}


@registry.tool(
    "plan_week_content",
    "Draft or create a weekly content plan from a topic, tone, mediums, and count.",
    {
        "type": "object",
        "properties": {
            "start_date": {"type": "string"},
            "topic": {"type": "string"},
            "tone": {"type": "string"},
            "mediums": {"type": "array", "items": {"type": "string"}},
            "count": {"type": "number", "minimum": 1, "maximum": 21},
            "create": {"type": "boolean"},
            "category_id": {"type": ["string", "null"]},
        },
        "required": ["start_date", "topic"],
        "additionalProperties": False,
    },
)
def plan_week_content(args: dict[str, Any]) -> dict[str, Any]:
    init_app_db()
    payload = WeekPlanRequest(**args)
    dates = dates_for_week(payload.start_date, payload.count)
    drafts = []
    for index, post_date in enumerate(dates):
        medium = payload.mediums[index % len(payload.mediums)]
        drafts.append(
            PostWrite(
                date=post_date,
                name=f"{payload.topic}: idea {index + 1}",
                description=f"Post planificado para {medium} con tono {payload.tone}.",
                medium=medium,
                caption=(
                    f"{payload.topic}. Enfoque {index + 1}: comparte una idea concreta "
                    f"con un tono {payload.tone}."
                ),
                content_kind="image",
                category_id=payload.category_id,
                image_content={
                    "visual_guidance": (
                        "Visual limpio, directo y facil de adaptar al canal."
                    ),
                    "carousel_guidance": (
                        "Usar una lamina por idea si el canal admite carrusel."
                    ),
                },
                media=[],
            )
        )
    if not payload.create:
        return {
            "success": True,
            "created": False,
            "drafts": [_dump(draft) for draft in drafts],
        }
    with Session(engine) as session:
        posts = []
        for draft in drafts:
            try:
                posts.append(create_post_route(draft, session))
            except HTTPException as exc:
                raise _tool_error(exc) from exc
        return {
            "success": True,
            "created": True,
            "posts": [_dump(post) for post in posts],
        }


@registry.tool(
    "rewrite_post_tone",
    (
        "Rewrite a post caption and video script toward a requested tone, "
        "optionally applying it."
    ),
    {
        "type": "object",
        "properties": {
            "post_id": {"type": "string"},
            "tone": {"type": "string"},
            "apply": {"type": "boolean"},
        },
        "required": ["post_id", "tone"],
        "additionalProperties": False,
    },
)
def rewrite_post_tone(args: dict[str, Any]) -> dict[str, Any]:
    init_app_db()
    request = RewriteToneRequest(
        tone=str(args["tone"]),
        apply=bool(args.get("apply", False)),
    )
    with Session(engine) as session:
        post = session.get(Post, str(args["post_id"]))
        if not post:
            raise ToolError("Post not found", code="not_found")
        original_caption = post.caption or post.description or post.name
        rewritten_caption = f"{original_caption}\n\nTono: {request.tone}."
        video = session.exec(
            select(VideoContent).where(VideoContent.post_id == post.id)
        ).first()
        rewritten_script = None
        if video and video.script:
            rewritten_script = f"{video.script}\n\nTono: {request.tone}."
        if request.apply:
            post.caption = rewritten_caption
            post.updated_at = utcnow()
            if video and rewritten_script:
                video.script = rewritten_script
                session.add(video)
            session.add(post)
            session.commit()
            session.refresh(post)
        return {
            "success": True,
            "applied": request.apply,
            "caption": rewritten_caption,
            "script": rewritten_script,
            "post": _dump(get_post_route(post.id, session)) if request.apply else None,
        }


if __name__ == "__main__":
    main(registry, server_name="content-studio")
