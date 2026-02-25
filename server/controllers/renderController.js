import StudentReport from '../models/StudentReport.js';
import fs from 'fs';
import path from 'path';

// Helper to get base64 logo
const getBase64Image = (fileName) => {
    try {
        const filePath = path.resolve('src', 'assets', fileName);
        if (fs.existsSync(filePath)) {


            const data = fs.readFileSync(filePath);
            const extension = path.extname(fileName).slice(1);
            return `data:image/${extension === 'jpg' ? 'jpeg' : extension};base64,${data.toString('base64')}`;
        }
    } catch (err) {
        console.error(`Error reading logo ${fileName}:`, err);
    }
    return '';
};

export const renderReportHtml = async (req, res) => {
    try {
        const { id } = req.params;
        const report = await StudentReport.findByPk(id);

        if (!report) {
            return res.status(404).send('<h1>Report not found</h1>');
        }

        const data = report.get({ plain: true });
        const reportData = data.reportData;
        const relativeGrading = reportData.relative_grading || {};

        const fdrLogo = getBase64Image('fdr-logo-new.png');
        const nsfLogo = getBase64Image('NSF logo 2.jpeg');
        const viswamLogo = getBase64Image('Viswam.png');

        const primaryColor = '#1e3a8a';
        const accentColor = '#dc2626';

        const getGradeColor = (grade) => {
            if (!grade) return '#64748B';
            const g = String(grade).toUpperCase();
            if (['O', 'A+', 'A', 'B+'].includes(g)) return '#15803d'; // Greenish
            if (['B', 'C+', 'C'].includes(g)) return '#ea580c'; // Orange
            if (g === 'D') return '#dc2626'; // Red
            return '#64748B';
        };

        const getGradeBg = (grade) => {
            if (!grade) return '#F1F5F9';
            const g = String(grade).toUpperCase();
            if (g === 'O') return '#dcfce7';
            if (g === 'A+') return '#bbf7d0';
            if (g === 'A') return '#86efac';
            if (g === 'B+') return '#4ade80';
            if (g === 'B') return '#ffedd5';
            if (g === 'C+') return '#fed7aa';
            if (g === 'C') return '#fdba74';
            if (g === 'D') return '#fee2e2';
            return '#F1F5F9';
        };

        const subjects = [
            { key: 'english', label: 'English', score: reportData.english_score || 0, color: '#4338ca' },
            { key: 'maths', label: 'Mathematics', score: reportData.maths_score || 0, color: '#15803d' },
            { key: 'science', label: 'Science', score: reportData.science_score || 0, color: '#b45309' }
        ];

        const renderLOs = (subjectKey) => {
            const loMapping = reportData.lo_mapping?.[subjectKey] || {};
            const scores = reportData[subjectKey] || {};

            const items = Object.entries(scores).map(([code, score]) => ({
                code,
                text: loMapping[code] || code,
                score: Math.round(score * 100)
            }));

            const strengths = items.filter(i => i.score >= 75).sort((a, b) => b.score - a.score).slice(0, 5);
            const improvements = items.filter(i => i.score < 50 && i.score >= 0).sort((a, b) => a.score - b.score).slice(0, 7);

            let html = '';
            if (strengths.length > 0) {
                html += `<div class="lo-section"><h5 style="color:#15803d">✅ Strengths</h5><ul>`;
                strengths.forEach(s => html += `<li>${s.text} : <b>${s.score}%</b></li>`);
                html += `</ul></div>`;
            }
            if (improvements.length > 0) {
                html += `<div class="lo-section"><h5 style="color:#b45309">⚠️ Areas for Development (AOD)</h5><ul>`;
                improvements.forEach(i => html += `<li>${i.text} : <b>${i.score}%</b></li>`);
                html += `</ul></div>`;
            }
            return html;
        };

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Report - ${data.studentName}</title>
    <style>
        @page { size: A4; margin: 0; }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; margin: 0; padding: 0; color: #1e293b; line-height: 1.5; }
        .page { width: 210mm; min-height: 297mm; padding: 10mm; box-sizing: border-box; background: white; display: flex; flex-direction: column; overflow: hidden; page-break-after: always; }
        header { border-bottom: 2px solid ${primaryColor}; padding-bottom: 5mm; margin-bottom: 5mm; text-align: center; }
        .logos { display: flex; align-items: center; justify-content: center; gap: 10mm; margin-bottom: 3mm; }
        .logo-fdr { height: 18mm; }
        h1 { margin: 0; color: ${primaryColor}; font-size: 1.3rem; text-transform: uppercase; font-weight: 800; }
        h2 { margin: 1mm 0; color: ${accentColor}; font-size: 1.1rem; font-weight: 700; }
        .meta { display: flex; justify-content: center; gap: 5mm; font-size: 0.8rem; color: #64748B; margin-top: 2mm; }
        
        .student-info { display: grid; grid-template-columns: 1fr 2fr; gap: 5mm; margin-bottom: 5mm; background: #F8FAFC; padding: 5mm; border-radius: 4mm; border: 1px solid #E2E8F0; }
        .info-group label { display: block; font-size: 0.7rem; text-transform: uppercase; color: #64748B; font-weight: 700; margin-bottom: 0.5mm; }
        .info-group div { font-size: 1.1rem; font-weight: 800; }
        .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin-top: 3mm; }
        .info-grid div span { font-size: 0.9rem; font-weight: 700; }

        section-title { font-size: 0.9rem; font-weight: 800; color: ${primaryColor}; border-left: 5px solid ${primaryColor}; padding-left: 3mm; margin-bottom: 3mm; text-transform: uppercase; display: block; }
        
        .subject-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; margin-bottom: 5mm; }
        .subject-card { text-align: center; padding: 3mm; border-radius: 4mm; border: 2px solid #E2E8F0; background: #fff; }
        .subject-label { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; margin-bottom: 1mm; }
        .subject-grade { font-size: 1.8rem; font-weight: 900; line-height: 1; margin: 1mm 0; }
        .progress-bar { height: 1.5mm; background: #E2E8F0; border-radius: 1mm; overflow: hidden; margin-top: 2mm; }
        .progress-fill { height: 100%; border-radius: 1mm; }

        .lo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; flex: 1; }
        .lo-card { border: 1px solid #F1F5F9; border-radius: 3mm; padding: 3mm; background: #fff; }
        .lo-header { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; padding-bottom: 1mm; border-bottom: 1px solid #F1F5F9; margin-bottom: 2mm; }
        .lo-section h5 { font-size: 0.7rem; margin: 2mm 0 1mm 0; }
        .lo-section ul { margin: 0; padding-left: 4mm; font-size: 0.6rem; color: #334155; }
        .lo-section li { margin-bottom: 1mm; }

        .grading-scale { margin-top: 5mm; border-top: 1px solid #E2E8F0; padding-top: 3mm; }
        .grading-scale h4 { font-size: 0.7rem; color: ${primaryColor}; margin-bottom: 2mm; font-weight: 800; }
        .ranges-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm; }
        .range-item { padding: 1mm 2mm; border-radius: 1mm; text-align: center; }
        .range-item .g { font-weight: 800; font-size: 0.75rem; }
        .range-item .p { font-size: 0.55rem; font-weight: 600; }
        .range-item .d { font-size: 0.5rem; color: #475569; }

        footer { margin-top: auto; display: flex; justify-content: space-between; align-items: center; font-size: 0.7rem; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 3mm; }
        .partner-logo { height: 8mm; }
    </style>
</head>
<body>
    <div class="page">
        <header>
            <div class="logos">
                <img src="${fdrLogo}" class="logo-fdr" alt="FDR">
            </div>
            <h1>Foundation for Democratic Reforms</h1>
            <h2>Student Achievement Report</h2>
            <div class="meta">
                <span><b>Grade:</b> ${data.class || ''}</span> • 
                <span><b>Assessment:</b> ${data.assessmentName || 'PSA PILOT'}</span> • 
                <span><b>Date:</b> ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</span>
            </div>
        </header>

        <div class="student-info">
            <div class="info-group">
                <label>Student Name</label>
                <div>${data.studentName}</div>
            </div>
            <div class="info-grid">
                <div class="info-group"><label>Roll No</label><span>${data.rollNo}</span></div>
                <div class="info-group"><label>School</label><span>${data.schoolName}</span></div>
                <div class="info-group"><label>Grade</label><span>${data.class}</span></div>
            </div>
        </div>

        <section-title>Subject Performance</section-title>
        <div class="subject-grid">
            ${subjects.map(sub => {
            const rel = relativeGrading[sub.key] || {};
            const gColor = getGradeColor(rel.grade);
            const gBg = getGradeBg(rel.grade);
            return `
                <div class="subject-card" style="border-color: ${sub.color}20; background: ${sub.color}05">
                    <div class="subject-label" style="color: ${sub.color}">${sub.label} Performance</div>
                    <div class="subject-grade" style="color: ${gColor}">${rel.grade || '-'}</div>
                    <div class="progress-bar"><div class="progress-fill" style="width: ${sub.score}%; background: ${sub.color}"></div></div>
                </div>`;
        }).join('')}
        </div>

        <section-title>Learning Outcomes & Skills</section-title>
        <div class="lo-grid">
            ${subjects.map(sub => `
                <div class="lo-card">
                    <div class="lo-header" style="color: ${sub.color}">${sub.label}</div>
                    ${renderLOs(sub.key)}
                </div>
            `).join('')}
        </div>

        <div class="grading-scale">
            <h4>GRADING SCALE</h4>
            <div class="ranges-grid">
                ${[
                { g: 'O', p: '91-100%', d: 'Outstanding' },
                { g: 'A+', p: '80-90%', d: 'Excellent' },
                { g: 'A', p: '70-79%', d: 'Very Good' },
                { g: 'B+', p: '60-69%', d: 'Good' },
                { g: 'B', p: '50-59%', d: 'Above Avg' },
                { g: 'C+', p: '40-49%', d: 'Average' },
                { g: 'C', p: '30-39%', d: 'Below Avg' },
                { g: 'D', p: '< 30%', d: 'Needs Imp.' }
            ].map(r => `
                    <div class="range-item" style="background: ${getGradeBg(r.g)}; color: ${getGradeColor(r.g)}">
                        <div class="g">${r.g}</div>
                        <div class="p">${r.p}</div>
                        <div class="d">${r.d}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <footer>
            <div>
                <label style="font-size: 0.55rem; text-transform: uppercase; font-weight: 700; color: #64748B; display: block; margin-bottom: 1mm;">Assessment Partner</label>
                <img src="${nsfLogo}" class="partner-logo" alt="NSF">
            </div>
            <span>Page 1 of 1</span>
            <div style="text-align: right;">
                <label style="font-size: 0.55rem; text-transform: uppercase; font-weight: 700; color: #64748B; display: block; margin-bottom: 1mm;">Implementation Partner</label>
                <img src="${viswamLogo}" class="partner-logo" alt="Viswam">
            </div>
        </footer>
    </div>
</body>
</html>`;
        res.send(html);
    } catch (error) {
        console.error('Error rendering HTML report:', error);
        res.status(500).send('Error rendering report');
    }
};
