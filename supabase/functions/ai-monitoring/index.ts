import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('AI Monitoring service started');

    // Get all active AI providers
    const { data: providers, error: providersError } = await supabaseClient
      .from('ai_providers')
      .select('*')
      .eq('is_active', true);

    if (providersError) {
      console.error('Error fetching providers:', providersError);
      throw providersError;
    }

    const monitoringResults = [];

    // Monitor each provider
    for (const provider of providers || []) {
      console.log(`Monitoring provider: ${provider.name}`);
      
      try {
        const testResult = await testProvider(provider);
        monitoringResults.push({
          provider_id: provider.id,
          provider_name: provider.name,
          status: testResult.success ? 'online' : 'error',
          response_time: testResult.responseTime,
          error_message: testResult.error,
          last_check: new Date().toISOString()
        });

        // Update provider status in database
        await supabaseClient
          .from('ai_providers')
          .update({
            last_status: testResult.success ? 'online' : 'error',
            last_tested_at: new Date().toISOString(),
            last_response_time_ms: testResult.responseTime,
            last_error: testResult.success ? null : testResult.error,
            updated_at: new Date().toISOString()
          })
          .eq('id', provider.id);

        // Log monitoring result
        await supabaseClient.from('user_audit_log').insert({
          action: 'AI_PROVIDER_MONITOR',
          table_name: 'ai_providers',
          record_id: provider.id,
          new_values: {
            status: testResult.success ? 'online' : 'error',
            response_time: testResult.responseTime,
            error: testResult.error,
            timestamp: new Date().toISOString()
          }
        });

        // Create notification if provider is down
        if (!testResult.success) {
          await createFailureNotification(supabaseClient, provider, testResult.error || 'Unknown error');
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error monitoring ${provider.name}:`, error);
        monitoringResults.push({
          provider_id: provider.id,
          provider_name: provider.name,
          status: 'error',
          error_message: errorMessage,
          last_check: new Date().toISOString()
        });

        // Update provider status on error
        await supabaseClient
          .from('ai_providers')
          .update({
            last_status: 'error',
            last_tested_at: new Date().toISOString(),
            last_error: errorMessage,
            updated_at: new Date().toISOString()
          })
          .eq('id', provider.id);

        await createFailureNotification(supabaseClient, provider, errorMessage);
      }
    }

    // Check for failover needs
    await checkFailover(supabaseClient, monitoringResults);

    return new Response(JSON.stringify({
      success: true,
      monitored_providers: monitoringResults.length,
      results: monitoringResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in AI monitoring service:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Monitoring service error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function testProvider(provider: any) {
  const startTime = Date.now();
  
  try {
    // Get API key from environment
    const apiKey = Deno.env.get(`${provider.provider_type.toUpperCase()}_API_KEY`);
    
    if (!apiKey) {
      throw new Error(`API key not found for ${provider.provider_type}`);
    }

    // Quick health check based on provider type
    let response;
    switch (provider.provider_type.toLowerCase()) {
      case 'openai':
        response = await fetch(provider.api_endpoint || 'https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        break;
      
      case 'anthropic':
        // Anthropic doesn't have a simple health endpoint, so we'll do a minimal request
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: provider.model_name || 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'ping' }]
          }),
        });
        break;
      
      default:
        // Generic health check
        response = await fetch(provider.api_endpoint || 'https://httpbin.org/status/200', {
          method: 'GET',
          headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {},
        });
    }

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return {
      success: true,
      responseTime,
      message: `Provider ${provider.name} is online`
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      responseTime: Date.now() - startTime,
      error: errorMessage
    };
  }
}

async function createFailureNotification(supabaseClient: any, provider: any, errorMessage: string) {
  try {
    // Get all admin users to notify
    const { data: adminRoles } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .eq('is_active', true);

    if (adminRoles && adminRoles.length > 0) {
      const notifications = adminRoles.map((admin: any) => ({
        type: 'AI_PROVIDER_FAILURE',
        recipient: admin.user_id,
        message: `AI провайдер "${provider.name}" недоступен: ${errorMessage}`,
        status: 'pending',
        metadata: {
          provider_id: provider.id,
          provider_name: provider.name,
          provider_type: provider.provider_type,
          error_message: errorMessage,
          severity: 'high',
          timestamp: new Date().toISOString()
        }
      }));

      await supabaseClient
        .from('notifications_log')
        .insert(notifications);
    }
  } catch (error) {
    console.error('Error creating failure notification:', error);
  }
}

async function checkFailover(supabaseClient: any, results: any[]) {
  try {
    // Count online vs offline providers by type
    const providerStatusByType: Record<string, { online: number; total: number }> = {};
    
    results.forEach(result => {
      const type = result.provider_name; // Could be enhanced to group by actual type
      if (!providerStatusByType[type]) {
        providerStatusByType[type] = { online: 0, total: 0 };
      }
      providerStatusByType[type].total++;
      if (result.status === 'online') {
        providerStatusByType[type].online++;
      }
    });

    // Check if any provider type is completely down
    for (const [type, status] of Object.entries(providerStatusByType)) {
      if (status.online === 0 && status.total > 0) {
        console.log(`All providers of type ${type} are down, failover needed`);
        
        // Create critical notification
        const { data: adminRoles } = await supabaseClient
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
          .eq('is_active', true);

        if (adminRoles && adminRoles.length > 0) {
          const notifications = adminRoles.map((admin: any) => ({
            type: 'AI_FAILOVER_ALERT',
            recipient: admin.user_id,
            message: `Критически! Все AI провайдеры типа "${type}" недоступны. Требуется вмешательство.`,
            status: 'pending',
            metadata: {
              provider_type: type,
              total_providers: status.total,
              online_providers: status.online,
              severity: 'critical',
              timestamp: new Date().toISOString()
            }
          }));

          await supabaseClient
            .from('notifications_log')
            .insert(notifications);
        }
      }
    }
  } catch (error) {
    console.error('Error in failover check:', error);
  }
}