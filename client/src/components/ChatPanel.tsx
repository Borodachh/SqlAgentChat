import { useRef, useState, useEffect, Dispatch, SetStateAction } from "react";
import { Message } from "@shared/schema";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatPanelProps {
  chatId: string;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setCurrentResults: (results: any) => void;
  selectedMessageId: string | null;
  setSelectedMessageId: (id: string | null) => void;
  onMessageSelect: (message: Message) => void;
}

export default function ChatPanel({ chatId, messages, setMessages, setCurrentResults, selectedMessageId, setSelectedMessageId, onMessageSelect }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [suggestionToSend, setSuggestionToSend] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col w-96 border-r bg-card">
      <div className="px-6 py-4 border-b">
        <h2 className="text-base font-semibold text-card-foreground">Чат с AI агентом</h2>
        <p className="text-xs text-muted-foreground mt-1">Задавайте вопросы на естественном языке</p>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div ref={scrollRef} className="py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 px-4">
              <div className="text-center space-y-3 max-w-sm">
                <p className="text-sm font-medium text-muted-foreground">
                  Начните разговор
                </p>
                <p className="text-xs text-muted-foreground">
                  Попробуйте спросить:
                </p>
                <div className="space-y-2 text-xs text-left">
                  {["Покажи всех сотрудников", "Какие продукты стоят дороже 1000?", "Сколько всего продаж в этом месяце?"].map((suggestion, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-md bg-muted/50 text-muted-foreground hover-elevate cursor-pointer"
                      onClick={() => setSuggestionToSend(suggestion)}
                      data-testid={`chip-suggestion-${i}`}
                    >
                      "{suggestion}"
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isSelected={message.id === selectedMessageId}
                onSelect={onMessageSelect}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <div className="border-t">
        <ChatInput 
          chatId={chatId}
          messages={messages} 
          setMessages={setMessages}
          setCurrentResults={setCurrentResults}
          setSelectedMessageId={setSelectedMessageId}
          externalMessage={suggestionToSend}
          onExternalMessageConsumed={() => setSuggestionToSend(null)}
        />
      </div>
    </div>
  );
}
