import { API_BASE_URL, del, get, post, request } from "./client";

export const MEDIUM_OPTIONS = [
  "linkedin",
  "instagram",
  "tiktok",
  "x",
  "facebook",
  "youtube",
  "blog",
  "email",
  "other",
] as const;

export type Medium = (typeof MEDIUM_OPTIONS)[number];
export type ContentKind = "image" | "video";
export type MediaKind = "image" | "video" | "reference";

export type Category = {
  id: string;
  name: string;
  color: string;
};

export type ImageContent = {
  id?: string;
  visual_guidance?: string | null;
  carousel_guidance?: string | null;
};

export type VideoContent = {
  id?: string;
  script?: string | null;
  visual_guidance?: string | null;
  hook?: string | null;
  shot_list?: string | null;
  duration_seconds?: number | null;
  aspect_ratio?: string | null;
  posted: boolean;
};

export type PostMedia = {
  id?: string;
  kind: MediaKind;
  ref: string;
  description?: string | null;
  position: number;
  asset_id?: string | null;
  original_filename?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  file_url?: string | null;
};

export type PostSummary = {
  id: string;
  date: string;
  name: string;
  description?: string | null;
  medium: Medium;
  caption?: string | null;
  content_kind: ContentKind;
  category_id?: string | null;
  category_name?: string | null;
  category_color?: string | null;
  created_at: string;
  updated_at: string;
};

export type Post = PostSummary & {
  image_content?: ImageContent | null;
  video_content?: VideoContent | null;
  media: PostMedia[];
};

export type PostPayload = {
  date: string;
  name: string;
  description?: string | null;
  medium: Medium;
  caption?: string | null;
  content_kind: ContentKind;
  category_id?: string | null;
  image_content?: ImageContent | null;
  video_content?: VideoContent | null;
  media: PostMedia[];
};

export function listPosts(params: {
  start?: string;
  end?: string;
  medium?: string;
  category_id?: string;
}) {
  const query = new URLSearchParams();
  if (params.start) query.set("start", params.start);
  if (params.end) query.set("end", params.end);
  if (params.medium) query.set("medium", params.medium);
  if (params.category_id) query.set("category_id", params.category_id);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return get<PostSummary[]>(`/api/posts${suffix}`);
}

export function getPost(id: string) {
  return get<Post>(`/api/posts/${id}`);
}

export function createPost(payload: PostPayload) {
  return post<Post>("/api/posts", payload);
}

export function updatePost(id: string, payload: PostPayload) {
  return request<Post>(`/api/posts/${id}`, { method: "PUT", body: payload });
}

export function deletePost(id: string) {
  return del<{ status: string }>(`/api/posts/${id}`);
}

export function listCategories() {
  return get<Category[]>("/api/categories");
}

export function createCategory(payload: { name: string; color: string }) {
  return post<Category>("/api/categories", payload);
}

export function updateCategory(id: string, payload: { name: string; color: string }) {
  return request<Category>(`/api/categories/${id}`, { method: "PUT", body: payload });
}

export function deleteCategory(id: string) {
  return del<{ status: string }>(`/api/categories/${id}`);
}

export function uploadMediaFiles(files: File[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  return post<PostMedia[]>("/api/media/files", formData);
}

export function mediaFileHref(media: PostMedia) {
  if (!media.file_url) return null;
  return `${API_BASE_URL}${media.file_url}`;
}
