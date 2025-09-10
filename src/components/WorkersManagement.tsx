import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useWorkers, useProjects, useWorkerAssignments } from "@/hooks/useWorkers";
import { AddWorkerDialog } from "./AddWorkerDialog";
import { EditWorkerDialog } from "./EditWorkerDialog";
import { ProjectDialog } from "./ProjectDialog";
import { AssignWorkersDialog } from "./AssignWorkersDialog";
import { DeleteWorkerDialog } from "./DeleteWorkerDialog";
import { DeleteProjectDialog } from "./DeleteProjectDialog";
import { Users, Building, UserCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";

export function WorkersManagement() {
  const { data: workers, isLoading: workersLoading } = useWorkers();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: assignments, isLoading: assignmentsLoading } = useWorkerAssignments();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (workersLoading || projectsLoading || assignmentsLoading) {
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

  const getProjectStatusBadge = (status: string) => {
    const statusMap = {
      active: { label: "Активный", variant: "default" as const },
      completed: { label: "Завершён", variant: "secondary" as const },
      paused: { label: "Приостановлен", variant: "outline" as const },
      cancelled: { label: "Отменён", variant: "destructive" as const }
    };
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: "secondary" as const };
  };

  return (
    <div className="space-y-6">
      {/* Workers Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Работники ({workers?.length || 0})
              </CardTitle>
              <CardDescription>Управление данными работников</CardDescription>
            </div>
            <AddWorkerDialog />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {workers?.map((worker) => {
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
                  <div className="flex gap-2">
                    <EditWorkerDialog worker={worker} />
                    <DeleteWorkerDialog 
                      worker={worker} 
                      activeAssignments={workerAssignments.length}
                    />
                  </div>
                </div>
              );
            })}
            {(!workers || workers.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                Нет добавленных работников
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Projects Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Объекты работ ({projects?.length || 0})
              </CardTitle>
              <CardDescription>Управление объектами и проектами</CardDescription>
            </div>
            <ProjectDialog />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {projects?.map((project) => {
              const status = getProjectStatusBadge(project.status);
              const projectAssignments = assignments?.filter(a => a.project_id === project.id && !a.end_date) || [];
              
              return (
                <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{project.name}</h4>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    {project.address && (
                      <div className="text-sm text-muted-foreground">
                        Адрес: {project.address}
                      </div>
                    )}
                    {project.description && (
                      <div className="text-sm text-muted-foreground">
                        {project.description}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground">
                      {project.start_date && <span>Начало: {new Date(project.start_date).toLocaleDateString()}</span>}
                      {project.start_date && project.end_date && <span> • </span>}
                      {project.end_date && <span>Окончание: {new Date(project.end_date).toLocaleDateString()}</span>}
                    </div>
                    {projectAssignments.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Работников: {projectAssignments.length}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <ProjectDialog project={project} isEdit={true} />
                    <DeleteProjectDialog 
                      project={project} 
                      activeAssignments={projectAssignments.length}
                    />
                  </div>
                </div>
              );
            })}
            {(!projects || projects.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                Нет созданных объектов
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
                Назначения на объекты ({assignments?.filter(a => !a.end_date).length || 0})
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
    </div>
  );
}