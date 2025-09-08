import React, { useState } from 'react';
import { useWorkers, useAttendance, usePayments, useProjects, useWorkerAssignments } from '@/hooks/useWorkers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileDown, Calendar, User, Briefcase, DollarSign } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { ru } from 'date-fns/locale';

export function Reports() {
  const { data: workers } = useWorkers();
  const { data: attendance } = useAttendance();
  const { data: payments } = usePayments();
  const { data: projects } = useProjects();
  const { data: assignments } = useWorkerAssignments();
  
  const [reportType, setReportType] = useState('worker-summary');
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [selectedWorker, setSelectedWorker] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');

  const getPeriodDates = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case 'current-month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'previous-month':
        const prevMonth = subMonths(now, 1);
        return { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) };
      case 'last-3-months':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { start: periodStart, end: periodEnd } = getPeriodDates();

  const filteredAttendance = attendance?.filter(record => {
    const recordDate = new Date(record.date);
    const inPeriod = isWithinInterval(recordDate, { start: periodStart, end: periodEnd });
    const matchesWorker = selectedWorker === 'all' || record.worker_id === selectedWorker;
    return inPeriod && matchesWorker;
  });

  const filteredPayments = payments?.filter(payment => {
    const paymentDate = new Date(payment.payment_date);
    const inPeriod = isWithinInterval(paymentDate, { start: periodStart, end: periodEnd });
    const matchesWorker = selectedWorker === 'all' || payment.worker_id === selectedWorker;
    return inPeriod && matchesWorker;
  });

  const generateWorkerSummaryReport = () => {
    if (!workers || !filteredAttendance || !filteredPayments) return [];

    return workers.map(worker => {
      const workerAttendance = filteredAttendance.filter(a => a.worker_id === worker.id);
      const workerPayments = filteredPayments.filter(p => p.worker_id === worker.id);
      
      const totalDaysWorked = workerAttendance.filter(a => a.status === 'present').length;
      const totalHours = workerAttendance
        .filter(a => a.status === 'present')
        .reduce((sum, a) => sum + (a.hours_worked || 8), 0);
      const totalEarned = totalDaysWorked * worker.daily_rate;
      const totalPaid = workerPayments.reduce((sum, p) => sum + p.amount, 0);
      const balance = totalEarned - totalPaid;

      return {
        worker,
        totalDaysWorked,
        totalHours,
        totalEarned,
        totalPaid,
        balance,
        lastAttendance: workerAttendance[0]?.date,
        lastPayment: workerPayments[0]?.payment_date
      };
    });
  };

  const generateProjectReport = () => {
    if (!projects || !assignments || !filteredAttendance) return [];

    return projects.map(project => {
      const projectAssignments = assignments?.filter(a => a.project_id === project.id) || [];
      const workerIds = projectAssignments.map(a => a.worker_id);
      const projectAttendance = filteredAttendance.filter(a => workerIds.includes(a.worker_id));
      
      const totalWorkers = projectAssignments.length;
      const totalDaysWorked = projectAttendance.filter(a => a.status === 'present').length;
      const totalHours = projectAttendance
        .filter(a => a.status === 'present')
        .reduce((sum, a) => sum + (a.hours_worked || 8), 0);
      
      const activeDays = [...new Set(projectAttendance.map(a => a.date))].length;

      return {
        project,
        totalWorkers,
        totalDaysWorked,
        totalHours,
        activeDays
      };
    });
  };

  const exportToCSV = () => {
    const data = reportType === 'worker-summary' ? generateWorkerSummaryReport() : generateProjectReport();
    
    let csvContent = '';
    if (reportType === 'worker-summary') {
      csvContent = 'Работник,Дней работал,Часов,Заработано,Выплачено,Баланс,Последняя явка,Последняя выплата\n';
      data.forEach((row: any) => {
        csvContent += `"${row.worker.full_name}",${row.totalDaysWorked},${row.totalHours},${row.totalEarned},${row.totalPaid},${row.balance},"${row.lastAttendance || ''}","${row.lastPayment || ''}"\n`;
      });
    } else {
      csvContent = 'Проект,Работников,Дней работы,Часов,Активных дней\n';
      data.forEach((row: any) => {
        csvContent += `"${row.project.name}",${row.totalWorkers},${row.totalDaysWorked},${row.totalHours},${row.activeDays}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `report-${reportType}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const workerSummaryData = generateWorkerSummaryReport();
  const projectData = generateProjectReport();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Отчеты
          </CardTitle>
          <CardDescription>
            Детальные отчеты по работникам и проектам
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Тип отчета</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="worker-summary">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Сводка по работникам
                    </div>
                  </SelectItem>
                  <SelectItem value="project-summary">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Сводка по проектам
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Период</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-month">Текущий месяц</SelectItem>
                  <SelectItem value="previous-month">Прошлый месяц</SelectItem>
                  <SelectItem value="last-3-months">Последние 3 месяца</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === 'worker-summary' && (
              <div className="space-y-2">
                <Label>Работник</Label>
                <Select value={selectedWorker} onValueChange={setSelectedWorker}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все работники</SelectItem>
                    {workers?.map(worker => (
                      <SelectItem key={worker.id} value={worker.id}>
                        {worker.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-end">
              <Button onClick={exportToCSV} className="w-full">
                <FileDown className="mr-2 h-4 w-4" />
                Экспорт CSV
              </Button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground mb-4">
            Период: {format(periodStart, 'd MMMM yyyy', { locale: ru })} - {format(periodEnd, 'd MMMM yyyy', { locale: ru })}
          </div>

          {reportType === 'worker-summary' && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Работник</TableHead>
                    <TableHead>Позиция</TableHead>
                    <TableHead>Дней работал</TableHead>
                    <TableHead>Часов</TableHead>
                    <TableHead>Заработано</TableHead>
                    <TableHead>Выплачено</TableHead>
                    <TableHead>Баланс</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workerSummaryData.map((row) => (
                    <TableRow key={row.worker.id}>
                      <TableCell className="font-medium">{row.worker.full_name}</TableCell>
                      <TableCell>{row.worker.position || 'Не указана'}</TableCell>
                      <TableCell>{row.totalDaysWorked}</TableCell>
                      <TableCell>{row.totalHours}</TableCell>
                      <TableCell>{row.totalEarned.toLocaleString()} ₽</TableCell>
                      <TableCell>{row.totalPaid.toLocaleString()} ₽</TableCell>
                      <TableCell>
                        <span className={row.balance > 0 ? 'text-warning' : row.balance < 0 ? 'text-destructive' : 'text-muted-foreground'}>
                          {row.balance.toLocaleString()} ₽
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.worker.status === 'active' ? 'default' : 'secondary'}>
                          {row.worker.status === 'active' ? 'Активен' : 'Неактивен'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {reportType === 'project-summary' && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Проект</TableHead>
                    <TableHead>Адрес</TableHead>
                    <TableHead>Работников</TableHead>
                    <TableHead>Дней работы</TableHead>
                    <TableHead>Часов</TableHead>
                    <TableHead>Активных дней</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectData.map((row) => (
                    <TableRow key={row.project.id}>
                      <TableCell className="font-medium">{row.project.name}</TableCell>
                      <TableCell>{row.project.address || 'Не указан'}</TableCell>
                      <TableCell>{row.totalWorkers}</TableCell>
                      <TableCell>{row.totalDaysWorked}</TableCell>
                      <TableCell>{row.totalHours}</TableCell>
                      <TableCell>{row.activeDays}</TableCell>
                      <TableCell>
                        <Badge variant={row.project.status === 'active' ? 'default' : 'secondary'}>
                          {row.project.status === 'active' ? 'Активен' : 'Завершен'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}