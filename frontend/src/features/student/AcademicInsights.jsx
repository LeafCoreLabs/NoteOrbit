import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import gsap from "gsap";
import {
    LogIn, UserPlus, LogOut, ArrowLeft, ArrowRight, Loader2, CheckCircle, XCircle, ChevronDown,
    Book, Bell, Settings, Briefcase, User, Mail, Lock, GraduationCap, ClipboardList,
    BriefcaseBusiness, IndianRupee, Award, MessageSquare, Upload, RefreshCw,
    Trash2, Save, Home, Search, Download, Check, Atom, Star, Sparkles, Plus, Filter, Eye, EyeOff, Edit,
    BrainCircuit, AlertTriangle, Target, Lightbulb, Send as SendIcon, Paperclip, Menu, History, Bot, BarChart3
} from "lucide-react";
import { api, auth, unauth } from "../../api";
import { setAuthToken } from "../../api/auth";
import { cents_to_rupees_str } from "../../utils/format";

export default function AcademicInsights({ user, showMessage }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const res = await auth().get("/api/academic-insights");
                setData(res.data.insights);
            } catch (e) {
                console.error(e);
                showMessage("Failed to load insights.", "error");
            } finally {
                setLoading(false);
            }
        };
        fetchInsights();
    }, []);

    if (loading) return <div className="text-center py-20 text-slate-400 animate-pulse">Consulting AI Counselor...</div>;
    if (!data) return <div className="text-center py-20 text-slate-500">No insights available.</div>;

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-lg shadow-fuchsia-500/20">
                    <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">AI Academic Insights</h2>
                    <p className="text-slate-400 text-sm">Personalized analysis powered by Groq AI</p>
                </div>
            </div>

            {/* Counselor Message Card */}
            <div className="bg-slate-800/60 backdrop-blur-xl border border-violet-500/30 rounded-2xl p-6 relative overflow-hidden group hover:border-violet-500/50 transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <h3 className="text-lg font-semibold text-violet-300 mb-3 flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5" />
                    Counselor's Note
                </h3>
                <p className="text-slate-200 leading-relaxed text-lg italic opacity-90">
                    "{data.counselor_message}"
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Risks - Red Theme */}
                <div className="bg-slate-900/50 border border-red-500/20 rounded-xl p-5 hover:bg-slate-900/80 transition-all">
                    <h4 className="text-red-400 font-bold mb-4 flex items-center gap-2 border-b border-red-500/10 pb-2">
                        <AlertTriangle className="w-5 h-5" /> Attendance Risks
                    </h4>
                    {data.attendance_risks && data.attendance_risks.length > 0 ? (
                        <ul className="space-y-2">
                            {data.attendance_risks.map((sub, i) => (
                                <li key={i} className="flex items-center gap-2 text-red-200 bg-red-500/10 px-3 py-2 rounded-lg text-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> {sub}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-slate-500 text-sm italic">No attendance risks detected. Great job!</div>
                    )}
                </div>

                {/* Priorities - Yellow Theme */}
                <div className="bg-slate-900/50 border border-amber-500/20 rounded-xl p-5 hover:bg-slate-900/80 transition-all">
                    <h4 className="text-amber-400 font-bold mb-4 flex items-center gap-2 border-b border-amber-500/10 pb-2">
                        <Target className="w-5 h-5" /> Focus Priorities
                    </h4>
                    {data.priorities && data.priorities.length > 0 ? (
                        <ul className="space-y-2">
                            {data.priorities.map((sub, i) => (
                                <li key={i} className="flex items-center gap-2 text-amber-200 bg-amber-500/10 px-3 py-2 rounded-lg text-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {sub}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-slate-500 text-sm italic">No urgent priorities. Keep maintaining your scores!</div>
                    )}
                </div>
            </div>

            {/* Suggestions - Green Theme */}
            <div className="bg-slate-900/50 border border-emerald-500/20 rounded-xl p-6 hover:bg-slate-900/80 transition-all">
                <h4 className="text-emerald-400 font-bold mb-4 flex items-center gap-2 border-b border-emerald-500/10 pb-2">
                    <Lightbulb className="w-5 h-5" /> Improvement Plan
                </h4>
                <div className="grid gap-3">
                    {(data.suggestions || []).map((tip, i) => (
                        <div key={i} className="flex gap-3 text-slate-300 text-sm bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10 hover:border-emerald-500/30 transition-all">
                            <span className="text-emerald-500 font-bold font-mono">{i + 1}.</span>
                            <span>{tip}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Student Panel (Updated with Books and Hostel)
