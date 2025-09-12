import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Edit, 
  Trash2, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Loader2,
  Key,
  Zap
} from "lucide-react";

interface AIProvider {
  id: string;
  name: string;
  provider_type: string;
  api_endpoint?: string;
  model_name?: string;
  is_active: boolean;
  priority: number;
  max_tokens?: number;
  temperature?: number;
  created_at: string;
}

interface AIProviderCardProps {
  provider: AIProvider;
  onUpdate: () => void;
  onStatusChange: (id: string, status: 'online' | 'offline' | 'error' | 'testing') => void;
}

export default function AIProviderCard({ provider, onUpdate, onStatusChange }: AIProviderCardProps) {
  const { toast } = useToast();
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [apiKeyDialog, setApiKeyDialog] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  
  const [editForm, setEditForm] = useState({
    name: provider.name,
    provider_type: provider.provider_type,
    api_endpoint: provider.api_endpoint || '',
    model_name: provider.model_name || '',
    priority: provider.priority,
    max_tokens: provider.max_tokens || 4000,
    temperature: provider.temperature || 0.7
  });

  const [apiKeyForm, setApiKeyForm] = useState('');

  const handleEdit = async () => {
    try {
      const { error } = await supabase
        .from('ai_providers')
        .update(editForm)
        .eq('id', provider.id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "AI провайдер обновлен",
      });

      setEditDialog(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('ai_providers')
        .delete()
        .eq('id', provider.id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "AI провайдер удален",
      });

      setDeleteDialog(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_providers')
        .update({ is_active: isActive })
        .eq('id', provider.id);

      if (error) throw error;
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTest = async () => {
    setTesting(true);
    onStatusChange(provider.id, 'testing');
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-provider-test', {
        body: {
          provider_id: provider.id,
          provider_type: provider.provider_type,
          api_endpoint: provider.api_endpoint,
          model_name: provider.model_name
        }
      });

      if (error) throw error;

      setTestResult(data);
      onStatusChange(provider.id, data.success ? 'online' : 'error');
      
      toast({
        title: data.success ? "Тест успешен" : "Тест не пройден",
        description: data.message || data.error,
        variant: data.success ? "default" : "destructive",
      });
    } catch (error: any) {
      console.error('Test error:', error);
      onStatusChange(provider.id, 'error');
      toast({
        title: "Ошибка тестирования",
        description: error.message || "Не удалось протестировать провайдера",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleUpdateApiKey = () => {
    // Open Supabase secrets management
    const secretName = `${provider.provider_type.toUpperCase()}_API_KEY`;
    toast({
      title: "API ключ",
      description: `Добавьте или обновите секрет: ${secretName}`,
    });
    // This would trigger the secrets management tool
    setApiKeyDialog(false);
  };

  const getStatusIcon = () => {
    if (testing) return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    if (testResult?.success) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (testResult?.success === false) return <XCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-gray-400" />;
  };

  return (
    <>
      <Card className="relative">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <CardTitle className="text-lg">{provider.name}</CardTitle>
              <Badge variant="outline">{provider.provider_type}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setApiKeyDialog(true)}
                className="gap-1"
              >
                <Key className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={testing}
                className="gap-1"
              >
                {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />}
                ТЕСТ
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditDialog(true)}
                className="gap-1"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialog(true)}
                className="gap-1 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Модель:</span>
                <p className="font-medium">{provider.model_name || 'Не указана'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Приоритет:</span>
                <p className="font-medium">{provider.priority}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Max Tokens:</span>
                <p className="font-medium">{provider.max_tokens}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Temperature:</span>
                <p className="font-medium">{provider.temperature}</p>
              </div>
            </div>

            {testResult && (
              <div className={`p-3 rounded-lg border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {testResult.success ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                  <span className="font-medium text-sm">
                    {testResult.success ? 'Тест пройден' : 'Тест не пройден'}
                  </span>
                  {testResult.response_time_ms && (
                    <span className="text-xs text-muted-foreground">
                      ({testResult.response_time_ms}ms)
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {testResult.message || testResult.error}
                </p>
                {testResult.response_preview && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Ответ: "{testResult.response_preview}..."
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={provider.is_active}
                  onCheckedChange={handleToggleActive}
                />
                <span className="text-sm">
                  {provider.is_active ? 'Активен' : 'Неактивен'}
                </span>
              </div>
              <Badge variant={provider.is_active ? "default" : "secondary"}>
                {provider.is_active ? <Zap className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                {provider.is_active ? 'Включен' : 'Отключен'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать AI провайдера</DialogTitle>
            <DialogDescription>
              Измените настройки провайдера искусственного интеллекта
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Название</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-type">Тип провайдера</Label>
              <Select
                value={editForm.provider_type}
                onValueChange={(value) => setEditForm({...editForm, provider_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="azure">Azure OpenAI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-endpoint">API Endpoint</Label>
              <Input
                id="edit-endpoint"
                value={editForm.api_endpoint}
                onChange={(e) => setEditForm({...editForm, api_endpoint: e.target.value})}
                placeholder="https://api.openai.com/v1"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-model">Модель</Label>
              <Input
                id="edit-model"
                value={editForm.model_name}
                onChange={(e) => setEditForm({...editForm, model_name: e.target.value})}
                placeholder="gpt-4o"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-priority">Приоритет</Label>
                <Input
                  id="edit-priority"
                  type="number"
                  value={editForm.priority}
                  onChange={(e) => setEditForm({...editForm, priority: parseInt(e.target.value)})}
                  min="1"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-tokens">Max Tokens</Label>
                <Input
                  id="edit-tokens"
                  type="number"
                  value={editForm.max_tokens}
                  onChange={(e) => setEditForm({...editForm, max_tokens: parseInt(e.target.value)})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-temp">Temperature</Label>
                <Input
                  id="edit-temp"
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={editForm.temperature}
                  onChange={(e) => setEditForm({...editForm, temperature: parseFloat(e.target.value)})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleEdit}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Key Dialog */}
      <Dialog open={apiKeyDialog} onOpenChange={setApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Управление API ключом</DialogTitle>
            <DialogDescription>
              Настройте API ключ для провайдера {provider.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Секрет:</strong> {provider.provider_type.toUpperCase()}_API_KEY
              </p>
              <p className="text-xs text-blue-600 mt-2">
                API ключи хранятся безопасно в Supabase Edge Function Secrets
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpdateApiKey} className="flex-1">
                <Key className="h-4 w-4 mr-2" />
                Открыть управление секретами
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApiKeyDialog(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent className="z-[9999]">
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить AI провайдера "{provider.name}"? 
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}