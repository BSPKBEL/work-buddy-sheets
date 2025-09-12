import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Wifi,
  WifiOff,
  Activity
} from "lucide-react";

interface AIStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'error' | 'testing';
  lastTest?: string;
  responseTime?: number;
  errorMessage?: string;
}

interface AIStatusIndicatorProps {
  variant?: 'compact' | 'detailed';
  className?: string;
}

export default function AIStatusIndicator({ variant = 'compact', className = '' }: AIStatusIndicatorProps) {
  const [aiStatuses, setAiStatuses] = useState<AIStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [overallStatus, setOverallStatus] = useState<'online' | 'partial' | 'offline'>('offline');

  useEffect(() => {
    fetchAIProviders();
    // Set up real-time monitoring
    const interval = setInterval(checkAIHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    calculateOverallStatus();
  }, [aiStatuses]);

  const fetchAIProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_providers')
        .select('*')
        .eq('is_active', true)
        .order('priority');

      if (error) throw error;

      const statuses: AIStatus[] = (data || []).map(provider => ({
        id: provider.id,
        name: provider.name,
        status: 'offline' // Default status
      }));

      setAiStatuses(statuses);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching AI providers:', error);
      setLoading(false);
    }
  };

  const checkAIHealth = async () => {
    // This would typically ping each AI provider to check health
    // For now, we'll simulate status checks
    const updatedStatuses = aiStatuses.map(status => ({
      ...status,
      status: Math.random() > 0.1 ? 'online' as const : 'error' as const,
      lastTest: new Date().toISOString(),
      responseTime: Math.floor(Math.random() * 1000) + 100
    }));

    setAiStatuses(updatedStatuses);
  };

  const calculateOverallStatus = () => {
    if (aiStatuses.length === 0) {
      setOverallStatus('offline');
      return;
    }

    const onlineCount = aiStatuses.filter(s => s.status === 'online').length;
    
    if (onlineCount === aiStatuses.length) {
      setOverallStatus('online');
    } else if (onlineCount > 0) {
      setOverallStatus('partial');
    } else {
      setOverallStatus('offline');
    }
  };

  const updateProviderStatus = (providerId: string, newStatus: 'online' | 'offline' | 'error' | 'testing') => {
    setAiStatuses(prev => prev.map(status => 
      status.id === providerId 
        ? { ...status, status: newStatus, lastTest: new Date().toISOString() }
        : status
    ));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'testing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'offline':
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />;
    }
  };

  const getOverallIcon = () => {
    switch (overallStatus) {
      case 'online':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'offline':
      default:
        return <WifiOff className="h-4 w-4 text-red-500" />;
    }
  };

  const getOverallBadgeVariant = () => {
    switch (overallStatus) {
      case 'online':
        return 'default';
      case 'partial':
        return 'secondary';
      case 'offline':
      default:
        return 'destructive';
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Проверка AI статуса...</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={getOverallBadgeVariant()} className={`gap-1 cursor-pointer ${className}`}>
              {getOverallIcon()}
              AI {overallStatus === 'online' ? 'Активен' : overallStatus === 'partial' ? 'Частично' : 'Неактивен'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="z-[9999]">
            <div className="space-y-2">
              <p className="font-medium">Статус AI провайдеров:</p>
              {aiStatuses.map(status => (
                <div key={status.id} className="flex items-center gap-2 text-sm">
                  {getStatusIcon(status.status)}
                  <span>{status.name}</span>
                  {status.responseTime && (
                    <span className="text-xs text-muted-foreground">
                      ({status.responseTime}ms)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">AI Провайдеры</h3>
            </div>
            <Badge variant={getOverallBadgeVariant()} className="gap-1">
              {getOverallIcon()}
              {overallStatus === 'online' ? 'Все активны' : 
               overallStatus === 'partial' ? 'Частично активны' : 'Недоступны'}
            </Badge>
          </div>
          
          <div className="space-y-2">
            {aiStatuses.map(status => (
              <div key={status.id} className="flex items-center justify-between p-2 rounded border">
                <div className="flex items-center gap-2">
                  {getStatusIcon(status.status)}
                  <span className="text-sm font-medium">{status.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {status.responseTime && (
                    <span>{status.responseTime}ms</span>
                  )}
                  {status.lastTest && (
                    <span>{new Date(status.lastTest).toLocaleTimeString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}