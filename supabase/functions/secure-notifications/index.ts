import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Verify JWT token and get user
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: corsHeaders }
      )
    }

    // Check if user has admin role
    const { data: adminRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .eq('is_active', true)
      .maybeSingle()

    if (roleError || !adminRole) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }), 
        { status: 403, headers: corsHeaders }
      )
    }

    const { action, data } = await req.json()
    const telegramToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    
    if (!telegramToken) {
      throw new Error('Telegram bot token not configured')
    }

    let message = ''
    let chatId = data.chat_id || data.user_telegram_id

    // Format message based on action
    switch (action) {
      case 'project_status_update':
        message = `🏗️ Обновление проекта: ${data.project_name}\nСтатус: ${data.status}\nПрогресс: ${data.progress}%`
        break
      case 'attendance_reminder':
        message = `⏰ Напоминание о посещаемости\nСегодня не отмечены: ${data.absent_workers?.join(', ') || 'Все отмечены'}`
        break
      case 'task_assigned':
        message = `📋 Новая задача: ${data.task_name}\nИсполнитель: ${data.worker_name}\nСрок: ${data.due_date}`
        break
      case 'payment_processed':
        message = `💰 Обработан платеж\nСумма: ${data.amount} руб.\nРаботник: ${data.worker_name}`
        break
      case 'security_alert':
        message = `🚨 Оповещение безопасности\n${data.alert_message}\nВремя: ${new Date().toLocaleString('ru-RU')}`
        break
      default:
        throw new Error('Unknown action type')
    }

    // Send notification to Telegram
    const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    })

    if (!telegramResponse.ok) {
      const errorData = await telegramResponse.json()
      throw new Error(`Telegram API error: ${errorData.description}`)
    }

    const telegramData = await telegramResponse.json()

    // Log notification with security audit
    const { error: logError } = await supabaseClient
      .from('notifications_log')
      .insert({
        user_id: user.id,
        type: action,
        recipient: chatId,
        message: message,
        status: 'sent',
        telegram_message_id: telegramData.result.message_id,
        sent_at: new Date().toISOString(),
        metadata: { 
          sent_by: user.email,
          ip_address: req.headers.get('x-forwarded-for'),
          user_agent: req.headers.get('user-agent')
        }
      })

    if (logError) {
      console.error('Failed to log notification:', logError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: telegramData.result.message_id,
        notification_logged: !logError
      }),
      { headers: corsHeaders }
    )

  } catch (error) {
    console.error('Error in secure-notifications function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: corsHeaders }
    )
  }
})