import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Message } from "@shared/schema";
import ChatPanel from "@/components/ChatPanel";
import ResultsPanel from "@/components/ResultsPanel";
import { Database } from "lucide-react";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentResults, setCurrentResults] = useState<{
    columns: string[];
    rows: Record<string, any>[];
    rowCount: number;
    executionTime: number;
    sqlQuery: string;
  } | null>(null);

  const { data: historyData } = useQuery({
    queryKey: ['/api/messages'],
    refetchOnMount: true,
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (historyData?.messages) {
      setMessages(historyData.messages);
      
      const lastMessageWithResults = [...historyData.messages]
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
      }
    }
  }, [historyData]);

  return (
    <div className="flex h-screen bg-background">
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
          <ChatPanel 
            messages={messages} 
            setMessages={setMessages}
            setCurrentResults={setCurrentResults}
          />
          
          <ResultsPanel 
            results={currentResults}
            messages={messages}
          />
        </div>
      </div>
    </div>
  );
}
