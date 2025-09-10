import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// API keys
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const deepSeekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
const aiProvider = Deno.env.get('AI_PROVIDER') || 'openai';

// Bot commands
const COMMANDS = {
  START: '/start',
  HELP: '/help',
  STATUS: '/status',
  WORKERS: '/workers',
  ATTENDANCE: '/attendance',
  PAYMENTS: '/payments',
  REPORTS: '/reports',
  ADD_WORKER: '/add_worker',
  MARK_ATTENDANCE: '/mark_attendance',
  ADD_PAYMENT: '/add_payment',
};

interface TelegramMessage {
  message_id: number;
  from: {
    id: number;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  date: number;
  text?: string;
  photo?: Array<{
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
  }>;
  voice?: {
    file_id: string;
    file_unique_id: string;
    duration: number;
    mime_type?: string;
    file_size?: number;
  };
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

// Function to get file from Telegram
async function getTelegramFile(fileId: string): Promise<Uint8Array> {
  const fileResponse = await fetch(`https://api.telegram.org/bot${telegramBotToken}/getFile?file_id=${fileId}`);
  const fileData = await fileResponse.json();
  
  if (!fileData.ok) {
    throw new Error(`Failed to get file info: ${fileData.description}`);
  }
  
  const fileUrl = `https://api.telegram.org/file/bot${telegramBotToken}/${fileData.result.file_path}`;
  const response = await fetch(fileUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  
  return new Uint8Array(await response.arrayBuffer());
}

// Function to call AI provider
async function callAIProvider(messages: any[], useVision: boolean = false): Promise<any> {
  const provider = aiProvider === 'mixed' ? (useVision ? 'openai' : 'deepseek') : aiProvider;
  
  if (provider === 'deepseek' && deepSeekApiKey) {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepSeekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        max_tokens: 800,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.statusText}`);
    }

    return await response.json();
  } else if (provider === 'openai' && openAIApiKey) {
    const model = useVision ? 'gpt-4o-mini' : 'gpt-5-mini-2025-08-07';
    const body: any = {
      model,
      messages,
    };
    
    // Use correct parameter based on model
    if (model.includes('gpt-5') || model.includes('gpt-4.1') || model.includes('o3') || model.includes('o4')) {
      body.max_completion_tokens = 800;
    } else {
      body.max_tokens = useVision ? 500 : 800;
      if (!useVision) body.temperature = 0.3;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    return await response.json();
  } else {
    throw new Error(`AI provider ${provider} not configured or API key missing`);
  }
}

// Function to process text with AI
async function processTextWithAI(text: string): Promise<any> {
  const systemPrompt = `Ты умный помощник для управления строительными работниками и проектами. 
  
  Анализируй сообщения и определяй действия:
  
  🏗️ РАБОТНИКИ:
  - Добавление: имя, телефон, ставка в день
  - Поиск/просмотр информации
  
  📅 ПРИСУТСТВИЕ:
  - Статусы: present/absent/sick/vacation
  - Часы работы, заметки
  - Дата (если не указана - сегодня)
  
  💰 ВЫПЛАТЫ:
  - Сумма, описание, дата
  - Связь с работником
  
  📊 ОТЧЕТЫ И СТАТИСТИКА:
  - Запросы данных
  - Аналитика по проектам
  
  ❓ ПОМОЩЬ:
  - Неясные запросы объясняй
  
  Отвечай ТОЛЬКО в JSON:
  {
    "action": "add_worker" | "update_attendance" | "add_payment" | "get_info" | "help" | "unknown",
    "data": {
      // Соответствующие поля для действия
    },
    "message": "Понятное объяснение что будет сделано"
  }`;

  const data = await callAIProvider([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text }
  ]);
  return JSON.parse(data.choices[0].message.content);
}

// Function to process image with OpenAI Vision
async function processImageWithAI(imageData: Uint8Array): Promise<any> {
  const base64Image = btoa(String.fromCharCode(...imageData));
  
  const systemPrompt = `Анализируй изображения связанные с строительными работами.
  Извлекай информацию о работниках, присутствии или выплатах.
  
  Отвечай ТОЛЬКО в JSON формате:
  {
    "action": "add_worker" | "update_attendance" | "add_payment" | "unknown",
    "data": {
      // соответствующие поля
    },
    "description": "краткое описание того, что видно на фото"
  }`;

  const data = await callAIProvider([
    { role: 'system', content: systemPrompt },
    { 
      role: 'user', 
      content: [
        { type: 'text', text: 'Проанализируй это изображение' },
        { 
          type: 'image_url', 
          image_url: { 
            url: `data:image/jpeg;base64,${base64Image}` 
          } 
        }
      ]
    }
  ], true);
  return JSON.parse(data.choices[0].message.content);
}

// Function to process audio with OpenAI Whisper
async function processAudioWithAI(audioData: Uint8Array): Promise<any> {
  // Convert to transcription first
  const formData = new FormData();
  const blob = new Blob([audioData], { type: 'audio/ogg' });
  formData.append('file', blob, 'audio.ogg');
  formData.append('model', 'whisper-1');
  formData.append('language', 'ru');

  const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
    },
    body: formData,
  });

  if (!transcriptionResponse.ok) {
    throw new Error(`Whisper API error: ${transcriptionResponse.statusText}`);
  }

  const transcriptionData = await transcriptionResponse.json();
  console.log('Transcribed text:', transcriptionData.text);

  // Process transcribed text
  return await processTextWithAI(transcriptionData.text);
}

// Function to find worker by name
async function findWorkerByName(name: string) {
  const { data: workers } = await supabase
    .from('workers')
    .select('*')
    .ilike('full_name', `%${name}%`)
    .limit(1);
  
  return workers?.[0] || null;
}

// Function to execute actions based on AI analysis
async function executeAction(actionData: any): Promise<string> {
  console.log('Executing action:', actionData);

  switch (actionData.action) {
    case 'add_worker':
      const { data: newWorker, error: workerError } = await supabase
        .from('workers')
        .insert({
          full_name: actionData.data.full_name,
          phone: actionData.data.phone,
          daily_rate: actionData.data.daily_rate || 0
        })
        .select()
        .single();

      if (workerError) {
        console.error('Error adding worker:', workerError);
        return `Ошибка при добавлении работника: ${workerError.message}`;
      }
      
      return `✅ Добавлен работник: ${newWorker.full_name}`;

    case 'update_attendance':
      const worker = await findWorkerByName(actionData.data.worker_name);
      if (!worker) {
        return `❌ Работник "${actionData.data.worker_name}" не найден`;
      }

      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .upsert({
          worker_id: worker.id,
          date: actionData.data.date || new Date().toISOString().split('T')[0],
          status: actionData.data.status,
          hours_worked: actionData.data.hours_worked || 8,
          notes: actionData.data.notes
        }, {
          onConflict: 'worker_id,date'
        })
        .select()
        .single();

      if (attendanceError) {
        console.error('Error updating attendance:', attendanceError);
        return `Ошибка при обновлении присутствия: ${attendanceError.message}`;
      }

      return `✅ Обновлено присутствие для ${worker.full_name}: ${actionData.data.status}`;

    case 'add_payment':
      const paymentWorker = await findWorkerByName(actionData.data.worker_name);
      if (!paymentWorker) {
        return `❌ Работник "${actionData.data.worker_name}" не найден`;
      }

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          worker_id: paymentWorker.id,
          date: actionData.data.date || new Date().toISOString().split('T')[0],
          amount: actionData.data.amount,
          description: actionData.data.description
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Error adding payment:', paymentError);
        return `Ошибка при добавлении выплаты: ${paymentError.message}`;
      }

      return `✅ Добавлена выплата для ${paymentWorker.full_name}: ${actionData.data.amount} руб.`;

    default:
      return `❓ Не удалось определить действие. Попробуйте переформулировать сообщение.`;
  }
}

// Function to send message to Telegram
async function sendTelegramMessage(chatId: number, text: string, options: any = {}) {
  const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      ...options
    }),
  });

  if (!response.ok) {
    console.error('Failed to send Telegram message:', await response.text());
  }
}

// Command handlers
async function handleStartCommand(chatId: number) {
  const welcomeText = `🏗️ <b>Добро пожаловать в СтройМенеджер!</b>

Я помогу вам управлять строительными работниками и проектами.

<b>📋 Основные команды:</b>
${COMMANDS.HELP} - Показать все команды
${COMMANDS.STATUS} - Статус системы
${COMMANDS.WORKERS} - Список работников
${COMMANDS.ATTENDANCE} - Посещаемость за сегодня
${COMMANDS.PAYMENTS} - Последние выплаты

<b>🤖 Умные функции:</b>
• Отправьте текст - я автоматически определю что нужно сделать
• Отправьте фото с объекта - получите анализ
• Отправьте голосовое сообщение - я распознаю речь

<b>Примеры сообщений:</b>
"Добавить работника Иван Петров, телефон 89123456789, ставка 2000"
"Иван сегодня отработал 8 часов"
"Выплатить Петрову 5000 рублей за неделю"`;

  await sendTelegramMessage(chatId, welcomeText);
}

async function handleHelpCommand(chatId: number) {
  const helpText = `🔧 <b>Все команды СтройМенеджера:</b>

<b>📊 Информация:</b>
${COMMANDS.STATUS} - Статус системы и статистика
${COMMANDS.WORKERS} - Список всех работников
${COMMANDS.ATTENDANCE} - Посещаемость за сегодня
${COMMANDS.PAYMENTS} - Последние выплаты
${COMMANDS.REPORTS} - Отчеты по проектам

<b>➕ Добавление данных:</b>
${COMMANDS.ADD_WORKER} [имя] [телефон] [ставка] - Добавить работника
${COMMANDS.MARK_ATTENDANCE} [имя] [статус] - Отметить присутствие
${COMMANDS.ADD_PAYMENT} [имя] [сумма] [описание] - Добавить выплату

<b>🎯 Статусы присутствия:</b>
• present - присутствует
• absent - отсутствует
• sick - болеет
• vacation - в отпуске

<b>💡 Умный режим:</b>
Просто напишите что вам нужно обычными словами - я пойму!`;

  await sendTelegramMessage(chatId, helpText);
}

async function handleStatusCommand(chatId: number) {
  try {
    // Get workers count
    const { count: workersCount } = await supabase
      .from('workers')
      .select('*', { count: 'exact', head: true });

    // Get today's attendance
    const today = new Date().toISOString().split('T')[0];
    const { count: presentCount } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('date', today)
      .eq('status', 'present');

    // Get recent payments
    const { data: recentPayments } = await supabase
      .from('payments')
      .select('amount')
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    const totalPayments = recentPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;

    const statusText = `📊 <b>Статус СтройМенеджера</b>

👷‍♂️ <b>Работники:</b> ${workersCount || 0} человек
✅ <b>Сегодня на работе:</b> ${presentCount || 0} человек
💰 <b>Выплаты за неделю:</b> ${totalPayments.toLocaleString()} руб.

🕐 <b>Обновлено:</b> ${new Date().toLocaleString('ru-RU')}

Система работает нормально! 🟢`;

    await sendTelegramMessage(chatId, statusText);
  } catch (error) {
    await sendTelegramMessage(chatId, `❌ Ошибка получения статуса: ${error.message}`);
  }
}

async function handleWorkersCommand(chatId: number) {
  try {
    const { data: workers } = await supabase
      .from('workers')
      .select('*')
      .order('full_name');

    if (!workers || workers.length === 0) {
      await sendTelegramMessage(chatId, '👷‍♂️ Работники пока не добавлены');
      return;
    }

    let workersText = '👷‍♂️ <b>Список работников:</b>\n\n';
    
    for (const worker of workers) {
      workersText += `• <b>${worker.full_name}</b>\n`;
      workersText += `  📞 ${worker.phone || 'Не указан'}\n`;
      workersText += `  💰 ${worker.daily_rate} руб/день\n\n`;
    }

    await sendTelegramMessage(chatId, workersText);
  } catch (error) {
    await sendTelegramMessage(chatId, `❌ Ошибка получения списка работников: ${error.message}`);
  }
}

async function handleAttendanceCommand(chatId: number) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: attendance } = await supabase
      .from('attendance')
      .select(`
        *,
        workers (full_name)
      `)
      .eq('date', today)
      .order('status');

    if (!attendance || attendance.length === 0) {
      await sendTelegramMessage(chatId, '📅 На сегодня посещаемость не отмечена');
      return;
    }

    let attendanceText = `📅 <b>Посещаемость на ${new Date().toLocaleDateString('ru-RU')}:</b>\n\n`;
    
    const statusEmojis = {
      present: '✅',
      absent: '❌',
      sick: '🤒',
      vacation: '🏖️'
    };

    const statusNames = {
      present: 'Присутствует',
      absent: 'Отсутствует',
      sick: 'Болеет',
      vacation: 'В отпуске'
    };

    for (const record of attendance) {
      const emoji = statusEmojis[record.status] || '❓';
      const statusName = statusNames[record.status] || record.status;
      attendanceText += `${emoji} <b>${record.workers.full_name}</b> - ${statusName}`;
      if (record.hours_worked) {
        attendanceText += ` (${record.hours_worked}ч)`;
      }
      if (record.notes) {
        attendanceText += `\n  💬 ${record.notes}`;
      }
      attendanceText += '\n\n';
    }

    await sendTelegramMessage(chatId, attendanceText);
  } catch (error) {
    await sendTelegramMessage(chatId, `❌ Ошибка получения посещаемости: ${error.message}`);
  }
}

async function handlePaymentsCommand(chatId: number) {
  try {
    const { data: payments } = await supabase
      .from('payments')
      .select(`
        *,
        workers (full_name)
      `)
      .order('date', { ascending: false })
      .limit(10);

    if (!payments || payments.length === 0) {
      await sendTelegramMessage(chatId, '💰 Выплаты пока не зарегистрированы');
      return;
    }

    let paymentsText = '💰 <b>Последние выплаты:</b>\n\n';
    
    for (const payment of payments) {
      const date = new Date(payment.date).toLocaleDateString('ru-RU');
      paymentsText += `💵 <b>${payment.amount.toLocaleString()} руб.</b>\n`;
      paymentsText += `👤 ${payment.workers.full_name}\n`;
      paymentsText += `📅 ${date}\n`;
      if (payment.description) {
        paymentsText += `📝 ${payment.description}\n`;
      }
      paymentsText += '\n';
    }

    await sendTelegramMessage(chatId, paymentsText);
  } catch (error) {
    await sendTelegramMessage(chatId, `❌ Ошибка получения выплат: ${error.message}`);
  }
}

async function handleReportsCommand(chatId: number) {
  try {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Weekly stats
    const { data: weeklyAttendance } = await supabase
      .from('attendance')
      .select('*')
      .gte('date', weekAgo.toISOString().split('T')[0])
      .eq('status', 'present');

    const { data: weeklyPayments } = await supabase
      .from('payments')
      .select('amount')
      .gte('date', weekAgo.toISOString().split('T')[0]);

    // Monthly stats
    const { data: monthlyPayments } = await supabase
      .from('payments')
      .select('amount')
      .gte('date', monthAgo.toISOString().split('T')[0]);

    const weeklyHours = weeklyAttendance?.reduce((sum, a) => sum + (a.hours_worked || 8), 0) || 0;
    const weeklyPaymentsSum = weeklyPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const monthlyPaymentsSum = monthlyPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;

    const reportsText = `📈 <b>Отчеты СтройМенеджера</b>

<b>📊 За неделю:</b>
⏰ Отработано часов: ${weeklyHours}
💰 Выплачено: ${weeklyPaymentsSum.toLocaleString()} руб.

<b>📊 За месяц:</b>
💰 Общие выплаты: ${monthlyPaymentsSum.toLocaleString()} руб.

<b>💡 Средние показатели:</b>
📅 Часов в день: ${weeklyHours > 0 ? Math.round(weeklyHours / 7) : 0}
💵 Выплат в день: ${weeklyPaymentsSum > 0 ? Math.round(weeklyPaymentsSum / 7).toLocaleString() : 0} руб.

🕐 <b>Создано:</b> ${new Date().toLocaleString('ru-RU')}`;

    await sendTelegramMessage(chatId, reportsText);
  } catch (error) {
    await sendTelegramMessage(chatId, `❌ Ошибка создания отчетов: ${error.message}`);
  }
}

// Enhanced command processing
async function processCommand(message: TelegramMessage): Promise<string> {
  const text = message.text?.trim();
  if (!text) return '';

  const chatId = message.chat.id;

  // Handle basic commands
  if (text === COMMANDS.START) {
    await handleStartCommand(chatId);
    return '';
  }

  if (text === COMMANDS.HELP) {
    await handleHelpCommand(chatId);
    return '';
  }

  if (text === COMMANDS.STATUS) {
    await handleStatusCommand(chatId);
    return '';
  }

  if (text === COMMANDS.WORKERS) {
    await handleWorkersCommand(chatId);
    return '';
  }

  if (text === COMMANDS.ATTENDANCE) {
    await handleAttendanceCommand(chatId);
    return '';
  }

  if (text === COMMANDS.PAYMENTS) {
    await handlePaymentsCommand(chatId);
    return '';
  }

  if (text === COMMANDS.REPORTS) {
    await handleReportsCommand(chatId);
    return '';
  }

  // Handle structured commands with parameters
  if (text.startsWith(COMMANDS.ADD_WORKER)) {
    const params = text.replace(COMMANDS.ADD_WORKER, '').trim().split(' ');
    if (params.length < 3) {
      return 'Формат: /add_worker [Имя Фамилия] [телефон] [ставка]\nПример: /add_worker Иван Петров 89123456789 2000';
    }
    
    const name = params.slice(0, -2).join(' ');
    const phone = params[params.length - 2];
    const rate = parseInt(params[params.length - 1]);
    
    return await executeAction({
      action: 'add_worker',
      data: { full_name: name, phone, daily_rate: rate }
    });
  }

  if (text.startsWith(COMMANDS.MARK_ATTENDANCE)) {
    const params = text.replace(COMMANDS.MARK_ATTENDANCE, '').trim().split(' ');
    if (params.length < 2) {
      return 'Формат: /mark_attendance [Имя] [статус]\nПример: /mark_attendance Иван present';
    }
    
    const name = params.slice(0, -1).join(' ');
    const status = params[params.length - 1];
    
    return await executeAction({
      action: 'update_attendance',
      data: { worker_name: name, status, date: new Date().toISOString().split('T')[0] }
    });
  }

  if (text.startsWith(COMMANDS.ADD_PAYMENT)) {
    const params = text.replace(COMMANDS.ADD_PAYMENT, '').trim().split(' ');
    if (params.length < 3) {
      return 'Формат: /add_payment [Имя] [сумма] [описание]\nПример: /add_payment Иван 5000 за неделю';
    }
    
    const name = params.slice(0, -2).join(' ');
    const amount = parseInt(params[params.length - 2]);
    const description = params[params.length - 1];
    
    return await executeAction({
      action: 'add_payment',
      data: { worker_name: name, amount, description, date: new Date().toISOString().split('T')[0] }
    });
  }

  // If not a command, process with AI
  return 'ai_process';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const update: TelegramUpdate = await req.json();
    console.log('Received Telegram update:', JSON.stringify(update, null, 2));

    if (!update.message) {
      return new Response('OK', { status: 200 });
    }

    const message = update.message;
    let result = '';

    try {
      // Check if it's a command first
      if (message.text && message.text.startsWith('/')) {
        result = await processCommand(message);
        if (result === '') {
          // Command was handled, no need to send additional message
          return new Response('OK', { status: 200 });
        }
        if (result !== 'ai_process') {
          await sendTelegramMessage(message.chat.id, result);
          return new Response('OK', { status: 200 });
        }
      }

      // Process with AI
      let actionData;

      if (message.text) {
        console.log('Processing text message with AI:', message.text);
        actionData = await processTextWithAI(message.text);
      } else if (message.photo && message.photo.length > 0) {
        console.log('Processing photo message');
        const photo = message.photo[message.photo.length - 1]; // Get highest resolution
        const imageData = await getTelegramFile(photo.file_id);
        actionData = await processImageWithAI(imageData);
      } else if (message.voice) {
        console.log('Processing voice message');
        const audioData = await getTelegramFile(message.voice.file_id);
        actionData = await processAudioWithAI(audioData);
      } else {
        await sendTelegramMessage(message.chat.id, '❓ Поддерживаются только текстовые сообщения, фото и голосовые сообщения.\n\nИспользуйте /help для списка команд.');
        return new Response('OK', { status: 200 });
      }

      console.log('AI analysis result:', actionData);
      
      // Handle different action types
      if (actionData.action === 'help') {
        await handleHelpCommand(message.chat.id);
        return new Response('OK', { status: 200 });
      }

      if (actionData.action === 'get_info') {
        // Handle info requests
        const infoText = actionData.message || '📊 Используйте команды /status, /workers, /attendance, /payments для получения информации.';
        await sendTelegramMessage(message.chat.id, infoText);
        return new Response('OK', { status: 200 });
      }

      if (actionData.action === 'unknown') {
        const helpText = `❓ ${actionData.message || 'Не понял ваш запрос.'}

💡 <b>Попробуйте:</b>
• /help - все команды
• "Добавить работника Иван 89123456789 2000"
• "Иван сегодня работал 8 часов"
• "Выплатить Петрову 5000"`;
        
        await sendTelegramMessage(message.chat.id, helpText);
        return new Response('OK', { status: 200 });
      }

      // Execute action
      result = await executeAction(actionData);
      
      // Add AI message if provided
      if (actionData.message && result.includes('✅')) {
        result = `${result}\n\n💡 ${actionData.message}`;
      }

    } catch (aiError) {
      console.error('AI processing error:', aiError);
      result = `❌ Ошибка обработки: ${aiError.message}\n\nИспользуйте /help для просмотра доступных команд.`;
    }

    await sendTelegramMessage(message.chat.id, result);
    
    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});