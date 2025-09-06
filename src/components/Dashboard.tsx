import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Clock, DollarSign, AlertTriangle, Plus, Calendar, LogOut, Bot } from "lucide-react";
import heroImage from "@/assets/construction-hero.jpg";
import { useAuth } from "@/hooks/useAuth";
import { useWorkers, useAttendance, usePayments } from "@/hooks/useWorkers";
import { TelegramBotSetup } from "./TelegramBotSetup";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: workers, isLoading: workersLoading } = useWorkers();
  const { data: attendance, isLoading: attendanceLoading } = useAttendance();
  const { data: payments, isLoading: paymentsLoading } = usePayments();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading || workersLoading || attendanceLoading || paymentsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Calculate statistics from real data
  const totalWorkers = workers?.length || 0;
  const today = new Date().toISOString().split('T')[0];
  const presentToday = attendance?.filter(a => a.date === today && a.status === 'present').length || 0;
  
  const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  const monthlyPayments = payments?.filter(p => p.payment_date.startsWith(thisMonth)) || [];
  const paidThisMonth = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);

  // Calculate debt (simplified - would need more complex logic for real app)
  const totalDebt = 145000; // Placeholder for debt calculation

  // Recent activity from attendance and payments
  const recentActivity = [
    ...(attendance?.slice(0, 2).map(a => ({
      worker: a.worker?.full_name || "Неизвестный работник",
      action: a.status === 'present' ? "Отмечен на объекте" : 
              a.status === 'sick' ? "Болен" : "Отсутствует",
      time: new Date(a.created_at).toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      status: a.status
    })) || []),
    ...(payments?.slice(0, 1).map(p => ({
      worker: p.worker?.full_name || "Неизвестный работник",
      action: "Получил оплату",
      time: new Date(p.payment_date).toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      status: "paid" as const
    })) || [])
  ];
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-64 bg-gradient-to-r from-primary to-accent overflow-hidden">
        <img 
          src={heroImage} 
          alt="Construction site management"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="relative z-10 h-full flex items-center justify-between px-8">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-2">Учет работников стройплощадки</h1>
            <p className="text-xl opacity-90">Простая система управления персоналом</p>
          </div>
          <Button 
            variant="outline" 
            onClick={signOut}
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Выйти
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="dashboard">📊 Панель управления</TabsTrigger>
            <TabsTrigger value="telegram">
              <Bot className="w-4 h-4 mr-2" />
              Telegram бот
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего работников</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalWorkers}</div>
              <p className="text-xs text-muted-foreground">
                Активных сотрудников
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">На объекте сегодня</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{presentToday}</div>
              <p className="text-xs text-muted-foreground">
                Из {totalWorkers} работников
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Задолженность</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {totalDebt.toLocaleString()}₽
              </div>
              <p className="text-xs text-muted-foreground">
                Требует выплаты
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Выплачено в месяце</CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {paidThisMonth.toLocaleString()}₽
              </div>
              <p className="text-xs text-muted-foreground">
                За текущий период
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Быстрые действия</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" variant="default">
                <Plus className="mr-2 h-4 w-4" />
                Добавить работника
              </Button>
              <Button className="w-full" variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Отметить присутствие
              </Button>
              <Button className="w-full" variant="outline">
                <DollarSign className="mr-2 h-4 w-4" />
                Произвести выплату
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Последние действия</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <p className="font-medium">{activity.worker}</p>
                        <p className="text-sm text-muted-foreground">{activity.action}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={
                          activity.status === 'present' ? 'default' : 
                          activity.status === 'paid' ? 'secondary' : 
                          'destructive'
                        }
                      >
                        {activity.status === 'present' ? 'Присутствует' : 
                         activity.status === 'paid' ? 'Оплачено' : 
                         'Болен'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{activity.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workers Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle>Статус работников</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">ФИО</th>
                    <th className="text-left p-3">Ставка/день</th>
                    <th className="text-left p-3">Дней в месяце</th>
                    <th className="text-left p-3">К доплате</th>
                    <th className="text-left p-3">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {workers?.map((worker, index) => {
                    // Get today's attendance for this worker
                    const todayAttendance = attendance?.find(a => 
                      a.worker_id === worker.id && a.date === today
                    );
                    
                    // Calculate worked days this month for this worker
                    const workedDaysThisMonth = attendance?.filter(a => 
                      a.worker_id === worker.id && 
                      a.date.startsWith(thisMonth) && 
                      a.status === 'present'
                    ).length || 0;
                    
                    // Calculate debt (simplified)
                    const debt = workedDaysThisMonth * worker.daily_rate;
                    
                    return (
                      <tr key={index} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-medium">{worker.full_name}</td>
                        <td className="p-3">{worker.daily_rate.toLocaleString()}₽</td>
                        <td className="p-3">{workedDaysThisMonth}</td>
                        <td className="p-3">
                          <span className={debt > 0 ? "text-warning font-medium" : "text-success"}>
                            {debt > 0 ? `${debt.toLocaleString()}₽` : "—"}
                          </span>
                        </td>
                        <td className="p-3">
                          <Badge 
                            variant={
                              todayAttendance?.status === 'present' ? 'default' : 
                              todayAttendance?.status === 'sick' ? 'destructive' :
                              'secondary'
                            }
                          >
                            {todayAttendance?.status === 'present' ? 'На объекте' : 
                             todayAttendance?.status === 'sick' ? 'Болен' : 
                             'Не отмечен'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  }) || []}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="telegram" className="space-y-8">
            <TelegramBotSetup />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}