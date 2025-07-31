# AI Presentation Builder with OpenRouter Integration

A complete, professional AI-powered presentation builder web application with secure backend integration using OpenRouter AI (GPT-3.5-turbo).

## 🚀 Features

### Core Functionality
- **AI Presentation Generation**: Powered by OpenRouter AI (GPT-3.5-turbo)
- **Beautiful Modern Interface**: Clean design with smooth animations
- **Drag & Drop Editor**: Intuitive slide editing
- **Professional Templates**: 5 stunning themes (Professional, Modern, Elegant, Creative, Minimal)
- **Export Functionality**: HTML download, PDF-ready printing
- **Real-time Preview**: See changes instantly
- **Mobile Responsive**: Works perfectly on all devices

### Security & Performance
- **Secure Backend**: API keys stored server-side, never exposed to frontend
- **Cost Optimization**: Request caching, batch processing, efficient prompting
- **Rate Limiting**: Prevents abuse with configurable limits
- **Error Handling**: Graceful fallbacks and retry logic

## 📁 Project Structure

```
presentation_builder1/
├── presentation-builder.html    # Frontend application (single file)
├── server.js                   # Backend server with OpenRouter integration
├── package.json               # Node.js dependencies
├── .env.example              # Environment configuration template
└── README.md                 # This documentation
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 14+ installed
- OpenRouter API key (provided in requirements)

### Backend Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # The .env file is already configured with the provided API key
   # No changes needed unless you want to customize settings
   ```

3. **Start the Backend Server**
   ```bash
   # Development mode (with auto-restart)
   npm run dev
   
   # Or production mode
   npm start
   ```

   The server will start on `http://localhost:3000`

### Frontend Setup

1. **Open the Application**
   - Open `presentation-builder.html` in any modern web browser
   - Or serve it through the backend server at `http://localhost:3000`

2. **Start Creating Presentations**
   - No API key input required (handled by backend)
   - Fill out the presentation form
   - Let AI generate your presentation
   - Edit and customize as needed
   - Export to HTML or PDF

## 🔧 Configuration

### Environment Variables (.env)

```bash
# OpenRouter AI Configuration
OPENROUTER_API_KEY=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

# Server Configuration
PORT=3000
NODE_ENV=production

# Frontend Configuration
FRONTEND_URL=http://localhost:8080

# Security Configuration (optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Cache Configuration
CACHE_DURATION_MINUTES=30
```

### Server Configuration

The backend server includes:
- **OpenRouter AI Integration**: GPT-3.5-turbo model
- **Request Caching**: 30-minute cache to reduce API costs
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Security Headers**: Helmet.js for security
- **CORS Support**: Configurable cross-origin requests
- **Error Handling**: Comprehensive error management

## 🌐 API Endpoints

### Backend API Routes

- `POST /api/generate-presentation` - Generate complete presentation
- `POST /api/enhance-slide` - Enhance individual slide content
- `POST /api/generate-speaker-notes` - Generate speaker notes
- `GET /api/health` - Health check endpoint

### Request Examples

**Generate Presentation:**
```javascript
POST /api/generate-presentation
{
  "topic": "Climate Change Solutions",
  "audience": "business",
  "slideCount": "10",
  "duration": "30",
  "additionalInfo": "Focus on renewable energy"
}
```

**Enhance Slide:**
```javascript
POST /api/enhance-slide
{
  "title": "Introduction",
  "content": "<h2>Welcome</h2><p>Basic content</p>"
}
```

## 🚀 Deployment

### Local Development
```bash
# Start backend server
npm run dev

# Open frontend
open presentation-builder.html
```

### Production Deployment

#### Option 1: Traditional Hosting
1. Deploy backend to services like:
   - Heroku
   - Railway
   - DigitalOcean
   - AWS EC2

2. Deploy frontend to:
   - Netlify
   - Vercel
   - GitHub Pages
   - Any static hosting

#### Option 2: Full-Stack Deployment
1. Deploy entire application to:
   - Heroku (with static file serving)
   - Railway
   - DigitalOcean App Platform

