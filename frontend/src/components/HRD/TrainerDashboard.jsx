// TrainerDashboard.jsx - Trainer Portal (Student Portal Design Replica)
import React, { useState, useEffect } from 'react';
import { BookOpen, Users, ClipboardList, Upload, FileText, LogOut, Loader2 } from 'lucide-react';
import { api } from '../../api';
import StudentManagement from './StudentManagement';
import BulkAttendance from './BulkAttendance';
import BulkDataUpload from './BulkDataUpload';
import InterviewResultLogger from './InterviewResultLogger';

const TrainerDashboard = ({ token, setPage, setToken }) => {
    const [activeTab, setActiveTab] = useState('classes');
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedClass, setSelectedClass] = useState(null);

    useEffect(() => { fetchClasses(); }, []);

    const fetchClasses = async () => {
        try {
            const res = await api.get('/hrd/trainer/classes', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setClasses(res.data.classes || []);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleLogout = () => {
        localStorage.removeItem('noteorbit_token');
        localStorage.removeItem('noteorbit_user');
        setToken(null);
        setPage('login');
    };

    const tabs = [
        { id: 'classes', label: 'My Classes', icon: BookOpen },
        { id: 'students', label: 'Student Directory', icon: Users },
        { id: 'attendance', label: 'Bulk Attendance', icon: ClipboardList },
        { id: 'upload', label: 'Data Upload', icon: Upload },
        { id: 'interviews', label: 'Interview Results', icon: FileText },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'classes':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">My Allocated Classes</h2>
                            <p className="text-slate-400">Select a class to view students and manage attendance.</p>
                        </div>
                        {loading ? (
                            <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-cyan-400" /></div>
                        ) : classes.length === 0 ? (
                            <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-12 text-center">
                                <BookOpen className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white">No Classes Allocated</h3>
                                <p className="text-slate-400">You have not been assigned any classes yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {classes.map(c => (
                                    <div
                                        key={c.id}
                                        className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-cyan-500/30 transition-colors group cursor-pointer"
                                        onClick={() => { setSelectedClass(c); setActiveTab('students'); }}
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 flex items-center justify-center mb-4">
                                            <BookOpen className="w-6 h-6 text-cyan-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-1">{c.subject_name}</h3>
                                        <p className="text-cyan-400 text-sm font-medium">{c.degree} Sem {c.semester}</p>
                                        <p className="text-slate-400 text-sm">Section {c.section}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'students':
                return <StudentManagement token={token} allocation={selectedClass} />;
            case 'attendance':
                return <BulkAttendance token={token} classes={classes} />;
            case 'upload':
                return <BulkDataUpload token={token} />;
            case 'interviews':
                return <InterviewResultLogger token={token} />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Trainer Portal</h1>
                    <p className="text-slate-400">Manage your classes, attendance & student performance.</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20 transition"
                >
                    <LogOut className="w-4 h-4" /> Logout
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 mb-8 p-1 bg-slate-900/40 backdrop-blur-md rounded-xl border border-white/5 w-fit">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${isActive
                                ? 'bg-cyan-500/20 text-cyan-400 shadow-sm border border-cyan-500/30'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {renderContent()}
            </div>
        </div>
    );
};

export default TrainerDashboard;
