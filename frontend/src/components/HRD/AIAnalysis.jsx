// AIAnalysis.jsx - AI-Powered Resume and Role-Fit Analysis using Groq
import React, { useState } from 'react';
import {
    BrainCircuit, Upload, Sparkles, Target, TrendingUp,
    FileText, Loader2, CheckCircle, AlertTriangle
} from 'lucide-react';
import { api } from '../../api';

const AIAnalysis = ({ token }) => {
    const [activeTab, setActiveTab] = useState('resume');
    const [loading, setLoading] = useState(false);
    const [resumeFile, setResumeFile] = useState(null);
    const [resumeAnalysis, setResumeAnalysis] = useState(null);
    const [roleFitData, setRoleFitData] = useState({
        student_id: '',
        drive_id: ''
    });
    const [roleFitResult, setRoleFitResult] = useState(null);

    const analyzeResume = async () => {
        if (!resumeFile) {
            alert('Please upload a resume');
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('resume', resumeFile);

        try {
            const response = await api.post('/hrd/ai/analyze-resume', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            setResumeAnalysis(response.data);
        } catch (error) {
            console.error('Failed to analyze resume:', error);
            alert('Failed to analyze resume');
        } finally {
            setLoading(false);
        }
    };

    const calculateRoleFit = async () => {
        setLoading(true);
        try {
            const response = await api.post('/hrd/ai/role-fit', roleFitData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRoleFitResult(response.data);
        } catch (error) {
            console.error('Failed to calculate role-fit:', error);
            alert('Failed to calculate role-fit');
        } finally {
            setLoading(false);
        }
    };

    const ScoreCircle = ({ score, label }) => {
        const color = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400';
        const bgColor = score >= 80 ? 'from-emerald-500/20' : score >= 60 ? 'from-yellow-500/20' : 'from-red-500/20';

        return (
            <div className="text-center">
                <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${bgColor} to-transparent border-2 ${color.replace('text-', 'border-')} flex items-center justify-center mb-2 mx-auto`}>
                    <span className={`text-2xl font-bold ${color}`}>{score}%</span>
                </div>
                <p className="text-slate-300 text-sm font-medium">{label}</p>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">AI Analysis Tools</h1>
                <p className="text-slate-400">Powered by Groq AI (Llama 3.3 70B)</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10">
                <button
                    onClick={() => setActiveTab('resume')}
                    className={`px-6 py-3 font-semibold transition-all relative ${activeTab === 'resume'
                        ? 'text-violet-400'
                        : 'text-slate-400 hover:text-white'
                        }`}
                >
                    Resume Analysis
                    {activeTab === 'resume' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-purple-600" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('role-fit')}
                    className={`px-6 py-3 font-semibold transition-all relative ${activeTab === 'role-fit'
                        ? 'text-violet-400'
                        : 'text-slate-400 hover:text-white'
                        }`}
                >
                    Role-Fit Calculator
                    {activeTab === 'role-fit' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-purple-600" />
                    )}
                </button>
            </div>

            {/* Resume Analysis Tab */}
            {activeTab === 'resume' && (
                <div className="space-y-6">
                    <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Upload Resume for AI Analysis</h3>
                                <p className="text-slate-400 text-sm">Get skills extraction, quality score, and ATS compatibility</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block">
                                <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-violet-500/50 transition-all cursor-pointer">
                                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                                    <p className="text-white font-semibold mb-1">
                                        {resumeFile ? resumeFile.name : 'Click to upload resume'}
                                    </p>
                                    <p className="text-slate-400 text-sm">PDF format supported</p>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => setResumeFile(e.target.files[0])}
                                        className="hidden"
                                    />
                                </div>
                            </label>

                            <button
                                onClick={analyzeResume}
                                disabled={!resumeFile || loading}
                                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white px-6 py-4 rounded-xl font-semibold hover:shadow-lg hover:shadow-violet-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
                                <span>{loading ? 'Analyzing with AI...' : 'Analyze Resume'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Analysis Results */}
                    {resumeAnalysis && (
                        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 space-y-6">
                            <h3 className="text-xl font-bold text-white mb-4">Analysis Results</h3>

                            {/* Scores */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                <ScoreCircle score={resumeAnalysis.quality_score || 0} label="Quality Score" />
                                <ScoreCircle score={resumeAnalysis.ats_score || 0} label="ATS Score" />
                                <ScoreCircle score={resumeAnalysis.overall || 0} label="Overall" />
                            </div>

                            {/* Skills */}
                            {resumeAnalysis.skills && resumeAnalysis.skills.length > 0 && (
                                <div>
                                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                                        Extracted Skills
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {resumeAnalysis.skills.map((skill, idx) => (
                                            <span
                                                key={idx}
                                                className="px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 rounded-lg text-violet-300 text-sm font-medium"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recommendations */}
                            {resumeAnalysis.recommendations && resumeAnalysis.recommendations.length > 0 && (
                                <div>
                                    <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                                        Recommendations
                                    </h4>
                                    <ul className="space-y-2">
                                        {resumeAnalysis.recommendations.map((rec, idx) => (
                                            <li key={idx} className="text-slate-300 text-sm flex items-start gap-2">
                                                <span className="text-yellow-400 mt-1">•</span>
                                                {rec}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Role-Fit Tab */}
            {activeTab === 'role-fit' && (
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <Target className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Calculate Role-Fit Score</h3>
                            <p className="text-slate-400 text-sm">AI-powered matching between student profile and job role</p>
                        </div>
                    </div>

                    <div className="text-center py-12">
                        <TrendingUp className="w-16 h-16 text-violet-400 mx-auto mb-4" />
                        <p className="text-slate-400 mb-2">Role-Fit Calculator</p>
                        <p className="text-slate-500 text-sm">Feature coming soon...</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIAnalysis;
