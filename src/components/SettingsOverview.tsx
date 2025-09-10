import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Bot, 
  Brain, 
  Shield, 
  Database, 
  Webhook,
  Mail,
  Bell,
  Download,
  Users,
  ArrowRight
} from "lucide-react";

interface SettingsOverviewProps {
  onSectionChange?: (section: string) => void;
}

export function SettingsOverview({ onSectionChange }: SettingsOverviewProps) {
  const settingsCategories = [
    {
      id: "telegram",
      title: "Telegram интеграция",
      description: "Настройка бота, команды, уведомления",
      icon: Bot,
      status: "активно",
      statusVariant: "default" as const,
      items: ["Настройка бота", "Команды", "Уведомления", "Webhook"]
    },
    {
      id: "ai-settings",
      title: "AI настройки",
      description: "Выбор провайдера, API ключи, модели",
      icon: Brain,
      status: "настройка",
      statusVariant: "secondary" as const,
      items: ["Провайдер AI", "API ключи", "Модели", "LiteLLM"]
    },
    {
      id: "security-settings",
      title: "Безопасность",
      description: "Двухфакторная аутентификация, логи доступа",
      icon: Shield,
      status: "требует внимания",
      statusVariant: "destructive" as const,
      items: ["2FA", "Логи доступа", "Права пользователей", "Аудит"]
    },
    {
      id: "system-settings",
      title: "Системные настройки",
      description: "Резервное копирование, производительность",
      icon: Database,
      status: "стабильно",
      statusVariant: "outline" as const,
      items: ["Бэкапы", "База данных", "Производительность", "Мониторинг"]
    },
    {
      id: "integrations",
      title: "Интеграции",
      description: "API для внешних систем, webhooks",
      icon: Webhook,
      status: "не настроено",
      statusVariant: "secondary" as const,
      items: ["1С интеграция", "WhatsApp API", "Банковские API", "Карты"]
    },
    {
      id: "notifications",
      title: "Уведомления",
      description: "Email, SMS, push настройки",
      icon: Bell,
      status: "частично",
      statusVariant: "secondary" as const,
      items: ["Email", "SMS", "Push уведомления", "Шаблоны"]
    }
  ];

  const handleCategoryClick = (categoryId: string) => {
    if (onSectionChange) {
      onSectionChange(categoryId);
    }
  };

  const quickActions = [
    { title: "Экспорт настроек", icon: Download, action: () => {} },
    { title: "Управление пользователями", icon: Users, action: () => {} },
    { title: "Проверка системы", icon: Settings, action: () => {} }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Настройки</h1>
        <p className="text-muted-foreground mt-2">
          Централизованное управление системой и интеграциями
        </p>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Быстрые действия
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <Button
                key={action.title}
                variant="outline"
                className="justify-start h-auto p-4 mobile-button"
                onClick={action.action}
              >
                <action.icon className="h-5 w-5 mr-3" />
                <span>{action.title}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Settings Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsCategories.map((category) => (
          <Card key={category.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <category.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {category.description}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={category.statusVariant}>
                  {category.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  {category.items.map((item) => (
                    <div key={item} className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full mr-2" />
                      {item}
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between mobile-button"
                  onClick={() => handleCategoryClick(category.id)}
                >
                  Настроить
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Статус системы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-success">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">156</div>
              <div className="text-sm text-muted-foreground">Активных сессий</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">2.3GB</div>
              <div className="text-sm text-muted-foreground">Использовано памяти</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">Stable</div>
              <div className="text-sm text-muted-foreground">Статус БД</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}