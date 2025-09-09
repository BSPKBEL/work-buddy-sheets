import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Hammer, Eye, EyeOff, Shield } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast({
          title: "Успешный вход",
          description: "Добро пожаловать в систему!",
        });
        navigate("/");
      } else {
        // Validate password strength
        if (password.length < 8) {
          throw new Error("Пароль должен содержать минимум 8 символов");
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
          throw new Error("Пароль должен содержать буквы в разных регистрах и цифры");
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
        toast({
          title: "Регистрация успешна",
          description: "Проверьте почту для подтверждения аккаунта",
        });
      }
    } catch (error: any) {
      let errorMessage = error.message;
      
      // Handle specific auth errors
      if (error.message.includes("Invalid login credentials")) {
        errorMessage = "Неверный email или пароль";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "Подтвердите email перед входом";
      } else if (error.message.includes("User already registered")) {
        errorMessage = "Пользователь с таким email уже зарегистрирован";
      } else if (error.message.includes("Password is too weak")) {
        errorMessage = "Пароль слишком простой. Используйте более сложный пароль";
      }

      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full border border-primary/20">
              <div className="flex items-center gap-2">
                <Hammer className="h-8 w-8 text-primary" />
                <Shield className="h-6 w-6 text-primary/70" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            СтройМенеджер
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Безопасная система управления стройплощадкой
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {isLogin ? "Войдите в систему" : "Создайте защищенный аккаунт"}
          </p>
        </div>

        <Card className="shadow-2xl border border-border/50">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl">
              {isLogin ? "Безопасный вход" : "Защищенная регистрация"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isLogin 
                ? "Введите свои учетные данные" 
                : "Создайте надежный аккаунт"
              }
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleAuth} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Полное имя</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Иван Петров"
                    required={!isLogin}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email адрес</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="h-12"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">
                  Пароль
                  {!isLogin && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (минимум 8 символов, буквы и цифры)
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-12 pr-12"
                    minLength={isLogin ? undefined : 8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {!isLogin && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• Минимум 8 символов</p>
                    <p>• Заглавные и строчные буквы</p>
                    <p>• Цифры для дополнительной безопасности</p>
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-medium" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Загрузка...
                  </div>
                ) : isLogin ? "Войти в систему" : "Создать аккаунт"}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" />
                <span>Защищено шифрованием и безопасными протоколами</span>
              </div>
              
              <Button
                variant="ghost"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setFullName("");
                  setEmail("");
                  setPassword("");
                }}
                className="text-sm"
              >
                {isLogin 
                  ? "Нет аккаунта? Зарегистрируйтесь" 
                  : "Есть аккаунт? Войдите"
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}