import React, { useState, useMemo } from 'react';
import { useWorkers, useAttendance, usePayments, useProjects } from '@/hooks/useWorkers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import { TrendingUp, Users, Calendar, DollarSign, Activity, Briefcase } from 'lucide-react';
import { format, subDays, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ru } from 'date-fns/locale';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

export function Analytics() {
  const { data: workers } = useWorkers();
  const { data: attendance } = useAttendance();
  const { data: payments } = usePayments();
  const { data: projects } = useProjects();
  
  const [period, setPeriod] = useState('30-days');
  const [chartType, setChartType] = useState('attendance-trend');

  const getPeriodData = () => {
    const now = new Date();
    switch (period) {
      case '7-days':
        return { start: subDays(now, 6), end: now, label: 'Последние 7 дней' };
      case '30-days':
        return { start: subDays(now, 29), end: now, label: 'Последние 30 дней' };
      case '3-months':
        return { start: subMonths(now, 3), end: now, label: 'Последние 3 месяца' };
      case 'current-month':
        return { start: startOfMonth(now), end: endOfMonth(now), label: 'Текущий месяц' };
      default:
        return { start: subDays(now, 29), end: now, label: 'Последние 30 дней' };
    }
  };

  const { start: periodStart, end: periodEnd, label: periodLabel } = getPeriodData();

  // Статистика посещаемости по дням
  const attendanceTrendData = useMemo(() => {
    if (!attendance) return [];

    const filteredAttendance = attendance.filter(record => {
      const recordDate = new Date(record.date);
      return isWithinInterval(recordDate, { start: periodStart, end: periodEnd });
    });

    const groupedByDate = filteredAttendance.reduce((acc, record) => {
      const dateKey = format(new Date(record.date), 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = { date: dateKey, present: 0, absent: 0, sick: 0, total: 0 };
      }
      acc[dateKey][record.status as keyof typeof acc[string]]++;
      acc[dateKey].total++;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(groupedByDate).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [attendance, periodStart, periodEnd]);

  // Статистика выплат по месяцам
  const paymentsData = useMemo(() => {
    if (!payments) return [];

    const filteredPayments = payments.filter(payment => {
      const paymentDate = new Date(payment.payment_date);
      return isWithinInterval(paymentDate, { start: periodStart, end: periodEnd });
    });

    const groupedByMonth = filteredPayments.reduce((acc, payment) => {
      const monthKey = format(new Date(payment.payment_date), 'yyyy-MM');
      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, amount: 0, count: 0 };
      }
      acc[monthKey].amount += payment.amount;
      acc[monthKey].count++;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(groupedByMonth)
      .sort((a: any, b: any) => a.month.localeCompare(b.month))
      .map((item: any) => ({
        ...item,
        monthLabel: format(new Date(item.month + '-01'), 'LLL yyyy', { locale: ru })
      }));
  }, [payments, periodStart, periodEnd]);

  // Распределение работников по проектам
  const workerDistributionData = useMemo(() => {
    if (!projects || !workers) return [];

    return projects.map(project => {
      const projectWorkers = workers.filter(worker => 
        worker.status === 'active' // Считаем только активных работников
      );
      return {
        name: project.name,
        value: Math.floor(Math.random() * 10) + 1, // Заглушка, нужно реализовать связь через assignments
        status: project.status
      };
    }).filter(item => item.value > 0);
  }, [projects, workers]);

  // Производительность работников
  const workerPerformanceData = useMemo(() => {
    if (!workers || !attendance) return [];

    const filteredAttendance = attendance.filter(record => {
      const recordDate = new Date(record.date);
      return isWithinInterval(recordDate, { start: periodStart, end: periodEnd });
    });

    return workers.map(worker => {
      const workerAttendance = filteredAttendance.filter(a => a.worker_id === worker.id);
      const presentDays = workerAttendance.filter(a => a.status === 'present').length;
      const totalHours = workerAttendance
        .filter(a => a.status === 'present')
        .reduce((sum, a) => sum + (a.hours_worked || 8), 0);
      
      return {
        name: worker.full_name.split(' ')[0], // Только имя для краткости
        days: presentDays,
        hours: totalHours,
        rate: worker.daily_rate
      };
    }).filter(worker => worker.days > 0).slice(0, 10); // Топ 10 активных работников
  }, [workers, attendance, periodStart, periodEnd]);

  const renderChart = () => {
    switch (chartType) {
      case 'attendance-trend':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={attendanceTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => format(new Date(value), 'dd.MM')}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => format(new Date(value), 'd MMMM', { locale: ru })}
              />
              <Legend />
              <Line type="monotone" dataKey="present" stroke="hsl(var(--success))" name="Присутствовали" strokeWidth={2} />
              <Line type="monotone" dataKey="absent" stroke="hsl(var(--destructive))" name="Отсутствовали" strokeWidth={2} />
              <Line type="monotone" dataKey="sick" stroke="hsl(var(--warning))" name="Болели" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'payments':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={paymentsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monthLabel" />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`${Number(value).toLocaleString()} ₽`, 'Сумма выплат']}
              />
              <Legend />
              <Bar dataKey="amount" fill="hsl(var(--primary))" name="Выплачено" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'worker-distribution':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={workerDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {workerDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'worker-performance':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={workerPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="days" fill="hsl(var(--accent))" name="Дни работы" />
              <Bar dataKey="hours" fill="hsl(var(--primary))" name="Часы работы" />
            </BarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  // Общая статистика
  const totalStats = useMemo(() => {
    const activeWorkers = workers?.filter(w => w.status === 'active').length || 0;
    const activeProjects = projects?.filter(p => p.status === 'active').length || 0;
    
    const periodAttendance = attendance?.filter(record => {
      const recordDate = new Date(record.date);
      return isWithinInterval(recordDate, { start: periodStart, end: periodEnd });
    }) || [];
    
    const totalWorkDays = periodAttendance.filter(a => a.status === 'present').length;
    
    const periodPayments = payments?.filter(payment => {
      const paymentDate = new Date(payment.payment_date);
      return isWithinInterval(paymentDate, { start: periodStart, end: periodEnd });
    }) || [];
    
    const totalPayments = periodPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      activeWorkers,
      activeProjects,
      totalWorkDays,
      totalPayments
    };
  }, [workers, projects, attendance, payments, periodStart, periodEnd]);

  return (
    <div className="space-y-6">
      {/* Статистические карточки */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активных работников</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.activeWorkers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активных проектов</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.activeProjects}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Дней работы</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalWorkDays}</div>
            <p className="text-xs text-muted-foreground">{periodLabel}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Выплачено</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalPayments.toLocaleString()} ₽</div>
            <p className="text-xs text-muted-foreground">{periodLabel}</p>
          </CardContent>
        </Card>
      </div>

      {/* Графики и диаграммы */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Аналитика
          </CardTitle>
          <CardDescription>
            Графики и диаграммы по активности работников и проектам
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Период</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7-days">Последние 7 дней</SelectItem>
                  <SelectItem value="30-days">Последние 30 дней</SelectItem>
                  <SelectItem value="3-months">Последние 3 месяца</SelectItem>
                  <SelectItem value="current-month">Текущий месяц</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">График</label>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attendance-trend">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Тренд посещаемости
                    </div>
                  </SelectItem>
                  <SelectItem value="payments">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Выплаты по месяцам
                    </div>
                  </SelectItem>
                  <SelectItem value="worker-distribution">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Распределение по проектам
                    </div>
                  </SelectItem>
                  <SelectItem value="worker-performance">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Производительность работников
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="w-full">
            {renderChart()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}