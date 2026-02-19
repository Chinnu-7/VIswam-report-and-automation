import serverless from 'serverless-http';
import express from 'express';

const app = express();
app.get('/.netlify/functions/api/ping', (req, res) => res.json({ message: 'pong', time: new Date().toISOString() }));

export const handler = serverless(app);

