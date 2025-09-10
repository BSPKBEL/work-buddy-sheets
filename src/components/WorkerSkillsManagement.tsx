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
import { Progress } from "@/components/ui/progress";
import { 
  useSkills, 
  useWorkerSkills, 
  useCertifications, 
  useCreateWorkerSkill 
} from "@/hooks/useProjects";
import { useWorkers } from "@/hooks/useWorkers";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { 
  Award, 
  Plus, 
  Users, 
  Star, 
  BookOpen,
  CheckCircle,
  AlertCircle,
  Calendar,
  TrendingUp
} from "lucide-react";

const getSkillLevelBadge = (level: number) => {
  const levelMap = {
    1: { label: 'Начальный', variant: 'outline' as const, color: 'text-gray-600' },
    2: { label: 'Базовый', variant: 'secondary' as const, color: 'text-blue-600' },
    3: { label: 'Средний', variant: 'default' as const, color: 'text-green-600' },
    4: { label: 'Продвинутый', variant: 'default' as const, color: 'text-orange-600' },
    5: { label: 'Эксперт', variant: 'destructive' as const, color: 'text-red-600' }
  };
  return levelMap[level as keyof typeof levelMap] || levelMap[1];
};

function WorkerSkillDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    worker_id: "",
    skill_id: "",
    level: "1",
    years_experience: "",
    certified: false,
    notes: ""
  });

  const { data: workers } = useWorkers();
  const { data: skills } = useSkills();
  const createWorkerSkill = useCreateWorkerSkill();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const skillData = {
      worker_id: formData.worker_id,
      skill_id: formData.skill_id,
      level: parseInt(formData.level),
      years_experience: formData.years_experience ? parseInt(formData.years_experience) : 0,
      certified: formData.certified,
      notes: formData.notes
    };

    createWorkerSkill.mutate(skillData, {
      onSuccess: () => {
        setOpen(false);
        setFormData({
          worker_id: "",
          skill_id: "",
          level: "1",
          years_experience: "",
          certified: false,
          notes: ""
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Добавить навык
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить навык работнику</DialogTitle>
          <DialogDescription>
            Укажите навык и уровень владения для работника
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <Label htmlFor="skill_id">Навык *</Label>
            <Select value={formData.skill_id} onValueChange={(value) => setFormData({ ...formData, skill_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите навык" />
              </SelectTrigger>
              <SelectContent>
                {skills?.map((skill) => (
                  <SelectItem key={skill.id} value={skill.id}>
                    {skill.name} ({skill.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="level">Уровень владения *</Label>
              <Select value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Начальный</SelectItem>
                  <SelectItem value="2">2 - Базовый</SelectItem>
                  <SelectItem value="3">3 - Средний</SelectItem>
                  <SelectItem value="4">4 - Продвинутый</SelectItem>
                  <SelectItem value="5">5 - Эксперт</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="years_experience">Опыт (лет)</Label>
              <Input
                id="years_experience"
                type="number"
                min="0"
                value={formData.years_experience}
                onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="certified"
              type="checkbox"
              checked={formData.certified}
              onChange={(e) => setFormData({ ...formData, certified: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="certified">Есть сертификат</Label>
          </div>

          <div>
            <Label htmlFor="notes">Заметки</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Дополнительная информация о навыке..."
            />
          </div>

          <Button type="submit" className="w-full" disabled={createWorkerSkill.isPending}>
            {createWorkerSkill.isPending ? "Добавление..." : "Добавить навык"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function WorkerSkillsManagement() {
  const { data: workerSkills, isLoading: skillsLoading } = useWorkerSkills();
  const { data: certifications, isLoading: certificationsLoading } = useCertifications();
  const { data: skills } = useSkills();
  const { data: workers } = useWorkers();

  if (skillsLoading || certificationsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Группировка навыков по категориям
  const skillsByCategory = skills?.reduce((acc, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = [];
    }
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, any[]>) || {};

  // Статистика навыков
  const totalSkills = workerSkills?.length || 0;
  const certifiedSkills = workerSkills?.filter(ws => ws.certified).length || 0;
  const expertWorkers = workerSkills?.filter(ws => ws.level === 5).length || 0;
  const avgLevel = totalSkills > 0 ? 
    (workerSkills?.reduce((sum, ws) => sum + ws.level, 0) || 0) / totalSkills : 0;

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalSkills}</p>
                <p className="text-xs text-muted-foreground">Всего навыков</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-success" />
              <div>
                <p className="text-2xl font-bold">{certifiedSkills}</p>
                <p className="text-xs text-muted-foreground">Сертифицированных</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-warning" />
              <div>
                <p className="text-2xl font-bold">{expertWorkers}</p>
                <p className="text-xs text-muted-foreground">Экспертов</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{avgLevel.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Средний уровень</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Управление навыками */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Навыки и компетенции
              </CardTitle>
              <CardDescription>
                Управление навыками работников и отслеживание компетенций
              </CardDescription>
            </div>
            <WorkerSkillDialog />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="skills" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="skills">Навыки работников</TabsTrigger>
              <TabsTrigger value="categories">По категориям</TabsTrigger>
              <TabsTrigger value="certificates">Сертификаты</TabsTrigger>
            </TabsList>

            <TabsContent value="skills" className="space-y-4">
              {workerSkills && workerSkills.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Работник</TableHead>
                      <TableHead>Навык</TableHead>
                      <TableHead>Категория</TableHead>
                      <TableHead>Уровень</TableHead>
                      <TableHead>Опыт</TableHead>
                      <TableHead>Сертификат</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workerSkills.map((workerSkill) => {
                      const levelConfig = getSkillLevelBadge(workerSkill.level);
                      
                      return (
                        <TableRow key={workerSkill.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              {workerSkill.workers?.full_name}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {workerSkill.skills?.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {workerSkill.skills?.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant={levelConfig.variant}>
                                {levelConfig.label}
                              </Badge>
                              <Progress value={workerSkill.level * 20} className="h-1" />
                            </div>
                          </TableCell>
                          <TableCell>
                            {workerSkill.years_experience} лет
                          </TableCell>
                          <TableCell>
                            {workerSkill.certified ? (
                              <div className="flex items-center gap-1 text-success">
                                <CheckCircle className="h-4 w-4" />
                                Есть
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <AlertCircle className="h-4 w-4" />
                                Нет
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Навыки не добавлены. Начните с добавления навыков работникам.
                </p>
              )}
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              {Object.keys(skillsByCategory).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
                    <Card key={category}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg capitalize">{category}</CardTitle>
                        <CardDescription>
                          {categorySkills.length} навыков в категории
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {categorySkills.map((skill) => {
                            const workersWithSkill = workerSkills?.filter(ws => ws.skill_id === skill.id) || [];
                            const avgSkillLevel = workersWithSkill.length > 0 ? 
                              workersWithSkill.reduce((sum, ws) => sum + ws.level, 0) / workersWithSkill.length : 0;

                            return (
                              <Card key={skill.id} className="p-3">
                                <div className="space-y-2">
                                  <h4 className="font-medium text-sm">{skill.name}</h4>
                                  <p className="text-xs text-muted-foreground">{skill.description}</p>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">
                                      {workersWithSkill.length} работников
                                    </span>
                                    {avgSkillLevel > 0 && (
                                      <Badge variant="outline" className="text-xs">
                                        ср. {avgSkillLevel.toFixed(1)}/5
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Навыки не найдены.
                </p>
              )}
            </TabsContent>

            <TabsContent value="certificates" className="space-y-4">
              {certifications && certifications.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Работник</TableHead>
                      <TableHead>Сертификат</TableHead>
                      <TableHead>Организация</TableHead>
                      <TableHead>Дата выдачи</TableHead>
                      <TableHead>Срок действия</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certifications.map((cert) => {
                      const isExpired = cert.expiration_date && new Date(cert.expiration_date) < new Date();
                      
                      return (
                        <TableRow key={cert.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              {cert.workers?.full_name}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {cert.name}
                          </TableCell>
                          <TableCell>
                            {cert.issuing_organization || 'Не указана'}
                          </TableCell>
                          <TableCell>
                            {cert.issue_date ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {format(new Date(cert.issue_date), 'dd.MM.yyyy', { locale: ru })}
                              </div>
                            ) : 'Не указана'}
                          </TableCell>
                          <TableCell>
                            {cert.expiration_date ? (
                              <div className={`flex items-center gap-1 ${isExpired ? 'text-destructive' : ''}`}>
                                <Calendar className="h-3 w-3" />
                                {format(new Date(cert.expiration_date), 'dd.MM.yyyy', { locale: ru })}
                              </div>
                            ) : 'Бессрочный'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={isExpired ? 'destructive' : cert.status === 'active' ? 'default' : 'secondary'}>
                              {isExpired ? 'Просрочен' : cert.status === 'active' ? 'Активен' : 'Неактивен'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Сертификаты не добавлены.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}