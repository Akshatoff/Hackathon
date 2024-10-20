const $OPENROUTER_API_KEY = "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";

async function verifyText() {
    const text = document.getElementById('input-verfiy').value;
    if (!text) return;

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${$OPENROUTER_API_KEY}`
            },
            body: JSON.stringify({
                model: "openai/gpt-3.5-turbo",
                messages: [
                    { role: "user", content: text }
                ]
            })
        });

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;
        document.getElementById('response').innerHTML = `Verdict: ${aiResponse}`;

        fetchNews(text);
    } catch (error) {
        console.error("Error:", error);
        alert("Failed to get a response from the AI.");
    }
}

async function fetchNews(query) {
    const API_TOKEN = "V5jTTfcrQs9CAFIjeLS9ZotFJ1NA0bdBsUAbCASJ";
    const url = `https://api.thenewsapi.com/v1/news/all?api_token=${API_TOKEN}&search=${encodeURIComponent(query)}&limit=5`;

    try {
        const response = await fetch(url);
        const result = await response.json();
        displayArticles(result.data || []);
    } catch (error) {
        console.error('Error fetching news:', error);
        alert("Failed to fetch news articles.");
    }
}

function displayArticles(articles) {
    const articlesContainer = document.getElementById('articles');
    articlesContainer.innerHTML = '<h3 class="articles-header">Related News Articles:</h3>';

    articles.forEach(article => {
        const articleElement = document.createElement('div');
        articleElement.className = 'article';
        articleElement.innerHTML = `
            <div class="article-title">${article.title}</div>
            <div class="article-snippet">${article.snippet}</div>
            <a class="article-link" href="${article.url}" target="_blank">Read more</a>
        `;
        articlesContainer.appendChild(articleElement);
    });
}

let selectedImage = null;

document.getElementById('imageInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
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

    const formData = new FormData();
    formData.append('media', dataURItoBlob(selectedImage));
    formData.append('models', 'genai');
    formData.append('api_user', '154303857');
    formData.append('api_secret', 'VbN5SrRTPXUB8ccA37YhXE6XvgBJT9iq');

    try {
        const response = await fetch('https://api.sightengine.com/1.0/check.json', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.type.ai_generated > 0.5) {
            document.getElementById('aiDetectionResult').textContent = "AI generated";
        } else {
            document.getElementById('aiDetectionResult').textContent = "Not AI generated";
        }
    } catch (error) {
        console.error('Error detecting AI image:', error);
        alert("Failed to detect AI in the image.");
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