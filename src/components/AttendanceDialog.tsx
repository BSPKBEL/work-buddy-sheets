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
import { useWorkers } from "@/hooks/useWorkers";
import { Calendar } from "lucide-react";

export function AttendanceDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    worker_id: "",
    date: new Date().toISOString().split('T')[0],
    status: "present" as "present" | "absent" | "sick" | "vacation",
    hours_worked: "8",
    notes: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: workers } = useWorkers();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("attendance")
        .upsert({
          worker_id: formData.worker_id,
          date: formData.date,
          status: formData.status,
          hours_worked: parseInt(formData.hours_worked) || null,
          notes: formData.notes || null
        }, {
          onConflict: 'worker_id,date'
        });

      if (error) throw error;

      const workerName = workers?.find(w => w.id === formData.worker_id)?.full_name || "";
      toast({
        title: "Успешно!",
        description: `Присутствие ${workerName} отмечено`,
      });

      // Reset form and close dialog
      setFormData({
        worker_id: "",
        date: new Date().toISOString().split('T')[0],
        status: "present" as "present" | "absent" | "sick" | "vacation",
        hours_worked: "8",
        notes: ""
      });
      setOpen(false);
      
      // Refresh attendance data
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    } catch (error) {
      console.error("Error updating attendance:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось отметить присутствие",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline">
          <Calendar className="mr-2 h-4 w-4" />
          Отметить присутствие
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Отметить присутствие</DialogTitle>
          <DialogDescription>
            Отметьте присутствие работника на объекте
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="worker_id">Работник *</Label>
            <Select
              value={formData.worker_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, worker_id: value }))}
              required
            >
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
          <div className="space-y-2">
            <Label htmlFor="date">Дата</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Статус *</Label>
            <Select
              value={formData.status}
              onValueChange={(value: "present" | "absent" | "sick" | "vacation") => 
                setFormData(prev => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="present">Присутствует</SelectItem>
                <SelectItem value="absent">Отсутствует</SelectItem>
                <SelectItem value="sick">Болен</SelectItem>
                <SelectItem value="vacation">Отпуск</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.status === "present" && (
            <div className="space-y-2">
              <Label htmlFor="hours_worked">Часов отработано</Label>
              <Input
                id="hours_worked"
                type="number"
                min="0"
                max="24"
                value={formData.hours_worked}
                onChange={(e) => setFormData(prev => ({ ...prev, hours_worked: e.target.value }))}
                placeholder="8"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="notes">Заметки</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Дополнительная информация..."
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