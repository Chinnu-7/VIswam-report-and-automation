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

// --- GRADING HELPERS (Matching PDF Samples) ---

const getGradeColor = (grade) => {
    if (!grade) return '#64748B';
    const g = String(grade).toUpperCase();
    if (g === 'O') return '#ffffff';
    if (['A+', 'A', 'B+'].includes(g)) return '#15803d';
    if (['B', 'C+', 'C'].includes(g)) return '#ea580c';
    if (g === 'D') return '#dc2626';
    return '#64748B';
};

const getGradeBg = (grade) => {
    if (!grade) return '#F1F5F9';
    const g = String(grade).toUpperCase();
    if (g === 'O') return '#064e3b';
    if (g === 'A+') return '#dcfce7';
    if (g === 'A') return '#f0fdf4';
    if (g === 'B+') return '#f0f9ff';
    if (g === 'B') return '#fff7ed';
    if (g === 'C+') return '#ffedd5';
    if (g === 'C') return '#fed7aa';
    if (g === 'D') return '#fef2f2';
    return '#F1F5F9';
};

// --- INDIVIDUAL STUDENT REPORT (Student Achievement Report) ---

export const getReportHtmlString = async (reportId) => {
    const report = await StudentReport.findByPk(reportId);
    if (!report) throw new Error('Report not found');

    const data = report;
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

// --- PRINCIPAL REPORT (MULTI-PAGE COHORT SUMMARY) ---
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

    const gradeDistribution = reports.reduce((acc, curr) => {
        const g = curr.reportData?.relative_grading?.overall?.grade || 'D';
        acc[g] = (acc[g] || 0) + 1;
        return acc;
    }, {});

    const distData = [
        { g: 'O', c: gradeDistribution['O'] || 0, color: '#064E3B' },
        { g: 'A+', c: gradeDistribution['A+'] || 0, color: '#DCFCE7' },
        { g: 'A', c: gradeDistribution['A'] || 0, color: '#F0FDF4' },
        { g: 'B+', c: gradeDistribution['B+'] || 0, color: '#F0F9FF' },
        { g: 'B', c: gradeDistribution['B'] || 0, color: '#FFF7ED' },
        { g: 'C+', c: gradeDistribution['C+'] || 0, color: '#FFEDD5' },
        { g: 'C', c: gradeDistribution['C'] || 0, color: '#FED7AA' },
        { g: 'D', c: gradeDistribution['D'] || 0, color: '#FEF2F2' }
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
            .sort((a, b) => isStrength ? b.avg - a.avg : a.avg - b.avg).slice(0, 5);
    };

    const sections = [
        { key: 'english', label: 'ENGLISH', color: '#6366F1', strengths: getAggregatedLOs('english', true), improvements: getAggregatedLOs('english', false) },
        { key: 'maths', label: 'MATHEMATICS', color: '#0EA5E9', strengths: getAggregatedLOs('maths', true), improvements: getAggregatedLOs('maths', false) },
        { key: 'science', label: 'SCIENCE', color: '#EC4899', strengths: getAggregatedLOs('science', true), improvements: getAggregatedLOs('science', false) }
    ];

    const getAttention = (subjectKey) => {
        return reports.filter(r => {
            const gradeObj = subjectKey === 'overall' ? r.reportData?.relative_grading?.overall : r.reportData?.relative_grading?.[subjectKey];
            const g = String(gradeObj?.grade || '').toUpperCase();
            return ['C', 'D'].includes(g);
        }).sort((a, b) => Number(a.rollNo) - Number(b.rollNo)).slice(0, 30);
    };

    const studentsPerPage = 25;
    const sortedReports = [...reports].sort((a, b) => Number(a.rollNo) - Number(b.rollNo));
    const toTitleCase = (str) => {
        if (!str) return '';
        return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const studentPages = [];
    for (let i = 0; i < sortedReports.length; i += studentsPerPage) {
        studentPages.push(sortedReports.slice(i, i + studentsPerPage));
    }

    const page1 = `
    <div class="page">
        <header style="border-bottom: none; text-align: center; padding-bottom: 0; margin-bottom: 2mm;">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; gap: 3mm;">
                 <img src="${fdrLogo}" style="height: 16mm; margin-bottom: 1mm;">
                 <div style="text-align: center;">
                    <h1 style="font-size: 1.4rem; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px; margin: 0; line-height: 1.1; text-transform: uppercase;">FOUNDATION FOR DEMOCRATIC REFORMS</h1>
                    <h2 style="font-size: 1.15rem; font-weight: 700; color: #1e3a8a; margin: 2mm 0 0 0;">Student Performance Report</h2>
                 </div>
            </div>
            
            <div style="border-top: 1.2mm solid #1e3a8a; border-bottom: 1.2mm solid #1e3a8a; padding: 2mm 0; margin-top: 3mm; text-align: center; width: 100%;">
                <div style="font-size: 1rem; color: #64748b; font-weight: 500; display: inline-block; white-space: nowrap; margin: 0 auto;">
                    School: <span style="color: #475569;">${toTitleCase(schoolName)}</span> &nbsp;•&nbsp; 
                    District: <span style="color: #475569;">${(schoolInfo?.district || 'Unknown').toUpperCase()}</span> &nbsp;•&nbsp; 
                    State: <span style="color: #475569;">${(schoolInfo?.state || 'Unknown').toUpperCase()}</span> &nbsp;•&nbsp; 
                    Assessment: <span style="color: #475569;">${toTitleCase(assessmentName)}</span> &nbsp;•&nbsp; 
                    Date: <span style="color: #475569;">${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</span> &nbsp;•&nbsp; 
                    Grade: <span style="color: #475569;">${grade}</span>
                </div>
            </div>
        </header>

        <div style="height: 8mm;"></div>

        <div style="display: grid; grid-template-columns: 1fr 1.6fr; gap: 4mm; margin-bottom: 8mm;">
            <!-- Participation Card -->
            <div>
                <div style="display: flex; align-items: center; gap: 4mm; margin: 6mm 0 4mm 0;">
                    <div style="width: 6mm; height: 6mm; background: #1e3a8a;"></div>
                    <h3 style="font-size: 1.4rem; font-weight: 900; color: #1e3a8a; letter-spacing: 0.3px; margin: 0;">PARTICIPATION</h3>
                </div>
                <div style="background: white; border: 1px solid #E2E8F0; border-radius: 4mm; padding: 5mm 2mm; display: flex; align-items: center; justify-content: center; height: 35mm; box-sizing: border-box;">
                    <div style="flex: 1; text-align: center;">
                        <div style="font-size: 2.4rem; font-weight: 800; color: #1e293b; line-height: 1;">${totalRegistered}</div>
                        <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; margin-top: 1.5mm; text-transform: uppercase;">Registered</div>
                    </div>
                    <div style="width: 1px; height: 18mm; background: #E2E8F0;"></div>
                    <div style="flex: 1; text-align: center;">
                        <div style="font-size: 2.4rem; font-weight: 800; color: #1e293b; line-height: 1;">${totalParticipated}</div>
                        <div style="font-size: 0.75rem; font-weight: 700; color: #64748b; margin-top: 1.5mm; text-transform: uppercase;">Participated</div>
                    </div>
                </div>
            </div>

            <!-- Grade Distribution Chart -->
            <div>
                <div style="display: flex; align-items: center; gap: 4mm; margin: 6mm 0 4mm 0;">
                    <div style="width: 6mm; height: 6mm; background: #1e3a8a;"></div>
                    <h3 style="font-size: 1.4rem; font-weight: 900; color: #1e3a8a; letter-spacing: 0.3px; margin: 0;">OVERALL GRADE DISTRIBUTION</h3>
                </div>
                <div style="background: white; border: 1px solid #E2E8F0; border-radius: 4mm; padding: 4mm; height: 35mm; box-sizing: border-box;">
                    <div style="display: flex; align-items: flex-end; justify-content: space-between; height: 100%; width: 100%; padding-bottom: 2mm; box-sizing: border-box;">
                        ${distData.map(d => {
                            const height = (d.c / maxCount) * 18;
                            return `
                            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%;">
                                <div style="font-size: 1rem; font-weight: 800; color: #1e293b; margin-bottom: 1mm;">${d.c}</div>
                                <div style="width: 80%; max-width: 12mm; height: ${height}mm; min-height: ${d.c > 0 ? '1mm' : '0'}; background: ${d.color}; border: 1px solid #0001;"></div>
                                <div style="font-size: 0.8rem; font-weight: 700; color: #64748b; margin-top: 2mm;">${d.g}</div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>
        </div>

        <div style="display: flex; align-items: center; gap: 4mm; margin: 8mm 0 4mm 0;">
             <div style="width: 6mm; height: 6mm; background: #1e3a8a;"></div>
             <h3 style="font-size: 1.3rem; font-weight: 950; color: #1e3a8a; letter-spacing: 0.5px; margin: 0;">FOCUS AREAS & REMARKS</h3>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; margin-bottom: 8mm;">
            ${sections.map((s, idx) => {
                const colors = ['#6366F1', '#0EA5E9', '#EC4899']; // Indigo, Cyan, Pink
                const color = colors[idx];
                return `
                <div style="display: flex; flex-direction: column;">
                    <div style="text-align: center; font-weight: 800; font-size: 1.4rem; color: ${color}; padding: 3mm 1mm; border-bottom: 3.5mm solid ${color}; margin-bottom: 6mm;">${s.label}</div>
                    <div style="background: white; border: 1.5px solid #F1F5F9; border-radius: 6mm; padding: 6mm 4mm; min-height: 85mm; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                        <div style="display: flex; align-items: center; gap: 3mm; margin-bottom: 4mm;">
                             <div style="width: 5mm; height: 5mm; background: #ea580c; clip-path: polygon(50% 0%, 0% 100%, 100% 100%); display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: white; font-weight: 900; padding-top: 0.8mm; box-sizing: border-box;">!</div>
                             <div style="font-size: 1rem; font-weight: 800; color: #ea580c; line-height: 1.2;">Areas for Development (AOD)</div>
                        </div>
                        <ul style="margin: 0; padding-left: 6mm; font-size: 0.9rem; color: #334155; line-height: 1.6; font-weight: 500;">
                            ${s.improvements.length > 0 
                                ? s.improvements.map(i => `<li style="margin-bottom: 2.5mm; padding-left: 2mm;">${i.text}</li>`).join('') 
                                : '<li style="color: #94A3B8; list-style: none; margin-left: -5mm;">General improvement requested.</li>'}
                        </ul>
                    </div>
                </div>`;
            }).join('')}
        </div>

        <!-- Grading Scale Legend -->
        <div style="margin-top: 2mm; border-top: 1.2mm solid #1e3a8a; padding-top: 2mm; margin-bottom: 2mm;">
            <div style="font-size: 0.75rem; color: #1e3a8a; margin-bottom: 2mm; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Grading Scale</div>
            <div style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 1.5mm;">
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
                    <div style="background: ${getGradeBg(r.g)}; color: ${getGradeColor(r.g)}; padding: 1.5mm 0.5mm; border-radius: 1mm; text-align: center; border: 1px solid #0001;">
                        <div style="font-weight: 900; font-size: 0.8rem; line-height: 1;">${r.g}</div>
                        <div style="font-size: 0.55rem; font-weight: 700; margin-top: 0.5mm;">${r.p}</div>
                        <div style="font-size: 0.45rem; color: #64748b; margin-top: 0.5mm;">${r.d}</div>
                    </div>`).join('')}
            </div>
        </div>

        <footer style="margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 4mm; border-top: 1px solid #E2E8F0;">
            <div style="font-size: 0.5rem;"><img src="${nsfLogo}" style="height: 10mm;"></div>
            <div style="font-size: 0.9rem; color: #94A3B8; font-weight: 700;">Page 1</div>
            <div style="text-align: right;"><img src="${viswamLogo}" style="height: 10mm;"></div>
        </footer>
    </div>`;

    const detailPages = studentPages.map((page, idx) => `
    <div class="page">
        <header style="border-bottom: none; text-align: center; padding-bottom: 0; margin-bottom: 2mm;">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; gap: 2mm;">
                 <img src="${fdrLogo}" style="height: 12mm; margin-bottom: 1mm;">
                 <div style="text-align: center;">
                    <h1 style="font-size: 1.2rem; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px; margin: 0; line-height: 1.1; text-transform: uppercase;">FOUNDATION FOR DEMOCRATIC REFORMS</h1>
                    <h2 style="font-size: 1rem; font-weight: 700; color: #1e3a8a; margin: 1.5mm 0 0 0;">Student Performance Report</h2>
                 </div>
            </div>
            
            <div style="border-top: 1mm solid #1e3a8a; border-bottom: 1mm solid #1e3a8a; padding: 1.5mm 0; margin-top: 3mm; text-align: center; width: 100%;">
                <div style="font-size: 0.85rem; color: #64748b; font-weight: 500; display: inline-block; white-space: nowrap; margin: 0 auto;">
                    School: <span style="color: #475569;">${toTitleCase(schoolName)}</span> &nbsp;•&nbsp; 
                    District: <span style="color: #475569;">${(schoolInfo?.district || 'Unknown').toUpperCase()}</span> &nbsp;•&nbsp; 
                    State: <span style="color: #475569;">${(schoolInfo?.state || 'Unknown').toUpperCase()}</span> &nbsp;•&nbsp; 
                    Assessment: <span style="color: #475569;">${assessmentName}</span> &nbsp;•&nbsp; 
                    Date: <span style="color: #475569;">${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</span> &nbsp;•&nbsp; 
                    Grade: <span style="color: #475569;">${grade}</span>
                </div>
            </div>
        </header>

        <section-title style="margin-top: 4mm;">Detailed Student Scores (Page ${idx + 1}/${studentPages.length})</section-title>
        <table style="width: 100%; border-collapse: separate; border-spacing: 0 1mm; font-size: 0.8rem;">
            <thead>
                <tr style="color: ${primaryColor}; font-weight: 700;">
                    <th style="padding: 2.5mm 2mm; text-align: left; border-bottom: 2px solid #F1F5F9;">SNo</th>
                    <th style="padding: 2.5mm 2mm; text-align: left; border-bottom: 2px solid #F1F5F9;">Student Id</th>
                    <th style="background: #FEF9C3; padding: 2.5mm 2mm; text-align: left; border-radius: 1mm 0 0 1mm; border-bottom: 2px solid #F1F5F9;">Overall</th>
                    <th style="padding: 2.5mm 2mm; text-align: left; border-bottom: 2px solid #F1F5F9;">Eng Grade</th>
                    <th style="padding: 2.5mm 2mm; text-align: left; border-bottom: 2px solid #F1F5F9;">Math Grade</th>
                    <th style="padding: 2.5mm 2mm; text-align: left; border-radius: 0 1mm 1mm 0; border-bottom: 2px solid #F1F5F9;">Sci Grade</th>
                </tr>
            </thead>
            <tbody style="font-weight: 500;">
                ${page.map((r, i) => `
                    <tr style="${(i % 2 === 1) ? 'background-color: #f8fafc;' : ''}">
                        <td style="padding: 2mm 2mm; border-bottom: 1px solid #F1F5F9;">${idx * studentsPerPage + i + 1}</td>
                        <td style="padding: 2mm 2mm; border-bottom: 1px solid #F1F5F9; font-weight: 700; color: #1e293b;">${r.rollNo}</td>
                        <td style="padding: 2mm 2mm; border-bottom: 1px solid #F1F5F9; background: ${(i % 2 === 1) ? '#fef9c388' : '#fef9c355'}; border-left: 1px solid #F1F5F9; border-right: 1px solid #F1F5F9;">
                            <span style="display: inline-block; padding: 0.8mm 3mm; border-radius: 1mm; font-weight: 700; font-size: 0.7rem; background:${getGradeBg(r.reportData?.relative_grading?.overall?.grade)}; color:${getGradeColor(r.reportData?.relative_grading?.overall?.grade)}">
                                ${r.reportData?.relative_grading?.overall?.grade || '-'}
                            </span>
                        </td>
                        <td style="padding: 2mm 2mm; border-bottom: 1px solid #F1F5F9;"><span style="display: inline-block; padding: 0.8mm 3mm; border-radius: 1mm; font-weight: 700; font-size: 0.7rem; background:${getGradeBg(r.reportData?.relative_grading?.english?.grade)}; color:${getGradeColor(r.reportData?.relative_grading?.english?.grade)}">${r.reportData?.relative_grading?.english?.grade || '-'}</span></td>
                        <td style="padding: 2mm 2mm; border-bottom: 1px solid #F1F5F9;"><span style="display: inline-block; padding: 0.8mm 3mm; border-radius: 1mm; font-weight: 700; font-size: 0.7rem; background:${getGradeBg(r.reportData?.relative_grading?.maths?.grade)}; color:${getGradeColor(r.reportData?.relative_grading?.maths?.grade)}">${r.reportData?.relative_grading?.maths?.grade || '-'}</span></td>
                        <td style="padding: 2mm 2mm; border-bottom: 1px solid #F1F5F9;"><span style="display: inline-block; padding: 0.8mm 3mm; border-radius: 1mm; font-weight: 700; font-size: 0.7rem; background:${getGradeBg(r.reportData?.relative_grading?.science?.grade)}; color:${getGradeColor(r.reportData?.relative_grading?.science?.grade)}">${r.reportData?.relative_grading?.science?.grade || '-'}</span></td>
                    </tr>`).join('')}
            </tbody>
        </table>

        <footer style="margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 3mm; border-top: 1px solid #E2E8F0;">
            <div style="font-size: 0.5rem;"><img src="${nsfLogo}" style="height: 8mm;"></div>
            <div style="font-size: 0.7rem; color: #94A3B8; font-weight: 700;">Page ${idx + 2}</div>
            <div style="text-align: right;"><img src="${viswamLogo}" style="height: 8mm;"></div>
        </footer>
    </div>`).join('');

    const attentionPage = `
    <div class="page">
        <header style="border-bottom: none; text-align: center; padding-bottom: 0; margin-bottom: 2mm;">
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; gap: 2mm;">
                 <img src="${fdrLogo}" style="height: 12mm; margin-bottom: 1mm;">
                 <div style="text-align: center;">
                    <h1 style="font-size: 1.2rem; font-weight: 800; color: #1e3a8a; letter-spacing: -0.5px; margin: 0; line-height: 1.1; text-transform: uppercase;">FOUNDATION FOR DEMOCRATIC REFORMS</h1>
                    <h2 style="font-size: 1rem; font-weight: 700; color: #1e3a8a; margin: 1.5mm 0 0 0;">Student Performance Report</h2>
                 </div>
            </div>
            
            <div style="border-top: 1mm solid #1e3a8a; border-bottom: 1mm solid #1e3a8a; padding: 1.5mm 0; margin-top: 3mm; text-align: center; width: 100%;">
                <div style="font-size: 0.85rem; color: #64748b; font-weight: 500; display: inline-block; white-space: nowrap; margin: 0 auto;">
                    School: <span style="color: #475569;">${toTitleCase(schoolName)}</span> &nbsp;•&nbsp; 
                    District: <span style="color: #475569;">${(schoolInfo?.district || 'Unknown').toUpperCase()}</span> &nbsp;•&nbsp; 
                    State: <span style="color: #475569;">${(schoolInfo?.state || 'Unknown').toUpperCase()}</span> &nbsp;•&nbsp; 
                    Assessment: <span style="color: #475569;">${assessmentName}</span> &nbsp;•&nbsp; 
                    Date: <span style="color: #475569;">${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</span> &nbsp;•&nbsp; 
                    Grade: <span style="color: #475569;">${grade}</span>
                </div>
            </div>
        </header>

        <section-title style="margin-top: 4mm;">Students Needing Attention (Grade C & D)</section-title>
        <div style="display: flex; flex-wrap: wrap; gap: 4mm;">
            ${['overall', 'english', 'maths', 'science'].map(key => `
                <div class="card" style="flex: 0 0 48%; padding: 3mm; min-height: 40mm; box-sizing: border-box;">
                    <div style="font-weight: 800; font-size: 0.8rem; color:${primaryColor}; border-bottom: 2px solid #E2E8F0; margin-bottom: 2mm; padding-bottom: 1mm;">${key === 'overall' ? 'Overall Performance' : (key.charAt(0).toUpperCase() + key.slice(1))}</div>
                    <table style="width:100%; border-collapse: collapse; font-size: 0.65rem;">
                        <thead>
                            <tr style="border-bottom: 1px solid #E2E8F0; color: #64748B;">
                                <th style="text-align: left; padding: 1mm;">SNo</th>
                                <th style="text-align: left; padding: 1mm;">Student Id</th>
                                <th style="text-align: right; padding: 1mm;">Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${getAttention(key).map((r, i) => {
                                const gradeObj = key === 'overall' ? r.reportData?.relative_grading?.overall : r.reportData?.relative_grading?.[key];
                                const g = String(gradeObj?.grade || '').toUpperCase();
                                return `
                                <tr style="border-bottom: 1px solid #F1F5F9;">
                                    <td style="padding: 1.2mm 1mm;">${i + 1}</td>
                                    <td style="padding: 1.2mm 1mm;">${r.rollNo}</td>
                                    <td style="padding: 1.2mm 1mm; text-align: right; font-weight: 800; color: ${getGradeColor(g)}">${g || '-'}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `).join('')}
        </div>

        <footer style="margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 3mm; border-top: 1px solid #E2E8F0;">
            <div style="font-size: 0.5rem;"><img src="${nsfLogo}" style="height: 8mm;"></div>
            <div style="font-size: 0.7rem; color: #94A3B8; font-weight: 700;">Page ${studentPages.length + 2}</div>
            <div style="text-align: right;"><img src="${viswamLogo}" style="height: 8mm;"></div>
        </footer>
    </div>`;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
        @page { size: A4; margin: 0; }
        body { font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; color: #1e293b; background: #fff; line-height: 1.4; }
        .page { width: 210mm; min-height: 297mm; padding: 12mm; box-sizing: border-box; background: white; display: flex; flex-direction: column; page-break-after: always; position: relative; }
        header { text-align: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 3mm; margin-bottom: 4mm; }
        .logos { display: flex; justify-content: center; margin-bottom: 2mm; }
        .logo-fdr { height: 12mm; }
        h1 { margin: 0; font-size: 1.2rem; text-transform: uppercase; font-weight: 900; color: ${primaryColor}; }
        h2 { margin: 1mm 0; font-size: 1rem; font-weight: 800; color: ${primaryColor}; }
        .meta { display: flex; justify-content: center; gap: 4mm; font-size: 0.8rem; color: #64748B; margin-top: 2mm; }
        section-title { font-size: 0.9rem; font-weight: 900; color: ${primaryColor}; border-left: 5mm solid ${primaryColor}; padding-left: 3mm; margin: 6mm 0; text-transform: uppercase; display: block; }
        .card { background: #fff; border: 1.5px solid #F1F5F9; border-radius: 3mm; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
    </style>
</head>
<body>
    ${page1}
    ${detailPages}
    ${attentionPage}
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
        let schoolInfo = null;
        try {
            schoolInfo = await SchoolInfo.findOne({ where: { schoolId } });
        } catch (err) {
            console.warn('[Render] SchoolInfo fetch failed (likely missing columns):', err.message);
            // Fallback to basic info if the full query fails
            schoolInfo = { schoolName: reports[0]?.schoolName || 'Unknown School' };
        }
        const html = await getPrincipalReportHtmlString(reports, schoolInfo, assessmentName, reports[0].qp);
        res.send(html);
    } catch (error) {
        console.error('Error rendering Principal HTML report:', error);
        res.status(500).send('Error rendering principal report');
    }
};
