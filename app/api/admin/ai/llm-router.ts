export type LLMProvider = {
  name: string;
  endpoint: string;
  apiKey: string | undefined;
  model: string;
};

export function getProviders(): LLMProvider[] {
  return [
    {
      name: 'groq',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey: process.env.GROQ_API_KEY,
      model: 'openai/gpt-oss-20b',
    },
    {
      name: 'cloudflare',
      endpoint: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID || ''}/ai/v1/chat/completions`,
      apiKey: process.env.CLOUDFLARE_AI_TOKEN,
      model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    },
    {
      name: 'huggingface',
      endpoint: 'https://router.huggingface.co/v1/chat/completions',
      apiKey: process.env.HF_API_KEY,
      model: 'meta-llama/Llama-3.3-70B-Instruct',
    }
  ];
}

export async function callLLMWithFailover(messages: any[], tools?: any[]): Promise<{ provider: string; data: any }> {
  const providers = getProviders().filter((p) => p.apiKey && p.apiKey.length > 0);
  const errors: string[] = [];

  for (const p of providers) {
    try {
      const res = await fetch(p.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${p.apiKey}`,
        },
        body: JSON.stringify({
          model: p.model,
          messages,
          ...(tools && tools.length > 0 ? { tools, tool_choice: 'auto' } : {}),
          temperature: 0.5,
          max_tokens: 1000, // Lowered to prevent hitting rate limits
        }),
        signal: AbortSignal.timeout(8000), 
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.choices?.[0]?.message) return { provider: p.name, data };
      }
      errors.push(`${p.name} failed`);
    } catch (e: any) {
      errors.push(`${p.name} timeout`);
    }
  }
  throw new Error(`All AI providers busy. Please wait 1 minute and try again.`);
}
