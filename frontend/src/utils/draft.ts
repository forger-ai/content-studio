import type { Post, PostPayload } from "../api/content";
import { isoDate } from "./date";

export type Draft = PostPayload;

export function emptyDraft(date = isoDate(new Date())): Draft {
  return {
    date,
    name: "",
    description: "",
    medium: "instagram",
    caption: "",
    content_kind: "image",
    category_id: null,
    image_content: { visual_guidance: "", carousel_guidance: "" },
    video_content: null,
    media: [],
  };
}

export function emptyVideoContent() {
  return {
    script: "",
    visual_guidance: "",
    hook: "",
    shot_list: "",
    duration_seconds: null,
    aspect_ratio: "",
    posted: false,
  };
}

export function postToDraft(post: Post): Draft {
  return {
    date: post.date,
    name: post.name,
    description: post.description ?? "",
    medium: post.medium,
    caption: post.caption ?? "",
    content_kind: post.content_kind,
    category_id: post.category_id ?? null,
    image_content: post.image_content ?? { visual_guidance: "", carousel_guidance: "" },
    video_content: post.video_content ?? emptyVideoContent(),
    media: post.media.map(({ id: _id, ...item }) => item),
  };
}

export function cleanDraft(draft: Draft): Draft {
  return {
    ...draft,
    name: draft.name.trim(),
    description: draft.description?.trim() || null,
    caption: draft.caption?.trim() || null,
    category_id: draft.category_id || null,
    image_content:
      draft.content_kind === "image"
        ? {
            visual_guidance: draft.image_content?.visual_guidance?.trim() || null,
            carousel_guidance: draft.image_content?.carousel_guidance?.trim() || null,
          }
        : null,
    video_content:
      draft.content_kind === "video"
        ? {
            script: draft.video_content?.script?.trim() || null,
            visual_guidance: draft.video_content?.visual_guidance?.trim() || null,
            hook: draft.video_content?.hook?.trim() || null,
            shot_list: draft.video_content?.shot_list?.trim() || null,
            duration_seconds: draft.video_content?.duration_seconds ?? null,
            aspect_ratio: draft.video_content?.aspect_ratio?.trim() || null,
            posted: draft.video_content?.posted ?? false,
          }
        : null,
    media: draft.media
      .filter((item) => item.ref.trim())
      .map((item, index) => ({
        kind: item.kind,
        ref: item.ref.trim(),
        description: item.description?.trim() || null,
        position: index,
        asset_id: item.asset_id ?? null,
        original_filename: item.original_filename ?? null,
        mime_type: item.mime_type ?? null,
        size_bytes: item.size_bytes ?? null,
        file_url: item.file_url ?? null,
      })),
  };
}
