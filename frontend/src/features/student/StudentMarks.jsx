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

export default function StudentMarks({ showMessage }) {
    const [marks, setMarks] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    const fetchMarks = useCallback(async () => {
        setIsLoading(true);
        try {
            // Using auth()
            const res = await auth().get("/student/marks");
            // API returns marks grouped by subject
            setMarks(res.data.marks || {});
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to fetch marks data.", 'error');
            }
            setMarks({});
        } finally {
            setIsLoading(false);
        }
    }, [showMessage]);

    useEffect(() => { fetchMarks(); }, [fetchMarks]);

    const calculateSubjectSummary = (subjectMarks) => {
        if (!subjectMarks || subjectMarks.length === 0) return { obtained: 0, max: 0, percent: 0 };
        // Ensure values are numbers for calculation
        const totalObtained = subjectMarks.reduce((sum, m) => sum + (parseFloat(m.marks_obtained) || 0), 0);
        const totalMax = subjectMarks.reduce((sum, m) => sum + (parseFloat(m.max_marks) || 0), 0);
        const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : 0;
        return { obtained: totalObtained.toFixed(1), max: totalMax.toFixed(1), percent: percentage };
    };

    if (isLoading) {
        return <div className="text-center p-10"><Loader2 className="animate-spin w-8 h-8 mx-auto text-blue-500" /></div>;
    }

    const subjectNames = Object.keys(marks);

    return (
        <div className="space-y-6">
            <h4 className="text-2xl font-bold text-blue-400 flex items-center"><Award className="w-6 h-6 mr-2" /> Academic Marks Report</h4>
            {subjectNames.length === 0 && <div className="p-4 bg-slate-900/40 border border-white/10 rounded-xl text-slate-500">No marks have been recorded for your subjects yet.</div>}

            <div className="space-y-6">
                {subjectNames.map(subject => {
                    const summary = calculateSubjectSummary(marks[subject]);
                    return (
                        <div key={subject} className="bg-slate-900/60 backdrop-blur-xl p-5 rounded-xl shadow-lg border-l-4 border-yellow-500">
                            <div className="flex justify-between items-center pb-2 border-b border-white/10">
                                <h5 className="text-xl font-bold text-white">{subject}</h5>
                                <div className={`text-lg font-semibold px-3 py-1 rounded-full ${summary.percent >= 75 ? 'bg-green-900/40 text-green-300' : 'bg-yellow-900/40 text-yellow-300'}`}>
                                    {summary.percent}% Overall
                                </div>
                            </div>
                            <div className="pt-3 space-y-2">
                                {marks[subject].map((m, index) => (
                                    <div key={index} className="flex justify-between text-sm text-slate-300 border-b border-dashed border-white/10 last:border-b-0 py-1">
                                        <span className="font-medium capitalize">{m.exam_type}:</span>
                                        <span className="font-semibold text-white">{m.marks_obtained} / {m.max_marks}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 pt-3 border-t border-white/10 text-sm font-semibold text-white flex justify-between">
                                <span>Total:</span>
                                <span>{summary.obtained} / {summary.max}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// --- NEW COMPONENT: Complaint Audit Trail Renderer ---
