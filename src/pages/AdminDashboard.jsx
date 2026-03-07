import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { CheckCircle, XCircle, Trash2, Search, Filter, AlertCircle, FileText, Upload, FileSpreadsheet, FileUp, RefreshCw, Download, LayoutDashboard } from 'lucide-react';
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
    const [studentFile, setStudentFile] = useState(null);
    const [uploading, setUploading] = useState(false);

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
        let url = 'https://docs.google.com/spreadsheets/d/1fl5NW2skc_8NC0x3vxE9Fcfm6HGF1-e2lOTy4IMs7N0/export?format=csv';


        setLoading(true);
        try {
            setMessage('Fetching and parsing school data...');
            setIsError(false);

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch data. Ensure the Google Sheet is "Published to the web" as CSV.');

            const text = response.data ? (typeof response.data === 'string' ? response.data : JSON.stringify(response.data)) : await response.text();

            if (text.includes('<html') || text.includes('<!DOCTYPE')) {
                throw new Error('Received HTML instead of data. Please ensure: File > Share > Publish to web > CSV.');
            }

            // ROBUST MULTI-LINE CSV PARSER
            const parseCSVText = (csv) => {
                const rows = [];
                let currentRow = [];
                let currentField = '';
                let inQuotes = false;

                for (let i = 0; i < csv.length; i++) {
                    const char = csv[i];
                    const nextChar = csv[i + 1];

                    if (inQuotes) {
                        if (char === '"' && nextChar === '"') {
                            currentField += '"';
                            i++; // Skip next quote
                        } else if (char === '"') {
                            inQuotes = false;
                        } else {
                            currentField += char;
                        }
                    } else {
                        if (char === '"') {
                            inQuotes = true;
                        } else if (char === ',') {
                            currentRow.push(currentField.trim());
                            currentField = '';
                        } else if (char === '\n' || char === '\r') {
                            if (currentField || currentRow.length > 0) {
                                currentRow.push(currentField.trim());
                                rows.push(currentRow);
                                currentRow = [];
                                currentField = '';
                            }
                            if (char === '\r' && nextChar === '\n') i++; // Skip \n in \r\n
                        } else {
                            currentField += char;
                        }
                    }
                }
                if (currentField || currentRow.length > 0) {
                    currentRow.push(currentField.trim());
                    rows.push(currentRow);
                }
                return rows;
            };

            const allRows = parseCSVText(text);
            if (allRows.length < 2) throw new Error('CSV is empty or invalid');

            const headers = allRows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
            const dataRows = allRows.slice(1).map(row => {
                const obj = {};
                headers.forEach((h, i) => { if (h) obj[h] = row[i]; });
                return obj;
            });

            // Normalized header matching keys
            const keyNSF = 'nsfuserid';
            const keyEmail = 'schoolemailid';
            const keyContact = 'poccontactno';

            const consolidatedSchools = dataRows.map(row => {
                const id = row[keyNSF] || row['schoolid'] || row['id'] || row['schoolcode'];
                if (!id) return null;

                const idUpper = String(id).toUpperCase();

                return {
                    schoolId: idUpper,
                    schoolName: row['schoolname'] || row['nsfschoolname'] || row['name'] || idUpper,
                    principalEmail: row[keyEmail] || row['principalemail'] || row['email'] || '',
                    whatsappNo: row[keyContact] || row['contactnumber'] || row['whatsapp'] || row['phone'] || '',
                    registered: parseInt(row['totalstudentsregistered'] || row['registered'] || 0, 10) || 0,
                    participated: parseInt(row['noofomrsreceived'] || row['participated'] || 0, 10) || 0
                };
            }).filter(s => s && s.schoolId && s.principalEmail);

            if (consolidatedSchools.length === 0) {
                console.log('Headers found:', headers);
                console.log('Sample data row:', dataRows[0]);
                throw new Error('No valid school records found. Check if your headers are correct.');
            }

            const res = await api.post('/schools/sync', { schools: consolidatedSchools }, config);
            setMessage(`${res.data.message} Synced ${consolidatedSchools.length} schools.`);
            setIsError(false);
            setTimeout(() => setMessage(''), 7000);
        } catch (err) {
            console.error('Sync Error:', err);
            setMessage('Sync Error: ' + err.message);
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
        if (!studentFile) return;
        const formData = new FormData();
        formData.append('file', studentFile);
        formData.append('assessmentName', assessmentName || 'Sodhana 1');
        formData.append('qp', qp);
        formData.append('schoolName', schoolName || 'Vignyan');

        setUploading(true);
        try {
            setMessage('Uploading student data...');
            setIsError(false);
            const res = await api.post('/upload/students', formData, config);
            setMessage(res.data.message);
            setStudentFile(null);
            fetchReports();
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error('Upload Error Details:', err);
            let msg = err.response?.data?.message || 'Upload failed';
            let detail = err.response?.data?.error || '';

            // Fallback for non-JSON responses (e.g., HTML 500/404)
            if (!err.response?.data?.message && typeof err.response?.data === 'string') {
                if (err.response.data.includes('Proxy error')) {
                    msg = 'Network Error (Proxy)';
                } else if (err.response.data.includes('<!DOCTYPE html>')) {
                    msg = 'Server Error (HTML Response)';
                    detail = 'Check server console for details';
                } else {
                    msg = 'Server Error';
                    detail = err.response.data.substring(0, 100);
                }
            } else if (!err.response) {
                msg = 'Network Error';
                detail = 'No response from server';
            }

            setMessage(`Error: ${msg} ${detail ? `(${detail})` : ''} [Status: ${err.response?.status || 'N/A'}]`);
            setIsError(true);
        } finally {
            setUploading(false);
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

            {/* Quick Upload Section for Admins */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
                <div className="md:col-span-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Student File</label>
                    <div className="relative group">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={(e) => setStudentFile(e.target.files[0])}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className={`border-2 border-dashed border-slate-200 rounded-xl p-3 flex items-center justify-center transition-colors group-hover:border-primary ${studentFile ? 'bg-primary/5 border-primary' : 'bg-slate-50'}`}>
                            <span className="text-xs font-bold text-slate-600 truncate max-w-[150px]">
                                {studentFile ? studentFile.name : 'Select Excel'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={downloadStudentTemplate}
                        className="text-primary hover:text-emerald-700 text-[10px] font-bold flex items-center gap-1 mt-2 transition-colors"
                    >
                        <FileSpreadsheet size={12} />
                        Download Template
                    </button>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Assessment</label>
                    <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                        value={assessmentName}
                        onChange={(e) => setAssessmentName(e.target.value)}
                    >
                        <option value="">Select Assessment</option>
                        <option value="Samagra">Samagra</option>
                        <option value="Sodhana 1">Sodhana 1</option>
                        <option value="Sodhana 2">Sodhana 2</option>
                        <option value="Sodhana 3">Sodhana 3</option>
                        <option value="Sodhana 4">Sodhana 4</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">QP</label>
                    <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                        value={qp}
                        onChange={(e) => setQp(e.target.value)}
                    >
                        <option value="">Select QP</option>
                        <option value="SCERT 1">SCERT 1</option>
                        <option value="SCERT 2">SCERT 2</option>
                        <option value="NCERT 1">NCERT 1</option>
                        <option value="NCERT 2">NCERT 2</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">School Name</label>
                    <input
                        type="text"
                        placeholder="e.g. Vignyan School"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                    />
                </div>
                <button
                    onClick={handleRecalculate}
                    disabled={uploading || loading}
                    className="bg-teal-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-teal-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <RefreshCw size={18} />
                    {loading ? 'Processing...' : 'Recalculate Grades'}
                </button>
                <button
                    onClick={handleUpload}
                    disabled={!studentFile || uploading}
                    className="bg-primary text-white py-3 px-6 rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <FileUp size={18} />
                    {uploading ? 'Uploading...' : 'Upload Data'}
                </button>
            </div>

            {message && (
                <div className={`${isError ? 'bg-red-50 border-red-100 text-red-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'} px-6 py-4 rounded-2xl font-bold flex items-center gap-3 animate-bounce shadow-sm`}>
                    {isError ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                    {message}
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
                                <th className="px-6 py-4">Approval</th>
                                <th className="px-6 py-4">Notified</th>
                                <th className="px-6 py-4 text-center">Preview</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-slate-400 font-medium">Loading reports...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : reports.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center text-slate-400">
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
                                        <div className="text-[10px] text-slate-400">{report.schoolId}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold">
                                            {report.assessmentName || 'Sodhana 1'} {report.qp ? `(${report.qp})` : ''}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 font-medium">{report.studentCount} Students</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${report.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                            report.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                            {report.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${report.isEmailSent ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {report.isEmailSent ? 'SENT' : 'UNSENT'}
                                        </span>
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
