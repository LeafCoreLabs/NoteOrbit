// HRDPerformance.jsx - Student Academic Performance (HRD)
import React, { useState, useEffect } from 'react';
import { BarChart2, BookOpen, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '../../api';

const HRDPerformance = ({ token }) => {
    const [performance, setPerformance] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPerformance();
    }, []);

    const fetchPerformance = async () => {
        try {
            // Fetch performance data for the logged-in student
            // Endpoint might be /student/hrd/performance or similar
            const response = await api.get('/student/hrd/performance', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setPerformance(response.data.performance || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-cyan-400" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-white">My Performance</h2>
                <p className="text-slate-400">Track your attendance and marks in HRD subjects.</p>
            </div>

            {performance.length === 0 ? (
                <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-12 text-center">
                    <BarChart2 className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white">No Data Available</h3>
                    <p className="text-slate-400">Performance records will appear here once classes start.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {performance.map((subject, idx) => (
                        <div key={idx} className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{subject.subject_name}</h3>
                                    <p className="text-sm text-slate-400">{subject.trainer_name ? `Trainer: ${subject.trainer_name}` : ''}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Attendance */}
                                <div className="bg-slate-800/40 rounded-xl p-4 border border-white/5">
                                    <h4 className="text-sm font-semibold text-slate-400 mb-2 uppercase">Attendance</h4>
                                    <div className="flex items-end justify-between">
                                        <div className="text-3xl font-bold text-white">
                                            {subject.attendance_percentage}%
                                        </div>
                                        <div className="text-sm text-slate-400">
                                            {subject.present_classes}/{subject.total_classes} Classes
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-700 h-2 rounded-full mt-3 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${subject.attendance_percentage >= 75 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                            style={{ width: `${subject.attendance_percentage}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Marks */}
                                <div className="bg-slate-800/40 rounded-xl p-4 border border-white/5">
                                    <h4 className="text-sm font-semibold text-slate-400 mb-2 uppercase">Internal Marks</h4>
                                    <div className="flex items-end justify-between">
                                        <div className="text-3xl font-bold text-white">
                                            {subject.marks_obtained !== null ? subject.marks_obtained : '-'}
                                        </div>
                                        <div className="text-sm text-slate-400">
                                            Max: {subject.max_marks || 100}
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-700 h-2 rounded-full mt-3 overflow-hidden">
                                        <div
                                            className="h-full bg-cyan-500 rounded-full"
                                            style={{ width: `${(subject.marks_obtained / (subject.max_marks || 100)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HRDPerformance;
