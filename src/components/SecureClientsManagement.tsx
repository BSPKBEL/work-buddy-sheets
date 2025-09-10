import { useState } from "react";
import { useSecureClients } from "@/hooks/useSecureClients";
import { useSecureAuth } from "@/hooks/useSecureAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, 
  Plus, 
  Edit2, 
  Eye, 
  AlertTriangle, 
  Users, 
  Building2,
  Phone,
  Mail,
  MapPin
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

export function SecureClientsManagement() {
  const { 
    clients, 
    isLoading, 
    createClient, 
    updateClient,
    isCreating,
    isUpdating,
    hasFullAccess,
    hasLimitedAccess,
    canCreateClients,
    getMaskedClientInfo,
    logSensitiveAccess
  } = useSecureClients();
  
  const { isAdmin, primaryRole } = useSecureAuth();
  const { toast } = useToast();
  
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [maskedClientData, setMaskedClientData] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    company_type: 'individual',
    status: 'active',
    notes: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      company_type: 'individual',
      status: 'active',
      notes: ''
    });
  };

  const handleCreate = () => {
    createClient(formData);
    resetForm();
    setIsCreateDialogOpen(false);
  };

  const handleEdit = () => {
    if (!selectedClient) return;
    updateClient({ id: selectedClient.id, ...formData });
    resetForm();
    setIsEditDialogOpen(false);
  };

  const handleViewSensitiveData = async (client: any) => {
    try {
      // Log that user is viewing sensitive data
      await logSensitiveAccess('VIEW_SENSITIVE', client.id);
      
      if (isAdmin) {
        setSelectedClient(client);
      } else {
        // Get masked data for non-admins
        const masked = await getMaskedClientInfo(client.id);
        setMaskedClientData(masked);
      }
      setIsViewDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Ошибка доступа",
        description: error.message || "Не удалось получить данные клиента",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (client: any) => {
    setSelectedClient(client);
    setFormData({
      name: client.name || '',
      contact_person: client.contact_person || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      company_type: client.company_type || 'individual',
      status: client.status || 'active',
      notes: client.notes || ''
    });
    setIsEditDialogOpen(true);
  };

  if (!hasFullAccess && !hasLimitedAccess) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          У вас нет прав для просмотра данных клиентов. Обратитесь к администратору.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Управление клиентами</h2>
          <p className="text-muted-foreground">
            Защищенная система управления данными клиентов
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant={hasFullAccess ? "default" : "secondary"}>
            <Shield className="h-3 w-3 mr-1" />
            {hasFullAccess ? "Полный доступ" : "Ограниченный доступ"}
          </Badge>
          
          {canCreateClients && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить клиента
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Создание нового клиента</DialogTitle>
                  <DialogDescription>
                    Все данные будут зашифрованы и защищены политиками безопасности
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Название компании/ФИО *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="ООО Строй-Инвест"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="contact_person">Контактное лицо</Label>
                    <Input
                      id="contact_person"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                      placeholder="Иван Петров"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="email@company.ru"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Телефон</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="+7 (999) 123-45-67"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="company_type">Тип компании</Label>
                    <Select value={formData.company_type} onValueChange={(value) => setFormData({...formData, company_type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Физическое лицо</SelectItem>
                        <SelectItem value="llc">ООО</SelectItem>
                        <SelectItem value="jsc">АО</SelectItem>
                        <SelectItem value="ip">ИП</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Адрес</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      placeholder="г. Москва, ул. Строителей, д. 123"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Заметки</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="Дополнительная информация"
                      rows={3}
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button onClick={handleCreate} disabled={isCreating || !formData.name}>
                    {isCreating ? "Создание..." : "Создать"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Security Notice */}
      <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Защищенный режим:</strong> Все чувствительные данные клиентов {hasFullAccess ? 'доступны полностью (роль администратора)' : 'маскируются для безопасности'}. 
          Доступ логируется в целях безопасности.
        </AlertDescription>
      </Alert>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            База клиентов
          </CardTitle>
          <CardDescription>
            {hasFullAccess ? 'Полный доступ ко всем данным' : 'Ограниченный доступ - чувствительные данные скрыты'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="ml-2">Загрузка защищенных данных...</span>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Компания</TableHead>
                    <TableHead>Контактное лицо</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Телефон</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Создан</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients && Array.isArray(clients) && clients.length > 0 ? (
                    clients.map((client: any) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {client.name}
                          </div>
                        </TableCell>
                        <TableCell>{client.contact_person || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {client.email ? (
                              hasFullAccess ? client.email : 
                              <span className="text-muted-foreground">***@***</span>
                            ) : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {client.phone ? (
                              hasFullAccess ? client.phone :
                              <span className="text-muted-foreground">+7***</span>
                            ) : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{client.company_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                            {client.status === 'active' ? 'Активен' : 'Неактивен'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(client.created_at), 'dd.MM.yyyy', { locale: ru })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewSensitiveData(client)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {hasFullAccess && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(client)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Клиенты не найдены
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Данные клиента {hasFullAccess ? '(Полный доступ)' : '(Ограниченный доступ)'}
            </DialogTitle>
            <DialogDescription>
              {hasFullAccess ? 
                'Вы видите все данные клиента как администратор' : 
                'Чувствительные данные маскированы для безопасности'
              }
            </DialogDescription>
          </DialogHeader>
          
          {(selectedClient || maskedClientData) && (
            <div className="space-y-4">
              {Object.entries((selectedClient || maskedClientData) as Record<string, any>).map(([key, value]) => {
                if (['id', 'created_at', 'updated_at'].includes(key)) return null;
                
                return (
                  <div key={key} className="space-y-1">
                    <Label className="text-sm font-medium capitalize">
                      {key.replace('_', ' ')}
                    </Label>
                    <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                      {String(value || 'Не указано')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Закрыть
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog (Admin Only) */}
      {hasFullAccess && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Редактирование клиента</DialogTitle>
              <DialogDescription>
                Изменения будут зафиксированы в журнале аудита
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Название компании/ФИО *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-contact">Контактное лицо</Label>
                <Input
                  id="edit-contact"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Телефон</Label>
                  <Input
                    id="edit-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-address">Адрес</Label>
                <Input
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleEdit} disabled={isUpdating || !formData.name}>
                {isUpdating ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}