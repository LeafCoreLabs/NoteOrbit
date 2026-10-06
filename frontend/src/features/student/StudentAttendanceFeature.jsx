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

export default function StudentAttendanceFeature({ showMessage, buttonClass, primaryButtonClass }) {
    const [view, setView] = useState("loading"); // loading, upload, checkin, marked, holiday, stats
    const [todayData, setTodayData] = useState(null);
    const [stats, setStats] = useState(null);
    const [routineText, setRoutineText] = useState("");
    const [file, setFile] = useState(null);
    const [attendanceMap, setAttendanceMap] = useState({}); // { SubjectName: "Present" | "Absent" }
    const [isLoading, setIsLoading] = useState(false);

    // Initial Fetch
    const fetchTodayStatus = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await auth().get(`/attendance/today?t=${new Date().getTime()}`);
            const data = res.data;
            setTodayData(data);

            if (data.status === "holiday") setView("holiday");
            else if (data.status === "marked" || data.status === "marked_no_class") setView("marked");
            else if (data.status === "pending") {
                if (data.message && data.message.includes("Add one first")) {
                    setView("upload");
                } else {
                    setView("checkin");
                    // Initialize checkboxes
                    const initialMap = {};
                    (data.subjects || []).forEach(sub => initialMap[sub] = "Present");
                    setAttendanceMap(initialMap);
                }
            }
        } catch (e) {
            console.error(e);
            showMessage("Failed to load attendance status.", "error");
        } finally {
            setIsLoading(false);
        }
    }, [showMessage]);

    useEffect(() => { fetchTodayStatus(); }, [fetchTodayStatus]);

    // Handlers
    const handleRoutineUpload = async () => {
        if (!routineText.trim() && !file) return showMessage("Please paste text or upload a file.", "error");
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('routine_text', routineText);
            if (file) formData.append('file', file);

            await auth().post("/attendance/routine/upload", formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showMessage("Routine parsed and saved!", "success");
            fetchTodayStatus(); // Refresh to go to checkin
        } catch (e) {
            showMessage(e.response?.data?.message || "Parsing failed. Try again.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkAttendance = async (type) => {
        setIsLoading(true);
        try {
            const payload = { type }; // 'classes' or 'no_class'
            if (type === 'classes') {
                payload.data = attendanceMap;
            }
            const res = await auth().post("/attendance/mark", payload);
            showMessage(res.data.message || "Attendance saved.", "success");
            fetchTodayStatus(); // Refresh to show success/marked view
        } catch (e) {
            showMessage(e.response?.data?.message || "Failed to mark.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteRoutine = async () => {
        if (!window.confirm("Are you sure you want to delete your routine? You will need to re-upload it.")) return;
        setIsLoading(true);
        try {
            await auth().delete("/attendance/routine");
            showMessage("Routine deleted.", "success");
            setView("upload");
            setRoutineText("");
            setFile(null);
            setTodayData(null);
            setAttendanceMap({});
        } catch (e) {
            showMessage("Failed to delete routine.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStats = async () => {
        setIsLoading(true);
        try {
            const res = await auth().get("/attendance/stats");
            setStats(res.data);
            setView("stats");
        } catch (e) {
            showMessage("Failed to load stats.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    // Sub-components
    const renderUpload = () => (
        <div className="space-y-4 max-w-xl mx-auto text-center animate-in fade-in zoom-in duration-300">
            <div className="p-4 bg-blue-500/10 rounded-full w-fit mx-auto mb-4">
                <Upload className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">Setup Your Routine</h3>
            <p className="text-slate-400">
                Paste your routine text or upload an image/PDF.
            </p>
            <div className="space-y-3">
                <textarea
                    value={routineText}
                    onChange={e => setRoutineText(e.target.value)}
                    placeholder="Ex: Monday: Math 10am, Physics 12pm..."
                    className="w-full h-32 bg-slate-800/50 border border-white/10 rounded-xl p-4 text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                />
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-slate-900 px-2 text-slate-500">Or Upload File</span>
                    </div>
                </div>
                <input
                    type="file"
                    accept=".txt,.pdf,.png,.jpg,.jpeg,.webp"
                    onChange={e => setFile(e.target.files[0])}
                    className="block w-full text-sm text-slate-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-500/10 file:text-blue-400
                        hover:file:bg-blue-500/20
                        cursor-pointer"
                />
            </div>
            <button
                onClick={handleRoutineUpload}
                disabled={isLoading}
                className={`${buttonClass} ${primaryButtonClass} w-full`}
            >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Process Routine with AI"}
            </button>
            {/* Divider */}
            <div className="pt-4 border-t border-white/5 mt-4">
                <button
                    onClick={() => setView("checkin")}
                    className="text-sm text-slate-500 hover:text-white underline"
                >
                    Cancel / Go Back
                </button>
            </div>
        </div>
    );

    const renderCheckin = () => (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div>
                <h3 className="text-xl font-bold text-white mb-6">Today's Classes</h3>
                <div className="space-y-4 mb-6">
                    {Object.keys(attendanceMap).length === 0 ? (
                        <div className="p-4 bg-slate-800/50 rounded-xl text-slate-400 text-sm">
                            No classes found for today in your routine.
                        </div>
                    ) : Object.keys(attendanceMap).map((subject, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-slate-800/40 border border-white/5 rounded-xl">
                            <span className="font-semibold text-slate-200">{subject}</span>
                            <div className="flex bg-slate-900 rounded-lg p-1">
                                <button
                                    onClick={() => setAttendanceMap({ ...attendanceMap, [subject]: "Present" })}
                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${attendanceMap[subject] === "Present" ? "bg-green-500 text-white shadow-lg" : "text-slate-500 hover:text-white"}`}
                                >
                                    P
                                </button>
                                <button
                                    onClick={() => setAttendanceMap({ ...attendanceMap, [subject]: "Absent" })}
                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${attendanceMap[subject] === "Absent" ? "bg-red-500 text-white shadow-lg" : "text-slate-500 hover:text-white"}`}
                                >
                                    A
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => handleMarkAttendance('classes')}
                        disabled={isLoading || Object.keys(attendanceMap).length === 0}
                        className={`${buttonClass} ${primaryButtonClass} w-full flex justify-center items-center gap-2`}
                    >
                        <Save className="w-4 h-4" /> Save Attendance
                    </button>
                    <button
                        onClick={() => handleMarkAttendance('no_class')}
                        disabled={isLoading}
                        className={`${buttonClass} border border-slate-600 hover:bg-slate-800 w-full text-slate-300`}
                    >
                        No Classes Today
                    </button>
                </div>

                <div className="mt-6 flex justify-between items-center text-xs text-slate-500 border-t border-white/5 pt-4">
                    <button onClick={fetchStats} className="hover:text-blue-400 flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" /> View Stats
                    </button>
                    <button onClick={handleDeleteRoutine} className="hover:text-red-400 flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Reset Routine
                    </button>
                </div>
            </div>
        </div>
    );

    const handleResetToday = async () => {
        if (!window.confirm("Want to change today's attendance? This will reset today's entry.")) return;
        setIsLoading(true);
        try {
            await auth().delete("/attendance/today");
            showMessage("Ready to update.", "success");
            fetchTodayStatus();
        } catch (e) {
            showMessage("Failed to reset.", "error");
            setIsLoading(false);
        }
    };

    const renderMarked = () => (
        <div className="text-center py-10 space-y-6 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto ring-4 ring-emerald-500/10">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
                <h3 className="text-2xl font-bold text-white mb-2">You're All Set!</h3>
                <p className="text-slate-400 max-w-sm mx-auto">
                    {todayData?.status === 'marked_no_class' ? "Enjoy your day off! " : "Attendance for today has been recorded."}
                </p>
                {todayData?.fun_message && (
                    <div className="mt-6 p-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl">
                        <p className="text-indigo-300 italic">" {todayData.fun_message} "</p>
                    </div>
                )}
            </div>
            <div className="flex justify-center gap-4 text-sm font-medium">
                <button onClick={fetchStats} className="text-blue-400 hover:text-blue-300 underline">
                    View My Statistics
                </button>
                <span className="text-slate-600">|</span>
                <button onClick={handleResetToday} className="text-slate-400 hover:text-white flex items-center gap-1">
                    <Edit className="w-3 h-3" /> Edit / Reset
                </button>
            </div>
        </div>
    );

    const renderHoliday = () => (
        <div className="text-center py-10 space-y-6 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto ring-4 ring-amber-500/10">
                <Sparkles className="w-10 h-10 text-amber-400" />
            </div>
            <div>
                <h3 className="text-2xl font-bold text-white mb-2">Happy Sunday!</h3>
                <div className="mt-4 p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl max-w-md mx-auto relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="w-20 h-20" /></div>
                    <p className="text-amber-200 text-lg font-medium leading-relaxed">
                        {todayData?.message || "Take a break and recharge for the week ahead!"}
                    </p>
                </div>
            </div>
            <button onClick={fetchStats} className="text-blue-400 hover:text-blue-300 underline font-medium">
                View Statistics
            </button>
        </div>
    );

    const renderStats = () => (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={fetchTodayStatus} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="text-2xl font-bold text-white">Attendance Analytics</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 bg-gradient-to-br from-blue-600 to-indigo-600 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="text-blue-200 text-sm font-bold uppercase tracking-wider mb-1">Overall Attendance</div>
                        <div className="text-5xl font-bold">{stats?.overall || 0}%</div>
                        <div className="text-xs text-blue-200 mt-2 opacity-80">Accumulated Average</div>
                    </div>
                    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/20 rounded-full blur-2xl" />
                </div>

                <div className="md:col-span-2 grid gap-3">
                    {stats?.subject_wise?.map((sub, i) => (
                        <div key={i} className="bg-slate-800/50 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                            <div>
                                <div className="font-bold text-slate-200">{sub.subject}</div>
                                <div className="text-xs text-slate-500">{sub.present}/{sub.total} Classes Attended</div>
                            </div>
                            <div className={`text-xl font-bold ${sub.percentage >= 75 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {sub.percentage}%
                            </div>
                        </div>
                    ))}
                    {(!stats?.subject_wise || stats.subject_wise.length === 0) && (
                        <div className="text-center text-slate-500 py-4">No data available yet.</div>
                    )}
                </div>
            </div>
            <div className="flex justify-end">
                <button
                    onClick={handleDeleteRoutine}
                    className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1"
                >
                    <Trash2 className="w-3 h-3" /> Reset Routine
                </button>
            </div>
        </div>
    );

    return (
        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-white/10 min-h-[400px]">
            {isLoading && view === 'loading' ? (
                <div className="h-full flex flex-col items-center justify-center p-20 text-blue-400">
                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                    <span className="text-sm font-medium">Syncing with Orbit...</span>
                </div>
            ) : (
                <>
                    {view === 'upload' && renderUpload()}
                    {view === 'checkin' && renderCheckin()}
                    {view === 'marked' && renderMarked()}
                    {view === 'holiday' && renderHoliday()}
                    {view === 'stats' && renderStats()}
                </>
            )}
        </div>
    );
}

// Academic Insights Component (Groq Powered)
