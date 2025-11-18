import { useState, KeyboardEvent, Dispatch, SetStateAction, useRef } from "react";
import { Message } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatInputProps {
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setCurrentResults: (results: any) => void;
}

export default function ChatInput({ messages, setMessages, setCurrentResults }: ChatInputProps) {
  const [input, setInput] = useState("");
  const { toast } = useToast();
  const pendingIdRef = useRef<string>("");

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat", { message });
      return response;
    },
    onSuccess: (data) => {
      setMessages(prev => {
        const withoutPending = prev.filter(m => m.id !== pendingIdRef.current);
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: data.response,
          sqlQuery: data.sqlQuery,
          queryResults: data.queryResults,
          timestamp: Date.now(),
          error: data.error
        };
        return [...withoutPending, assistantMessage];
      });

      if (data.queryResults) {
        setCurrentResults({
          columns: data.queryResults.columns,
          rows: data.queryResults.rows,
          rowCount: data.queryResults.rowCount,
          executionTime: data.queryResults.executionTime,
          sqlQuery: data.sqlQuery
        });
      }

      if (data.error) {
        toast({
          title: "Ошибка выполнения запроса",
          description: data.error,
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      setMessages(prev => prev.filter(m => m.id !== pendingIdRef.current));
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось отправить сообщение",
        variant: "destructive"
      });
    }
  });

  const handleSend = async () => {
    if (!input.trim() || sendMessageMutation.isPending) return;

    const messageContent = input.trim();
    const timestamp = Date.now();
    const userMessage: Message = {
      id: `msg-${timestamp}-user`,
      role: "user",
      content: messageContent,
      timestamp
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");

    const pendingId = `msg-${timestamp}-pending`;
    pendingIdRef.current = pendingId;
    const pendingMessage: Message = {
      id: pendingId,
      role: "assistant",
      content: "Генерирую SQL запрос...",
      timestamp: timestamp + 1
    };
    setMessages(prev => [...prev, pendingMessage]);

    await sendMessageMutation.mutateAsync(messageContent);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4">
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Задайте вопрос о данных..."
          className="resize-none min-h-[60px] text-sm"
          disabled={sendMessageMutation.isPending}
          data-testid="input-chat-message"
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || sendMessageMutation.isPending}
          size="icon"
          className="h-[60px] w-12"
          data-testid="button-send-message"
        >
          {sendMessageMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Enter для отправки, Shift+Enter для новой строки
      </p>
    </div>
  );
}
