import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  useProjectExpenses, 
  useWorkerExpenses, 
  useExpenseCategories,
  useCreateExpense,
  useProjects
} from "@/hooks/useProjects";
import { useWorkers } from "@/hooks/useWorkers";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { 
  DollarSign, 
  Plus, 
  Building, 
  Users, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Wallet
} from "lucide-react";

function ExpenseDialog() {
  const [open, setOpen] = useState(false);
  const [expenseType, setExpenseType] = useState<'project' | 'worker'>('project');
  const [formData, setFormData] = useState({
    project_id: "",
    worker_id: "",
    category_id: "",
    amount: "",
    description: "",
    date: new Date().toISOString().split('T')[0]
  });

  const { data: projects } = useProjects();
  const { data: workers } = useWorkers();
  const { data: categories } = useExpenseCategories();
  const createExpense = useCreateExpense();

  const filteredCategories = categories?.filter(cat => 
    cat.type === expenseType || cat.type === 'general'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const table = expenseType === 'project' ? 'project_expenses' : 'worker_expenses';
    const expenseData = {
      category_id: formData.category_id,
      amount: parseFloat(formData.amount),
      description: formData.description,
      date: formData.date,
      ...(expenseType === 'project' 
        ? { project_id: formData.project_id }
        : { worker_id: formData.worker_id }
      )
    };

    createExpense.mutate({ table, expenseData }, {
      onSuccess: () => {
        setOpen(false);
        setFormData({
          project_id: "",
          worker_id: "",
          category_id: "",
          amount: "",
          description: "",
          date: new Date().toISOString().split('T')[0]
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Добавить расход
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый расход</DialogTitle>
          <DialogDescription>
            Добавьте новый расход по проекту или работнику
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Тип расхода</Label>
            <Select value={expenseType} onValueChange={(value: 'project' | 'worker') => setExpenseType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="project">Расходы по проекту</SelectItem>
                <SelectItem value="worker">Расходы на работника</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {expenseType === 'project' ? (
            <div>
              <Label htmlFor="project_id">Проект *</Label>
              <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите проект" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label htmlFor="worker_id">Работник *</Label>
              <Select value={formData.worker_id} onValueChange={(value) => setFormData({ ...formData, worker_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите работника" />
                </SelectTrigger>
                <SelectContent>
                  {workers?.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="category_id">Категория *</Label>
            <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name} - {category.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Сумма (₽) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="date">Дата</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Детали расхода..."
            />
          </div>

          <Button type="submit" className="w-full" disabled={createExpense.isPending}>
            {createExpense.isPending ? "Сохранение..." : "Добавить расход"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ExpenseManagement() {
  const { data: projectExpenses, isLoading: projectExpensesLoading } = useProjectExpenses();
  const { data: workerExpenses, isLoading: workerExpensesLoading } = useWorkerExpenses();
  const { data: categories } = useExpenseCategories();

  if (projectExpensesLoading || workerExpensesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalProjectExpenses = projectExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
  const totalWorkerExpenses = workerExpenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
  const totalExpenses = totalProjectExpenses + totalWorkerExpenses;

  const currentMonthProjectExpenses = projectExpenses?.filter(exp => 
    new Date(exp.date).getMonth() === new Date().getMonth() &&
    new Date(exp.date).getFullYear() === new Date().getFullYear()
  ).reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

  const currentMonthWorkerExpenses = workerExpenses?.filter(exp => 
    new Date(exp.date).getMonth() === new Date().getMonth() &&
    new Date(exp.date).getFullYear() === new Date().getFullYear()
  ).reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalExpenses.toLocaleString()} ₽</p>
                <p className="text-xs text-muted-foreground">Всего расходов</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-warning" />
              <div>
                <p className="text-2xl font-bold">{totalProjectExpenses.toLocaleString()} ₽</p>
                <p className="text-xs text-muted-foreground">По проектам</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-success" />
              <div>
                <p className="text-2xl font-bold">{totalWorkerExpenses.toLocaleString()} ₽</p>
                <p className="text-xs text-muted-foreground">На работников</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-2xl font-bold">
                  {(currentMonthProjectExpenses + currentMonthWorkerExpenses).toLocaleString()} ₽
                </p>
                <p className="text-xs text-muted-foreground">За месяц</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Управление расходами */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Учет расходов
              </CardTitle>
              <CardDescription>
                Отслеживание расходов по проектам и работникам
              </CardDescription>
            </div>
            <ExpenseDialog />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="projects" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="projects" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Расходы по проектам
              </TabsTrigger>
              <TabsTrigger value="workers" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Расходы на работников
              </TabsTrigger>
            </TabsList>

            <TabsContent value="projects" className="space-y-4">
              {projectExpenses && projectExpenses.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Проект</TableHead>
                      <TableHead>Категория</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Дата</TableHead>
                      <TableHead>Описание</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            {expense.projects?.name || 'Неизвестный проект'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {expense.expense_categories?.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-destructive">
                          <div className="flex items-center gap-1">
                            <ArrowUpRight className="h-3 w-3" />
                            {Number(expense.amount).toLocaleString()} ₽
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(expense.date), 'dd.MM.yyyy', { locale: ru })}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {expense.description || 'Без описания'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Нет расходов по проектам. Добавьте первый расход для начала учета.
                </p>
              )}
            </TabsContent>

            <TabsContent value="workers" className="space-y-4">
              {workerExpenses && workerExpenses.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Работник</TableHead>
                      <TableHead>Категория</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Дата</TableHead>
                      <TableHead>Описание</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workerExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {expense.workers?.full_name || 'Неизвестный работник'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {expense.expense_categories?.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-destructive">
                          <div className="flex items-center gap-1">
                            <ArrowUpRight className="h-3 w-3" />
                            {Number(expense.amount).toLocaleString()} ₽
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(expense.date), 'dd.MM.yyyy', { locale: ru })}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {expense.description || 'Без описания'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Нет расходов на работников. Добавьте первый расход для начала учета.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}