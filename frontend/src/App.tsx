import { useEffect, useMemo, useState } from "react";
import { Alert, Box } from "@mui/material";
import type { Category, Post, PostMedia, PostSummary } from "./api/content";
import {
  createCategory,
  createPost,
  deleteCategory,
  deletePost,
  getPost,
  listCategories,
  listPosts,
  updateCategory,
  updatePost,
  uploadMediaFiles,
} from "./api/content";
import { CalendarView } from "./components/calendar/CalendarView";
import { AppSidebar } from "./components/layout/AppSidebar";
import { PlannerView } from "./components/planner/PlannerView";
import { PostDetailView } from "./components/posts/PostDetailView";
import { PostDialog } from "./components/posts/PostDialog";
import { appBackground, categoryColors } from "./constants";
import { useI18n, useLocale } from "./i18n";
import type { View } from "./types";
import { calendarDays, monthBounds } from "./utils/date";
import type { Draft } from "./utils/draft";
import { cleanDraft, emptyDraft, postToDraft } from "./utils/draft";

export default function App() {
  const t = useI18n();
  const locale = useLocale();
  const [view, setView] = useState<View>("calendar");
  const [month, setMonth] = useState(() => new Date());
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ name: "", color: categoryColors[0] });

  const bounds = useMemo(() => monthBounds(month), [month]);
  const days = useMemo(() => calendarDays(month), [month]);
  const postsByDay = useMemo(() => {
    const grouped = new Map<string, PostSummary[]>();
    for (const post of posts) {
      grouped.set(post.date, [...(grouped.get(post.date) ?? []), post]);
    }
    return grouped;
  }, [posts]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [postRows, categoryRows] = await Promise.all([
        listPosts(bounds),
        listCategories(),
      ]);
      setPosts(postRows);
      setCategories(categoryRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.loadCalendar);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds.start, bounds.end]);

  function openCreate(date?: string) {
    setEditingId(null);
    setDraft(emptyDraft(date));
    setModalOpen(true);
  }

  async function openDetail(id: string) {
    setError(null);
    try {
      const post = await getPost(id);
      setSelectedPost(post);
      setView("detail");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.openPost);
    }
  }

  function openEdit(post: Post) {
    setEditingId(post.id);
    setDraft(postToDraft(post));
    setModalOpen(true);
  }

  async function saveDraft() {
    if (!draft.name.trim()) {
      setError(t.errors.postNameRequired);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = cleanDraft(draft);
      const saved = editingId ? await updatePost(editingId, payload) : await createPost(payload);
      await loadAll();
      setSelectedPost(saved);
      setModalOpen(false);
      setView("detail");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.savePost);
    } finally {
      setSaving(false);
    }
  }

  async function movePostToDate(postId: string, date: string) {
    setError(null);
    try {
      const post = await getPost(postId);
      await updatePost(postId, cleanDraft({ ...postToDraft(post), date }));
      await loadAll();
      if (selectedPost?.id === postId) {
        setSelectedPost(await getPost(postId));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.movePost);
    }
  }

  async function removeSelectedPost() {
    if (!selectedPost || !window.confirm(t.confirm.deletePost)) return;
    setSaving(true);
    try {
      await deletePost(selectedPost.id);
      setSelectedPost(null);
      setView("calendar");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.deletePost);
    } finally {
      setSaving(false);
    }
  }

  async function addCategory() {
    if (!newCategory.name.trim()) return;
    try {
      await createCategory({ name: newCategory.name.trim(), color: newCategory.color });
      setNewCategory({
        name: "",
        color: categoryColors[(categories.length + 1) % categoryColors.length],
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.createCategory);
    }
  }

  async function saveCategory(category: Category) {
    try {
      await updateCategory(category.id, { name: category.name.trim(), color: category.color });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.updateCategory);
    }
  }

  async function removeCategory(category: Category) {
    if (!window.confirm(t.confirm.deleteCategory(category.name))) return;
    try {
      await deleteCategory(category.id);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.deleteCategory);
    }
  }

  function changeMonth(delta: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  function updateMedia(index: number, patch: Partial<PostMedia>) {
    setDraft((current) => ({
      ...current,
      media: current.media.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  async function attachMediaFiles(files: File[]) {
    if (!files.length) return;
    try {
      const uploaded = await uploadMediaFiles(files);
      setDraft((current) => ({
        ...current,
        media: [
          ...current.media,
          ...uploaded.map((item, index) => ({
            ...item,
            position: current.media.length + index,
          })),
        ],
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.uploadMedia);
    }
  }

  function removeMedia(index: number) {
    setDraft((current) => ({
      ...current,
      media: current.media.filter((_item, itemIndex) => itemIndex !== index),
    }));
  }

  const monthLabel = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CL", {
    month: "long",
    year: "numeric",
  }).format(month);

  return (
    <Box sx={{ height: "100vh", display: "flex", bgcolor: appBackground, overflow: "hidden" }}>
      <AppSidebar
        view={view}
        categories={categories}
        newCategory={newCategory}
        onViewChange={setView}
        onCategoryDraftChange={setCategories}
        onNewCategoryChange={setNewCategory}
        onCreateCategory={addCategory}
        onSaveCategory={(category) => void saveCategory(category)}
        onRemoveCategory={(category) => void removeCategory(category)}
      />
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          p: { xs: 2, md: 3 },
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {view === "planner" && <PlannerView posts={posts} categories={categories} />}
        {view === "detail" && selectedPost && (
          <PostDetailView
            post={selectedPost}
            saving={saving}
            onBack={() => setView("calendar")}
            onEdit={() => openEdit(selectedPost)}
            onDelete={removeSelectedPost}
          />
        )}
        {view === "calendar" && (
          <CalendarView
            days={days}
            month={month}
            postsByDay={postsByDay}
            loading={loading}
            monthLabel={monthLabel}
            onChangeMonth={changeMonth}
            onCreate={openCreate}
            onOpen={openDetail}
            onMove={movePostToDate}
          />
        )}
      </Box>
      <PostDialog
        open={modalOpen}
        draft={draft}
        categories={categories}
        editing={Boolean(editingId)}
        saving={saving}
        onClose={() => setModalOpen(false)}
        onSave={saveDraft}
        onChange={setDraft}
        onUpdateMedia={updateMedia}
        onUploadMedia={(files) => attachMediaFiles(files)}
        onRemoveMedia={removeMedia}
      />
    </Box>
  );
}
