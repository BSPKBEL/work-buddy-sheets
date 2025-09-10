import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Project } from "@/hooks/useWorkers";

interface DeleteProjectDialogProps {
  project: Project;
  activeAssignments?: number;
}

export function DeleteProjectDialog({ project, activeAssignments = 0 }: DeleteProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (activeAssignments > 0) {
      toast({
        title: "Невозможно удалить",
        description: "У проекта есть активные назначения работников. Завершите их перед удалением.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // First, delete related records
      await supabase
        .from("project_tasks")
        .delete()
        .eq("project_id", project.id);
        
      await supabase
        .from("project_expenses")
        .delete()
        .eq("project_id", project.id);

      // Delete completed worker assignments (active ones should be 0 at this point)
      await supabase
        .from("worker_assignments")
        .delete()
        .eq("project_id", project.id);

      // Finally, delete the project
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id);

      if (error) throw error;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["worker_assignments"] });

      toast({
        title: "Успешно!",
        description: `Проект "${project.name}" удален из системы.`,
      });
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить проект. Попробуйте снова.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
          <Trash2 className="h-4 w-4 mr-1" />
          Удалить
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Подтверждение удаления
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Вы уверены, что хотите удалить проект <strong>"{project.name}"</strong>?
              </p>
              
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Будут удалены:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Все задачи проекта</li>
                  <li>• Все расходы по проекту</li>
                  <li>• История назначений работников</li>
                  <li>• Вся связанная отчетность</li>
                </ul>
              </div>
              
              {activeAssignments > 0 && (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <Badge variant="destructive">Активные назначения: {activeAssignments}</Badge>
                  </div>
                  <p className="text-sm text-destructive mt-2">
                    Удаление невозможно. Завершите все активные назначения на проект.
                  </p>
                </div>
              )}
              
              <p className="text-sm text-destructive font-medium">
                Это действие нельзя отменить!
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading || activeAssignments > 0}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Удаление..." : "Удалить проект"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}