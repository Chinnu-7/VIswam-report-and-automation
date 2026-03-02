import fs from 'fs';
import path from 'path';
import { uploadStudentData } from './server/controllers/uploadController.js';

const testFile = 'Final Format.xlsx'; // Make sure we have this file

const run = async () => {
    try {
        const buffer = fs.readFileSync(testFile);

        const req = {
            file: {
                buffer,
                originalname: 'Sodhana1_594681_2025-2026.xlsx'
            },
            body: {}
        };

        let statusCode = 200;
        const res = {
            status: (code) => {
                statusCode = code;
                return res;
            },
            json: (data) => {
                console.log(`[STATUS ${statusCode}]`, data);
            }
        };

        console.log('--- STARTING UPLOAD ---');
        await uploadStudentData(req, res);
        console.log('--- FINISHED ---');
    } catch (e) {
        console.error("Test script exception:", e);
    }
};

run();
