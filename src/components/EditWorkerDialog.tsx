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
import { Edit } from "lucide-react";
import { Worker } from "@/hooks/useWorkers";

interface EditWorkerDialogProps {
  worker: Worker;
}

export function EditWorkerDialog({ worker }: EditWorkerDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: worker.full_name,
    phone: worker.phone || "",
    daily_rate: worker.daily_rate.toString(),
    status: worker.status,
    position: worker.position || "",
    notes: worker.notes || ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("workers")
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          daily_rate: parseInt(formData.daily_rate) || 0,
          status: formData.status,
          position: formData.position || null,
          notes: formData.notes || null
        })
        .eq("id", worker.id);

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: `Данные работника ${formData.full_name} обновлены`,
      });

      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["workers"] });
    } catch (error) {
      console.error("Error updating worker:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить данные работника",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="mr-2 h-4 w-4" />
          Редактировать
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Редактировать работника</DialogTitle>
          <DialogDescription>
            Изменить данные работника {worker.full_name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">ФИО *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="Иванов Иван Иванович"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Телефон</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+7 900 123 45 67"
              type="tel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="daily_rate">Ставка в день (руб.)</Label>
            <Input
              id="daily_rate"
              value={formData.daily_rate}
              onChange={(e) => setFormData(prev => ({ ...prev, daily_rate: e.target.value }))}
              placeholder="3000"
              type="number"
              min="0"
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
                <SelectItem value="inactive">Неактивный</SelectItem>
                <SelectItem value="on_leave">В отпуске</SelectItem>
                <SelectItem value="fired">Уволен</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Должность</Label>
            <Input
              id="position"
              value={formData.position}
              onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
              placeholder="Строитель, электрик, сварщик..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Заметки</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Дополнительная информация о работнике"
              rows={3}
            />
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
              {loading ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}