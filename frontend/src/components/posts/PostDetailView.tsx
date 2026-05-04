import { ArrowBack, CalendarMonth, DeleteOutline, Edit } from "@mui/icons-material";
import { Box, Button, Chip, Divider, Paper, Stack, Typography } from "@mui/material";
import type { MediaKind, Post, PostMedia } from "../../api/content";
import { mediaFileHref } from "../../api/content";
import { useI18n, useLocale } from "../../i18n";
import { MarkdownMessage } from "../common/MarkdownMessage";
import { MediumIcon } from "../common/MediumIcon";

export function PostDetailView({
  post,
  saving,
  onBack,
  onEdit,
  onDelete,
}: {
  post: Post;
  saving: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useI18n();
  const locale = useLocale();
  const dateLabel = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CL", {
    dateStyle: "medium",
  }).format(new Date(`${post.date}T00:00:00`));
  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Button startIcon={<ArrowBack />} onClick={onBack}>
          {t.common.back}
        </Button>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<Edit />} variant="outlined" onClick={onEdit}>
            {t.common.edit}
          </Button>
          <Button
            startIcon={<DeleteOutline />}
            color="error"
            variant="outlined"
            disabled={saving}
            onClick={onDelete}
          >
            {t.common.delete}
          </Button>
        </Stack>
      </Stack>
      <Paper sx={{ p: 3, flex: 1, minHeight: 0, overflowY: "auto" }}>
        <Stack spacing={2}>
          <Typography variant="h4" fontWeight={800}>
            {post.name}
          </Typography>
          <Stack spacing={1}>
            {post.category_name && (
              <Chip
                label={post.category_name}
                size="small"
                sx={{
                  alignSelf: "flex-start",
                  bgcolor: post.category_color,
                  color: "#fff",
                  fontWeight: 700,
                }}
              />
            )}
            {post.description && <Typography color="text.secondary">{post.description}</Typography>}
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Stack direction="row" spacing={0.75} alignItems="center">
                <CalendarMonth fontSize="small" color="action" />
                <Typography variant="body2">{dateLabel}</Typography>
              </Stack>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <MediumIcon medium={post.medium} size={18} />
                <Typography variant="body2">{t.mediums[post.medium]}</Typography>
              </Stack>
            </Stack>
          </Stack>
          <Divider />
          <Typography variant="subtitle1" fontWeight={800}>
            {t.postDetail.caption}
          </Typography>
          {post.caption ? (
            <MarkdownMessage text={post.caption} />
          ) : (
            <Typography color="text.secondary">{t.postDetail.noCaption}</Typography>
          )}
          {post.content_kind === "image" && (
            <>
              <Typography variant="subtitle1" fontWeight={800}>
                {t.postDetail.image}
              </Typography>
              <Typography whiteSpace="pre-wrap">
                {post.image_content?.visual_guidance || t.postDetail.noVisualGuidance}
              </Typography>
              <Typography whiteSpace="pre-wrap" color="text.secondary">
                {post.image_content?.carousel_guidance || t.postDetail.noCarouselGuidance}
              </Typography>
            </>
          )}
          {post.content_kind === "video" && (
            <>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle1" fontWeight={800}>
                  {t.postDetail.video}
                </Typography>
                <Chip
                  size="small"
                  color={post.video_content?.posted ? "success" : "default"}
                  label={post.video_content?.posted ? t.postDetail.published : t.postDetail.pending}
                />
              </Stack>
              <Typography fontWeight={700}>{post.video_content?.hook}</Typography>
              <Typography variant="subtitle2" fontWeight={800}>
                {t.postDetail.textScript}
              </Typography>
              {post.video_content?.script ? (
                <MarkdownMessage text={post.video_content.script} />
              ) : (
                <Typography color="text.secondary">{t.postDetail.noTextScript}</Typography>
              )}
              <Typography whiteSpace="pre-wrap" color="text.secondary">
                {post.video_content?.visual_guidance}
              </Typography>
              <Typography whiteSpace="pre-wrap" color="text.secondary">
                {post.video_content?.shot_list}
              </Typography>
            </>
          )}
          <Divider />
          <Typography variant="subtitle1" fontWeight={800}>
            {t.postDetail.media}
          </Typography>
          {post.media.length === 0 ? (
            <Typography color="text.secondary">{t.postDetail.noMedia}</Typography>
          ) : (
            <Stack spacing={1}>
              {post.media.map((item) => (
                <MediaCard key={item.id ?? item.ref} item={item} />
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}

function MediaCard({ item }: { item: PostMedia }) {
  const t = useI18n();
  const href = mediaFileHref(item);
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" spacing={1.5} justifyContent="space-between" alignItems="center">
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={700} noWrap>
            {item.original_filename || item.ref}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t.mediaKinds[item.kind as MediaKind]} ·{" "}
            {item.description || t.common.noDescription}
          </Typography>
          {item.asset_id && (
            <Typography variant="caption" color="text.secondary">
              {t.postDetail.attachedFile}
              {item.size_bytes ? ` · ${Math.round(item.size_bytes / 1024)} KB` : ""}
            </Typography>
          )}
        </Box>
        {href && (
          <Button href={href} target="_blank" rel="noreferrer" variant="outlined">
            {t.common.open}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
