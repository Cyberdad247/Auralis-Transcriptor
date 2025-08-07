# ==============================================
# AURALIS TRANSCRIPTOR - VERCEL ENV SETUP (PowerShell)
# ==============================================

Write-Host "🚀 Setting up Vercel Environment Variables for Aurora Transcriptor" -ForegroundColor Cyan
Write-Host "=================================================="

# Check if vercel CLI is installed
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Vercel CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g vercel" -ForegroundColor Yellow
    exit 1
}

# Check if we're in a Vercel project
if (-not (Test-Path ".vercel/project.json")) {
    Write-Host "❌ Not in a Vercel project directory. Please run 'vercel link' first." -ForegroundColor Red
    exit 1
}

Write-Host "📝 Please provide your environment variables:"
Write-Host ""

# Supabase Configuration
Write-Host "🗄️  SUPABASE CONFIGURATION" -ForegroundColor Green
$SUPABASE_URL = Read-Host "Supabase URL (https://your-project.supabase.co)"
$SUPABASE_ANON_KEY = Read-Host "Supabase Anon Key"
$SUPABASE_SERVICE_KEY = Read-Host "Supabase Service Key" -AsSecureString
$SUPABASE_SERVICE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SUPABASE_SERVICE_KEY))
$DB_PASSWORD = Read-Host "Database Password" -AsSecureString
$DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD))

# AI Service Keys
Write-Host ""
Write-Host "🤖 AI SERVICE KEYS" -ForegroundColor Green
$DEEPSEEK_API_KEY = Read-Host "DeepSeek API Key (sk-...)" -AsSecureString
$DEEPSEEK_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DEEPSEEK_API_KEY))

$GEMINI_API_KEY = Read-Host "Gemini API Key (optional, press Enter to skip)"
if ([string]::IsNullOrEmpty($GEMINI_API_KEY)) {
    $GEMINI_API_KEY = $null
}

$OPENAI_API_KEY = Read-Host "OpenAI API Key (optional, sk-..., press Enter to skip)"
if ([string]::IsNullOrEmpty($OPENAI_API_KEY)) {
    $OPENAI_API_KEY = $null
}

# Security Keys
Write-Host ""
Write-Host "🔐 SECURITY CONFIGURATION" -ForegroundColor Green
Write-Host "Generating secure JWT secrets..." -ForegroundColor Yellow

# Generate random keys (PowerShell equivalent)
Add-Type -AssemblyName System.Security
$JWT_SECRET = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$JWT_REFRESH_SECRET = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$SESSION_SECRET = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

Write-Host "✅ Generated secure random keys" -ForegroundColor Green

# AWS (Optional)
Write-Host ""
Write-Host "☁️  AWS CONFIGURATION (Optional - press Enter to skip)" -ForegroundColor Green
$AWS_ACCESS_KEY_ID = Read-Host "AWS Access Key ID"
if (-not [string]::IsNullOrEmpty($AWS_ACCESS_KEY_ID)) {
    $AWS_SECRET_ACCESS_KEY = Read-Host "AWS Secret Access Key" -AsSecureString
    $AWS_SECRET_ACCESS_KEY = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($AWS_SECRET_ACCESS_KEY))
    $AWS_REGION = Read-Host "AWS Region (default: us-east-1)"
    if ([string]::IsNullOrEmpty($AWS_REGION)) {
        $AWS_REGION = "us-east-1"
    }
}

Write-Host ""
Write-Host "🔧 Setting Vercel environment variables..." -ForegroundColor Yellow

# Set required variables
& vercel env add NODE_ENV production production
& vercel env add SUPABASE_URL "$SUPABASE_URL" production
& vercel env add SUPABASE_ANON_KEY "$SUPABASE_ANON_KEY" production
& vercel env add SUPABASE_SERVICE_KEY "$SUPABASE_SERVICE_KEY" production

# Build DATABASE_URL
$DB_HOST = $SUPABASE_URL -replace "https://", "db." -replace "\.supabase\.co", ".supabase.co"
$DATABASE_URL = "postgresql://postgres:$DB_PASSWORD@$DB_HOST:5432/postgres"
& vercel env add DATABASE_URL "$DATABASE_URL" production
& vercel env add DB_PASSWORD "$DB_PASSWORD" production

& vercel env add JWT_SECRET "$JWT_SECRET" production
& vercel env add JWT_REFRESH_SECRET "$JWT_REFRESH_SECRET" production
& vercel env add SESSION_SECRET "$SESSION_SECRET" production
& vercel env add DEEPSEEK_API_KEY "$DEEPSEEK_API_KEY" production

# Set optional variables
if ($GEMINI_API_KEY) {
    & vercel env add GEMINI_API_KEY "$GEMINI_API_KEY" production
}

if ($OPENAI_API_KEY) {
    & vercel env add OPENAI_API_KEY "$OPENAI_API_KEY" production
}

if ($AWS_ACCESS_KEY_ID) {
    & vercel env add AWS_ACCESS_KEY_ID "$AWS_ACCESS_KEY_ID" production
    & vercel env add AWS_SECRET_ACCESS_KEY "$AWS_SECRET_ACCESS_KEY" production
    & vercel env add AWS_REGION "$AWS_REGION" production
}

# Set default configuration
& vercel env add TRANSCRIPTION_PROVIDER "deepseek" production
& vercel env add TRANSCRIPTION_LANGUAGE "en-US" production
& vercel env add ENABLE_NLP_ANALYSIS "true" production
& vercel env add ENABLE_SENTIMENT_ANALYSIS "true" production
& vercel env add LOG_LEVEL "warn" production
& vercel env add MAX_FILE_SIZE "524288000" production

# Frontend environment variables
& vercel env add VITE_SUPABASE_URL "$SUPABASE_URL" production
& vercel env add VITE_SUPABASE_ANON_KEY "$SUPABASE_ANON_KEY" production
& vercel env add VITE_API_URL "https://your-app.vercel.app/api" production

Write-Host ""
Write-Host "✅ Environment variables configured successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🔄 Next steps:" -ForegroundColor Cyan
Write-Host "1. Update VITE_API_URL with your actual Vercel app URL"
Write-Host "2. Run 'vercel --prod' to deploy with new environment variables"
Write-Host "3. Test your deployment"
Write-Host ""
Write-Host "📝 Save these generated secrets securely:" -ForegroundColor Yellow
Write-Host "JWT_SECRET: $JWT_SECRET"
Write-Host "JWT_REFRESH_SECRET: $JWT_REFRESH_SECRET" 
Write-Host "SESSION_SECRET: $SESSION_SECRET"
Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
