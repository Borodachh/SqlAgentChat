import { Database, ArrowLeft } from "lucide-react";

interface EmptyStateProps {
  hasMessages: boolean;
  onSuggestionClick?: (text: string) => void;
}

export default function EmptyState({ hasMessages, onSuggestionClick }: EmptyStateProps) {
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
              {["Покажи всех сотрудников", "Какие продукты дороже 1000?", "Сколько продаж в марте?"].map((suggestion, i) => (
                <div 
                  key={i}
                  className="px-3 py-2 text-xs rounded-md bg-muted/50 hover-elevate cursor-pointer"
                  onClick={() => onSuggestionClick?.(suggestion)}
                  data-testid={`chip-example-${i + 1}`}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
