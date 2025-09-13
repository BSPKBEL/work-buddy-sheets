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
  testResult?: string;
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

  // Fetch AI providers on mount and set up realtime updates
  useEffect(() => {
    fetchAIProviders();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('ai_providers_status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_providers'
        },
        () => {
          fetchAIProviders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Recalculate overall status when aiStatuses changes
  useEffect(() => {
    setOverallStatus(calculateOverallStatus(aiStatuses));
  }, [aiStatuses]);

  const fetchAIProviders = async () => {
    try {
      const { data: providers, error } = await supabase
        .from('ai_providers')
        .select('*')
        .eq('is_active', true)
        .order('priority');

      if (error) {
        console.error('Error fetching AI providers:', error);
        return;
      }

      if (providers) {
        const statuses: AIStatus[] = providers.map(provider => ({
          id: provider.id,
          name: provider.name,
          status: (provider.last_status as 'online' | 'offline' | 'error' | 'testing') || 'offline',
          testResult: provider.last_status === 'online' ? 
            `Последний тест: ${provider.last_tested_at ? new Date(provider.last_tested_at).toLocaleString('ru-RU') : 'н/д'}${provider.last_response_time_ms ? ` (${provider.last_response_time_ms}ms)` : ''}` : 
            null,
          errorMessage: provider.last_error || null
        }));
        
        setAiStatuses(statuses);
      }
    } catch (error) {
      console.error('Error in fetchAIProviders:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateOverallStatus = (statuses: AIStatus[]) => {
    if (statuses.length === 0) {
      return 'offline';
    }

    const onlineCount = statuses.filter(s => s.status === 'online').length;
    
    if (onlineCount === statuses.length) {
      return 'online';
    } else if (onlineCount > 0) {
      return 'partial';
    } else {
      return 'offline';
    }
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
                  {status.testResult && (
                    <span className="text-xs text-muted-foreground">
                      {status.testResult}
                    </span>
                  )}
                  {status.errorMessage && (
                    <span className="text-xs text-red-500">
                      {status.errorMessage}
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
                <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                  {status.testResult && (
                    <span>{status.testResult}</span>
                  )}
                  {status.errorMessage && (
                    <span className="text-red-500">{status.errorMessage}</span>
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