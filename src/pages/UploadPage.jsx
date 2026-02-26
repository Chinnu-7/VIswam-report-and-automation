import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Upload, FileUp, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import * as xlsx from 'xlsx';

const UploadCard = ({ title, description, onChange, onUpload, onDownloadTemplate, icon: Icon, colorClass, buttonText, file }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex flex-col items-center text-center transition-all hover:shadow-md">
        <div className={`w-16 h-16 rounded-2xl ${colorClass} bg-opacity-10 flex items-center justify-center mb-6`}>
            <Icon className={`w-8 h-8 ${colorClass.replace('bg-', 'text-')}`} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
        <p className="text-slate-500 mb-4 max-w-sm">{description}</p>

        {onDownloadTemplate && (
            <button
                onClick={onDownloadTemplate}
                className="text-primary hover:text-emerald-700 text-sm font-bold flex items-center gap-1 mb-6 transition-colors"
            >
                <FileSpreadsheet size={16} />
                Download Template
            </button>
        )}

        <div className="w-full relative group">
            <input
                type="file"
                accept=".xlsx, .xls"
                onChange={onChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className={`border-2 border-dashed border-slate-200 rounded-xl p-6 transition-colors group-hover:border-primary flex flex-col items-center justify-center ${file ? 'bg-slate-50' : 'bg-white'}`}>
                {file ? (
                    <div className="flex items-center gap-2 text-primary font-medium">
                        <FileSpreadsheet size={20} />
                        {file.name}
                    </div>
                ) : (
                    <span className="text-slate-400 font-medium">Click to select Excel file</span>
                )}
            </div>
        </div>

        <button
            onClick={onUpload}
            disabled={!file}
            className={`mt-6 w-full py-3 px-6 rounded-xl font-semibold transition-all shadow-md transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${colorClass.includes('blue') || colorClass.includes('indigo')
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                }`}
        >
            {buttonText}
        </button>
    </div>
);

const UploadPage = () => {
    const [studentFile, setStudentFile] = useState(null);
    const [schoolFile, setSchoolFile] = useState(null);
    const [assessmentName, setAssessmentName] = useState('');
    const [qp, setQp] = useState('');
    const [schoolName, setSchoolName] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [reports, setReports] = useState([]);
    const [isUploaded, setIsUploaded] = useState(false);

    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const config = {
        headers: { Authorization: `Bearer ${userInfo?.token}` }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const res = await api.get('/reports', config);
            setReports(res.data);
            if (res.data.length > 0) setIsUploaded(true);
        } catch (err) {
            console.error('Failed to fetch reports', err);
        }
    };

    const handleStudentUpload = async () => {
        if (!studentFile) return setError('Please select a student file');
        const formData = new FormData();
        formData.append('file', studentFile);

        try {
            setMessage('Uploading student data...');
            setError('');
            formData.append('assessmentName', assessmentName || 'Sodhana 1');
            formData.append('schoolName', schoolName || 'Vignyan');
            formData.append('qp', qp);

            const res = await api.post('/upload/students', formData, config);
            setMessage(res.data.message);
            setIsUploaded(true);
            // Give the DB a moment to settle
            setTimeout(fetchReports, 500);
        } catch (err) {
            const msg = err.response?.data?.message || 'Upload failed';
            const details = err.response?.data?.error ? `: ${err.response.data.error}` : '';
            setError(msg + details);
            setMessage('');
        }
    };

    const handleSchoolUpload = async () => {
        if (!schoolFile) return;

        const formData = new FormData();
        formData.append('file', schoolFile);

        try {
            setMessage('Uploading school data...');
            setError('');
            const res = await api.post('/upload/schools', formData, config);
            setMessage(res.data.message);
        } catch (err) {
            const msg = err.response?.data?.message || 'Upload failed';
            const details = err.response?.data?.error ? `: ${err.response.data.error}` : '';
            setError(msg + details);
            setMessage('');
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
            'Numbers and Operations', 'Algebra', 'Geometry', 'Measurement', 'Data Analysis', 'Probability', 'Reasoning', 'Problem Solving', 'Communication', 'Connections', 'Representation', 'Operations', 'Patterns', 'Shapes', 'Volume',
            'Living Things', 'Ecosystems', 'Genetics', 'Evolution', 'Human Body', 'Chemical Reactions', 'Matter', 'Energy', 'Forces', 'Motion', 'Space', 'Earth Science', 'Climate', 'Natural Resources', 'Scientific Method',
            'Reading', 'Writing', 'Listening', 'Speaking', 'Grammar', 'Vocabulary', 'Punctuation', 'Spelling', 'Comprehension', 'Literal', 'Inference', 'Context', 'Synthesis', 'Evaluation', 'Creative'
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

    const downloadSchoolTemplate = () => {
        const headers = ['School Id', 'Principal Email', 'School Name'];
        const sampleData = ['VIGNYAN01', 'principal@vignyan.com', 'Vignyan School'];

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.aoa_to_sheet([headers, sampleData]);
        xlsx.utils.book_append_sheet(wb, ws, "School Data Template");
        xlsx.writeFile(wb, "Viswam_School_Template.xlsx");
    };

    const handleDownloadAll = () => {
        if (reports.length === 0) return;

        const data = reports.map(r => ({
            'Student Name': r.studentName,
            'Roll No': r.rollNo,
            'Class': r.class,
            'English Score': r.reportData?.english_score || 0,
            'Maths Score': r.reportData?.maths_score || 0,
            'Science Score': r.reportData?.science_score || 0,
            'School ID': r.schoolId
        }));

        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Reports");
        xlsx.writeFile(wb, `${schoolName || 'School'}_${assessmentName || 'Reports'}.xlsx`);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-12">
            <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
                <h1 className="text-5xl font-extrabold text-slate-900 mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                    Viswam Report Portal
                </h1>
                <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
                    Upload student data and generate detailed report cards for both Students and Principals.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Assessment Name</label>
                    <select
                        className="px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-white font-medium"
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
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">QP (Question Paper)</label>
                    <select
                        className="px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-white font-medium"
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
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">School Name</label>
                    <input
                        type="text"
                        placeholder="e.g. Vignyan School"
                        className="px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-white"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                    />
                </div>
            </div>

            {/* Notifications */}
            {message && (
                <div className="max-w-xl mx-auto p-4 bg-emerald-50/50 backdrop-blur-sm border border-emerald-200 text-emerald-800 rounded-2xl flex items-center shadow-lg shadow-emerald-100/50 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                        <CheckCircle className="text-emerald-600" size={20} />
                    </div>
                    <span className="font-semibold">{message}</span>
                </div>
            )}
            {error && (
                <div className="max-w-xl mx-auto p-4 bg-rose-50/50 backdrop-blur-sm border border-rose-200 text-rose-800 rounded-2xl flex items-center shadow-lg shadow-rose-100/50 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                        <AlertCircle className="text-rose-600" size={20} />
                    </div>
                    <span className="font-semibold">{error}</span>
                </div>
            )}

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${isUploaded ? 'opacity-50 pointer-events-none' : ''}`}>
                <UploadCard
                    title="Student Performance"
                    description="Upload student scores (M1-M15, E1-E15, S1-S15)."
                    icon={FileUp}
                    colorClass="bg-indigo-600"
                    buttonText="Upload Student Data"
                    file={studentFile}
                    onChange={(e) => setStudentFile(e.target.files[0])}
                    onUpload={handleStudentUpload}
                    onDownloadTemplate={downloadStudentTemplate}
                />

                <UploadCard
                    title="School Principals"
                    description="Upload the mapping file that links unique School IDs to Principal Email Addresses."
                    icon={Upload}
                    colorClass="bg-teal-600"
                    buttonText="Upload School Data"
                    file={schoolFile}
                    onChange={(e) => setSchoolFile(e.target.files[0])}
                    onUpload={handleSchoolUpload}
                    onDownloadTemplate={downloadSchoolTemplate}
                />
            </div>

            {/* Results Section */}
            {isUploaded && (
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-500">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Available Reports</h2>
                            <p className="text-sm text-slate-500">Click to view or download specific report cards</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                {reports.length} Reports Generated
                            </div>

                            {reports.length > 0 && (
                                <a
                                    href={`/report/${reports[0].id}?view=principal&school=${encodeURIComponent(schoolName || reports[0].schoolName)}&assessment=${encodeURIComponent(assessmentName || reports[0].assessmentName)}&qp=${encodeURIComponent(qp || reports[0].qp || '')}`}
                                    target="_blank"
                                    className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-teal-200 hover:bg-teal-700 transition-all flex items-center gap-2"
                                >
                                    <CheckCircle size={18} />
                                    View School Overview
                                </a>
                            )}

                            <button
                                className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all flex items-center gap-2"
                                onClick={handleDownloadAll}
                            >
                                <FileSpreadsheet size={18} />
                                Download All (Excel)
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Student Name</th>
                                    <th className="px-6 py-4">Roll No</th>
                                    <th className="px-6 py-4">Class</th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {reports.map((report) => (
                                    <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-800">{report.studentName}</td>
                                        <td className="px-6 py-4 text-slate-500">{report.rollNo}</td>
                                        <td className="px-6 py-4 text-slate-500">Grade {report.class}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-3">
                                                <a
                                                    href={`/report/${report.id}?view=principal&school=${encodeURIComponent(schoolName)}&assessment=${encodeURIComponent(assessmentName)}&qp=${encodeURIComponent(qp || report.qp || '')}`}
                                                    target="_blank"
                                                    className="px-4 py-2 bg-teal-50 text-teal-600 rounded-lg font-bold hover:bg-teal-100 transition-colors text-sm"
                                                >
                                                    Principal View
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UploadPage;
