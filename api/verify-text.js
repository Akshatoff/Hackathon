// api/verify-text.js
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://your-vercel-app.vercel.app',
                'X-Title': 'Filter App'
            },
            body: JSON.stringify({
                model: "google/gemma-2-9b-it",
                messages: [
                    {
                        role: "system",
                        content: "You are a fact-checking assistant. Analyze the given text and determine if it's likely to be true, false, or needs more context. Provide a brief explanation of your reasoning. Format your response as: 'VERDICT: [TRUE/FALSE/NEEDS CONTEXT] - [Brief explanation]'"
                    },
                    {
                        role: "user",
                        content: `Please fact-check this text: "${text}"`
                    }
                ],
                max_tokens: 200,
                temperature: 0.1
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { error: { message: errorText } };
            }
            throw new Error(`API Error ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        
        if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
            throw new Error('Invalid response format from API');
        }

        if (!data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
            throw new Error('Invalid response format from API');
        }

        res.json({ 
            success: true, 
            result: data.choices[0].message.content 
        });

    } catch (error) {
        console.error('Text verification error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}
