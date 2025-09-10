import { useMemo } from "react";
import { useSecureAuth } from "./useSecureAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AIContextData {
  allowedDataTypes: string[];
  maxComplexity: 'basic' | 'intermediate' | 'advanced';
  canAccessFinancials: boolean;
  canAccessAllProjects: boolean;
  canAccessAllWorkers: boolean;
  allowedPromptTypes: string[];
  restrictedWords: string[];
}

export function useAIContext() {
  const { isAdmin, isForeman, isWorker, user, isAuthenticated } = useSecureAuth();

  // Get user's accessible projects for foremen
  const { data: accessibleProjects = [] } = useQuery({
    queryKey: ['accessible-projects', user?.id],
    queryFn: async () => {
      if (!user || !isForeman) return [];
      
      const { data, error } = await supabase
        .from('worker_assignments')
        .select(`
          project_id,
          projects(id, name, status)
        `)
        .eq('foreman_id', user.id);

      if (error) throw error;
      return data?.map(a => a.projects).filter(Boolean) || [];
    },
    enabled: isAuthenticated && isForeman,
  });

  const aiContext: AIContextData = useMemo(() => {
    if (isAdmin) {
      return {
        allowedDataTypes: ['projects', 'workers', 'finances', 'analytics', 'clients', 'reports'],
        maxComplexity: 'advanced',
        canAccessFinancials: true,
        canAccessAllProjects: true,
        canAccessAllWorkers: true,
        allowedPromptTypes: ['analysis', 'recommendations', 'reports', 'predictions', 'management'],
        restrictedWords: []
      };
    }

    if (isForeman) {
      return {
        allowedDataTypes: ['projects', 'workers', 'attendance', 'tasks', 'basic_analytics'],
        maxComplexity: 'intermediate',
        canAccessFinancials: false,
        canAccessAllProjects: false,
        canAccessAllWorkers: false,
        allowedPromptTypes: ['project_management', 'worker_assignment', 'scheduling'],
        restrictedWords: ['budget', 'salary', 'profit', 'cost', 'expense', 'payment']
      };
    }

    if (isWorker) {
      return {
        allowedDataTypes: ['own_tasks', 'own_schedule', 'own_attendance'],
        maxComplexity: 'basic',
        canAccessFinancials: false,
        canAccessAllProjects: false,
        canAccessAllWorkers: false,
        allowedPromptTypes: ['task_help', 'schedule_check'],
        restrictedWords: ['budget', 'salary', 'profit', 'cost', 'expense', 'payment', 'other_workers', 'management']
      };
    }

    // Guest or unauthenticated
    return {
      allowedDataTypes: [],
      maxComplexity: 'basic',
      canAccessFinancials: false,
      canAccessAllProjects: false,
      canAccessAllWorkers: false,
      allowedPromptTypes: [],
      restrictedWords: ['all']
    };
  }, [isAdmin, isForeman, isWorker]);

  const getSystemPrompt = (purpose: string): string => {
    const basePrompt = `Ты AI помощник в системе управления строительными проектами. 
Текущая роль пользователя: ${isAdmin ? 'Администратор' : isForeman ? 'Прораб' : isWorker ? 'Рабочий' : 'Гость'}.`;

    const roleSpecificPrompts = {
      admin: `У тебя полный доступ ко всем данным. Можешь анализировать финансы, управление проектами, аналитику.
Отвечай профессионально и предоставляй детальные инсайты по бизнесу.`,
      
      foreman: `Ты можешь помочь с управлением проектами, назначением рабочих, планированием задач.
НЕ раскрывай финансовую информацию (бюджеты, зарплаты, расходы).
Фокусируйся на операционных вопросах и управлении командой.`,
      
      worker: `Ты можешь помочь только с личными задачами, расписанием и посещаемостью.
НЕ предоставляй информацию о других сотрудниках или финансах проекта.
Отвечай только на вопросы, касающиеся собственной работы пользователя.`,
      
      guest: `У тебя нет доступа к данным проекта. Можешь предоставить только общую справочную информацию.`
    };

    const roleKey = isAdmin ? 'admin' : isForeman ? 'foreman' : isWorker ? 'worker' : 'guest';
    
    return `${basePrompt}\n\n${roleSpecificPrompts[roleKey]}\n\nЦель запроса: ${purpose}`;
  };

  const filterPrompt = (prompt: string): { allowed: boolean; filteredPrompt: string; reason?: string } => {
    if (!isAuthenticated) {
      return { allowed: false, filteredPrompt: '', reason: 'Требуется авторизация' };
    }

    const lowerPrompt = prompt.toLowerCase();
    
    // Check for restricted words
    const foundRestrictedWords = aiContext.restrictedWords.filter(word => 
      word !== 'all' && lowerPrompt.includes(word.toLowerCase())
    );

    if (aiContext.restrictedWords.includes('all')) {
      return { allowed: false, filteredPrompt: '', reason: 'Нет доступа к AI функциям' };
    }

    if (foundRestrictedWords.length > 0) {
      return { 
        allowed: false, 
        filteredPrompt: '', 
        reason: `Запрос содержит ограниченные термины: ${foundRestrictedWords.join(', ')}` 
      };
    }

    // Add context to the prompt
    const contextualPrompt = `${prompt}\n\n[СИСТЕМНЫЙ КОНТЕКСТ: Роль=${isAdmin ? 'admin' : isForeman ? 'foreman' : 'worker'}, Доступные данные=${aiContext.allowedDataTypes.join(', ')}]`;

    return { allowed: true, filteredPrompt: contextualPrompt };
  };

  const canAccessAIFeature = (featureType: string): boolean => {
    const featurePermissions = {
      'recommendations': isAdmin || isForeman,
      'analytics': isAdmin,
      'reports': isAdmin || isForeman,
      'chat': isAuthenticated,
      'telegram_bot': isAuthenticated,
      'project_analysis': isAdmin
    };

    return featurePermissions[featureType] || false;
  };

  return {
    aiContext,
    accessibleProjects,
    getSystemPrompt,
    filterPrompt,
    canAccessAIFeature,
    isAIEnabled: isAuthenticated
  };
}