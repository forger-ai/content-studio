import { Add, ChevronLeft, ChevronRight } from "@mui/icons-material";
import { Box, Button, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import type { PostSummary } from "../../api/content";
import { primary, primaryDark } from "../../constants";
import { useI18n } from "../../i18n";
import { isoDate } from "../../utils/date";
import { MediumIcon } from "../common/MediumIcon";

export function CalendarView({
  days,
  month,
  postsByDay,
  loading,
  monthLabel,
  onChangeMonth,
  onCreate,
  onOpen,
  onMove,
}: {
  days: Date[];
  month: Date;
  postsByDay: Map<string, PostSummary[]>;
  loading: boolean;
  monthLabel: string;
  onChangeMonth: (delta: number) => void;
  onCreate: (date?: string) => void;
  onOpen: (id: string) => void;
  onMove: (postId: string, date: string) => void;
}) {
  const t = useI18n();
  return (
    <Stack spacing={2} sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Tooltip title={t.calendar.previousMonth}>
            <IconButton onClick={() => onChangeMonth(-1)}>
              <ChevronLeft />
            </IconButton>
          </Tooltip>
          <Typography variant="h5" fontWeight={800} sx={{ textTransform: "capitalize" }}>
            {monthLabel}
          </Typography>
          <Tooltip title={t.calendar.nextMonth}>
            <IconButton onClick={() => onChangeMonth(1)}>
              <ChevronRight />
            </IconButton>
          </Tooltip>
        </Stack>
        <Button startIcon={<Add />} variant="contained" onClick={() => onCreate()}>
          {t.common.create}
        </Button>
      </Stack>
      {loading ? (
        <Paper sx={{ p: 4, textAlign: "center", flex: 1, minHeight: 0 }}>
          {t.calendar.loading}
        </Paper>
      ) : (
        <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex" }}>
          <CalendarGrid
            days={days}
            month={month}
            postsByDay={postsByDay}
            onCreate={onCreate}
            onOpen={onOpen}
            onMove={onMove}
          />
        </Box>
      )}
    </Stack>
  );
}

function CalendarGrid({
  days,
  month,
  postsByDay,
  onCreate,
  onOpen,
  onMove,
}: {
  days: Date[];
  month: Date;
  postsByDay: Map<string, PostSummary[]>;
  onCreate: (date: string) => void;
  onOpen: (id: string) => void;
  onMove: (postId: string, date: string) => void;
}) {
  const t = useI18n();
  const today = isoDate(new Date());
  return (
    <Paper
      sx={{
        width: "100%",
        maxHeight: "100%",
        alignSelf: "flex-start",
        overflow: "auto",
        border: "1px solid #cceaf2",
        borderRadius: 1,
        bgcolor: "#fff",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          bgcolor: "#dff4f9",
          position: "sticky",
          top: 0,
          zIndex: 2,
        }}
      >
        {t.calendar.weekdays.map((day) => (
          <Box key={day} sx={{ p: 1, fontWeight: 800, fontSize: 13 }}>
            {day}
          </Box>
        ))}
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
        {days.map((day, index) => {
          const key = isoDate(day);
          const dayPosts = postsByDay.get(key) ?? [];
          const outside = day.getMonth() !== month.getMonth();
          const isToday = key === today;
          const isLastColumn = index % 7 === 6;
          const isLastRow = index >= days.length - 7;
          return (
            <Box
              key={key}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const postId = event.dataTransfer.getData("text/content-studio-post-id");
                if (postId) onMove(postId, key);
              }}
              sx={{
                minHeight: 118,
                p: 1,
                borderTop: "1px solid #d5edf3",
                borderRight: isLastColumn ? "none" : "1px solid #d5edf3",
                borderBottom: isLastRow ? "none" : "1px solid #d5edf3",
                bgcolor: isToday ? "#e0f7fc" : outside ? "#f8fbfb" : "#fff",
                boxShadow: isToday ? `inset 0 0 0 2px ${primary}` : "none",
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography
                  variant="caption"
                  sx={{
                    color: outside ? "text.disabled" : "text.primary",
                    fontWeight: isToday ? 900 : 500,
                    bgcolor: isToday ? primary : "transparent",
                    px: isToday ? 0.75 : 0,
                    borderRadius: 10,
                  }}
                >
                  {day.getDate()}
                </Typography>
                <Tooltip title={t.calendar.createPost}>
                  <IconButton size="small" onClick={() => onCreate(key)}>
                    <Add fontSize="inherit" />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                {dayPosts.map((post) => (
                  <Button
                    key={post.id}
                    size="small"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/content-studio-post-id", post.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => onOpen(post.id)}
                    sx={{
                      minHeight: 34,
                      justifyContent: "flex-start",
                      alignItems: "flex-start",
                      gap: 0.75,
                      px: 1,
                      py: 0.5,
                      color: "#fff",
                      bgcolor: post.category_color ?? primaryDark,
                      textTransform: "none",
                      fontSize: 12,
                      lineHeight: 1.2,
                      "&:hover": { bgcolor: post.category_color ?? "#287f96" },
                    }}
                  >
                    <MediumIcon medium={post.medium} />
                    <Box
                      component="span"
                      sx={{
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                        overflow: "hidden",
                        textAlign: "left",
                        whiteSpace: "normal",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {post.name}
                    </Box>
                  </Button>
                ))}
              </Stack>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}
