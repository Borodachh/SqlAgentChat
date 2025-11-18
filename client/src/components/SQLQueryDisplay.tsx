import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface SQLQueryDisplayProps {
  query: string;
  showCopy?: boolean;
}

export default function SQLQueryDisplay({ query, showCopy = false }: SQLQueryDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn(
      "relative rounded-md bg-muted/50 border border-border overflow-hidden",
      showCopy && "pr-12"
    )}>
      <pre className="p-4 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap break-words">
        {query}
      </pre>
      {showCopy && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8"
          onClick={handleCopy}
          data-testid="button-copy-sql"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      )}
    </div>
  );
}
