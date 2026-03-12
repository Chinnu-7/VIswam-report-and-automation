import StudentReport from '../models/StudentReport.js';
import SchoolInfo from '../models/SchoolInfo.js';
import fs from 'fs';
import path from 'path';

// Helper to get base64 logo
const getBase64Image = (fileName) => {
    try {
        const filePath = path.join(process.cwd(), 'src', 'assets', fileName);
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

// --- RE-INTRODUCING INDIVIDUAL REPORT HELPERS ---

const getGradeColor = (grade) => {
    if (!grade) return '#64748B';
    const g = String(grade).toUpperCase();
    if (['S+', 'O'].includes(g)) return '#15803d';
    if (['S', 'A+'].includes(g)) return '#15803d';
    if (['A', 'B+'].includes(g)) return '#0369a1';
    if (['B', 'C+'].includes(g)) return '#b45309';
    if (['C', 'D'].includes(g)) return '#dc2626';
    return '#64748B';
};

const getGradeBg = (grade) => {
    if (!grade) return '#F1F5F9';
    const g = String(grade).toUpperCase();
    if (['S+', 'O'].includes(g)) return '#dcfce7'; // Green
    if (['S', 'A+'].includes(g)) return '#dcfce7';
    if (['A', 'B+'].includes(g)) return '#e0f2fe'; // Blue
    if (['B', 'C+'].includes(g)) return '#fef3c7'; // Amber
    if (['C', 'D'].includes(g)) return '#fee2e2'; // Red
    return '#F1F5F9';
};

export const getReportHtmlString = async (reportId) => {
    const report = await StudentReport.findByPk(reportId);
    if (!report) throw new Error('Report not found');

    const data = report; // Backward compatibility with old templates
    const reportData = report.reportData || {};
    const relativeGrading = reportData.relative_grading || {};

    const fdrLogo = getBase64Image('fdr-logo-new.png');
    const nsfLogo = getBase64Image('NSF logo 2.jpeg');
    const viswamLogo = getBase64Image('Viswam.png');

    const primaryColor = '#1e3a8a';
    const accentColor = '#dc2626';

    const subjects = [
        { key: 'english', label: 'English', color: '#16A34A', score: reportData.english?.total || 0 },
        { key: 'maths', label: 'Mathematics', color: '#0284C7', score: reportData.maths?.total || 0 },
        { key: 'science', label: 'Science', color: '#EA580C', score: reportData.science?.total || 0 }
    ];

    const renderLOs = (subjectKey) => {
        const scores = reportData[subjectKey] || {};
        const mapping = reportData.lo_mapping?.[subjectKey] || {};
        
        const LOs = Object.entries(scores)
            .filter(([code]) => code !== 'total' && code !== 'grade')
            .map(([code, score]) => ({ code, score, text: mapping[code] || code }))
            .sort((a, b) => b.score - a.score);

        const strengths = LOs.filter(lo => lo.score >= 75).slice(0, 3);
        const improvements = LOs.filter(lo => lo.score < 50).slice(0, 3);

        return `
            <div class="lo-section">
                ${strengths.length > 0 ? `<h5>✅ Strengths</h5><ul>${strengths.map(lo => `<li>${lo.text}</li>`).join('')}</ul>` : ''}
                ${improvements.length > 0 ? `<h5>⚠️ To Improve</h5><ul>${improvements.map(lo => `<li>${lo.text}</li>`).join('')}</ul>` : ''}
            </div>`;
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        @page { size: A4; margin: 0; }
        body { font-family: 'Inter', system-ui, -apple-system, sans-serif; margin: 0; padding: 0; color: #1e293b; line-height: 1.5; }
        .page { width: 210mm; min-height: 297mm; padding: 10mm; box-sizing: border-box; background: white; display: flex; flex-direction: column; overflow: hidden; page-break-after: always; }
        header { border-bottom: 2px solid ${primaryColor}; padding-bottom: 4mm; margin-bottom: 5mm; text-align: center; }
        .logos { display: flex; align-items: center; justify-content: center; gap: 10mm; margin-bottom: 3mm; }
        .logo-fdr { height: 16mm; }
        h1 { margin: 0; color: ${primaryColor}; font-size: 1.25rem; text-transform: uppercase; font-weight: 800; }
        h2 { margin: 1mm 0; color: ${accentColor}; font-size: 1rem; font-weight: 700; }
        .meta { display: flex; justify-content: center; gap: 5mm; font-size: 0.75rem; color: #64748B; margin-top: 2mm; }
        
        .student-info { display: grid; grid-template-columns: 1fr 2.5fr; gap: 4mm; margin-bottom: 4mm; background: #F8FAFC; padding: 4mm; border-radius: 3mm; border: 1px solid #E2E8F0; }
        .info-group label { display: block; font-size: 0.65rem; text-transform: uppercase; color: #64748B; font-weight: 700; margin-bottom: 0.5mm; }
        .info-group div { font-size: 1rem; font-weight: 800; }
        .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin-top: 2mm; }
        .info-grid div span { font-size: 0.85rem; font-weight: 700; }

        section-title { font-size: 0.85rem; font-weight: 800; color: ${primaryColor}; border-left: 4px solid ${primaryColor}; padding-left: 3mm; margin-bottom: 3mm; text-transform: uppercase; display: block; }
        
        .subject-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin-bottom: 4mm; }
        .subject-card { text-align: center; padding: 3mm; border-radius: 3mm; border: 1px solid #E2E8F0; background: #fff; }
        .subject-label { font-size: 0.6rem; font-weight: 700; text-transform: uppercase; margin-bottom: 1mm; }
        .subject-grade { font-size: 1.6rem; font-weight: 900; line-height: 1; margin: 1mm 0; }
        .progress-bar { height: 1.5mm; background: #E2E8F0; border-radius: 1mm; overflow: hidden; margin-top: 2mm; }
        .progress-fill { height: 100%; border-radius: 1mm; }

        .lo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; flex: 1; }
        .lo-card { border: 1px solid #F1F5F9; border-radius: 2mm; padding: 2.5mm; background: #fff; }
        .lo-header { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; padding-bottom: 1mm; border-bottom: 1px solid #F1F5F9; margin-bottom: 2mm; }
        .lo-section h5 { font-size: 0.65rem; margin: 2mm 0 1mm 0; }
        .lo-section ul { margin: 0; padding-left: 4mm; font-size: 0.55rem; color: #334155; }
        .lo-section li { margin-bottom: 0.5mm; }

        .grading-scale { margin-top: 4mm; border-top: 1px solid #E2E8F0; padding-top: 3mm; }
        .grading-scale h4 { font-size: 0.65rem; color: ${primaryColor}; margin-bottom: 2mm; font-weight: 800; }
        .ranges-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5mm; }
        .range-item { padding: 1.5mm; border-radius: 1mm; text-align: center; border: 1px solid #0001; }
        .range-item .g { font-weight: 900; font-size: 0.7rem; }
        .range-item .p { font-size: 0.55rem; font-weight: 700; }
        .range-item .d { font-size: 0.45rem; color: #475569; }

        footer { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; font-size: 0.65rem; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 3mm; }
        .partner-logo { height: 7mm; }
        .partner label { font-size: 0.45rem; text-transform: uppercase; font-weight: 800; color: #94A3B8; margin-bottom: 1mm; display: block; }
    </style>
</head>
<body>
    <div class="page">
        <header>
            <div class="logos"><img src="${fdrLogo}" class="logo-fdr"></div>
            <h1>Foundation for Democratic Reforms</h1>
            <h2>Student Achievement Report</h2>
            <div class="meta">
                <span><b>Grade:</b> ${data.class || ''}</span> • 
                <span><b>Assessment:</b> ${data.assessmentName || 'PSA PILOT'}</span> • 
                <span><b>Date:</b> ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</span>
            </div>
        </header>

        <div class="student-info">
            <div class="info-group"><label>Student Name</label><div>${data.studentName}</div></div>
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
                return `
                    <div class="subject-card" style="border-color: ${sub.color}20; background: ${sub.color}05">
                        <div class="subject-label" style="color: ${sub.color}">${sub.label} Performance</div>
                        <div class="subject-grade" style="color: ${gColor}">${rel.grade || '-'}</div>
                        <div class="progress-bar"><div class="progress-fill" style="width: ${sub.score}%; background: ${sub.color}"></div></div>
                    </div>`;
            }).join('')}
        </div>

        <section-title>Learning Outcomes & Skills</section-title>
        <div class="lo-grid">${subjects.map(sub => `<div class="lo-card"><div class="lo-header" style="color: ${sub.color}">${sub.label}</div>${renderLOs(sub.key)}</div>`).join('')}</div>

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
                        <div class="g">${r.g}</div><div class="p">${r.p}</div><div class="d">${r.d}</div>
                    </div>`).join('')}
            </div>
        </div>

        <footer>
            <div class="partner"><label>Assessment Partner</label><img src="${nsfLogo}" class="partner-logo"></div>
            <div style="font-weight: 700;">Page 1 of 1</div>
            <div class="partner" style="text-align: right;"><label>Implementation Partner</label><img src="${viswamLogo}" class="partner-logo"></div>
        </footer>
    </div>
</body>
</html>`;
};

// --- PRINCIPAL REPORT (COHORT SUMMARY) ---

export const getPrincipalReportHtmlString = async (reports, schoolInfo, assessmentName, qp) => {
    if (!reports || reports.length === 0) throw new Error('No reports provided');

    const schoolName = schoolInfo?.schoolName || reports[0]?.schoolName || 'Unknown School';
    const totalRegistered = schoolInfo?.registered || reports.length;
    const totalParticipated = schoolInfo?.participated || reports.length;
    const grade = reports[0]?.class || '7';

    const fdrLogo = getBase64Image('fdr-logo-new.png');
    const nsfLogo = getBase64Image('NSF logo 2.jpeg');
    const viswamLogo = getBase64Image('Viswam.png');

    const primaryColor = '#1e3a8a';
    const accentColor = '#dc2626';

    // Reuse grading helpers
    const gradeDistribution = reports.reduce((acc, curr) => {
        const g = curr.reportData?.relative_grading?.overall?.grade || 'D';
        acc[g] = (acc[g] || 0) + 1;
        return acc;
    }, {});

    const distData = [
        { g: 'O', c: gradeDistribution['O'] || 0, color: '#15803d' },
        { g: 'A+', c: gradeDistribution['A+'] || 0, color: '#15803d' },
        { g: 'A', c: gradeDistribution['A'] || 0, color: '#15803d' },
        { g: 'B+', c: gradeDistribution['B+'] || 0, color: '#15803d' },
        { g: 'B', c: gradeDistribution['B'] || 0, color: '#ea580c' },
        { g: 'C+', c: gradeDistribution['C+'] || 0, color: '#ea580c' },
        { g: 'C', c: gradeDistribution['C'] || 0, color: '#ea580c' },
        { g: 'D', c: gradeDistribution['D'] || 0, color: '#dc2626' }
    ];
    const maxCount = Math.max(...distData.map(d => d.c), 1);

    const getAggregatedLOs = (subjectKey, isStrength) => {
        const aggregated = {};
        const mapping = reports[0]?.reportData?.lo_mapping?.[subjectKey] || {};
        reports.forEach(r => {
            const scores = r.reportData?.[subjectKey] || {};
            Object.entries(scores).forEach(([code, score]) => {
                if (typeof score !== 'number') return;
                if (!aggregated[code]) aggregated[code] = { total: 0, count: 0 };
                aggregated[code].total += score;
                aggregated[code].count += 1;
            });
        });
        return Object.entries(aggregated)
            .map(([code, d]) => ({ text: mapping[code] || code, avg: d.total / d.count }))
            .filter(i => isStrength ? i.avg >= 0.75 : (i.avg < 0.5 && i.avg >= 0))
            .sort((a, b) => isStrength ? b.avg - a.avg : a.avg - b.avg).slice(0, 3);
    };

    const sections = ['english', 'maths', 'science'].map(s => ({
        label: s.charAt(0).toUpperCase() + s.slice(1),
        strengths: getAggregatedLOs(s, true),
        improvements: getAggregatedLOs(s, false)
    }));

    const studentsPerPage = 25;
    const sortedReports = [...reports].sort((a, b) => Number(a.rollNo) - Number(b.rollNo));
    const studentPages = [];
    for (let i = 0; i < sortedReports.length; i += studentsPerPage) studentPages.push(sortedReports.slice(i, i + studentsPerPage));

    const page1 = `
    <div class="page">
        <header>
            <div class="logos"><img src="${fdrLogo}" class="logo-fdr"></div>
            <h1>Foundation for Democratic Reforms</h1>
            <h2 style="color:${primaryColor}">Student Performance Report</h2>
            <div class="meta">
                <span><b>School:</b> ${schoolName}</span> • 
                <span><b>Assessment:</b> ${assessmentName}</span> • 
                <span><b>Grade:</b> ${grade}</span>
            </div>
        </header>

        <section-title>Performance Summary</section-title>
        <div style="display: grid; grid-template-columns: 1fr 2.5fr; gap: 4mm; margin-bottom: 5mm;">
            <div class="card" style="text-align: center; display: flex; align-items: center; justify-content: center; gap: 4mm; padding: 4mm;">
                <div><div class="big-val" style="font-size: 1.8rem;">${totalRegistered}</div><div class="label">Registered</div></div>
                <div style="width:1px; height:8mm; background:#CBD5E1"></div>
                <div><div class="big-val" style="font-size: 1.8rem;">${totalParticipated}</div><div class="label">Participated</div></div>
            </div>
            <div class="card" style="padding: 3mm 4mm; height: 32mm;">
                <div style="display: flex; align-items: flex-end; justify-content: space-between; height: 24mm; width: 100%;">
                    ${distData.map(d => `<div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%;"><div style="font-size: 0.6rem; font-weight: 800; color: #1e293b; margin-bottom: 1mm;">${d.c}</div><div style="width: 70%; max-width: 8mm; height: ${(d.c / maxCount) * 16}mm; min-height: ${d.c > 0 ? '0.5mm' : '0'}; background: ${d.color}; border-radius: 1mm 1mm 0 0;"></div><div style="font-size: 0.7rem; font-weight: 800; color: ${primaryColor}; margin-top: 1.5mm;">${d.g}</div></div>`).join('')}
                </div>
            </div>
        </div>

        <section-title>Focus Areas & Remarks</section-title>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin-bottom: 5mm;">
            ${sections.map(s => `
                <div class="card" style="padding: 2.5mm;">
                    <div style="text-align: center; font-weight: 800; font-size: 0.75rem; color: ${primaryColor}; border-bottom: 1px solid #E2E8F0; padding-bottom: 1mm; margin-bottom: 2mm;">${s.label}</div>
                    ${s.strengths.length > 0 ? `<div style="font-size: 0.6rem; font-weight: 800; color:#15803d; margin-bottom: 1mm;">✅ Strengths</div><ul style="margin:0; padding-left:4mm; font-size: 0.55rem; color:#334155;">${s.strengths.map(i => `<li>${i.text}</li>`).join('')}</ul>` : ''}
                    ${s.improvements.length > 0 ? `<div style="font-size: 0.6rem; font-weight: 800; color:#b45309; margin-top: 2mm; margin-bottom: 1mm;">⚠️ Improvements</div><ul style="margin:0; padding-left:4mm; font-size: 0.55rem; color:#334155;">${s.improvements.map(i => `<li>${i.text}</li>`).join('')}</ul>` : ''}
                </div>`).join('')}
        </div>

        <div class="grading-scale">
            <h4>GRADING SCALE</h4>
            <div class="ranges-grid">
                ${[{ g: 'O', p: '91-100%', d: 'Outstanding' }, { g: 'A+', p: '80-90%', d: 'Excellent' }, { g: 'A', p: '70-79%', d: 'Very Good' }, { g: 'B+', p: '60-69%', d: 'Good' }, { g: 'B', p: '50-59%', d: 'Above Avg' }, { g: 'C+', p: '40-49%', d: 'Average' }, { g: 'C', p: '30-39%', d: 'Below Avg' }, { g: 'D', p: '< 30%', d: 'Needs Imp.' }].map(r => `<div class="range-item" style="background: ${getGradeBg(r.g)}; color: ${getGradeColor(r.g)}"><div class="g">${r.g}</div><div class="p">${r.p}</div><div class="d">${r.d}</div></div>`).join('')}
            </div>
        </div>

        <footer-logos>
            <div class="partner"><label>Assessment Partner</label><img src="${nsfLogo}"></div>
            <div class="page-num">Page 1</div>
            <div class="partner" style="text-align: right;"><label>Implementation Partner</label><img src="${viswamLogo}"></div>
        </footer-logos>
    </div>`;

    const detailPages = studentPages.map((page, idx) => `
    <div class="page">
        <header>
            <div class="logos"><img src="${fdrLogo}" class="logo-fdr"></div>
            <h1>Foundation for Democratic Reforms</h1>
            <h2 style="color:${primaryColor}">Detailed Student Scores (Page ${idx + 1}/${studentPages.length})</h2>
        </header>

        <section-title>Score Table</section-title>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem;">
            <thead>
                <tr style="background: #F8FAFC; border-bottom: 2px solid #E2E8F0;">
                    <th style="padding: 2mm; text-align: left;">SNo</th>
                    <th style="padding: 2mm; text-align: left;">Student Id</th>
                    <th style="background: #FEF9C3; padding: 2mm; text-align: left;">Overall</th>
                    <th style="padding: 2mm; text-align: left;">Eng Grade</th>
                    <th style="padding: 2mm; text-align: left;">Math Grade</th>
                    <th style="padding: 2mm; text-align: left;">Sci Grade</th>
                </tr>
            </thead>
            <tbody>
                ${page.map((r, i) => `
                    <tr style="border-bottom: 1px solid #F1F5F9;">
                        <td style="padding: 1.5mm 2mm;">${idx * studentsPerPage + i + 1}</td>
                        <td style="padding: 1.5mm 2mm; font-weight: 700;">${r.rollNo}</td>
                        <td style="padding: 1.5mm 2mm; background: #FEF9C3;"><span style="display: inline-block; padding: 0.5mm 2mm; border-radius: 1mm; font-weight: 800; font-size: 0.65rem; background:${getGradeBg(r.reportData?.relative_grading?.overall?.grade)}; color:${getGradeColor(r.reportData?.relative_grading?.overall?.grade)}">${r.reportData?.relative_grading?.overall?.grade || '-'}</span></td>
                        <td style="padding: 1.5mm 2mm;"><span style="display: inline-block; padding: 0.5mm 2mm; border-radius: 1mm; font-weight: 800; font-size: 0.65rem; background:${getGradeBg(r.reportData?.relative_grading?.english?.grade)}; color:${getGradeColor(r.reportData?.relative_grading?.english?.grade)}">${r.reportData?.relative_grading?.english?.grade || '-'}</span></td>
                        <td style="padding: 1.5mm 2mm;"><span style="display: inline-block; padding: 0.5mm 2mm; border-radius: 1mm; font-weight: 800; font-size: 0.65rem; background:${getGradeBg(r.reportData?.relative_grading?.maths?.grade)}; color:${getGradeColor(r.reportData?.relative_grading?.maths?.grade)}">${r.reportData?.relative_grading?.maths?.grade || '-'}</span></td>
                        <td style="padding: 1.5mm 2mm;"><span style="display: inline-block; padding: 0.5mm 2mm; border-radius: 1mm; font-weight: 800; font-size: 0.65rem; background:${getGradeBg(r.reportData?.relative_grading?.science?.grade)}; color:${getGradeColor(r.reportData?.relative_grading?.science?.grade)}">${r.reportData?.relative_grading?.science?.grade || '-'}</span></td>
                    </tr>`).join('')}
            </tbody>
        </table>

        <footer-logos>
            <div class="partner"><label>Assessment Partner</label><img src="${nsfLogo}"></div>
            <div class="page-num">Page ${idx + 2}</div>
            <div class="partner" style="text-align: right;"><label>Implementation Partner</label><img src="${viswamLogo}"></div>
        </footer-logos>
    </div>`).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page { size: A4; margin: 0; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; color: #1e293b; }
        .page { width: 210mm; height: 297mm; padding: 10mm; box-sizing: border-box; background: white; display: flex; flex-direction: column; page-break-after: always; position: relative; }
        header { text-align: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 3mm; margin-bottom: 5mm; }
        .logos { display: flex; justify-content: center; margin-bottom: 2mm; }
        .logo-fdr { height: 12mm; }
        h1 { margin: 0; font-size: 1.1rem; text-transform: uppercase; font-weight: 800; color: ${primaryColor}; }
        h2 { margin: 1mm 0; font-size: 0.9rem; font-weight: 700; color: ${accentColor}; }
        .meta { display: flex; justify-content: center; gap: 4mm; font-size: 0.7rem; color: #64748B; }
        section-title { font-size: 0.8rem; font-weight: 800; color: ${primaryColor}; border-left: 4mm solid ${primaryColor}; padding-left: 2mm; margin: 3mm 0; text-transform: uppercase; display: block; }
        .card { background: #fff; border: 1px solid #E2E8F0; border-radius: 2mm; }
        .big-val { font-weight: 900; color: ${primaryColor}; }
        .label { font-size: 0.55rem; text-transform: uppercase; color: #64748B; font-weight: 700; margin-top: 1mm; }
        .grading-scale { margin-top: auto; border-top: 1px solid #E2E8F0; padding-top: 3mm; }
        .grading-scale h4 { font-size: 0.65rem; color: ${primaryColor}; margin: 0 0 2mm 0; }
        .ranges-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5mm; }
        .range-item { padding: 1.5mm; border-radius: 1mm; text-align: center; border: 1px solid #0002; }
        .range-item .g { font-weight: 900; font-size: 0.75rem; }
        .range-item .p { font-size: 0.55rem; font-weight: 700; }
        .range-item .d { font-size: 0.45rem; opacity: 0.8; }
        footer-logos { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 3mm; border-top: 1px solid #E2E8F0; }
        .partner img { height: 8mm; display: block; }
        .partner label { font-size: 0.5rem; text-transform: uppercase; font-weight: 800; color: #94A3B8; margin-bottom: 1mm; display: block; }
        .page-num { font-size: 0.7rem; color: #94A3B8; font-weight: 700; }
    </style>
</head>
<body>
    ${page1}
    ${detailPages}
</body>
</html>`;
};

// --- CONTROLLERS ---

export const renderReportHtml = async (req, res) => {
    try {
        const { id } = req.params;
        const html = await getReportHtmlString(id);
        res.send(html);
    } catch (error) {
        console.error('Error rendering HTML report:', error);
        res.status(500).send('Error rendering report');
    }
};

export const renderPrincipalReportHtml = async (req, res) => {
    try {
        const { schoolId } = req.params;
        const { assessmentName } = req.query;
        const reports = await StudentReport.findAll({ where: { schoolId, assessmentName } });
        if (!reports || reports.length === 0) throw new Error('No reports found');
        const schoolInfo = await SchoolInfo.findOne({ where: { schoolId } });
        const html = await getPrincipalReportHtmlString(reports, schoolInfo, assessmentName, reports[0].qp);
        res.send(html);
    } catch (error) {
        console.error('Error rendering Principal HTML report:', error);
        res.status(500).send('Error rendering principal report');
    }
};
