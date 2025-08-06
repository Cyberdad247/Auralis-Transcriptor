# Auralis Transcriptor - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Auralis Transcriptor application, including frontend deployment to Vercel, backend configuration, testing setup, and CI/CD pipeline management.

## Project Structure

```
auralis-transcriptor/
├── backend/                    # Node.js/Express backend
│   ├── src/                   # Source code
│   ├── tests/                 # Test files
│   ├── package.json           # Backend dependencies
│   └── jest.config.js         # Test configuration
├── frontend/                  # React frontend
│   └── auralis-transcriptor-frontend/
│       ├── src/               # React source code
│       ├── dist/              # Built files
│       ├── package.json       # Frontend dependencies
│       └── vite.config.ts     # Build configuration
├── .github/                   # GitHub Actions workflows
│   └── workflows/
│       ├── ci.yml             # Main CI/CD pipeline
│       ├── test.yml           # Testing workflow
│       └── deploy.yml         # Deployment workflow
├── vercel.json                # Vercel configuration
├── package.json               # Root package.json
└── .env.example               # Environment variables template
```

## Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager
- Vercel account for deployment
- GitHub repository for CI/CD

## Environment Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd auralis-transcriptor
```

### 2. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend/auralis-transcriptor-frontend
npm install
```

### 3. Environment Variables

Create `.env` files based on `.env.example`:

```bash
# Backend .env
NODE_ENV=development
PORT=5000
JWT_SECRET=your-jwt-secret
DATABASE_URL=your-database-url
OPENAI_API_KEY=your-openai-api-key

# Frontend .env
VITE_API_URL=http://localhost:5000/api
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Local Development

### Backend Development

```bash
cd backend
npm run dev
```

The backend will start on `http://localhost:5000`

### Frontend Development

```bash
cd frontend/auralis-transcriptor-frontend
npm run dev
```

The frontend will start on `http://localhost:3000`

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend/auralis-transcriptor-frontend
npm test

# Test coverage
npm run test:coverage
```

## Production Deployment

### Vercel Deployment

#### Automatic Deployment (Recommended)

1. **Connect GitHub Repository to Vercel:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Configure build settings:
     - Framework Preset: Other
     - Build Command: `npm run build:frontend`
     - Output Directory: `frontend/auralis-transcriptor-frontend/dist`

2. **Environment Variables:**
   Set the following environment variables in Vercel:
   ```
   VITE_API_URL=https://your-backend-url.com/api
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. **Deploy:**
   - Push to main branch triggers automatic deployment
   - Monitor deployment status in Vercel dashboard

#### Manual Deployment

```bash
# Build frontend
cd frontend/auralis-transcriptor-frontend
npm run build

# Deploy using Vercel CLI
npx vercel --prod
```

### Backend Deployment

The backend can be deployed to various platforms:

#### Railway/Render/Heroku

1. **Prepare for deployment:**
   ```bash
   cd backend
   npm run build  # if applicable
   ```

2. **Configure environment variables** on your chosen platform

3. **Deploy** using platform-specific methods

#### Docker Deployment

```bash
# Build Docker image
docker build -t auralis-transcriptor-backend ./backend

# Run container
docker run -p 5000:5000 --env-file .env auralis-transcriptor-backend
```

## CI/CD Pipeline

### GitHub Actions Workflows

The project includes three main workflows:

#### 1. Main CI/CD Pipeline (`.github/workflows/ci.yml`)

- **Triggers:** Push to main/develop, Pull requests
- **Jobs:**
  - Backend tests
  - Frontend tests
  - Security scanning
  - Integration tests
  - Deployment to staging/production

#### 2. Test Suite (`.github/workflows/test.yml`)

- **Triggers:** Push to any branch, Pull requests
- **Jobs:**
  - Unit tests (backend/frontend)
  - End-to-end tests
  - Performance tests
  - Accessibility tests

#### 3. Deployment (`.github/workflows/deploy.yml`)

- **Triggers:** Push to main, Manual dispatch
- **Jobs:**
  - Build application
  - Deploy to staging
  - Deploy to production
  - Health checks
  - Rollback on failure

### Required Secrets

Configure the following secrets in your GitHub repository:

```
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-vercel-org-id
VERCEL_PROJECT_ID=your-vercel-project-id
```

## Testing Strategy

### Backend Testing

- **Unit Tests:** Individual function and module testing
- **Integration Tests:** API endpoint testing
- **Service Tests:** External service mocking

```bash
cd backend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### Frontend Testing

- **Component Tests:** React component testing with Vitest
- **Integration Tests:** User interaction testing
- **E2E Tests:** Full application flow testing

```bash
cd frontend/auralis-transcriptor-frontend
npm test                    # Run all tests
npm run test:ui            # Test UI
npm run test:coverage      # Coverage report
```

### Test Coverage Goals

- Backend: >80% code coverage
- Frontend: >75% code coverage
- Critical paths: 100% coverage

## Monitoring and Maintenance

### Health Checks

The application includes health check endpoints:

- Backend: `GET /api/health`
- Frontend: Vercel automatic health monitoring

### Logging

- Backend: Winston logging with configurable levels
- Frontend: Console logging in development, error tracking in production

### Performance Monitoring

- Vercel Analytics for frontend performance
- Backend metrics via monitoring service integration

## Troubleshooting

### Common Issues

#### Build Failures

1. **TypeScript Errors:**
   ```bash
   # Check TypeScript configuration
   npx tsc --noEmit
   ```

2. **Dependency Issues:**
   ```bash
   # Clear node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

#### Deployment Issues

1. **Vercel Build Failures:**
   - Check build logs in Vercel dashboard
   - Verify environment variables
   - Ensure build command is correct

2. **Backend Connection Issues:**
   - Verify API URL configuration
   - Check CORS settings
   - Validate environment variables

#### Test Failures

1. **Backend Tests:**
   ```bash
   # Run tests with verbose output
   npm test -- --verbose
   ```

2. **Frontend Tests:**
   ```bash
   # Run tests with debugging
   npm test -- --reporter=verbose
   ```

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Backend
DEBUG=auralis:* npm run dev

# Frontend
VITE_DEBUG=true npm run dev
```

## Security Considerations

### Environment Variables

- Never commit `.env` files to version control
- Use different secrets for different environments
- Rotate secrets regularly

### API Security

- JWT token validation
- Rate limiting implemented
- Input validation and sanitization
- CORS properly configured

### Frontend Security

- Content Security Policy headers
- XSS protection
- Secure cookie settings
- HTTPS enforcement

## Performance Optimization

### Frontend

- Code splitting implemented
- Lazy loading for routes
- Image optimization
- Bundle size monitoring

### Backend

- Database query optimization
- Caching strategies
- Connection pooling
- Response compression

## Support and Documentation

### Additional Resources

- [API Documentation](./API_DOCUMENTATION.md)
- [Frontend Component Guide](./frontend/README.md)
- [Backend Architecture](./backend/README.md)
- [Testing Guide](./TESTING_GUIDE.md)

### Getting Help

1. Check existing GitHub issues
2. Review deployment logs
3. Consult troubleshooting section
4. Create new issue with detailed information

---

**Last Updated:** August 6, 2025
**Version:** 2.1.4

