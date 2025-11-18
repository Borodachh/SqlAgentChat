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
      return await response.json();
    },
    onSuccess: (assistantMessage: Message) => {
      console.log("Received assistant message:", assistantMessage);
      setMessages(prev => {
        const withoutPending = prev.filter(m => m.id !== pendingIdRef.current);
        return [...withoutPending, assistantMessage];
      });

      if (assistantMessage.queryResults) {
        setCurrentResults({
          columns: assistantMessage.queryResults.columns,
          rows: assistantMessage.queryResults.rows,
          rowCount: assistantMessage.queryResults.rowCount,
          executionTime: assistantMessage.queryResults.executionTime,
          sqlQuery: assistantMessage.sqlQuery || ""
        });
      }

      if (assistantMessage.error) {
        toast({
          title: "Ошибка выполнения запроса",
          description: assistantMessage.error,
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
