# 🚀 Aurora Transcriptor - Quick Setup Guide

## ✅ What's Already Configured

Your Supabase configuration has been **automatically pulled from Vercel** and is ready to use:

- **✅ Supabase Database**: Connected and configured
- **✅ Authentication**: Ready to use
- **✅ Environment Variables**: Organized and ready

## 🔑 What You Need to Add (AI Service Keys)

To enable transcription functionality, you need **at least one AI service key**:

### 1. 🚀 DeepSeek AI (Recommended - Primary Provider)
1. Go to [DeepSeek Platform](https://platform.deepseek.com)
2. Sign up/Login
3. Create an API key
4. Add to your `.env.local`:
   ```bash
   DEEPSEEK_API_KEY=sk-your-deepseek-key-here
   ```
5. Change transcription provider:
   ```bash
   TRANSCRIPTION_PROVIDER=deepseek
   ```

### 2. 🤖 Google Gemini (Optional - Backup Provider)
1. Go to [Google AI Studio](https://aistudio.google.com)
2. Create API key
3. Add to your `.env.local`:
   ```bash
   GEMINI_API_KEY=your-gemini-key-here
   ```

### 3. 🔮 OpenAI (Alternative)
1. Go to [OpenAI Platform](https://platform.openai.com)
2. Create API key
3. Add to your `.env.local`:
   ```bash
   OPENAI_API_KEY=sk-your-openai-key-here
   ```

## 🏃‍♂️ Quick Start (5 Minutes)

### Step 1: Set up your Supabase Database
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Open your project: `vzsrnloezsczpppxxwpt`
3. Go to **SQL Editor**
4. Run the migration files from `supabase/migrations/`:
   ```sql
   -- Copy and paste each migration file content
   -- 1754366905_init_auralis_transcriptor_schema.sql
   -- 1754366916_setup_rls_policies.sql  
   -- 1754367318_create_storage_bucket_policy.sql
   ```

### Step 2: Get at least one AI API key
Choose **ONE** of these options:
- **DeepSeek AI** (Recommended): https://platform.deepseek.com
- **Google Gemini**: https://aistudio.google.com  
- **OpenAI**: https://platform.openai.com

### Step 3: Update your `.env.local`
```bash
# Add your chosen AI service key
DEEPSEEK_API_KEY=sk-your-actual-key-here

# Change from mock to your provider
TRANSCRIPTION_PROVIDER=deepseek  # or gemini, openai
```

### Step 4: Test your setup
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (in another terminal)
cd frontend/auralis-transcriptor-frontend  
npm install
npm run dev
```

## 📋 Current File Status

### ✅ Ready Files:
- `.env.local` - Your main environment file
- `frontend/auralis-transcriptor-frontend/.env.local` - Frontend variables
- `frontend/.../src/lib/supabase.ts` - Updated with your project
- All Supabase credentials are configured

### ⏳ Files You Need to Complete:
1. **Get AI API key** (5 minutes)
2. **Update `.env.local`** with your AI key (30 seconds)
3. **Run Supabase migrations** (2 minutes)

## 🎯 Production Deployment

Once you have your AI keys working locally:

```bash
# Add to Vercel production
vercel env add DEEPSEEK_API_KEY "sk-your-key" production
vercel env add TRANSCRIPTION_PROVIDER "deepseek" production

# Deploy
vercel --prod
```

## 🆘 Troubleshooting

### Issue: "Mock transcription provider"
**Solution**: Add a real AI API key and change `TRANSCRIPTION_PROVIDER`

### Issue: "Database connection error"  
**Solution**: Check if Supabase migrations are run

### Issue: "Authentication not working"
**Solution**: Verify Supabase RLS policies are set up

## 📞 Need Help?

Your configuration is **98% complete**! You just need:
1. One AI API key (5 minutes to get)
2. Database setup (run the SQL migrations)

**Current Status**: ✅ Database ✅ Auth ⏳ AI Services

---

**Next Step**: Get a DeepSeek AI API key at https://platform.deepseek.com and add it to `.env.local`!
