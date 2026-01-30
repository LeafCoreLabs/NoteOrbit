// HRDPerformance.jsx - Student Academic Performance (HRD)
import React, { useState, useEffect } from 'react';
import { BarChart2, BookOpen, CheckCircle, XCircle, Loader2, ClipboardCheck } from 'lucide-react';
import { api } from '../../api';

const HRDPerformance = ({ token }) => {
    const [performance, setPerformance] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPerformance();
    }, []);

    const fetchPerformance = async () => {
        try {
            const response = await api.get('/student/hrd/performance', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setPerformance(response.data.performance || null);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-cyan-400" /></div>;

    const attendance = performance?.attendance || {};
    const subjects = performance?.subjects || [];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-white">Training Performance</h2>
                <p className="text-slate-400">Track your attendance and marks in HRD subjects.</p>
            </div>

            {/* Subject-wise Marks */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-400" /> Subject Performance
                </h3>

                {subjects.length === 0 ? (
                    <div className="text-center py-8">
                        <BarChart2 className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-400">No subject marks recorded yet.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {subjects.map((sub, idx) => (
                            <div key={idx} className="bg-slate-800/40 rounded-xl p-4 border border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-white font-medium">{sub.subject}</span>
                                    <span className="text-cyan-400 font-bold">
                                        {sub.marks_obtained}/{sub.max_marks}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                                        style={{ width: `${sub.percentage || 0}%` }}
                                    />
                                </div>
                                <p className="text-right text-slate-500 text-xs mt-1">{sub.percentage || 0}%</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HRDPerformance;
