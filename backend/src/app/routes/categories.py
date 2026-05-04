from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select, update

from app.database import get_session
from app.models import Post, PostCategory, utcnow
from app.schemas import CategoryBase, CategoryRead

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryRead])
def list_categories(session: Session = Depends(get_session)) -> list[PostCategory]:
    return list(session.exec(select(PostCategory).order_by(PostCategory.name)).all())


@router.post("", response_model=CategoryRead)
def create_category(
    payload: CategoryBase, session: Session = Depends(get_session)
) -> PostCategory:
    category = PostCategory(name=payload.name.strip(), color=payload.color)
    session.add(category)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=409, detail="Category already exists") from exc
    session.refresh(category)
    return category


@router.put("/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: str, payload: CategoryBase, session: Session = Depends(get_session)
) -> PostCategory:
    category = session.get(PostCategory, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    category.name = payload.name.strip()
    category.color = payload.color
    category.updated_at = utcnow()
    session.add(category)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=409, detail="Category already exists") from exc
    session.refresh(category)
    return category


@router.delete("/{category_id}")
def delete_category(
    category_id: str, session: Session = Depends(get_session)
) -> dict[str, str]:
    category = session.get(PostCategory, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    session.exec(
        update(Post)
        .where(Post.category_id == category_id)
        .values(category_id=None, updated_at=utcnow())
    )
    session.delete(category)
    session.commit()
    return {"status": "deleted"}
