import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Copy, ExternalLink } from "lucide-react";

export function TelegramBotSetup() {
  const [botToken, setBotToken] = useState("");
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const { toast } = useToast();

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
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
        }),
      });

      const data = await response.json();
      
      if (data.ok) {
        toast({
          title: "Успешно!",
          description: "Webhook установлен. Бот готов к работе.",
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
        <Alert>
          <AlertDescription>
            <strong>Шаги настройки:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Создайте бота через @BotFather в Telegram</li>
              <li>Скопируйте полученный токен</li>
              <li>Вставьте токен в поле ниже и нажмите "Настроить бота"</li>
              <li>Добавьте секреты OPENAI_API_KEY и TELEGRAM_BOT_TOKEN в Supabase</li>
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
            <strong>Как использовать:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Добавить работника:</strong> "Добавить работника Иван Петров, телефон +79001234567, ставка 3000 рублей в день"</li>
              <li><strong>Отметить присутствие:</strong> "Иван Петров сегодня работал 8 часов" или "Петров болеет"</li>
              <li><strong>Записать выплату:</strong> "Выплатил Иванову 15000 рублей за неделю"</li>
              <li><strong>Фото:</strong> Отправьте фото документа или записи</li>
              <li><strong>Голосовое:</strong> Запишите голосовое сообщение</li>
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