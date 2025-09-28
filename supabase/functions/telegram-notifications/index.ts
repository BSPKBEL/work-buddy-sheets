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

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();
    
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('Telegram bot token not configured');
    }

    let message = '';
    let chatId = data.chatId || data.telegram_chat_id;

    switch (action) {
      case 'project_status_update':
        message = `🏗️ *Обновление проекта*\n\n` +
                 `Проект: ${data.projectName}\n` +
                 `Статус: ${data.status}\n` +
                 `Прогресс: ${data.progress}%\n` +
                 `Бюджет: ${data.budget} руб.\n` +
                 `Потрачено: ${data.spent} руб.`;
        break;

      case 'attendance_reminder':
        message = `⏰ *Напоминание о посещаемости*\n\n` +
                 `Привет, ${data.workerName}!\n` +
                 `Не забудь отметиться на объекте "${data.projectName}"\n` +
                 `Время: ${data.time}`;
        break;

      case 'expense_added':
        message = `💰 *Новый расход*\n\n` +
                 `Категория: ${data.category}\n` +
                 `Сумма: ${data.amount} руб.\n` +
                 `Проект: ${data.projectName}\n` +
                 `Дата: ${data.date}`;
        break;

      case 'task_assigned':
        message = `📋 *Новая задача*\n\n` +
                 `Задача: ${data.taskTitle}\n` +
                 `Проект: ${data.projectName}\n` +
                 `Исполнитель: ${data.workerName}\n` +
                 `Срок: ${data.dueDate}`;
        break;

      case 'budget_alert':
        message = `⚠️ *Предупреждение о бюджете*\n\n` +
                 `Проект: ${data.projectName}\n` +
                 `Превышение бюджета: ${data.overrun}%\n` +
                 `Лимит: ${data.budget} руб.\n` +
                 `Потрачено: ${data.spent} руб.`;
        break;

      case 'daily_report':
        message = `📊 *Ежедневный отчет*\n\n` +
                 `Активных проектов: ${data.activeProjects}\n` +
                 `Работников на объектах: ${data.workersOnSite}\n` +
                 `Расходы за день: ${data.dailyExpenses} руб.\n` +
                 `Выполненных задач: ${data.completedTasks}`;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Send message to Telegram
    const telegramResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      }),
    });

    if (!telegramResponse.ok) {
      const errorText = await telegramResponse.text();
      throw new Error(`Telegram API error: ${errorText}`);
    }

    const telegramResult = await telegramResponse.json();
    
    // Log notification
    const { error: logError } = await supabase
      .from('notifications_log')
      .insert({
        type: action,
        recipient: chatId,
        message: message,
        status: 'sent',
        sent_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Failed to log notification:', logError);
    }

    return new Response(JSON.stringify({
      success: true,
      messageId: telegramResult.result.message_id,
      action,
      recipient: chatId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in telegram-notifications:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});