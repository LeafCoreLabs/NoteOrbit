// NeuralStudentProfile.jsx - 360° Student Profile Modal
import React, { useState, useEffect } from 'react';
import { X, User, Brain, BookOpen, ClipboardCheck, Award, Loader2 } from 'lucide-react';
import { api } from '../../api';

const NeuralStudentProfile = ({ token, studentId, onClose }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (studentId) fetchProfile();
    }, [studentId]);

    const fetchProfile = async () => {
        try {
            const res = await api.get(`/hrd/student/${studentId}/neural-profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setProfile(res.data.neural_profile);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    if (!studentId) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-slate-900 border-b border-white/10 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <Brain className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Neural Profile</h2>
                            <p className="text-slate-400 text-sm">AI-Powered Student Analysis</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="py-12 text-center">
                            <Loader2 className="animate-spin w-8 h-8 text-purple-400 mx-auto" />
                        </div>
                    ) : profile ? (
                        <div className="space-y-6">
                            {/* Basic Info */}
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-2xl font-bold">
                                    {profile.name?.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{profile.name}</h3>
                                    <p className="text-slate-400">{profile.srn} • {profile.section}</p>
                                </div>
                            </div>

                            {/* AI Insights */}
                            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-5">
                                <h4 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                                    <Brain className="w-4 h-4" /> AI Readiness Score
                                </h4>
                                <div className="flex items-center gap-4">
                                    <div className="text-4xl font-bold text-white">
                                        {profile.ai_insights?.readiness_score || 0}%
                                    </div>
                                    {profile.ai_insights?.readiness_score >= 80 && (
                                        <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold animate-pulse">
                                            Placement Ready
                                        </div>
                                    )}
                                    <p className="text-slate-300 text-sm flex-1">
                                        {profile.ai_insights?.summary || 'No insights available'}
                                        {profile.ai_insights?.tech_focus && (
                                            <span className="block mt-2 text-indigo-400 font-semibold">
                                                Primary Focus: {profile.ai_insights.tech_focus}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                {profile.ai_insights?.tags?.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {profile.ai_insights.tags.map((tag, i) => (
                                            <span key={i} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Skills */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                                    <Award className="w-4 h-4" /> Skills Matrix
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {(profile.skills_matrix || []).map((skill, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg text-sm">
                                            {skill}
                                        </span>
                                    ))}
                                    {(!profile.skills_matrix || profile.skills_matrix.length === 0) && (
                                        <span className="text-slate-500 text-sm">No skills recorded</span>
                                    )}
                                </div>
                            </div>

                            {/* Attendance */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                                    <ClipboardCheck className="w-4 h-4" /> Attendance Metrics
                                </h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-emerald-400">{profile.attendance_metrics?.percentage || 0}%</p>
                                        <p className="text-slate-500 text-xs">Overall</p>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-blue-400">{profile.attendance_metrics?.present_count || 0}</p>
                                        <p className="text-slate-500 text-xs">Present</p>
                                    </div>
                                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-red-400">{profile.attendance_metrics?.absent_count || 0}</p>
                                        <p className="text-slate-500 text-xs">Absent</p>
                                    </div>
                                </div>
                            </div>

                            {/* Academic Performance */}
                            {profile.academic_performance?.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                                        <BookOpen className="w-4 h-4" /> Academic Performance
                                    </h4>
                                    <div className="space-y-2">
                                        {profile.academic_performance.map((sub, i) => (
                                            <div key={i} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                                                <span className="text-white">{sub.subject}</span>
                                                <span className="text-cyan-400 font-medium">{sub.marks}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Resume */}
                            {profile.resume_url && (
                                <a
                                    href={profile.resume_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-center py-3 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30 hover:bg-purple-500/30 transition"
                                >
                                    View Resume →
                                </a>
                            )}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-slate-400">
                            Could not load profile data.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NeuralStudentProfile;
