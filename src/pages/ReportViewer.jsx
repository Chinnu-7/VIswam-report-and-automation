import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import api from '../api/axios';
import ReportCard from '../components/ReportCard';
import { ArrowLeft, Loader, AlertTriangle } from 'lucide-react';

const ReportViewer = () => {
    const { id, '*': extra } = useParams();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const decodedExtra = extra ? decodeURIComponent(extra) : '';

    const [report, setReport] = useState(null);
    const [allSchoolReports, setAllSchoolReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const userInfoString = localStorage.getItem('userInfo');
    const userInfo = userInfoString ? JSON.parse(userInfoString) : null;
    const config = userInfo ? {
        headers: { Authorization: `Bearer ${userInfo.token}` }
    } : {};

    // Forcing view mode to principal 
    const viewMode = 'principal';
    const defaultSchool = queryParams.get('school') || 'Vignyan';
    const defaultAssessment = queryParams.get('assessment') || 'Sodhana 1';

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch the main report (or representative one)
                const res = await api.get(`/reports/${id}`, config);
                const mainReport = res.data;
                setReport(mainReport);

                // 2. Since this is now always principal view, fetch all reports for this school and assessment
                let endpoint = `/reports?schoolId=${mainReport.schoolId}`;
                if (mainReport.assessmentName) {
                    endpoint += `&assessmentName=${encodeURIComponent(mainReport.assessmentName)}`;
                }
                const allRes = await api.get(endpoint, config);
                setAllSchoolReports(allRes.data);

                setLoading(false);
            } catch (err) {
                console.error(err);
                setError('Failed to load report. Access might be restricted or the server is down.');
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    // Auto-print logic for downloads
    useEffect(() => {
        if (!loading && !error && queryParams.get('download') === 'true') {
            // Small delay to ensure charts are rendered
            const timer = setTimeout(() => {
                window.print();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [loading, error]);

    if (loading) return (
        <div className="flex flex-col h-screen items-center justify-center bg-slate-900 text-emerald-400">
            <Loader className="animate-spin mb-4" size={48} />
            <span className="text-xl font-light tracking-wide animate-pulse">Generating Report Preview...</span>
        </div>
    );

    if (error || !report) return (
        <div className="flex h-screen items-center justify-center flex-col gap-6 bg-slate-50 text-slate-500">
            <div className="p-6 bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Unavailable</h2>
                <p className="text-slate-500 mb-6">{error || 'Report not found'}</p>
                <Link to="/" className="px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition flex items-center font-medium">
                    <ArrowLeft className="mr-2" size={18} /> Back to Portal
                </Link>
            </div>
        </div>
    );

    // Format data for ReportCard, safely checking if it is an array
    const studentDataList = Array.isArray(allSchoolReports) ? allSchoolReports.map(r => ({
        studentName: r?.studentName || 'Unknown Name',
        rollNo: r?.rollNo || '-',
        class: r?.class || '-',
        reportData: r?.reportData || {},
        schoolName: r?.schoolName || defaultSchool
    })) : [];

    const finalSchoolName = report?.schoolName || defaultSchool;
    const finalAssessmentName = report?.assessmentName || defaultAssessment;
    const finalQp = decodedExtra || queryParams.get('qp') || report?.qp || '';
    const isDownload = queryParams.get('download') === 'true';

    return (
        <div className="min-h-screen bg-slate-800 flex flex-col">
            {/* Navbar for Viewer */}
            <div className="glass-nav sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700 text-white px-6 py-4 flex justify-between items-center shadow-lg no-print">
                <Link to="/" className="flex items-center text-slate-400 hover:text-white transition group">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center mr-3 group-hover:bg-primary group-hover:text-white transition-colors">
                        <ArrowLeft size={16} />
                    </div>
                    <span className="font-medium">Back to Portal</span>
                </Link>

                <div className="flex flex-col items-center">
                    <h1 className="text-lg font-bold text-white tracking-wide">
                        {finalSchoolName}
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end text-[10px] text-slate-400 leading-tight">
                        <span className="uppercase font-bold tracking-tighter">{finalSchoolName}</span>
                        <span>{finalAssessmentName}{finalQp ? ` - ${finalQp}` : ''}</span>
                    </div>
                </div>
            </div>

            {/* Report Container */}
            <div className="flex-1 overflow-auto p-4 flex justify-center bg-pattern">
                <div className="shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <ReportCard
                        students={studentDataList}
                        viewMode={viewMode}
                        schoolName={finalSchoolName}
                        assessmentName={finalAssessmentName}
                        qp={finalQp}
                    />
                </div>
            </div>
        </div>
    );
};

export default ReportViewer;
