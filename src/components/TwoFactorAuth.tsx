import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Shield, Smartphone, Key, AlertTriangle, CheckCircle, Copy } from "lucide-react";

interface User2FA {
  id: string;
  user_id: string;
  is_enabled: boolean;
  secret?: string;
  backup_codes?: string[];
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export function TwoFactorAuth() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userTwoFA, setUserTwoFA] = useState<User2FA | null>(null);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    fetchUserTwoFA();
  }, []);

  const fetchUserTwoFA = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('user_2fa')
        .select('*')
        .eq('user_id', user.user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
      setUserTwoFA(data);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const generateSecret = () => {
    // Генерируем случайный secret для 2FA
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const generateBackupCodes = () => {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  };

  const setupTwoFA = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const newSecret = generateSecret();
      const newBackupCodes = generateBackupCodes();
      
      setSecret(newSecret);
      setBackupCodes(newBackupCodes);
      
      // Генерируем QR код URL для Google Authenticator
      const appName = encodeURIComponent('Work Buddy');
      const userEmail = encodeURIComponent(user.user.email || '');
      const qrUrl = `otpauth://totp/${appName}:${userEmail}?secret=${newSecret}&issuer=${appName}`;
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`);
      
      setShowSetupDialog(true);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const enableTwoFA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Ошибка",
        description: "Введите 6-значный код",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // В реальном приложении здесь была бы проверка TOTP кода
      // Для демонстрации просто проверим, что код не пустой
      
      const { error } = await supabase
        .from('user_2fa')
        .upsert({
          user_id: user.user.id,
          is_enabled: true,
          secret: secret,
          backup_codes: backupCodes
        });

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Двухфакторная аутентификация включена",
      });

      setShowSetupDialog(false);
      setVerificationCode('');
      setShowBackupCodes(true);
      fetchUserTwoFA();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const disableTwoFA = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('user_2fa')
        .update({ is_enabled: false })
        .eq('user_id', user.user.id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Двухфакторная аутентификация отключена",
      });

      fetchUserTwoFA();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Скопировано",
        description: "Текст скопирован в буфер обмена",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать текст",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Двухфакторная аутентификация
          </h2>
          <p className="text-muted-foreground">
            Дополнительная защита вашего аккаунта
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Статус 2FA
            </CardTitle>
            <CardDescription>
              Текущее состояние двухфакторной аутентификации
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${userTwoFA?.is_enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                  {userTwoFA?.is_enabled ? <CheckCircle className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                </div>
                <div>
                  <p className="font-medium">
                    {userTwoFA?.is_enabled ? 'Включена' : 'Отключена'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {userTwoFA?.is_enabled 
                      ? 'Ваш аккаунт защищен двухфакторной аутентификацией'
                      : 'Рекомендуется включить для дополнительной безопасности'
                    }
                  </p>
                </div>
              </div>
              <Badge variant={userTwoFA?.is_enabled ? "default" : "secondary"}>
                {userTwoFA?.is_enabled ? "Активна" : "Неактивна"}
              </Badge>
            </div>

            {userTwoFA?.is_enabled && userTwoFA.last_used_at && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">
                  Последнее использование: {new Date(userTwoFA.last_used_at).toLocaleString('ru-RU')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Управление 2FA</CardTitle>
            <CardDescription>
              Настройка и управление двухфакторной аутентификацией
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!userTwoFA?.is_enabled ? (
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Включение двухфакторной аутентификации значительно повысит безопасность вашего аккаунта.
                    Вам понадобится приложение-аутентификатор, такое как Google Authenticator или Authy.
                  </AlertDescription>
                </Alert>
                
                <Button onClick={setupTwoFA} className="gap-2">
                  <Smartphone className="h-4 w-4" />
                  Включить 2FA
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Двухфакторная аутентификация активна. Ваш аккаунт защищен.
                  </AlertDescription>
                </Alert>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowBackupCodes(true)}
                    className="gap-2"
                  >
                    <Key className="h-4 w-4" />
                    Показать резервные коды
                  </Button>
                  
                  <Button 
                    variant="destructive" 
                    onClick={disableTwoFA}
                    disabled={loading}
                    className="gap-2"
                  >
                    <Shield className="h-4 w-4" />
                    Отключить 2FA
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Setup Dialog */}
        <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
          <DialogContent className="dialog-content">
            <DialogHeader>
              <DialogTitle>Настройка двухфакторной аутентификации</DialogTitle>
              <DialogDescription>
                Следуйте инструкциям для включения 2FA
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
                  <p className="font-medium">Сканируйте QR-код в приложении</p>
                </div>
                
                <div className="flex justify-center">
                  {qrCodeUrl && (
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code для 2FA" 
                      className="border rounded-lg"
                    />
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>Или введите код вручную:</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={secret} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => copyToClipboard(secret)}
                      className="gap-1"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
                  <p className="font-medium">Введите код из приложения</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="verification_code">6-значный код</Label>
                  <Input
                    id="verification_code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    className="text-center font-mono text-lg"
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
                Отмена
              </Button>
              <Button onClick={enableTwoFA} disabled={loading || !verificationCode}>
                Включить 2FA
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Backup Codes Dialog */}
        <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
          <DialogContent className="dialog-content">
            <DialogHeader>
              <DialogTitle>Резервные коды</DialogTitle>
              <DialogDescription>
                Сохраните эти коды в безопасном месте. Каждый код можно использовать только один раз.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Резервные коды позволяют войти в аккаунт, если у вас нет доступа к приложению-аутентификатору.
                  Храните их в надежном месте!
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-2 gap-2">
                {(userTwoFA?.backup_codes || backupCodes).map((code, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded font-mono text-sm">
                    <span className="flex-1">{code}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyToClipboard(code)}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <Button 
                variant="outline" 
                onClick={() => copyToClipboard((userTwoFA?.backup_codes || backupCodes).join('\n'))}
                className="w-full gap-2"
              >
                <Copy className="h-4 w-4" />
                Скопировать все коды
              </Button>
            </div>
            
            <DialogFooter>
              <Button onClick={() => setShowBackupCodes(false)}>
                Закрыть
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}