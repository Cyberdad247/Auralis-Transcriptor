# Auralis Transcriptor Backend

A Node.js/Express backend for the Star Trek LCARS-themed transcription application.

## Features

- 🚀 RESTful API with Express.js
- 🔐 JWT-based authentication
- 🗄️ PostgreSQL database with connection pooling
- 📁 File upload handling with validation
- 🎵 Audio extraction from video files using FFmpeg
- 🎤 Transcription service (mock & AWS Transcribe ready)
- 📊 Health checks and monitoring
- 🐳 Docker support for containerized deployment
- 🔒 Security middleware (Helmet, CORS, Rate Limiting)

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- FFmpeg
- Docker (optional)

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up database:**
   ```bash
   # Create database
   createdb auralis_transcriptor
   
   # Run migrations
   npm run migrate
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:5000`.

### Docker Development

1. **Start all services:**
   ```bash
   docker-compose up --build
   ```

2. **Run database migrations:**
   ```bash
   docker-compose exec backend npm run migrate
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh tokens
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Transcriptions
- `POST /api/transcriptions/upload` - Upload file for transcription
- `GET /api/transcriptions` - List user's transcriptions
- `GET /api/transcriptions/:id` - Get specific transcription
- `GET /api/transcriptions/:id/download/txt` - Download as text
- `GET /api/transcriptions/:id/download/md` - Download as markdown
- `DELETE /api/transcriptions/:id` - Delete transcription
- `GET /api/transcriptions/stats/summary` - Get user statistics

### Health
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed system status
- `GET /api/health/ready` - Readiness probe
- `GET /api/health/live` - Liveness probe

## Configuration

### Environment Variables

```bash
# Server
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db
# OR individual params:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=auralis_transcriptor
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d

# File Upload
MAX_FILE_SIZE=524288000  # 500MB
UPLOAD_DIR=./uploads
TEMP_DIR=./temp

# AWS (Optional)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=your-bucket
AWS_SQS_QUEUE_URL=your-queue-url
AWS_TRANSCRIBE_OUTPUT_BUCKET=your-transcribe-bucket

# Transcription
TRANSCRIPTION_PROVIDER=mock  # or 'aws-transcribe'
TRANSCRIPTION_LANGUAGE=en-US

# Logging
LOG_LEVEL=info
```

## Transcription Workflow

1. **File Upload**: User uploads audio/video file
2. **Validation**: File type and size validation
3. **Storage**: File stored locally (or S3 if configured)
4. **Audio Extraction**: FFmpeg extracts/converts audio
5. **Transcription**: Mock or AWS Transcribe processes audio
6. **Storage**: Transcript saved to database
7. **Cleanup**: Temporary files removed

## Database Schema

### Users Table
- `id` (UUID, Primary Key)
- `email` (Unique)
- `password_hash`
- `first_name`, `last_name`
- `is_active`, `email_verified`
- `last_login`, `created_at`, `updated_at`

### Transcriptions Table
- `id` (UUID, Primary Key)
- `user_id` (Foreign Key)
- `original_filename`, `file_type`, `file_size`
- `original_file_url`, `processed_audio_url`
- `transcript_text`
- `status` (ENUM: UPLOADED, PROCESSING_AUDIO, TRANSCRIBING, COMPLETED, FAILED)
- `duration_seconds`
- `processing_started_at`, `processing_completed_at`
- `error_message`, `metadata`
- `created_at`, `updated_at`

## Production Deployment

### Render Deployment

1. **Connect repository to Render**
2. **Set environment variables**
3. **Configure build command**: `npm ci`
4. **Configure start command**: `npm start`
5. **Set up PostgreSQL database**

### Environment Setup for Production

```bash
# Required for production
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=strong-random-secret
JWT_REFRESH_SECRET=another-strong-secret
FRONTEND_URL=https://your-frontend-domain.com

# Optional AWS configuration
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
```

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Request rate limiting
- CORS protection
- Helmet security headers
- Input validation with Joi
- SQL injection prevention
- File type validation

## Monitoring & Health Checks

The application includes comprehensive health checks:

- Database connectivity
- Memory usage monitoring
- FFmpeg availability check
- Disk space monitoring
- Processing queue status

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.js
```

## Troubleshooting

### Common Issues

1. **FFmpeg not found**
   ```bash
   # Install FFmpeg
   brew install ffmpeg  # macOS
   apt-get install ffmpeg  # Ubuntu
   ```

2. **Database connection errors**
   - Check PostgreSQL is running
   - Verify connection string
   - Check firewall settings

3. **File upload failures**
   - Check disk space
   - Verify upload directory permissions
   - Check file size limits

### Logs

Logs are stored in `./logs/` directory:
- `combined.log` - All logs
- `error.log` - Error logs only

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
