import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  for (const line of envConfig.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

async function testModelAccess(modelId: string) {
  const apiKey = process.env.NVIDIA_API_KEY;
  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 10,
      }),
    });

    const status = res.status;
    const bodyText = await res.text();
    console.log(`[${status}] Model: ${modelId}`);
    if (status !== 200) {
      console.log(`   Response Body: ${bodyText}`);
    } else {
      console.log(`   SUCCESS!`);
    }
    return status === 200;
  } catch (err: any) {
    console.log(`[ERROR] Model: ${modelId} - ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('--- NVIDIA MULTI-MODEL ACCESS DIAGNOSTIC ---');
  const modelsToTest = [
    'meta/llama-3.2-11b-vision-instruct',
    'meta/llama-3.2-90b-vision-instruct',
    'google/gemma-2b',
    'google/gemma-3-12b-it',
    'ibm/granite-3.0-8b-instruct',
    'mistralai/mistral-7b-instruct-v0.3',
    'nvidia/llama-3.1-nemotron-51b-instruct',
    'deepseek-ai/deepseek-v4.1-flash',
    '01-ai/yi-large'
  ];

  for (const m of modelsToTest) {
    await testModelAccess(m);
  }
}

main();
