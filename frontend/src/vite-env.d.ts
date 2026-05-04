/// <reference types="vite/client" />

type ForgerAgent = {
  id: string;
  title: string;
  description?: string;
  initialPrompt: string;
};

type ForgerAppContext = {
  locale?: string;
  agents?: ForgerAgent[];
};

type ForgerConversationMessage = {
  messageId: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
};

type ForgerConversationRun = {
  runId: string;
  status: "queued" | "running" | "completed" | "failed" | "canceled";
  error?: string;
  progressLog?: string[];
};

type ForgerConversation = {
  conversationId: string;
  appId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ForgerConversationMessage[];
  activeRun?: ForgerConversationRun;
};

type ForgerConversationEvent = {
  type: string;
  conversation: ForgerConversation;
  run?: ForgerConversationRun;
  message?: ForgerConversationMessage;
  progress?: string;
};

interface Window {
  forgerApp?: {
    getContext: () => Promise<ForgerAppContext>;
    createCodexConversation: (input?: {
      title?: string;
      agentId?: string;
      metadata?: Record<string, string | number | boolean | null>;
    }) => Promise<ForgerConversation>;
    sendCodexConversationMessage: (input: {
      conversationId: string;
      message: string;
      context?: string;
    }) => Promise<ForgerConversation>;
    listCodexConversations: () => Promise<ForgerConversation[]>;
    deleteCodexConversation: (conversationId: string) => Promise<{ success: boolean }>;
    onCodexConversationEvent: (
      listener: (event: ForgerConversationEvent) => void,
    ) => () => void;
  };
}
