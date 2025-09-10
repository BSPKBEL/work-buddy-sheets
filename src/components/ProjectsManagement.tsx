import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects, useClients, useCreateProject, useCreateClient } from "@/hooks/useProjects";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { 
  Building, 
  Users, 
  Plus, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  Phone,
  Mail,
  MapPin
} from "lucide-react";

const getStatusBadge = (status: string) => {
  const statusMap = {
    active: { label: 'Активный', variant: 'default' as const },
    completed: { label: 'Завершен', variant: 'secondary' as const },
    on_hold: { label: 'Приостановлен', variant: 'outline' as const },
    cancelled: { label: 'Отменен', variant: 'destructive' as const }
  };
  return statusMap[status as keyof typeof statusMap] || statusMap.active;
};

const getPriorityBadge = (priority: string) => {
  const priorityMap = {
    high: { label: 'Высокий', variant: 'destructive' as const },
    medium: { label: 'Средний', variant: 'default' as const },
    low: { label: 'Низкий', variant: 'secondary' as const }
  };
  return priorityMap[priority as keyof typeof priorityMap] || priorityMap.medium;
};

function ClientDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    company_type: "individual",
    notes: ""
  });

  const createClient = useCreateClient();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createClient.mutate(formData, {
      onSuccess: () => {
        setOpen(false);
        setFormData({
          name: "",
          contact_person: "",
          email: "",
          phone: "",
          address: "",
          company_type: "individual",
          notes: ""
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="mb-4">
          <Plus className="mr-2 h-4 w-4" />
          Добавить клиента
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый клиент</DialogTitle>
          <DialogDescription>
            Добавьте информацию о новом клиенте
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Название/Имя *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="contact_person">Контактное лицо</Label>
            <Input
              id="contact_person"
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="company_type">Тип</Label>
            <Select value={formData.company_type} onValueChange={(value) => setFormData({ ...formData, company_type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Физ. лицо</SelectItem>
                <SelectItem value="company">Юр. лицо</SelectItem>
                <SelectItem value="entrepreneur">ИП</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="address">Адрес</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="notes">Заметки</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <Button type="submit" className="w-full" disabled={createClient.isPending}>
            {createClient.isPending ? "Создание..." : "Создать клиента"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProjectDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    client_id: "",
    address: "",
    budget: "",
    start_date: "",
    end_date: "",
    priority: "medium",
    status: "active"
  });

  const { data: clients } = useClients();
  const createProject = useCreateProject();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const projectData = {
      ...formData,
      budget: formData.budget ? parseFloat(formData.budget) : null,
      client_id: formData.client_id || null,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null
    };

    createProject.mutate(projectData, {
      onSuccess: () => {
        setOpen(false);
        setFormData({
          name: "",
          description: "",
          client_id: "",
          address: "",
          budget: "",
          start_date: "",
          end_date: "",
          priority: "medium",
          status: "active"
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Новый проект
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новый проект</DialogTitle>
          <DialogDescription>
            Создайте новый проект для управления работами
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Название проекта *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="client_id">Клиент</Label>
            <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите клиента" />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="address">Адрес объекта</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Дата начала</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="end_date">Дата окончания</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budget">Бюджет (₽)</Label>
              <Input
                id="budget"
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="priority">Приоритет</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкий</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="high">Высокий</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={createProject.isPending}>
            {createProject.isPending ? "Создание..." : "Создать проект"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectsManagement() {
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: clients, isLoading: clientsLoading } = useClients();

  if (projectsLoading || clientsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{projects?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Всего проектов</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-success" />
              <div>
                <p className="text-2xl font-bold">{clients?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Клиентов</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-warning" />
              <div>
                <p className="text-2xl font-bold">
                  {projects?.filter(p => p.status === 'active').length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Активных</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {projects?.reduce((sum, p) => sum + (p.budget || 0), 0).toLocaleString() || 0} ₽
                </p>
                <p className="text-xs text-muted-foreground">Общий бюджет</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Клиенты */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Клиенты
              </CardTitle>
              <CardDescription>
                Управление базой клиентов и контактной информацией
              </CardDescription>
            </div>
            <ClientDialog />
          </div>
        </CardHeader>
        <CardContent>
          {clients && clients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((client) => (
                <Card key={client.id}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h3 className="font-medium">{client.name}</h3>
                      {client.contact_person && (
                        <p className="text-sm text-muted-foreground">
                          Контакт: {client.contact_person}
                        </p>
                      )}
                      <div className="flex flex-col gap-1">
                        {client.phone && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {client.phone}
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {client.email}
                          </div>
                        )}
                        {client.address && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {client.address}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {client.company_type === 'individual' && 'Физ. лицо'}
                        {client.company_type === 'company' && 'Юр. лицо'}
                        {client.company_type === 'entrepreneur' && 'ИП'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Нет клиентов. Добавьте первого клиента для начала работы.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Проекты */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Управление проектами
              </CardTitle>
              <CardDescription>
                Управление проектами, контроль прогресса и бюджета
              </CardDescription>
            </div>
            <ProjectDialog />
          </div>
        </CardHeader>
        <CardContent>
          {projects && projects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Бюджет</TableHead>
                  <TableHead>Прогресс</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Приоритет</TableHead>
                  <TableHead>Период</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => {
                  const statusConfig = getStatusBadge(project.status);
                  const priorityConfig = getPriorityBadge(project.priority);
                  
                  return (
                    <TableRow key={project.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{project.name}</p>
                          {project.address && (
                            <p className="text-xs text-muted-foreground">{project.address}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {project.clients ? project.clients.name : 'Без клиента'}
                      </TableCell>
                      <TableCell>
                        {project.budget ? `${project.budget.toLocaleString()} ₽` : 'Не указан'}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress value={project.progress_percentage} className="h-2" />
                          <p className="text-xs text-muted-foreground">{project.progress_percentage}%</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={priorityConfig.variant}>
                          {priorityConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          {project.start_date && (
                            <p>С: {format(new Date(project.start_date), 'dd.MM.yyyy', { locale: ru })}</p>
                          )}
                          {project.end_date && (
                            <p>До: {format(new Date(project.end_date), 'dd.MM.yyyy', { locale: ru })}</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Нет проектов. Создайте первый проект для начала работы.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}