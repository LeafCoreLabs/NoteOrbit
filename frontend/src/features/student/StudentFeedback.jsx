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

export default function StudentFeedback({ showMessage }) {
    const [feedback, setFeedback] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchFeedback = useCallback(async () => {
        setIsLoading(true);
        try {
            // This is the functional endpoint already defined in app.py
            const res = await auth().get("/student/feedback");
            setFeedback(res.data.feedback || []);
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to fetch faculty feedback.", 'error');
            }
            setFeedback([]);
        } finally {
            setIsLoading(false);
        }
    }, [showMessage]);

    useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

    if (isLoading) {
        return <div className="text-center p-10"><Loader2 className="animate-spin w-8 h-8 mx-auto text-yellow-500" /></div>;
    }

    return (
        <div className="space-y-6">
            <h4 className="text-2xl font-bold text-yellow-500 flex items-center"><MessageSquare className="w-6 h-6 mr-2" /> Faculty Feedback Report</h4>

            {feedback.length === 0 && <div className="p-4 bg-slate-900/40 border border-white/10 rounded-xl text-slate-400">No personalized feedback has been sent by faculty yet.</div>}

            <div className="space-y-4">
                {feedback.map((f, index) => (
                    <div key={index} className="bg-yellow-900/20 p-5 rounded-xl shadow-lg border-l-4 border-yellow-500 backdrop-blur-sm">
                        <div className="font-bold text-lg text-yellow-100 mb-2">Subject: {f.subject}</div>

                        <p className="text-slate-300 whitespace-pre-wrap border-l-2 border-yellow-500/30 pl-3 py-1 text-[0.95rem]">{f.text}</p>

                        <div className="text-xs text-yellow-500/60 mt-3 pt-2 border-t border-yellow-500/20">
                            Sent by Faculty ID: {f.faculty_id} on {new Date(f.created_at).toLocaleDateString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
