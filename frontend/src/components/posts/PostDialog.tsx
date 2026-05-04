import { Add, AttachFile, DeleteOutline, Save } from "@mui/icons-material";
import { useRef, useState } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { Category, ContentKind, Medium, PostMedia } from "../../api/content";
import { MEDIUM_OPTIONS } from "../../api/content";
import { useI18n } from "../../i18n";
import type { Draft } from "../../utils/draft";
import { emptyVideoContent } from "../../utils/draft";

export function PostDialog({
  open,
  draft,
  categories,
  editing,
  saving,
  onClose,
  onSave,
  onChange,
  onUpdateMedia,
  onUploadMedia,
  onRemoveMedia,
}: {
  open: boolean;
  draft: Draft;
  categories: Category[];
  editing: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (draft: Draft) => void;
  onUpdateMedia: (index: number, patch: Partial<PostMedia>) => void;
  onUploadMedia: (files: File[]) => Promise<void>;
  onRemoveMedia: (index: number) => void;
}) {
  const t = useI18n();
  function setKind(contentKind: ContentKind) {
    onChange({
      ...draft,
      content_kind: contentKind,
      image_content:
        contentKind === "image"
          ? draft.image_content ?? { visual_guidance: "", carousel_guidance: "" }
          : null,
      video_content: contentKind === "video" ? draft.video_content ?? emptyVideoContent() : null,
    });
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{editing ? t.postDialog.editTitle : t.postDialog.createTitle}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <BaseFields draft={draft} categories={categories} onChange={onChange} />
          <FormControl fullWidth>
            <InputLabel>{t.postDialog.contentKind}</InputLabel>
            <Select
              label={t.postDialog.contentKind}
              value={draft.content_kind}
              onChange={(event) => setKind(event.target.value as ContentKind)}
            >
              <MenuItem value="image">{t.postDialog.image}</MenuItem>
              <MenuItem value="video">{t.postDialog.video}</MenuItem>
            </Select>
          </FormControl>
          {draft.content_kind === "image" && <ImageContentFields draft={draft} onChange={onChange} />}
          {draft.content_kind === "video" && <VideoContentFields draft={draft} onChange={onChange} />}
          <MediaFields
            draft={draft}
            onChange={onChange}
            onUpdateMedia={onUpdateMedia}
            onUploadMedia={onUploadMedia}
            onRemoveMedia={onRemoveMedia}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t.common.cancel}</Button>
        <Button startIcon={<Save />} variant="contained" disabled={saving} onClick={onSave}>
          {t.common.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function BaseFields({
  draft,
  categories,
  onChange,
}: {
  draft: Draft;
  categories: Category[];
  onChange: (draft: Draft) => void;
}) {
  const t = useI18n();
  return (
    <>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label={t.postDialog.date}
          type="date"
          value={draft.date}
          onChange={(event) => onChange({ ...draft, date: event.target.value })}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
        <FormControl fullWidth>
          <InputLabel>{t.postDialog.medium}</InputLabel>
          <Select
            label={t.postDialog.medium}
            value={draft.medium}
            onChange={(event) => onChange({ ...draft, medium: event.target.value as Medium })}
          >
            {MEDIUM_OPTIONS.map((medium) => (
              <MenuItem key={medium} value={medium}>
                {t.mediums[medium]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>{t.postDialog.category}</InputLabel>
          <Select
            label={t.postDialog.category}
            value={draft.category_id ?? ""}
            onChange={(event) => onChange({ ...draft, category_id: event.target.value })}
          >
            <MenuItem value="">{t.common.noCategory}</MenuItem>
            {categories.map((category) => (
              <MenuItem key={category.id} value={category.id}>
                {category.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      <TextField
        label={t.postDialog.name}
        value={draft.name}
        onChange={(event) => onChange({ ...draft, name: event.target.value })}
        fullWidth
      />
      <TextField
        label={t.postDialog.description}
        value={draft.description ?? ""}
        onChange={(event) => onChange({ ...draft, description: event.target.value })}
        multiline
        minRows={2}
        fullWidth
      />
      <TextField
        label={t.postDialog.caption}
        value={draft.caption ?? ""}
        onChange={(event) => onChange({ ...draft, caption: event.target.value })}
        multiline
        minRows={4}
        fullWidth
      />
    </>
  );
}

function ImageContentFields({ draft, onChange }: { draft: Draft; onChange: (draft: Draft) => void }) {
  const t = useI18n();
  return (
    <Stack spacing={2}>
      <TextField
        label={t.postDialog.visualGuidance}
        value={draft.image_content?.visual_guidance ?? ""}
        onChange={(event) =>
          onChange({
            ...draft,
            image_content: { ...draft.image_content, visual_guidance: event.target.value },
          })
        }
        multiline
        minRows={3}
      />
      <TextField
        label={t.postDialog.carouselGuidance}
        value={draft.image_content?.carousel_guidance ?? ""}
        onChange={(event) =>
          onChange({
            ...draft,
            image_content: { ...draft.image_content, carousel_guidance: event.target.value },
          })
        }
        multiline
        minRows={2}
      />
    </Stack>
  );
}

function VideoContentFields({ draft, onChange }: { draft: Draft; onChange: (draft: Draft) => void }) {
  const t = useI18n();
  return (
    <Stack spacing={2}>
      <FormControlLabel
        control={
          <Checkbox
            checked={draft.video_content?.posted ?? false}
            onChange={(event) =>
              onChange({
                ...draft,
                video_content: { ...(draft.video_content ?? emptyVideoContent()), posted: event.target.checked },
              })
            }
          />
        }
        label={t.postDialog.posted}
      />
      <TextField
        label={t.postDialog.hook}
        value={draft.video_content?.hook ?? ""}
        onChange={(event) =>
          onChange({ ...draft, video_content: { ...(draft.video_content ?? emptyVideoContent()), hook: event.target.value } })
        }
      />
      <TextField
        label={t.postDialog.script}
        helperText={t.postDialog.scriptHint}
        value={draft.video_content?.script ?? ""}
        onChange={(event) =>
          onChange({ ...draft, video_content: { ...(draft.video_content ?? emptyVideoContent()), script: event.target.value } })
        }
        multiline
        minRows={4}
      />
      <TextField
        label={t.postDialog.visualGuidance}
        value={draft.video_content?.visual_guidance ?? ""}
        onChange={(event) =>
          onChange({
            ...draft,
            video_content: { ...(draft.video_content ?? emptyVideoContent()), visual_guidance: event.target.value },
          })
        }
        multiline
        minRows={2}
      />
      <TextField
        label={t.postDialog.shotList}
        value={draft.video_content?.shot_list ?? ""}
        onChange={(event) =>
          onChange({
            ...draft,
            video_content: { ...(draft.video_content ?? emptyVideoContent()), shot_list: event.target.value },
          })
        }
        multiline
        minRows={2}
      />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label={t.postDialog.durationSeconds}
          type="number"
          value={draft.video_content?.duration_seconds ?? ""}
          onChange={(event) =>
            onChange({
              ...draft,
              video_content: {
                ...(draft.video_content ?? emptyVideoContent()),
                duration_seconds: event.target.value ? Number(event.target.value) : null,
              },
            })
          }
          fullWidth
        />
        <TextField
          label={t.postDialog.aspectRatio}
          value={draft.video_content?.aspect_ratio ?? ""}
          onChange={(event) =>
            onChange({
              ...draft,
              video_content: { ...(draft.video_content ?? emptyVideoContent()), aspect_ratio: event.target.value },
            })
          }
          fullWidth
        />
      </Stack>
    </Stack>
  );
}

function MediaFields({
  draft,
  onChange,
  onUpdateMedia,
  onUploadMedia,
  onRemoveMedia,
}: {
  draft: Draft;
  onChange: (draft: Draft) => void;
  onUpdateMedia: (index: number, patch: Partial<PostMedia>) => void;
  onUploadMedia: (files: File[]) => Promise<void>;
  onRemoveMedia: (index: number) => void;
}) {
  const t = useI18n();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    const selected = Array.from(files ?? []);
    if (!selected.length) return;
    setUploading(true);
    try {
      await onUploadMedia(selected);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <Divider />
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" fontWeight={800}>
          {t.postDialog.media}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            startIcon={<AttachFile />}
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? t.postDialog.uploading : t.postDialog.attachFiles}
          </Button>
          <Button
            size="small"
            startIcon={<Add />}
            onClick={() =>
              onChange({
                ...draft,
                media: [
                  ...draft.media,
                  {
                    kind: draft.content_kind === "video" ? "video" : "image",
                    ref: "",
                    description: "",
                    position: draft.media.length,
                  },
                ],
              })
            }
          >
            {t.postDialog.addMedia}
          </Button>
        </Stack>
      </Stack>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(event) => void handleFiles(event.target.files)}
      />
      {draft.media.map((item, index) => (
        <Stack key={index} direction={{ xs: "column", sm: "row" }} spacing={1}>
          <FormControl sx={{ minWidth: 130 }}>
            <InputLabel>{t.postDialog.type}</InputLabel>
            <Select
              label={t.postDialog.type}
              value={item.kind}
              onChange={(event) => onUpdateMedia(index, { kind: event.target.value as PostMedia["kind"] })}
            >
              <MenuItem value="image">{t.mediaKinds.image}</MenuItem>
              <MenuItem value="video">{t.mediaKinds.video}</MenuItem>
              <MenuItem value="reference">{t.mediaKinds.reference}</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label={t.postDialog.reference}
            value={item.ref}
            onChange={(event) => onUpdateMedia(index, { ref: event.target.value })}
            fullWidth
          />
          <TextField
            label={t.postDialog.description}
            value={item.description ?? ""}
            onChange={(event) => onUpdateMedia(index, { description: event.target.value })}
            fullWidth
          />
          <Button
            aria-label={t.postDialog.removeMedia}
            color="inherit"
            onClick={() => onRemoveMedia(index)}
            sx={{ minWidth: 44 }}
          >
            <DeleteOutline />
          </Button>
        </Stack>
      ))}
    </>
  );
}
