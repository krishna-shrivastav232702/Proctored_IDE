# 🚀 Frontend Developer API Guide

Complete API reference for building the IDE frontend. Backend runs on `http://localhost:5000` (or your deployment URL).

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Team Management](#team-management)
3. [Session & Container](#session--container)
4. [Build System](#build-system)
5. [AI Assistance](#ai-assistance)
6. [Submissions](#submissions)
7. [Admin Dashboard](#admin-dashboard)
8. [WebSocket Events](#websocket-events)
9. [Error Handling](#error-handling)
10. [Rate Limits](#rate-limits)

---

## 🔐 Authentication

### POST `/api/auth/signup`
Create new user account.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepass123"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "STUDENT"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Rate Limit:** 20 requests per 15 minutes per email

---

### POST `/api/auth/login`
Login existing user.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securepass123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "teamId": "team-uuid",
    "role": "STUDENT"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error (401):**
```json
{
  "error": "Invalid credentials"
}
```

---

## 👥 Team Management

### POST `/api/team/create`
Create a new team (requires auth).

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "name": "Team Awesome",
  "framework": "NEXTJS"
}
```

**Frameworks:** `NEXTJS`, `REACT_VITE`, `VUE`, `ANGULAR`, `SVELTE`, `STATIC_HTML`

**Response (201):**
```json
{
  "team": {
    "id": "team-uuid",
    "name": "Team Awesome",
    "framework": "NEXTJS",
    "ownerId": "user-uuid",
    "members": [
      {
        "id": "user-uuid",
        "name": "John Doe",
        "email": "john@example.com"
      }
    ],
    "createdAt": "2025-10-23T10:00:00Z"
  }
}
```

**Error (400):**
```json
{
  "error": "Already in a team"
}
```

---

### POST `/api/team/invite`
Invite user to team (only team owner).

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "email": "teammate@example.com"
}
```

**Response (200):**
```json
{
  "message": "User invited successfully",
  "invitedUser": {
    "id": "user-uuid",
    "name": "Jane Smith",
    "email": "teammate@example.com"
  }
}
```

**Errors:**
- `403`: Only team owner can invite
- `400`: Team is full (max 4 members)
- `404`: User not found

---

### GET `/api/team/:teamId`
Get team details.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "team": {
    "id": "team-uuid",
    "name": "Team Awesome",
    "framework": "NEXTJS",
    "ownerId": "owner-uuid",
    "members": [
      {
        "id": "user-uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "createdAt": "2025-10-23T10:00:00Z"
      }
    ],
    "sessions": [
      {
        "id": "session-uuid",
        "active": true,
        "startedAt": "2025-10-23T10:30:00Z"
      }
    ],
    "containerInfo": {
      "containerId": "docker-id",
      "status": "running",
      "createdAt": "2025-10-23T10:30:00Z"
    }
  }
}
```

---

## 🐳 Session & Container

### POST `/api/session/start`
Start coding session (creates container if needed).

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "framework": "NEXTJS"
}
```

**Response (201):**
```json
{
  "session": {
    "id": "session-uuid",
    "teamId": "team-uuid",
    "active": true,
    "startedAt": "2025-10-23T10:30:00Z"
  },
  "containerId": "docker-container-id",
  "message": "Session started successfully"
}
```

**Note:** Container creation takes 15-30 seconds. Poll `/api/session/:sessionId/status` to check readiness.

---

### GET `/api/session/:sessionId/status`
Check session and container status.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "session": {
    "id": "session-uuid",
    "active": true,
    "startedAt": "2025-10-23T10:30:00Z"
  },
  "container": {
    "id": "docker-id",
    "status": "running",
    "stats": {
      "cpu": 15.5,
      "memory": {
        "usage": 268435456,
        "limit": 536870912,
        "percent": 50
      }
    }
  }
}
```

---

### POST `/api/session/end`
End coding session (doesn't stop container).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Session ended successfully"
}
```

---

## 🔨 Build System

### POST `/api/build/start`
Start build for your team.

**Headers:**
```
Authorization: Bearer <token>
```

**Request (optional):**
```json
{
  "buildCommand": "npm run build"
}
```

**Response (200):**
```json
{
  "jobId": "123",
  "position": 5,
  "framework": "NEXTJS",
  "buildCommand": "npm run build",
  "message": "Build queued successfully. Position in queue: 5"
}
```

**Rate Limit:** 5 builds per 5 minutes per team

---

### GET `/api/build/status/:jobId`
Check build status.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "status": {
    "id": "123",
    "state": "active",
    "progress": 0,
    "timestamp": 1729680000000,
    "data": {
      "teamId": "team-uuid",
      "containerId": "docker-id",
      "buildCommand": "npm run build"
    }
  }
}
```

**States:** `waiting`, `active`, `completed`, `failed`

---

### GET `/api/build/queue/position`
Get your team's current build position.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "hasActiveBuild": true,
  "jobId": "123",
  "position": 3,
  "state": "waiting",
  "isActive": false
}
```

---

### DELETE `/api/build/:jobId`
Cancel queued build (can't cancel active builds).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Build cancelled successfully"
}
```

**Error (400):**
```json
{
  "error": "Cannot cancel active build. Build is currently running."
}
```

---

## 🤖 AI Assistance

### GET `/api/ai/check`
Check AI usage quota.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "canUse": true,
  "usageCount": 1,
  "maxHints": 3,
  "remaining": 2
}
```

---

### POST `/api/ai/ask`
Ask AI for help (uses 1 hint).

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "prompt": "How do I fix this error?",
  "context": {
    "fileName": "App.tsx",
    "code": "import React from 'react'...",
    "errorMessage": "Module not found: 'react-router-dom'"
  }
}
```

**Response (200):**
```json
{
  "response": "To fix this error, you need to install react-router-dom:\n\n```bash\nnpm install react-router-dom\n```\n\nThen restart your dev server.",
  "usageCount": 2,
  "remaining": 1,
  "maxHints": 3,
  "tokensUsed": 150
}
```

**Error (429):**
```json
{
  "error": "AI usage limit reached. You have used 3/3 hints.",
  "usageCount": 3,
  "maxHints": 3,
  "remaining": 0
}
```

**Rate Limit:** 10 requests per minute per user

---

### GET `/api/ai/history`
Get AI usage history.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Params:**
- `limit` (optional): Number of records (default: 10, max: 50)

**Response (200):**
```json
{
  "usage": [
    {
      "id": "uuid",
      "prompt": "How do I fix this error?",
      "response": "To fix this error...",
      "usedAt": "2025-10-23T11:00:00Z"
    }
  ]
}
```

---

## 📤 Submissions

### POST `/api/submission/upload`
Upload submission file (manual upload - deprecated, use WebSocket instead).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
```
file: <zip file>
```

**Response (201):**
```json
{
  "submission": {
    "id": "uuid",
    "fileName": "submission.zip",
    "cdnUrl": "https://cdn.example.com/...",
    "status": "UPLOADED",
    "submittedAt": "2025-10-23T12:00:00Z"
  }
}
```

---

### GET `/api/submission`
Get team's submissions.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "submissions": [
    {
      "id": "uuid",
      "fileName": "final-submission.tar.gz",
      "cdnUrl": "https://cdn.example.com/...",
      "status": "DEPLOYED",
      "submittedAt": "2025-10-23T12:00:00Z"
    }
  ]
}
```

---

## 👨‍💼 Admin Dashboard

All admin routes require `role: "ADMIN"` in JWT.

### GET `/api/admin/teams`
Get all teams with stats.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response (200):**
```json
{
  "teams": [
    {
      "id": "team-uuid",
      "name": "Team Awesome",
      "framework": "NEXTJS",
      "owner": { "id": "...", "name": "...", "email": "..." },
      "members": [...],
      "containerInfo": { "containerId": "...", "status": "running" },
      "sessions": [...],
      "submissions": [...],
      "_count": { "submissions": 1, "sessions": 5, "files": 23 },
      "containerStats": {
        "cpu": 45.2,
        "memory": { "usage": 400000000, "limit": 536870912, "percent": 74.5 }
      }
    }
  ]
}
```

---

### GET `/api/admin/teams/:teamId`
Get detailed team info.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response (200):**
```json
{
  "team": {
    "id": "team-uuid",
    "name": "Team Awesome",
    "owner": {...},
    "members": [...],
    "containerInfo": {...},
    "sessions": [...],
    "submissions": [...],
    "files": [...],
    "violations": {
      "TAB_SWITCH": 5,
      "CLIPBOARD_PASTE": 3,
      "DEVTOOLS_OPEN": 1
    },
    "containerStats": {...}
  }
}
```

---

### GET `/api/admin/proctoring/events`
Get recent proctoring events across all teams.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Query Params:**
- `limit` (optional): Number of events (default: 50)

**Response (200):**
```json
{
  "events": [
    {
      "id": "uuid",
      "eventType": "TAB_SWITCH",
      "timestamp": "2025-10-23T11:30:00Z",
      "details": "{\"url\":\"https://chatgpt.com\"}",
      "user": {
        "id": "user-uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "teamId": "team-uuid"
      }
    }
  ]
}
```

---

### GET `/api/admin/proctoring/violations/:teamId`
Get violation counts for team.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response (200):**
```json
{
  "violations": {
    "TAB_SWITCH": 5,
    "DEVTOOLS_OPEN": 1,
    "CLIPBOARD_COPY": 2,
    "CLIPBOARD_PASTE": 3,
    "FULLSCREEN_EXIT": 0,
    "FOCUS_LOSS": 8
  }
}
```

---

### POST `/api/admin/teams/:teamId/disqualify`
Disqualify a team.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Request:**
```json
{
  "reason": "Multiple AI API violations detected"
}
```

**Response (200):**
```json
{
  "message": "Team disqualified successfully"
}
```

**Actions taken:**
- Stops container
- Ends all active sessions
- Logs disqualification event

---

### POST `/api/admin/containers/:teamId/restart`
Restart team's container.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response (200):**
```json
{
  "message": "Container restarted successfully",
  "containerId": "new-docker-id"
}
```

---

### GET `/api/admin/stats`
Get system-wide statistics.

**Headers:**
```
Authorization: Bearer <admin-token>
```

**Response (200):**
```json
{
  "stats": {
    "totalTeams": 60,
    "totalUsers": 180,
    "activeSessions": 45,
    "totalSubmissions": 38,
    "recentSubmissions": 12,
    "activeContainers": 45,
    "recentProctorEvents": 234
  }
}
```

---

## 🔌 WebSocket Events

### Connection

Connect to WebSocket server at `ws://localhost:5000` (or `wss://` for production).

**Authentication:**
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Or via header
const socket = io('http://localhost:5000', {
  extraHeaders: {
    Authorization: 'Bearer your-jwt-token'
  }
});
```

**Connection Events:**
```javascript
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

---

### 📝 Editor Sync (Yjs CRDT)

**Send changes:**
```javascript
socket.emit('editor:sync', {
  update: Array.from(yUpdate) // Uint8Array converted to Array
});
```

**Receive changes:**
```javascript
socket.on('yjs:sync', (data) => {
  const { update, userId, timestamp } = data;
  const yUpdate = new Uint8Array(update);
  // Apply update to your Yjs document
  Y.applyUpdate(doc, yUpdate);
});
```

**Request initial state:**
```javascript
socket.emit('editor:request-state');

socket.on('editor:state-ready', () => {
  console.log('Editor state synchronized');
});
```

**Error handling:**
```javascript
socket.on('editor:error', (data) => {
  console.error('Editor error:', data.message);
});
```

---

### 🖥️ Terminal

**Create terminal:**
```javascript
socket.emit('terminal:create', {
  sessionId: 'my-terminal-1',
  shared: false // true for team-shared terminal
});

socket.on('terminal:ready', (data) => {
  console.log('Terminal ready:', data.sessionId);
  if (data.shared) {
    console.log('Shared terminal created');
  }
});
```

**Send input:**
```javascript
socket.emit('terminal:input', {
  sessionId: 'my-terminal-1',
  input: 'npm install express\n'
});
```

**Receive output:**
```javascript
socket.on('terminal:output', (data) => {
  const { sessionId, output, timestamp } = data;
  if (sessionId === mySessionId) {
    xterm.write(output); // Write to xterm.js
  }
});
```

**Resize terminal:**
```javascript
socket.emit('terminal:resize', {
  sessionId: 'my-terminal-1',
  rows: 24,
  cols: 80
});
```

**Close terminal:**
```javascript
socket.emit('terminal:close', {
  sessionId: 'my-terminal-1'
});

socket.on('terminal:closed', (data) => {
  console.log('Terminal closed:', data.sessionId);
});
```

**Terminal errors:**
```javascript
socket.on('terminal:error', (data) => {
  console.error('Terminal error:', data.message);
});
```

**Shared terminal notification:**
```javascript
socket.on('terminal:shared-created', (data) => {
  console.log(`${data.createdBy} created a shared terminal: ${data.sessionId}`);
});
```

---

### 📁 File Operations

**Save file:**
```javascript
socket.emit('file:save', {
  path: 'src/App.tsx',
  content: 'import React from "react"...'
});

socket.on('file:saved', (data) => {
  console.log('File saved:', data.path);
});
```

**Create file:**
```javascript
socket.emit('file:create', {
  path: 'src/components/Button.tsx',
  content: 'export const Button = () => {...}'
});

socket.on('file:created', (data) => {
  console.log('File created:', data.path);
});
```

**Delete file:**
```javascript
socket.emit('file:delete', {
  path: 'src/old-component.tsx'
});

socket.on('file:deleted', (data) => {
  console.log('File deleted:', data.path);
});
```

**File changes (from other team members):**
```javascript
socket.on('file:changed', (data) => {
  const { path, action, userId } = data;
  // action: 'add', 'modify', 'delete'
  console.log(`${userId} ${action}ed ${path}`);
  // Update file tree UI
});
```

**File errors:**
```javascript
socket.on('file:error', (data) => {
  console.error('File operation failed:', data.message);
});
```

---

### 📂 File System Changes (Auto-detected)

**File watcher events:**
```javascript
socket.on('files:changed', (data) => {
  const { changes, timestamp, totalChanges } = data;
  
  // changes.added: ['node_modules/', 'package-lock.json']
  // changes.modified: ['src/App.tsx']
  // changes.deleted: ['old-file.js']
  
  console.log(`${totalChanges} files changed`);
  // Update file tree
});
```

**Special events:**
```javascript
socket.on('build:dependencies-installed', (data) => {
  console.log('Dependencies installed (node_modules detected)');
});

socket.on('build:complete', (data) => {
  console.log('Build folder detected (build/, dist/, or .next/)');
});

socket.on('package:updated', (data) => {
  console.log('package.json was modified');
});
```

---

### 🔨 Build System

**Start build:**
```javascript
socket.emit('build:start', {
  buildCommand: 'npm run build' // optional
});

socket.on('build:queued', (data) => {
  const { jobId, position } = data;
  console.log(`Build queued. Position: ${position}`);
});
```

**Build events:**
```javascript
socket.on('build:started', (data) => {
  const { jobId, timestamp } = data;
  console.log('Build started');
});

socket.on('build:log', (data) => {
  const { jobId, output, timestamp } = data;
  console.log('Build log:', output);
  // Display in terminal or build log viewer
});

socket.on('build:success', (data) => {
  const { jobId, timestamp, duration, framework } = data;
  console.log(`Build completed in ${duration}ms`);
});

socket.on('build:failed', (data) => {
  const { jobId, error, timestamp } = data;
  console.error('Build failed:', error);
});

socket.on('build:stalled', (data) => {
  console.warn('Build appears to be stuck. Please try again.');
});

socket.on('build:error', (data) => {
  console.error('Build error:', data.message);
});
```

---

### 📤 Submission

**Create submission:**
```javascript
socket.emit('submission:create');

socket.on('submission:success', (data) => {
  const { submissionId, cdnUrl, deploymentUrl } = data;
  console.log('Submitted successfully!');
  console.log('Live URL:', deploymentUrl);
  console.log('Download URL:', cdnUrl);
});

socket.on('submission:error', (data) => {
  console.error('Submission failed:', data.message);
});

socket.on('submission:deployment-failed', (data) => {
  console.warn('Build uploaded but deployment failed');
  console.log('CDN URL:', data.cdnUrl);
});
```

---

### 👁️ Proctoring

**Log proctoring events:**
```javascript
// Tab switch
socket.emit('procter:event', {
  eventType: 'TAB_SWITCH',
  details: { url: window.location.href }
});

// DevTools opened
socket.emit('procter:event', {
  eventType: 'DEVTOOLS_OPEN',
  details: { timestamp: Date.now() }
});

// Copy/Paste
socket.emit('procter:event', {
  eventType: 'CLIPBOARD_COPY',
  details: { length: clipboardData.length }
});

socket.emit('procter:event', {
  eventType: 'CLIPBOARD_PASTE',
  details: { length: pastedText.length }
});

// Focus loss
socket.emit('procter:event', {
  eventType: 'FOCUS_LOSS',
  details: { duration: 5000 } // ms
});
```

**Event types:**
- `TAB_SWITCH` - User switched browser tab
- `DEVTOOLS_OPEN` - DevTools detected
- `CLIPBOARD_COPY` - Copy event
- `CLIPBOARD_PASTE` - Paste event
- `FULLSCREEN_EXIT` - Exited fullscreen
- `FOCUS_LOSS` - Window lost focus
- `SUSPICIOUS_ACTIVITY` - Manual flag

---

### 🎯 Cursor Positions

**Send cursor position:**
```javascript
socket.emit('cursor:move', {
  file: 'src/App.tsx',
  line: 42,
  column: 15
});
```

**Receive teammate cursors:**
```javascript
socket.on('current:position', (data) => {
  const { file, line, column, userId, email } = data;
  // Display cursor in editor
  console.log(`${email} is at ${file}:${line}:${column}`);
});
```

---

### 📊 Container Stats

**Receive real-time stats:**
```javascript
socket.on('container:stats', (data) => {
  const { stats, timestamp } = data;
  
  console.log('CPU:', stats.cpu.toFixed(1) + '%');
  console.log('Memory:', stats.memory.percent.toFixed(1) + '%');
  console.log('Network RX:', stats.network.rx, 'bytes');
  console.log('Network TX:', stats.network.tx, 'bytes');
});
```

**Container events:**
```javascript
socket.on('container:throttled', (data) => {
  const { reason, type } = data;
  console.warn('Container throttled:', reason);
  // Show warning to user
});
```

---

### 🚨 Admin Events

**Anomaly detection:**
```javascript
socket.on('container:anomaly', (data) => {
  const { teamId, anomaly, timestamp } = data;
  
  // anomaly.type: 'CPU', 'MEMORY', 'DISK'
  // anomaly.severity: 'WARNING', 'CRITICAL'
  // anomaly.message: 'CPU usage critically high: 95.2%'
  // anomaly.value: 95.2
  // anomaly.threshold: 90
  
  console.warn(`Team ${teamId}: ${anomaly.message}`);
});
```

**Proctoring threshold breaches:**
```javascript
socket.on('proctor:threshold-breach', (data) => {
  const { teamId, userId, eventType, count, threshold } = data;
  console.warn(`${eventType} threshold breached: ${count}/${threshold}`);
});
```

**Abuse detection:**
```javascript
socket.on('abuse:detected', (data) => {
  const { userId, email, teamId, requestCount } = data;
  console.warn(`Abuse detected: ${email} making ${requestCount} req/min`);
});
```

---

### 👥 Team Member Events

**Member joined:**
```javascript
socket.on('member:joined', (data) => {
  const { userId, email } = data;
  console.log(`${email} joined the team`);
});
```

**Member left:**
```javascript
socket.on('member:left', (data) => {
  const { userId, email } = data;
  console.log(`${email} left the team`);
});
```

---

### 🔄 File Watcher Errors

**Watcher error:**
```javascript
socket.on('watcher:error', (data) => {
  console.warn('File watcher encountered an error');
});

socket.on('watcher:restarted', (data) => {
  console.log('File watcher restarted successfully');
});

socket.on('watcher:failed', (data) => {
  console.error('File watcher failed. Please contact support.');
});
```

---

## ⚠️ Error Handling

### Standard Error Response Format

All API errors follow this format:

```json
{
  "error": "Error message here"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (e.g., duplicate team name)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
- `503` - Service Unavailable (e.g., AI service down)

### Example Error Handling

```javascript
try {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    // Handle error
    if (response.status === 401) {
      alert('Invalid credentials');
    } else if (response.status === 429) {
      alert('Too many login attempts. Please wait.');
    } else {
      alert(data.error || 'An error occurred');
    }
    return;
  }
  
  // Success
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  
} catch (error) {
  console.error('Network error:', error);
  alert('Unable to connect to server');
}
```

---

## ⏱️ Rate Limits

| Endpoint/Feature | Limit | Window |
|-----------------|-------|--------|
| **General API** | 300 requests | 15 minutes |
| **Auth (Login/Signup)** | 20 requests per email | 15 minutes |
| **Build Start** | 5 builds | 5 minutes |
| **AI Ask** | 10 requests | 1 minute |
| **Abuse Detection** | 100 requests | 1 minute |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 250
X-RateLimit-Reset: 1729680000
```

**Rate Limit Error (429):**
```json
{
  "error": "Too many requests. Please slow down a bit."
}
```

---

## 🎯 Complete Frontend Flow Example

### 1. User Registration & Login

```javascript
// Sign up
const signupResponse = await fetch('http://localhost:5000/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'securepass123'
  })
});

const { user, token } = await signupResponse.json();
localStorage.setItem('token', token);
```

---

### 2. Create Team

```javascript
const teamResponse = await fetch('http://localhost:5000/api/team/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Team Awesome',
    framework: 'NEXTJS'
  })
});

const { team } = await teamResponse.json();
```

---

### 3. Start Session (Creates Container)

```javascript
const sessionResponse = await fetch('http://localhost:5000/api/session/start', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ framework: 'NEXTJS' })
});

const { session, containerId } = await sessionResponse.json();

// Poll for container readiness
const checkStatus = setInterval(async () => {
  const statusResponse = await fetch(
    `http://localhost:5000/api/session/${session.id}/status`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  const { container } = await statusResponse.json();
  
  if (container.status === 'running') {
    clearInterval(checkStatus);
    console.log('Container ready!');
    initializeWebSocket();
  }
}, 2000);
```

---

### 4. Connect WebSocket

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token }
});

socket.on('connect', () => {
  console.log('WebSocket connected');
  
  // Create terminal
  socket.emit('terminal:create', {
    sessionId: 'terminal-1'
  });
});

socket.on('terminal:ready', (data) => {
  console.log('Terminal ready');
  
  // Send command
  socket.emit('terminal:input', {
    sessionId: 'terminal-1',
    input: 'npm install\n'
  });
});

socket.on('terminal:output', (data) => {
  console.log('Output:', data.output);
});
```

---

### 5. Real-Time Code Editing (Yjs)

```javascript
import * as Y from 'yjs';

const doc = new Y.Doc();
const yText = doc.getText('monaco');

// Listen for local changes
doc.on('update', (update) => {
  socket.emit('editor:sync', {
    update: Array.from(update)
  });
});

// Apply remote changes
socket.on('yjs:sync', (data) => {
  const update = new Uint8Array(data.update);
  Y.applyUpdate(doc, update);
});

// Bind to Monaco editor
import { MonacoBinding } from 'y-monaco';
const binding = new MonacoBinding(
  yText,
  monacoEditor.getModel(),
  new Set([monacoEditor])
);
```

---

### 6. Build Project

```javascript
socket.emit('build:start', {
  buildCommand: 'npm run build'
});

socket.on('build:queued', (data) => {
  console.log(`Build queued. Position: ${data.position}`);
});

socket.on('build:log', (data) => {
  console.log(data.output);
});

socket.on('build:success', () => {
  console.log('Build completed!');
});
```

---

### 7. Submit Project

```javascript
socket.emit('submission:create');

socket.on('submission:success', (data) => {
  console.log('Submitted!');
  console.log('Live URL:', data.deploymentUrl);
  console.log('Download:', data.cdnUrl);
});
```

---

## 🛠️ Environment Variables

Frontend should configure:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=ws://localhost:5000

# Production
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_WS_URL=wss://api.your-domain.com
```

---

## 📦 Required Frontend Packages

```bash
# Core
npm install socket.io-client yjs y-monaco @monaco-editor/react

# Terminal
npm install @xterm/xterm @xterm/addon-fit @xterm/addon-web-links

# UI (if using shadcn)
npm install tailwindcss lucide-react clsx

# State management
npm install zustand @tanstack/react-query

# Forms
npm install react-hook-form zod

# Proctoring
npm install browser-image-compression
```

---

## 🚀 Quick Start Checklist

- [ ] User can sign up and login
- [ ] User can create/join team
- [ ] Session starts and creates container
- [ ] WebSocket connects successfully
- [ ] Terminal works (create, input, output)
- [ ] File tree updates in real-time
- [ ] Monaco editor syncs between team members
- [ ] Cursor positions visible
- [ ] Build system works (queue, logs, completion)
- [ ] AI assistance works (check quota, ask, get response)
- [ ] Submission works (extract, upload, deploy)
- [ ] Proctoring events logged (tab switch, devtools, etc.)
- [ ] Admin dashboard shows all teams and stats

---

## 📞 Support

For backend issues, check:
- `GET /health` - Server health
- `GET /api/websocket/status` - WebSocket connections
- Server logs for errors

**Backend runs on:** `http://localhost:5000`  
**WebSocket endpoint:** `ws://localhost:5000`

---

**Happy coding! 🚀**
