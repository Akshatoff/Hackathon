// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, verify.js ready');

    // Check if required elements exist
    const requiredElements = ['input-verfiy', 'response', 'articles', 'imageInput', 'imagePreview', 'aiDetectionResult'];
    const missingElements = requiredElements.filter(id => !document.getElementById(id));

    if (missingElements.length > 0) {
        console.warn('Missing HTML elements:', missingElements);
    } else {
        console.log('All required elements found ✅');
    }
});

// Detect environment and set API endpoints
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isLocalhost ? '' : '/api';

// Local development API keys (only used when running locally)
const LOCAL_KEYS = {
    OPENROUTER_API_KEY: "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",
    NEWS_API_TOKEN: "V5jTTfcrQs9CAFIjeLS9ZotFJ1NA0bdBsUAbCASJ",
    SIGHTENGINE_API_USER: "154303857",
    SIGHTENGINE_API_SECRET: "VbN5SrRTPXUB8ccA37YhXE6XvgBJT9iq"
};

async function verifyText() {
    const text = document.getElementById('input-verfiy').value;
    if (!text) {
        alert("Please enter text to verify.");
        return;
    }

    // Get response element and check if it exists
    const responseElement = document.getElementById('response');
    if (!responseElement) {
        console.error('Response element not found!');
        alert('Error: Response element not found. Please check the HTML structure.');
        return;
    }

    // Show loading state
    responseElement.innerHTML = 'Verifying text...';

    try {
        if (isLocalhost) {
            // Local development: direct API call
            await verifyTextDirect(text);
        } else {
            // Production: use Vercel API route
            await verifyTextViaAPI(text);
        }

    } catch (error) {
        console.error("Error:", error);

        let errorMessage = "Failed to verify text. ";
        if (error.message.includes('402')) {
            errorMessage += "Payment required - please check your OpenRouter API key billing status.";
        } else if (error.message.includes('401')) {
            errorMessage += "Invalid API key - please check your OpenRouter credentials.";
        } else if (error.message.includes('429')) {
            errorMessage += "Rate limit exceeded - please try again later.";
        } else {
            errorMessage += error.message;
        }

        responseElement.innerHTML = `<strong style="color: red;">Error:</strong> ${errorMessage}`;
    }
}

// Direct API call for local development
async function verifyTextDirect(text) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LOCAL_KEYS.OPENROUTER_API_KEY}`,
            'HTTP-Referer': window.location.href,
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

    const aiResponse = data.choices[0].message.content;
    const responseElement = document.getElementById('response');
    if (responseElement) {
        responseElement.innerHTML = `<strong>AI Analysis:</strong> ${aiResponse}`;
    }

    await fetchNews(text);
}

// API route call for production
async function verifyTextViaAPI(text) {
    const response = await fetch('/api/verify-text', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
    });

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error || 'Unknown error');
    }

    const responseElement = document.getElementById('response');
    if (responseElement) {
        responseElement.innerHTML = `<strong>AI Analysis:</strong> ${data.result}`;
    }
    await fetchNews(text);
}

async function fetchNews(query) {
    try {
        if (isLocalhost) {
            await fetchNewsDirect(query);
        } else {
            await fetchNewsViaAPI(query);
        }
    } catch (error) {
        console.error('Error fetching news:', error);
        const articlesElement = document.getElementById('articles');
        if (articlesElement) {
            articlesElement.innerHTML = '<p style="color: orange;">Unable to fetch related news articles at this time.</p>';
        }
    }
}

// Direct news API call for local development
async function fetchNewsDirect(query) {
    const url = `https://api.thenewsapi.com/v1/news/all?api_token=${LOCAL_KEYS.NEWS_API_TOKEN}&search=${encodeURIComponent(query)}&limit=5`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`News API Error ${response.status}`);
    }

    const result = await response.json();
    displayArticles(result.data || []);
}

// News API route call for production
async function fetchNewsViaAPI(query) {
    const response = await fetch('/api/fetch-news', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
    });

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error || 'Failed to fetch news');
    }

    displayArticles(data.articles);
}

function displayArticles(articles) {
    const articlesContainer = document.getElementById('articles');

    if (!articlesContainer) {
        console.error('Articles container not found!');
        return;
    }

    if (!articles || articles.length === 0) {
        articlesContainer.innerHTML = '<h3 class="articles-header">No related news articles found.</h3>';
        return;
    }

    articlesContainer.innerHTML = '<h3 class="articles-header">Related News Articles:</h3>';

    articles.forEach(article => {
        if (!article) return;

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

// Wait for DOM before adding event listeners
document.addEventListener('DOMContentLoaded', function() {
    const imageInput = document.getElementById('imageInput');
    if (imageInput) {
        imageInput.addEventListener('change', function(event) {
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
                    if (imagePreview) {
                        imagePreview.src = selectedImage;
                        imagePreview.style.display = 'block';
                    }
                }
                reader.readAsDataURL(file);
            }
        });
    }
});

async function verifyImage() {
    if (!selectedImage) {
        alert("Please select an image first.");
        return;
    }

    // Show loading state
    const resultElement = document.getElementById('aiDetectionResult');
    if (!resultElement) {
        console.error('AI detection result element not found!');
        return;
    }

    resultElement.textContent = "Analyzing image...";

    try {
        if (isLocalhost) {
            await verifyImageDirect();
        } else {
            await verifyImageViaAPI();
        }
    } catch (error) {
        console.error('Error detecting AI image:', error);

        let errorMessage = "Failed to analyze image. ";
        if (error.message.includes('401')) {
            errorMessage += "Invalid SightEngine API credentials.";
        } else if (error.message.includes('402')) {
            errorMessage += "SightEngine API payment required.";
        } else {
            errorMessage += error.message;
        }

        resultElement.innerHTML = `<strong style="color: red;">Error:</strong> ${errorMessage}`;
    }
}

// Direct image verification for local development
async function verifyImageDirect() {
    const formData = new FormData();
    formData.append('media', dataURItoBlob(selectedImage));
    formData.append('models', 'genai');
    formData.append('api_user', LOCAL_KEYS.SIGHTENGINE_API_USER);
    formData.append('api_secret', LOCAL_KEYS.SIGHTENGINE_API_SECRET);

    const response = await fetch('https://api.sightengine.com/1.0/check.json', {
        method: 'POST',
        body: formData
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

    displayImageResult(data.type.ai_generated);
}

// Image verification via API route for production
async function verifyImageViaAPI() {
    const response = await fetch('/api/verify-image', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageData: selectedImage })
    });

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.error || 'Failed to analyze image');
    }

    displayImageResult(data.aiGenerated);
}

function displayImageResult(aiGenerated) {
    const resultElement = document.getElementById('aiDetectionResult');
    if (!resultElement) return;

    const confidence = (aiGenerated * 100).toFixed(1);

    if (aiGenerated > 0.5) {
        resultElement.innerHTML = `
            <strong style="color: red;">Likely AI Generated</strong><br>
            Confidence: ${confidence}%
        `;
    } else {
        resultElement.innerHTML = `
            <strong style="color: green;">Likely Not AI Generated</strong><br>
            Confidence: ${(100 - confidence).toFixed(1)}%
        `;
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
