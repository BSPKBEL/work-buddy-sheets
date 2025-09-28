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

serve(async (req): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportType, format = 'csv', filters = {} } = await req.json();
    
    console.log(`Generating ${reportType} report in ${format} format`);

    let data: any[] = [];
    let filename = '';
    let headers: string[] = [];

    switch (reportType) {
      case 'projects_financial':
        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select(`
            name,
            budget,
            actual_cost,
            start_date,
            end_date,
            status,
            progress_percentage,
            client:clients(name),
            project_expenses(amount, category:expense_categories(name))
          `);

        if (projectsError) throw projectsError;

        data = projects.map(p => ({
          'Проект': p.name,
          'Клиент': p.client?.name || 'Не указан',
          'Бюджет': p.budget || 0,
          'Фактическая стоимость': p.actual_cost || 0,
          'Прибыль': (Number(p.budget) || 0) - (Number(p.actual_cost) || 0),
          'Рентабельность %': p.budget ? (((Number(p.budget) - Number(p.actual_cost)) / Number(p.budget)) * 100).toFixed(2) : '0',
          'Прогресс %': p.progress_percentage || 0,
          'Статус': p.status,
          'Дата начала': p.start_date,
          'Дата окончания': p.end_date,
          'Общие расходы': p.project_expenses?.reduce((sum: number, e: any) => sum + Number(e.amount), 0) || 0
        }));

        filename = `financial_report_${new Date().toISOString().split('T')[0]}.csv`;
        headers = Object.keys(data[0] || {});
        break;

      case 'workers_performance':
        const { data: attendance, error: attendanceError } = await supabase
          .from('attendance')
          .select(`
            hours_worked,
            date,
            status,
            worker:workers(full_name, position, daily_rate),
            project:projects(name)
          `)
          .gte('date', filters.startDate || '2024-01-01')
          .lte('date', filters.endDate || new Date().toISOString().split('T')[0]);

        if (attendanceError) throw attendanceError;

        // Group by worker
        const workerStats = attendance.reduce((acc: any, record: any) => {
          const workerName = record.worker?.full_name || 'Unknown';
          if (!acc[workerName]) {
            acc[workerName] = {
              name: workerName,
              position: record.worker?.position || 'Не указана',
              dailyRate: record.worker?.daily_rate || 0,
              totalHours: 0,
              workDays: 0,
              projects: new Set(),
              totalEarnings: 0
            };
          }
          acc[workerName].totalHours += record.hours_worked || 8;
          acc[workerName].workDays += 1;
          acc[workerName].projects.add(record.project?.name || 'Unknown');
          acc[workerName].totalEarnings += (record.worker?.daily_rate || 0) * (record.hours_worked || 8) / 8;
          return acc;
        }, {});

        data = Object.values(workerStats).map((worker: any) => ({
          'Работник': worker.name,
          'Должность': worker.position,
          'Дневная ставка': worker.dailyRate,
          'Общие часы': worker.totalHours,
          'Рабочие дни': worker.workDays,
          'Средние часы в день': (worker.totalHours / worker.workDays).toFixed(2),
          'Проекты': worker.projects.size,
          'Общий заработок': worker.totalEarnings.toFixed(2),
          'Средний дневной заработок': (worker.totalEarnings / worker.workDays).toFixed(2)
        }));

        filename = `workers_performance_${new Date().toISOString().split('T')[0]}.csv`;
        headers = Object.keys(data[0] || {});
        break;

      case 'expenses_breakdown':
        const { data: expenses, error: expensesError } = await supabase
          .from('project_expenses')
          .select(`
            amount,
            date,
            description,
            category:expense_categories(name, type),
            project:projects(name)
          `)
          .gte('date', filters.startDate || '2024-01-01')
          .lte('date', filters.endDate || new Date().toISOString().split('T')[0]);

        if (expensesError) throw expensesError;

        data = expenses.map(e => ({
          'Проект': e.project?.name || 'Не указан',
          'Категория': e.category?.name || 'Не указана',
          'Тип категории': e.category?.type || 'general',
          'Сумма': e.amount,
          'Дата': e.date,
          'Описание': e.description || ''
        }));

        filename = `expenses_breakdown_${new Date().toISOString().split('T')[0]}.csv`;
        headers = Object.keys(data[0] || {});
        break;

      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    if (format === 'csv') {
      // Generate CSV
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      return new Response(csvContent, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } else if (format === 'json') {
      return new Response(JSON.stringify({
        reportType,
        generatedAt: new Date().toISOString(),
        totalRecords: data.length,
        data
      }, null, 2), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename.replace('.csv', '.json')}"`,
        },
      });
    }

    // Fallback return statement
    return new Response(JSON.stringify({ error: 'Unknown format' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in export-reports:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});