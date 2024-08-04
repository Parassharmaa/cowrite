import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/src/resources/index.js';

const allowedActions = ['default', 'shorten', 'professional', 'friendly', 'detailed', 'custom'];

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

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
				systemPrompt = `Rephrase the following text using the custom instruction. Custom instruction: ${custom}. ${basePrompt}`;
			}

			const client = new OpenAI({
				apiKey: env.OPENAI_API_KEY,
			});
			if (!text) {
				return new Response('No text provided', { status: 400 });
			}

			const prompt = [
				{
					role: 'assistant',
					content: systemPrompt,
				},
				{ role: 'user', content: `${text}` },
			] as ChatCompletionMessageParam[];

			console.log(prompt);

			ctx.waitUntil(
				(async () => {
					const stream = await client.chat.completions.create({
						model: 'gpt-4o',
						temperature: 0,
						messages: prompt,
						stream: true,
					});

					// loop over the data as it is streamed and write to the writeable
					for await (const part of stream) {
						console.log(part.choices[0]?.delta?.content);
						writer.write(textEncoder.encode(part.choices[0]?.delta?.content || ''));
					}
					writer.close();
				})()
			);

			return new Response(readable);
		}

		return new Response('Welcome to Co-Write API');
	},
} satisfies ExportedHandler<Env>;
