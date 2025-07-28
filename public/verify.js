// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM loaded, verify.js ready');

    const requiredElements = ['input-verfiy', 'response', 'articles', 'imageInput', 'imagePreview', 'aiDetectionResult'];
    const missingElements = requiredElements.filter(id => !document.getElementById(id));

    if (missingElements.length > 0) {
        console.warn('Missing HTML elements:', missingElements);
    } else {
        console.log('All required elements found ✅');
    }
});

async function verifyText() {
    const text = document.getElementById('input-verfiy').value;
    const responseElement = document.getElementById('response');
    if (!text || !responseElement) {
        alert("Missing input or response element.");
        return;
    }

    responseElement.innerHTML = 'Verifying text...';

    try {
        const res = await fetch('/api/verify-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Unknown error');

        responseElement.innerHTML = `<strong>AI Analysis:</strong> ${data.result}`;
        await fetchNews(text);
    } catch (err) {
        console.error("Error:", err);
        responseElement.innerHTML = `<strong style="color: red;">Error:</strong> ${err.message}`;
    }
}

async function fetchNews(query) {
    const articlesElement = document.getElementById('articles');
    if (!articlesElement) return;

    try {
        const res = await fetch('/api/fetch-news', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'News fetch failed');

        displayArticles(data.articles);
    } catch (err) {
        console.error('Error fetching news:', err);
        articlesElement.innerHTML = '<p style="color: orange;">Unable to fetch news.</p>';
    }
}

function displayArticles(articles) {
    const container = document.getElementById('articles');
    if (!container) return;

    if (!articles || articles.length === 0) {
        container.innerHTML = '<h3 class="articles-header">No related news articles found.</h3>';
        return;
    }

    container.innerHTML = '<h3 class="articles-header">Related News Articles:</h3>';
    articles.forEach(article => {
        const el = document.createElement('div');
        el.className = 'article';
        el.innerHTML = `
            <div class="article-title">${article.title || 'No title'}</div>
            <div class="article-snippet">${article.snippet || article.description || 'No description'}</div>
            <a class="article-link" href="${article.url}" target="_blank" rel="noopener noreferrer">Read more</a>
        `;
        container.appendChild(el);
    });
}

// IMAGE VERIFICATION

let selectedImage = null;

document.addEventListener('DOMContentLoaded', function () {
    const imageInput = document.getElementById('imageInput');
    if (imageInput) {
        imageInput.addEventListener('change', function (event) {
            const file = event.target.files[0];
            if (!file || !file.type.startsWith('image/')) {
                alert('Please select a valid image file.');
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                alert('Image too large. Max 10MB.');
                return;
            }

            const reader = new FileReader();
            reader.onload = function (e) {
                selectedImage = e.target.result;
                const preview = document.getElementById('imagePreview');
                if (preview) {
                    preview.src = selectedImage;
                    preview.style.display = 'block';
                }
            };
            reader.readAsDataURL(file);
        });
    }
});

async function verifyImage() {
    if (!selectedImage) {
        alert("Please select an image first.");
        return;
    }

    const resultElement = document.getElementById('aiDetectionResult');
    if (!resultElement) return;

    resultElement.textContent = "Analyzing image...";

    try {
        const res = await fetch('/api/verify-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageData: selectedImage })
        });

        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Image analysis failed');

        displayImageResult(data.aiGenerated);
    } catch (err) {
        console.error('Image detection error:', err);
        resultElement.innerHTML = `<strong style="color: red;">Error:</strong> ${err.message}`;
    }
}

function displayImageResult(aiGenerated) {
    const resultElement = document.getElementById('aiDetectionResult');
    if (!resultElement) return;

    const confidence = (aiGenerated * 100).toFixed(1);
    resultElement.innerHTML = aiGenerated > 0.5
        ? `<strong style="color: red;">Likely AI Generated</strong><br>Confidence: ${confidence}%`
        : `<strong style="color: green;">Likely Not AI Generated</strong><br>Confidence: ${(100 - confidence).toFixed(1)}%`;
}
