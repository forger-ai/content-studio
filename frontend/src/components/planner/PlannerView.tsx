import { useEffect, useRef, useState } from "react";
import { AddComment, ContentCopy, Forum, Send } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Drawer,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { Category, PostSummary } from "../../api/content";
import { primaryDark, userBubble } from "../../constants";
import { useI18n } from "../../i18n";
import { MarkdownMessage } from "../common/MarkdownMessage";
import { PlannerHistoryList } from "./PlannerHistoryList";

const defaultAgent: ForgerAgent = {
  id: "content-strategist",
  title: "Content Strategist",
  description: "Planifica calendarios de contenido, tonos, canales y estructura de posts.",
  initialPrompt:
    "Actúa como un planificador de contenido y estratega de marketing para Content Studio. Ayuda al usuario a convertir ideas en un calendario accionable de posts, con fechas, canales, categorías, captions, estructura visual y guiones cuando corresponda. Prioriza claridad, consistencia de tono y planificación semanal práctica. Usa las herramientas MCP de la app para revisar, crear o editar posts cuando el usuario lo pida. Antes de hacer cambios grandes, resume brevemente la propuesta y confirma si hay riesgo de borrar o reemplazar contenido existente.",
};

function normalizeProgressMessage(text: string) {
  return text
    .replace(/^Codex esta /, "El agente esta ")
    .replace(/^Codex está /, "El agente esta ");
}

