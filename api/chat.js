export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, system, model, max_tokens } = req.body;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens: max_tokens || 1024,
        system: system,
        messages: messages
      })
    });

    const data = await response.json();
    
    // 오류 응답도 그대로 전달 (디버깅용)
    if (!response.ok) {
      console.error('Anthropic error:', JSON.stringify(data));
      return res.status(response.status).json(data);
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('Catch error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
