// API Keys - Replace with your actual keys
const OPENROUTER_API_KEY = "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";
const NEWS_API_TOKEN = "V5jTTfcrQs9CAFIjeLS9ZotFJ1NA0bdBsUAbCASJ";
const SIGHTENGINE_API_USER = "154303857";
const SIGHTENGINE_API_SECRET = "VbN5SrRTPXUB8ccA37YhXE6XvgBJT9iq";

async function verifyText() {
    const text = document.getElementById('input-verfiy').value;
    if (!text) {
        alert("Please enter text to verify.");
        return;
    }

    // Show loading state
    document.getElementById('response').innerHTML = 'Verifying text...';

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'HTTP-Referer': window.location.href, // Required by OpenRouter
                'X-Title': 'Filter App' // Optional but recommended
            },
            body: JSON.stringify({
                model: "google/gemma-2-9b-it", // Updated to use correct Gemma 2 model
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

        // Check if response is ok first
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

        // Better error handling for API response structure
        if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
            console.error('Invalid API response:', data);
            throw new Error('Invalid response format from API - no choices array');
        }

        if (!data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
            console.error('Invalid choice structure:', data.choices[0]);
            throw new Error('Invalid response format from API - no message content');
        }

        const aiResponse = data.choices[0].message.content;
        document.getElementById('response').innerHTML = `<strong>AI Analysis:</strong> ${aiResponse}`;

        // Fetch related news articles
        await fetchNews(text);

    } catch (error) {
        console.error("Error:", error);

        // More specific error messages
        let errorMessage = "Failed to verify text. ";
        if (error.message.includes('402')) {
            errorMessage += "Payment required - please check your OpenRouter API key billing status. You may need to add credits to your account.";
        } else if (error.message.includes('401')) {
            errorMessage += "Invalid API key - please check your OpenRouter credentials.";
        } else if (error.message.includes('429')) {
            errorMessage += "Rate limit exceeded - please try again later.";
        } else if (error.message.includes('400')) {
            errorMessage += "Bad request - there might be an issue with the model name or request format.";
        } else {
            errorMessage += error.message;
        }

        document.getElementById('response').innerHTML = `<strong style="color: red;">Error:</strong> ${errorMessage}`;
    }
}

async function fetchNews(query) {
    try {
        const url = `https://api.thenewsapi.com/v1/news/all?api_token=${NEWS_API_TOKEN}&search=${encodeURIComponent(query)}&limit=5`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`News API Error ${response.status}`);
        }

        const result = await response.json();
        displayArticles(result.data || []);

    } catch (error) {
        console.error('Error fetching news:', error);
        document.getElementById('articles').innerHTML = '<p style="color: orange;">Unable to fetch related news articles at this time.</p>';
    }
}

function displayArticles(articles) {
    const articlesContainer = document.getElementById('articles');

    if (!articles || articles.length === 0) {
        articlesContainer.innerHTML = '<h3 class="articles-header">No related news articles found.</h3>';
        return;
    }

    articlesContainer.innerHTML = '<h3 class="articles-header">Related News Articles:</h3>';

    articles.forEach(article => {
        if (!article) return; // Skip null/undefined articles

        const articleElement = document.createElement('div');
        articleElement.className = 'article';
        articleElement.innerHTML = `
            <div class="article-title">${article.title || 'No title available'}</div>
            <div class="article-snippet">${article.snippet || article.description || 'No description available'}</div>
            <a class="article-link" href="${article.url || '#'}" target="_blank" rel="noopener noreferrer">Read more</a>
        `;
        articlesContainer.appendChild(articleElement);
    });
}

let selectedImage = null;

document.getElementById('imageInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('Image file is too large. Please select an image smaller than 10MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            selectedImage = e.target.result;
            const imagePreview = document.getElementById('imagePreview');
            imagePreview.src = selectedImage;
            imagePreview.style.display = 'block';
        }
        reader.readAsDataURL(file);
    }
});

async function verifyImage() {
    if (!selectedImage) {
        alert("Please select an image first.");
        return;
    }

    // Show loading state
    document.getElementById('aiDetectionResult').textContent = "Analyzing image...";

    const formData = new FormData();
    formData.append('media', dataURItoBlob(selectedImage));
    formData.append('models', 'genai');
    formData.append('api_user', SIGHTENGINE_API_USER);
    formData.append('api_secret', SIGHTENGINE_API_SECRET);

    try {
        const response = await fetch('https://api.sightengine.com/1.0/check.json', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`SightEngine API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        // Better error handling for SightEngine response
        if (data.status === 'failure') {
            throw new Error(data.error?.message || 'SightEngine API error');
        }

        if (!data.type || data.type.ai_generated === undefined) {
            console.error('Invalid SightEngine response:', data);
            throw new Error('Invalid response from AI detection service - no ai_generated field');
        }

        const confidence = (data.type.ai_generated * 100).toFixed(1);

        if (data.type.ai_generated > 0.5) {
            document.getElementById('aiDetectionResult').innerHTML = `
                <strong style="color: red;">Likely AI Generated</strong><br>
                Confidence: ${confidence}%
            `;
        } else {
            document.getElementById('aiDetectionResult').innerHTML = `
                <strong style="color: green;">Likely Not AI Generated</strong><br>
                Confidence: ${(100 - confidence).toFixed(1)}%
            `;
        }

    } catch (error) {
        console.error('Error detecting AI image:', error);

        let errorMessage = "Failed to analyze image. ";
        if (error.message.includes('401')) {
            errorMessage += "Invalid SightEngine API credentials.";
        } else if (error.message.includes('402')) {
            errorMessage += "SightEngine API payment required.";
        } else if (error.message.includes('400')) {
            errorMessage += "Bad request - check image format and size.";
        } else {
            errorMessage += error.message;
        }

        document.getElementById('aiDetectionResult').innerHTML = `<strong style="color: red;">Error:</strong> ${errorMessage}`;
    }
}

function dataURItoBlob(dataURI) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], {type: mimeString});
}
