// TrainerDashboard.jsx - Trainer Portal with Workload & Tools
import React, { useState, useEffect } from 'react';
import { BookOpen, Users, ClipboardList, Upload, FileText, LogOut, Loader2 } from 'lucide-react';
import { api } from '../../api';
import StudentManagement from './StudentManagement';
import BulkAttendance from './BulkAttendance';
import BulkDataUpload from './BulkDataUpload';
import InterviewResultLogger from './InterviewResultLogger';

const TrainerDashboard = ({ token, setPage, setToken }) => {
    const [activeView, setActiveView] = useState('classes');
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

    const navItems = [
        { id: 'classes', label: 'My Classes', icon: BookOpen },
        { id: 'students', label: 'Student Directory', icon: Users },
        { id: 'attendance', label: 'Bulk Attendance', icon: ClipboardList },
        { id: 'upload', label: 'Data Upload', icon: Upload },
        { id: 'interviews', label: 'Interview Results', icon: FileText },
    ];

    const renderContent = () => {
        switch (activeView) {
            case 'classes':
                return (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-white">My Allocated Classes</h2>
                        {loading ? (
                            <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-indigo-400" /></div>
                        ) : classes.length === 0 ? (
                            <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-12 text-center">
                                <BookOpen className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                                <p className="text-slate-400">No classes allocated yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {classes.map(c => (
                                    <div
                                        key={c.id}
                                        className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-indigo-500/30 transition cursor-pointer group"
                                        onClick={() => { setSelectedClass(c); setActiveView('students'); }}
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4">
                                            <BookOpen className="w-6 h-6 text-indigo-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-1">{c.subject_name}</h3>
                                        <p className="text-slate-400 text-sm">{c.degree} Sem {c.semester} - Section {c.section}</p>
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
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950">
            <div className="flex">
                {/* Sidebar */}
                <aside className="w-64 min-h-screen bg-slate-900/80 backdrop-blur-xl border-r border-white/5 p-6">
                    <div className="mb-8">
                        <h1 className="text-xl font-bold text-white">Trainer Portal</h1>
                        <p className="text-xs text-slate-500">HRD Training Management</p>
                    </div>

                    <nav className="space-y-2">
                        {navItems.map(item => {
                            const Icon = item.icon;
                            const isActive = activeView === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveView(item.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                                            ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" /> {item.label}
                                </button>
                            );
                        })}
                    </nav>

                    <button
                        onClick={handleLogout}
                        className="absolute bottom-6 left-6 flex items-center gap-2 text-slate-500 hover:text-red-400 transition text-sm"
                    >
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default TrainerDashboard;
