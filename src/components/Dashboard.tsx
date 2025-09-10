import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useWorkers, useAttendance, usePayments } from "@/hooks/useWorkers";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { AddWorkerDialog } from "./AddWorkerDialog";
import { AttendanceDialog } from "./AttendanceDialog";
import { PaymentDialog } from "./PaymentDialog";
import { WorkersManagement } from "./WorkersManagement";
import { TelegramBotSetup } from "./TelegramBotSetup";
import { Reports } from "./Reports";
import { Analytics } from "./Analytics";
import { 
  Users, 
  Calendar, 
  DollarSign, 
  UserPlus, 
  Clock, 
  CreditCard, 
  LogOut,
  Activity,
  TrendingUp,
  FileText,
  Bot,
  Crown,
  Shield,
  AlertTriangle
} from "lucide-react";

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: workers, isLoading: workersLoading } = useWorkers();
  const { data: attendance, isLoading: attendanceLoading } = useAttendance();
  const { data: payments, isLoading: paymentsLoading } = usePayments();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Выход выполнен",
      description: "До свидания!",
    });
  };

  if (loading || profileLoading || workersLoading || attendanceLoading || paymentsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка защищенной системы...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = profile?.role === 'admin';

  // Show access denied for non-admin users
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-destructive">Доступ ограничен</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              У вас нет прав доступа к системе управления. Обратитесь к администратору для получения доступа.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Пользователь: {profile?.full_name || user.email}
              </p>
              <p className="text-sm text-muted-foreground">
                Роль: {profile?.role || 'пользователь'}
              </p>
            </div>
            <Button onClick={handleSignOut} variant="outline" className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Выйти
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate statistics
  const totalWorkers = workers?.length || 0;
  const today = new Date().toISOString().split('T')[0];
  const todayPresentCount = attendance?.filter(a => a.date === today && a.status === 'present').length || 0;
  
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyPayments = payments?.filter(p => p.payment_date.startsWith(thisMonth)) || [];
  const monthlyPaid = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);

  // Calculate total debt
  const totalDebt = workers?.reduce((sum, worker) => {
    const workerAttendance = attendance?.filter(a => a.worker_id === worker.id && a.status === 'present') || [];
    const workerPayments = payments?.filter(p => p.worker_id === worker.id) || [];
    const earned = workerAttendance.length * worker.daily_rate;
    const paid = workerPayments.reduce((pSum, p) => pSum + p.amount, 0);
    return sum + (earned - paid);
  }, 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Secure Header */}
      <div className="relative dashboard-hero bg-gradient-to-r from-primary via-primary to-accent overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 h-full flex items-center justify-between px-4 md:px-8 py-6">
          <div className="text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">СтройМенеджер</h1>
                <p className="text-sm opacity-90 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Защищенная система управления
                  <Crown className="h-4 w-4 ml-1" />
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-white text-right">
              <p className="text-sm opacity-90 flex items-center justify-end gap-1">
                <Crown className="h-3 w-3" />
                Администратор
              </p>
              <p className="font-medium">{profile?.full_name || user?.email}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">Выйти</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Security Notice */}
        <Alert className="mb-6 border-green-200 bg-green-50 text-green-800">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Система защищена:</strong> Включена аутентификация и авторизация на основе ролей. 
            Все данные защищены политиками безопасности уровня строк (RLS).
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="dashboard" className="w-full dashboard-tabs">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 mb-8 tabs-list">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Панель</span>
            </TabsTrigger>
            <TabsTrigger value="workers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Работники</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Отчеты</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Аналитика</span>
            </TabsTrigger>
            <TabsTrigger value="telegram" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">Бот</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 stats-grid">
              <Card className="mobile-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium mobile-text">Всего работников</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalWorkers}</div>
                </CardContent>
              </Card>

              <Card className="mobile-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium mobile-text">Сегодня присутствуют</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{todayPresentCount}</div>
                </CardContent>
              </Card>

              <Card className="mobile-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium mobile-text">Общий долг</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">{totalDebt.toLocaleString()} ₽</div>
                </CardContent>
              </Card>

              <Card className="mobile-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium mobile-text">Выплачено в месяце</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{monthlyPaid.toLocaleString()} ₽</div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Быстрые действия</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 actions-grid">
                  <AddWorkerDialog />
                  <AttendanceDialog />
                  <PaymentDialog />
                </div>
              </CardContent>
            </Card>

            {/* Workers Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle>Статус работников</CardTitle>
                <CardDescription>Общая информация по всем работникам</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="table-wrapper">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Имя</TableHead>
                        <TableHead className="hidden md:table-cell">Ставка</TableHead>
                        <TableHead className="hidden sm:table-cell">Дней работал</TableHead>
                        <TableHead>К доплате</TableHead>
                        <TableHead className="hidden md:table-cell">Статус</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workers?.map((worker) => {
                        const workerAttendance = attendance?.filter(a => 
                          a.worker_id === worker.id && a.status === 'present'
                        ) || [];
                        
                        const workerPayments = payments?.filter(p => 
                          p.worker_id === worker.id
                        ) || [];
                        
                        const totalEarned = workerAttendance.length * worker.daily_rate;
                        const totalPaid = workerPayments.reduce((sum, p) => sum + p.amount, 0);
                        const balance = totalEarned - totalPaid;
                        
                        const todayAttendance = attendance?.find(a => 
                          a.worker_id === worker.id && 
                          format(new Date(a.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                        );

                        return (
                          <TableRow key={worker.id}>
                            <TableCell className="font-medium mobile-text">{worker.full_name}</TableCell>
                            <TableCell className="hidden md:table-cell mobile-text">{worker.daily_rate.toLocaleString()} ₽</TableCell>
                            <TableCell className="hidden sm:table-cell mobile-text">{workerAttendance.length}</TableCell>
                            <TableCell className="mobile-text">
                              <span className={balance > 0 ? 'text-warning' : balance < 0 ? 'text-destructive' : 'text-muted-foreground'}>
                                {balance.toLocaleString()} ₽
                              </span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex gap-2 flex-wrap">
                                <Badge 
                                  variant={worker.status === 'active' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {worker.status === 'active' ? 'Активен' : 'Неактивен'}
                                </Badge>
                                {todayAttendance && (
                                  <Badge 
                                    variant={
                                      todayAttendance.status === 'present' ? 'default' : 
                                      todayAttendance.status === 'sick' ? 'secondary' : 'outline'
                                    }
                                    className="text-xs"
                                  >
                                    {todayAttendance.status === 'present' ? 'Присутствует' :
                                     todayAttendance.status === 'sick' ? 'Болеет' : 'Отсутствует'}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workers" className="space-y-6">
            <WorkersManagement />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Reports />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Analytics />
          </TabsContent>

          <TabsContent value="telegram" className="space-y-6">
            <TelegramBotSetup />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}