import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve('database.sqlite');
const db = new sqlite3.Database(dbPath);

db.get('SELECT reportData FROM student_reports LIMIT 1', (err, row) => {
    if (err) {
        console.error(err);
    } else {
        console.log('Sample Report Data:');
        console.log(JSON.stringify(JSON.parse(row.reportData), null, 2));
    }
    db.close();
});
