import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestRequest {
  provider_id: string;
  provider_type: string;
  api_endpoint?: string;
  model_name?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify authentication
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { provider_id, provider_type, api_endpoint, model_name }: TestRequest = await req.json();
    
    console.log('Testing AI provider:', { provider_id, provider_type, model_name });

    // Get API key from secrets
    let apiKey: string;
    try {
      const secretName = `${provider_type.toUpperCase()}_API_KEY`;
      apiKey = Deno.env.get(secretName) || '';
      
      if (!apiKey) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: `API ключ для ${provider_type} не найден в секретах` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      console.error('Error getting API key:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Ошибка получения API ключа' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test connection based on provider type
    let testResult;
    const startTime = Date.now();

    try {
      switch (provider_type.toLowerCase()) {
        case 'openai':
          testResult = await testOpenAI(apiKey, api_endpoint, model_name);
          break;
        case 'anthropic':
          testResult = await testAnthropic(apiKey, api_endpoint, model_name);
          break;
        case 'deepseek':
          testResult = await testDeepSeek(apiKey, api_endpoint, model_name);
          break;
        case 'google':
          testResult = await testGoogle(apiKey, api_endpoint, model_name);
          break;
        case 'azure':
          testResult = await testAzure(apiKey, api_endpoint, model_name);
          break;
        default:
          testResult = { success: false, error: 'Неподдерживаемый тип провайдера' };
      }
    } catch (error) {
      console.error('Provider test error:', error);
      testResult = { success: false, error: error.message };
    }

    const responseTime = Date.now() - startTime;

    // Log test result to audit log
    await supabaseClient.from('user_audit_log').insert({
      user_id: user.id,
      action: 'AI_PROVIDER_TEST',
      table_name: 'ai_providers',
      record_id: provider_id,
      new_values: {
        provider_type,
        test_result: testResult,
        response_time_ms: responseTime,
        timestamp: new Date().toISOString()
      }
    });

    // Update provider status in database
    await supabaseClient
      .from('ai_providers')
      .update({ 
        updated_at: new Date().toISOString(),
      })
      .eq('id', provider_id);

    return new Response(JSON.stringify({
      ...testResult,
      response_time_ms: responseTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in AI provider test:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Внутренняя ошибка сервера' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function testOpenAI(apiKey: string, endpoint?: string, model?: string) {
  const url = endpoint || 'https://api.openai.com/v1/chat/completions';
  const testModel = model || 'gpt-4o-mini';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: testModel,
      messages: [{ role: 'user', content: 'Тест соединения' }],
      max_tokens: 10
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API ошибка: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return { 
    success: true, 
    message: 'Соединение с OpenAI успешно',
    model_used: testModel,
    response_preview: data.choices?.[0]?.message?.content?.slice(0, 50) || 'Ответ получен'
  };
}

async function testAnthropic(apiKey: string, endpoint?: string, model?: string) {
  const url = endpoint || 'https://api.anthropic.com/v1/messages';
  const testModel = model || 'claude-3-haiku-20240307';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: testModel,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Тест соединения' }]
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API ошибка: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return { 
    success: true, 
    message: 'Соединение с Anthropic успешно',
    model_used: testModel,
    response_preview: data.content?.[0]?.text?.slice(0, 50) || 'Ответ получен'
  };
}

async function testDeepSeek(apiKey: string, endpoint?: string, model?: string) {
  const url = endpoint || 'https://api.deepseek.com/chat/completions';
  const testModel = model || 'deepseek-chat';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: testModel,
      messages: [{ role: 'user', content: 'Тест соединения' }],
      max_tokens: 10
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API ошибка: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return { 
    success: true, 
    message: 'Соединение с DeepSeek успешно',
    model_used: testModel,
    response_preview: data.choices?.[0]?.message?.content?.slice(0, 50) || 'Ответ получен'
  };
}

async function testGoogle(apiKey: string, endpoint?: string, model?: string) {
  const testModel = model || 'gemini-pro';
  const url = endpoint || `https://generativelanguage.googleapis.com/v1/models/${testModel}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Тест соединения' }] }]
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google API ошибка: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return { 
    success: true, 
    message: 'Соединение с Google успешно',
    model_used: testModel,
    response_preview: data.candidates?.[0]?.content?.parts?.[0]?.text?.slice(0, 50) || 'Ответ получен'
  };
}

async function testAzure(apiKey: string, endpoint?: string, model?: string) {
  if (!endpoint) {
    throw new Error('Azure endpoint обязателен');
  }

  const response = await fetch(`${endpoint}/openai/deployments/${model || 'gpt-35-turbo'}/chat/completions?api-version=2023-07-01-preview`, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Тест соединения' }],
      max_tokens: 10
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Azure API ошибка: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return { 
    success: true, 
    message: 'Соединение с Azure успешно',
    model_used: model || 'gpt-35-turbo',
    response_preview: data.choices?.[0]?.message?.content?.slice(0, 50) || 'Ответ получен'
  };
}