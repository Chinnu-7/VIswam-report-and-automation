# Viswam Student Report Automation

A full-stack application designed to automate the generation and distribution of student report cards. Built with React (Frontend), Node.js/Express (Backend), and n8n (Automation).

## Features

- **Dynamic Report Generation**: Creates high-quality HTML report cards from student data.
- **n8n Automation**: Automatically polls for approved reports.
- **Zero-Cost PDF Generation**: Uses local Chromium (via n8n) to convert HTML reports to PDFs.
- **Email Delivery**: Sends PDFs as attachments to principals via Gmail.
- **Live Deployment**: Ready for Vercel with Supabase (PostgreSQL) support for permanent storage.
- **Dockerized**: Entire stack (App + n8n) can be run with a single command.

## Quick Start (Docker)

The easiest way to run the project is using Docker Compose:

1. **Prerequisites**: [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.
2. **Build and Start**:
   ```bash
   docker-compose up --build -d
   ```
3. **Access the App**:
   - Frontend/API: `http://localhost:5000`
   - n8n Automation: `http://localhost:5678`

## Manual Local Setup

### 1. Backend & Frontend
```bash
# Install dependencies
npm install

# Build frontend
npm run build

# Start server
node server/index.js
```
The app will be available at `http://localhost:5000`.

### 2. Automation (n8n)
1. Install n8n: `npm install n8n -g`
2. Start n8n: `npx n8n start`
3. Import `n8n_workflow.json` from the root directory.
4. Configure your Gmail App Password in the n8n Gmail node.

## Production Configuration

### Environment Variables
For production (Vercel), set the following environment variables:
- `DATABASE_URL`: Your Supabase/PostgreSQL connection string (required for persistence).
- `NODE_ENV`: `production`

## Tech Stack
- **Frontend**: React, Vite, Lucide-React, Recharts.
- **Backend**: Node.js, Express, Sequelize (ORM).
- **Database**: MySQL (Remote/Production) or PostgreSQL (Ready).
- **Automation**: n8n, Google Chrome (headless).

## Deployment

### Environment Variables
- `DB_HOST`: Database host (e.g., `sql12.freesqldatabase.com`)
- `DB_NAME`: Database name
- `DB_USER`: Username
- `DB_PASS`: Password
- `N8N_WEBHOOK_URL`: Your n8n webhook URL
- `APP_URL`: The public URL of your deployed application (for n8n report rendering)

## License
MIT
