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

interface DeleteClientDialogProps {
  client: {
    id: string;
    name: string;
  };
  activeProjects?: number;
}

export function DeleteClientDialog({ client, activeProjects = 0 }: DeleteClientDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (activeProjects > 0) {
      toast({
        title: "Невозможно удалить",
        description: "У клиента есть активные проекты. Завершите их перед удалением.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Delete the client
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", client.id);

      if (error) throw error;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["clients"] });

      toast({
        title: "Успешно!",
        description: `Клиент "${client.name}" удален из системы.`,
      });
    } catch (error) {
      console.error("Error deleting client:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить клиента. Попробуйте снова.",
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
                Вы уверены, что хотите удалить клиента <strong>"{client.name}"</strong>?
              </p>
              
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Будут удалены:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Контактная информация</li>
                  <li>• История взаимодействий</li>
                  <li>• Все связанные данные</li>
                </ul>
              </div>
              
              {activeProjects > 0 && (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <Badge variant="destructive">Активные проекты: {activeProjects}</Badge>
                  </div>
                  <p className="text-sm text-destructive mt-2">
                    Удаление невозможно. Завершите все активные проекты клиента.
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
            disabled={loading || activeProjects > 0}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Удаление..." : "Удалить клиента"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}