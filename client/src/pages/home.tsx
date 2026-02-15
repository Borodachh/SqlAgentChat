import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Message, Chat } from "@shared/schema";
import ChatPanel from "@/components/ChatPanel";
import ResultsPanel from "@/components/ResultsPanel";
import { Database, Plus, MessageSquare, Trash2, Table2, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
}

interface TableInfo {
  name: string;
  columns: TableColumn[];
}

function DatabaseTablesDialog() {
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const { data: tablesData, isLoading, isError, error, refetch } = useQuery<{ tables: TableInfo[] }>({
    queryKey: ['/api/tables'],
    enabled: false,
  });

  const toggleTable = (tableName: string) => {
    setExpandedTables(prev => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  };

  const tables = tablesData?.tables || [];

  return (
    <Dialog onOpenChange={(open) => { if (open) refetch(); }}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          data-testid="button-show-tables"
        >
          <Table2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Таблицы базы данных
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8" data-testid="tables-loading">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="text-sm text-destructive py-4 text-center" data-testid="tables-error">
              Ошибка загрузки: {(error as any)?.message || "Не удалось получить список таблиц"}
            </div>
          ) : tables.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center" data-testid="tables-empty">
              Таблицы не найдены
            </div>
          ) : (
            <div className="space-y-1" data-testid="tables-list">
              {tables.map((table) => (
                <div key={table.name}>
                  <button
                    onClick={() => toggleTable(table.name)}
                    className="flex items-center gap-2 w-full p-2 rounded-md text-left hover-elevate"
                    data-testid={`table-item-${table.name}`}
                  >
                    {expandedTables.has(table.name) ? (
                      <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                    )}
                    <Table2 className="w-4 h-4 flex-shrink-0 text-primary" />
                    <span className="text-sm font-medium flex-1">{table.name}</span>
                    <Badge variant="secondary" className="text-xs no-default-hover-elevate">
                      {table.columns.length}
                    </Badge>
                  </button>
                  {expandedTables.has(table.name) && (
                    <div className="ml-10 mb-2 space-y-0.5" data-testid={`table-columns-${table.name}`}>
                      {table.columns.map((col) => (
                        <div
                          key={col.name}
                          className="flex items-center gap-2 py-1 px-2 text-xs"
                          data-testid={`column-${table.name}-${col.name}`}
                        >
                          <span className="text-foreground font-mono">{col.name}</span>
                          <span className="text-muted-foreground">{col.type}</span>
                          {col.nullable && (
                            <span className="text-muted-foreground/60 italic">null</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default function Home() {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
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
      setSelectedMessageId(null);
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
        setSelectedMessageId(null);
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
      
      if (selectedMessageId) {
        const selectedExists = messagesData.messages.find(m => m.id === selectedMessageId);
        if (!selectedExists) {
          setSelectedMessageId(null);
          setCurrentResults(null);
        }
      }
      
      if (!selectedMessageId) {
        const lastMessageWithResults = [...messagesData.messages]
          .reverse()
          .find(m => m.queryResults);
        
        if (lastMessageWithResults?.queryResults) {
          setSelectedMessageId(lastMessageWithResults.id);
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
    }
  }, [messagesData]);

  const handleNewChat = () => {
    createChatMutation.mutate();
  };

  const handleSelectChat = (chatId: string) => {
    if (chatId !== activeChatId) {
      setActiveChatId(chatId);
      setCurrentResults(null);
      setSelectedMessageId(null);
    }
  };

  const handleMessageSelect = (message: Message) => {
    if (message.queryResults) {
      setSelectedMessageId(message.id);
      setCurrentResults({
        columns: message.queryResults.columns,
        rows: message.queryResults.rows,
        rowCount: message.queryResults.rowCount,
        executionTime: message.queryResults.executionTime,
        sqlQuery: message.sqlQuery || ""
      });
    }
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setChatToDelete(chatId);
  };

  const confirmDeleteChat = () => {
    if (chatToDelete) {
      deleteChatMutation.mutate(chatToDelete);
      setChatToDelete(null);
    }
  };

  const chats = chatsData?.chats || [];

  return (
    <div className="flex h-screen bg-background">
      <aside 
        className={cn(
          "border-r bg-muted/30 flex flex-col transition-all duration-200 ease-in-out",
          sidebarExpanded ? "w-64" : "w-14"
        )}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        <div className="p-2 border-b">
          {sidebarExpanded ? (
            <Button
              onClick={handleNewChat}
              disabled={createChatMutation.isPending}
              className="w-full gap-2"
              data-testid="button-new-chat"
            >
              <Plus className="w-4 h-4" />
              Новый чат
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleNewChat}
                  disabled={createChatMutation.isPending}
                  size="icon"
                  className="w-10 h-10"
                  data-testid="button-new-chat"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Новый чат</TooltipContent>
            </Tooltip>
          )}
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {chatsLoading ? (
              <div className={cn("text-sm text-muted-foreground", sidebarExpanded ? "p-2" : "p-1")}>
                {sidebarExpanded ? "Загрузка..." : "..."}
              </div>
            ) : chats.length === 0 ? (
              sidebarExpanded && (
                <div className="text-sm text-muted-foreground p-2">
                  Нет чатов. Создайте новый.
                </div>
              )
            ) : (
              chats.map((chat) => (
                sidebarExpanded ? (
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
                      className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDeleteChat(e, chat.id)}
                      data-testid={`button-delete-chat-${chat.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Tooltip key={chat.id}>
                    <TooltipTrigger asChild>
                      <div
                        onClick={() => handleSelectChat(chat.id)}
                        className={cn(
                          "flex items-center justify-center p-2 rounded-md cursor-pointer hover-elevate",
                          activeChatId === chat.id 
                            ? "bg-accent text-accent-foreground" 
                            : "hover:bg-accent/50"
                        )}
                        data-testid={`chat-item-${chat.id}`}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">{chat.title}</TooltipContent>
                  </Tooltip>
                )
              ))
            )}
          </div>
        </ScrollArea>
      </aside>

      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-between gap-2 px-6 h-16 border-b bg-card">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary">
              <Database className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">AI SQL Chat Bot</h1>
              <p className="text-xs text-muted-foreground">Преобразование текста в SQL запросы</p>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <DatabaseTablesDialog />
              </div>
            </TooltipTrigger>
            <TooltipContent>Таблицы БД</TooltipContent>
          </Tooltip>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {activeChatId ? (
            <>
              <ChatPanel 
                chatId={activeChatId}
                messages={messages} 
                setMessages={setMessages}
                setCurrentResults={setCurrentResults}
                selectedMessageId={selectedMessageId}
                setSelectedMessageId={setSelectedMessageId}
                onMessageSelect={handleMessageSelect}
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

      <AlertDialog open={!!chatToDelete} onOpenChange={(open) => !open && setChatToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить чат?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Вся история сообщений этого чата будет удалена.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteChat}
              className="bg-destructive text-destructive-foreground"
              disabled={deleteChatMutation.isPending}
              data-testid="button-confirm-delete"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
