import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SqlTemplate } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bookmark, Trash2, Play, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TemplatesDialogProps {
  onUseTemplate?: (sqlQuery: string) => void;
  hasActiveChat?: boolean;
}

export default function TemplatesDialog({ onUseTemplate, hasActiveChat = false }: TemplatesDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data: templatesData, isLoading, isError } = useQuery<{ templates: SqlTemplate[] }>({
    queryKey: ['/api/templates'],
    enabled: open,
  });

  const templates = templatesData?.templates || [];

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      toast({ title: "Шаблон удалён" });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    }
  });

  const handleUse = (template: SqlTemplate) => {
    onUseTemplate?.(template.sqlQuery);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              data-testid="button-show-templates"
            >
              <Bookmark className="w-4 h-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Шаблоны SQL</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="w-5 h-5" />
            Сохранённые шаблоны
          </DialogTitle>
          <DialogDescription>Ваши сохранённые SQL-запросы для быстрого использования</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8" data-testid="templates-loading">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="text-sm text-destructive py-4 text-center" data-testid="templates-error">
              Ошибка загрузки шаблонов
            </div>
          ) : templates.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center" data-testid="templates-empty">
              Нет сохранённых шаблонов. Выполните SQL-запрос и нажмите «Шаблон» для сохранения.
            </div>
          ) : (
            <div className="space-y-2" data-testid="templates-list">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="p-3 rounded-md border space-y-2"
                  data-testid={`template-item-${template.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate flex-1">{template.name}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUse(template)}
                            disabled={!hasActiveChat}
                            data-testid={`button-use-template-${template.id}`}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{hasActiveChat ? "Выполнить" : "Сначала выберите чат"}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(template.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-template-${template.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Удалить</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono break-all p-2 rounded bg-muted/50">
                    {template.sqlQuery}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
