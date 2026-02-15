import { Message } from "@shared/schema";
import { User, Bot, AlertCircle, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: Message;
  isSelected?: boolean;
  onSelect?: (message: Message) => void;
}

export default function MessageBubble({ message, isSelected, onSelect }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isError = !!message.error;
  const isPending = message.id?.includes('pending') || false;
  const hasResults = !isUser && !!message.queryResults;

  const handleClick = () => {
    if (hasResults && onSelect) {
      onSelect(message);
    }
  };

  return (
    <div
      className={cn(
        "flex gap-3 w-full",
        isUser ? "justify-end" : "justify-start"
      )}
      data-testid={`message-${message.id}`}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary flex items-center justify-center mt-1">
          <Bot className="w-5 h-5 text-primary-foreground" />
        </div>
      )}
      
      <div
        className={cn(
          "flex flex-col gap-2 max-w-[280px]",
          isUser && "items-end"
        )}
      >
        <div
          onClick={handleClick}
          className={cn(
            "px-4 py-3 rounded-2xl text-sm",
            isUser 
              ? "bg-primary text-primary-foreground" 
              : isError 
                ? "bg-destructive/10 text-destructive border border-destructive/20"
                : isPending
                  ? "bg-muted text-muted-foreground animate-pulse"
                  : isSelected
                    ? "bg-accent text-accent-foreground ring-2 ring-primary"
                    : "bg-muted text-foreground",
            hasResults && "cursor-pointer hover-elevate"
          )}
        >
          {isError && (
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-semibold">Ошибка</span>
            </div>
          )}
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
          {hasResults && (
            <div className="flex items-center gap-1.5 mt-2 text-xs opacity-70">
              <Table2 className="w-3 h-3" />
              <span>{message.queryResults!.rowCount} rows</span>
            </div>
          )}
        </div>

        <span className="text-xs text-muted-foreground px-2">
          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }) : '--:--'}
        </span>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-md bg-secondary flex items-center justify-center mt-1">
          <User className="w-5 h-5 text-secondary-foreground" />
        </div>
      )}
    </div>
  );
}
