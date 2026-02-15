import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, register } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const mutation = isLogin ? login : register;
    
    mutation.mutate(
      { username, password },
      {
        onError: (error: any) => {
          const msg = error.message || "";
          const jsonMatch = msg.match(/\{.*\}/);
          let errorText = "Произошла ошибка";
          if (jsonMatch) {
            try {
              errorText = JSON.parse(jsonMatch[0]).error || errorText;
            } catch {}
          }
          toast({
            title: isLogin ? "Ошибка входа" : "Ошибка регистрации",
            description: errorText,
            variant: "destructive"
          });
        }
      }
    );
  };

  const isPending = login.isPending || register.isPending;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm mx-4">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-md bg-primary">
            <Database className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl">AI SQL Chat Bot</CardTitle>
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Войдите в систему" : "Создайте аккаунт"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Имя пользователя"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={2}
                autoComplete="username"
                data-testid="input-username"
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={4}
                autoComplete={isLogin ? "current-password" : "new-password"}
                data-testid="input-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isPending}
              data-testid="button-auth-submit"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isLogin ? "Войти" : "Зарегистрироваться"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-toggle-auth-mode"
            >
              {isLogin ? "Нет аккаунта? Зарегистрируйтесь" : "Уже есть аккаунт? Войдите"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
