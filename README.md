# UVA Thrift

Full-stack CRUD application with Node.js/TypeScript backend, React/TypeScript frontend, and PostgreSQL database, ready for Heroku deployment.

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React with TypeScript + Vite
- **Database**: PostgreSQL
- **Deployment**: Heroku

## Project Structure

```
.
├── server/           # Backend TypeScript code
│   ├── index.ts     # Express server entry point
│   ├── db.ts        # PostgreSQL connection config
│   └── schema.sql   # Database schema
├── client/          # React + Vite frontend
│   ├── src/         # React source code
│   ├── build/       # Vite build output (generated)
│   └── vite.config.ts # Vite configuration
├── dist/            # Compiled backend code (generated)
├── .env             # Environment variables (local)
├── Procfile         # Heroku process file
├── tsconfig.json    # TypeScript config for backend
└── package.json     # Root dependencies and scripts
```

## Local Development Setup

### Prerequisites

- Node.js 22.x
- npm 11.x
- PostgreSQL installed locally

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up PostgreSQL database**:
   ```bash
   # Create database
   createdb uva_thrift_dev
   
   # Run schema
   psql uva_thrift_dev < server/schema.sql
   ```

3. **Configure environment variables**:
   
   Edit `.env` file with your local database URL:
   ```
   PORT=5000
   DATABASE_URL=postgresql://localhost:5432/uva_thrift_dev
   NODE_ENV=development
   ```

### Running the App

**Development mode** (runs both frontend and backend):
```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Vite dev server on `http://localhost:3000`

**Backend only**:
```bash
npm run server
```

**Frontend only**:
```bash
npm run client
```

### Deploying

1. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Initial deployment"
   ```

2. **Push to Heroku**:
   ```bash
   git push heroku main
   ```

   Heroku will:
   - Install dependencies
   - Run `heroku-postbuild` script (builds React app with Vite)
   - Compile TypeScript backend
   - Start the server using the `Procfile`

3. **Initialize database schema** (first time only):
   ```bash
   heroku pg:psql < server/schema.sql
   ```

4. **Open your app**:
   ```bash
   heroku open
   ```

### Useful Heroku Commands

```bash
# View logs
heroku logs --tail

# Check database info
heroku pg:info

# Connect to database
heroku pg:psql

# Restart app
heroku restart

# View environment variables
heroku config
```

## API Endpoints

- `GET /api/health` - Health check endpoint