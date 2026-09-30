# ShareBuddy Moderation Service

AI-powered document content moderation service for ShareBuddy platform.

## Features

- **Text Extraction**: Extracts text from PDF, DOCX, and TXT files
- **AI Analysis**: TensorFlow.js toxicity detection model
- **Rule-Based Filters**: Fast deterministic checks for spam, profanity, etc.
- **Async Processing**: Bull queue with Redis for reliable job processing
- **Webhook Integration**: Sends results back to main backend
- **Scalable**: Can run multiple instances for horizontal scaling

## Architecture

```
Backend → Redis Queue → Moderation Service → AI Analysis → Webhook → Backend
```

## Workflow

1. Backend uploads document and creates `moderation_job` in database
2. Backend pushes job to Redis queue
3. Moderation Service picks up job from queue
4. Service extracts text from document (first 1000 chars)
5. Service applies rule-based filters (spam, profanity checks)
6. Service runs TensorFlow.js toxicity model
7. Service combines scores and determines result
8. Service sends webhook to backend with results
9. Backend updates database via trigger

## Scoring

- **Score > 0.5**: Document approved ✅
- **Score ≤ 0.5**: Document rejected ❌

Final score is weighted average:
- AI Model: 70%
- Rule-Based: 30%

## Environment Variables

See `.env.example` for configuration options.

## Development

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Start in production mode
npm start
```

## Docker

```bash
# Build image
docker build -t sharebuddy-moderation .

# Run container
docker run -p 5002:5002 --env-file .env sharebuddy-moderation
```

## API Endpoints

- `GET /health` - Health check
- `GET /stats` - Queue statistics

## Performance

- Processes 2 documents concurrently
- Text extraction: ~500ms per document
- AI analysis: ~1-2s per document
- Total: ~2-3s per document average

## Future Enhancements

- Image analysis (NSFW detection)
- Virus scanning integration
- Custom ML models for academic content
- Multi-language support
- Caching for repeated content
