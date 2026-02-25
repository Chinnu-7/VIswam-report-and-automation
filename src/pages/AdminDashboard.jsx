import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { CheckCircle, XCircle, Trash2, Search, Filter, AlertCircle, FileText, Upload, FileSpreadsheet, FileUp, RefreshCw, Eye, Download, LayoutDashboard } from 'lucide-react';
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
            setReports(res.data);
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
            let endpoint = '/reports/approve';
            if (action === 'reject') endpoint = '/reports/reject';
            if (action === 'delete') endpoint = '/reports';

            const method = action === 'delete' ? 'delete' : 'post';

            await api({
                method,
                url: endpoint,
                data: { ids },
                ...config
            });

            setMessage(`Successfully ${action}ed ${ids.length} reports`);
            setSelectedIds([]);
            fetchReports();
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            console.error(`Error during ${action}`, err);
        }
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
        const headers = [
            'Roll No', 'Student Name', 'Class', 'School Id',
            'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12', 'M13', 'M14', 'M15',
            'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12', 'S13', 'S14', 'S15',
            'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11', 'E12', 'E13', 'E14', 'E15'
        ];

        const loDescriptions = [
            'R.No', 'Name', 'Grade', 'SID',
            'Math LO 1', 'Math LO 2', 'Math LO 3', 'Math LO 4', 'Math LO 5', 'Math LO 6', 'Math LO 7', 'Math LO 8', 'Math LO 9', 'Math LO 10', 'Math LO 11', 'Math LO 12', 'Math LO 13', 'Math LO 14', 'Math LO 15',
            'Sci LO 1', 'Sci LO 2', 'Sci LO 3', 'Sci LO 4', 'Sci LO 5', 'Sci LO 6', 'Sci LO 7', 'Sci LO 8', 'Sci LO 9', 'Sci LO 10', 'Sci LO 11', 'Sci LO 12', 'Sci LO 13', 'Sci LO 14', 'Sci LO 15',
            'Eng LO 1', 'Eng LO 2', 'Eng LO 3', 'Eng LO 4', 'Eng LO 5', 'Eng LO 6', 'Eng LO 7', 'Eng LO 8', 'Eng LO 9', 'Eng LO 10', 'Eng LO 11', 'Eng LO 12', 'Eng LO 13', 'Eng LO 14', 'Eng LO 15'
        ];

        const sampleData = [
            '101', 'John Doe', '7', 'SCHOOL001',
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
        ];

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.aoa_to_sheet([headers, loDescriptions, sampleData]);
        xlsx.utils.book_append_sheet(wb, ws, "Student Data Template");
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
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">Approval Dashboard</h1>
                    <p className="text-lg text-slate-500">Manage and approve reports submitted by principals.</p>
                </div>
                <div className="flex gap-4">
                    <select
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-primary"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="PENDING">Pending Approval</option>
                        <option value="APPROVED">Already Approved</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                </div>
            </div>

            {/* Filter Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-wrap gap-4 items-center">
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
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Filter by school..."
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                        value={searchSchool}
                        onChange={(e) => setSearchSchool(e.target.value)}
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
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4">School</th>
                                <th className="px-6 py-4">Assessment</th>
                                <th className="px-6 py-4">Class</th>
                                <th className="px-6 py-4">Status</th>
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
                                <tr key={report.id} className={`hover:bg-slate-50/80 transition-colors ${selectedIds.includes(report.id) ? 'bg-primary/5' : ''}`}>
                                    <td className="px-6 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(report.id)}
                                            onChange={() => toggleSelect(report.id)}
                                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800">{report.studentName}</div>
                                        <div className="text-xs text-slate-400">{report.rollNo}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-700 font-medium">{report.schoolName || 'Unknown'}</div>
                                        <div className="text-[10px] text-slate-400">{report.schoolId}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold">
                                            {report.assessmentName || 'Sodhana 1'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">Grade {report.class}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${report.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                            report.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                            {report.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center">
                                            <Link
                                                to={`/report/${report.id}?view=student&qp=${encodeURIComponent(report.qp || '')}`}
                                                target="_blank"
                                                className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                                title="Student Preview"
                                            >
                                                <Eye size={20} />
                                            </Link>
                                            <Link
                                                to={`/report/${report.id}?view=principal&qp=${encodeURIComponent(report.qp || '')}`}
                                                target="_blank"
                                                className="p-2 text-slate-400 hover:text-teal-600 transition-colors"
                                                title="Principal Preview"
                                            >
                                                <LayoutDashboard size={20} />
                                            </Link>
                                            <Link
                                                to={`/report/${report.id}?view=principal&download=true&qp=${encodeURIComponent(report.qp || '')}`}
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
