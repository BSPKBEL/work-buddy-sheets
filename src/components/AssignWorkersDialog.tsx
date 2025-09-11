import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useWorkers, useProjects } from "@/hooks/useWorkers";

export function AssignWorkersDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    worker_id: "",
    project_id: "",
    foreman_id: "",
    role: "worker",
    start_date: new Date().toISOString().split('T')[0],
    end_date: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: workers } = useWorkers();
  const { data: projects } = useProjects();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("worker_assignments")
        .insert({
          worker_id: formData.worker_id,
          project_id: formData.project_id,
          foreman_id: formData.foreman_id === "no_foreman" ? null : formData.foreman_id || null,
          role: formData.role,
          start_date: formData.start_date,
          end_date: formData.end_date || null
        });

      if (error) throw error;

      const worker = workers?.find(w => w.id === formData.worker_id);
      const project = projects?.find(p => p.id === formData.project_id);

      toast({
        title: "Успешно!",
        description: `${worker?.full_name} назначен на объект ${project?.name}`,
      });

      setFormData({
        worker_id: "",
        project_id: "",
        foreman_id: "",
        role: "worker",
        start_date: new Date().toISOString().split('T')[0],
        end_date: ""
      });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["worker_assignments"] });
    } catch (error) {
      console.error("Error assigning worker:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось назначить работника",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const activeWorkers = workers?.filter(w => w.status === 'active') || [];
  const foremanWorkers = workers?.filter(w => w.status === 'active' && w.position?.toLowerCase().includes('бригадир')) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline">
          <UserPlus className="mr-2 h-4 w-4" />
          Назначить на объект
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Назначить работника на объект</DialogTitle>
          <DialogDescription>
            Выберите работника, объект и параметры назначения
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="worker_id">Работник *</Label>
            <Select value={formData.worker_id} onValueChange={(value) => setFormData(prev => ({ ...prev, worker_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите работника" />
              </SelectTrigger>
              <SelectContent>
                {activeWorkers.map((worker) => (
                  <SelectItem key={worker.id} value={worker.id}>
                    {worker.full_name} {worker.position && `(${worker.position})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="project_id">Объект *</Label>
            <Select value={formData.project_id} onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите объект" />
              </SelectTrigger>
              <SelectContent>
                {projects?.filter(p => p.status === 'active').map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Роль</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="worker">Рабочий</SelectItem>
                <SelectItem value="foreman">Бригадир</SelectItem>
                <SelectItem value="assistant">Помощник</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.role !== "foreman" && (
            <div className="space-y-2">
              <Label htmlFor="foreman_id">Бригадир (опционально)</Label>
              <Select value={formData.foreman_id} onValueChange={(value) => setFormData(prev => ({ ...prev, foreman_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите бригадира" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_foreman">Без бригадира</SelectItem>
                  {foremanWorkers.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Дата начала *</Label>
              <input
                id="start_date"
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Дата окончания</Label>
              <input
                id="end_date"
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
            <Button type="submit" disabled={loading || !formData.worker_id || !formData.project_id}>
              {loading ? "Назначение..." : "Назначить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}