import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/src/resources/index.js';

const allowedActions = ['default', 'shorten', 'professional', 'friendly', 'detailed', 'custom'];

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		console.log(url.pathname);
		if (url.pathname === '/paraphrase' && request.method === 'POST') {
			let { readable, writable } = new TransformStream();
			let writer = writable.getWriter();
			const textEncoder = new TextEncoder();

			const { text, action, custom } = (await request.json()) as any;

			const basePrompt = `Do not add any additional explanations in your response like note or explanation. Simply output the result. If you don't know what to do, just output the original text. Text: `;

			let systemPrompt = `You can only reply with transformed text that fixes the grammar mistakes. ${basePrompt}`;

			if (action && !allowedActions.includes(action)) {
				return new Response('Action not allowed', { status: 400 });
			}

			if (action === 'shorten') {
				systemPrompt = `Please shorten the following text while correcting any grammar mistakes. ${basePrompt}`;
			}

			if (action === 'friendly') {
				systemPrompt = `Rephrase the following text to make it sound more friendly and conversational. ${basePrompt}`;
			}

			if (action === 'professional') {
				systemPrompt = `Rephrase the following text to make it sound more professional. ${basePrompt}`;
			}

			if (action === 'detailed') {
				systemPrompt = `Expand the following text and make it more detailed. ${basePrompt}`;
			}

			if (action === 'custom') {
				systemPrompt = `Rephrase the following text using the custom instruction i.e: ${custom}. ${basePrompt}`;
			}

			const client = new OpenAI({
				apiKey: env.GROQ_API_KEY,
				baseURL: 'https://api.groq.com/openai/v1',
			});
			if (!text) {
				return new Response('No text provided', { status: 400 });
			}

			const prompt = [
				{
					role: 'system',
					content: systemPrompt,
				},
				{ role: 'user', content: `${text}` },
			];

			console.log(prompt);

			ctx.waitUntil(
				(async () => {
					const stream = await client.chat.completions.create({
						model: 'llama-3.1-70b-versatile',
						temperature: 0.2,
						messages: prompt as ChatCompletionMessageParam[],
						stream: true,
					});

					// loop over the data as it is streamed and write to the writeable
					for await (const part of stream) {
						writer.write(textEncoder.encode(part.choices[0]?.delta?.content || ''));
					}
				})()
			);

			return new Response(readable);
		}

		return new Response('Welcome to Co-Write API');
	},
} satisfies ExportedHandler<Env>;
