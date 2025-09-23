import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from request
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Токен авторизации отсутствует' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Недействительный токен авторизации' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user roles for access control
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true);

    const isAdmin = userRoles?.some(r => r.role === 'admin') || false;
    const isForeman = userRoles?.some(r => r.role === 'foreman') || false;

    console.log(`AI Chat request from user: ${user.email}, roles: ${userRoles?.map(r => r.role).join(', ')}`);

    // Helper function to send response
    const sendResponse = (message: string) => {
      return new Response(
        JSON.stringify({ message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    };

    // Comprehensive database access function
    const getComprehensiveData = async () => {
      const data: any = {};
      
      try {
        // Users and roles
        const { data: users } = await supabaseAdmin.from('profiles').select('*');
        const { data: userRoles } = await supabaseAdmin.from('user_roles').select('*, profiles!inner(full_name)');
        data.users = users;
        data.userRoles = userRoles;
        
        // Workers data
        const { data: workers } = await supabaseAdmin.from('workers').select('*');
        const { data: workerSkills } = await supabaseAdmin.from('worker_skills').select('*, workers(full_name), skills(name)');
        const { data: certifications } = await supabaseAdmin.from('certifications').select('*, workers(full_name)');
        data.workers = workers;
        data.workerSkills = workerSkills;
        data.certifications = certifications;
        
        // Projects and assignments
        const { data: projects } = await supabaseAdmin.from('projects').select('*, clients(name)');
        const { data: assignments, error: assignmentsError } = await supabaseAdmin.from('worker_assignments').select('*, workers(full_name), projects(name)');
        if (assignmentsError) {
          console.error('Error fetching assignments:', assignmentsError);
        }
        const { data: tasks } = await supabaseAdmin.from('project_tasks').select('*, projects(name), workers(full_name)');
        data.projects = projects;
        data.assignments = assignments;
        data.tasks = tasks;
        
        // Financial data
        const { data: payments } = await supabaseAdmin.from('payments').select('*, workers(full_name)');
        const { data: projectExpenses } = await supabaseAdmin.from('project_expenses').select('*, projects(name), expense_categories(name)');
        const { data: workerExpenses } = await supabaseAdmin.from('worker_expenses').select('*, workers(full_name), expense_categories(name)');
        data.payments = payments;
        data.projectExpenses = projectExpenses;
        data.workerExpenses = workerExpenses;
        
        // Attendance
        const { data: attendance } = await supabaseAdmin.from('attendance').select('*, workers(full_name)');
        data.attendance = attendance;
        
        // Clients
        const { data: clients } = await supabaseAdmin.from('clients').select('*');
        data.clients = clients;
        
        // Skills and categories
        const { data: skills } = await supabaseAdmin.from('skills').select('*');
        const { data: expenseCategories } = await supabaseAdmin.from('expense_categories').select('*');
        data.skills = skills;
        data.expenseCategories = expenseCategories;
        
        // System settings
        const { data: systemSettings } = await supabaseAdmin.from('system_settings').select('*');
        data.systemSettings = systemSettings;
        
        return data;
      } catch (error) {
        console.error('Error fetching comprehensive data:', error);
        return {};
      }
    };

    // Enhanced AI-powered query processing
    const processWithAI = async (prompt: string, systemData: any) => {
      try {
        // Get active AI providers
        const { data: providers } = await supabaseAdmin
          .from('ai_providers')
          .select('*')
          .eq('is_active', true)
          .order('priority', { ascending: true });

        if (!providers || providers.length === 0) {
          return 'ИИ провайдеры не настроены.';
        }

        const provider = providers[0];
        let apiKey = '';
        let endpoint = '';
        let model = '';

        // Get API configuration based on provider type
        switch (provider.provider_type) {
          case 'openai':
            apiKey = Deno.env.get('OPENAI_API_KEY') || '';
            endpoint = 'https://api.openai.com/v1/chat/completions';
            model = provider.model_name || 'gpt-4o-mini';
            break;
          case 'deepseek':
            apiKey = Deno.env.get('DEEPSEEK_API_KEY') || '';
            endpoint = 'https://api.deepseek.com/chat/completions';
            model = provider.model_name || 'deepseek-chat';
            break;
          case 'anthropic':
            apiKey = Deno.env.get('ANTHROPIC_API_KEY') || '';
            endpoint = 'https://api.anthropic.com/v1/messages';
            model = provider.model_name || 'claude-3-5-haiku-20241022';
            break;
          default:
            return 'Неподдерживаемый провайдер ИИ.';
        }

        if (!apiKey) {
          return 'API ключ не настроен для выбранного провайдера.';
        }

        // Filter system data based on user role
        let filteredData = systemData;
        if (!isAdmin) {
          // Remove sensitive data for non-admin users
          filteredData = {
            ...systemData,
            clients: systemData.clients?.map((c: any) => ({
              id: c.id,
              name: c.name,
              status: c.status,
              company_type: c.company_type
            })),
            payments: isForeman ? systemData.payments : [],
            workerExpenses: isAdmin ? systemData.workerExpenses : [],
            projectExpenses: isForeman || isAdmin ? systemData.projectExpenses : []
          };
        }

        // Create comprehensive system prompt
        const systemPrompt = `Ты - помощник для системы управления строительными проектами. 
        
РОЛЬ ПОЛЬЗОВАТЕЛЯ: ${isAdmin ? 'Администратор' : isForeman ? 'Прораб' : 'Работник'}
ДОСТУПНЫЕ ДАННЫЕ: ${JSON.stringify(filteredData, null, 2)}

ИНСТРУКЦИИ:
1. Отвечай только на русском языке
2. Используй ТОЛЬКО данные из базы данных выше
3. Не придумывай никакой информации
4. Если данных нет - честно скажи об этом
5. Форматируй ответы читабельно с нумерацией списков и используй имена людей
6. Учитывай роль пользователя при предоставлении информации
7. Для финансовых данных используй формат "X,XXX руб."
8. Отвечай кратко и по существу
9. ВАЖНО: На вопросы "кто?", "какие рабочие?", "кто работает?" отвечай конкретными именами из данных
10. На вопросы о количестве рабочих/проектов считай данные из workers и projects

ОСОБЕННОСТИ РАБОТЫ С НАЗНАЧЕНИЯМИ (assignments):
- В массиве "assignments" содержатся данные о назначениях работников на проекты
- Каждая запись содержит: worker_id, project_id, role, start_date, end_date, workers.full_name, projects.name
- Если end_date = null или в будущем - назначение активно
- Поле role показывает должность (worker/foreman)
- НЕ говори что "assignments: null" если данные есть - анализируй их правильно
- Когда спрашивают про привязки к проектам, используй именно эти данные

КОНТЕКСТ РАЗГОВОРА: Отвечай исходя из предыдущего контекста беседы если это уместно.

Пользователь спрашивает: "${prompt}"`;

        // Make API request based on provider
        let response;
        if (provider.provider_type === 'anthropic') {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: model,
              max_tokens: 1000,
              messages: [
                { role: 'user', content: systemPrompt }
              ]
            }),
          });
        } else {
          // OpenAI/DeepSeek format
          const requestBody: any = {
            model: model,
            messages: [
              { role: 'system', content: 'Ты помощник для системы управления строительными проектами.' },
              { role: 'user', content: systemPrompt }
            ],
            max_tokens: 1000
          };

          // Add temperature only for older models that support it
          if (!model.includes('gpt-5') && !model.includes('o3') && !model.includes('o4')) {
            requestBody.temperature = 0.1;
          }

          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestBody),
          });
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error('AI API error:', response.status, errorText);
          throw new Error(`API request failed: ${response.status}`);
        }

        const result = await response.json();
        
        if (provider.provider_type === 'anthropic') {
          return result.content?.[0]?.text || 'Не удалось получить ответ от ИИ.';
        } else {
          return result.choices?.[0]?.message?.content || 'Не удалось получить ответ от ИИ.';
        }

      } catch (error) {
        console.error('AI processing error:', error);
        return 'Произошла ошибка при обработке запроса.';
      }
    };

    // Get comprehensive data for AI processing
    const systemData = await getComprehensiveData();

    // Process query with AI using all available data
    const aiResponse = await processWithAI(prompt, systemData);
    return sendResponse(aiResponse);

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Внутренняя ошибка сервера',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});