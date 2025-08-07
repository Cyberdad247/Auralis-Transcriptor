# 🚀 Aurora Transcriptor - Configuration Setup Guide

This guide will walk you through setting up all necessary configurations for the Aurora Transcriptor application.

## 📋 Prerequisites

Before starting, ensure you have accounts with:
- [Supabase](https://supabase.com) (for database and authentication)
- [DeepSeek AI](https://deepseek.com) (for primary transcription)
- [Google AI Studio](https://ai.google.dev) (for backup transcription)
- [OpenAI](https://openai.com) (optional alternative)
- [AWS](https://aws.amazon.com) (optional for advanced features)

## 🗄️ 1. Supabase Configuration

### Step 1: Create a Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization and fill in:
   - **Project Name**: `aurora-transcriptor`
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Start with Free tier

### Step 2: Get Your Supabase Credentials
Once your project is ready:

1. **API Settings**: Go to Settings → API
   - **Project URL**: Copy this (looks like `https://xxxxx.supabase.co`)
   - **Anon Public Key**: Copy this JWT token
   - **Service Role Key**: Copy this (keep it secret!)

2. **Database Settings**: Go to Settings → Database
   - **Host**: Copy the connection pooler host
   - **Database Password**: Use the one you created

### Step 3: Set Up Database Schema
1. Go to SQL Editor in your Supabase dashboard
2. Run the schema files located in `supabase/migrations/`:
   ```sql
   -- Run each migration file in order
   -- 1754366905_init_auralis_transcriptor_schema.sql
   -- 1754366916_setup_rls_policies.sql
   -- 1754367318_create_storage_bucket_policy.sql
   ```

### Step 4: Configure Storage
1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `audio-files`
3. Set it to **Public** if you want direct file access
4. Set up appropriate policies for authenticated users

## 🤖 2. AI Transcription Service Keys

### DeepSeek AI (Primary Provider)
1. Visit [DeepSeek AI](https://platform.deepseek.com)
2. Sign up/Login to your account
3. Go to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-`)

### Google Gemini (Secondary Provider)
1. Visit [Google AI Studio](https://aistudio.google.com)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

### OpenAI (Optional)
1. Visit [OpenAI Platform](https://platform.openai.com)
2. Go to API Keys section
3. Create new secret key
4. Copy the key (starts with `sk-`)

### AWS Transcribe (Optional)
1. Visit [AWS Console](https://console.aws.amazon.com)
2. Create an IAM user with Transcribe permissions
3. Generate Access Key ID and Secret Access Key
4. Note your preferred region

## ⚙️ 3. Environment Configuration

### Local Development Setup

1. **Copy the template**:
   ```bash
   cp .env.example .env
   ```

2. **Fill in your credentials**:
   ```bash
   # Supabase Configuration
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_KEY=your-service-role-key-here
   
   # Database Credentials
   DATABASE_URL=postgresql://postgres:your-password@db.your-project-id.supabase.co:5432/postgres
   DB_PASSWORD=your-database-password-here
   
   # AI Service Keys
   DEEPSEEK_API_KEY=sk-your-deepseek-key-here
   GEMINI_API_KEY=your-gemini-key-here
   OPENAI_API_KEY=sk-your-openai-key-here
   
   # Security Keys (GENERATE STRONG RANDOM KEYS!)
   JWT_SECRET=your-256-bit-secret-key-here
   JWT_REFRESH_SECRET=your-refresh-secret-here
   SESSION_SECRET=your-session-secret-here
   ```

3. **Generate secure secrets**:
   ```bash
   # Use openssl to generate random keys
   openssl rand -base64 32  # For JWT_SECRET
   openssl rand -base64 32  # For JWT_REFRESH_SECRET
   openssl rand -base64 32  # For SESSION_SECRET
   ```

### Production Deployment (Vercel)

1. **Go to your Vercel project dashboard**
2. **Navigate to Settings → Environment Variables**
3. **Add each environment variable**:

   **Required Variables:**
   ```
   NODE_ENV=production
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   DATABASE_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres
   JWT_SECRET=your-strong-jwt-secret
   DEEPSEEK_API_KEY=sk-your-deepseek-key
   ```

   **Optional Variables:**
   ```
   GEMINI_API_KEY=your-gemini-key
   OPENAI_API_KEY=sk-your-openai-key
   AWS_ACCESS_KEY_ID=your-aws-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret
   TRANSCRIPTION_PROVIDER=deepseek
   ENABLE_NLP_ANALYSIS=true
   ```

## 🔐 4. Security Best Practices

### JWT Secrets
- **Generate strong random keys** (32+ characters)
- **Never commit secrets** to version control
- **Use different secrets** for development and production
- **Rotate secrets regularly** in production

### Database Security
- **Use strong passwords** (16+ characters, mixed case, numbers, symbols)
- **Enable Row Level Security (RLS)** in Supabase
- **Limit database access** to application only
- **Regular backups** and security updates

### API Keys
- **Limit API key permissions** to necessary scopes only
- **Monitor API usage** to detect anomalies
- **Set usage limits** to prevent billing surprises
- **Store in environment variables** never in code

## 🧪 5. Testing Your Configuration

### Backend Testing
```bash
cd backend
npm test
npm run dev  # Should start without errors
```

### Frontend Testing
```bash
cd frontend/auralis-transcriptor-frontend
npm install
npm run dev  # Should connect to Supabase successfully
```

### Full Integration Test
1. Start both backend and frontend
2. Register a new user
3. Upload a small audio file
4. Verify transcription completes successfully

## 🔧 6. Environment-Specific Settings

### Development
- Use `NODE_ENV=development`
- Enable debug logging: `LOG_LEVEL=debug`
- Use local file storage: `UPLOAD_DIR=./uploads`
- Enable all AI features for testing

### Staging
- Use `NODE_ENV=staging`
- Moderate logging: `LOG_LEVEL=info`
- Use cloud storage if available
- Enable monitoring and error tracking

### Production
- Use `NODE_ENV=production`
- Minimal logging: `LOG_LEVEL=warn`
- **Always use cloud storage**
- Enable all security features
- Set up monitoring and alerting

## 📊 7. Monitoring and Maintenance

### Supabase Monitoring
- Monitor database performance in Supabase dashboard
- Set up alerts for high usage
- Regular database backups

### AI Service Monitoring
- Track API usage and costs
- Monitor response times and error rates
- Have backup providers configured

### Application Monitoring
- Set up error tracking (Sentry, LogRocket, etc.)
- Monitor application performance
- Set up uptime monitoring

## 🆘 8. Troubleshooting

### Common Issues

1. **Supabase Connection Failed**
   - Check your project URL and keys
   - Verify database password
   - Check network connectivity

2. **AI API Errors**
   - Verify API keys are correct
   - Check API quotas and billing
   - Test with backup providers

3. **Authentication Issues**
   - Verify JWT secrets are set
   - Check token expiration settings
   - Verify Supabase RLS policies

### Support Resources
- [Supabase Documentation](https://supabase.com/docs)
- [DeepSeek AI Documentation](https://platform.deepseek.com/docs)
- [Google AI Documentation](https://ai.google.dev/docs)
- [Aurora Transcriptor GitHub Issues](https://github.com/Cyberdad247/Auralis-Transcriptor/issues)

---

## ✅ Quick Setup Checklist

- [ ] Created Supabase project and obtained credentials
- [ ] Set up database schema with migrations
- [ ] Obtained DeepSeek AI API key
- [ ] Obtained Google Gemini API key (optional)
- [ ] Generated secure JWT secrets
- [ ] Configured environment variables
- [ ] Tested local development setup
- [ ] Configured production environment variables
- [ ] Verified full integration works
- [ ] Set up monitoring and alerts

**Need help?** Check the troubleshooting section or create an issue on GitHub!
