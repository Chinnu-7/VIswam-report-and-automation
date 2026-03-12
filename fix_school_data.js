import "dotenv/config";
import { performRecalculate } from './server/controllers/adminController.js';
import StudentReport from './server/models/StudentReport.js';

const test = async () => {
    try {
        const reports = await StudentReport.findAll({ where: { schoolId: '572834' } });
        let fixes = 0;
        
        const calcPct = (scores) => {
            if(!scores) return 0;
            const total = Object.values(scores).reduce((a, b) => Number(a) + Number(b), 0);
            return Math.round((total / 15) * 100);
        };

        for(const r of reports) {
            let rd = r.reportData;
            if(typeof rd === 'string') rd = JSON.parse(rd);
            
            if(rd.english && typeof rd.english_score === 'undefined') {
                rd.english_score = calcPct(rd.english);
                rd.maths_score = calcPct(rd.maths);
                rd.science_score = calcPct(rd.science);
                
                await StudentReport.update({ reportData: rd }, { where: { id: r.id } });
                fixes++;
            }
        }
        
        console.log(`Fixed scores for ${fixes} students. Running performRecalculate...`);
        const count = await performRecalculate('572834', 'Sodhana 1');
        console.log(`Recalculated grades for ${count} students. Done!`);
    } catch (e) {
        console.error(e);
    }
};

test();
