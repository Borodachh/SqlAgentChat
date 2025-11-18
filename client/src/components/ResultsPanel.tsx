import { Message } from "@shared/schema";
import ResultsTable from "./ResultsTable";
import EmptyState from "./EmptyState";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Clock, Table as TableIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import SQLQueryDisplay from "./SQLQueryDisplay";

interface ResultsPanelProps {
  results: {
    columns: string[];
    rows: Record<string, any>[];
    rowCount: number;
    executionTime: number;
    sqlQuery: string;
  } | null;
  messages: Message[];
}

export default function ResultsPanel({ results, messages }: ResultsPanelProps) {
  const { toast } = useToast();

  const exportMutation = useMutation({
    mutationFn: async (data: { columns: string[]; rows: Record<string, any>[] }) => {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error("Ошибка создания Excel файла");
      }

      const blob = await response.blob();
      const filename = `query_results_${Date.now()}.xlsx`;
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { filename };
    },
    onMutate: () => {
      toast({
        title: "Создание файла",
        description: "Генерируем Excel файл...",
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Excel файл готов",
        description: `Файл ${data.filename} загружен`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка экспорта",
        description: error.message || "Не удалось создать Excel файл",
        variant: "destructive"
      });
    }
  });

  const handleExport = () => {
    if (!results) return;
    exportMutation.mutate({
      columns: results.columns,
      rows: results.rows
    });
  };

  if (!results) {
    return <EmptyState hasMessages={messages.length > 0} />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <div className="px-6 py-4 border-b bg-card space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary" className="gap-1.5">
              <TableIcon className="w-3 h-3" />
              <span data-testid="text-row-count">{results.rowCount} строк</span>
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <Clock className="w-3 h-3" />
              <span data-testid="text-execution-time">{results.executionTime.toFixed(2)} мс</span>
            </Badge>
          </div>
          
          <Button 
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="gap-2"
            data-testid="button-export-excel"
          >
            <Download className="w-4 h-4" />
            Экспорт в Excel
          </Button>
        </div>

        <SQLQueryDisplay query={results.sqlQuery} showCopy />
      </div>

      <div className="flex-1 overflow-auto p-6">
        <ResultsTable 
          columns={results.columns} 
          rows={results.rows} 
        />
      </div>
    </div>
  );
}
