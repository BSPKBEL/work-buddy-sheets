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
import { DollarSign } from "lucide-react";

export function PaymentDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    worker_id: "",
    date: new Date().toISOString().split('T')[0],
    amount: "",
    description: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: workers } = useWorkers();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("payments")
        .insert({
          worker_id: formData.worker_id,
          date: formData.date,
          amount: parseInt(formData.amount),
          description: formData.description || null
        });

      if (error) throw error;

      const workerName = workers?.find(w => w.id === formData.worker_id)?.full_name || "";
      toast({
        title: "Успешно!",
        description: `Выплата ${workerName} на сумму ${parseInt(formData.amount).toLocaleString()}₽ зафиксирована`,
      });

      // Reset form and close dialog
      setFormData({
        worker_id: "",
        date: new Date().toISOString().split('T')[0],
        amount: "",
        description: ""
      });
      setOpen(false);
      
      // Refresh payments data
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (error) {
      console.error("Error adding payment:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить выплату",
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
          <DollarSign className="mr-2 h-4 w-4" />
          Произвести выплату
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Произвести выплату</DialogTitle>
          <DialogDescription>
            Зафиксируйте выплату работнику
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
                    {worker.full_name} (ставка: {worker.daily_rate.toLocaleString()}₽/день)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Дата выплаты</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Сумма (руб.) *</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="15000"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="За неделю с 1 по 7 число..."
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