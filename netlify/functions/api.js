import serverless from 'serverless-http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

import sequelize from '../../server/config/database.js';

app.get('/api/ping', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({ message: 'pong - DB Connected', time: new Date().toISOString() });
    } catch (err) {
        res.status(500).json({ message: 'pong - DB Error', error: err.message, time: new Date().toISOString() });
    }
});


export const handler = serverless(app);


