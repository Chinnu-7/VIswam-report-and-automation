import axios from 'axios';
import * as xlsx from 'xlsx';
import SchoolInfo from './server/models/SchoolInfo.js';
import User from './server/models/User.js';
import bcrypt from 'bcryptjs';

const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRb2tmmwhgc0qPTeP-ivAIMtNak3bet9bFL_6xqgvjnHH5XnWr5l-6JiF9MsFqiiISUQrxh4wueTXaS/pub?output=csv';

async function restore() {
    try {
        console.log('Ensuring tables exist...');
        await SchoolInfo.sync();
        await User.sync();

        console.log('Fetching data from CORRECT Google Sheet...');
        const response = await axios.get(GOOGLE_SHEET_URL, { responseType: 'arraybuffer' });
        const workbook = xlsx.read(response.data, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const records = xlsx.utils.sheet_to_json(sheet);

        console.log(`Processing ${records.length} records...`);

        const schoolMap = new Map();
        const userMap = new Map();

        for (const record of records) {
            const schoolId = record['UDISE Code'] || record['Assessment_SchoolID_Acadamicyear'] || record['School ID'] || record['ID'];
            const schoolName = record['School Name'] || record['SchoolName'];
            const email = record['School Email Id'] || record['Principal Email'] || record['Email'] || record['PrincipalEmail'];
            const omrUploadDate = record['Date of Uploading OMR to Drive'] || null;

            if (schoolId) {
                const sId = String(schoolId).trim();
                // Deduplicate: Keep the first one or most complete one
                if (!schoolMap.has(sId)) {
                    schoolMap.set(sId, {
                        schoolId: sId,
                        schoolName: (schoolName || 'Unknown').trim(),
                        principalEmail: (email || 'no-email@viswam.com').trim(),
                        omrUploadDate
                    });

                    if (email) {
                        const emailTrim = String(email).trim().toLowerCase();
                        if (!userMap.has(emailTrim)) {
                            const hashedPassword = await bcrypt.hash(`${sId}@123`, 10);
                            userMap.set(emailTrim, {
                                email: emailTrim,
                                password: hashedPassword,
                                role: 'principal',
                                schoolId: sId
                            });
                        }
                    }
                }
            }
        }

        const schools = Array.from(schoolMap.values());
        const users = Array.from(userMap.values());

        console.log(`Upserting ${schools.length} unique schools...`);
        if (schools.length > 0) {
            await SchoolInfo.bulkCreate(schools, {
                updateOnDuplicate: ['schoolName', 'principalEmail', 'omrUploadDate']
            });
        }

        console.log(`Creating ${users.length} unique users...`);
        if (users.length > 0) {
            await User.bulkCreate(users, { ignoreDuplicates: true });
        }

        console.log('Restore completed successfully!');
        console.log('Final Verfication:');
        console.log('  Schools in DB:', await SchoolInfo.count());
        console.log('  Users in DB:', await User.count());
        process.exit(0);
    } catch (err) {
        console.error('Restore failed:', err);
        process.exit(1);
    }
}

restore();
