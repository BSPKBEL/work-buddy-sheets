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
import type { Worker } from "@/hooks/useWorkers";

interface DeleteWorkerDialogProps {
  worker: Worker;
  activeAssignments?: number;
}

export function DeleteWorkerDialog({ worker, activeAssignments = 0 }: DeleteWorkerDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (activeAssignments > 0) {
      toast({
        title: "Невозможно удалить",
        description: "У работника есть активные назначения. Завершите их перед удалением.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // First, delete related records
      await supabase
        .from("attendance")
        .delete()
        .eq("worker_id", worker.id);
        
      await supabase
        .from("payments")
        .delete()
        .eq("worker_id", worker.id);
        
      await supabase
        .from("worker_skills")
        .delete()
        .eq("worker_id", worker.id);
        
      await supabase
        .from("worker_expenses")
        .delete()
        .eq("worker_id", worker.id);
        
      await supabase
        .from("certifications")
        .delete()
        .eq("worker_id", worker.id);

      // Finally, delete the worker
      const { error } = await supabase
        .from("workers")
        .delete()
        .eq("id", worker.id);

      if (error) throw error;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["worker_assignments"] });

      toast({
        title: "Успешно!",
        description: `Работник ${worker.full_name} удален из системы.`,
      });
    } catch (error) {
      console.error("Error deleting worker:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить работника. Попробуйте снова.",
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
                Вы уверены, что хотите удалить работника <strong>{worker.full_name}</strong>?
              </p>
              
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Будут удалены:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Все записи о посещаемости</li>
                  <li>• Все записи о выплатах</li>
                  <li>• Навыки и сертификаты</li>
                  <li>• История расходов</li>
                </ul>
              </div>
              
              {activeAssignments > 0 && (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <Badge variant="destructive">Активные назначения: {activeAssignments}</Badge>
                  </div>
                  <p className="text-sm text-destructive mt-2">
                    Удаление невозможно. Завершите все активные назначения работника.
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
            {loading ? "Удаление..." : "Удалить работника"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}