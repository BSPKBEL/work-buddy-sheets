import { useState, useEffect } from "react";
import { useSecureAuth } from "@/hooks/useSecureAuth";
import { useWorkers, useAttendance, usePayments } from "@/hooks/useWorkers";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { AddWorkerDialog } from "./AddWorkerDialog";
import { AttendanceDialog } from "./AttendanceDialog";
import { PaymentDialog } from "./PaymentDialog";
import { WorkersManagement } from "./WorkersManagement";
import { WorkerRating } from "./WorkerRating";
import { ProjectsManagement } from "./ProjectsManagement";
import { WorkerSkillsManagement } from "./WorkerSkillsManagement";
import { ExpenseManagement } from "./ExpenseManagement";
import TelegramBotSetup from "./TelegramBotSetup";
import Reports from "./Reports";
import SystemSettings from "./SystemSettings";
import { TemporaryPermissions } from "./TemporaryPermissions";
import { TwoFactorAuth } from "./TwoFactorAuth";
import { Analytics } from "./Analytics";
import { SecureClientsManagement } from "./SecureClientsManagement";
import { SecurityDashboard } from "./SecurityDashboard";
import { AppSidebar } from "./AppSidebar";
import { AppBreadcrumb } from "./AppBreadcrumb";
import { GlobalSearch } from "./GlobalSearch";
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
  AlertTriangle,
  Menu
} from "lucide-react";

export default function Dashboard() {
  const { 
    user, 
    loading, 
    signOut, 
    isAdmin, 
    canAccessAdmin, 
    primaryRole,
    isFullyLoaded
  } = useSecureAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: workers, isLoading: workersLoading } = useWorkers();
  const { data: attendance, isLoading: attendanceLoading } = useAttendance();
  const { data: payments, isLoading: paymentsLoading } = usePayments();
  const [activeSection, setActiveSection] = useState("dashboard");

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

  if (loading || workersLoading || attendanceLoading || paymentsLoading || !isFullyLoaded) {
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

  const isAdminUser = isAdmin;

  // Show access denied for non-admin users
  if (!canAccessAdmin) {
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
                Пользователь: {user?.email}
              </p>
              <p className="text-sm text-muted-foreground">
                Роль: {primaryRole}
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

  const renderContent = () => {
    switch (activeSection) {
      case 'workers':
        return <WorkersManagement />;
      case 'workers-rating':
        return <WorkerRating />;
      case 'projects':
        return <ProjectsManagement />;
      case 'expenses':
        return <ExpenseManagement />;
      case 'add-worker':
        return <WorkerSkillsManagement />;
      case 'reports':
        return <Reports />;
      case 'analytics':
        return <Analytics />;
      case 'telegram':
        return <TelegramBotSetup />;
      case 'clients':
        return <SecureClientsManagement />;
      case 'security':
        return <SecurityDashboard />;
      case 'ai-settings':
        return <SystemSettings />;
      default:
        return (
          <div className="space-y-6">
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
        </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        
        <SidebarInset className="flex-1">
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-card px-3 md:px-4 overflow-hidden">
            <SidebarTrigger className="-ml-1 touch-friendly flex-shrink-0" />
            
            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
              <div className="min-w-0 flex-1">
                <AppBreadcrumb activeSection={activeSection} onSectionChange={setActiveSection} />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="hidden lg:flex items-center max-w-md">
                <GlobalSearch onSectionChange={setActiveSection} />
              </div>
              
              {/* Mobile search icon */}
              <div className="lg:hidden">
                <GlobalSearch onSectionChange={setActiveSection} />
              </div>
              
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <div className="hidden md:block text-right">
                    <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                      <Crown className="h-3 w-3" />
                      Администратор
                    </p>
                    <p className="font-medium text-xs truncate max-w-24">{user?.email}</p>
                  </div>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSignOut}
                  className="touch-friendly flex-shrink-0"
                >
                  <LogOut className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">Выйти</span>
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-4 md:p-6">
            {/* Security Notice */}
            <Alert className="mb-4 md:mb-6 border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Система защищена:</strong> Включена аутентификация и авторизация на основе ролей. 
                Все данные защищены политиками безопасности уровня строк (RLS).
              </AlertDescription>
            </Alert>

            {renderContent()}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}