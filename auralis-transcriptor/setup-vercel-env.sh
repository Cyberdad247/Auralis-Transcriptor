#!/bin/bash

# ==============================================
# AURALIS TRANSCRIPTOR - VERCEL ENV SETUP
# ==============================================

echo "🚀 Setting up Vercel Environment Variables for Aurora Transcriptor"
echo "=================================================="

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it first:"
    echo "   npm install -g vercel"
    exit 1
fi

# Check if we're in a Vercel project
if [ ! -f ".vercel/project.json" ]; then
    echo "❌ Not in a Vercel project directory. Please run 'vercel link' first."
    exit 1
fi

echo "📝 Please provide your environment variables:"
echo ""

# Supabase Configuration
echo "🗄️  SUPABASE CONFIGURATION"
read -p "Supabase URL (https://your-project.supabase.co): " SUPABASE_URL
read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
read -s -p "Supabase Service Key: " SUPABASE_SERVICE_KEY
echo ""
read -s -p "Database Password: " DB_PASSWORD
echo ""

# AI Service Keys
echo ""
echo "🤖 AI SERVICE KEYS"
read -s -p "DeepSeek API Key (sk-...): " DEEPSEEK_API_KEY
echo ""
read -s -p "Gemini API Key (optional): " GEMINI_API_KEY
echo ""
read -s -p "OpenAI API Key (optional, sk-...): " OPENAI_API_KEY
echo ""

# Security Keys
echo ""
echo "🔐 SECURITY CONFIGURATION"
echo "Generating secure JWT secrets..."
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
echo "✅ Generated secure random keys"

# AWS (Optional)
echo ""
echo "☁️  AWS CONFIGURATION (Optional - press Enter to skip)"
read -p "AWS Access Key ID: " AWS_ACCESS_KEY_ID
if [ ! -z "$AWS_ACCESS_KEY_ID" ]; then
    read -s -p "AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
    echo ""
    read -p "AWS Region (us-east-1): " AWS_REGION
    AWS_REGION=${AWS_REGION:-us-east-1}
fi

echo ""
echo "🔧 Setting Vercel environment variables..."

# Set required variables
vercel env add NODE_ENV production production
vercel env add SUPABASE_URL "$SUPABASE_URL" production
vercel env add SUPABASE_ANON_KEY "$SUPABASE_ANON_KEY" production
vercel env add SUPABASE_SERVICE_KEY "$SUPABASE_SERVICE_KEY" production
vercel env add DATABASE_URL "postgresql://postgres:$DB_PASSWORD@db.${SUPABASE_URL#https://}.supabase.co:5432/postgres" production
vercel env add DB_PASSWORD "$DB_PASSWORD" production
vercel env add JWT_SECRET "$JWT_SECRET" production
vercel env add JWT_REFRESH_SECRET "$JWT_REFRESH_SECRET" production
vercel env add SESSION_SECRET "$SESSION_SECRET" production
vercel env add DEEPSEEK_API_KEY "$DEEPSEEK_API_KEY" production

# Set optional variables
if [ ! -z "$GEMINI_API_KEY" ]; then
    vercel env add GEMINI_API_KEY "$GEMINI_API_KEY" production
fi

if [ ! -z "$OPENAI_API_KEY" ]; then
    vercel env add OPENAI_API_KEY "$OPENAI_API_KEY" production
fi

if [ ! -z "$AWS_ACCESS_KEY_ID" ]; then
    vercel env add AWS_ACCESS_KEY_ID "$AWS_ACCESS_KEY_ID" production
    vercel env add AWS_SECRET_ACCESS_KEY "$AWS_SECRET_ACCESS_KEY" production
    vercel env add AWS_REGION "$AWS_REGION" production
fi

# Set default configuration
vercel env add TRANSCRIPTION_PROVIDER "deepseek" production
vercel env add TRANSCRIPTION_LANGUAGE "en-US" production
vercel env add ENABLE_NLP_ANALYSIS "true" production
vercel env add ENABLE_SENTIMENT_ANALYSIS "true" production
vercel env add LOG_LEVEL "warn" production
vercel env add MAX_FILE_SIZE "524288000" production

# Frontend environment variables
vercel env add VITE_SUPABASE_URL "$SUPABASE_URL" production
vercel env add VITE_SUPABASE_ANON_KEY "$SUPABASE_ANON_KEY" production
vercel env add VITE_API_URL "https://your-app.vercel.app/api" production

echo ""
echo "✅ Environment variables configured successfully!"
echo ""
echo "🔄 Next steps:"
echo "1. Update VITE_API_URL with your actual Vercel app URL"
echo "2. Run 'vercel --prod' to deploy with new environment variables"
echo "3. Test your deployment"
echo ""
echo "📝 Save these generated secrets securely:"
echo "JWT_SECRET: $JWT_SECRET"
echo "JWT_REFRESH_SECRET: $JWT_REFRESH_SECRET" 
echo "SESSION_SECRET: $SESSION_SECRET"
echo ""
echo "🎉 Setup complete!"
