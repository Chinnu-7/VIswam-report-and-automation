import fdrLogo from '../assets/fdr-logo-new.png';
import nsfLogo from '../assets/NSF logo 2.jpeg';
import viswamLogo from '../assets/Viswam.png';
import GradeCard from './GradeCard';
import { Printer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, PieChart, Pie } from 'recharts';

export default function ReportCard({ students, viewMode = 'principal', schoolName = 'Vignyan', assessmentName = 'Sodhana 1' }) {
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
    })) : [];

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
    const getDynamicLOs = (studentOrStudents, subjectKey, isStrength = true) => {
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
            .slice(0, 5)
            .map(({ code, avgScore }) => {
                const text = mapping[code] || code;
                const percentage = Math.round(avgScore * 100);
                return `${text} : ${percentage}%`;
            });
    };

    // School-wide LOs for Principal View
    const englishStrengths = getDynamicLOs(students, 'english', true);
    const mathStrengths = getDynamicLOs(students, 'maths', true);
    const scienceStrengths = getDynamicLOs(students, 'science', true);

    const englishImprovements = getDynamicLOs(students, 'english', false);
    const mathImprovements = getDynamicLOs(students, 'maths', false);
    const scienceImprovements = getDynamicLOs(students, 'science', false);

    const renderTopicList = (title, items, color, isStrength = false) => {
        if (!items || items.length === 0) return null;

        return (
            <div style={{ marginBottom: '0.4rem' }}>
                <h5 style={{
                    fontSize: '0.75rem',
                    margin: '0 0 0.3rem 0',
                    color: isStrength ? '#15803d' : '#b45309', // Green for Strength, Amber for Improvement
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
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
                            <li key={idx} style={{ marginBottom: '0.2rem', paddingLeft: '0.2rem' }}>
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
        if (['S+', 'S', 'A+', 'A'].includes(g)) return '#15803d'; // Green
        if (['B+', 'B', 'C+'].includes(g)) return '#ea580c'; // Orange
        if (g === 'C') return '#dc2626'; // Red
        return '#64748B';
    };

    const getGradeBg = (grade) => {
        if (!grade) return '#F1F5F9';
        const g = grade.toUpperCase();
        if (g === 'S+') return '#dcfce7';
        if (g === 'S') return '#bbf7d0';
        if (g === 'A+') return '#86efac';
        if (g === 'A') return '#4ade80';
        if (g === 'B+') return '#ffedd5';
        if (g === 'B') return '#fed7aa';
        if (g === 'C+') return '#fdba74';
        if (g === 'C') return '#fee2e2';
        return '#F1F5F9';
    };

    const RelativeGradingTable = ({ compact = false }) => {
        const ranges = [
            { grade: 'S+', range: '91-100%', desc: 'Outstanding', color: getGradeColor('S+'), bg: getGradeBg('S+') },
            { grade: 'S', range: '80-90%', desc: 'Excellent', color: getGradeColor('S'), bg: getGradeBg('S') },
            { grade: 'A+', range: '70-79%', desc: 'Very Good', color: getGradeColor('A+'), bg: getGradeBg('A+') },
            { grade: 'A', range: '60-69%', desc: 'Good', color: getGradeColor('A'), bg: getGradeBg('A') },
            { grade: 'B+', range: '50-59%', desc: 'Above Avg', color: getGradeColor('B+'), bg: getGradeBg('B+') },
            { grade: 'B', range: '40-49%', desc: 'Average', color: getGradeColor('B'), bg: getGradeBg('B') },
            { grade: 'C+', range: '30-39%', desc: 'Below Avg', color: getGradeColor('C+'), bg: getGradeBg('C+') },
            { grade: 'C', range: '< 30%', desc: 'Needs Imp.', color: getGradeColor('C'), bg: getGradeBg('C') },
        ];

        return (
            <div style={{ marginTop: compact ? '0.4rem' : '0.8rem' }}>
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
                        size: A4;
                        margin: 0;
                    }
                    html, body {
                        margin: 0;
                        padding: 0;
                        width: 100%;
                        height: 100%;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print { display: none !important; }
                    .report-wrapper {
                        padding: 0 !important;
                        margin: 0 !important;
                        background-color: white !important;
                        display: block !important;
                        gap: 0 !important;
                        width: 100% !important;
                    }
                    .page {
                        width: 210mm;
                        min-height: 297mm;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                        margin: 0 !important;
                        padding: 5mm !important;
                        page-break-after: always;
                        position: relative;
                        background: white !important;
                    }
                    .page-content {
                        flex: 1 0 auto;
                        margin-bottom: 5mm;
                    }
                    .page-footer {
                        flex-shrink: 0;
                        margin-top: auto;
                        border-top: 1px solid #e2e8f0;
                        padding-top: 5mm;
                        padding-bottom: 5mm;
                    }
                    .page:last-child { 
                        page-break-after: auto; 
                    }
                }
            `}</style>

            {/* PRINCIPAL VIEW: School Overview */}
            {viewMode === 'principal' && (
                <div className="page" style={{
                    width: '210mm',
                    height: '297mm', // Strict A4 Height
                    backgroundColor: 'white',
                    boxShadow: '0 0 20px rgba(0,0,0,0.3)',
                    padding: '1mm', // Minimized padding to bring content to the very top
                    boxSizing: 'border-box',
                    color: '#1e293b',
                    position: 'relative',
                    overflow: 'hidden', // Ensure content stays within paper
                    display: 'flex',
                    flexDirection: 'column'
                }}>
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
                            <span><strong>Assessment:</strong> PSA PILOT</span>
                            <span>•</span>
                            <span><strong>Date:</strong> 06 JAN 2026</span>
                            <span>•</span>
                            <span><strong>Grade:</strong> {studentData[0]?.grade || 7}</span>
                        </div>
                    </header>

                    {/* Overview Section */}
                    <div className="page-content">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.8rem', marginBottom: '0.8rem' }}>

                            {/* Participation - Key Metrics Style */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <h3 style={{ fontSize: '1rem', margin: '0 0 0.5rem 0', color: primaryColor, borderLeft: `4px solid ${primaryColor}`, paddingLeft: '0.5rem' }}>Participation</h3>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr',
                                    gap: '0.8rem'
                                }}>
                                    <div style={{
                                        backgroundColor: '#F8FAFC',
                                        borderRadius: '8px',
                                        padding: '1rem',
                                        border: '1px solid #E2E8F0',
                                        textAlign: 'center'
                                    }}>
                                        <div style={{ height: '85px', width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={[{ value: 100 }]}
                                                        cx="50%"
                                                        cy="100%"
                                                        startAngle={180}
                                                        endAngle={0}
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        fill={primaryColor}
                                                        stroke="none"
                                                        dataKey="value"
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div style={{
                                                position: 'absolute',
                                                top: '50%',
                                                left: '50%',
                                                transform: 'translate(-50%, -20%)',
                                                textAlign: 'center',
                                                width: '100%'
                                            }}>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: primaryColor, lineHeight: '1' }}>100%</div>
                                                <div style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 'bold' }}>Attendance</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                                        <div style={{
                                            backgroundColor: '#FFF',
                                            borderRadius: '8px',
                                            padding: '0.8rem',
                                            border: '1px solid #E2E8F0',
                                            textAlign: 'center'
                                        }}>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b' }}>{totalRegistered}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Registered</div>
                                        </div>
                                        <div style={{
                                            backgroundColor: '#FFF',
                                            borderRadius: '8px',
                                            padding: '0.8rem',
                                            border: '1px solid #E2E8F0',
                                            textAlign: 'center'
                                        }}>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b' }}>{totalParticipated}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#64748B' }}>Participated</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Subject Performance Breakdown - Graph */}
                            <div>
                                <h3 style={{ fontSize: '1rem', margin: '0 0 0.5rem 0', color: primaryColor, borderLeft: `4px solid ${primaryColor}`, paddingLeft: '0.5rem' }}>Subject Performance</h3>
                                <div style={{
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    height: '150px',
                                    backgroundColor: 'white',
                                    padding: '0.8rem'
                                }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={chartData}
                                            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="subject" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{ fill: 'transparent' }} />
                                            <Bar dataKey="performance" radius={[4, 4, 0, 0]} barSize={45}>
                                                <LabelList dataKey="performance" position="top" formatter={(value) => `${value}%`} fontSize={12} fontWeight="bold" />
                                                {
                                                    chartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))
                                                }
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
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

                    <div className="page-footer" style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.7rem',
                        color: '#94A3B8',
                        paddingTop: '0.3rem',
                        pageBreakInside: 'avoid'
                    }}>
                        {/* Left: Assessment Partner */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}>
                            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 'bold' }}>Assessment Partner</span>
                            <img src={nsfLogo} alt="NSF" style={{ height: '45px', objectFit: 'contain' }} />
                        </div>

                        {/* Center: Page Info */}
                        <span>Page 1</span>

                        {/* Right: Implementation Partner */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 'bold' }}>Implementation Partner</span>
                            <img src={viswamLogo} alt="Viswam" style={{ height: '35px', objectFit: 'contain' }} />
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
                        const itemsPerPage = 12; // Further reduced for print safety
                        const chunks = [];
                        if (studentData.length === 0) {
                            // Show at least one empty page structure if no data
                            chunks.push([]);
                        } else {
                            for (let i = 0; i < studentData.length; i += itemsPerPage) {
                                chunks.push(studentData.slice(i, i + itemsPerPage));
                            }
                        }

                        return chunks.map((chunk, pageIndex) => (
                            <div key={`principal-page-${pageIndex}`} className="page" style={{
                                width: '210mm',
                                height: '297mm', // Strict A4 Height
                                backgroundColor: 'white',
                                boxShadow: '0 0 20px rgba(0,0,0,0.3)',
                                padding: '10mm',
                                boxSizing: 'border-box',
                                color: '#1e293b',
                                position: 'relative',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between'
                            }}>
                                <div className="page-content" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', paddingBottom: '1rem' }}>
                                    {/* Header Page 2+ */}
                                    <header style={{ borderBottom: `2px solid ${primaryColor}`, paddingBottom: '0.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.2rem' }}>
                                            <img src={fdrLogo} alt="FDR Logo" style={{ height: '50px', objectFit: 'contain' }} />
                                            <h1 style={{ margin: 0, color: primaryColor, fontSize: '1.2rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                                Foundation for Democratic Reforms
                                            </h1>
                                        </div>
                                        <h2 style={{ fontSize: '1.1rem', margin: '0.5rem 0', fontWeight: '600', color: '#475569' }}>Student Performance Report</h2>
                                    </header>

                                    <h3 style={{ fontSize: '1rem', margin: '0 0 1rem 0', color: primaryColor, borderLeft: `4px solid ${primaryColor}`, paddingLeft: '0.5rem' }}>Detailed Student Scores {chunks.length > 1 ? `(Page ${pageIndex + 1}/${chunks.length})` : ''}</h3>

                                    <div style={{
                                        flex: 1,
                                        // Remove overflowY auto for print
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        marginBottom: '1rem'
                                    }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: '#F1F5F9', color: '#1e293b', textAlign: 'left' }}>
                                                    <th style={{ padding: '0.6rem', borderBottom: '2px solid #e2e8f0' }}>Roll No</th>
                                                    <th style={{ padding: '0.6rem', borderBottom: '2px solid #e2e8f0' }}>Student Name</th>
                                                    <th style={{ padding: '0.6rem', borderBottom: '2px solid #e2e8f0', backgroundColor: '#FEF3C7' }}>Overall</th>
                                                    <th style={{ padding: '0.6rem', borderBottom: '2px solid #e2e8f0', color: '#1e293b' }}>Eng Grade</th>
                                                    <th style={{ padding: '0.6rem', borderBottom: '2px solid #e2e8f0', color: '#1e293b' }}>Math Grade</th>
                                                    <th style={{ padding: '0.6rem', borderBottom: '2px solid #e2e8f0', color: '#1e293b' }}>Sci Grade</th>
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
                                                            }}>
                                                                {student.relative_grading?.overall?.grade ?? '-'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '0.6rem', fontWeight: '700', color: getGradeColor(student.relative_grading?.english?.grade) }}>{student.relative_grading?.english?.grade || '-'}</td>
                                                        <td style={{ padding: '0.6rem', fontWeight: '700', color: getGradeColor(student.relative_grading?.maths?.grade) }}>{student.relative_grading?.maths?.grade || '-'}</td>
                                                        <td style={{ padding: '0.6rem', fontWeight: '700', color: getGradeColor(student.relative_grading?.science?.grade) }}>{student.relative_grading?.science?.grade || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="page-footer" style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '0.7rem',
                                    color: '#94A3B8',
                                    paddingTop: '0.5rem',
                                    marginTop: '0.5rem'
                                }}>
                                    <div>
                                        <img src={nsfLogo} alt="NSF" style={{ height: '30px' }} />
                                    </div>
                                    <span>Page {pageIndex + 2}</span>
                                    <div style={{ textAlign: 'right', fontSize: '0.6rem' }}>
                                        <img src={viswamLogo} alt="Viswam" style={{ height: '25px' }} />
                                    </div>
                                </div>
                            </div>
                        ));
                    })()
                )
            }

            {/* STUDENT VIEW: Individual Report Card */}
            {
                viewMode === 'student' && students && students.map((student, sIdx) => (
                    <div key={sIdx} className="page" style={{
                        width: '210mm',
                        height: '297mm',
                        backgroundColor: 'white',
                        boxShadow: '0 0 20px rgba(0,0,0,0.3)',
                        padding: '5mm',
                        boxSizing: 'border-box',
                        color: '#1e293b',
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <header style={{ borderBottom: `2px solid ${primaryColor}`, paddingBottom: '0.1rem', marginBottom: '0.3rem', textAlign: 'center', position: 'relative' }}>
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
                                <span><strong>Assessment:</strong> PSA PILOT</span>
                                <span>•</span>
                                <span><strong>Date:</strong> 06 JAN 2026</span>
                            </div>
                        </header>

                        <div className="page-content">
                            <div style={{ display: 'grid', gap: '0.6rem', marginBottom: '0.5rem', backgroundColor: '#F8FAFC', padding: '0.8rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                <div>
                                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 'bold', marginBottom: '0.1rem' }}>Student Name</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>{student.studentName || student.name}</div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem' }}>
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
                                <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.3rem 0', color: primaryColor, borderLeft: `5px solid ${primaryColor}`, paddingLeft: '0.8rem', fontWeight: 'bold' }}>Subject Performance</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem' }}>
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
                                <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.3rem 0', color: primaryColor, borderLeft: `5px solid ${primaryColor}`, paddingLeft: '0.8rem', fontWeight: 'bold' }}>Learning Outcomes & Skills</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', flex: 1, minHeight: 0 }}>
                                    {['english', 'maths', 'science'].map(subKey => (
                                        <div key={subKey} style={{ border: '1px solid #F1F5F9', borderRadius: '10px', padding: '0.4rem', backgroundColor: 'white', overflow: 'hidden' }}>
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

                        <footer className="page-footer" style={{
                            marginTop: 'auto',
                            paddingTop: '0.8rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexShrink: 0,
                            backgroundColor: 'white',
                            position: 'relative',
                            zIndex: 10
                        }}>
                            <div>
                                <div style={{ textAlign: 'center' }}>
                                    <img src={nsfLogo} alt="NSF" style={{ height: '50px' }} />
                                    <div style={{ fontSize: '0.55rem', fontWeight: 'bold', color: '#94A3B8', marginTop: '0.1rem' }}>ASSESSMENT PARTNER</div>
                                </div>
                            </div>
                            <div>
                                <div style={{ textAlign: 'center' }}>
                                    <img src={viswamLogo} alt="Viswam" style={{ height: '40px' }} />
                                    <div style={{ fontSize: '0.55rem', fontWeight: 'bold', color: '#94A3B8', marginTop: '0.1rem' }}>IMPLEMENTATION PARTNER</div>
                                </div>
                            </div>
                        </footer>
                    </div >
                ))
            }

        </div >
    );
}