#### Environment Setup for Production
```bash
# Set environment variables in your hosting platform
OPENROUTER_API_KEY=your-api-key
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-frontend-domain.com
```

## 💡 Usage Guide

### Creating a Presentation

1. **Topic Input**
   - Enter your presentation topic
   - Select target audience
   - Choose slide count (5-20 slides)
   - Set presentation duration
   - Add optional additional requirements

2. **AI Generation**
   - Backend processes request with OpenRouter AI
   - GPT-3.5-turbo generates structured content
   - Fallback content provided if AI unavailable

3. **Editing & Customization**
   - Real-time slide editing
   - Theme switching (5 professional themes)
   - Add/duplicate/reorder slides
   - AI-powered slide enhancement
   - Speaker notes generation

4. **Export & Share**
   - Download as HTML file
   - Print to PDF
   - Share via generated links

### Advanced Features

- **Keyboard Shortcuts**: Ctrl+S (save), Ctrl+N (new slide), Ctrl+E (export)
- **Auto-save**: Presentations saved every 30 seconds
- **Theme Persistence**: Selected themes remembered
- **Responsive Design**: Works on mobile, tablet, desktop

## 🔒 Security Features

### Backend Security
- **API Key Protection**: Never exposed to frontend
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: All requests validated
- **CORS Configuration**: Controlled cross-origin access
- **Security Headers**: Helmet.js protection

### Frontend Security
- **No API Keys**: All AI requests through backend
- **Local Storage**: Only presentation data stored locally
- **Input Sanitization**: User content properly handled

## 🎨 Customization

### Adding New Themes
```javascript
// In presentation-builder.html, update the themes object
const themes = {
  newTheme: {
    primary: '#your-color',
    primaryDark: '#darker-shade',
    primaryLight: '#lighter-shade'
  }
};
```

### Modifying AI Prompts
```javascript
// In server.js, update the createPresentationPrompt function
function createPresentationPrompt(formData) {
  return `Your custom prompt template...`;
}
```

### Adding Export Formats
```javascript
// Add new export functions in presentation-builder.html
function exportPowerPoint() {
  // Implementation for PowerPoint export
}
```

## 🐛 Troubleshooting

### Common Issues

**Backend Server Won't Start**
- Check Node.js version (14+ required)
- Verify all dependencies installed: `npm install`
- Check port availability (default: 3000)

**AI Generation Fails**
- Verify OpenRouter API key in .env file
- Check server logs for API errors
- Ensure internet connectivity

**Frontend Can't Connect to Backend**
- Verify backend server is running
- Check CORS configuration
- Confirm API_BASE_URL in frontend

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev
```

## 📊 Performance Optimization

### Cost Optimization Features
- **Request Caching**: 30-minute cache reduces duplicate API calls
- **Batch Processing**: Multiple requests optimized
- **Efficient Prompting**: Optimized prompts for GPT-3.5-turbo
- **Fallback Content**: Reduces failed API calls

### Performance Monitoring
- Health check endpoint: `GET /api/health`
- Cache statistics included in health response
- Request logging for debugging

## 🤝 Contributing

### Development Setup
```bash
# Clone repository
git clone <repository-url>
cd presentation_builder1

# Install dependencies
npm install

# Start development server
npm run dev
```

### Code Structure
- **Frontend**: Single HTML file with embedded CSS/JS
- **Backend**: Express.js server with OpenRouter integration
- **Configuration**: Environment-based configuration

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check this README for common solutions
2. Review server logs for error details
3. Verify API key and configuration
4. Test with demo mode if AI features fail

## 🔄 Updates

### Version 2.0 Features
- ✅ OpenRouter AI Integration (GPT-3.5-turbo)
- ✅ Secure Backend Architecture
- ✅ Cost Optimization Features
- ✅ Enhanced Error Handling
- ✅ Production-Ready Deployment

### Previous Version (1.0)
- Direct Claude API integration (client-side)
- Single HTML file application
- Basic AI features

---

**Ready to create amazing presentations with AI!** 🎯

Start the backend server and open the frontend to begin creating professional presentations in minutes.
