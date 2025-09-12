import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Plus, Settings, Shield, Bot, Users, Clock, AlertTriangle, Check, X, Edit } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import AIProviderCard from "./AIProviderCard";
import AIStatusIndicator from "./AIStatusIndicator";

interface AIProvider {
  id: string;
  name: string;
  provider_type: string;
  api_endpoint?: string;
  model_name?: string;
  is_active: boolean;
  priority: number;
  max_tokens?: number;
  temperature?: number;
  created_at: string;
}

interface SystemSetting {
  id: string;
  category: string;
  key: string;
  value: any;
  description?: string;
  is_public: boolean;
  updated_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'foreman' | 'worker' | 'guest';
  created_at: string;
  expires_at?: string;
  is_active: boolean;
  notes?: string;
  profiles?: {
    full_name?: string;
    email?: string;
  };
}

interface UserAuditLog {
  id: string;
  user_id?: string;
  action: string;
  table_name?: string;
  timestamp: string;
  profiles?: {
    full_name?: string;
  };
}

export default function SystemSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [aiProviders, setAiProviders] = useState<AIProvider[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [auditLogs, setAuditLogs] = useState<UserAuditLog[]>([]);
  const [newProviderDialog, setNewProviderDialog] = useState(false);
  const [newRoleDialog, setNewRoleDialog] = useState(false);
  const [providerStatuses, setProviderStatuses] = useState<Record<string, 'online' | 'offline' | 'error' | 'testing'>>({});

  // Form states
  const [newProvider, setNewProvider] = useState({
    name: '',
    provider_type: 'openai',
    api_endpoint: '',
    model_name: '',
    priority: 1,
    max_tokens: 4000,
    temperature: 0.7
  });

  const [newRole, setNewRole] = useState({
    user_email: '',
    role: 'worker' as const,
    expires_at: '',
    notes: ''
  });

  useEffect(() => {
    fetchAIProviders();
    fetchSystemSettings();
    fetchUserRoles();
    fetchAuditLogs();
  }, []);

  const fetchAIProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_providers')
        .select('*')
        .order('priority');
      
      if (error) throw error;
      setAiProviders(data || []);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('category', { ascending: true });
      
      if (error) throw error;
      setSystemSettings(data || []);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUserRoles(data || []);
    } catch (error: any) {
      toast({
        title: "Ошибка", 
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('user_audit_log')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setAuditLogs(data || []);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateAIProvider = async () => {
    if (!newProvider.name || !newProvider.provider_type) {
      toast({
        title: "Ошибка",
        description: "Заполните обязательные поля",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('ai_providers')
        .insert([{
          ...newProvider,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }]);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "AI провайдер добавлен",
      });

      setNewProviderDialog(false);
      setNewProvider({
        name: '',
        provider_type: 'openai',
        api_endpoint: '',
        model_name: '',
        priority: 1,
        max_tokens: 4000,
        temperature: 0.7
      });
      fetchAIProviders();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleCreateUserRole = async () => {
    if (!newRole.user_email || !newRole.role) {
      toast({
        title: "Ошибка",
        description: "Заполните обязательные поля",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Найти пользователя по email - упрощенная версия для демо
      const { error } = await supabase
        .from('user_roles')
        .insert([{
          user_id: newRole.user_email, // В реальном приложении здесь был бы UUID пользователя
          role: newRole.role,
          expires_at: newRole.expires_at || null,
          notes: newRole.notes || null,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }]);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Роль пользователя назначена",
      });

      setNewRoleDialog(false);
      setNewRole({
        user_email: '',
        role: 'worker',
        expires_at: '',
        notes: ''
      });
      fetchUserRoles();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const toggleAIProvider = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_providers')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      fetchAIProviders();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleUserRole = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      fetchUserRoles();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleProviderStatusChange = (providerId: string, status: 'online' | 'offline' | 'error' | 'testing') => {
    setProviderStatuses(prev => ({
      ...prev,
      [providerId]: status
    }));
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'foreman': return 'secondary';
      case 'worker': return 'default';
      case 'guest': return 'outline';
      default: return 'default';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'foreman': return 'Бригадир';
      case 'worker': return 'Рабочий';
      case 'guest': return 'Гость';
      default: return role;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Системные настройки</h2>
          <p className="text-muted-foreground">
            Управление AI провайдерами, ролями пользователей и аудитом
          </p>
        </div>
        <AIStatusIndicator variant="compact" />
      </div>

      <Tabs defaultValue="ai-providers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ai-providers" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">AI Провайдеры</span>
          </TabsTrigger>
          <TabsTrigger value="user-roles" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Роли</span>
          </TabsTrigger>
          <TabsTrigger value="audit-logs" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Аудит</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Система</span>
          </TabsTrigger>
        </TabsList>

        {/* AI Providers */}
        <TabsContent value="ai-providers" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">AI Провайдеры</h3>
              <p className="text-sm text-muted-foreground">
                Управляйте провайдерами искусственного интеллекта, тестируйте соединения и настраивайте API ключи
              </p>
            </div>
            <Dialog open={newProviderDialog} onOpenChange={setNewProviderDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Добавить провайдера
                </Button>
              </DialogTrigger>
              <DialogContent className="dialog-content">
                <DialogHeader>
                  <DialogTitle>Новый AI провайдер</DialogTitle>
                  <DialogDescription>
                    Добавьте нового провайдера искусственного интеллекта
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 form-grid">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Название*</Label>
                    <Input
                      id="name"
                      value={newProvider.name}
                      onChange={(e) => setNewProvider({...newProvider, name: e.target.value})}
                      placeholder="OpenAI GPT-4"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="provider_type">Тип провайдера*</Label>
                    <Select
                      value={newProvider.provider_type}
                      onValueChange={(value) => setNewProvider({...newProvider, provider_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dropdown-content">
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="deepseek">DeepSeek</SelectItem>
                        <SelectItem value="google">Google</SelectItem>
                        <SelectItem value="azure">Azure OpenAI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="api_endpoint">API Endpoint</Label>
                    <Input
                      id="api_endpoint"
                      value={newProvider.api_endpoint}
                      onChange={(e) => setNewProvider({...newProvider, api_endpoint: e.target.value})}
                      placeholder="https://api.openai.com/v1"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="model_name">Модель</Label>
                    <Input
                      id="model_name"
                      value={newProvider.model_name}
                      onChange={(e) => setNewProvider({...newProvider, model_name: e.target.value})}
                      placeholder="gpt-4o"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="priority">Приоритет</Label>
                      <Input
                        id="priority"
                        type="number"
                        value={newProvider.priority}
                        onChange={(e) => setNewProvider({...newProvider, priority: parseInt(e.target.value)})}
                        min="1"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="max_tokens">Max Tokens</Label>
                      <Input
                        id="max_tokens"
                        type="number"
                        value={newProvider.max_tokens}
                        onChange={(e) => setNewProvider({...newProvider, max_tokens: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewProviderDialog(false)}>
                    Отмена
                  </Button>
                  <Button onClick={handleCreateAIProvider} disabled={loading}>
                    Создать
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <AIStatusIndicator variant="detailed" className="mb-6" />

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {aiProviders.map((provider) => (
              <AIProviderCard
                key={provider.id}
                provider={provider}
                onUpdate={fetchAIProviders}
                onStatusChange={handleProviderStatusChange}
              />
            ))}
          </div>

          {aiProviders.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Нет AI провайдеров</h3>
                <p className="text-muted-foreground mb-4">
                  Добавьте первого провайдера для начала работы с AI
                </p>
                <Button onClick={() => setNewProviderDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Добавить провайдера
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* User Roles */}
        <TabsContent value="user-roles" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Роли пользователей</h3>
            <Dialog open={newRoleDialog} onOpenChange={setNewRoleDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Назначить роль
                </Button>
              </DialogTrigger>
              <DialogContent className="dialog-content">
                <DialogHeader>
                  <DialogTitle>Назначить роль пользователю</DialogTitle>
                  <DialogDescription>
                    Назначьте роль пользователю в системе
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 form-grid">
                  <div className="grid gap-2">
                    <Label htmlFor="user_email">Email пользователя*</Label>
                    <Input
                      id="user_email"
                      value={newRole.user_email}
                      onChange={(e) => setNewRole({...newRole, user_email: e.target.value})}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Роль*</Label>
                    <Select
                      value={newRole.role}
                      onValueChange={(value: any) => setNewRole({...newRole, role: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="dropdown-content">
                        <SelectItem value="admin">Администратор</SelectItem>
                        <SelectItem value="foreman">Бригадир</SelectItem>
                        <SelectItem value="worker">Рабочий</SelectItem>
                        <SelectItem value="guest">Гость</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="expires_at">Срок действия</Label>
                    <Input
                      id="expires_at"
                      type="datetime-local"
                      value={newRole.expires_at}
                      onChange={(e) => setNewRole({...newRole, expires_at: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Примечания</Label>
                    <Textarea
                      id="notes"
                      value={newRole.notes}
                      onChange={(e) => setNewRole({...newRole, notes: e.target.value})}
                      placeholder="Дополнительная информация о роли"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewRoleDialog(false)}>
                    Отмена
                  </Button>
                  <Button onClick={handleCreateUserRole} disabled={loading}>
                    Назначить
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="table-wrapper">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>Роль</TableHead>
                      <TableHead className="hidden md:table-cell">Создано</TableHead>
                      <TableHead className="hidden sm:table-cell">Истекает</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userRoles.map((userRole) => (
                      <TableRow key={userRole.id}>
                        <TableCell className="font-medium">
                          {userRole.profiles?.full_name || 'Неизвестный пользователь'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(userRole.role)}>
                            {getRoleLabel(userRole.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(new Date(userRole.created_at), 'dd.MM.yyyy', { locale: ru })}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {userRole.expires_at 
                            ? format(new Date(userRole.expires_at), 'dd.MM.yyyy', { locale: ru })
                            : 'Бессрочно'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={userRole.is_active ? "default" : "secondary"}>
                            {userRole.is_active ? "Активна" : "Неактивна"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={userRole.is_active}
                            onCheckedChange={(checked) => toggleUserRole(userRole.id, checked)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs */}
        <TabsContent value="audit-logs" className="space-y-4">
          <h3 className="text-lg font-semibold">Журнал аудита</h3>
          <Card>
            <CardContent className="p-0">
              <div className="table-wrapper">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Время</TableHead>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>Действие</TableHead>
                      <TableHead className="hidden md:table-cell">Таблица</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {format(new Date(log.timestamp), 'dd.MM.yyyy HH:mm', { locale: ru })}
                        </TableCell>
                        <TableCell>
                          {log.profiles?.full_name || 'Система'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            log.action === 'INSERT' ? 'default' : 
                            log.action === 'UPDATE' ? 'secondary' : 
                            log.action === 'DELETE' ? 'destructive' : 'outline'
                          }>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {log.table_name}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-4">
          <h3 className="text-lg font-semibold">Системные настройки</h3>
          <div className="grid gap-4">
            {['general', 'security', 'ai', 'notifications'].map((category) => {
              const categorySettings = systemSettings.filter(s => s.category === category);
              if (categorySettings.length === 0) return null;

              return (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="capitalize">
                      {category === 'general' ? 'Общие' :
                       category === 'security' ? 'Безопасность' :
                       category === 'ai' ? 'Искусственный интеллект' :
                       category === 'notifications' ? 'Уведомления' : category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {categorySettings.map((setting) => (
                        <div key={setting.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{setting.key}</p>
                            <p className="text-sm text-muted-foreground">{setting.description}</p>
                          </div>
                          <div className="text-sm">
                            {typeof setting.value === 'string' ? 
                              setting.value.replace(/"/g, '') : 
                              setting.value?.toString()
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}