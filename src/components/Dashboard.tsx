import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Clock, DollarSign, AlertTriangle, Plus, Calendar } from "lucide-react";
import heroImage from "@/assets/construction-hero.jpg";

const mockData = {
  totalWorkers: 24,
  presentToday: 18,
  totalDebt: 145000,
  paidThisMonth: 890000,
  recentActivity: [
    { worker: "Иванов Петр", action: "Отмечен на объекте", time: "08:30", status: "present" },
    { worker: "Сидоров Алексей", action: "Получил оплату", time: "17:45", status: "paid" },
    { worker: "Петров Михаил", action: "Болен", time: "07:00", status: "sick" },
  ]
};

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-64 bg-gradient-to-r from-primary to-accent overflow-hidden">
        <img 
          src={heroImage} 
          alt="Construction site management"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-2">Учет работников стройплощадки</h1>
            <p className="text-xl opacity-90">Простая система управления персоналом</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего работников</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockData.totalWorkers}</div>
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
              <div className="text-2xl font-bold text-success">{mockData.presentToday}</div>
              <p className="text-xs text-muted-foreground">
                Из {mockData.totalWorkers} работников
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
                {mockData.totalDebt.toLocaleString()}₽
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
                {mockData.paidThisMonth.toLocaleString()}₽
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
                {mockData.recentActivity.map((activity, index) => (
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
                  {[
                    { name: "Иванов Петр Сергеевич", rate: 2500, days: 22, debt: 7500, status: "present" },
                    { name: "Сидоров Алексей Владимирович", rate: 3000, days: 20, debt: 0, status: "paid" },
                    { name: "Петров Михаил Иванович", rate: 2800, days: 18, debt: 11200, status: "sick" },
                    { name: "Козлов Дмитрий Андреевич", rate: 2700, days: 23, debt: 5400, status: "present" },
                  ].map((worker, index) => (
                    <tr key={index} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{worker.name}</td>
                      <td className="p-3">{worker.rate.toLocaleString()}₽</td>
                      <td className="p-3">{worker.days}</td>
                      <td className="p-3">
                        <span className={worker.debt > 0 ? "text-warning font-medium" : "text-success"}>
                          {worker.debt > 0 ? `${worker.debt.toLocaleString()}₽` : "—"}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge 
                          variant={
                            worker.status === 'present' ? 'default' : 
                            worker.status === 'paid' ? 'secondary' : 
                            'destructive'
                          }
                        >
                          {worker.status === 'present' ? 'На объекте' : 
                           worker.status === 'paid' ? 'Оплачено' : 
                           'Болен'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}