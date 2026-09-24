const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export async function requestChat(chatHistory) {
  // 시스템 프롬프트(첫 번째 요소) 추출
  const systemInstruction = chatHistory[0]?.content || "";

  // Gemini 규격으로 대화 기록 변환 (assistant -> model)
  const contents = chatHistory.slice(1).slice(-10).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API 오류 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}