import { Database, ArrowLeft } from "lucide-react";

interface EmptyStateProps {
  hasMessages: boolean;
}

export default function EmptyState({ hasMessages }: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center bg-background p-6">
      <div className="text-center max-w-md space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
            <Database className="w-10 h-10 text-muted-foreground" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            {hasMessages ? "Результаты появятся здесь" : "Добро пожаловать!"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {hasMessages 
              ? "Отправьте запрос в чат, чтобы увидеть результаты SQL запроса в виде таблицы"
              : "Задайте вопрос на естественном языке, и AI агент преобразует его в SQL запрос"
            }
          </p>
        </div>

        {!hasMessages && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
              <span>Начните с вопроса в чате слева</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <div 
                className="px-3 py-2 text-xs rounded-md bg-muted/50 hover-elevate cursor-pointer"
                data-testid="chip-example-1"
              >
                Покажи всех сотрудников
              </div>
              <div 
                className="px-3 py-2 text-xs rounded-md bg-muted/50 hover-elevate cursor-pointer"
                data-testid="chip-example-2"
              >
                Какие продукты дороже 1000?
              </div>
              <div 
                className="px-3 py-2 text-xs rounded-md bg-muted/50 hover-elevate cursor-pointer"
                data-testid="chip-example-3"
              >
                Сколько продаж в марте?
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
