import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Message, Chat } from "@shared/schema";
import ChatPanel from "@/components/ChatPanel";
import ResultsPanel from "@/components/ResultsPanel";
import { Database, Plus, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

export default function Home() {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentResults, setCurrentResults] = useState<{
    columns: string[];
    rows: Record<string, any>[];
    rowCount: number;
    executionTime: number;
    sqlQuery: string;
  } | null>(null);

  const { data: chatsData, isLoading: chatsLoading } = useQuery<{ chats: Chat[] }>({
    queryKey: ['/api/chats'],
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  const { data: messagesData } = useQuery<{ messages: Message[] }>({
    queryKey: ['/api/chats', activeChatId, 'messages'],
    enabled: !!activeChatId,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  const createChatMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/chats");
      return await response.json();
    },
    onSuccess: (newChat: Chat) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      setActiveChatId(newChat.id);
      setMessages([]);
      setCurrentResults(null);
    }
  });

  const deleteChatMutation = useMutation({
    mutationFn: async (chatId: string) => {
      await apiRequest("DELETE", `/api/chats/${chatId}`);
    },
    onSuccess: (_, deletedChatId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      if (activeChatId === deletedChatId) {
        setActiveChatId(null);
        setMessages([]);
        setCurrentResults(null);
      }
    }
  });

  useEffect(() => {
    if (chatsData?.chats && chatsData.chats.length > 0 && !activeChatId) {
      setActiveChatId(chatsData.chats[0].id);
    }
  }, [chatsData, activeChatId]);

  useEffect(() => {
    if (messagesData?.messages) {
      setMessages(messagesData.messages);
      
      const lastMessageWithResults = [...messagesData.messages]
        .reverse()
        .find(m => m.queryResults);
      
      if (lastMessageWithResults?.queryResults) {
        setCurrentResults({
          columns: lastMessageWithResults.queryResults.columns,
          rows: lastMessageWithResults.queryResults.rows,
          rowCount: lastMessageWithResults.queryResults.rowCount,
          executionTime: lastMessageWithResults.queryResults.executionTime,
          sqlQuery: lastMessageWithResults.sqlQuery || ""
        });
      } else {
        setCurrentResults(null);
      }
    }
  }, [messagesData]);

  const handleNewChat = () => {
    createChatMutation.mutate();
  };

  const handleSelectChat = (chatId: string) => {
    if (chatId !== activeChatId) {
      setActiveChatId(chatId);
      setCurrentResults(null);
    }
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    deleteChatMutation.mutate(chatId);
  };

  const chats = chatsData?.chats || [];

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-3 border-b">
          <Button
            onClick={handleNewChat}
            disabled={createChatMutation.isPending}
            className="w-full gap-2"
            data-testid="button-new-chat"
          >
            <Plus className="w-4 h-4" />
            Новый чат
          </Button>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {chatsLoading ? (
              <div className="text-sm text-muted-foreground p-2">Загрузка...</div>
            ) : chats.length === 0 ? (
              <div className="text-sm text-muted-foreground p-2">
                Нет чатов. Создайте новый.
              </div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleSelectChat(chat.id)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md cursor-pointer group hover-elevate",
                    activeChatId === chat.id 
                      ? "bg-accent text-accent-foreground" 
                      : "hover:bg-accent/50"
                  )}
                  data-testid={`chat-item-${chat.id}`}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm truncate flex-1">{chat.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    data-testid={`button-delete-chat-${chat.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-between px-6 h-16 border-b bg-card">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary">
              <Database className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">AI SQL Chat Bot</h1>
              <p className="text-xs text-muted-foreground">Преобразование текста в SQL запросы</p>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {activeChatId ? (
            <>
              <ChatPanel 
                chatId={activeChatId}
                messages={messages} 
                setMessages={setMessages}
                setCurrentResults={setCurrentResults}
              />
              
              <ResultsPanel 
                results={currentResults}
                messages={messages}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-lg font-medium mb-2">Выберите чат или создайте новый</h2>
                <Button onClick={handleNewChat} className="gap-2" data-testid="button-new-chat-empty">
                  <Plus className="w-4 h-4" />
                  Новый чат
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
