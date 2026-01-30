// InterviewResultLogger.jsx - Log Pass/Fail with Feedback
import React, { useState, useEffect } from 'react';
import { FileText, Check, X, Loader2, Send } from 'lucide-react';
import { api } from '../../api';

const InterviewResultLogger = ({ token }) => {
    const [drives, setDrives] = useState([]);
    const [selectedDrive, setSelectedDrive] = useState(null);
    const [rounds, setRounds] = useState([]);
    const [selectedRound, setSelectedRound] = useState(null);
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(null);

    useEffect(() => { fetchDrives(); }, []);

    const fetchDrives = async () => {
        try {
            const res = await api.get('/hrd/drives', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setDrives(res.data.drives || []);
            }
        } catch (e) { console.error(e); }
    };

    const fetchRounds = async (driveId) => {
        setLoading(true);
        try {
            const res = await api.get(`/hrd/drives/${driveId}/rounds`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setRounds(res.data.rounds || []);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchApplicants = async (driveId) => {
        try {
            const res = await api.get(`/hrd/drives/${driveId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setApplicants(res.data.applicants || []);
            }
        } catch (e) { console.error(e); }
    };

    const handleDriveChange = (driveId) => {
        const d = drives.find(x => x.id === parseInt(driveId));
        setSelectedDrive(d);
        setSelectedRound(null);
        if (driveId) {
            fetchRounds(driveId);
            fetchApplicants(driveId);
        }
    };

    const submitResult = async (studentId, result, feedback = '') => {
        if (!selectedRound) return;
        setSubmitting(studentId);
        try {
            await api.post('/hrd/interview/result', {
                round_id: selectedRound.id,
                student_id: studentId,
                result: result,
                feedback: feedback
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Update UI
            setApplicants(prev => prev.map(a =>
                a.id === studentId ? { ...a, status: result === 'Fail' ? 'rejected' : 'shortlisted' } : a
            ));
        } catch (e) { console.error(e); }
        finally { setSubmitting(null); }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-indigo-400" /> Interview Results
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Drive Selection */}
                <div>
                    <label className="text-sm text-slate-400 mb-2 block">Select Drive</label>
                    <select
                        value={selectedDrive?.id || ''}
                        onChange={e => handleDriveChange(e.target.value)}
                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white"
                    >
                        <option value="">Choose...</option>
                        {drives.map(d => (
                            <option key={d.id} value={d.id}>{d.company} - {d.title}</option>
                        ))}
                    </select>
                </div>

                {/* Round Selection */}
                <div>
                    <label className="text-sm text-slate-400 mb-2 block">Select Round</label>
                    <select
                        value={selectedRound?.id || ''}
                        onChange={e => setSelectedRound(rounds.find(r => r.id === parseInt(e.target.value)))}
                        disabled={!selectedDrive}
                        className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white disabled:opacity-50"
                    >
                        <option value="">Choose...</option>
                        {rounds.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Applicants */}
            {loading ? (
                <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-indigo-400" /></div>
            ) : selectedRound && applicants.length > 0 ? (
                <div className="bg-slate-900/40 border border-white/10 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900/80 text-slate-400 text-sm uppercase font-semibold">
                            <tr>
                                <th className="p-4">Student</th>
                                <th className="p-4">SRN</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {applicants.map(a => (
                                <tr key={a.id} className="hover:bg-white/5">
                                    <td className="p-4 text-white font-medium">{a.name}</td>
                                    <td className="p-4 text-slate-400 font-mono text-xs">{a.srn}</td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs ${a.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                                a.status === 'offered' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    'bg-blue-500/20 text-blue-400'
                                            }`}>{a.status}</span>
                                    </td>
                                    <td className="p-4 text-right space-x-2">
                                        <button
                                            onClick={() => submitResult(a.id, 'Pass')}
                                            disabled={submitting === a.id}
                                            className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs border border-emerald-500/30 hover:bg-emerald-500/30"
                                        >
                                            <Check className="w-3 h-3 inline" /> Pass
                                        </button>
                                        <button
                                            onClick={() => submitResult(a.id, 'Fail')}
                                            disabled={submitting === a.id}
                                            className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs border border-red-500/30 hover:bg-red-500/30"
                                        >
                                            <X className="w-3 h-3 inline" /> Fail
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : selectedRound ? (
                <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-12 text-center">
                    <p className="text-slate-400">No applicants for this drive.</p>
                </div>
            ) : null}
        </div>
    );
};

export default InterviewResultLogger;
