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

export const getPrincipalReportHtmlString = async (reports, schoolInfo, assessmentName, qp) => {
    if (!reports || reports.length === 0) {
        throw new Error('No reports provided for PDF generation');
    }

    const schoolName = schoolInfo?.schoolName || reports[0]?.schoolName || 'Unknown School';
    const totalRegistered = schoolInfo?.registered || reports.length;
    const totalParticipated = schoolInfo?.participated || reports.length;
    const grade = reports[0]?.class || '7';

    const fdrLogo = getBase64Image('fdr-logo-new.png');
    const nsfLogo = getBase64Image('NSF logo 2.jpeg');
    const viswamLogo = getBase64Image('Viswam.png');

    const primaryColor = '#1e3a8a';
    const accentColor = '#dc2626';

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

    // Calculate Grade Distribution
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

    // Aggregate LOs
    const getAggregatedLOs = (subjectKey, isStrength) => {
        const aggregated = {};
        const mapping = reports[0]?.reportData?.lo_mapping?.[subjectKey] || {};

        reports.forEach(r => {
            const scores = r.reportData?.[subjectKey] || r.reportData?.[`${subjectKey}_score`] || {};
            // If it's a simple object with codes
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
            .sort((a, b) => isStrength ? b.avg - a.avg : a.avg - b.avg)
            .slice(0, 5);
    };

    const sections = ['english', 'maths', 'science'].map(s => ({
        key: s,
        label: s.charAt(0).toUpperCase() + s.slice(1),
        strengths: getAggregatedLOs(s, true),
        improvements: getAggregatedLOs(s, false)
    }));

    // Pagination
    const studentsPerPage = 20;
    const studentPages = [];
    const sortedReports = [...reports].sort((a, b) => Number(a.rollNo) - Number(b.rollNo));
    for (let i = 0; i < sortedReports.length; i += studentsPerPage) {
        studentPages.push(sortedReports.slice(i, i + studentsPerPage));
    }

    // Attention Lists
    const getAttention = (subjectKey) => {
        return reports.filter(r => {
            const g = subjectKey === 'overall' 
                ? r.reportData?.relative_grading?.overall?.grade 
                : r.reportData?.relative_grading?.[subjectKey]?.grade;
            return ['C', 'D'].includes(g);
        }).sort((a, b) => Number(a.rollNo) - Number(b.rollNo)).slice(0, 15);
    };

    const page1 = `
    <div class="page">
        <header>
            <div class="logos"><img src="${fdrLogo}" class="logo-fdr"></div>
            <h1>Foundation for Democratic Reforms</h1>
            <h2 style="color:${primaryColor}">Student Performance Report</h2>
            <div class="meta">
                <span><b>School:</b> ${schoolName}</span> • 
                <span><b>Assessment:</b> ${assessmentName}${qp ? ` - ${qp}` : ''}</span> • 
                <span><b>Grade:</b> ${grade}</span>
            </div>
        </header>

        <section-title>Performance Summary</section-title>
        <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 5mm; margin-bottom: 5mm;">
            <div class="card" style="text-align: center; display: flex; align-items: center; justify-content: center; gap: 5mm;">
                <div><div class="big-val">${totalRegistered}</div><div class="label">Registered</div></div>
                <div style="width:1px; height:10mm; background:#CBD5E1"></div>
                <div><div class="big-val">${totalParticipated}</div><div class="label">Participated</div></div>
            </div>
            <div class="card" style="padding: 3mm 4mm; height: 30mm;">
                <div style="display: flex; align-items: flex-end; justify-content: space-between; height: 24mm; width: 100%;">
                    ${distData.map(d => `
                        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%;">
                            <div style="font-size: 0.65rem; font-weight: 800; color: #1e293b; margin-bottom: 1mm; opacity: 0.9;">${d.c}</div>
                            <div style="width: 80%; max-width: 10mm; height: ${(d.c / maxCount) * 15}mm; min-height: ${d.c > 0 ? '0.5mm' : '0'}; background: ${d.color}; border-radius: 1mm 1mm 0 0;"></div>
                            <div style="font-size: 0.7rem; font-weight: 800; color: ${primaryColor}; margin-top: 1.5mm;">${d.g}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <section-title>Focus Areas & Remarks</section-title>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin-bottom: 5mm;">
            ${sections.map(s => `
                <div class="card" style="padding: 2mm;">
                    <div style="text-align: center; font-weight: 800; font-size: 0.75rem; color: ${primaryColor}; border-bottom: 2px solid ${primaryColor}20; padding-bottom: 1mm; margin-bottom: 2mm;">${s.label}</div>
                    ${s.strengths.length > 0 ? `
                        <div class="lo-title" style="color:#15803d">✅ Strengths</div>
                        <ul>${s.strengths.map(i => `<li>${i.text}</li>`).join('')}</ul>
                    ` : ''}
                    ${s.improvements.length > 0 ? `
                        <div class="lo-title" style="color:#b45309">⚠️ Areas for Development</div>
                        <ul>${s.improvements.map(i => `<li>${i.text}</li>`).join('')}</ul>
                    ` : ''}
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
                        <div class="g">${r.g}</div><div class="p">${r.p}</div><div class="d">${r.d}</div>
                    </div>
                `).join('')}
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
        <table>
            <thead>
                <tr>
                    <th>SNo</th>
                    <th>Student Id</th>
                    <th style="background: #FEF9C3;">Overall</th>
                    <th>Eng Grade</th>
                    <th>Math Grade</th>
                    <th>Sci Grade</th>
                </tr>
            </thead>
            <tbody>
                ${page.map((r, i) => `
                    <tr>
                        <td>${idx * studentsPerPage + i + 1}</td>
                        <td style="font-weight: 700;">${r.rollNo}</td>
                        <td style="background: #FEF9C3;"><span class="badge" style="background:${getGradeBg(r.reportData?.relative_grading?.overall?.grade)}; color:${getGradeColor(r.reportData?.relative_grading?.overall?.grade)}">${r.reportData?.relative_grading?.overall?.grade || '-'}</span></td>
                        <td><span class="badge" style="background:${getGradeBg(r.reportData?.relative_grading?.english?.grade)}; color:${getGradeColor(r.reportData?.relative_grading?.english?.grade)}">${r.reportData?.relative_grading?.english?.grade || '-'}</span></td>
                        <td><span class="badge" style="background:${getGradeBg(r.reportData?.relative_grading?.maths?.grade)}; color:${getGradeColor(r.reportData?.relative_grading?.maths?.grade)}">${r.reportData?.relative_grading?.maths?.grade || '-'}</span></td>
                        <td><span class="badge" style="background:${getGradeBg(r.reportData?.relative_grading?.science?.grade)}; color:${getGradeColor(r.reportData?.relative_grading?.science?.grade)}">${r.reportData?.relative_grading?.science?.grade || '-'}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <footer-logos>
            <div class="partner"><label>Assessment Partner</label><img src="${nsfLogo}"></div>
            <div class="page-num">Page ${idx + 2}</div>
            <div class="partner" style="text-align: right;"><label>Implementation Partner</label><img src="${viswamLogo}"></div>
        </footer-logos>
    </div>`).join('');

    const attentionPage = `
    <div class="page">
        <header>
            <div class="logos"><img src="${fdrLogo}" class="logo-fdr"></div>
            <h1>Foundation for Democratic Reforms</h1>
            <h2 style="color:${accentColor}">Students Needing Attention (Grade C & D)</h2>
        </header>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5mm;">
            ${['overall', 'english', 'maths', 'science'].map(key => `
                <div class="card" style="padding: 2mm;">
                    <div style="font-weight: 800; font-size: 0.8rem; color:${primaryColor}; border-bottom: 1px solid #E2E8F0; margin-bottom: 2mm;">${key.toUpperCase()}</div>
                    <table class="small-table">
                        <thead><tr><th>SNo</th><th>Student Id</th><th>Grade</th></tr></thead>
                        <tbody>
                            ${getAttention(key).map((r, i) => `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td>${r.rollNo}</td>
                                    <td style="color:${getGradeColor(key === 'overall' ? r.reportData?.relative_grading?.overall?.grade : r.reportData?.relative_grading?.[key]?.grade)}; font-weight:800;">${(key === 'overall' ? r.reportData?.relative_grading?.overall?.grade : r.reportData?.relative_grading?.[key]?.grade) || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `).join('')}
        </div>

        <footer-logos>
            <div class="partner"><label>Assessment Partner</label><img src="${nsfLogo}"></div>
            <div class="page-num">Page ${studentPages.length + 2}</div>
            <div class="partner" style="text-align: right;"><label>Implementation Partner</label><img src="${viswamLogo}"></div>
        </footer-logos>
    </div>`;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page { size: A4; margin: 0; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; color: #1e293b; background: #f1f5f9; }
        .page { width: 210mm; height: 297mm; padding: 10mm; box-sizing: border-box; background: white; display: flex; flex-direction: column; page-break-after: always; position: relative; }
        header { text-align: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 3mm; margin-bottom: 5mm; }
        .logos { display: flex; justify-content: center; margin-bottom: 2mm; }
        .logo-fdr { height: 12mm; }
        h1 { margin: 0; font-size: 1.1rem; text-transform: uppercase; font-weight: 800; }
        h2 { margin: 1mm 0; font-size: 0.9rem; font-weight: 700; }
        .meta { display: flex; justify-content: center; gap: 4mm; font-size: 0.7rem; color: #64748B; }
        
        section-title { font-size: 0.8rem; font-weight: 800; color: ${primaryColor}; border-left: 4mm solid ${primaryColor}; padding-left: 2mm; margin: 3mm 0; text-transform: uppercase; display: block; }
        
        .card { background: #fff; border: 1px solid #E2E8F0; border-radius: 2mm; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .big-val { font-size: 1.8rem; font-weight: 900; color: ${primaryColor}; line-height: 1; }
        .label { font-size: 0.55rem; text-transform: uppercase; color: #64748B; font-weight: 700; margin-top: 1mm; }

        .lo-title { font-size: 0.65rem; font-weight: 800; margin: 2mm 0 1mm 0; }
        ul { margin: 0; padding-left: 4mm; font-size: 0.55rem; color: #334155; }
        li { margin-bottom: 0.5mm; }

        table { width: 100%; border-collapse: collapse; font-size: 0.75rem; margin-top: 2mm; }
        th { background: #F8FAFC; color: ${primaryColor}; padding: 2mm; text-align: left; border-bottom: 2px solid #E2E8F0; }
        td { padding: 1.5mm 2mm; border-bottom: 1px solid #F1F5F9; }
        .badge { display: inline-block; padding: 0.5mm 2mm; border-radius: 1mm; font-weight: 800; font-size: 0.65rem; min-width: 6mm; text-align: center; }

        .small-table th { font-size: 0.6rem; padding: 1mm; }
        .small-table td { font-size: 0.6rem; padding: 1mm; }

        .grading-scale { margin-top: auto; border-top: 1px solid #E2E8F0; padding-top: 3mm; }
        .grading-scale h4 { font-size: 0.65rem; color: ${primaryColor}; margin: 0 0 2mm 0; }
        .ranges-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5mm; }
        .range-item { padding: 1.5mm; border-radius: 1mm; text-align: center; border: 1px solid #0002; }
        .range-item .g { font-weight: 900; font-size: 0.75rem; }
        .range-item .p { font-size: 0.55rem; font-weight: 700; }
        .range-item .d { font-size: 0.45rem; color: inherit; opacity: 0.8; }

        footer-logos { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 3mm; border-top: 1px solid #E2E8F0; }
        .partner img { height: 8mm; display: block; }
        .partner label { font-size: 0.5rem; text-transform: uppercase; font-weight: 800; color: #94A3B8; margin-bottom: 1mm; display: block; }
        .page-num { font-size: 0.7rem; color: #94A3B8; font-weight: 700; }
    </style>
</head>
<body>
    ${page1}
    ${detailPages}
    ${attentionPage}
</body>
</html>`;
};

export const renderReportHtml = async (req, res) => {
    try {
        const { id } = req.params;
        const report = await StudentReport.findByPk(id);
        if (!report) throw new Error('Report not found');
        
        const schoolInfo = await SchoolInfo.findOne({ where: { schoolId: report.schoolId } });
        const html = await getPrincipalReportHtmlString([report], schoolInfo, report.assessmentName, report.qp);
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
        
        const reports = await StudentReport.findAll({
            where: { schoolId, assessmentName }
        });
        
        if (!reports || reports.length === 0) throw new Error('No reports found for this school/assessment');
        
        const schoolInfo = await SchoolInfo.findOne({ where: { schoolId } });
        const html = await getPrincipalReportHtmlString(reports, schoolInfo, assessmentName, reports[0].qp);
        res.send(html);
    } catch (error) {
        console.error('Error rendering Principal HTML report:', error);
        res.status(500).send('Error rendering principal report');
    }
};
