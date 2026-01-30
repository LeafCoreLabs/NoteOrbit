// HRDAttendance.jsx - Student HRD Training Attendance View
import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Loader2, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { api } from '../../api';

const HRDAttendance = ({ token }) => {
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, percentage: 0 });

    useEffect(() => { fetchAttendance(); }, []);

    const fetchAttendance = async () => {
        try {
            const res = await api.get('/student/hrd/attendance', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                const records = res.data.attendance || [];
                setAttendance(records);

                // Calculate stats
                const present = records.filter(r => r.status === 'Present').length;
                const total = records.length;
                setStats({
                    total,
                    present,
                    absent: total - present,
                    percentage: total > 0 ? Math.round((present / total) * 100) : 0
                });
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    // Group by subject
    const groupedBySubject = attendance.reduce((acc, rec) => {
        const subj = rec.subject || 'Unknown';
        if (!acc[subj]) acc[subj] = [];
        acc[subj].push(rec);
        return acc;
    }, {});

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-cyan-400" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-cyan-400" /> HRD Training Attendance
            </h2>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-center">
                    <p className="text-3xl font-bold text-cyan-400">{stats.percentage}%</p>
                    <p className="text-slate-500 text-sm">Overall</p>
                </div>
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-center">
                    <p className="text-3xl font-bold text-white">{stats.total}</p>
                    <p className="text-slate-500 text-sm">Total Classes</p>
                </div>
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-center">
                    <p className="text-3xl font-bold text-emerald-400">{stats.present}</p>
                    <p className="text-slate-500 text-sm">Present</p>
                </div>
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-center">
                    <p className="text-3xl font-bold text-red-400">{stats.absent}</p>
                    <p className="text-slate-500 text-sm">Absent</p>
                </div>
            </div>

            {/* Attendance Warning */}
            {stats.percentage < 75 && stats.total > 0 && (
                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>Your attendance is below 75%. This may affect your placement eligibility.</span>
                </div>
            )}

            {/* Subject-wise Breakdown */}
            {Object.keys(groupedBySubject).length > 0 ? (
                <div className="space-y-4">
                    {Object.entries(groupedBySubject).map(([subject, records]) => {
                        const subPresent = records.filter(r => r.status === 'Present').length;
                        const subTotal = records.length;
                        const subPercentage = Math.round((subPresent / subTotal) * 100);

                        return (
                            <div key={subject} className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-white font-bold">{subject}</h3>
                                        <p className="text-slate-500 text-sm">{subTotal} classes</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-2xl font-bold ${subPercentage >= 75 ? 'text-emerald-400' : 'text-orange-400'
                                            }`}>{subPercentage}%</p>
                                        <p className="text-slate-500 text-xs">{subPresent}/{subTotal} present</p>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all ${subPercentage >= 75 ? 'bg-emerald-500' : 'bg-orange-500'
                                            }`}
                                        style={{ width: `${subPercentage}%` }}
                                    />
                                </div>

                                {/* Recent Records */}
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {records.slice(0, 10).map((rec, i) => (
                                        <div
                                            key={i}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${rec.status === 'Present'
                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                }`}
                                            title={`${rec.date}: ${rec.status}`}
                                        >
                                            {rec.status === 'Present' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                        </div>
                                    ))}
                                    {records.length > 10 && (
                                        <span className="text-slate-500 text-xs self-center">+{records.length - 10} more</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-12 text-center">
                    <ClipboardCheck className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white">No Attendance Records</h3>
                    <p className="text-slate-400">Your HRD training attendance will appear here.</p>
                </div>
            )}
        </div>
    );
};

export default HRDAttendance;
