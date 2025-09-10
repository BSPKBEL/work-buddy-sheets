import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Clock, AlertTriangle, Check, X } from "lucide-react";
import { format, addDays, addHours } from "date-fns";
import { ru } from "date-fns/locale";

interface TemporaryPermission {
  id: string;
  user_id: string;
  project_id?: string;
  permission_type: string;
  granted_by: string;
  granted_at: string;
  expires_at: string;
  is_active: boolean;
  notes?: string;
  profiles?: {
    full_name?: string;
  };
  projects?: {
    name?: string;
  };
  granted_by_profile?: {
    full_name?: string;
  };
}

interface Project {
  id: string;
  name: string;
}

export function TemporaryPermissions() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<TemporaryPermission[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [newPermissionDialog, setNewPermissionDialog] = useState(false);

  const [newPermission, setNewPermission] = useState({
    user_email: '',
    project_id: '',
    permission_type: 'read',
    expires_in: '24', // hours
    notes: ''
  });

  const permissionTypes = [
    { value: 'read', label: 'Просмотр' },
    { value: 'write', label: 'Редактирование' },
    { value: 'delete', label: 'Удаление' },
    { value: 'manage_workers', label: 'Управление работниками' },
    { value: 'manage_attendance', label: 'Управление посещаемостью' },
    { value: 'manage_payments', label: 'Управление выплатами' },
    { value: 'view_reports', label: 'Просмотр отчетов' },
    { value: 'export_data', label: 'Экспорт данных' }
  ];

  useEffect(() => {
    fetchPermissions();
    fetchProjects();
  }, []);

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('temporary_permissions')
        .select('*')
        .order('granted_at', { ascending: false });
      
      if (error) throw error;
      setPermissions(data || []);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreatePermission = async () => {
    if (!newPermission.user_email || !newPermission.permission_type) {
      toast({
        title: "Ошибка",
        description: "Заполните обязательные поля",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Вычисляем дату истечения
      const expiresAt = addHours(new Date(), parseInt(newPermission.expires_in));
      
      // Упрощенная версия для демо - в реальном приложении нужна проверка пользователя
      const { error } = await supabase
        .from('temporary_permissions')
        .insert([{
          user_id: newPermission.user_email, // В реальном приложении здесь был бы UUID
          project_id: newPermission.project_id || null,
          permission_type: newPermission.permission_type,
          expires_at: expiresAt.toISOString(),
          notes: newPermission.notes || null,
          granted_by: (await supabase.auth.getUser()).data.user?.id
        }]);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Временное разрешение создано",
      });

      setNewPermissionDialog(false);
      setNewPermission({
        user_email: '',
        project_id: '',
        permission_type: 'read',
        expires_in: '24',
        notes: ''
      });
      fetchPermissions();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const revokePermission = async (id: string) => {
    try {
      const { error } = await supabase
        .from('temporary_permissions')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Разрешение отозвано",
      });

      fetchPermissions();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getPermissionLabel = (type: string) => {
    const permission = permissionTypes.find(p => p.value === type);
    return permission?.label || type;
  };

  const getPermissionStatus = (permission: TemporaryPermission) => {
    const now = new Date();
    const expiresAt = new Date(permission.expires_at);
    
    if (!permission.is_active) {
      return { label: 'Отозвано', variant: 'destructive' as const };
    }
    
    if (expiresAt < now) {
      return { label: 'Истекло', variant: 'secondary' as const };
    }
    
    const hoursLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));
    if (hoursLeft <= 2) {
      return { label: 'Скоро истекает', variant: 'destructive' as const };
    }
    
    return { label: 'Активно', variant: 'default' as const };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Временные разрешения</h2>
          <p className="text-muted-foreground">
            Управление временными правами доступа пользователей
          </p>
        </div>
        
        <Dialog open={newPermissionDialog} onOpenChange={setNewPermissionDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Выдать разрешение
            </Button>
          </DialogTrigger>
          <DialogContent className="dialog-content">
            <DialogHeader>
              <DialogTitle>Новое временное разрешение</DialogTitle>
              <DialogDescription>
                Выдайте пользователю временные права доступа
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 form-grid">
              <div className="grid gap-2">
                <Label htmlFor="user_email">Email пользователя*</Label>
                <Input
                  id="user_email"
                  value={newPermission.user_email}
                  onChange={(e) => setNewPermission({...newPermission, user_email: e.target.value})}
                  placeholder="user@example.com"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="project_id">Проект</Label>
                <Select
                  value={newPermission.project_id}
                  onValueChange={(value) => setNewPermission({...newPermission, project_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите проект (или оставьте пустым для всех)" />
                  </SelectTrigger>
                  <SelectContent className="dropdown-content">
                    <SelectItem value="">Все проекты</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="permission_type">Тип разрешения*</Label>
                <Select
                  value={newPermission.permission_type}
                  onValueChange={(value) => setNewPermission({...newPermission, permission_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dropdown-content">
                    {permissionTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="expires_in">Срок действия</Label>
                <Select
                  value={newPermission.expires_in}
                  onValueChange={(value) => setNewPermission({...newPermission, expires_in: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="dropdown-content">
                    <SelectItem value="1">1 час</SelectItem>
                    <SelectItem value="4">4 часа</SelectItem>
                    <SelectItem value="8">8 часов</SelectItem>
                    <SelectItem value="24">24 часа</SelectItem>
                    <SelectItem value="72">3 дня</SelectItem>
                    <SelectItem value="168">1 неделя</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="notes">Примечания</Label>
                <Textarea
                  id="notes"
                  value={newPermission.notes}
                  onChange={(e) => setNewPermission({...newPermission, notes: e.target.value})}
                  placeholder="Причина выдачи разрешения"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewPermissionDialog(false)}>
                Отмена
              </Button>
              <Button onClick={handleCreatePermission} disabled={loading}>
                Выдать разрешение
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Активные разрешения
          </CardTitle>
          <CardDescription>
            Список всех временных разрешений с указанием статуса и времени истечения
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="table-wrapper">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Пользователь</TableHead>
                  <TableHead className="hidden sm:table-cell">Проект</TableHead>
                  <TableHead>Разрешение</TableHead>
                  <TableHead className="hidden md:table-cell">Выдано</TableHead>
                  <TableHead>Истекает</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Временных разрешений нет
                    </TableCell>
                  </TableRow>
                ) : (
                  permissions.map((permission) => {
                    const status = getPermissionStatus(permission);
                    return (
                      <TableRow key={permission.id}>
                        <TableCell className="font-medium">
                          {permission.profiles?.full_name || 'Неизвестный пользователь'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {permission.projects?.name || 'Все проекты'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getPermissionLabel(permission.permission_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(new Date(permission.granted_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(permission.expires_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {permission.is_active && new Date(permission.expires_at) > new Date() && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => revokePermission(permission.id)}
                              className="gap-1"
                            >
                              <X className="h-3 w-3" />
                              <span className="hidden sm:inline">Отозвать</span>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}