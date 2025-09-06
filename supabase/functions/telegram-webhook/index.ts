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

// OpenAI API key
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const telegramBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');

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

// Function to process text with OpenAI
async function processTextWithAI(text: string): Promise<any> {
  const systemPrompt = `Ты помощник для управления строительными работниками. 
  Анализируй сообщения и извлекай информацию о:
  - Работниках (имя, телефон, ставка в день)
  - Присутствии (дата, статус: present/absent/sick/vacation, часы работы, заметки)
  - Выплатах (дата, сумма, описание)
  
  Отвечай ТОЛЬКО в JSON формате:
  {
    "action": "add_worker" | "update_attendance" | "add_payment" | "unknown",
    "data": {
      // для работника: full_name, phone, daily_rate
      // для присутствия: worker_name, date, status, hours_worked, notes
      // для выплаты: worker_name, date, amount, description
    }
  }`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      max_tokens: 500,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
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

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
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
      ],
      max_tokens: 500,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI Vision API error: ${response.statusText}`);
  }

  const data = await response.json();
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
async function sendTelegramMessage(chatId: number, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    }),
  });

  if (!response.ok) {
    console.error('Failed to send Telegram message:', await response.text());
  }
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
      let actionData;

      if (message.text) {
        console.log('Processing text message:', message.text);
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
        await sendTelegramMessage(message.chat.id, '❓ Поддерживаются только текстовые сообщения, фото и голосовые сообщения.');
        return new Response('OK', { status: 200 });
      }

      console.log('AI analysis result:', actionData);
      result = await executeAction(actionData);

    } catch (aiError) {
      console.error('AI processing error:', aiError);
      result = `❌ Ошибка обработки: ${aiError.message}`;
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