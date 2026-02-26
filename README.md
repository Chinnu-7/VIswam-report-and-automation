# Viswam Student Report Automation

A full-stack application designed to automate the generation and distribution of student report cards. Built with React (Frontend), Node.js/Express (Backend), and n8n (Automation).

## Features

- **Dynamic Report Generation**: Creates high-quality HTML report cards from student data.
- **n8n Automation**: Automatically polls for approved reports.
- **Zero-Cost PDF Generation**: Uses local Chromium (via n8n) to convert HTML reports to PDFs.
- **Email Delivery**: Sends PDFs as attachments to principals via Gmail.
- **Live Deployment**: Ready for Vercel with Supabase (PostgreSQL) support for permanent storage.
- **Dockerized**: Entire stack (App + n8n) can be run with a single command.

## Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Setup Environment**:
   Create a `.env` file with your database credentials (see Deployment section).
3. **Start Development**:
   ```bash
   npm.cmd run dev    # Frontend
   npm.cmd run server # Backend
   ```

## Production Deployment (Vercel)

The project is optimized for deployment via Vercel. Push your changes to GitHub and connect your repository to Vercel.

### Required Environment Variables
- `DB_HOST`: Your remote MySQL host.
- `DB_NAME`: Database name.
- `DB_USER`: Username.
- `DB_PASS`: Password.
- `N8N_WEBHOOK_URL`: Your n8n workflow webhook.
- `APP_URL`: The public URL of your app (e.g., `https://viswam-reports.vercel.app`).

## Automation (n8n)

1. Import `n8n_viswam_automation.json`.
2. Configure environment variables in n8n (`CHROME_PATH`, `APP_URL`).
3. Set up your Gmail credentials for delivery.

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
