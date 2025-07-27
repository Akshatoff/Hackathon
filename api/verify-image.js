// api/verify-image.js
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
        const { imageData } = req.body;
        
        if (!imageData) {
            return res.status(400).json({ error: 'Image data is required' });
        }

        // Convert base64 to blob for FormData
        const base64Data = imageData.split(',')[1];
        const mimeType = imageData.split(',')[0].split(':')[1].split(';')[0];
        const buffer = Buffer.from(base64Data, 'base64');

        // Create FormData manually for fetch
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('media', buffer, { filename: 'image.jpg', contentType: mimeType });
        formData.append('models', 'genai');
        formData.append('api_user', process.env.SIGHTENGINE_API_USER);
        formData.append('api_secret', process.env.SIGHTENGINE_API_SECRET);

        const response = await fetch('https://api.sightengine.com/1.0/check.json', {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`SightEngine API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        
        if (data.status === 'failure') {
            throw new Error(data.error?.message || 'SightEngine API error');
        }
        
        if (!data.type || data.type.ai_generated === undefined) {
            throw new Error('Invalid response from AI detection service');
        }

        res.json({ 
            success: true, 
            aiGenerated: data.type.ai_generated,
            confidence: (data.type.ai_generated * 100).toFixed(1)
        });

    } catch (error) {
        console.error('Image verification error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}
