# Code in the Dark - Express Backend

Express + TypeScript backend for the Code in the Dark IDE platform.

## Features

- ✅ User authentication (JWT)
- ✅ Team management
- ✅ Session tracking with Redis
- ✅ File management with Prisma
- ✅ Docker container management
- ✅ S3 file uploads
- ✅ Submission handling

## Tech Stack

- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **Redis** (Upstash) - Session & caching
- **AWS S3** - File storage
- **Docker** - Container management
- **JWT** - Authentication

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### 3. Database Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

### 4. Run Development Server

```bash
npm run dev
```

Server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user

### Teams
- `POST /api/team/create` - Create team
- `GET /api/team/:teamId` - Get team details
- `POST /api/team/invite` - Invite user to team

### Sessions
- `POST /api/session/start` - Start coding session
- `POST /api/session/end` - End session
- `GET /api/session/:sessionId/status` - Get session status

### Files
- `GET /api/files/:teamId/list` - List all files
- `GET /api/files/:teamId/*` - Get file content
- `POST /api/files/:teamId/*` - Save/update file
- `DELETE /api/files/:teamId/*` - Delete file

### Submissions
- `POST /api/submission/upload` - Upload submission
- `GET /api/submission` - Get all submissions

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations

## Project Structure

```
backend/
├── src/
│   ├── controllers/      # Request handlers
│   ├── routes/           # Route definitions
│   ├── middleware/       # Express middleware
│   ├── lib/              # Utilities (Prisma, JWT, Redis, S3, Docker)
│   └── index.ts          # Main server file
├── prisma/
│   └── schema.prisma     # Database schema
└── package.json
```
