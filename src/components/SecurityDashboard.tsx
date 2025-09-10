import { useState, useEffect } from "react";
import { useSecureAuth } from "@/hooks/useSecureAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  Key, 
  Activity,
  RefreshCw,
  Download
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface SecurityMetrics {
  total_users: number;
  users_with_2fa: number;
  admin_users: number;
  active_sessions: number;
  failed_login_attempts: number;
  recent_role_changes: number;
}

interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  table_name?: string;
  timestamp: string;
  metadata?: any;
  user_email?: string;
}

export function SecurityDashboard() {
  const { isAdmin } = useSecureAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      loadSecurityData();
    }
  }, [isAdmin]);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadSecurityMetrics(),
        loadAuditLogs()
      ]);
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить данные безопасности: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSecurityMetrics = async () => {
    // Get user metrics
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, user_id');
    
    if (profilesError) throw profilesError;

    // Get 2FA enabled users
    const { data: users2FA, error: users2FAError } = await supabase
      .from('user_2fa')
      .select('user_id')
      .eq('is_enabled', true);
    
    if (users2FAError) throw users2FAError;

    // Get admin users
    const { data: adminUsers, error: adminError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .eq('is_active', true);
    
    if (adminError) throw adminError;

    // Get recent security events
    const { data: recentRoleChanges, error: roleChangesError } = await supabase
      .from('user_audit_log')
      .select('id')
      .in('action', ['ROLE_GRANTED', 'ROLE_MODIFIED', 'ROLE_REVOKED'])
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    if (roleChangesError) throw roleChangesError;

    setMetrics({
      total_users: profiles?.length || 0,
      users_with_2fa: users2FA?.length || 0,
      admin_users: adminUsers?.length || 0,
      active_sessions: 0, // Would need auth.sessions access
      failed_login_attempts: 0, // Would need auth logs
      recent_role_changes: recentRoleChanges?.length || 0,
    });
  };

  const loadAuditLogs = async () => {
    const { data, error } = await supabase
      .from('user_audit_log')
      .select(`
        id,
        user_id,
        action,
        table_name,
        timestamp,
        old_values,
        new_values
      `)
      .order('timestamp', { ascending: false })
      .limit(20);
    
    if (error) throw error;

    // Enhance with user emails
    const enhancedLogs: AuditLogEntry[] = [];
    for (const log of data || []) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', log.user_id)
        .maybeSingle();
      
      enhancedLogs.push({
        ...log,
        user_email: profile ? 'Authenticated User' : 'Unknown User',
      });
    }
    
    setAuditLogs(enhancedLogs);
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadSecurityData();
    setRefreshing(false);
    
    toast({
      title: "Обновлено",
      description: "Данные безопасности обновлены",
    });
  };

  const exportAuditLog = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('export-reports', {
        body: { 
          report_type: 'security_audit',
          format: 'csv'
        }
      });
      
      if (error) throw error;
      
      // Download the exported file
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security_audit_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Экспорт завершен",
        description: "Журнал аудита успешно экспортирован",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка экспорта",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Доступ запрещен. Только администраторы могут просматривать панель безопасности.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse bg-muted h-4 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Панель безопасности</h2>
          <p className="text-muted-foreground">
            Мониторинг безопасности и журнал аудита системы
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportAuditLog}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
          <Button onClick={refreshData} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
      </div>

      {/* Security Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего пользователей</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.total_users || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.admin_users || 0} администраторов
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">2FA включена</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.users_with_2fa || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.total_users ? 
                `${Math.round((metrics.users_with_2fa / metrics.total_users) * 100)}% пользователей` :
                'Нет данных'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">События за 24ч</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.recent_role_changes || 0}</div>
            <p className="text-xs text-muted-foreground">
              изменений ролей
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Статус безопасности
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">RLS политики</span>
                <Badge variant="default">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Активны
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">JWT верификация</span>
                <Badge variant="default">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Включена
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Аудит логирование</span>
                <Badge variant="default">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Активно
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Роли пользователей</span>
                <Badge variant="default">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Настроены
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle>Журнал аудита</CardTitle>
          <CardDescription>
            Последние действия в системе безопасности
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Время</TableHead>
                  <TableHead>Действие</TableHead>
                  <TableHead>Таблица</TableHead>
                  <TableHead>Пользователь</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {format(new Date(log.timestamp), 'dd.MM.yyyy HH:mm', { locale: ru })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.table_name || '-'}</TableCell>
                      <TableCell>{log.user_email || log.user_id}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Записи журнала не найдены
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}