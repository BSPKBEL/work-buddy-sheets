import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Send, 
  Settings, 
  Bell, 
  Clock, 
  DollarSign, 
  MessageSquare,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';

export default function TelegramBotSetup() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [botStatus, setBotStatus] = useState('unknown');
  const [chatId, setChatId] = useState('');
  const [notifications, setNotifications] = useState({
    projectUpdates: true,
    budgetAlerts: true,
    dailyReports: true,
    attendanceReminders: true
  });

  const testConnection = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('telegram-notifications', {
        body: {
          action: 'daily_report',
          data: {
            chatId: chatId,
            activeProjects: 5,
            workersOnSite: 12,
            dailyExpenses: 45000,
            completedTasks: 8
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        setBotStatus('connected');
        toast({
          title: "Подключение успешно",
          description: "Тестовое сообщение отправлено в Telegram",
        });
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Test connection error:', error);
      setBotStatus('error');
      toast({
        title: "Ошибка подключения",
        description: "Проверьте Chat ID и настройки бота",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = async (type: string, data: any) => {
    try {
      setLoading(true);
      
      const { data: result, error } = await supabase.functions.invoke('telegram-notifications', {
        body: {
          action: type,
          data: { ...data, chatId }
        }
      });

      if (error) throw error;

      toast({
        title: "Уведомление отправлено",
        description: `Сообщение типа "${type}" успешно доставлено`,
      });
    } catch (error) {
      console.error('Send notification error:', error);
      toast({
        title: "Ошибка отправки",
        description: "Не удалось отправить уведомление",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getBotStatusIcon = () => {
    switch (botStatus) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <MessageSquare className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Telegram Бот</h1>
          <p className="text-muted-foreground">
            Настройка уведомлений и интеграции с Telegram
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getBotStatusIcon()}
          <Badge variant={botStatus === 'connected' ? 'default' : 'secondary'}>
            {botStatus === 'connected' ? 'Подключен' : 
             botStatus === 'error' ? 'Ошибка' : 'Не настроен'}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="setup">Настройка</TabsTrigger>
          <TabsTrigger value="notifications">Уведомления</TabsTrigger>
          <TabsTrigger value="test">Тестирование</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Подключение Telegram бота</CardTitle>
              <CardDescription>
                Настройте интеграцию с Telegram для получения уведомлений о проектах
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chatId">Chat ID</Label>
                <Input
                  id="chatId"
                  placeholder="Введите Chat ID"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Отправьте сообщение боту @WorkBuddy_bot и выполните команду /start для получения Chat ID
                </p>
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={testConnection}
                  disabled={loading || !chatId}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Тестировать подключение
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Инструкции по настройке</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold">1. Найдите бота</h4>
                <p className="text-sm text-muted-foreground">
                  Найдите @WorkBuddy_bot в Telegram или перейдите по ссылке t.me/WorkBuddy_bot
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">2. Запустите бота</h4>
                <p className="text-sm text-muted-foreground">
                  Отправьте команду /start боту для активации
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">3. Получите Chat ID</h4>
                <p className="text-sm text-muted-foreground">
                  Отправьте команду /chatid и скопируйте полученный ID
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">4. Настройте уведомления</h4>
                <p className="text-sm text-muted-foreground">
                  Введите Chat ID выше и настройте типы уведомлений во вкладке "Уведомления"
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Типы уведомлений</CardTitle>
              <CardDescription>
                Выберите, какие уведомления вы хотите получать в Telegram
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Обновления проектов</Label>
                  <p className="text-sm text-muted-foreground">
                    Уведомления об изменении статуса и прогресса проектов
                  </p>
                </div>
                <Switch
                  checked={notifications.projectUpdates}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, projectUpdates: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Превышение бюджета</Label>
                  <p className="text-sm text-muted-foreground">
                    Предупреждения при превышении бюджета проекта на 80%
                  </p>
                </div>
                <Switch
                  checked={notifications.budgetAlerts}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, budgetAlerts: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Ежедневные отчеты</Label>
                  <p className="text-sm text-muted-foreground">
                    Сводка активности за день в 18:00
                  </p>
                </div>
                <Switch
                  checked={notifications.dailyReports}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, dailyReports: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Напоминания о посещаемости</Label>
                  <p className="text-sm text-muted-foreground">
                    Напоминания работникам отметиться на объекте
                  </p>
                </div>
                <Switch
                  checked={notifications.attendanceReminders}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, attendanceReminders: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Тестовые уведомления
                </CardTitle>
                <CardDescription>
                  Отправьте тестовые сообщения для проверки интеграции
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full"
                  onClick={() => sendNotification('project_status_update', {
                    projectName: 'Тестовый проект',
                    status: 'В работе',
                    progress: 65,
                    budget: 500000,
                    spent: 320000
                  })}
                  disabled={loading || !chatId}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Обновление проекта
                </Button>
                
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => sendNotification('budget_alert', {
                    projectName: 'Тестовый проект',
                    budget: 500000,
                    spent: 450000,
                    overrun: 15
                  })}
                  disabled={loading || !chatId}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Превышение бюджета
                </Button>
                
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => sendNotification('attendance_reminder', {
                    workerName: 'Иван Петров',
                    projectName: 'Офисное здание',
                    time: '08:00'
                  })}
                  disabled={loading || !chatId}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Напоминание работнику
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Доступные команды бота</CardTitle>
                <CardDescription>
                  Команды для взаимодействия с ботом
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <code className="bg-muted px-2 py-1 rounded text-sm">/start</code>
                    <p className="text-sm text-muted-foreground mt-1">Запуск бота</p>
                  </div>
                  
                  <div>
                    <code className="bg-muted px-2 py-1 rounded text-sm">/chatid</code>
                    <p className="text-sm text-muted-foreground mt-1">Получить Chat ID</p>
                  </div>
                  
                  <div>
                    <code className="bg-muted px-2 py-1 rounded text-sm">/status</code>
                    <p className="text-sm text-muted-foreground mt-1">Статус активных проектов</p>
                  </div>
                  
                  <div>
                    <code className="bg-muted px-2 py-1 rounded text-sm">/expense [сумма] [категория]</code>
                    <p className="text-sm text-muted-foreground mt-1">Добавить расход</p>
                  </div>
                  
                  <div>
                    <code className="bg-muted px-2 py-1 rounded text-sm">/attendance</code>
                    <p className="text-sm text-muted-foreground mt-1">Отметиться на объекте</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}