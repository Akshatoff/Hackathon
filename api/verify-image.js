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

        // Convert base64 to buffer
        const base64Data = imageData.split(',')[1];
        const mimeType = imageData.split(',')[0].split(':')[1].split(';')[0];
        const buffer = Buffer.from(base64Data, 'base64');

        // Create multipart form data manually
        const boundary = '----formdata-' + Math.random().toString(36);
        let body = '';
        
        // Add form fields
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="models"\r\n\r\n`;
        body += `genai\r\n`;
        
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="api_user"\r\n\r\n`;
        body += `${process.env.SIGHTENGINE_API_USER}\r\n`;
        
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="api_secret"\r\n\r\n`;
        body += `${process.env.SIGHTENGINE_API_SECRET}\r\n`;
        
        // Add file data
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="media"; filename="image.${mimeType.split('/')[1]}"\r\n`;
        body += `Content-Type: ${mimeType}\r\n\r\n`;
        
        // Convert to Buffer and combine
        const bodyStart = Buffer.from(body, 'utf8');
        const bodyEnd = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
        const fullBody = Buffer.concat([bodyStart, buffer, bodyEnd]);

        const response = await fetch('https://api.sightengine.com/1.0/check.json', {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
            },
            body: fullBody
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('SightEngine API Response:', errorText);
            throw new Error(`SightEngine API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('SightEngine API Response:', data);
        
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
