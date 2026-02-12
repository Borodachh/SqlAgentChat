import { Message } from "@shared/schema";
import ResultsTable from "./ResultsTable";
import EmptyState from "./EmptyState";
import ChartView from "./ChartView";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Clock, Table as TableIcon, FileSpreadsheet, FileText } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
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
    mutationFn: async ({ format, data }: { format: "xlsx" | "csv"; data: { columns: string[]; rows: Record<string, any>[]; sqlQuery?: string } }) => {
      const response = await fetch(`/api/export?format=${format}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Ошибка создания ${format.toUpperCase()} файла`);
      }

      const blob = await response.blob();
      const extension = format === "csv" ? "csv" : "xlsx";
      const filename = `query_results_${Date.now()}.${extension}`;
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { filename, format };
    },
    onMutate: ({ format }) => {
      toast({
        title: "Создание файла",
        description: `Генерируем ${format.toUpperCase()} файл...`,
      });
    },
    onSuccess: (data) => {
      toast({
        title: `${data.format.toUpperCase()} файл готов`,
        description: `Файл ${data.filename} загружен`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка экспорта",
        description: error.message || "Не удалось создать файл",
        variant: "destructive"
      });
    }
  });

  const handleExport = (format: "xlsx" | "csv") => {
    if (!results) return;
    exportMutation.mutate({
      format,
      data: {
        columns: results.columns,
        rows: results.rows,
        sqlQuery: results.sqlQuery
      }
    });
  };

  if (!results) {
    return <EmptyState hasMessages={messages.length > 0} />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      <div className="px-6 py-4 border-b bg-card space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
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
          
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => handleExport("xlsx")}
              disabled={exportMutation.isPending}
              className="gap-2"
              data-testid="button-export-excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </Button>
            <Button 
              onClick={() => handleExport("csv")}
              disabled={exportMutation.isPending}
              variant="outline"
              className="gap-2"
              data-testid="button-export-csv"
            >
              <FileText className="w-4 h-4" />
              CSV
            </Button>
          </div>
        </div>

        <SQLQueryDisplay query={results.sqlQuery} showCopy />
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        <ChartView columns={results.columns} rows={results.rows} />
        <ResultsTable 
          columns={results.columns} 
          rows={results.rows} 
        />
      </div>
    </div>
  );
}
