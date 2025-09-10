import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Check, X, Plus } from "lucide-react";

export function TelegramBotSetup() {
  const [botToken, setBotToken] = useState("");
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const [aiProvider, setAiProvider] = useState("openai");
  const { toast } = useToast();

  // Mock secrets status - in real app this would come from API
  const secretsStatus = {
    TELEGRAM_BOT_TOKEN: true,
    OPENAI_API_KEY: true,
    DEEPSEEK_API_KEY: false,
    AI_PROVIDER: false,
  };

  const webhookUrl = "https://ktzixrajviveolgggilq.functions.supabase.co/telegram-webhook";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Скопировано",
      description: "Текст скопирован в буфер обмена",
    });
  };

  const setWebhook = async () => {
    if (!botToken) {
      toast({
        title: "Ошибка",
        description: "Введите токен бота",
        variant: "destructive",
      });
      return;
    }

    setIsSettingWebhook(true);
    
    try {
      // Проверяем токен бота
      const botInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const botInfo = await botInfoResponse.json();
      
      if (!botInfo.ok) {
        throw new Error('Неверный токен бота');
      }

      // Устанавливаем webhook
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          drop_pending_updates: true, // Очищаем старые обновления
        }),
      });

      const data = await response.json();
      
      if (data.ok) {
        toast({
          title: "Успешно!",
          description: `Webhook установлен для бота @${botInfo.result.username}. Бот готов к работе.`,
        });
      } else {
        throw new Error(data.description || 'Ошибка установки webhook');
      }
    } catch (error) {
      console.error('Error setting webhook:', error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось установить webhook",
        variant: "destructive",
      });
    } finally {
      setIsSettingWebhook(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📱 Настройка Telegram бота
        </CardTitle>
        <CardDescription>
          Настройте бота для получения данных о работниках через Telegram
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Статус секретов Supabase</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(secretsStatus).map(([secret, configured]) => (
              <div key={secret} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {configured ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm font-medium">{secret}</span>
                </div>
                {configured ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Настроен
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="bg-red-100 text-red-800">
                    Отсутствует
                  </Badge>
                )}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {!secretsStatus.DEEPSEEK_API_KEY && (
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Добавить DeepSeek API
              </Button>
            )}
            {!secretsStatus.AI_PROVIDER && (
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Добавить AI Provider
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="aiProvider">AI Провайдер</Label>
          <Select value={aiProvider} onValueChange={setAiProvider}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите AI провайдер" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI (универсальный)</SelectItem>
              <SelectItem value="deepseek">DeepSeek (экономичный, только текст)</SelectItem>
              <SelectItem value="mixed">Смешанный (DeepSeek + OpenAI для аудио/фото)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {aiProvider === "openai" && "Использует OpenAI для всех типов сообщений"}
            {aiProvider === "deepseek" && "Использует только DeepSeek (дешевле, но только текст)"}
            {aiProvider === "mixed" && "DeepSeek для текста, OpenAI для изображений и аудио"}
          </p>
        </div>

        <Alert>
          <AlertDescription>
            <strong>Шаги настройки:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Создайте бота через @BotFather в Telegram</li>
              <li>Получите API ключи от OpenAI и/или DeepSeek</li>
              <li>Добавьте все необходимые секреты в Supabase</li>
              <li>Выберите подходящий AI провайдер</li>
              <li>Настройте webhook бота</li>
            </ol>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="botToken">Токен бота</Label>
          <Input
            id="botToken"
            type="password"
            placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Webhook URL</Label>
          <div className="flex items-center gap-2">
            <Input
              value={webhookUrl}
              readOnly
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(webhookUrl)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button
          onClick={setWebhook}
          disabled={isSettingWebhook || !botToken}
          className="w-full"
        >
          {isSettingWebhook ? "Настройка..." : "Настроить бота"}
        </Button>

        <Alert>
          <AlertDescription>
            <strong>Возможности бота:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Умный анализ текста:</strong> Используя {aiProvider === 'openai' ? 'OpenAI' : aiProvider === 'deepseek' ? 'DeepSeek' : 'DeepSeek + OpenAI'}</li>
              <li><strong>Добавить работника:</strong> "Добавить работника Иван Петров, телефон +79001234567, ставка 3000 рублей в день"</li>
              <li><strong>Отметить присутствие:</strong> "Иван Петров сегодня работал 8 часов" или "Петров болеет"</li>
              <li><strong>Записать выплату:</strong> "Выплатил Иванову 15000 рублей за неделю"</li>
              <li><strong>Анализ изображений:</strong> Отправьте фото документа или записи (только с OpenAI)</li>
              <li><strong>Голосовые сообщения:</strong> Запишите голосовое сообщение (только с OpenAI)</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            Нужна помощь с настройкой?
          </span>
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://supabase.com/dashboard/project/ktzixrajviveolgggilq/settings/functions"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              Настроить секреты
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}