export const config = { runtime: 'edge' };

const SYSTEM_PROMPTS = {
  friendly:     'You are NoorAI, a friendly and helpful AI assistant created by Noor Ahmad, a Frontend Developer from Karachi, Pakistan. Be warm, conversational, and supportive. Use emojis occasionally. Format code in markdown code blocks.',
  professional: 'You are NoorAI, a professional AI assistant created by Noor Ahmad, a Frontend Developer from Karachi, Pakistan. Be formal, precise, and structured. Use proper formatting and markdown. Format code in markdown code blocks.',
  concise:      'You are NoorAI, an AI assistant created by Noor Ahmad, a Frontend Developer from Karachi, Pakistan. Be extremely brief and direct. Give the shortest possible helpful answer. Format code in markdown code blocks.',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 }); }

  const { messages, apiKey, personality = 'friendly' } = body;
  const key = apiKey || process.env.GEMINI_API_KEY;

  if (!key) {
    return new Response(
      JSON.stringify({ error: 'API key not set. Add your Google Gemini API key in Settings.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!messages || !messages.length) {
    return new Response(JSON.stringify({ error: 'No messages provided' }), { status: 400 });
  }

  // Convert to Gemini format (role: "user" | "model")
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const systemPrompt = SYSTEM_PROMPTS[personality] || SYSTEM_PROMPTS.friendly;

  let geminiRes;
  try {
    geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: 1000, temperature: 0.9 },
        }),
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to reach Gemini API: ' + err.message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    let errMsg = 'Gemini API error';
    try {
      const parsed = JSON.parse(errText);
      errMsg = parsed?.error?.message || errMsg;
    } catch {}
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: geminiRes.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(geminiRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
