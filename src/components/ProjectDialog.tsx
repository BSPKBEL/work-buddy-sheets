import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Edit } from "lucide-react";
import { Project } from "@/hooks/useWorkers";

interface ProjectDialogProps {
  project?: Project;
  isEdit?: boolean;
}

export function ProjectDialog({ project, isEdit = false }: ProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: project?.name || "",
    description: project?.description || "",
    address: project?.address || "",
    start_date: project?.start_date || "",
    end_date: project?.end_date || "",
    status: project?.status || "active"
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEdit && project) {
        const { error } = await supabase
          .from("projects")
          .update({
            name: formData.name,
            description: formData.description || null,
            address: formData.address || null,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            status: formData.status
          })
          .eq("id", project.id);

        if (error) throw error;

        toast({
          title: "Успешно!",
          description: `Объект ${formData.name} обновлен`,
        });
      } else {
        const { error } = await supabase
          .from("projects")
          .insert({
            name: formData.name,
            description: formData.description || null,
            address: formData.address || null,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            status: formData.status
          });

        if (error) throw error;

        toast({
          title: "Успешно!",
          description: `Объект ${formData.name} создан`,
        });

        setFormData({
          name: "",
          description: "",
          address: "",
          start_date: "",
          end_date: "",
          status: "active"
        });
      }

      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch (error) {
      console.error("Error saving project:", error);
      toast({
        title: "Ошибка",
        description: `Не удалось ${isEdit ? "обновить" : "создать"} объект`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isEdit ? "outline" : "default"} size={isEdit ? "sm" : "default"}>
          {isEdit ? (
            <>
              <Edit className="mr-2 h-4 w-4" />
              Редактировать
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Новый объект
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать объект" : "Создать новый объект"}</DialogTitle>
          <DialogDescription>
            {isEdit ? `Изменить данные объекта ${project?.name}` : "Введите данные нового объекта работ"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Дом на ул. Ленина"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Статус</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активный</SelectItem>
                  <SelectItem value="completed">Завершён</SelectItem>
                  <SelectItem value="paused">Приостановлен</SelectItem>
                  <SelectItem value="cancelled">Отменён</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Адрес</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="г. Москва, ул. Ленина, д. 1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Описание объекта работ"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Дата начала</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Дата окончания</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (isEdit ? "Сохранение..." : "Создание...") : (isEdit ? "Сохранить" : "Создать")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}