// MyApplications.jsx - Application Audit Trail with Timeline View
import React, { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, Loader2, ArrowRight, Building2 } from 'lucide-react';
import { api } from '../../api';

const stages = ['applied', 'shortlisted', 'interview', 'offered', 'rejected'];
const stageLabels = {
    applied: 'Applied',
    shortlisted: 'Shortlisted',
    interview: 'Interview',
    offered: 'Offered',
    rejected: 'Rejected'
};

const stageConfig = {
    applied: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
    shortlisted: { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
    interview: { icon: AlertCircle, color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
    offered: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
    rejected: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
};

const MyApplications = ({ token }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

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

    const getStageIndex = (status) => stages.indexOf(status) !== -1 ? stages.indexOf(status) : 0;

    const filtered = filter === 'all' ? history : history.filter(h => h.status === filter);

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-cyan-400" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-400" /> Application Timeline
                </h2>

                {/* Filter Tabs */}
                <div className="flex gap-1 p-1 bg-slate-900/50 rounded-xl">
                    {['all', 'applied', 'shortlisted', 'interview', 'offered', 'rejected'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filter === f
                                    ? 'bg-cyan-500/20 text-cyan-400'
                                    : 'text-slate-500 hover:text-white'
                                }`}
                        >
                            {f === 'all' ? 'All' : stageLabels[f]}
                        </button>
                    ))}
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-12 text-center">
                    <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white">No Applications Yet</h3>
                    <p className="text-slate-400">Apply to drives to track your progress here.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map((app, idx) => {
                        const currentStage = getStageIndex(app.status);
                        const cfg = stageConfig[app.status] || stageConfig.applied;
                        const Icon = cfg.icon;

                        return (
                            <div key={app.application_id} className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition">
                                {/* Header */}
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 flex items-center justify-center text-cyan-400 font-bold text-lg">
                                        {app.company?.substring(0, 2).toUpperCase() || 'CO'}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-white font-bold text-lg">{app.drive_title}</h3>
                                        <p className="text-slate-400 text-sm flex items-center gap-1">
                                            <Building2 className="w-3 h-3" /> {app.company}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                                            {stageLabels[app.status]}
                                        </span>
                                        <p className="text-slate-500 text-xs mt-2">{new Date(app.applied_at).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                {/* Visual Timeline */}
                                <div className="flex items-center gap-1">
                                    {stages.slice(0, -1).map((stage, i) => {
                                        const isActive = i <= currentStage && app.status !== 'rejected';
                                        const isRejected = app.status === 'rejected' && i <= currentStage;
                                        const StageCfg = stageConfig[stage];
                                        const StageIcon = StageCfg.icon;

                                        return (
                                            <React.Fragment key={stage}>
                                                <div className="flex flex-col items-center">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition ${isRejected
                                                            ? 'bg-red-500/20 border border-red-500/40'
                                                            : isActive
                                                                ? `${StageCfg.bg} border ${StageCfg.border}`
                                                                : 'bg-slate-800/50 border border-white/10'
                                                        }`}>
                                                        <StageIcon className={`w-4 h-4 ${isRejected ? 'text-red-400' : isActive ? StageCfg.color : 'text-slate-600'
                                                            }`} />
                                                    </div>
                                                    <span className={`text-xs mt-1.5 ${isRejected ? 'text-red-400' : isActive ? StageCfg.color : 'text-slate-600'
                                                        }`}>
                                                        {stageLabels[stage]}
                                                    </span>
                                                </div>
                                                {i < stages.length - 2 && (
                                                    <div className={`flex-1 h-0.5 rounded ${isRejected || (isActive && i < currentStage)
                                                            ? isRejected ? 'bg-red-500/40' : 'bg-cyan-500/40'
                                                            : 'bg-slate-700'
                                                        }`} />
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>

                                {/* Rejection Notice */}
                                {app.status === 'rejected' && (
                                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                        ❌ Unfortunately, your application was not successful. Keep trying!
                                    </div>
                                )}

                                {/* Success Notice */}
                                {app.status === 'offered' && (
                                    <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
                                        🎉 Congratulations! You've received an offer. Check "My Offers" for details.
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MyApplications;
