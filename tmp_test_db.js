import mysql from 'mysql2/promise';

const dbUrl = 'mysql://admin:Chinnu123@viswam-report-db.cp000iyam3nx.us-west-2.rds.amazonaws.com:3306/viswam_report';

async function testConnection() {
    console.log('Attempting to connect to RDS...');
    try {
        const connection = await mysql.createConnection(dbUrl);
        console.log('SUCCESS: Connected to MySQL!');
        await connection.end();
    } catch (err) {
        console.error('FAILURE: Could not connect.');
        console.error('Error:', err.message);
    }
}

testConnection();
