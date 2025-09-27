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

    // Available AI tools for database operations
    const availableTools = [
      {
        type: "function",
        function: {
          name: "create_worker",
          description: "Создать нового работника в системе",
          parameters: {
            type: "object",
            properties: {
              full_name: { type: "string", description: "Полное имя работника" },
              position: { type: "string", description: "Должность" },
              phone: { type: "string", description: "Номер телефона" },
              daily_rate: { type: "number", description: "Дневная ставка" },
              notes: { type: "string", description: "Дополнительные заметки" }
            },
            required: ["full_name"]
          }
        }
      },
      {
        type: "function", 
        function: {
          name: "record_attendance", 
          description: "Записать посещаемость работника",
          parameters: {
            type: "object",
            properties: {
              worker_id: { type: "string", description: "ID работника" },
              date: { type: "string", format: "date", description: "Дата в формате YYYY-MM-DD" },
              status: { type: "string", enum: ["present", "absent", "sick", "vacation"], description: "Статус посещаемости" },
              hours_worked: { type: "number", description: "Количество отработанных часов" },
              notes: { type: "string", description: "Заметки" }
            },
            required: ["worker_id", "date", "status"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_payment",
          description: "Создать платеж работнику",
          parameters: {
            type: "object", 
            properties: {
              worker_id: { type: "string", description: "ID работника" },
              amount: { type: "number", description: "Сумма платежа" },
              date: { type: "string", format: "date", description: "Дата платежа" },
              description: { type: "string", description: "Описание платежа" }
            },
            required: ["worker_id", "amount", "date"]
          }
        }
      }
    ];

    // Execute tool function
    async function executeToolFunction(name: string, args: any): Promise<any> {
      console.log(`Executing tool function: ${name}`, args);
      
      try {
        switch (name) {
          case 'create_worker':
            const { data: createResult } = await supabaseAdmin.rpc('ai_create_worker', {
              _full_name: args.full_name,
              _position: args.position,
              _phone: args.phone,
              _daily_rate: args.daily_rate || 0,
              _notes: args.notes
            });
            return createResult;
            
          case 'record_attendance':
            const { data: attendanceResult } = await supabaseAdmin.rpc('ai_record_attendance', {
              _worker_id: args.worker_id,
              _date: args.date,
              _status: args.status,
              _hours_worked: args.hours_worked || 8,
              _notes: args.notes
            });
            return attendanceResult;
            
          case 'create_payment':
            const { data: paymentResult } = await supabaseAdmin.rpc('ai_create_payment', {
              _worker_id: args.worker_id,
              _amount: args.amount,
              _date: args.date,
              _description: args.description
            });
            return paymentResult;
            
          default:
            return { success: false, error: `Неизвестная функция: ${name}` };
        }
      } catch (error) {
        console.error(`Error executing ${name}:`, error);
        return { success: false, error: `Ошибка выполнения ${name}: ${error instanceof Error ? error.message : String(error)}` };
      }
    }

    // Enhanced AI-powered query processing with full data access and tools
    const processWithAI = async (prompt: string, systemData: any): Promise<string> => {
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

        // ИИ получает ПОЛНЫЙ доступ к данным для анализа, но контролирует вывод по ролям
        const systemPrompt = `Ты - помощник для системы управления строительными проектами с полным доступом к данным и возможностями создания/обновления записей.

РОЛЬ ПОЛЬЗОВАТЕЛЯ: ${isAdmin ? 'Администратор' : isForeman ? 'Прораб' : 'Работник'}

ДОСТУПНЫЕ ДАННЫЕ (ПОЛНЫЙ НАБОР): ${JSON.stringify(systemData, null, 2)}

КРИТИЧЕСКИЕ ПРАВИЛА БЕЗОПАСНОСТИ ПО РОЛЯМ:

АДМИНИСТРАТОР (${isAdmin}):
- Полный доступ ко всей информации
- Может видеть финансы, платежи, личные данные клиентов
- Может получать информацию об управлении пользователями
- Может использовать все доступные инструменты

ПРОРАБ (${isForeman}):
- Может видеть данные работников, проекты, задачи
- Ограниченный доступ к финансам (только общая информация)
- НЕ показывать: детальные платежи, личные телефоны/адреса клиентов
- Маскировать: контакты клиентов (телефон: XXX***XX, email: xxx***@domain)
- Может записывать посещаемость для своих работников

РАБОТНИК (обычный пользователь):
- Может видеть только базовую информацию о проектах и коллегах
- НЕ показывать: финансовые данные, платежи, личную информацию клиентов
- НЕ показывать: детальные контакты, ставки работников
- НЕ может использовать инструменты для создания/изменения данных

ДОСТУПНЫЕ ИНСТРУМЕНТЫ:
- create_worker: Создание нового работника (только админ)
- record_attendance: Запись посещаемости (админ и прораб)
- create_payment: Создание платежа (только админ)

ИНСТРУКЦИИ ПО ВЫВОДУ:
1. Отвечай только на русском языке
2. Используй ТОЛЬКО данные из базы данных выше
3. НЕ придумывай никакой информации
4. Если данных нет - честно скажи об этом
5. Форматируй ответы читабельно с нумерацией списков
6. Используй имена людей из данных
7. Для финансов используй формат "X,XXX руб."
8. Отвечай кратко и по существу
9. ВАЖНО: На вопросы "кто?", "какие рабочие?" отвечай конкретными именами
10. Считай данные из массивов workers, projects, assignments
11. При запросах на создание/изменение данных используй соответствующие инструменты

ОСОБЕННОСТИ РАБОТЫ С НАЗНАЧЕНИЯМИ:
- assignments содержат назначения работников на проекты
- Структура: worker_id, project_id, role, start_date, end_date, workers.full_name, projects.name
- Активные назначения: end_date = null или в будущем
- role показывает должность в проекте

КОНТРОЛЬ ДОСТУПА К ИНФОРМАЦИИ:
${isAdmin ? 
  '- Администратор: показывай всю информацию без ограничений' :
  isForeman ? 
  '- Прораб: скрывай детальные финансы и личные данные клиентов, маскируй контакты' :
  '- Работник: показывай только общую информацию, скрывай финансы и личные данные'
}

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
          // OpenAI/DeepSeek format with tools support
          const requestBody: any = {
            model: model,
            messages: [
              { role: 'system', content: 'Ты помощник для системы управления строительными проектами с возможностями создания и обновления данных.' },
              { role: 'user', content: systemPrompt }
            ],
            max_tokens: 1500,
            tools: availableTools,
            tool_choice: "auto"
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
          const message = result.choices?.[0]?.message;
          
          // Handle tool calls if present
          if (message?.tool_calls && message.tool_calls.length > 0) {
            let toolResults = [];
            
            for (const toolCall of message.tool_calls) {
              const toolResult = await executeToolFunction(
                toolCall.function.name,
                JSON.parse(toolCall.function.arguments)
              );
              toolResults.push({
                tool: toolCall.function.name,
                result: toolResult
              });
            }
            
            // Return combined response with tool results
            const toolSummary = toolResults.map(tr => 
              `${tr.tool}: ${tr.result.success ? tr.result.message : tr.result.error}`
            ).join('\n');
            
            return `${message.content || 'Операция выполнена'}\n\nРезультаты операций:\n${toolSummary}`;
          }
          
          return message?.content || 'Не удалось получить ответ от ИИ.';
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
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});