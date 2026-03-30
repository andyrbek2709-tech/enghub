const SURL = process.env.SUPABASE_URL || 'https://jbdljdwlfimvmqybzynv.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiZGxqZHdsZmltdm1xeWJ6eW52Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDgwMTg5OSwiZXhwIjoyMDkwMzc3ODk5fQ.1lMpCV8kiMmswYAlKSrFpsPGwPd_dXFZ5LUQktfVeeY';

module.exports = async function handler(req, res) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { user_id, project_id, message } = req.body;
    
    if (!user_id || !project_id || !message) {
      return res.status(400).json({ error: 'Missing required fields: user_id, project_id, message' });
    }

    const headers = {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    };

    // 1. Fetch project depts to generate valid tasks for those depts
    const pRes = await fetch(`${SURL}/rest/v1/projects?id=eq.${project_id}`, { headers });
    const pData = await pRes.json();
    const depts = pData?.[0]?.depts || [];

    // 2. Parse intent
    const msgLower = message.toLowerCase();
    let intent = "unknown";
    
    // Very naive regex intent matching, mimicking an LLM Router for Phase 5 Part 2
    if (/задач|сделай|создай|task|план|график/.test(msgLower)) {
        intent = "create_tasks";
    }

    if (intent === "create_tasks") {
        // 3. Generate mock payload based on intelligent context (departments)
        let generatedTasks = [];
        
        if (depts.length > 0) {
            // Intelligent grouping by department
            generatedTasks.push({ title: "Анализ исходной документации (AI Draft)", dept_id: depts[0], priority: "medium" });
            if (depts.length > 1) {
                 generatedTasks.push({ title: "Подготовка технических решений (AI Draft)", dept_id: depts[1], priority: "high" });
                 generatedTasks.push({ title: "Выпуск чертежей стадии П (AI Draft)", dept_id: depts[1], priority: "high" });
            } else {
                 generatedTasks.push({ title: "Разработка проектной документации", dept_id: depts[0], priority: "high" });
            }
        } else {
            // Fallback if project has no departments
            generatedTasks = [
                { title: "Определить объемы работ", dept_id: null, priority: "high" },
                { title: "Запросить исходные данные у заказчика", dept_id: null, priority: "medium" }
            ];
        }

        // 4. Insert into ai_actions
        const payload = {
            tasks: generatedTasks,
            reasoning: "Сгенерировано агентом Task_Manager на основе списка профильных отделов проекта."
        };
        
        const insertData = {
            project_id,
            user_id,
            action_type: 'create_tasks',
            agent_type: 'task_manager',
            payload,
            status: 'pending'
        };

        const insertRes = await fetch(`${SURL}/rest/v1/ai_actions`, {
            method: 'POST',
            headers: { ...headers, 'Prefer': 'return=representation' },
            body: JSON.stringify(insertData)
        });
        
        const result = await insertRes.json();
        
        return res.status(200).json({ 
            success: true, 
            agent: 'task_manager',
            action_id: result[0]?.id,
            message: 'Я проанализировал запрос. Delegate: Task_Manager_Agent. Высылаю план действий на утверждение.'
        });
    }

    // Not a recognized intent
    return res.status(200).json({ 
        success: true, 
        agent: 'router', 
        message: 'Понял вас. Если потребуется создать задачи, проверить конфликты или сгенерировать отчет — просто напишите мне.' 
    });

  } catch (err) {
    console.error('Orchestrator Error:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
};
