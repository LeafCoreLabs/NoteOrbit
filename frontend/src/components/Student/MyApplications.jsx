// MyApplications.jsx - Application Timeline/Audit Trail
import React, { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../api';

const statusConfig = {
    applied: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Applied' },
    shortlisted: { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Shortlisted' },
    interview: { icon: AlertCircle, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Interview' },
    offered: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Offered' },
    rejected: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Rejected' },
};

const MyApplications = ({ token }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchHistory(); }, []);

    const fetchHistory = async () => {
        try {
            const res = await api.get('/student/placement/history', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setHistory(res.data.history || []);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-cyan-400" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" /> Application Timeline
            </h2>

            {history.length === 0 ? (
                <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-12 text-center">
                    <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white">No Applications Yet</h3>
                    <p className="text-slate-400">Apply to drives to see your progress here.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {history.map((app, idx) => {
                        const cfg = statusConfig[app.status] || statusConfig.applied;
                        const Icon = cfg.icon;
                        return (
                            <div key={app.application_id} className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl ${cfg.bg} flex items-center justify-center`}>
                                    <Icon className={`w-6 h-6 ${cfg.color}`} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-white font-medium">{app.drive_title}</h3>
                                    <p className="text-slate-400 text-sm">{app.company}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color} border border-white/10`}>
                                        {cfg.label}
                                    </span>
                                    <p className="text-slate-500 text-xs mt-1">{new Date(app.applied_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MyApplications;
