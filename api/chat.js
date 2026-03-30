export const config = { runtime: 'edge' };

const SYSTEM_PROMPTS = {
  friendly: 'You are NoorAI, a friendly and helpful AI assistant created by Noor Ahmad, a Frontend Developer from Karachi, Pakistan. Be warm, conversational, and supportive. Use emojis occasionally. Format code in markdown code blocks.',
  professional: 'You are NoorAI, a professional AI assistant created by Noor Ahmad, a Frontend Developer from Karachi, Pakistan. Be formal, precise, and structured. Use proper formatting and markdown. Format code in markdown code blocks.',
  concise: 'You are NoorAI, an AI assistant created by Noor Ahmad, a Frontend Developer from Karachi, Pakistan. Be extremely brief and direct. Give the shortest possible helpful answer. Format code in markdown code blocks.',
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
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const { messages, apiKey, personality = 'friendly' } = body;

  const key = apiKey || process.env.ANTHROPIC_API_KEY;

  if (!key) {
    return new Response(
      JSON.stringify({ error: 'API key not found. Please add your Anthropic API key in Settings.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'No messages provided' }), { status: 400 });
  }

  const systemPrompt = SYSTEM_PROMPTS[personality] || SYSTEM_PROMPTS.friendly;

  let anthropicRes;
  try {
    anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: systemPrompt,
        messages,
        stream: true,
      }),
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to reach Anthropic API: ' + err.message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    let errMsg = 'Anthropic API error';
    try {
      const parsed = JSON.parse(errText);
      errMsg = parsed?.error?.message || errMsg;
    } catch {}
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: anthropicRes.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(anthropicRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
