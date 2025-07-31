const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware with CSP configuration for inline scripts and event handlers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://openrouter.ai"]
        }
    }
}));
app.use(cors({
    origin: process.env.FRONTEND_URL || `http://localhost:${PORT}`,
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('.'));

// Serve the main application at root
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/presentation-builder.html');
});

// OpenRouter AI configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-3.5-turbo-0613';

// Request cache to avoid duplicate API calls
const requestCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Clean expired cache entries
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of requestCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            requestCache.delete(key);
        }
    }
}, 5 * 60 * 1000); // Clean every 5 minutes

// Utility function to create cache key
function createCacheKey(data) {
    return JSON.stringify({
        topic: data.topic,
        audience: data.audience,
        slideCount: data.slideCount,
        duration: data.duration,
        additionalInfo: data.additionalInfo || ''
    });
}

// Utility function to make OpenRouter API call
async function callOpenRouterAPI(messages, maxTokens = 2000) {
    try {
        const response = await fetch(OPENROUTER_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.FRONTEND_URL || `http://localhost:${PORT}`,
                'X-Title': 'AI Presentation Builder'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: messages,
                max_tokens: maxTokens,
                temperature: 0.7,
                top_p: 0.9,
                frequency_penalty: 0.1,
                presence_penalty: 0.1
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`OpenRouter API Error: ${response.status} ${response.statusText} - ${errorData}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('OpenRouter API Error:', error);
        throw error;
    }
}

// Create optimized prompt for GPT-3.5-turbo
function createPresentationPrompt(formData) {
    return `Create a professional presentation about "${formData.topic}" for ${formData.audience} audience. 
Requirements:
- ${formData.slideCount} slides total
- ${formData.duration}-minute presentation duration
${formData.additionalInfo ? `- Additional: ${formData.additionalInfo}` : ''}

Return ONLY valid JSON in this exact format:
{
  "title": "Presentation Title",
  "subtitle": "Brief subtitle",
  "slides": [
    {
      "title": "Slide Title",
      "content": "HTML content with h1/h2/p/ul/li tags",
      "type": "title|content|conclusion"
    }
  ]
}

Make content engaging and professional. First slide = title, last slide = conclusion.`;
}

// Generate base presentation without enhancement
async function generateBasePresentation(formData) {
    // Check cache first
    const cacheKey = createCacheKey(formData);
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('Returning cached base presentation');
        return cached.data;
    }

    // Create prompt
    const prompt = createPresentationPrompt(formData);
    
    // Make API call with retry logic
    let attempts = 0;
    let result = null;
    
    while (attempts < 3 && !result) {
        try {
            attempts++;
            console.log(`Attempt ${attempts} to generate base presentation for topic: ${formData.topic}`);
            
            const response = await callOpenRouterAPI([
                { role: 'user', content: prompt }
            ], 3000);
            
            // Try to parse JSON response
            try {
                result = JSON.parse(response);
                
                // Validate structure
                if (!result.slides || !Array.isArray(result.slides) || result.slides.length === 0) {
                    throw new Error('Invalid presentation structure');
                }
            } catch (parseError) {
                console.log('Failed to parse JSON, creating fallback presentation');
                result = createFallbackPresentation(formData);
            }
            
        } catch (error) {
            console.error(`Attempt ${attempts} failed:`, error.message);
            if (attempts === 3) {
                // Final fallback
                result = createFallbackPresentation(formData);
            }
        }
    }

    // Cache the result
    requestCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
    });

    return result;
}

// API Routes

// Generate presentation
app.post('/api/generate-presentation', async (req, res) => {
    try {
        // Validate input
        const { topic, audience, slideCount, duration, additionalInfo } = req.body;
        
        if (!topic || !audience || !slideCount || !duration) {
            return res.status(400).json({
                error: 'Missing required fields: topic, audience, slideCount, duration'
            });
        }

        // Check cache first
        const cacheKey = createCacheKey(req.body);
        const cached = requestCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log('Returning cached result');
            return res.json(cached.data);
        }

        // Create prompt
        const prompt = createPresentationPrompt(req.body);
        
        // Make API call with retry logic
        let attempts = 0;
        let result = null;
        
        while (attempts < 3 && !result) {
            try {
                attempts++;
                console.log(`Attempt ${attempts} to generate presentation for topic: ${topic}`);
                
                const response = await callOpenRouterAPI([
                    { role: 'user', content: prompt }
                ], 3000);
                
                // Try to parse JSON response
                try {
                    result = JSON.parse(response);
                    
                    // Validate structure
                    if (!result.slides || !Array.isArray(result.slides) || result.slides.length === 0) {
                        throw new Error('Invalid presentation structure');
                    }
                } catch (parseError) {
                    console.log('Failed to parse JSON, creating fallback presentation');
                    result = createFallbackPresentation(req.body);
                }
                
            } catch (error) {
                console.error(`Attempt ${attempts} failed:`, error.message);
                if (attempts === 3) {
                    // Final fallback
                    result = createFallbackPresentation(req.body);
                }
            }
        }

        // Cache the result
        requestCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });

        res.json(result);

    } catch (error) {
        console.error('Generate presentation error:', error);
        res.status(500).json({
            error: 'Failed to generate presentation',
            message: error.message
        });
    }
});

// Enhance slide content with intelligent analysis
app.post('/api/enhance-slide', async (req, res) => {
    try {
        const { title, content } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({
                error: 'Missing required fields: title, content'
            });
        }

        // Analyze content and create intelligent enhancement prompt
        const enhancedContent = await enhanceSlideContent(title, content);
        
        res.json({ content: enhancedContent });

    } catch (error) {
        console.error('Enhance slide error:', error);
        res.status(500).json({
            error: 'Failed to enhance slide',
            message: error.message
        });
    }
});

// Intelligent slide content enhancement function
async function enhanceSlideContent(title, content) {
    // Remove HTML tags to analyze plain text
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    const wordCount = plainText.split(/\s+/).length;
    
    // Analyze content characteristics
    const hasLists = content.includes('<ul>') || content.includes('<ol>');
    const hasHeadings = content.includes('<h1>') || content.includes('<h2>');
    const isVeryShort = wordCount < 10;
    const isShort = wordCount < 25;
    const isPlain = !hasLists && !hasHeadings && plainText.length > 0;
    
    // Create context-aware enhancement prompt
    let prompt = `You are an expert presentation consultant. Analyze and enhance this slide content:

SLIDE TITLE: "${title}"
CURRENT CONTENT: ${content}

ANALYSIS CONTEXT:
- Word count: ${wordCount}
- Has bullet points: ${hasLists}
- Has headings: ${hasHeadings}
- Content type: ${isVeryShort ? 'Very short' : isShort ? 'Short' : 'Adequate length'}

ENHANCEMENT REQUIREMENTS:
`;

    if (isVeryShort) {
        prompt += `
- This content is too brief (${wordCount} words). Expand significantly with:
  * 3-5 detailed bullet points explaining key aspects
  * Specific examples or use cases
  * Supporting details that add value
  * Clear structure with headings if appropriate`;
    } else if (isShort) {
        prompt += `
- This content needs expansion (${wordCount} words). Add:
  * 2-3 additional bullet points with specifics
  * More detailed explanations
  * Examples or supporting evidence
  * Better structure and flow`;
    } else if (isPlain) {
        prompt += `
- Convert this plain text into structured content with:
  * Clear headings (h2) for main topics
  * Bullet points (ul/li) for key information
  * Logical flow and hierarchy
  * Professional formatting`;
    } else {
        prompt += `
- Improve existing structure by:
  * Making bullet points more specific and actionable
  * Adding missing details or examples
  * Improving clarity and professional tone
  * Ensuring logical flow and hierarchy`;
    }

    prompt += `

SPECIFIC ENHANCEMENT RULES:
1. Always use proper HTML structure (h1, h2, p, ul, li)
2. Make bullet points specific and actionable
3. Add concrete examples where relevant
4. Use professional, engaging language
5. Ensure content matches the slide title
6. Keep formatting clean and readable
7. If content is about benefits, add specific value propositions
8. If content is about processes, add clear steps
9. If content is about features, add practical applications

RETURN FORMAT: Return ONLY the enhanced HTML content, no explanations or additional text.

ENHANCED CONTENT:`;

    try {
        const enhancedContent = await callOpenRouterAPI([
            { role: 'user', content: prompt }
        ], 1500);

        // Clean up the response and ensure it's valid HTML
        let cleanContent = enhancedContent.trim();
        
        // Remove any markdown formatting that might have slipped through
        cleanContent = cleanContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        cleanContent = cleanContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Ensure we have proper HTML structure
        if (!cleanContent.includes('<') && cleanContent.length > 0) {
            // If no HTML tags, wrap in paragraph
            cleanContent = `<p>${cleanContent}</p>`;
        }
        
        // Validate that we have meaningful content
        const enhancedPlainText = cleanContent.replace(/<[^>]*>/g, '').trim();
        if (enhancedPlainText.length < plainText.length * 0.8) {
            // If enhanced content is significantly shorter, fall back to structured enhancement
            return createStructuredEnhancement(title, content);
        }
        
        return cleanContent;
        
    } catch (error) {
        console.error('AI enhancement failed, using structured fallback:', error);
        return createStructuredEnhancement(title, content);
    }
}

// Fallback structured enhancement when AI fails
function createStructuredEnhancement(title, content) {
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    const wordCount = plainText.split(/\s+/).length;
    
    if (wordCount < 15) {
        // Very short content - add structure and expand
        return `<h2>${title}</h2>
<p>${plainText}</p>
<ul>
<li>Key benefit: Provides significant value to users</li>
<li>Implementation: Easy to integrate and use</li>
<li>Impact: Measurable improvements in efficiency</li>
<li>Next steps: Ready for immediate deployment</li>
</ul>`;
    } else if (!content.includes('<ul>') && !content.includes('<h2>')) {
        // Plain text - add structure
        const sentences = plainText.split('.').filter(s => s.trim().length > 0);
        if (sentences.length > 1) {
            const mainPoint = sentences[0].trim();
            const details = sentences.slice(1).map(s => `<li>${s.trim()}</li>`).join('');
            return `<h2>${title}</h2>
<p>${mainPoint}.</p>
<ul>
${details}
</ul>`;
        }
    }
    
    // Default enhancement - just ensure proper structure
    return content.includes('<h2>') ? content : `<h2>${title}</h2>${content}`;
}

// Generate speaker notes
app.post('/api/generate-speaker-notes', async (req, res) => {
    try {
        const { title, content } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({
                error: 'Missing required fields: title, content'
            });
        }

        const prompt = `Generate helpful speaker notes for this presentation slide:

Title: ${title}
Content: ${content}

Provide 3-5 key talking points that a presenter should mention. Be concise and practical.`;

        const notes = await callOpenRouterAPI([
            { role: 'user', content: prompt }
        ], 800);

        res.json({ notes });

    } catch (error) {
        console.error('Generate speaker notes error:', error);
        res.status(500).json({
            error: 'Failed to generate speaker notes',
            message: error.message
        });
    }
});

// Auto-enhance presentation during creation
app.post('/api/generate-and-enhance-presentation', async (req, res) => {
    try {
        // Validate input
        const { topic, audience, slideCount, duration, additionalInfo } = req.body;
        
        if (!topic || !audience || !slideCount || !duration) {
            return res.status(400).json({
                error: 'Missing required fields: topic, audience, slideCount, duration'
            });
        }

        // Check cache first
        const cacheKey = createCacheKey(req.body) + '_enhanced';
        const cached = requestCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log('Returning cached enhanced result');
            return res.json(cached.data);
        }

        // Generate base presentation
        const basePresentation = await generateBasePresentation(req.body);
        
        // Auto-enhance each slide
        const enhancedSlides = [];
        for (let i = 0; i < basePresentation.slides.length; i++) {
            const slide = basePresentation.slides[i];
            try {
                const enhancedContent = await enhanceSlideContent(slide.title, slide.content);
                enhancedSlides.push({
                    ...slide,
                    content: enhancedContent,
                    autoEnhanced: true // Mark as auto-enhanced
                });
            } catch (error) {
                console.error(`Failed to enhance slide ${i + 1}:`, error);
                enhancedSlides.push({
                    ...slide,
                    autoEnhanced: false
                });
            }
        }

        const result = {
            ...basePresentation,
            slides: enhancedSlides,
            autoEnhanced: true
        };

        // Cache the result
        requestCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });

        res.json(result);

    } catch (error) {
        console.error('Generate and enhance presentation error:', error);
        res.status(500).json({
            error: 'Failed to generate and enhance presentation',
            message: error.message
        });
    }
});

// Batch enhance all slides
app.post('/api/enhance-all-slides', async (req, res) => {
    try {
        const { slides } = req.body;
        
        if (!slides || !Array.isArray(slides)) {
            return res.status(400).json({
                error: 'Missing required field: slides array'
            });
        }

        const prompt = `Enhance slides: ${slides.map((s, i) => `${i + 1}:${s.title}-${s.content.replace(/<[^>]*>/g, '').slice(0, 50)}`).join('|')} Return JSON:{"slides":[{"title":"","content":"","type":""}]}`;

        const response = await callOpenRouterAPI([
            { role: 'user', content: prompt }
        ], 2000);

        try {
            const enhanced = JSON.parse(response);
            res.json(enhanced);
        } catch {
            res.json({ slides });
        }

    } catch (error) {
        console.error('Batch enhance error:', error);
        res.json({ slides });
    }
});

// Fallback presentation generator
function createFallbackPresentation(formData) {
    const slideCount = parseInt(formData.slideCount);
    const slides = [];
    
    // Title slide
    slides.push({
        title: formData.topic,
        content: `<h1>${formData.topic}</h1><p>A comprehensive presentation for ${formData.audience}</p>`,
        type: 'title'
    });
    
    // Content slides
    for (let i = 2; i < slideCount; i++) {
        slides.push({
            title: `Key Point ${i - 1}`,
            content: `<h2>Key Point ${i - 1}</h2><ul><li>Important information about ${formData.topic}</li><li>Supporting details and examples</li><li>Relevant data and insights</li></ul>`,
            type: 'content'
        });
    }
    
    // Conclusion slide
    slides.push({
        title: 'Thank You',
        content: '<h1>Thank You</h1><p>Questions & Discussion</p>',
        type: 'conclusion'
    });
    
    return {
        title: formData.topic,
        subtitle: `Presentation for ${formData.audience}`,
        slides: slides
    };
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        cache_size: requestCache.size
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 AI Presentation Builder Server running on port ${PORT}`);
    console.log(`📊 Frontend URL: ${process.env.FRONTEND_URL || `http://localhost:${PORT}`}`);
    console.log(`🔑 OpenRouter API configured: ${OPENROUTER_API_KEY ? 'Yes' : 'No'}`);
    console.log(`💾 Cache enabled: Yes (${CACHE_DURATION / 1000 / 60} minutes)`);
});

module.exports = app;
