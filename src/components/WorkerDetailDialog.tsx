import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkers, useAttendance, usePayments, useWorkerAssignments, type Worker } from "@/hooks/useWorkers";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Award, 
  TrendingUp, 
  Building, 
  Edit3, 
  Save, 
  X,
  Star,
  Clock,
  DollarSign
} from "lucide-react";

interface WorkerDetailDialogProps {
  worker: Worker;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WorkerRatingData {
  overallRating: number;
  attendanceRate: number;
  workDays: number;
  totalEarned: number;
  totalPaid: number;
  reliability: number;
  performance: number;
  badgeLevel: 'excellent' | 'good' | 'average' | 'needs_improvement';
}

export function WorkerDetailDialog({ worker, open, onOpenChange }: WorkerDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    full_name: worker.full_name,
    phone: worker.phone || "",
    daily_rate: worker.daily_rate.toString(),
    status: worker.status,
    position: worker.position || "",
    notes: worker.notes || ""
  });
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: attendance } = useAttendance();
  const { data: payments } = usePayments();
  const { data: assignments } = useWorkerAssignments();

  // Calculate worker rating
  const workerRating = useMemo((): WorkerRatingData => {
    const workerAttendance = attendance?.filter(a => a.worker_id === worker.id) || [];
    const workerPayments = payments?.filter(p => p.worker_id === worker.id) || [];

    const totalDays = workerAttendance.length;
    const presentDays = workerAttendance.filter(a => a.status === 'present').length;
    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    const totalEarned = presentDays * worker.daily_rate;
    const totalPaid = workerPayments.reduce((sum, p) => sum + p.amount, 0);

    const reliability = attendanceRate;
    const paymentRatio = totalEarned > 0 ? Math.min((totalPaid / totalEarned) * 100, 100) : 0;
    const performance = (reliability + paymentRatio) / 2;

    const overallRating = (attendanceRate + performance) / 2;

    let badgeLevel: 'excellent' | 'good' | 'average' | 'needs_improvement' = 'needs_improvement';
    if (overallRating >= 85) badgeLevel = 'excellent';
    else if (overallRating >= 70) badgeLevel = 'good';
    else if (overallRating >= 50) badgeLevel = 'average';

    return {
      overallRating,
      attendanceRate,
      workDays: presentDays,
      totalEarned,
      totalPaid,
      reliability,
      performance,
      badgeLevel
    };
  }, [worker, attendance, payments]);

  const workerAssignments = assignments?.filter(a => a.worker_id === worker.id) || [];
  const activeAssignments = workerAssignments.filter(a => !a.end_date);

  const getBadgeConfig = (level: string) => {
    const config = {
      excellent: { label: 'Отличный', variant: 'default' as const, icon: Star },
      good: { label: 'Хороший', variant: 'secondary' as const, icon: TrendingUp },
      average: { label: 'Средний', variant: 'outline' as const, icon: Clock },
      needs_improvement: { label: 'Требует улучшения', variant: 'destructive' as const, icon: X }
    };
    return config[level as keyof typeof config] || config.needs_improvement;
  };

  const badgeConfig = getBadgeConfig(workerRating.badgeLevel);
  const BadgeIcon = badgeConfig.icon;

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("workers")
        .update({
          full_name: editData.full_name,
          phone: editData.phone || null,
          daily_rate: parseInt(editData.daily_rate) || 0,
          status: editData.status,
          position: editData.position || null,
          notes: editData.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", worker.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["workers"] });
      toast({
        title: "Успешно!",
        description: "Данные работника обновлены",
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить данные",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Вы уверены, что хотите удалить этого работника?")) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("workers")
        .delete()
        .eq("id", worker.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["workers"] });
      toast({
        title: "Успешно!",
        description: "Работник удален",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить работника",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Информация о работнике
            </DialogTitle>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave} disabled={loading}>
                    <Save className="h-4 w-4 mr-1" />
                    Сохранить
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} disabled={loading}>
                    <X className="h-4 w-4 mr-1" />
                    Отмена
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit3 className="h-4 w-4 mr-1" />
                    Редактировать
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleDelete}>
                    Удалить
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="rating">Рейтинг</TabsTrigger>
            <TabsTrigger value="assignments">Назначения</TabsTrigger>
            <TabsTrigger value="edit">Редактирование</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Основная информация */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Основная информация</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{worker.full_name}</span>
                    <Badge variant={worker.status === 'active' ? 'default' : 'secondary'}>
                      {worker.status === 'active' ? 'Активный' : 'Неактивный'}
                    </Badge>
                  </div>
                  
                  {worker.position && (
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      <span>Должность: {worker.position}</span>
                    </div>
                  )}
                  
                  {worker.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{worker.phone}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>Ставка: {worker.daily_rate} руб/день</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Создан: {new Date(worker.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  {worker.notes && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium mb-1">Заметки:</h4>
                      <p className="text-sm text-muted-foreground">{worker.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Рейтинг */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BadgeIcon className="h-4 w-4" />
                    Рейтинг работника
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={badgeConfig.variant} className="flex items-center gap-1">
                      <BadgeIcon className="h-3 w-3" />
                      {badgeConfig.label}
                    </Badge>
                    <span className="text-2xl font-bold">{workerRating.overallRating.toFixed(1)}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Посещаемость</span>
                        <span>{workerRating.attendanceRate.toFixed(1)}%</span>
                      </div>
                      <Progress value={workerRating.attendanceRate} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Производительность</span>
                        <span>{workerRating.performance.toFixed(1)}%</span>
                      </div>
                      <Progress value={workerRating.performance} className="h-2" />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Отработано дней:</span>
                      <p className="font-medium">{workerRating.workDays}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Заработано:</span>
                      <p className="font-medium">{workerRating.totalEarned.toLocaleString()} ₽</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Выплачено:</span>
                      <p className="font-medium">{workerRating.totalPaid.toLocaleString()} ₽</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Надежность:</span>
                      <p className="font-medium">{workerRating.reliability.toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Активные назначения */}
            {activeAssignments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Активные назначения ({activeAssignments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {activeAssignments.map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{assignment.project?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Роль: {assignment.role === 'worker' ? 'Рабочий' : assignment.role === 'foreman' ? 'Бригадир' : 'Помощник'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Начало: {new Date(assignment.start_date).toLocaleDateString()}
                          </p>
                        </div>
                        {assignment.foreman && (
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Бригадир:</p>
                            <p className="text-sm font-medium">{assignment.foreman.full_name}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rating" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Детальный рейтинг работника</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold mb-2">{workerRating.overallRating.toFixed(1)}</div>
                      <Badge variant={badgeConfig.variant} className="flex items-center gap-1 w-fit mx-auto">
                        <BadgeIcon className="h-3 w-3" />
                        {badgeConfig.label}
                      </Badge>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Посещаемость</span>
                          <span>{workerRating.attendanceRate.toFixed(1)}%</span>
                        </div>
                        <Progress value={workerRating.attendanceRate} className="h-3" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Надежность</span>
                          <span>{workerRating.reliability.toFixed(1)}%</span>
                        </div>
                        <Progress value={workerRating.reliability} className="h-3" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Производительность</span>
                          <span>{workerRating.performance.toFixed(1)}%</span>
                        </div>
                        <Progress value={workerRating.performance} className="h-3" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Статистика работы</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 border rounded-lg">
                        <div className="text-2xl font-bold text-primary">{workerRating.workDays}</div>
                        <div className="text-sm text-muted-foreground">Отработано дней</div>
                      </div>
                      <div className="text-center p-3 border rounded-lg">
                        <div className="text-2xl font-bold text-success">{workerRating.totalEarned.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Заработано (₽)</div>
                      </div>
                      <div className="text-center p-3 border rounded-lg">
                        <div className="text-2xl font-bold text-warning">{workerRating.totalPaid.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Выплачено (₽)</div>
                      </div>
                      <div className="text-center p-3 border rounded-lg">
                        <div className="text-2xl font-bold text-destructive">
                          {((workerRating.totalEarned - workerRating.totalPaid)).toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Долг (₽)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>История назначений</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {workerAssignments.length > 0 ? (
                    workerAssignments.map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-1">
                          <p className="font-medium">{assignment.project?.name}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Роль: {assignment.role === 'worker' ? 'Рабочий' : assignment.role === 'foreman' ? 'Бригадир' : 'Помощник'}</span>
                            <span>Начало: {new Date(assignment.start_date).toLocaleDateString()}</span>
                            {assignment.end_date && (
                              <span>Окончание: {new Date(assignment.end_date).toLocaleDateString()}</span>
                            )}
                          </div>
                          {assignment.foreman && (
                            <p className="text-sm text-muted-foreground">
                              Бригадир: {assignment.foreman.full_name}
                            </p>
                          )}
                        </div>
                        <Badge variant={assignment.end_date ? 'secondary' : 'default'}>
                          {assignment.end_date ? 'Завершено' : 'Активно'}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Нет назначений на проекты
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="edit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Редактировать информацию</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Полное имя</Label>
                    <Input
                      id="full_name"
                      value={editData.full_name}
                      onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Телефон</Label>
                    <Input
                      id="phone"
                      value={editData.phone}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="daily_rate">Дневная ставка (руб)</Label>
                    <Input
                      id="daily_rate"
                      type="number"
                      value={editData.daily_rate}
                      onChange={(e) => setEditData({ ...editData, daily_rate: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="status">Статус</Label>
                    <Select 
                      value={editData.status} 
                      onValueChange={(value) => setEditData({ ...editData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Активный</SelectItem>
                        <SelectItem value="inactive">Неактивный</SelectItem>
                        <SelectItem value="on_leave">В отпуске</SelectItem>
                        <SelectItem value="fired">Уволен</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="position">Должность</Label>
                    <Input
                      id="position"
                      value={editData.position}
                      onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="notes">Заметки</Label>
                    <Textarea
                      id="notes"
                      value={editData.notes}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    Сохранить изменения
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={loading}>
                    Отмена
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}