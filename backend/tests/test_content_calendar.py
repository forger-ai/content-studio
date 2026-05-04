from __future__ import annotations

import importlib

from fastapi.testclient import TestClient


def test_post_crud_with_category_and_image_media(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'test.sqlite'}")
    import app.database as database
    import app.database_ext as database_ext
    import app.main as main

    importlib.reload(database)
    importlib.reload(database_ext)
    importlib.reload(main)

    with TestClient(main.create_app()) as client:
        category_response = client.post(
            "/api/categories", json={"name": "Campana", "color": "#b75d46"}
        )
        assert category_response.status_code == 200
        category = category_response.json()

        post_response = client.post(
            "/api/posts",
            json={
                "date": "2026-05-06",
                "name": "Lanzamiento",
                "description": "Anuncio de la semana",
                "medium": "linkedin",
                "caption": "Tenemos novedades.",
                "content_kind": "image",
                "category_id": category["id"],
                "image_content": {
                    "visual_guidance": "Usar fondo claro",
                    "carousel_guidance": "Tres laminas",
                },
                "media": [
                    {
                        "kind": "image",
                        "ref": "hero.png",
                        "description": "Imagen principal",
                        "position": 0,
                    },
                    {
                        "kind": "image",
                        "ref": "detail.png",
                        "description": "Detalle",
                        "position": 1,
                    },
                ],
            },
        )
        assert post_response.status_code == 200
        post = post_response.json()
        assert post["category_color"] == "#b75d46"
        assert post["image_content"]["carousel_guidance"] == "Tres laminas"
        assert len(post["media"]) == 2

        month_response = client.get("/api/posts?start=2026-05-01&end=2026-05-31")
        assert month_response.status_code == 200
        assert [row["name"] for row in month_response.json()] == ["Lanzamiento"]

        updated_response = client.put(
            f"/api/posts/{post['id']}",
            json={
                "date": "2026-05-07",
                "name": "Lanzamiento editado",
                "description": None,
                "medium": "tiktok",
                "caption": "Guion breve.",
                "content_kind": "video",
                "category_id": category["id"],
                "video_content": {
                    "script": "Intro, problema, cierre.",
                    "visual_guidance": "Plano cercano",
                    "hook": "Esto cambia tu semana",
                    "shot_list": "1. Hook 2. Demo 3. CTA",
                    "duration_seconds": 45,
                    "aspect_ratio": "9:16",
                    "posted": True,
                },
                "media": [],
            },
        )
        assert updated_response.status_code == 200
        updated = updated_response.json()
        assert updated["content_kind"] == "video"
        assert updated["video_content"]["hook"] == "Esto cambia tu semana"
        assert updated["video_content"]["posted"] is True
        assert updated["image_content"] is None

        delete_response = client.delete(f"/api/posts/{post['id']}")
        assert delete_response.status_code == 200
        assert client.get(f"/api/posts/{post['id']}").status_code == 404


def test_mcp_plan_and_rewrite(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'mcp.sqlite'}")
    import app.database as database
    import app.database_ext as database_ext
    import app.mcp_server as mcp_server

    importlib.reload(database)
    importlib.reload(database_ext)
    importlib.reload(mcp_server)

    planned = mcp_server.plan_week_content(
        {
            "start_date": "2026-05-04",
            "topic": "Educacion financiera",
            "tone": "simple",
            "mediums": ["linkedin", "instagram"],
            "count": 3,
            "create": True,
        }
    )
    assert planned["success"] is True
    assert len(planned["posts"]) == 3

    post_id = planned["posts"][0]["id"]
    rewritten = mcp_server.rewrite_post_tone(
        {"post_id": post_id, "tone": "mas directo", "apply": True}
    )
    assert rewritten["applied"] is True
    assert "mas directo" in rewritten["caption"]


def test_video_posted_migration(tmp_path, monkeypatch):
    db_path = tmp_path / "legacy.sqlite"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    import app.database as database
    import app.database_ext as database_ext

    importlib.reload(database)
    with database.engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE videocontent ("
            "id VARCHAR NOT NULL PRIMARY KEY, "
            "post_id VARCHAR NOT NULL, "
            "script VARCHAR, "
            "visual_guidance VARCHAR, "
            "hook VARCHAR, "
            "shot_list VARCHAR, "
            "duration_seconds INTEGER, "
            "aspect_ratio VARCHAR)"
        )
    importlib.reload(database_ext)
    database_ext.init_app_db()
    with database.engine.begin() as connection:
        rows = connection.exec_driver_sql("PRAGMA table_info(videocontent)").fetchall()
    assert "posted" in {row[1] for row in rows}


def test_media_file_upload_and_post_attachment(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'media.sqlite'}")
    monkeypatch.setenv("CONTENT_STUDIO_MEDIA_ROOT", str(tmp_path / "media"))
    import app.database as database
    import app.database_ext as database_ext
    import app.main as main

    importlib.reload(database)
    importlib.reload(database_ext)
    importlib.reload(main)

    with TestClient(main.create_app()) as client:
        upload_response = client.post(
            "/api/media/files",
            files={"files": ("hero.png", b"fake image bytes", "image/png")},
        )
        assert upload_response.status_code == 200
        uploaded = upload_response.json()[0]
        assert uploaded["kind"] == "image"
        assert uploaded["original_filename"] == "hero.png"
        assert uploaded["file_url"].startswith("/api/media/files/")

        post_response = client.post(
            "/api/posts",
            json={
                "date": "2026-05-08",
                "name": "Post con archivo",
                "medium": "instagram",
                "content_kind": "image",
                "media": [
                    {
                        "kind": uploaded["kind"],
                        "ref": uploaded["ref"],
                        "description": "Archivo adjunto",
                        "position": 0,
                        "asset_id": uploaded["asset_id"],
                    }
                ],
            },
        )
        assert post_response.status_code == 200
        media = post_response.json()["media"][0]
        assert media["asset_id"] == uploaded["asset_id"]
        assert media["file_url"] == uploaded["file_url"]
        assert media["size_bytes"] == len(b"fake image bytes")

        file_response = client.get(uploaded["file_url"])
        assert file_response.status_code == 200
        assert file_response.content == b"fake image bytes"


def test_postmedia_asset_migration(tmp_path, monkeypatch):
    db_path = tmp_path / "legacy-media.sqlite"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    import app.database as database
    import app.database_ext as database_ext

    importlib.reload(database)
    with database.engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE postmedia ("
            "id VARCHAR NOT NULL PRIMARY KEY, "
            "post_id VARCHAR NOT NULL, "
            "kind VARCHAR NOT NULL, "
            "ref VARCHAR NOT NULL, "
            "description VARCHAR, "
            "position INTEGER NOT NULL)"
        )
    importlib.reload(database_ext)
    database_ext.init_app_db()
    with database.engine.begin() as connection:
        rows = connection.exec_driver_sql("PRAGMA table_info(postmedia)").fetchall()
    assert "asset_id" in {row[1] for row in rows}
