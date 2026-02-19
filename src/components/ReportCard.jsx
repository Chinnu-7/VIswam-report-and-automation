import fdrLogo from '../assets/fdr-logo-new.png';
import nsfLogo from '../assets/NSF logo 2.jpeg';
import viswamLogo from '../assets/Viswam.png';
import GradeCard from './GradeCard';
import { Printer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, PieChart, Pie } from 'recharts';

export default function ReportCard({ students, viewMode = 'principal', schoolName = 'Vignyan', assessmentName = 'Sodhana 1', qp = '' }) {
    const primaryColor = '#1e3a8a'; // Navy Blue
    const accentColor = '#dc2626'; // Red

    const handlePrint = () => {
        window.print();
    };


    // Real Student Data (Fallback if no props)
    // DEBUG: Log incoming students prop
    console.log('ReportCard Received Students:', students ? students.length : 'None', students);

    const fallbackData = [
        { name: "L Veeresh", grade: 7, eng: 26.67, math: 40.00, sci: 46.67 },
        { name: "M Samuel", grade: 7, eng: 26.67, math: 33.33, sci: 6.67 },
        { name: 'Loading...', english: 0, maths: 0, science: 0 },
    ];

    const studentData = (students && students.length > 0) ? students.map(s => ({
        name: s.studentName || s.name,
        rollNo: s.rollNo,
        grade: s.class || s.grade || 7,
        english: Number(s.reportData?.english_score) || 0,
        maths: Number(s.reportData?.maths_score) || 0,
        science: Number(s.reportData?.science_score) || 0,
        relative_grading: s.reportData?.relative_grading || null
    })).sort((a, b) => Number(a.rollNo) - Number(b.rollNo)) : [];

    const subLabels = {
        english: 'English',
        maths: 'Mathematics',
        science: 'Science'
    };

    const totalRegistered = studentData.length > 0 ? studentData.length : 27;
    const totalParticipated = studentData.length > 0 ? studentData.length : 27;

    const participationData = [
        { grade: 7, registered: totalRegistered, participated: totalParticipated, percent: 100 },
    ];

    // Subject Colors
    const colors = {
        english: '#4338ca',
        maths: '#15803d',
        science: '#b45309'
    };

    // Calculate Averages from Real Data - Explicitly using percentage scores
    const calculateAverage = (subjectKey) => {
        if (studentData.length === 0) return 0;
        const total = studentData.reduce((acc, curr) => {
            const val = Number(curr[subjectKey]); // already mapped to english_score, etc.
            return acc + (isNaN(val) ? 0 : val);
        }, 0);
        return (total / studentData.length).toFixed(2);
    };

    const englishAvg = calculateAverage('english');
    const mathAvg = calculateAverage('maths');
    const scienceAvg = calculateAverage('science');

    console.log('Averages:', { englishAvg, mathAvg, scienceAvg });

    const chartData = [
        { subject: 'English', performance: Number(englishAvg), color: colors.english },
        { subject: 'Mathematics', performance: Number(mathAvg), color: colors.maths },
        { subject: 'Science', performance: Number(scienceAvg), color: colors.science }
    ];

    // Aggregated LO Logic for Principal View or Individual for Student View
    const getDynamicLOs = (studentOrStudents, subjectKey, isStrength = true, limit = 5) => {
        const studentsList = Array.isArray(studentOrStudents) ? studentOrStudents : (studentOrStudents ? [studentOrStudents] : []);
        if (studentsList.length === 0) return [];

        const aggregatedScores = {};
        const mapping = studentsList[0]?.reportData?.lo_mapping?.[subjectKey] || {};

        studentsList.forEach(s => {
            const scores = s.reportData?.[subjectKey] || {};
            Object.entries(scores).forEach(([code, score]) => {
                if (!aggregatedScores[code]) aggregatedScores[code] = { total: 0, count: 0 };
                aggregatedScores[code].total += score;
                aggregatedScores[code].count += 1;
            });
        });

        return Object.entries(aggregatedScores)
            .map(([code, data]) => ({
                code,
                avgScore: data.total / data.count
            }))
            .filter(({ avgScore }) => isStrength ? avgScore >= 0.75 : (avgScore < 0.5 && avgScore >= 0))
            .sort((a, b) => isStrength ? b.avgScore - a.avgScore : a.avgScore - b.avgScore)
            .slice(0, limit)
            .map(({ code, avgScore }) => {
                const text = mapping[code] || code;
                return `${text}`;
            });
    };

    // School-wide LOs for Principal View
    const englishStrengths = getDynamicLOs(students, 'english', true);
    const mathStrengths = getDynamicLOs(students, 'maths', true);
    const scienceStrengths = getDynamicLOs(students, 'science', true);

    const englishImprovements = getDynamicLOs(students, 'english', false, 7);
    const mathImprovements = getDynamicLOs(students, 'maths', false, 7);
    const scienceImprovements = getDynamicLOs(students, 'science', false, 7);

    const renderTopicList = (title, items, color, isStrength = false) => {
        if (!items || items.length === 0) return null;

        return (
            <div style={{ marginBottom: '0.2rem' }}>
                <h5 style={{
                    fontSize: '0.75rem',
                    margin: '0 0 0.1rem 0',
                    color: isStrength ? '#15803d' : '#b45309', // Green for Strength, Amber for Improvement
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    fontWeight: '600'
                }}>
                    {isStrength ? '✅ Strengths' : '⚠️ Areas for Development (AOD)'}
                </h5>
                <ul style={{ margin: 0, paddingLeft: '1rem', listStyleType: 'disc', fontSize: '0.65rem', color: '#334155' }}>
                    {items.map((item, idx) => {
                        const parts = item.split(/[:]/);
                        const text = parts[0];
                        const score = parts[1] || '';
                        return (
                            <li key={idx} style={{ marginBottom: '0.1rem', paddingLeft: '0.2rem' }}>
                                <span>{text}</span>
                                {score && <span style={{ fontWeight: 'bold', color: isStrength ? '#166534' : '#b45309', fontSize: '0.65rem', marginLeft: '0.2rem' }}>{score}</span>}
                            </li>
                        );
                    })}
                </ul>
            </div>
        );
    };

    const getGradeColor = (grade) => {
        if (!grade) return '#64748B';
        const g = grade.toUpperCase();
        if (g === 'O') return '#ffffff'; // White text on dark green
        if (['A+', 'A', 'B+'].includes(g)) return '#15803d'; // Rich green
        if (['B', 'C+', 'C'].includes(g)) return '#ea580c'; // Orange
        if (g === 'D') return '#dc2626'; // Red
        return '#64748B';
    };

    const getGradeBg = (grade) => {
        if (!grade) return '#F1F5F9';
        const g = grade.toUpperCase();
        if (g === 'O') return '#064e3b'; // DARK GREEN
        if (g === 'A+') return '#dcfce7'; // Light green
        if (g === 'A') return '#f0fdf4'; // Very light green
        if (g === 'B+') return '#f0f9ff'; // Light blue-ish green for variety
        if (g === 'B') return '#fff7ed'; // Very light orange
        if (g === 'C+') return '#ffedd5'; // Light orange
        if (g === 'C') return '#fed7aa'; // Orange
        if (g === 'D') return '#fef2f2'; // Light red
        return '#F1F5F9';
    };

    const RelativeGradingTable = ({ compact = false }) => {
        const ranges = [
            { grade: 'O', range: '91-100%', desc: 'Outstanding', color: getGradeColor('O'), bg: getGradeBg('O') },
            { grade: 'A+', range: '80-90%', desc: 'Excellent', color: getGradeColor('A+'), bg: getGradeBg('A+') },
            { grade: 'A', range: '70-79%', desc: 'Very Good', color: getGradeColor('A'), bg: getGradeBg('A') },
            { grade: 'B+', range: '60-69%', desc: 'Good', color: getGradeColor('B+'), bg: getGradeBg('B+') },
            { grade: 'B', range: '50-59%', desc: 'Above Avg', color: getGradeColor('B'), bg: getGradeBg('B') },
            { grade: 'C+', range: '40-49%', desc: 'Average', color: getGradeColor('C+'), bg: getGradeBg('C+') },
            { grade: 'C', range: '30-39%', desc: 'Below Avg', color: getGradeColor('C'), bg: getGradeBg('C') },
            { grade: 'D', range: '< 30%', desc: 'Needs Imp.', color: getGradeColor('D'), bg: getGradeBg('D') },
        ];

        return (
            <div style={{ marginTop: compact ? '1rem' : '1.5rem', marginBottom: compact ? '0.5rem' : '1rem' }}>
                <h4 style={{ fontSize: compact ? '0.65rem' : '0.8rem', color: primaryColor, marginBottom: '0.3rem', fontWeight: 'bold' }}>
                    GRADING SCALE
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5mm' }}>
                    {ranges.map((r, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: '1px 2px',
                            borderRadius: '3px',
                            backgroundColor: r.bg,
                            border: `0.5px solid ${r.color}40`
                        }}>
                            <span style={{ fontWeight: 'bold', color: r.color, fontSize: '0.7rem' }}>{r.grade}</span>
                            <span style={{ fontSize: '0.5rem', color: '#1e293b', fontWeight: '600' }}>{r.range}</span>
                            <span style={{ fontSize: '0.45rem', color: '#475569', textAlign: 'center', lineHeight: '1' }}>{r.desc}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };


    return (
        <div className="report-wrapper" style={{
            backgroundColor: '#525659', // Dark background for PDF viewer feel
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '0.4rem', // Significantly reduced padding
            gap: '0.5rem' // Significantly reduced gap
        }}>



            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100%;
                        height: auto !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    * {
                        opacity: 1 !important;
                        visibility: visible !important;
                        animation: none !important;
                        transition: none !important;
                        transform: none !important;
                    }
                    .no-print { display: none !important; }
                    .report-wrapper {
                        padding: 0 !important;
                        margin: 0 !important;
                        background-color: white !important;
                        display: block !important;
                        width: 100% !important;
                        height: auto !important;
                        overflow: visible !important;
                    }
                    .page {
                        width: 210mm !important;
                        min-height: 295mm !important;
                        box-sizing: border-box !important;
                        display: flex !important;
                        flex-direction: column !important;
                        margin: 0 !important;
                        padding: 10mm !important;
                        position: relative !important;
                        background: white !important;
                        overflow: visible !important;
                        page-break-after: always !important;
                        break-after: always !important;
                    }
                    .page-content {
                        flex: 1 !important;
                        padding-bottom: 35mm !important;
                        overflow: visible !important;
                        box-sizing: border-box !important;
                    }
                    .page-footer {
                        position: absolute !important;
                        bottom: 10mm !important;
                        left: 10mm !important;
                        right: 10mm !important;
                        height: 25mm !important;
                        background: white !important;
                        border-top: 1px solid #e2e8f0 !important;
                        padding-top: 2mm !important;
                        display: flex !important;
                        flex-direction: row !important;
                        justify-content: space-between !important;
                        align-items: flex-end !important;
                        z-index: 100 !important;
                        box-sizing: border-box !important;
                        page-break-inside: avoid !important;
                    }
                }
                .page {
                    width: 210mm;
                    min-height: 296mm;
                    background-color: white;
                    box-shadow: 0 0 20px rgba(0,0,0,0.3);
                    margin: 10px auto;
                    position: relative;
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                }
                .page-content {
                    flex: 1;
                    padding: 8mm 10mm 35mm 10mm; /* More relaxed screen padding */
                    box-sizing: border-box;
                }
                .page-footer {
                    position: absolute;
                    bottom: 8mm;
                    left: 10mm;
                    right: 10mm;
                    height: 25mm;
                    background: white;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 2mm;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    z-index: 100;
                    box-sizing: border-box;
                }
            `}</style>

            {/* PRINCIPAL VIEW: School Overview */}
            {viewMode === 'principal' && (
                <div className="page">
                    {/* Header */}
                    <header style={{
                        borderBottom: `2px solid ${primaryColor} `,
                        paddingBottom: '0.1rem',
                        marginBottom: '0.2rem',
                        textAlign: 'center',
                        position: 'relative' // Added for absolute positioning of print button
                    }}>
                        {/* Print Button - Moved to Header */}
                        <button
                            onClick={handlePrint}
                            style={{
                                position: 'absolute',
                                top: '0',
                                right: '0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.4rem 0.8rem',
                                backgroundColor: '#F1F5F9', // Subtle background
                                color: primaryColor,
                                borderRadius: '6px',
                                cursor: 'pointer',
                                border: `1px solid ${primaryColor}`,
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                transition: 'all 0.2s ease'
                            }}
                            className="no-print hover-lift"
                            title="Print Report"
                        >
                            <Printer size={14} />
                            Print
                        </button>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '1rem',
                            marginBottom: '0.2rem'
                        }}>
                            <img
                                src={fdrLogo}
                                alt="FDR Logo"
                                style={{ height: '60px', objectFit: 'contain' }}
                            />
                            <h1 style={{
                                margin: 0,
                                color: primaryColor,
                                fontSize: '1.4rem',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                lineHeight: '1.2'
                            }}>
                                Foundation for Democratic Reforms <span style={{ fontSize: '1.1rem', color: accentColor, fontWeight: '600' }}>(FDR)</span>
                            </h1>
                        </div>
                        <h2 style={{ fontSize: '1.1rem', margin: '0.2rem 0', fontWeight: '600', color: '#475569' }}>
                            School Performance Report
                        </h2>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '1.5rem',
                            fontSize: '0.85rem',
                            color: '#64748B',
                            marginTop: '0.5rem',
                            flexWrap: 'wrap'
                        }}>
                            <span><strong>School:</strong> {schoolName}</span>
                            <span>•</span>
                            <span><strong>Assessment:</strong> {qp || assessmentName || 'PSA PILOT'}</span>
                            <span>•</span>
                            <span><strong>Date:</strong> 06 JAN 2026</span>
                            <span>•</span>
                            <span><strong>Grade:</strong> {studentData[0]?.grade || 7}</span>
                        </div>
                    </header>

                    {/* Overview Section */}
                    <div className="page-content">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.8rem', marginBottom: '0.8rem' }}>

                            {/* Participation - Gauge Style */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <h3 style={{ fontSize: '1rem', margin: '0 0 0.3rem 0', color: primaryColor, borderLeft: `4px solid ${primaryColor}`, paddingLeft: '0.5rem' }}>Participation</h3>

                                <div style={{
                                    backgroundColor: '#F8FAFC',
                                    borderRadius: '8px',
                                    padding: '1.2rem',
                                    border: '1px solid #E2E8F0',
                                    textAlign: 'center',
                                    height: '180px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center'
                                }}>
                                    <div style={{ height: '100px', width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[{ value: 100 }]}
                                                    cx="50%"
                                                    cy="100%"
                                                    startAngle={180}
                                                    endAngle={0}
                                                    innerRadius={65}
                                                    outerRadius={85}
                                                    fill={primaryColor}
                                                    stroke="none"
                                                    dataKey="value"
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div style={{
                                            position: 'absolute',
                                            top: '60%',
                                            left: '50%',
                                            transform: 'translate(-50%, -10%)',
                                            textAlign: 'center',
                                            width: '100%'
                                        }}>
                                            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: primaryColor, lineHeight: '1' }}>{totalParticipated} / {totalRegistered}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 'bold', marginTop: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendance</div>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '0.8rem', fontSize: '0.7rem', color: '#64748B', fontWeight: 'medium' }}>
                                        Students successfully participated in this assessment
                                    </div>
                                </div>
                            </div>

                            {/* Student Performance Breakdown - Grade Distribution Graph */}
                            <div>
                                <h3 style={{ fontSize: '1rem', margin: '0 0 0.5rem 0', color: primaryColor, borderLeft: `4px solid ${primaryColor}`, paddingLeft: '0.5rem' }}>Overall Grade Distribution</h3>
                                <div style={{
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    height: '150px',
                                    backgroundColor: 'white',
                                    padding: '0.8rem'
                                }}>
                                    {(() => {
                                        const gradeDistribution = studentData.reduce((acc, curr) => {
                                            const grade = curr.relative_grading?.overall?.grade || 'D';
                                            acc[grade] = (acc[grade] || 0) + 1;
                                            return acc;
                                        }, {});

                                        const distributionData = [
                                            { grade: 'O', count: gradeDistribution['O'] || 0, color: '#15803d' },
                                            { grade: 'A+', count: gradeDistribution['A+'] || 0, color: '#15803d' },
                                            { grade: 'A', count: gradeDistribution['A'] || 0, color: '#15803d' },
                                            { grade: 'B+', count: gradeDistribution['B+'] || 0, color: '#15803d' },
                                            { grade: 'B', count: gradeDistribution['B'] || 0, color: '#ea580c' },
                                            { grade: 'C+', count: gradeDistribution['C+'] || 0, color: '#ea580c' },
                                            { grade: 'C', count: gradeDistribution['C'] || 0, color: '#ea580c' },
                                            { grade: 'D', count: gradeDistribution['D'] || 0, color: '#dc2626' }
                                        ];

                                        return (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={distributionData}
                                                    margin={{ top: 30, right: 10, left: -20, bottom: 0 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="grade" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                                    <Tooltip cursor={{ fill: 'transparent' }} />
                                                    <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={35} legendType="none">
                                                        <LabelList dataKey="count" position="top" fontSize={12} fontWeight="bold" />
                                                        {
                                                            distributionData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                                            ))
                                                        }
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        );
                                    })()}
                                </div>
                            </div>

                        </div>

                        {/* Focus Areas */}
                        <div>
                            <h3 style={{ fontSize: '1rem', margin: '0 0 0.5rem 0', color: primaryColor, borderLeft: `4px solid ${primaryColor}`, paddingLeft: '0.5rem' }}>Focus Areas & Remarks</h3>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem', alignItems: 'start' }}>

                                {/* English */}
                                <div>
                                    <div style={{ textAlign: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: `2px solid ${colors.english}` }}>
                                        <h4 style={{ margin: 0, color: colors.english, textTransform: 'uppercase', fontSize: '0.9rem' }}>English</h4>
                                    </div>
                                    <div style={{ border: '1px solid #F1F5F9', borderRadius: '8px', padding: '0.8rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                        {renderTopicList('✅ Strengths', englishStrengths, colors.english, true)}
                                        {englishStrengths.length > 0 && englishImprovements.length > 0 && <div style={{ height: '1.5rem' }}></div>}
                                        {renderTopicList('⚠️ Areas for Development (AOD)', englishImprovements, colors.english, false)}
                                    </div>
                                </div>

                                {/* Math */}
                                <div>
                                    <div style={{ textAlign: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: `2px solid ${colors.maths}` }}>
                                        <h4 style={{ margin: 0, color: colors.maths, textTransform: 'uppercase', fontSize: '0.9rem' }}>Mathematics</h4>
                                    </div>
                                    <div style={{ border: '1px solid #F1F5F9', borderRadius: '8px', padding: '0.8rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                        {renderTopicList('✅ Strengths', mathStrengths, colors.maths, true)}
                                        {mathStrengths.length > 0 && mathImprovements.length > 0 && <div style={{ height: '1.5rem' }}></div>}
                                        {renderTopicList('⚠️ Areas for Development (AOD)', mathImprovements, colors.maths, false)}
                                    </div>
                                </div>

                                {/* Science */}
                                <div>
                                    <div style={{ textAlign: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: `2px solid ${colors.science}` }}>
                                        <h4 style={{ margin: 0, color: colors.science, textTransform: 'uppercase', fontSize: '0.9rem' }}>Science</h4>
                                    </div>
                                    <div style={{ border: '1px solid #F1F5F9', borderRadius: '8px', padding: '0.8rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                        {renderTopicList('✅ Strengths', scienceStrengths, colors.science, true)}
                                        {scienceStrengths.length > 0 && scienceImprovements.length > 0 && <div style={{ height: '1.5rem' }}></div>}
                                        {renderTopicList('⚠️ Areas for Development (AOD)', scienceImprovements, colors.science, false)}
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Relative Grading Key in Principal Overview */}
                        <div style={{ marginTop: 'auto' }}>
                            <RelativeGradingTable compact={true} />
                        </div>
                    </div>

                    <div className="page-footer">
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                            <span style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>Assessment Partner</span>
                            <img src={nsfLogo} alt="NSF" style={{ height: '35px', objectFit: 'contain' }} />
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 'bold' }}>Page 1</span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            <span style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>Implementation Partner</span>
                            <img src={viswamLogo} alt="Viswam" style={{ height: '30px', objectFit: 'contain' }} />
                        </div>
                    </div>
                </div>
            )
            }

            {/* PRINCIPAL VIEW PAGE 2+: Student Details (Paginated) */}
            {
                viewMode === 'principal' && (
                    /* Helper to chunk the data */
                    (() => {
                        const itemsPerPage = 7; // Reduced to 7 for perpetual safety
                        const chunks = [];
                        if (studentData.length === 0) {
                            chunks.push([]);
                        } else {
                            for (let i = 0; i < studentData.length; i += itemsPerPage) {
                                chunks.push(studentData.slice(i, i + itemsPerPage));
                            }
                        }

                        return (
                            <>
                                {chunks.map((chunk, pageIndex) => (
                                    <div key={`principal-page-${pageIndex}`} className="page">
                                        <div className="page-content">
                                            <header style={{ borderBottom: `2px solid ${primaryColor}`, paddingBottom: '0.4rem', marginBottom: '1rem', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.2rem' }}>
                                                    <img src={fdrLogo} alt="FDR Logo" style={{ height: '50px', objectFit: 'contain' }} />
                                                    <h1 style={{ margin: 0, color: primaryColor, fontSize: '1.2rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                                        Foundation for Democratic Reforms
                                                    </h1>
                                                </div>
                                                <h2 style={{ fontSize: '1.1rem', margin: '0.5rem 0', fontWeight: '600', color: '#475569' }}>Student Performance Report</h2>
                                            </header>

                                            <h3 style={{ fontSize: '1rem', margin: '0 0 1rem 0', color: primaryColor, borderLeft: `4px solid ${primaryColor}`, paddingLeft: '0.5rem' }}>
                                                Detailed Student Scores {chunks.length > 1 ? `(Page ${pageIndex + 1}/${chunks.length})` : ''}
                                            </h3>

                                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1rem' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                                    <thead>
                                                        <tr style={{ backgroundColor: '#F1F5F9', color: '#1e293b', textAlign: 'left' }}>
                                                            <th style={{ padding: '0.6rem', borderBottom: '2px solid #e2e8f0' }}>Roll No</th>
                                                            <th style={{ padding: '0.6rem', borderBottom: '2px solid #e2e8f0' }}>Student Name</th>
                                                            <th style={{ padding: '0.6rem', borderBottom: '2px solid #e2e8f0', backgroundColor: '#FEF3C7' }}>Overall</th>
                                                            <th style={{ padding: '0.6rem', borderBottom: '2px solid #e2e8f0' }}>Eng Grade</th>
                                                            <th style={{ padding: '0.6rem', borderBottom: '2px solid #e2e8f0' }}>Math Grade</th>
                                                            <th style={{ padding: '0.6rem', borderBottom: '2px solid #e2e8f0' }}>Sci Grade</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {chunk.map((student, idx) => (
                                                            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                                <td style={{ padding: '0.6rem', fontSize: '0.75rem', color: '#64748B' }}>{student.rollNo}</td>
                                                                <td style={{ padding: '0.6rem', fontWeight: '500' }}>{student.name}</td>
                                                                <td style={{ padding: '0.6rem' }}>
                                                                    <span style={{
                                                                        backgroundColor: getGradeBg(student.relative_grading?.overall?.grade),
                                                                        color: getGradeColor(student.relative_grading?.overall?.grade),
                                                                        padding: '2px 8px',
                                                                        borderRadius: '4px',
                                                                        fontWeight: 'bold',
                                                                        fontSize: '0.75rem',
                                                                        border: `1px solid ${getGradeColor(student.relative_grading?.overall?.grade)}40`
                                                                    }}>{student.relative_grading?.overall?.grade ?? '-'}</span>
                                                                </td>
                                                                <td style={{ padding: '0.6rem' }}>
                                                                    <span style={{
                                                                        backgroundColor: getGradeBg(student.relative_grading?.english?.grade),
                                                                        color: getGradeColor(student.relative_grading?.english?.grade),
                                                                        padding: '2px 8px',
                                                                        borderRadius: '4px',
                                                                        fontWeight: 'bold',
                                                                        fontSize: '0.75rem',
                                                                        border: `1px solid ${getGradeColor(student.relative_grading?.english?.grade)}40`
                                                                    }}>{student.relative_grading?.english?.grade || '-'}</span>
                                                                </td>
                                                                <td style={{ padding: '0.6rem' }}>
                                                                    <span style={{
                                                                        backgroundColor: getGradeBg(student.relative_grading?.maths?.grade),
                                                                        color: getGradeColor(student.relative_grading?.maths?.grade),
                                                                        padding: '2px 8px',
                                                                        borderRadius: '4px',
                                                                        fontWeight: 'bold',
                                                                        fontSize: '0.75rem',
                                                                        border: `1px solid ${getGradeColor(student.relative_grading?.maths?.grade)}40`
                                                                    }}>{student.relative_grading?.maths?.grade || '-'}</span>
                                                                </td>
                                                                <td style={{ padding: '0.6rem' }}>
                                                                    <span style={{
                                                                        backgroundColor: getGradeBg(student.relative_grading?.science?.grade),
                                                                        color: getGradeColor(student.relative_grading?.science?.grade),
                                                                        padding: '2px 8px',
                                                                        borderRadius: '4px',
                                                                        fontWeight: 'bold',
                                                                        fontSize: '0.75rem',
                                                                        border: `1px solid ${getGradeColor(student.relative_grading?.science?.grade)}40`
                                                                    }}>{student.relative_grading?.science?.grade || '-'}</span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <div className="page-footer">
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                                                <span style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>Assessment Partner</span>
                                                <img src={nsfLogo} alt="NSF" style={{ height: '35px', objectFit: 'contain' }} />
                                            </div>
                                            <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 'bold' }}>Page {pageIndex + 2}</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                                <span style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>Implementation Partner</span>
                                                <img src={viswamLogo} alt="Viswam" style={{ height: '30px', objectFit: 'contain' }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Dedicated "Students Needing Attention" Page at the very end */}
                                <div className="page">
                                    <div className="page-content">
                                        <header style={{ borderBottom: `2px solid ${primaryColor}`, paddingBottom: '0.4rem', marginBottom: '1rem', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.2rem' }}>
                                                <img src={fdrLogo} alt="FDR Logo" style={{ height: '50px', objectFit: 'contain' }} />
                                                <h1 style={{ margin: 0, color: primaryColor, fontSize: '1.2rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                                    Foundation for Democratic Reforms
                                                </h1>
                                            </div>
                                        </header>

                                        <h3 style={{ fontSize: '1rem', margin: '1rem 0 0.8rem 0', color: accentColor, borderLeft: `4px solid ${accentColor}`, paddingLeft: '0.5rem' }}>Students Needing Attention (Grade C & D)</h3>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flex: 1 }}>
                                            {/* Overall Attention */}
                                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem', display: 'flex', flexDirection: 'column' }}>
                                                <h4 style={{ fontSize: '0.85rem', color: primaryColor, marginBottom: '0.5rem', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.2rem' }}>Overall Performance</h4>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                                    <thead>
                                                        <tr style={{ backgroundColor: '#FFF1F2', color: '#991B1B', textAlign: 'left' }}>
                                                            <th style={{ padding: '0.4rem', borderBottom: '1px solid #FECACA' }}>Roll No</th>
                                                            <th style={{ padding: '0.4rem', borderBottom: '1px solid #FECACA' }}>Student Name</th>
                                                            <th style={{ padding: '0.4rem', borderBottom: '1px solid #FECACA' }}>Grade</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {studentData.filter(s => ['C', 'D'].includes(s.relative_grading?.overall?.grade)).map((student, idx) => (
                                                            <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                                                <td style={{ padding: '0.4rem', color: '#64748B' }}>{student.rollNo}</td>
                                                                <td style={{ padding: '0.4rem', fontWeight: '500' }}>{student.name}</td>
                                                                <td style={{ padding: '0.4rem' }}>
                                                                    <span style={{ backgroundColor: getGradeBg(student.relative_grading?.overall?.grade), color: getGradeColor(student.relative_grading?.overall?.grade), padding: '1px 6px', borderRadius: '3px', fontWeight: 'bold', fontSize: '0.7rem' }}>
                                                                        {student.relative_grading?.overall?.grade}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* English Attention */}
                                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem', display: 'flex', flexDirection: 'column' }}>
                                                <h4 style={{ fontSize: '0.85rem', color: colors.english, marginBottom: '0.5rem', fontWeight: 'bold', borderBottom: `1px solid ${colors.english}20`, paddingBottom: '0.2rem' }}>English</h4>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                                    <thead>
                                                        <tr style={{ backgroundColor: `${colors.english}10`, color: colors.english, textAlign: 'left' }}>
                                                            <th style={{ padding: '0.4rem', borderBottom: `1px solid ${colors.english}20` }}>Roll No</th>
                                                            <th style={{ padding: '0.4rem', borderBottom: `1px solid ${colors.english}20` }}>Student Name</th>
                                                            <th style={{ padding: '0.4rem', borderBottom: `1px solid ${colors.english}20` }}>Grade</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {studentData.filter(s => ['C', 'D'].includes(s.relative_grading?.english?.grade)).map((student, idx) => (
                                                            <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                                                <td style={{ padding: '0.4rem', color: '#64748B' }}>{student.rollNo}</td>
                                                                <td style={{ padding: '0.4rem', fontWeight: '500' }}>{student.name}</td>
                                                                <td style={{ padding: '0.4rem' }}>
                                                                    <span style={{ backgroundColor: getGradeBg(student.relative_grading?.english?.grade), color: getGradeColor(student.relative_grading?.english?.grade), padding: '1px 6px', borderRadius: '3px', fontWeight: 'bold', fontSize: '0.7rem' }}>
                                                                        {student.relative_grading?.english?.grade}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Mathematics Attention */}
                                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem', display: 'flex', flexDirection: 'column' }}>
                                                <h4 style={{ fontSize: '0.85rem', color: colors.maths, marginBottom: '0.5rem', fontWeight: 'bold', borderBottom: `1px solid ${colors.maths}20`, paddingBottom: '0.2rem' }}>Mathematics</h4>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                                    <thead>
                                                        <tr style={{ backgroundColor: `${colors.maths}10`, color: colors.maths, textAlign: 'left' }}>
                                                            <th style={{ padding: '0.4rem', borderBottom: `1px solid ${colors.maths}20` }}>Roll No</th>
                                                            <th style={{ padding: '0.4rem', borderBottom: `1px solid ${colors.maths}20` }}>Student Name</th>
                                                            <th style={{ padding: '0.4rem', borderBottom: `1px solid ${colors.maths}20` }}>Grade</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {studentData.filter(s => ['C', 'D'].includes(s.relative_grading?.maths?.grade)).map((student, idx) => (
                                                            <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                                                <td style={{ padding: '0.4rem', color: '#64748B' }}>{student.rollNo}</td>
                                                                <td style={{ padding: '0.4rem', fontWeight: '500' }}>{student.name}</td>
                                                                <td style={{ padding: '0.4rem' }}>
                                                                    <span style={{ backgroundColor: getGradeBg(student.relative_grading?.maths?.grade), color: getGradeColor(student.relative_grading?.maths?.grade), padding: '1px 6px', borderRadius: '3px', fontWeight: 'bold', fontSize: '0.7rem' }}>
                                                                        {student.relative_grading?.maths?.grade}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Science Attention */}
                                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem', display: 'flex', flexDirection: 'column' }}>
                                                <h4 style={{ fontSize: '0.85rem', color: colors.science, marginBottom: '0.5rem', fontWeight: 'bold', borderBottom: `1px solid ${colors.science}20`, paddingBottom: '0.2rem' }}>Science</h4>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                                    <thead>
                                                        <tr style={{ backgroundColor: `${colors.science}10`, color: colors.science, textAlign: 'left' }}>
                                                            <th style={{ padding: '0.4rem', borderBottom: `1px solid ${colors.science}20` }}>Roll No</th>
                                                            <th style={{ padding: '0.4rem', borderBottom: `1px solid ${colors.science}20` }}>Student Name</th>
                                                            <th style={{ padding: '0.4rem', borderBottom: `1px solid ${colors.science}20` }}>Grade</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {studentData.filter(s => ['C', 'D'].includes(s.relative_grading?.science?.grade)).map((student, idx) => (
                                                            <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                                                <td style={{ padding: '0.4rem', color: '#64748B' }}>{student.rollNo}</td>
                                                                <td style={{ padding: '0.4rem', fontWeight: '500' }}>{student.name}</td>
                                                                <td style={{ padding: '0.4rem' }}>
                                                                    <span style={{ backgroundColor: getGradeBg(student.relative_grading?.science?.grade), color: getGradeColor(student.relative_grading?.science?.grade), padding: '1px 6px', borderRadius: '3px', fontWeight: 'bold', fontSize: '0.7rem' }}>
                                                                        {student.relative_grading?.science?.grade}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="page-footer">
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                                            <span style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>Assessment Partner</span>
                                            <img src={nsfLogo} alt="NSF" style={{ height: '35px', objectFit: 'contain' }} />
                                        </div>
                                        <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 'bold' }}>Final Page</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                            <span style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>Implementation Partner</span>
                                            <img src={viswamLogo} alt="Viswam" style={{ height: '30px', objectFit: 'contain' }} />
                                        </div>
                                    </div>
                                </div>
                            </>
                        );
                    })()
                )
            }

            {/* STUDENT VIEW: Individual Report Card */}
            {
                viewMode === 'student' && students && students.map((student, sIdx) => (
                    <div key={sIdx} className="page">
                        <div className="page-content">
                            <header style={{ borderBottom: `2px solid ${primaryColor}`, paddingBottom: '0.1rem', marginBottom: '0.4rem', textAlign: 'center', position: 'relative' }}>
                                <button onClick={handlePrint} style={{ position: 'absolute', top: '0', right: '0', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', backgroundColor: '#F1F5F9', color: primaryColor, borderRadius: '6px', cursor: 'pointer', border: `1px solid ${primaryColor}`, fontSize: '0.8rem', fontWeight: '600' }} className="no-print">
                                    <Printer size={14} /> Print
                                </button>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.4rem' }}>
                                    <img src={fdrLogo} alt="FDR Logo" style={{ height: '60px', objectFit: 'contain' }} />
                                    <h1 style={{ margin: 0, color: primaryColor, fontSize: '1.3rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Foundation for Democratic Reforms</h1>
                                </div>
                                <h2 style={{ fontSize: '1.1rem', margin: '0.1rem 0', fontWeight: '700', color: accentColor }}>Student Achievement Report</h2>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: '1.5rem',
                                    fontSize: '0.75rem',
                                    color: '#64748B',
                                    marginTop: '0.1rem',
                                    marginBottom: '0.4rem',
                                    flexWrap: 'wrap'
                                }}>
                                    <span><strong>Grade:</strong> {student.class || student.grade}</span>
                                    <span>•</span>
                                    <span><strong>Assessment:</strong> {qp || assessmentName || 'PSA PILOT'}</span>
                                    <span>•</span>
                                    <span><strong>Date:</strong> 06 JAN 2026</span>
                                </div>
                            </header>

                            <div className="page-content">
                                <div style={{ display: 'grid', gap: '0.4rem', marginBottom: '0.4rem', backgroundColor: '#F8FAFC', padding: '0.6rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 'bold', marginBottom: '0.1rem' }}>Student Name</div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>{student.studentName || student.name}</div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 'bold' }}>Roll No</div>
                                            <div style={{ fontSize: '1rem', fontWeight: '700' }}>{student.rollNo}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 'bold' }}>School</div>
                                            <div style={{ fontSize: '1rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={schoolName}>{schoolName}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 'bold' }}>Grade</div>
                                            <div style={{ fontSize: '1rem', fontWeight: '700' }}>{student.class || student.grade}</div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '0.4rem' }}>
                                    <h3 style={{ fontSize: '0.85rem', margin: '0 0 0.2rem 0', color: primaryColor, borderLeft: `5px solid ${primaryColor}`, paddingLeft: '0.8rem', fontWeight: 'bold' }}>Subject Performance</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                                        {[
                                            { key: 'english', label: 'English', score: student.reportData?.english_score || 0, color: colors.english },
                                            { key: 'maths', label: 'Mathematics', score: student.reportData?.maths_score || 0, color: colors.maths },
                                            { key: 'science', label: 'Science', score: student.reportData?.science_score || 0, color: colors.science }
                                        ].map((sub, i) => {
                                            const rel = student.reportData?.relative_grading?.[sub.key];
                                            return (
                                                <div key={i} style={{ textAlign: 'center', padding: '0.4rem', borderRadius: '12px', border: `2px solid ${sub.color}20`, backgroundColor: `${sub.color}05`, position: 'relative' }}>
                                                    <div style={{ color: sub.color, fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.6rem', marginBottom: '0.1rem' }}>{sub.label} Performance</div>
                                                    <div style={{
                                                        fontSize: '2rem',
                                                        fontWeight: '900',
                                                        color: getGradeColor(rel?.grade),
                                                        lineHeight: '1',
                                                        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                    }}>{rel?.grade || '-'}</div>


                                                    <div style={{ height: '4px', width: '100%', backgroundColor: '#E2E8F0', borderRadius: '3px', marginTop: '0.4rem', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${sub.score}%`, backgroundColor: sub.color, borderRadius: '3px' }}></div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                    <h3 style={{ fontSize: '0.85rem', margin: '0 0 0.2rem 0', color: primaryColor, borderLeft: `5px solid ${primaryColor}`, paddingLeft: '0.8rem', fontWeight: 'bold' }}>Learning Outcomes & Skills</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', flex: 1, minHeight: 0 }}>
                                        {['english', 'maths', 'science'].map(subKey => (
                                            <div key={subKey} style={{ border: '1px solid #F1F5F9', borderRadius: '10px', padding: '0.3rem', backgroundColor: 'white', overflow: 'hidden' }}>
                                                <div style={{ fontWeight: 'bold', color: colors[subKey], textTransform: 'uppercase', fontSize: '0.65rem', marginBottom: '0.2rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.1rem' }}>
                                                    {subLabels[subKey]}
                                                </div>
                                                <div style={{ fontSize: '0.65rem' }}>
                                                    {(() => {
                                                        const strengths = getDynamicLOs(student, subKey, true);
                                                        const improvements = getDynamicLOs(student, subKey, false);
                                                        return (
                                                            <>
                                                                {renderTopicList('Strengths', strengths, colors[subKey], true)}
                                                                {strengths.length > 0 && improvements.length > 0 && <div style={{ height: '0.2rem' }}></div>}
                                                                {renderTopicList('Areas for Development (AOD)', improvements, colors[subKey], false)}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ marginTop: '0.4rem' }}>
                                        <RelativeGradingTable compact={true} />
                                    </div>
                                </div>

                            </div>
                        </div>

                        <footer className="page-footer">
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                                <span style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>Assessment Partner</span>
                                <img src={nsfLogo} alt="NSF" style={{ height: '35px', objectFit: 'contain' }} />
                            </div>
                            <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 'bold' }}>Student View</span>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                <span style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 'bold', textTransform: 'uppercase' }}>Implementation Partner</span>
                                <img src={viswamLogo} alt="Viswam" style={{ height: '30px', objectFit: 'contain' }} />
                            </div>
                        </footer>
                    </div>
                ))
            }

        </div>
    );
}
