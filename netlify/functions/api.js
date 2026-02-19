import serverless from 'serverless-http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/ping', (req, res) => res.json({ message: 'pong', time: new Date().toISOString() }));

export const handler = serverless(app);


