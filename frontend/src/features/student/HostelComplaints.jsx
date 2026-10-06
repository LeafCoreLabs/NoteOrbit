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
import { ComplaintAuditTimeline, Input } from "../../components/ui";

export default function HostelComplaints({ showMessage, primaryButtonClass, buttonClass }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [attachment, setAttachment] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [userComplaints, setUserComplaints] = useState([]);
    const [isFetching, setIsFetching] = useState(true);
    const [hostelStatus, setHostelStatus] = useState('checking'); // 'allowed', 'not_allowed', 'error', 'checking'

    // This function attempts to fetch complaints and infers allocation status.
    const fetchUserComplaints = useCallback(async () => {
        setIsFetching(true);
        setHostelStatus('checking');

        try {
            // GET /student/hostel/complaints is the new endpoint
            const res = await auth().get("/student/hostel/complaints");
            setUserComplaints(res.data.complaints || []);
            setHostelStatus('allowed');

        } catch (e) {
            if (e.response) {
                if (e.response.status === 403 || (e.response.data.message && e.response.data.message.includes('not allowed'))) {
                    setHostelStatus('not_allowed');
                } else if (e.response.status !== 401) {
                    showMessage(e.response?.data?.message || "Failed to load complaint history.", 'error');
                    setHostelStatus('error');
                }
            }
            setUserComplaints([]);
        } finally {
            setIsFetching(false);
        }
    }, [showMessage]);

    useEffect(() => { fetchUserComplaints(); }, [fetchUserComplaints]);

    const handleSubmit = async () => {
        if (!title || !description) {
            return showMessage("Title and description are required.", 'error');
        }

        setIsLoading(true);
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        if (attachment) formData.append('attachment', attachment);

        try {
            const res = await auth().post("/hostel/complaints", formData);
            showMessage(res.data.message, 'success');
            setTitle(''); setDescription(''); setAttachment(null);
            if (document.getElementById('complaintAttachment')) document.getElementById('complaintAttachment').value = '';

            // Refresh the list immediately after submission
            fetchUserComplaints();

        } catch (e) {
            const msg = e.response?.data?.message || "Failed to submit complaint. Check allocation status.";
            if (e.response && e.response.status === 403) {
                setHostelStatus('not_allowed'); // Explicitly block if 403
            }
            showMessage(msg, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching && hostelStatus === 'checking') {
        return <div className="text-center p-10"><Loader2 className="animate-spin w-8 h-8 mx-auto text-red-500" /></div>;
    }

    if (hostelStatus === 'not_allowed') {
        return (
            <div className="text-center p-10 bg-red-900/20 rounded-xl shadow-md border border-red-500/30">
                <XCircle className="w-10 h-10 mx-auto text-red-500 mb-4" />
                <h4 className="text-2xl font-bold text-red-400">Complaint Submission Blocked</h4>
                <p className="text-lg text-red-300 mt-2">**Not allowed for complaining as no hostel is allotted for you.**</p>
                <p className="text-sm text-slate-400 mt-4">Please contact the administration if you believe this is an error.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-red-500/20 space-y-4">
                <h4 className="text-2xl font-bold mb-4 text-red-400 flex items-center"><Home className="w-6 h-6 mr-2" /> Raise Hostel Complaint</h4>
                <Input placeholder="Complaint Title (e.g., Water leakage in Room 101)" value={title} onChange={e => setTitle(e.target.value)} disabled={isLoading} />
                <textarea className="w-full bg-slate-800/50 backdrop-blur-xl text-white placeholder-slate-500 border border-white/10 rounded-xl py-3 px-4 focus:ring-2 focus:ring-red-500/50 outline-none transition duration-200 h-32" placeholder="Detailed description of the issue..." value={description} onChange={e => setDescription(e.target.value)} disabled={isLoading} />
                <label className="block text-sm text-slate-300 font-medium pt-2">Attach Image/File (Optional):</label>
                <input id="complaintAttachment" type="file" onChange={e => setAttachment(e.target.files[0])} className="w-full text-slate-300 bg-slate-800/50 rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700 transition duration-200" disabled={isLoading} />
                <button className={`${buttonClass} ${primaryButtonClass} bg-red-600 hover:bg-red-700 text-white w-full`} onClick={handleSubmit} disabled={isLoading || !title || !description}>
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Mail className="w-5 h-5 mr-2" />}
                    {isLoading ? 'Submitting...' : 'Submit Complaint'}
                </button>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-white/10">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xl font-bold text-red-400 flex items-center"><ClipboardList className="w-5 h-5 mr-2" /> Your Complaint History ({userComplaints.length})</h4>
                    <button onClick={fetchUserComplaints} className="p-2 bg-slate-700 rounded-full hover:bg-slate-600 transition" disabled={isFetching}><RefreshCw className="w-5 h-5 text-slate-300" /></button>
                </div>

                {isFetching ? (
                    <div className="text-center p-4"><Loader2 className="animate-spin w-5 h-5 mx-auto text-red-500" /></div>
                ) : userComplaints.length === 0 ? (
                    <div className="p-4 text-slate-500 text-center">You have no active or historical complaints.</div>
                ) : (
                    <div className="space-y-6">
                        {userComplaints.map(c => (
                            <div key={c.id} className={`p-4 rounded-xl shadow-md border-l-4 ${c.status === 'Resolved' || c.status === 'Closed' ? 'border-green-500 bg-green-900/20' : c.status.includes('Progress') || c.status.includes('Review') ? 'border-orange-500 bg-orange-900/20' : 'border-red-500 bg-red-900/20'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-lg text-white">{c.title}</div>
                                        <div className="text-sm text-slate-400 mt-1">Room: {c.room_number} in {c.hostel_name}</div>
                                    </div>
                                    <div className={`text-sm px-3 py-1 rounded-full font-semibold ${c.status === 'Resolved' || c.status === 'Closed' ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                                        {c.status}
                                    </div>
                                </div>
                                <ComplaintAuditTimeline auditTrail={c.audit_trail || []} />
                                {c.file_url && <a href={c.file_url} className="mt-3 inline-flex items-center text-xs text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">View Attachment</a>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
