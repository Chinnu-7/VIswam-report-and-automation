import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { CheckCircle, XCircle, Trash2, Search, Filter, AlertCircle, FileText, Upload, FileSpreadsheet, FileUp, RefreshCw, Download, LayoutDashboard, CloudUpload, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as xlsx from 'xlsx';

const AdminDashboard = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [filter, setFilter] = useState('PENDING');
    const [searchStudent, setSearchStudent] = useState('');
    const [searchSchool, setSearchSchool] = useState('');
    const [searchAssessment, setSearchAssessment] = useState('');
    const [searchClass, setSearchClass] = useState('');
    const [debouncedStudent, setDebouncedStudent] = useState('');

    const [assessmentName, setAssessmentName] = useState('');
    const [qp, setQp] = useState('');
    const [schoolName, setSchoolName] = useState('');
    const [studentFiles, setStudentFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [forceAll, setForceAll] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [duplicateModal, setDuplicateModal] = useState({ open: false, fileName: '', message: '', grades: [], onConfirm: null });
    const [uploadResults, setUploadResults] = useState([]);

    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const config = {
        headers: { Authorization: `Bearer ${userInfo?.token}` }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedStudent(searchStudent);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchStudent]);

    useEffect(() => {
        fetchReports();
    }, [filter, debouncedStudent, searchSchool, searchAssessment, searchClass]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                status: filter,
                studentName: debouncedStudent,
                schoolName: searchSchool,
                assessmentName: searchAssessment,
                class: searchClass
            }).toString();

            const res = await api.get(`/reports?${query}`, config);

            // Group by School and Assessment
            const grouped = {};
            res.data.forEach(report => {
                const key = `${report.schoolId}_${report.assessmentName}_${report.qp || 'noqp'}`;
                if (!grouped[key]) {
                    grouped[key] = {
                        id: report.schoolId, // Using schoolId as primary key for selection
                        schoolId: report.schoolId,
                        schoolName: report.schoolName,
                        assessmentName: report.assessmentName,
                        qp: report.qp,
                        status: report.status,
                        isEmailSent: false,
                        studentCount: 0,
                        sampleReportId: report.id
                    };
                }
                grouped[key].studentCount += 1;
                if (report.isEmailSent) {
                    grouped[key].isEmailSent = true;
                }
                // NEW: Pass through the joined omrUploadDate
                if (report.school_info) {
                    grouped[key].omrUploadDate = report.school_info.omrUploadDate;
                }
            });

            setReports(Object.values(grouped));
        } catch (err) {
            console.error('Error fetching reports', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRecalculate = async () => {
        if (!assessmentName || !schoolName) {
            setMessage('Error: Select Assessment and enter School Name first');
            setIsError(true);
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/reports/recalculate', {
                assessmentName,
                qp,
                schoolId: schoolName.toUpperCase() // Assuming schoolName maps to schoolId for simplicity or we need a proper mapping
            }, config);
            setMessage(res.data.message);
            setIsError(false);
            fetchReports();
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error('Recalculate error:', err);
            setMessage(err.response?.data?.message || 'Recalculation failed');
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action, ids) => {
        try {
            let endpoint = '/reports/school/approve';
            if (action === 'reject') endpoint = '/reports/school/reject';
            if (action === 'delete') endpoint = '/reports/school/delete';

            await api({
                method: 'post',
                url: endpoint,
                data: { schoolIds: ids },
                ...config
            });

            setMessage(`Successfully ${action}ed reports for ${ids.length} schools`);
            setSelectedIds([]);
            fetchReports();
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error(`Error during ${action}`, err);
        }
    };

    const handleSyncSchools = async () => {
        setLoading(true);
        try {
            setMessage('Syncing schools from Google Sheet...');
            setIsError(false);

            // New Backend-Driven Sync: No need for frontend parsing
            const res = await api.post('/schools/sync-all', {}, config);

            setMessage(`${res.data.message || 'Schools synced successfully.'}`);
            setIsError(false);
            setTimeout(() => setMessage(''), 7000);
        } catch (err) {
            console.error('Sync Error:', err);
            const serverError = err.response?.data?.error || err.response?.data?.message || err.message;
            setMessage('Sync Error: ' + serverError);
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncResults = async () => {
        if (reports.length === 0) {
            setMessage('No reports to sync');
            setIsError(true);
            return;
        }

        setLoading(true);
        try {
            setMessage('Syncing dashboard to PSA Tracker...');
            setIsError(false);
            await api.post('/reports/sync-external', { reports }, config);
            setMessage('Sync to PSA Tracker initiated successfully!');
            setTimeout(() => setMessage(''), 5000);
        } catch (err) {
            console.error('Sync failed', err);
            setMessage('Sync failed: ' + (err.response?.data?.message || err.message));
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleManualDownload = () => {
        if (reports.length === 0) return;

        const data = reports.map(r => ({
            'School ID': r.schoolId,
            'School Name': r.schoolName,
            'Assessment': r.assessmentName,
            'QP': r.qp || 'N/A',
            'Students': r.studentCount,
            'Status': r.status,
            'Notified': r.isEmailSent ? 'SENT' : 'UNSENT'
        }));

        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Reports");
        xlsx.writeFile(wb, `Viswam_Reports_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === reports.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(reports.map(r => r.id));
        }
    };

    const downloadStudentTemplate = () => {
        const row0 = ['', '', 'English', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Mathematics', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Science'];

        const row1 = ['Student Id', 'PaperCode'];
        for (let i = 1; i <= 15; i++) row1.push(i);
        for (let i = 1; i <= 15; i++) row1.push(i);
        for (let i = 1; i <= 15; i++) row1.push(i);

        const sampleData = ['1001', 'SCERT 2'];
        for (let i = 1; i <= 45; i++) sampleData.push('A'); // Sample answers

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.aoa_to_sheet([row0, row1, sampleData]);
        xlsx.utils.book_append_sheet(wb, ws, "Grade 7");
        xlsx.writeFile(wb, "Viswam_Student_Template.xlsx");
    };

    const handleUpload = async () => {
        if (studentFiles.length === 0) return;

        setUploading(true);
        setUploadResults([]);
        let successCount = 0;
        let failCount = 0;
        let totalStudents = 0;
        const results = [];

        try {
            for (let i = 0; i < studentFiles.length; i++) {
                const file = studentFiles[i];
                const formData = new FormData();
                formData.append('file', file);

                // Detection logic per file
                let currentAssessment = assessmentName || 'Sodhana 1';
                let currentSchool = schoolName;
                let currentQp = qp;

                const parts = file.name.split('_');
                if (parts.length >= 2) {
                    let detectedAssessment = parts[0].replace(/(\d+)$/, ' $1');
                    if (['Sodhana 1', 'Sodhana 2', 'Sodhana 3', 'Sodhana 4', 'Samagra'].includes(detectedAssessment)) {
                        currentAssessment = detectedAssessment;
                    }
                    currentSchool = `ID: ${parts[1]}`;
                }

                formData.append('assessmentName', currentAssessment);
                formData.append('qp', currentQp);
                formData.append('schoolName', currentSchool);
                if (forceAll) formData.append('force', 'true');

                setMessage(`Uploading (${i + 1}/${studentFiles.length}): ${file.name}...`);
                setIsError(false);

                try {
                    const res = await api.post('/upload/students', formData, config);
                    successCount++;
                    totalStudents += (res.data.count || 0);
                    results.push({ fileName: file.name, status: 'SUCCESS', message: res.data.message });
                } catch (err) {
                    if (err.response?.status === 409 && !forceAll) {
                        // Show modal and wait for user decision
                        const userChoice = await new Promise((resolve) => {
                            setDuplicateModal({
                                hideOutsideClick: true, // Custom prop for clarity if needed
                                open: true,
                                fileName: file.name,
                                message: err.response.data.message,
                                grades: err.response.data.grades || [],
                                onConfirm: (confirmed) => {
                                    setDuplicateModal(prev => ({ ...prev, open: false }));
                                    resolve(confirmed);
                                }
                            });
                        });
                        if (userChoice) {
                            formData.append('force', 'true');
                            const retryRes = await api.post('/upload/students', formData, config);
                            results.push({ fileName: file.name, status: 'SUCCESS', message: 'Uploaded with overwrite' });
                            successCount++;
                        } else {
                            failCount++;
                            results.push({ fileName: file.name, status: 'SKIPPED', message: 'User chose to skip duplicate' });
                        }
                    } else {
                        console.error(`Upload failed for ${file.name}:`, err);
                        failCount++;
                        results.push({ 
                            fileName: file.name, 
                            status: 'FAILED', 
                            message: err.response?.data?.message || 'Unexpected failure' 
                        });
                    }
                }
            }

            setUploadResults(results);
            setMessage(`Batch Complete: ${successCount} successful, ${failCount} skipped/failed.`);
            setStudentFiles([]);
            fetchReports();
            setTimeout(() => setMessage(''), 5000);
        } catch (err) {
            console.error('Batch Upload Error:', err);
            setMessage('Batch Upload failed unexpectedly.');
            setIsError(true);
        } finally {
            setUploading(false);
        }
    };

    // Drag and drop handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
        if (files.length > 0) {
            setStudentFiles(prev => [...prev, ...files]);
            const first = files[0];
            const parts = first.name.split('_');
            if (parts.length >= 2) {
                let detectedAssessment = parts[0].replace(/(\d+)$/, ' $1');
                if (['Sodhana 1', 'Sodhana 2', 'Sodhana 3', 'Sodhana 4', 'Samagra'].includes(detectedAssessment)) {
                    setAssessmentName(detectedAssessment);
                }
                setSchoolName(`ID: ${parts[1]}`);
            }
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-end gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">Approval Dashboard</h1>
                    <p className="text-lg text-slate-500">Manage and approve reports submitted by principals.</p>
                </div>
                <div className="flex flex-wrap gap-4">
                    <select
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-primary"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="PENDING">Pending Approval</option>
                        <option value="APPROVED">Already Approved</option>
                        <option value="REJECTED">Rejected</option>
                    </select>

                    <button
                        onClick={handleSyncSchools}
                        className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-primary shadow-sm hover:bg-slate-50 transition-colors"
                        title="Sync School Emails & WhatsApp from Google Sheet"
                    >
                        <RefreshCw size={18} className={loading && message.includes('Syncing') ? 'animate-spin' : ''} />
                        Sync Schools
                    </button>

                    <button
                        onClick={handleSyncResults}
                        disabled={loading}
                        className="flex items-center gap-2 bg-indigo-600 text-white rounded-xl px-4 py-2.5 font-bold shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        title="Push current dashboard status to PSA Tracker"
                    >
                        <RefreshCw size={18} className={loading && message.includes('Syncing dashboard') ? 'animate-spin' : ''} />
                        Sync Results
                    </button>

                    <button
                        onClick={handleManualDownload}
                        className="flex items-center gap-2 bg-slate-800 text-white rounded-xl px-4 py-2.5 font-bold shadow-sm hover:bg-slate-900 transition-colors"
                        title="Download current view as Excel"
                    >
                        <Download size={18} />
                        Export
                    </button>
                </div>
            </div>

            {/* Filter Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Filter by school..."
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                        value={searchSchool}
                        onChange={(e) => setSearchSchool(e.target.value)}
                    />
                </div>
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search student or roll no..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                        value={searchStudent}
                        onChange={(e) => setSearchStudent(e.target.value)}
                    />
                </div>
                <div className="w-40">
                    <select
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                        value={searchAssessment}
                        onChange={(e) => setSearchAssessment(e.target.value)}
                    >
                        <option value="">All Assessments</option>
                        <option value="Samagra">Samagra</option>
                        <option value="Sodhana 1">Sodhana 1</option>
                        <option value="Sodhana 2">Sodhana 2</option>
                        <option value="Sodhana 3">Sodhana 3</option>
                        <option value="Sodhana 4">Sodhana 4</option>
                    </select>
                </div>
                <div className="w-32">
                    <select
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                        value={searchClass}
                        onChange={(e) => setSearchClass(e.target.value)}
                    >
                        <option value="">All Classes</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => (
                            <option key={c} value={c}>Grade {c}</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={() => {
                        setSearchStudent('');
                        setSearchSchool('');
                        setSearchAssessment('');
                        setSearchClass('');
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    title="Clear Filters"
                >
                    <Trash2 size={20} />
                </button>
            </div>

            {/* Duplicate Confirmation Modal */}
            {duplicateModal.open && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-8 max-w-md w-full mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                                <AlertCircle size={24} className="text-amber-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Data Already Exists</h3>
                                <p className="text-sm text-slate-500">{duplicateModal.fileName}</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{duplicateModal.message}</p>
                        {duplicateModal.grades.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {duplicateModal.grades.map(g => (
                                    <span key={g} className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">Grade {g}</span>
                                ))}
                            </div>
                        )}
                        <p className="text-sm text-slate-500 mb-6">Do you want to overwrite the existing data?</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => duplicateModal.onConfirm(false)}
                                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                            >
                                Skip
                            </button>
                            <button
                                onClick={() => duplicateModal.onConfirm(true)}
                                className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-colors"
                            >
                                Overwrite
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Section */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 space-y-6">
                {/* Drag & Drop Zone */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer
                        ${isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : studentFiles.length > 0 ? 'border-primary/50 bg-primary/5' : 'border-slate-300 bg-slate-50 hover:border-primary hover:bg-primary/5'}`}
                >
                    <input
                        type="file"
                        multiple
                        accept=".xlsx, .xls"
                        onChange={(e) => {
                            const files = Array.from(e.target.files);
                            setStudentFiles(prev => [...prev, ...files]);
                            if (files.length > 0) {
                                const first = files[0];
                                const parts = first.name.split('_');
                                if (parts.length >= 2) {
                                    let detectedAssessment = parts[0].replace(/(\d+)$/, ' $1');
                                    if (['Sodhana 1', 'Sodhana 2', 'Sodhana 3', 'Sodhana 4', 'Samagra'].includes(detectedAssessment)) {
                                        setAssessmentName(detectedAssessment);
                                    }
                                    setSchoolName(`ID: ${parts[1]}`);
                                }
                            }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <CloudUpload size={40} className={`mb-3 transition-colors ${isDragging ? 'text-primary' : 'text-slate-400'}`} />
                    <p className="text-base font-bold text-slate-700 mb-1">Drag and Drop your files here</p>
                    <p className="text-sm text-slate-400 mb-4">or</p>
                    <span className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors pointer-events-none">
                        Browse Files
                    </span>
                    <p className="text-xs text-slate-400 mt-3">Supports .xlsx and .xls files</p>
                </div>

                {/* Selected Files List */}
                {studentFiles.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-slate-600">{studentFiles.length} file{studentFiles.length > 1 ? 's' : ''} selected</p>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={forceAll}
                                        onChange={(e) => setForceAll(e.target.checked)}
                                        className="w-3.5 h-3.5 rounded border-slate-300 text-primary focus:ring-primary"
                                    />
                                    Force Overwrite All
                                </label>
                                <button
                                    onClick={() => setStudentFiles([])}
                                    className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 transition-colors"
                                >
                                    <Trash2 size={12} /> Clear All
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {studentFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-600">
                                    <FileSpreadsheet size={14} className="text-primary" />
                                    <span className="max-w-[200px] truncate">{file.name}</span>
                                    <button
                                        onClick={() => setStudentFiles(prev => prev.filter((_, i) => i !== idx))}
                                        className="text-slate-400 hover:text-red-500 transition-colors ml-1"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Upload Button */}
                {studentFiles.length > 0 && (
                    <div className="flex justify-center">
                        <button
                            onClick={handleUpload}
                            disabled={studentFiles.length === 0 || uploading}
                            className="bg-primary text-white py-3 px-10 rounded-xl font-bold text-base hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-primary/20"
                        >
                            <FileUp size={20} />
                            {uploading ? 'Processing...' : `Upload ${studentFiles.length} File${studentFiles.length > 1 ? 's' : ''}`}
                        </button>
                    </div>
                )}
            </div>

            {message && (
                <div className={`${isError ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'} px-6 py-4 rounded-2xl font-bold flex items-center gap-3 animate-bounce shadow-sm`}>
                    {isError ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                    {message}
                </div>
            )}

            {uploadResults.length > 0 && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 space-y-6 animate-in slide-in-from-top duration-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Upload Summary</h3>
                            <p className="text-sm text-slate-500">Details of the latest batch upload</p>
                        </div>
                        <button 
                            onClick={() => setUploadResults([])}
                            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"
                        >
                            <X size={24} />
                        </button>
                    </div>
                    <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {uploadResults.map((result, idx) => (
                            <div key={idx} className={`flex items-start gap-4 p-4 rounded-2xl border transition-all hover:scale-x-[1.01] ${
                                result.status === 'SUCCESS' ? 'bg-emerald-50/30 border-emerald-100' :
                                result.status === 'SKIPPED' ? 'bg-amber-50/30 border-amber-100' :
                                'bg-red-50/30 border-red-100'
                            }`}>
                                {result.status === 'SUCCESS' ? (
                                    <div className="bg-emerald-100 p-2 rounded-xl">
                                        <CheckCircle size={20} className="text-emerald-600" />
                                    </div>
                                ) : result.status === 'SKIPPED' ? (
                                    <div className="bg-amber-100 p-2 rounded-xl">
                                        <AlertCircle size={20} className="text-amber-600" />
                                    </div>
                                ) : (
                                    <div className="bg-red-100 p-2 rounded-xl">
                                        <XCircle size={20} className="text-red-600" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-bold text-slate-800 truncate">{result.fileName}</p>
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                            result.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                            result.status === 'SKIPPED' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                            'bg-red-100 text-red-700 border border-red-200'
                                        }`}>
                                            {result.status}
                                        </span>
                                    </div>
                                    <p className={`text-xs font-medium ${
                                        result.status === 'SUCCESS' ? 'text-emerald-600' :
                                        result.status === 'SKIPPED' ? 'text-amber-600' :
                                        'text-red-600'
                                    }`}>{result.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleSelectAll}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50"
                        >
                            {selectedIds.length === reports.length ? 'Deselect All' : 'Select All'}
                        </button>
                        <span className="text-sm font-medium text-slate-400">
                            {selectedIds.length} items selected
                        </span>
                    </div>

                    <div className="flex gap-2">
                        {selectedIds.length > 0 && (
                            <>
                                <button
                                    onClick={() => handleAction('approve', selectedIds)}
                                    className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition shadow-lg shadow-emerald-100"
                                >
                                    <CheckCircle size={16} /> Approve Selected
                                </button>
                                <button
                                    onClick={() => handleAction('reject', selectedIds)}
                                    className="bg-amber-500 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-amber-600 transition shadow-lg shadow-amber-100"
                                >
                                    <XCircle size={16} /> Reject Selected
                                </button>
                                <button
                                    onClick={() => handleAction('delete', selectedIds)}
                                    className="bg-red-500 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-red-600 transition shadow-lg shadow-red-100"
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 w-12"></th>
                                <th className="px-6 py-4">School</th>
                                <th className="px-6 py-4">Assessment</th>
                                <th className="px-6 py-4">Students</th>
                                <th className="px-6 py-4">Dispatch</th>
                                <th className="px-6 py-4">Approval</th>
                                <th className="px-6 py-4">Notified</th>
                                <th className="px-6 py-4 text-center">Preview</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-slate-400 font-medium">Loading reports...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : reports.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center text-slate-400">
                                        No {filter.toLowerCase()} reports found matching this criteria.
                                    </td>
                                </tr>
                            ) : reports.map((report) => (
                                <tr key={`${report.schoolId}_${report.assessmentName}`} className={`hover:bg-slate-50/80 transition-colors ${selectedIds.includes(report.id) ? 'bg-primary/5' : ''}`}>
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(report.id)}
                                            onChange={() => toggleSelect(report.id)}
                                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-700 font-bold">{report.schoolName || 'Unknown'}</div>
                                        <div className="text-[10px] text-slate-400">
                                            {report.schoolId}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold">
                                            {report.assessmentName || 'Sodhana 1'} {report.qp ? `(${report.qp})` : ''}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 font-medium">{report.studentCount} Students</td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs font-bold text-slate-600">
                                            {(() => {
                                                if (!report.omrUploadDate) return 'N/A';
                                                const d = new Date(report.omrUploadDate);
                                                d.setDate(d.getDate() + 5);
                                                return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                                            })()}
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                            {report.omrUploadDate ? `Uploaded: ${new Date(report.omrUploadDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : ''}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${report.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                            report.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                            {report.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {report.isEmailSent ? (
                                            <div className="flex flex-col items-start gap-1">
                                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700">
                                                    SENT
                                                </span>
                                                {report.emailSentDate && (
                                                    <span className="text-[10px] text-slate-500 font-medium font-mono">
                                                        {new Date(report.emailSentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500">
                                                UNSENT
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center">
                                            <Link
                                                to={`/report/${report.sampleReportId}?view=principal&qp=${encodeURIComponent(report.qp || '')}`}
                                                target="_blank"
                                                className="p-2 text-slate-400 hover:text-teal-600 transition-colors"
                                                title="Principal Preview"
                                            >
                                                <LayoutDashboard size={20} />
                                            </Link>
                                            <Link
                                                to={`/report/${report.sampleReportId}?view=principal&download=true&qp=${encodeURIComponent(report.qp || '')}`}
                                                target="_blank"
                                                className="p-2 text-slate-400 hover:text-primary transition-colors"
                                                title="Download Principal Report"
                                            >
                                                <Download size={20} />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
