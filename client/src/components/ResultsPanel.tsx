import { useState } from "react";
import { Message } from "@shared/schema";
import ResultsTable from "./ResultsTable";
import EmptyState from "./EmptyState";
import ChartView from "./ChartView";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Clock, Table as TableIcon, FileSpreadsheet, FileText, Send, Bookmark } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import SQLQueryDisplay from "./SQLQueryDisplay";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const saveTemplateMutation = useMutation({
    mutationFn: async ({ name, sqlQuery }: { name: string; sqlQuery: string }) => {
      const response = await apiRequest("POST", "/api/templates", { name, sqlQuery });
      return await response.json();
    },
    onSuccess: () => {
      toast({ title: "Шаблон сохранён" });
      setSaveDialogOpen(false);
      setTemplateName("");
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    }
  });

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

  const telegramMutation = useMutation({
    mutationFn: async ({ format, data }: { format: "xlsx" | "csv"; data: { columns: string[]; rows: Record<string, any>[]; sqlQuery?: string } }) => {
      const response = await fetch("/api/send-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, format })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Ошибка отправки");
      return result;
    },
    onMutate: ({ format }) => {
      toast({ title: "Отправка в Telegram", description: `Отправляем ${format.toUpperCase()} файл...` });
    },
    onSuccess: (data) => {
      toast({ title: "Отправлено", description: data.message });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка Telegram", description: error.message, variant: "destructive" });
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

  const handleTelegram = (format: "xlsx" | "csv") => {
    if (!results) return;
    telegramMutation.mutate({
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
              <span data-testid="text-row-count">{results.rowCount} rows</span>
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <Clock className="w-3 h-3" />
              <span data-testid="text-execution-time">{results.executionTime.toFixed(2)} мс</span>
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={telegramMutation.isPending}
                  data-testid="button-telegram"
                >
                  <Send className="w-4 h-4" />
                  Telegram
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleTelegram("xlsx")}
                  data-testid="button-telegram-excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleTelegram("csv")}
                  data-testid="button-telegram-csv"
                >
                  <FileText className="w-4 h-4" />
                  CSV (.csv)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setSaveDialogOpen(true)}
              data-testid="button-save-template"
            >
              <Bookmark className="w-4 h-4" />
              Шаблон
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

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Сохранить как шаблон</DialogTitle>
            <DialogDescription>Дайте название SQL-запросу для повторного использования</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Название шаблона, например: Ежедневная выручка"
              data-testid="input-template-name"
              onKeyDown={(e) => {
                if (e.key === "Enter" && templateName.trim()) {
                  saveTemplateMutation.mutate({ name: templateName.trim(), sqlQuery: results.sqlQuery });
                }
              }}
            />
            <div className="text-xs text-muted-foreground p-3 rounded-md bg-muted/50 font-mono break-all">
              {results.sqlQuery}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)} data-testid="button-cancel-template">
              Отмена
            </Button>
            <Button
              onClick={() => saveTemplateMutation.mutate({ name: templateName.trim(), sqlQuery: results.sqlQuery })}
              disabled={!templateName.trim() || saveTemplateMutation.isPending}
              data-testid="button-confirm-save-template"
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
