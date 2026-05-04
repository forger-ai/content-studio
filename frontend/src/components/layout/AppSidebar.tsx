import { CalendarMonth, DeleteOutline, Forum } from "@mui/icons-material";
import {
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { Category } from "../../api/content";
import { useI18n } from "../../i18n";
import type { View } from "../../types";

export function AppSidebar({
  view,
  categories,
  newCategory,
  onViewChange,
  onCategoryDraftChange,
  onNewCategoryChange,
  onCreateCategory,
  onSaveCategory,
  onRemoveCategory,
}: {
  view: View;
  categories: Category[];
  newCategory: { name: string; color: string };
  onViewChange: (view: View) => void;
  onCategoryDraftChange: (categories: Category[]) => void;
  onNewCategoryChange: (value: { name: string; color: string }) => void;
  onCreateCategory: () => void;
  onSaveCategory: (category: Category) => void;
  onRemoveCategory: (category: Category) => void;
}) {
  const t = useI18n();
  return (
    <Box
      component="aside"
      sx={{
        width: 248,
        borderRight: "1px solid #d7edf3",
        bgcolor: "#ffffff",
        p: 2,
        display: { xs: "none", md: "block" },
      }}
    >
      <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
        {t.app.title}
      </Typography>
      <List dense>
        <ListItemButton selected={view === "calendar"} onClick={() => onViewChange("calendar")}>
          <ListItemIcon>
            <CalendarMonth />
          </ListItemIcon>
          <ListItemText primary={t.nav.calendar} />
        </ListItemButton>
        <ListItemButton selected={view === "planner"} onClick={() => onViewChange("planner")}>
          <ListItemIcon>
            <Forum />
          </ListItemIcon>
          <ListItemText primary={t.nav.planner} />
        </ListItemButton>
      </List>
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {t.nav.categories}
      </Typography>
      <Stack spacing={1}>
        {categories.map((category) => (
          <Stack key={category.id} direction="row" spacing={0.75} alignItems="center">
            <TextField
              size="small"
              value={category.name}
              onChange={(event) =>
                onCategoryDraftChange(
                  categories.map((item) =>
                    item.id === category.id ? { ...item, name: event.target.value } : item,
                  ),
                )
              }
              onBlur={(event) => onSaveCategory({ ...category, name: event.target.value })}
            />
            <TextField
              size="small"
              type="color"
              value={category.color}
              onChange={(event) => {
                const color = event.target.value;
                onCategoryDraftChange(
                  categories.map((item) => (item.id === category.id ? { ...item, color } : item)),
                );
                onSaveCategory({ ...category, color });
              }}
              sx={{ width: 50 }}
            />
            <Tooltip title={t.nav.deleteCategory}>
              <IconButton size="small" onClick={() => onRemoveCategory(category)}>
                <DeleteOutline fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Stack>
        ))}
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            label={t.nav.newCategory}
            value={newCategory.name}
            onChange={(event) => onNewCategoryChange({ ...newCategory, name: event.target.value })}
          />
          <TextField
            size="small"
            type="color"
            value={newCategory.color}
            onChange={(event) => onNewCategoryChange({ ...newCategory, color: event.target.value })}
            sx={{ width: 56 }}
          />
        </Stack>
        <Button size="small" variant="outlined" onClick={onCreateCategory}>
          {t.nav.createCategory}
        </Button>
      </Stack>
    </Box>
  );
}
