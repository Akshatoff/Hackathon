// api/fetch-news.js
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
        const { query } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        const url = `https://api.thenewsapi.com/v1/news/all?api_token=${process.env.NEWS_API_TOKEN}&search=${encodeURIComponent(query)}&limit=5`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`News API Error ${response.status}`);
        }
        
        const result = await response.json();
        
        res.json({ 
            success: true, 
            articles: result.data || [] 
        });

    } catch (error) {
        console.error('News fetching error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}
