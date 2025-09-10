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

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 
      });
    }

    // Role check
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true);

    const roles = userRoles?.map(ur => ur.role) || [];
    const isAdmin = roles.includes('admin');
    const isForeman = roles.includes('foreman');

    if (!isAdmin && !isForeman) {
      return new Response(JSON.stringify({ error: 'Access denied' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 
      });
    }

    const { projectId, requiredSkills = [] } = await req.json();
    console.log(`AI Recommendations request from ${user.email} for project ${projectId}`);

    // Get project details
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) {
      throw new Error(`Project not found: ${projectError.message}`);
    }

    // For foremen, verify project access
    if (isForeman && !isAdmin) {
      const { data: assignment } = await supabaseAdmin
        .from('worker_assignments')
        .select('id')
        .eq('project_id', projectId)
        .eq('foreman_id', user.id)
        .single();

      if (!assignment) {
        return new Response(JSON.stringify({ error: 'Project access denied' }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 
        });
      }
    }

    // Get available workers with their skills
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select(`
        *,
        worker_skills (
          level,
          years_experience,
          certified,
          skill:skills (
            name,
            category
          )
        ),
        worker_assignments!inner (
          end_date
        )
      `)
      .eq('status', 'active');

    if (workersError) {
      throw new Error(`Error fetching workers: ${workersError.message}`);
    }

    // Calculate worker scores based on skills match, availability, and performance
    const scoredWorkers = workers.map(worker => {
      let score = 0;
      let skillMatches = 0;
      let totalSkillLevel = 0;
      
      // Check skill matches
      worker.worker_skills?.forEach(ws => {
        const skillName = ws.skill?.name?.toLowerCase();
        if (requiredSkills.some(rs => rs.toLowerCase().includes(skillName))) {
          skillMatches++;
          totalSkillLevel += ws.level || 1;
          score += (ws.level || 1) * 20; // Base skill score
          score += (ws.years_experience || 0) * 5; // Experience bonus
          score += ws.certified ? 15 : 0; // Certification bonus
        }
      });

      // Availability bonus (not currently assigned)
      const isAvailable = !worker.worker_assignments?.some(
        assignment => !assignment.end_date
      );
      if (isAvailable) score += 30;

      // Calculate average skill level
      const avgSkillLevel = skillMatches > 0 ? totalSkillLevel / skillMatches : 0;

      return {
        worker,
        score,
        skillMatches,
        avgSkillLevel,
        isAvailable,
        recommendation: score > 50 ? 'highly_recommended' : 
                      score > 25 ? 'recommended' : 'available'
      };
    })
    .filter(item => item.score > 0 || item.isAvailable) // Show available workers even without skill match
    .sort((a, b) => b.score - a.score);

    // Use AI to generate smart recommendations
    const aiProvider = Deno.env.get('AI_PROVIDER') || 'openai';
    let aiRecommendations = null;

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
                content: 'Ты эксперт по управлению строительными проектами. Анализируй данные работников и давай рекомендации по их назначению на проекты.'
              },
              {
                role: 'user',
                content: `Проект: ${project.name}
Описание: ${project.description}
Требуемые навыки: ${requiredSkills.join(', ')}
Топ работники: ${JSON.stringify(scoredWorkers.slice(0, 5), null, 2)}

Дай краткие рекомендации по назначению работников и потенциальным рискам.`
              }
            ],
            max_tokens: 500,
            temperature: 0.7
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiRecommendations = aiData.choices[0]?.message?.content;
        }
      } catch (error) {
        console.error('AI recommendation error:', error);
      }
    }

    return new Response(JSON.stringify({
      project,
      recommendations: scoredWorkers.slice(0, 10),
      aiInsights: aiRecommendations,
      stats: {
        totalWorkers: workers.length,
        availableWorkers: scoredWorkers.filter(w => w.isAvailable).length,
        highlyRecommended: scoredWorkers.filter(w => w.recommendation === 'highly_recommended').length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-recommendations:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});