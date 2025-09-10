import { useState, useEffect } from "react";
import { useSecureAuth } from "@/hooks/useSecureAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Shield, Key, Copy, QrCode, AlertTriangle, CheckCircle } from "lucide-react";
import { authenticator } from 'otplib';

interface User2FA {
  id: string;
  user_id: string;
  is_enabled: boolean;
  secret?: string;
  backup_codes?: string[];
  created_at: string;
  updated_at: string;
  last_used_at?: string;
}

export function SecureTwoFactorAuth() {
  const { user, isAdmin } = useSecureAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [user2FA, setUser2FA] = useState<User2FA | null>(null);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [setupLoading, setSetupLoading] = useState(false);

  useEffect(() => {
    fetchUserTwoFA();
  }, [user?.id]);

  const fetchUserTwoFA = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_2fa')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setUser2FA(data);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить настройки 2FA: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSecret = () => {
    return authenticator.generateSecret();
  };

  const generateBackupCodes = (): string[] => {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  };

  const setupTwoFA = () => {
    const newSecret = generateSecret();
    const newBackupCodes = generateBackupCodes();
    
    setSecret(newSecret);
    setBackupCodes(newBackupCodes);
    
    // Generate QR code URL for authenticator apps
    const issuer = "Construction Management";
    const label = `${issuer}:${user?.email}`;
    const otpauth = `otpauth://totp/${encodeURIComponent(label)}?secret=${newSecret}&issuer=${encodeURIComponent(issuer)}`;
    setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(otpauth)}`);
    
    setVerificationCode("");
    setShowSetupDialog(true);
  };

  const enableTwoFA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Ошибка",
        description: "Введите 6-значный код проверки",
        variant: "destructive",
      });
      return;
    }

    setSetupLoading(true);
    try {
      // Verify the TOTP code
      const isValidToken = authenticator.verify({
        token: verificationCode,
        secret: secret,
      });

      if (!isValidToken) {
        toast({
          title: "Неверный код",
          description: "Проверьте код и попробуйте снова",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('user_2fa')
        .upsert({
          user_id: user!.id,
          is_enabled: true,
          secret: secret,
          backup_codes: backupCodes,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      await fetchUserTwoFA();
      setShowSetupDialog(false);
      setShowBackupCodes(true);
      
      toast({
        title: "2FA включена",
        description: "Двухфакторная аутентификация успешно настроена",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось включить 2FA: " + error.message,
        variant: "destructive",
      });
    } finally {
      setSetupLoading(false);
    }
  };

  const disableTwoFA = async () => {
    try {
      const { error } = await supabase
        .from('user_2fa')
        .update({ 
          is_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user!.id);

      if (error) throw error;

      await fetchUserTwoFA();
      toast({
        title: "2FA отключена",
        description: "Двухфакторная аутентификация отключена",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось отключить 2FA: " + error.message,
        variant: "destructive",
      });
    }
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
        description: "Не удалось скопировать в буфер обмена",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isEnabled = user2FA?.is_enabled || false;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Двухфакторная аутентификация
          </CardTitle>
          <CardDescription>
            Повысьте безопасность вашей учетной записи с помощью дополнительного уровня защиты
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Статус 2FA</p>
              <div className="flex items-center gap-2">
                <Badge variant={isEnabled ? "default" : "secondary"}>
                  {isEnabled ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Включена
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Отключена
                    </>
                  )}
                </Badge>
                {isAdmin && !isEnabled && (
                  <Badge variant="destructive" className="text-xs">
                    Рекомендуется для админов
                  </Badge>
                )}
              </div>
            </div>
            
            {!isEnabled ? (
              <Button onClick={setupTwoFA}>
                <Key className="h-4 w-4 mr-2" />
                Настроить 2FA
              </Button>
            ) : (
              <div className="space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowBackupCodes(true)}
                  size="sm"
                >
                  Резервные коды
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={disableTwoFA}
                  size="sm"
                >
                  Отключить
                </Button>
              </div>
            )}
          </div>

          {isEnabled && user2FA && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Настроено: {new Date(user2FA.created_at).toLocaleString('ru-RU')}</p>
              {user2FA.last_used_at && (
                <p>Последнее использование: {new Date(user2FA.last_used_at).toLocaleString('ru-RU')}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Настройка 2FA
            </DialogTitle>
            <DialogDescription>
              Отсканируйте QR-код приложением аутентификатора или введите секретный ключ вручную
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* QR Code */}
            <div className="flex flex-col items-center space-y-2">
              <img src={qrCodeUrl} alt="QR Code" className="border rounded-lg" />
              <p className="text-xs text-muted-foreground text-center">
                Используйте Google Authenticator, Authy или другое приложение TOTP
              </p>
            </div>

            <Separator />

            {/* Manual Entry */}
            <div className="space-y-2">
              <Label htmlFor="secret">Секретный ключ (для ручного ввода)</Label>
              <div className="flex gap-2">
                <Input
                  id="secret"
                  value={secret}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(secret)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Verification */}
            <div className="space-y-2">
              <Label htmlFor="verification">Код подтверждения</Label>
              <Input
                id="verification"
                placeholder="Введите 6-значный код"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
                className="text-center tracking-widest"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
                Отмена
              </Button>
              <Button onClick={enableTwoFA} disabled={setupLoading}>
                {setupLoading ? "Проверка..." : "Включить 2FA"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Резервные коды восстановления</DialogTitle>
            <DialogDescription>
              Сохраните эти коды в безопасном месте. Каждый код можно использовать только один раз.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Важно:</strong> Если вы потеряете устройство с аутентификатором, эти коды — единственный способ восстановить доступ.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {(user2FA?.backup_codes || backupCodes).map((code, index) => (
                <div
                  key={index}
                  className="p-2 bg-muted rounded text-center cursor-pointer hover:bg-muted/80"
                  onClick={() => copyToClipboard(code)}
                >
                  {code}
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => copyToClipboard((user2FA?.backup_codes || backupCodes).join('\n'))}
              >
                <Copy className="h-4 w-4 mr-2" />
                Копировать все
              </Button>
              <Button onClick={() => setShowBackupCodes(false)}>
                Готово
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}