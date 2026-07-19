<div align="center">

# 🎲 Caption Roulette

**A social photo app where you post the image — and everyone else writes the words.**



</div>

---

## What is Caption Roulette?

Caption Roulette flips the usual social media formula: **you can post a photo, but you can't caption it yourself.** Other users submit captions, everyone votes on them publicly, and after a 48-hour window the post "settles" — either because you picked your favourite caption, or because the highest-voted one wins automatically.

Every post has two phases:

| Phase | What happens |
|---|---|
| `OPEN` | Anyone can submit one caption · Everyone votes · Poster can pick a winner early |
| `SETTLED` | Winning caption is locked permanently · Post moves to the public showcase feed |

It's part social game, part creative challenge — and an excuse to build a production-grade image processing pipeline.

---

## Features

- **Time-locked caption contests** — posts auto-resolve at 48 hours via lazy settlement evaluation (no fragile cron job)
- **Reddit-style voting** — upvote, downvote, or remove your vote; net score drives caption rankings
- **Async image processing pipeline** — uploads trigger S3 → SQS → Lambda; images are auto-converted to WebP, thumbnails generated, EXIF data stripped
- **CloudFront CDN delivery** — processed images served from edge locations, not raw S3
- **Tag system + search** — tag your posts, search by tag or username with Redis-cached autocomplete
- **Redis-backed caching and rate limiting** — feed caching, tag autocomplete caching, per-user rate limits on caption/vote endpoints
- **In-app notifications** — get notified when your caption wins
- **Moderation** — report posts/captions; admin panel to review reports, delete content, ban users
- **Infrastructure as Code** — all AWS resources managed via AWS CDK

---

## Architecture

```
┌──────────────────────┐            ┌──────────────────────────┐
│   React (Vite/TS)     │   HTTPS    │   Spring Boot REST API    │
│   Hosted: Netlify      │◄──────────►│   Hosted: Render (Docker) │
└──────────────────────┘            └────┬──────────┬───────────┘
         │                               │          │
         │ image reads (CDN)             │          │
         ▼                               ▼          ▼
┌──────────────────┐        ┌──────────────┐  ┌──────────────────┐
│  CloudFront CDN   │        │ Neon Postgres │  │  Upstash Redis   │
│  Processed images │        │ App data      │  │  Feed cache      │
│  & thumbnails     │        │              │  │  Rate limiting   │
└────────┬─────────┘        └──────────────┘  └──────────────────┘
         ▼
┌─────────────────────────────────────────────────┐
│                  AWS S3 Bucket (private)          │
│  uploads/    → users/{userId}/{uuid}.ext          │
│  processed/  → processed/{userId}/{uuid}.webp     │
│  thumbnails/ → thumbnails/{userId}/{uuid}.webp    │
└──────────────────┬──────────────────────────────┘
                   │ ObjectCreated event
                   ▼
        ┌──────────────────┐     ┌──────────────────────┐
        │  SQS + DLQ        │────►│  Lambda Processor     │
        │                  │     │  WebP · Thumbnail     │
        └──────────────────┘     │  EXIF strip · DB upd. │
                                 └──────────────────────┘
```

**Key design decisions worth noting:**

- **Direct-to-S3 uploads** via pre-signed PUT URLs — the Spring Boot server never handles raw image bytes
- **Lazy settlement** — post resolution is evaluated on-read, not by a scheduled job, making it resilient to Render free-tier cold starts
- **Processing fallback** — while an image is processing (`PENDING`), the API automatically serves the original upload; once `DONE`, it returns the CloudFront CDN URL. The frontend never needs to know the difference
- **Dead Letter Queue** — failed Lambda invocations are captured in a DLQ for inspection via CloudWatch, not silently dropped
- **AWS CDK** — all AWS infrastructure (S3, CloudFront, SQS, DLQ, Lambda, IAM) is defined as code and deployable with a single `cdk deploy`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS, TanStack Query |
| Backend | Spring Boot 3, Java 17, Spring Security + JWT, Spring Data JPA |
| Database | PostgreSQL via Neon (serverless), Flyway migrations |
| Object Storage | AWS S3 (private bucket, pre-signed URLs) |
| CDN | AWS CloudFront with Origin Access Control |
| Image Processing | AWS Lambda + SQS (WebP conversion, thumbnails, EXIF stripping) |
| Infrastructure | AWS CDK (TypeScript) |
| Cache / Rate Limit | Upstash Redis (REST-based, serverless-friendly) |
| Hosting | Render (backend Docker), Netlify (frontend static) |
| CI/CD | GitHub Actions |

