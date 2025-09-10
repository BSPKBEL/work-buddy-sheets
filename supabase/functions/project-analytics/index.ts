import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, analysisType = 'full' } = await req.json();
    
    console.log(`Analyzing project ${projectId} with type: ${analysisType}`);

    // Get project with related data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        project_expenses (
          amount,
          category:expense_categories(name, type),
          date
        ),
        worker_assignments (
          role,
          start_date,
          end_date,
          worker:workers(full_name, daily_rate)
        ),
        project_tasks (
          status,
          priority,
          estimated_hours,
          actual_hours,
          start_date,
          due_date,
          completed_date
        ),
        attendance!inner(
          hours_worked,
          date,
          worker:workers(full_name, daily_rate)
        )
      `)
      .eq('id', projectId)
      .single();

    if (projectError) {
      throw new Error(`Project not found: ${projectError.message}`);
    }

    // Calculate financial metrics
    const totalExpenses = project.project_expenses?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
    const totalLabor = project.attendance?.reduce((sum, att) => {
      const dailyRate = att.worker?.daily_rate || 0;
      const hoursWorked = att.hours_worked || 8;
      return sum + (dailyRate * hoursWorked / 8);
    }, 0) || 0;

    const totalCost = totalExpenses + totalLabor;
    const budget = Number(project.budget) || 0;
    const profitMargin = budget > 0 ? ((budget - totalCost) / budget * 100) : 0;

    // Task completion metrics
    const tasks = project.project_tasks || [];
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100) : 0;

    // Time efficiency metrics
    const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
    const totalActualHours = tasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0);
    const timeEfficiency = totalEstimatedHours > 0 ? (totalEstimatedHours / totalActualHours * 100) : 0;

    // Expense breakdown by category
    const expensesByCategory = project.project_expenses?.reduce((acc, exp) => {
      const categoryName = exp.category?.name || 'Other';
      acc[categoryName] = (acc[categoryName] || 0) + Number(exp.amount);
      return acc;
    }, {} as Record<string, number>) || {};

    // Worker performance analysis
    const workerPerformance = project.attendance?.reduce((acc, att) => {
      const workerName = att.worker?.full_name || 'Unknown';
      if (!acc[workerName]) {
        acc[workerName] = {
          totalHours: 0,
          totalCost: 0,
          daysWorked: 0
        };
      }
      acc[workerName].totalHours += att.hours_worked || 8;
      acc[workerName].totalCost += (att.worker?.daily_rate || 0) * (att.hours_worked || 8) / 8;
      acc[workerName].daysWorked += 1;
      return acc;
    }, {} as Record<string, any>) || {};

    // Project timeline analysis
    const startDate = new Date(project.start_date);
    const endDate = project.end_date ? new Date(project.end_date) : new Date();
    const projectDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const progressPercentage = project.progress_percentage || 0;

    // Use AI for insights if available
    let aiInsights = null;
    const aiProvider = Deno.env.get('AI_PROVIDER') || 'openai';
    
    if (aiProvider === 'openai' && Deno.env.get('OPENAI_API_KEY')) {
      try {
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'Ты эксперт по анализу строительных проектов. Анализируй данные и давай практические рекомендации.'
              },
              {
                role: 'user',
                content: `Проект: ${project.name}
Бюджет: ${budget} руб.
Потрачено: ${totalCost} руб.
Рентабельность: ${profitMargin.toFixed(1)}%
Выполнено задач: ${taskCompletionRate.toFixed(1)}%
Эффективность времени: ${timeEfficiency.toFixed(1)}%
Прогресс: ${progressPercentage}%
Длительность: ${projectDuration} дней

Дай анализ проекта и рекомендации по оптимизации.`
              }
            ],
            max_tokens: 600,
            temperature: 0.7
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiInsights = aiData.choices[0]?.message?.content;
        }
      } catch (error) {
        console.error('AI insights error:', error);
      }
    }

    const analytics = {
      financial: {
        budget,
        totalCost,
        totalExpenses,
        totalLabor,
        profitMargin,
        costOverrun: totalCost > budget ? ((totalCost - budget) / budget * 100) : 0,
        expensesByCategory
      },
      performance: {
        taskCompletionRate,
        timeEfficiency,
        progressPercentage,
        completedTasks,
        totalTasks,
        projectDuration,
        workerPerformance
      },
      timeline: {
        startDate: project.start_date,
        endDate: project.end_date,
        duration: projectDuration,
        daysRemaining: project.end_date ? Math.ceil((new Date(project.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
      },
      risks: {
        budgetRisk: totalCost > budget * 0.8 ? 'high' : totalCost > budget * 0.6 ? 'medium' : 'low',
        timelineRisk: progressPercentage < 50 && projectDuration > 30 ? 'high' : 'low',
        resourceRisk: Object.keys(workerPerformance).length < 2 ? 'high' : 'low'
      },
      aiInsights
    };

    return new Response(JSON.stringify({
      project: {
        id: project.id,
        name: project.name,
        status: project.status
      },
      analytics
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in project-analytics:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});