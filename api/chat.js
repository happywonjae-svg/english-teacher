export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: '당신은 친근한 영어 선생님입니다.',
        messages: messages
      })
    });

    const data = await response.json();
    
    // 응답에서 텍스트 추출
    const reply = data?.content?.[0]?.text || '다시 질문해주세요!';
    res.status(200).json({ reply });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