export function PlannerView({
  posts,
  categories,
}: {
  posts: PostSummary[];
  categories: Category[];
}) {
  const t = useI18n();
  const [agent, setAgent] = useState<ForgerAgent>(defaultAgent);
  const [conversation, setConversation] = useState<ForgerConversation | null>(null);
  const [conversationRows, setConversationRows] = useState<ForgerConversation[]>([]);
  const [message, setMessage] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [plannerError, setPlannerError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    if (!window.forgerApp) return;
    let unsubscribe: (() => void) | undefined;
    void window.forgerApp.getContext().then((context) => {
      const resolvedAgent =
        context.agents?.find((candidate) => candidate.id === defaultAgent.id) ?? defaultAgent;
      setAgent(resolvedAgent);
    });
    void window.forgerApp.listCodexConversations().then((rows) => {
      setConversationRows(rows);
      const existing = rows.find((row) => row.title === defaultAgent.title) ?? rows[0] ?? null;
      setConversation(existing);
    });
    unsubscribe = window.forgerApp.onCodexConversationEvent((event) => {
      if (event.type === "conversation.deleted") {
        setConversationRows((current) =>
          current.filter((row) => row.conversationId !== event.conversation.conversationId),
        );
        setConversation((current) =>
          current?.conversationId === event.conversation.conversationId ? null : current,
        );
        return;
      }
      setConversation(event.conversation);
      setConversationRows((current) => {
        const next = current.filter((row) => row.conversationId !== event.conversation.conversationId);
        return [event.conversation, ...next].sort((left, right) =>
          right.updatedAt.localeCompare(left.updatedAt),
        );
      });
    });
    return () => unsubscribe?.();
  }, []);

  const activeRun = conversation?.activeRun;
  const isRunning = activeRun?.status === "queued" || activeRun?.status === "running";
  const latestProgress = activeRun?.progressLog?.slice(-1)[0];
  const progressMessage = latestProgress
      ? normalizeProgressMessage(latestProgress)
      : isRunning
      ? t.planner.thinking
      : "";

  useEffect(() => {
    if (!stickToBottomRef.current || !scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation?.messages.length, progressMessage]);

  async function ensureConversation() {
    if (conversation) return conversation;
    if (!window.forgerApp) throw new Error(t.errors.plannerUnavailable);
    const created = await window.forgerApp.createCodexConversation({
      title: agent.title,
      agentId: agent.id,
      metadata: { agentId: agent.id },
    });
    setConversation(created);
    setConversationRows((current) => [created, ...current]);
    return created;
  }

  function handleScroll() {
    const element = scrollRef.current;
    if (!element) return;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 80;
  }

  async function sendMessage() {
    const trimmed = message.trim();
    if (!trimmed || isRunning) return;
    setPlannerError(null);
    try {
      const target = await ensureConversation();
      setMessage("");
      const next = await window.forgerApp?.sendCodexConversationMessage({
        conversationId: target.conversationId,
        message: trimmed,
        context: [
          t.planner.visiblePosts(posts.length),
          t.planner.categoriesContext(categories.map((category) => category.name).join(", ")),
        ].join("\n"),
      });
      if (next) setConversation(next);
    } catch (err) {
      setPlannerError(err instanceof Error ? err.message : t.errors.plannerSend);
    }
  }

  async function createNewChat() {
    if (!window.forgerApp || isRunning) return;
    setPlannerError(null);
    try {
      const created = await window.forgerApp.createCodexConversation({
        title: agent.title,
        agentId: agent.id,
        metadata: { agentId: agent.id },
      });
      setConversation(created);
      setConversationRows((current) => [created, ...current]);
      stickToBottomRef.current = true;
    } catch (err) {
      setPlannerError(err instanceof Error ? err.message : t.errors.plannerNewChat);
    }
  }

  async function deleteConversation(row: ForgerConversation) {
    if (!window.forgerApp || !window.confirm(t.confirm.deleteChat)) return;
    setPlannerError(null);
    try {
      const result = await window.forgerApp.deleteCodexConversation(row.conversationId);
      if (!result.success) throw new Error(t.errors.plannerDeleteChat);
      setConversationRows((current) => {
        const next = current.filter((item) => item.conversationId !== row.conversationId);
        if (conversation?.conversationId === row.conversationId) {
          setConversation(next[0] ?? null);
        }
        return next;
      });
    } catch (err) {
      setPlannerError(err instanceof Error ? err.message : t.errors.plannerDeleteChat);
    }
  }

  async function copyMarkdown(item: ForgerConversationMessage) {
    await navigator.clipboard.writeText(item.text);
    setCopiedMessageId(item.messageId);
    window.setTimeout(() => setCopiedMessageId(null), 1200);
  }

  return (
    <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0, height: "100%" }}>
      <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1}>
        <Button startIcon={<Forum />} onClick={() => setHistoryOpen((open) => !open)}>
          {t.planner.history}
        </Button>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, display: "flex", gap: 2, alignItems: "stretch" }}>
        <Stack
          sx={{
            flex: 1,
            minHeight: 0,
            flexDirection: "column",
            gap: 1.5,
            overflow: "hidden",
          }}
        >
          <Stack spacing={0.35} sx={{ maxWidth: 980, width: "100%", mx: "auto", flex: "0 0 auto" }}>
            <Typography variant="h4" fontWeight={800}>
              {t.planner.title}
            </Typography>
            <Typography color="text.secondary">{agent.description}</Typography>
          </Stack>
          {plannerError && <Alert severity="error">{plannerError}</Alert>}
          <Box
            ref={scrollRef}
            onScroll={handleScroll}
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              px: { xs: 0, md: 1 },
              py: 1,
            }}
          >
            <Stack spacing={1.5} sx={{ maxWidth: 980, width: "100%", mx: "auto", minHeight: "100%" }}>
              {!window.forgerApp ? (
                <Alert severity="info">
                  {t.planner.unavailable}
                </Alert>
              ) : !conversation || conversation.messages.length === 0 ? (
                <Box
                  sx={{
                    minHeight: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                  }}
                >
                  <Typography color="text.secondary" sx={{ maxWidth: 520 }}>
                    {t.planner.empty}
                  </Typography>
                </Box>
              ) : (
                conversation.messages.map((item) => (
                  <MessageBlock
                    key={item.messageId}
                    item={item}
                    copied={copiedMessageId === item.messageId}
                    onCopy={() => void copyMarkdown(item)}
                  />
                ))
              )}
            </Stack>
          </Box>
          {isRunning ? (
            <Stack
              key={progressMessage}
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{
                maxWidth: 980,
                width: "100%",
                mx: "auto",
                color: "text.secondary",
                animation: "statusFade 220ms ease",
                "@keyframes statusFade": {
                  from: { opacity: 0, transform: "translateX(10px)" },
                  to: { opacity: 1, transform: "translateX(0)" },
                },
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: primaryDark,
                  animation: "thinkingPulse 900ms ease-in-out infinite",
                  "@keyframes thinkingPulse": {
                    "0%, 100%": { opacity: 0.35, transform: "scale(0.85)" },
                    "50%": { opacity: 1, transform: "scale(1.15)" },
                  },
                }}
              />
              <Typography variant="caption">{progressMessage}</Typography>
            </Stack>
          ) : null}
          <Stack spacing={1} sx={{ maxWidth: 980, width: "100%", mx: "auto" }}>
            <TextField
              placeholder={t.planner.placeholder}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              multiline
              maxRows={4}
              fullWidth
            />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Button
                size="small"
                startIcon={<AddComment />}
                disabled={isRunning || !window.forgerApp}
                onClick={() => void createNewChat()}
              >
                {t.planner.newChat}
              </Button>
              <Button
                size="small"
                variant="contained"
                endIcon={<Send />}
                disabled={isRunning || !message.trim() || !window.forgerApp}
                onClick={() => void sendMessage()}
                sx={{ minWidth: 96 }}
              >
                {t.planner.send}
              </Button>
            </Stack>
          </Stack>
        </Stack>
        <Box
          sx={{
            width: historyOpen ? { xs: 0, lg: 340 } : 0,
            minWidth: historyOpen ? { xs: 0, lg: 340 } : 0,
            overflow: "hidden",
            transition: "width 180ms ease, min-width 180ms ease",
            display: { xs: "none", lg: "block" },
          }}
        >
          <Paper sx={{ height: "100%", p: 2, overflowY: "auto" }}>
            <PlannerHistoryList
              rows={conversationRows}
              selectedId={conversation?.conversationId}
              onSelect={(row) => {
                setConversation(row);
                stickToBottomRef.current = true;
              }}
              onDelete={(row) => void deleteConversation(row)}
            />
          </Paper>
        </Box>
      </Box>
      <Drawer
        anchor="right"
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        ModalProps={{ keepMounted: true }}
        PaperProps={{ sx: { width: { xs: "84vw", sm: 360 }, p: 2 } }}
        sx={{ display: { xs: "block", lg: "none" } }}
      >
        <PlannerHistoryList
          rows={conversationRows}
          selectedId={conversation?.conversationId}
          onSelect={(row) => {
            setConversation(row);
            setHistoryOpen(false);
            stickToBottomRef.current = true;
          }}
          onDelete={(row) => void deleteConversation(row)}
        />
      </Drawer>
    </Stack>
  );
}

function MessageBlock({
  item,
  copied,
  onCopy,
}: {
  item: ForgerConversationMessage;
  copied: boolean;
  onCopy: () => void;
}) {
  const t = useI18n();
  const isUser = item.role === "user";
  return (
    <Stack
      spacing={0.25}
      sx={{
        alignSelf: isUser ? "flex-end" : "stretch",
        maxWidth: isUser ? "78%" : "100%",
        alignItems: isUser ? "flex-end" : "flex-start",
      }}
    >
      <Box
        sx={{
          width: "100%",
          ...(isUser
            ? {
                p: 1.5,
                borderRadius: 2,
                bgcolor: userBubble,
                color: "#10252b",
              }
            : { color: "text.primary" }),
        }}
      >
        <MarkdownMessage text={item.text} />
      </Box>
      <Tooltip title={copied ? t.planner.copied : t.planner.copyMarkdown}>
        <IconButton
          size="small"
          aria-label={copied ? t.planner.copied : t.planner.copyMarkdown}
          onClick={onCopy}
          sx={{ width: 24, height: 24 }}
        >
          <ContentCopy sx={{ fontSize: 14 }} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
