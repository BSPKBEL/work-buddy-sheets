import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { CalendarDateRangePicker } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Download, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Clock, 
  FileText,
  BarChart3,
  PieChart,
  Target,
  AlertTriangle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  LineChart,
  Line,
  Pie
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Reports() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ from: '2024-01-01', to: new Date().toISOString().split('T')[0] });

  const handleExportReport = async (reportType: string, format: 'csv' | 'json' = 'csv') => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('export-reports', {
        body: {
          reportType,
          format,
          filters: {
            startDate: dateRange.from,
            endDate: dateRange.to,
            projectId: selectedProject !== 'all' ? selectedProject : undefined
          }
        }
      });

      if (error) throw error;

      // Create and trigger download
      const blob = new Blob([format === 'csv' ? data : JSON.stringify(data, null, 2)], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Отчет экспортирован",
        description: `Отчет "${reportType}" успешно сохранен в формате ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Ошибка экспорта",
        description: "Не удалось экспортировать отчет",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAnalytics = async () => {
    try {
      setLoading(true);
      
      // Mock analytics data - in real app, this would come from the analytics function
      const mockData = {
        financialSummary: {
          totalRevenue: 2500000,
          totalCosts: 1800000,
          profit: 700000,
          profitMargin: 28,
          activeProjects: 8,
          completedProjects: 15
        },
        projectPerformance: [
          { name: 'Офисное здание', budget: 500000, actual: 480000, profit: 20000 },
          { name: 'Жилой комплекс', budget: 800000, actual: 750000, profit: 50000 },
          { name: 'Торговый центр', budget: 1200000, actual: 1100000, profit: 100000 }
        ],
        expenseBreakdown: [
          { name: 'Материалы', value: 45, amount: 810000 },
          { name: 'Зарплата', value: 30, amount: 540000 },
          { name: 'Аренда техники', value: 15, amount: 270000 },
          { name: 'Транспорт', value: 10, amount: 180000 }
        ],
        monthlyTrends: [
          { month: 'Янв', revenue: 200000, costs: 150000 },
          { month: 'Фев', revenue: 220000, costs: 160000 },
          { month: 'Мар', revenue: 180000, costs: 140000 },
          { month: 'Апр', revenue: 250000, costs: 180000 },
          { month: 'Май', revenue: 280000, costs: 200000 },
          { month: 'Июн', revenue: 300000, costs: 220000 }
        ]
      };

      setReportData(mockData);
      
      toast({
        title: "Аналитика обновлена",
        description: "Данные успешно загружены",
      });
    } catch (error) {
      console.error('Analytics error:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить аналитику",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Отчеты и Аналитика</h1>
          <p className="text-muted-foreground">
            Финансовые отчеты, аналитика проектов и экспорт данных
          </p>
        </div>
        <Button onClick={generateAnalytics} disabled={loading}>
          {loading ? (
            <Clock className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <BarChart3 className="mr-2 h-4 w-4" />
          )}
          Обновить данные
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="financial">Финансы</TabsTrigger>
          <TabsTrigger value="projects">Проекты</TabsTrigger>
          <TabsTrigger value="export">Экспорт</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {reportData && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Общая выручка</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {reportData.financialSummary.totalRevenue.toLocaleString()} ₽
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +{reportData.financialSummary.profitMargin}% рентабельность
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Прибыль</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {reportData.financialSummary.profit.toLocaleString()} ₽
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Маржа {reportData.financialSummary.profitMargin}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Активные проекты</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {reportData.financialSummary.activeProjects}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {reportData.financialSummary.completedProjects} завершено
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Общие затраты</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {reportData.financialSummary.totalCosts.toLocaleString()} ₽
                  </div>
                  <p className="text-xs text-muted-foreground">
                    72% от выручки
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {reportData && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Динамика по месяцам</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={reportData.monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Выручка" />
                      <Line type="monotone" dataKey="costs" stroke="#82ca9d" name="Затраты" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Структура расходов</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={reportData.expenseBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {reportData.expenseBreakdown.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          {reportData && (
            <Card>
              <CardHeader>
                <CardTitle>Эффективность проектов</CardTitle>
                <CardDescription>
                  Сравнение запланированного и фактического бюджета по проектам
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={reportData.projectPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="budget" fill="#8884d8" name="Бюджет" />
                    <Bar dataKey="actual" fill="#82ca9d" name="Фактически" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Аналитика проектов</CardTitle>
              <CardDescription>
                Детальный анализ производительности и рентабельности проектов
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex gap-4">
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Выберите проект" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все проекты</SelectItem>
                      <SelectItem value="1">Офисное здание</SelectItem>
                      <SelectItem value="2">Жилой комплекс</SelectItem>
                      <SelectItem value="3">Торговый центр</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button 
                    variant="outline"
                    onClick={() => handleExportReport('projects_financial')}
                    disabled={loading}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Экспорт данных
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  Выберите проект для получения детальной аналитики с AI-инсайтами
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Финансовые отчеты
                </CardTitle>
                <CardDescription>
                  Отчеты по прибыли и убыткам, рентабельности проектов
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full"
                  onClick={() => handleExportReport('projects_financial', 'csv')}
                  disabled={loading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Экспорт CSV
                </Button>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => handleExportReport('projects_financial', 'json')}
                  disabled={loading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Экспорт JSON
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Отчеты по работникам
                </CardTitle>
                <CardDescription>
                  Производительность, посещаемость, зарплатный фонд
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full"
                  onClick={() => handleExportReport('workers_performance', 'csv')}
                  disabled={loading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Экспорт CSV
                </Button>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => handleExportReport('workers_performance', 'json')}
                  disabled={loading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Экспорт JSON
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Отчеты по расходам
                </CardTitle>
                <CardDescription>
                  Детализация расходов по категориям и проектам
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full"
                  onClick={() => handleExportReport('expenses_breakdown', 'csv')}
                  disabled={loading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Экспорт CSV
                </Button>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => handleExportReport('expenses_breakdown', 'json')}
                  disabled={loading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Экспорт JSON
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Настройки экспорта</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Период отчета</label>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="date"
                      value={dateRange.from}
                      onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <input
                      type="date"
                      value={dateRange.to}
                      onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}