import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkers, useWorkerAssignments } from "@/hooks/useWorkers";
import { AddWorkerDialog } from "./AddWorkerDialog";
import { WorkerDetailDialog } from "./WorkerDetailDialog";
import { AssignWorkersDialog } from "./AssignWorkersDialog";
import { Users, UserCheck, Loader2, Search, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function WorkersManagement() {
  const { data: workers, isLoading: workersLoading } = useWorkers();
  const { data: assignments, isLoading: assignmentsLoading } = useWorkerAssignments();
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (workersLoading || assignmentsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: { label: "Активный", variant: "default" as const },
      inactive: { label: "Неактивный", variant: "secondary" as const },
      on_leave: { label: "В отпуске", variant: "outline" as const },
      fired: { label: "Уволен", variant: "destructive" as const }
    };
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: "secondary" as const };
  };

  // Filter workers based on search term
  const filteredWorkers = workers?.filter(worker =>
    worker.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    worker.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    worker.position?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      {/* Workers Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Список сотрудников ({filteredWorkers.length})
              </CardTitle>
              <CardDescription>Управление данными работников</CardDescription>
            </div>
            <AddWorkerDialog />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск работников..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Workers Grid */}
          <div className="grid gap-4">
            {filteredWorkers.map((worker) => {
              const status = getStatusBadge(worker.status);
              const workerAssignments = assignments?.filter(a => a.worker_id === worker.id && !a.end_date) || [];
              
              return (
                <div key={worker.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{worker.full_name}</h4>
                      <Badge variant={status.variant}>{status.label}</Badge>
                      {worker.position && (
                        <Badge variant="outline">{worker.position}</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {worker.phone && <span>Тел: {worker.phone}</span>}
                      {worker.phone && worker.daily_rate > 0 && <span> • </span>}
                      {worker.daily_rate > 0 && <span>Ставка: {worker.daily_rate} руб/день</span>}
                    </div>
                    {workerAssignments.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Назначен на: {workerAssignments.map(a => a.project?.name).join(", ")}
                      </div>
                    )}
                    {worker.notes && (
                      <div className="text-sm text-muted-foreground">
                        Заметки: {worker.notes}
                      </div>
                    )}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSelectedWorker(worker)}
                    className="flex items-center gap-2"
                  >
                    <Info className="h-4 w-4" />
                    Подробнее
                  </Button>
                </div>
              );
            })}
            {filteredWorkers.length === 0 && workers && workers.length > 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Работники не найдены. Попробуйте изменить поисковый запрос.
              </div>
            )}
            
            {(!workers || workers.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                Нет добавленных работников
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assignments Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Активные назначения ({assignments?.filter(a => !a.end_date).length || 0})
              </CardTitle>
              <CardDescription>Текущие назначения работников на объекты</CardDescription>
            </div>
            <AssignWorkersDialog />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {assignments?.filter(a => !a.end_date).map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{assignment.worker?.full_name}</h4>
                    <Badge variant="outline">{assignment.role === 'worker' ? 'Рабочий' : assignment.role === 'foreman' ? 'Бригадир' : 'Помощник'}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Объект: {assignment.project?.name}
                  </div>
                  {assignment.foreman && (
                    <div className="text-sm text-muted-foreground">
                      Бригадир: {assignment.foreman.full_name}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    Начало: {new Date(assignment.start_date).toLocaleDateString()}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    try {
                      await supabase
                        .from("worker_assignments")
                        .update({ end_date: new Date().toISOString().split('T')[0] })
                        .eq("id", assignment.id);
                      
                      queryClient.invalidateQueries({ queryKey: ["worker_assignments"] });
                      toast({
                        title: "Успешно!",
                        description: "Назначение завершено",
                      });
                    } catch (error) {
                      toast({
                        title: "Ошибка",
                        description: "Не удалось завершить назначение",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Завершить
                </Button>
              </div>
            ))}
            {(!assignments || assignments.filter(a => !a.end_date).length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                Нет активных назначений
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Worker Detail Dialog */}
      {selectedWorker && (
        <WorkerDetailDialog
          worker={selectedWorker}
          open={!!selectedWorker}
          onOpenChange={(open) => !open && setSelectedWorker(null)}
        />
      )}
    </div>
  );
}