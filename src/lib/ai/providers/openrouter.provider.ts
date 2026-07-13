import { AIProvider, ChatRequest, ChatResponse } from './provider.interface';

export class OpenRouterProvider implements AIProvider {
  name = 'openrouter';

  async chat(request: ChatRequest, apiKey: string): Promise<ChatResponse> {
    const model = request.model || 'google/gemini-2.0-flash-001';

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://pg-manager.app',
        'X-Title': 'PG Manager',
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();

    const content = data?.choices?.[0]?.message?.content || '';

    return {
      content,
      usage: {
        promptTokens: data?.usage?.prompt_tokens,
        completionTokens: data?.usage?.completion_tokens,
        totalTokens: data?.usage?.total_tokens,
      },
    };
  }
}
