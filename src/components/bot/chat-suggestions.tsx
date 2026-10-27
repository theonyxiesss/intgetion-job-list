"use client";

import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from "@assistant-ui/react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export function ChatSuggestions({
  messages,
  prompts,
  isRunning,
  onSelect,
}: {
  messages: ChatMessage[];
  prompts: { id: string; text: string }[];
  isRunning: boolean;
  onSelect: (text: string) => void;
}) {
  const runtime = useExternalStoreRuntime<ChatMessage>({
    messages,
    convertMessage: (message): ThreadMessageLike => ({
      id: message.id,
      role: message.role,
      content: [{ type: "text", text: message.text }],
    }),
    isRunning,
    onNew: async (message: AppendMessage) => {
      const prompt = message.content.find((part) => part.type === "text");
      if (prompt?.type === "text" && prompt.text.trim()) onSelect(prompt.text);
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex w-full flex-col gap-2">
        {prompts.map((prompt) => (
          <ThreadPrimitive.Suggestion
            key={prompt.id}
            prompt={prompt.text}
            send
            className="min-h-11 rounded-full border border-line px-5 text-left text-fg transition-colors duration-150 hover:bg-surface-2 disabled:opacity-50"
          >
            {prompt.text}
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </AssistantRuntimeProvider>
  );
}
