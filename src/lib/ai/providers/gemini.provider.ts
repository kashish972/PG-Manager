import { AIProvider, ChatRequest, ChatResponse } from './provider.interface';

export class GeminiProvider implements AIProvider {
  name = 'gemini';

  async chat(request: ChatRequest, apiKey: string): Promise<ChatResponse> {
    const model = request.model || 'gemini-2.0-flash';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const contents = request.messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }],
    }));

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();

    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      content,
      usage: {
        promptTokens: data?.usageMetadata?.promptTokenCount,
        completionTokens: data?.usageMetadata?.candidatesTokenCount,
        totalTokens: data?.usageMetadata?.totalTokenCount,
      },
    };
  }
}
