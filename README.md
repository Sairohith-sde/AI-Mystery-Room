# AI Mystery Room

AI Mystery Room is a full-stack mystery game generator where a player supplies a premise, a Gemini-backed backend creates a case, and the server validates every clue, hint, and suspect relationship before returning the case to the client.

## Architecture

- Frontend: React + Vite + React Router
- Backend: Node.js + Express + Mongoose
- Database: MongoDB Atlas
- AI: Google Gemini via `@google/genai`
- Validation: Zod schema checks plus custom logical consistency rules

The backend is the source of truth. Public responses are strictly allowlisted and never expose hidden solution data or unreleased clues.

## Local development

### 1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment files

Create server env values from the example file:

```bash
cd server
cp .env.example .env
```

Example values:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/ai-mystery-room
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Create the client env file:

```bash
cd ../client
cp .env.example .env
```

Example:

```env
VITE_API_URL=http://localhost:5000
```

### 3. Run the app

Backend:

```bash
cd server
npm run dev
```

Frontend:

```bash
cd client
npm run dev
```

### 4. Run tests

```bash
cd server
npm test
```

## Production deployment notes

The app is designed for deployment across three services:

- MongoDB Atlas for the database
- Render or Railway for the Express backend
- Vercel for the React frontend

Required production backend variables:

```env
PORT=3000
MONGODB_URI=your_atlas_connection_string
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash
CLIENT_URL=https://your-vercel-app.vercel.app
NODE_ENV=production
```

Required frontend variable:

```env
VITE_API_URL=https://your-render-app.onrender.com
```

The frontend includes a Vercel rewrite for deep links so `/case/:id` routes continue to work after refresh.

## Cold-start considerations

Free hosting tiers can sleep between requests. Before a live demo or submission, warm the backend health endpoint (`/api/health`) so the app is responsive.

## Known limitations

- The app depends on a valid Gemini key and a MongoDB Atlas connection.
- The Gemini model name should be checked against Google’s current docs before final deployment.
- The production app is meant to be used with a live backend and database; local dev still uses local service values.
