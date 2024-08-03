import OpenAI from 'openai';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		console.log(url.pathname);
		if (url.pathname === '/paraphrase' && request.method === 'POST') {
			let { readable, writable } = new TransformStream();
			let writer = writable.getWriter();
			const textEncoder = new TextEncoder();

			const { text } = (await request.json()) as any;

			const client = new OpenAI({
				apiKey: env.GROQ_API_KEY,
				baseURL: 'https://api.groq.com/openai/v1',
			});
			if (!text) {
				return new Response('No text provided', { status: 400 });
			}

			ctx.waitUntil(
				(async () => {
					const stream = await client.chat.completions.create({
						model: 'llama-3.1-8b-instant',
						temperature: 0.2,
						messages: [
							{
								role: 'system',
								content: `You only any reply with transformed text that fixes the grammar mistakes.\
								 Do not add any additional explanations in your response. Simply output the result. \
								 Text:`,
							},
							{ role: 'user', content: `Text: ${text}` },
						],
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
