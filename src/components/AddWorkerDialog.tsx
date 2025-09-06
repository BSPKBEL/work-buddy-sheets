import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

export function AddWorkerDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    daily_rate: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("workers")
        .insert({
          full_name: formData.full_name,
          phone: formData.phone || null,
          daily_rate: parseInt(formData.daily_rate) || 0
        });

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: `Работник ${formData.full_name} добавлен`,
      });

      // Reset form and close dialog
      setFormData({ full_name: "", phone: "", daily_rate: "" });
      setOpen(false);
      
      // Refresh workers data
      queryClient.invalidateQueries({ queryKey: ["workers"] });
    } catch (error) {
      console.error("Error adding worker:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить работника",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="default">
          <Plus className="mr-2 h-4 w-4" />
          Добавить работника
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Добавить нового работника</DialogTitle>
          <DialogDescription>
            Введите данные нового работника
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
              {loading ? "Добавление..." : "Добавить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}