---

## Getting Started

### Prerequisites

- Java 17+
- Node.js 18+
- Maven 3.9+
- An AWS account (free tier is enough)
- Accounts on: [Neon](https://neon.tech), [Upstash](https://upstash.com), [Render](https://render.com), [Netlify](https://netlify.com)

### 1. Clone the repo

```bash
git clone https://github.com/your-username/caption-roulette.git
cd caption-roulette
```

### 2. Deploy AWS infrastructure (CDK)

```bash
cd infra
npm install
npx cdk bootstrap   # only needed once per AWS account/region
npx cdk deploy
```

Note the outputs: **S3 bucket name**, **CloudFront distribution domain**, **SQS queue URL**.

### 3. Configure backend environment

Create `backend/src/main/resources/application-local.yml` (never commit this):

```yaml
spring:
  datasource:
    url: jdbc:postgresql://<neon-host>/<dbname>?sslmode=require
    username: <neon-user>
    password: <neon-password>

aws:
  s3:
    bucket-name: <your-s3-bucket>
    region: us-east-1
    access-key: <iam-access-key>
    secret-key: <iam-secret-key>
  cloudfront:
    domain: <xxxx.cloudfront.net>
  sqs:
    queue-url: <your-sqs-queue-url>

jwt:
  secret: <min-32-char-random-string>
  expiry-hours: 24

upstash:
  redis:
    url: <upstash-rest-url>
    token: <upstash-rest-token>

groq:
  api-key: <groq-api-key>   # optional
```

### 4. Run the backend

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

API will be available at `http://localhost:8080`. Health check: `http://localhost:8080/actuator/health`

### 5. Configure and run the frontend

```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8080
```

```bash
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

---

## Environment Variables Reference

### Backend (Render env vars for production)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `AWS_S3_BUCKET_NAME` | S3 bucket name |
| `AWS_REGION` | AWS region (e.g. `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | IAM access key (S3 + SQS permissions) |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key |
| `AWS_CLOUDFRONT_DOMAIN` | CloudFront distribution domain |
| `AWS_SQS_QUEUE_URL` | SQS queue URL for image processing jobs |
| `JWT_SECRET` | Random string, min 32 characters |
| `JWT_EXPIRY_HOURS` | Token expiry in hours (default: `24`) |
| `UPSTASH_REDIS_URL` | Upstash REST URL |
| `UPSTASH_REDIS_TOKEN` | Upstash REST token |
| `GROQ_API_KEY` | Groq API key (optional — disables LLM features if absent) |
| `CORS_ALLOWED_ORIGIN` | Your Netlify frontend URL |

### Frontend (Netlify env vars for production)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Render backend URL (e.g. `https://your-api.onrender.com`) |

---

## Running Tests

### Backend

```bash
cd backend
mvn test
```

Runs unit tests (service logic, settlement, voting, image URL resolution) and MockMvc controller integration tests. Uses H2 in-memory database — no external DB needed for tests.

### Frontend

```bash
cd frontend
npm run test
```

Runs Vitest component tests with React Testing Library. API layer is mocked via MSW (Mock Service Worker).

### CDK (synth validation only)

```bash
cd infra
npx cdk synth
```

Synthesizes CloudFormation templates to validate CDK code without deploying anything.

---

## Project Structure

```
caption-roulette/
├── backend/                  # Spring Boot API
│   ├── src/main/java/
│   │   └── com/captionroulette/
│   │       ├── auth/         # JWT, Spring Security config
│   │       ├── post/         # Post entity, service, controller
│   │       ├── caption/      # Caption entity, service, controller
│   │       ├── vote/         # Vote entity, service, controller
│   │       ├── image/        # Pre-signed URL generation, image resolution
│   │       ├── tag/          # Tag entity, autocomplete
│   │       ├── notification/ # In-app notifications
│   │       ├── report/       # Report + admin endpoints
│   │       ├── cache/        # Redis integration, cache invalidation
│   │       └── common/       # Exception handling, DTOs, utilities
│   └── src/main/resources/
│       └── db/migration/     # Flyway SQL migrations (V1__init.sql etc.)
│
├── frontend/                 # React + TypeScript SPA
│   └── src/
│       ├── components/       # Reusable UI components
│       ├── pages/            # Feed, Post Detail, Search, Admin, Auth
│       ├── hooks/            # Custom React Query hooks
│       ├── api/              # Axios API client
│       └── types/            # TypeScript type definitions
│
└── infra/                    # AWS CDK project (TypeScript)
    └── lib/
        └── caption-roulette-stack.ts  # S3, CloudFront, SQS, DLQ, Lambda, IAM
```

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Returns JWT |
| `POST` | `/api/images/presign` | Get pre-signed S3 upload URL |
| `POST` | `/api/posts` | Create a post |
| `GET` | `/api/posts/open` | Open posts feed (paginated) |
| `GET` | `/api/posts/settled` | Settled posts feed (paginated) |
| `GET` | `/api/posts/{id}` | Post detail |
| `POST` | `/api/posts/{id}/select-winner` | Poster picks winning caption |
| `POST` | `/api/posts/{postId}/captions` | Submit a caption |
| `GET` | `/api/posts/{postId}/captions` | List captions (`?sort=top\|new\|old`) |
| `POST` | `/api/captions/{id}/vote` | Cast or change a vote (`{value: 1, -1, 0}`) |
| `GET` | `/api/tags/search` | Tag autocomplete (`?q=`) |
| `GET` | `/api/posts/search` | Search by tag or username |
| `GET` | `/api/notifications` | Current user's notifications |
| `POST` | `/api/posts/{id}/suggest-captions` | AI caption suggestions (Groq) |

All write endpoints require a `Bearer <token>` Authorization header.

---

## Known Limitations

**Backend cold starts** — The Render free tier spins down the backend after 15 minutes of inactivity. The first request after idle will take 40–60 seconds. This is expected behaviour on the free tier and not a bug. Subsequent requests are fast.

**AWS free tier window** — S3, CloudFront, SQS, and Lambda free tiers are valid for 12 months from AWS account creation. At portfolio-demo traffic levels, charges after the free tier window expire are fractions of a cent, but a $1 AWS Budget alert is recommended as a safety net.

**Image processing delay** — After uploading a photo, the Lambda pipeline typically takes 5–15 seconds to complete. During this window, the original (unoptimised) image is served as a fallback. The page does not automatically refresh when processing completes — reload to see the final WebP version.

**No email notifications** — Caption-win notifications are in-app only. Check your notification bell after your post settles.

**Single region** — All AWS resources are deployed to `us-east-1`. CloudFront provides global CDN caching for image delivery regardless.

---

## Deployment

| Component | Platform | How |
|---|---|---|
| Frontend | Netlify | Auto-deploys from GitHub `main` branch |
| Backend | Render | Auto-deploys from GitHub `main` branch (Docker) |
| AWS infra | AWS CDK | Manual `cdk deploy` from local machine on infrastructure changes |
| Database | Neon | Managed — no deployment steps |
| Cache | Upstash | Managed — no deployment steps |

---

## Contributing

This is a portfolio project but issues and PRs are welcome. If you find a bug or have a suggestion, open an issue and describe it clearly.

---

## License

MIT — see [LICENSE](./LICENSE) for details.

---

<div align="center">
  Built with ☕ Java and too many AWS free-tier services.
</div>