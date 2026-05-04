import { DeleteOutline, Forum } from "@mui/icons-material";
import {
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useI18n } from "../../i18n";

export function PlannerHistoryList({
  rows,
  selectedId,
  onSelect,
  onDelete,
}: {
  rows: ForgerConversation[];
  selectedId?: string;
  onSelect: (row: ForgerConversation) => void;
  onDelete: (row: ForgerConversation) => void;
}) {
  const t = useI18n();
  return (
    <Stack spacing={1.5}>
      <Typography variant="h6" fontWeight={800}>
        {t.planner.history}
      </Typography>
      <List disablePadding>
        {rows.map((row) => (
          <ListItemButton
            key={row.conversationId}
            selected={row.conversationId === selectedId}
            onClick={() => onSelect(row)}
            sx={{ borderRadius: 1 }}
          >
            <ListItemIcon>
              <Forum />
            </ListItemIcon>
            <ListItemText
              primary={row.title}
              secondary={new Date(row.updatedAt).toLocaleString()}
              primaryTypographyProps={{ noWrap: true }}
            />
            <Tooltip title={t.planner.deleteChat}>
              <IconButton
                edge="end"
                size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(row);
                }}
              >
                <DeleteOutline fontSize="small" />
              </IconButton>
            </Tooltip>
          </ListItemButton>
        ))}
      </List>
    </Stack>
  );
}
