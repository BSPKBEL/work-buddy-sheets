import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';
import { useAIContext } from '@/hooks/useAIContext';

interface AIPermissionGuardProps {
  children: React.ReactNode;
  requiredFeature: string;
  fallback?: React.ReactNode;
  showWarning?: boolean;
}

export function AIPermissionGuard({ 
  children, 
  requiredFeature, 
  fallback,
  showWarning = true 
}: AIPermissionGuardProps) {
  const { canAccessAIFeature, isAIEnabled } = useAIContext();

  if (!isAIEnabled) {
    return fallback || (showWarning && (
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          Для использования AI функций необходимо войти в систему
        </AlertDescription>
      </Alert>
    ));
  }

  if (!canAccessAIFeature(requiredFeature)) {
    return fallback || (showWarning && (
      <Alert className="border-red-200 bg-red-50">
        <Shield className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          У вас нет доступа к данной AI функции. Обратитесь к администратору для получения необходимых разрешений.
        </AlertDescription>
      </Alert>
    ));
  }

  return <>{children}</>;
}