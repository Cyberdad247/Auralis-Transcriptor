# Auralis Transcriptor

A comprehensive end-to-end audio transcription application with a Star Trek LCARS-inspired interface, built with modern web technologies and deployed on Vercel.

## 🚀 Live Demo

**Production URL:** [https://unvzqjwo.manus.space](https://unvzqjwo.manus.space)

## ✨ Features

### Core Functionality
- **Audio Transcription:** Upload audio files and get accurate transcriptions using OpenAI Whisper
- **Multiple Formats:** Support for MP3, WAV, M4A, FLAC, and OGG audio formats
- **Real-time Processing:** Live progress tracking during transcription
- **User Management:** Secure authentication and user-specific transcription history
- **LCARS Interface:** Star Trek-inspired UI with authentic styling and animations

### Technical Features
- **Modern Stack:** React 18, TypeScript, Node.js, Express
- **Responsive Design:** Mobile-first approach with desktop optimization
- **Real-time Updates:** WebSocket integration for live status updates
- **Comprehensive Testing:** Unit, integration, and E2E tests
- **CI/CD Pipeline:** Automated testing and deployment with GitHub Actions
- **Production Ready:** Deployed on Vercel with monitoring and analytics

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **React Query** for state management
- **React Router** for navigation
- **Vitest** for testing

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **JWT** for authentication
- **Multer** for file uploads
- **OpenAI API** for transcription
- **Jest** for testing
- **Winston** for logging

### DevOps & Deployment
- **Vercel** for frontend hosting
- **GitHub Actions** for CI/CD
- **Docker** support for containerization
- **ESLint & Prettier** for code quality

## 📁 Project Structure

```
auralis-transcriptor/
├── frontend/auralis-transcriptor-frontend/  # React frontend application
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/              # Page components
│   │   ├── contexts/           # React contexts
│   │   ├── hooks/              # Custom hooks
│   │   ├── utils/              # Utility functions
│   │   └── tests/              # Test files
│   ├── dist/                   # Built files
│   └── package.json
├── backend/                     # Node.js backend API
│   ├── src/
│   │   ├── routes/             # API routes
│   │   ├── services/           # Business logic
│   │   ├── middleware/         # Express middleware
│   │   ├── database/           # Database configuration
│   │   └── utils/              # Utility functions
│   ├── tests/                  # Test files
│   └── package.json
├── .github/workflows/          # GitHub Actions CI/CD
├── docs/                       # Documentation
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd auralis-transcriptor
   ```

2. **Install dependencies:**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend/auralis-transcriptor-frontend
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   # Copy example files
   cp .env.example .env
   
   # Edit with your values
   # Backend .env
   NODE_ENV=development
   PORT=5000
   JWT_SECRET=your-jwt-secret
   OPENAI_API_KEY=your-openai-api-key
   
   # Frontend .env
   VITE_API_URL=http://localhost:5000/api
   ```

4. **Start development servers:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend/auralis-transcriptor-frontend
   npm run dev
   ```

5. **Open your browser:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 🧪 Testing

### Run Tests

```bash
# Backend tests
cd backend
npm test
npm run test:coverage

# Frontend tests
cd frontend/auralis-transcriptor-frontend
npm test
npm run test:coverage
```

### Test Coverage
- Backend: >80% code coverage
- Frontend: >75% code coverage
- Critical user flows: 100% coverage

## 📦 Deployment

### Vercel (Frontend)

The frontend is automatically deployed to Vercel on every push to the main branch.

**Manual deployment:**
```bash
cd frontend/auralis-transcriptor-frontend
npm run build
npx vercel --prod
```

### Backend Deployment

The backend can be deployed to various platforms:

```bash
# Build for production
cd backend
npm run build

# Deploy to your preferred platform
# (Railway, Render, Heroku, etc.)
```

## 🔧 Configuration

### Environment Variables

#### Backend
```env
NODE_ENV=production
PORT=5000
JWT_SECRET=your-secure-jwt-secret
DATABASE_URL=your-database-url
OPENAI_API_KEY=your-openai-api-key
LOG_LEVEL=info
```

#### Frontend
```env
VITE_API_URL=https://your-backend-url.com/api
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Vercel Configuration

The project includes a `vercel.json` file with optimized settings:
- SPA routing support
- API proxy configuration
- Security headers
- Performance optimizations

## 🎨 UI/UX Features

### LCARS Design System
- Authentic Star Trek LCARS styling
- Responsive grid layouts
- Animated transitions
- Color-coded status indicators
- Futuristic typography

### User Experience
- Drag-and-drop file uploads
- Real-time progress indicators
- Responsive design for all devices
- Accessibility compliance
- Error handling with user-friendly messages

## 🔒 Security

### Authentication
- JWT-based authentication
- Secure password hashing
- Session management
- Protected routes

### API Security
- Input validation and sanitization
- Rate limiting
- CORS configuration
- Error handling without information leakage

### Frontend Security
- XSS protection
- Content Security Policy
- Secure cookie handling
- Environment variable protection

## 📊 Monitoring & Analytics

### Performance Monitoring
- Vercel Analytics integration
- Core Web Vitals tracking
- Error boundary implementation
- Performance budgets

### Logging
- Structured logging with Winston
- Error tracking and reporting
- Request/response logging
- Performance metrics

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests:**
   ```bash
   npm test
   ```
5. **Commit your changes:**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to the branch:**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Code Standards
- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting
- Conventional commits
- Test coverage requirements

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [API Documentation](./docs/API.md)
- [Component Library](./docs/COMPONENTS.md)
- [Testing Guide](./docs/TESTING.md)

## 🐛 Troubleshooting

### Common Issues

1. **Build Failures:**
   - Check Node.js version (18+)
   - Clear node_modules and reinstall
   - Verify environment variables

2. **API Connection Issues:**
   - Check backend server status
   - Verify API URL configuration
   - Check CORS settings

3. **Transcription Errors:**
   - Verify OpenAI API key
   - Check file format support
   - Monitor API rate limits

### Getting Help

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Review the troubleshooting section
3. Join our community discussions
4. Contact the maintainers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for the Whisper API
- Star Trek for the LCARS design inspiration
- The React and Node.js communities
- All contributors and testers

## 📈 Roadmap

### Upcoming Features
- [ ] Real-time transcription streaming
- [ ] Multiple language support
- [ ] Audio file compression
- [ ] Batch processing
- [ ] Export to multiple formats
- [ ] Advanced search and filtering
- [ ] Team collaboration features
- [ ] API rate limiting dashboard

### Performance Improvements
- [ ] Caching layer implementation
- [ ] Database optimization
- [ ] CDN integration
- [ ] Progressive Web App features

---

**Built with ❤️ by the Auralis Team**

**Version:** 2.1.4  
**Last Updated:** August 6, 2025

