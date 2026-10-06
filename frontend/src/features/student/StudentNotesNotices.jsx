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

export default function StudentNotesNotices({ user, showMessage, catalogs, primaryButtonClass, buttonClass }) {
    const { fetchSubjects, subjects } = catalogs;
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedDocType, setSelectedDocType] = useState('');
    const [notes, setNotes] = useState([]);
    const [notices, setNotices] = useState([]);
    const [isFetching, setIsFetching] = useState(false);

    const availableDocTypes = useMemo(() => {
        const types = (notes || [])
            .map(n => (n?.document_type || '').trim())
            .filter(Boolean);
        return Array.from(new Set(types)).sort((a, b) => a.localeCompare(b));
    }, [notes]);

    const filteredNotes = useMemo(() => {
        if (!Array.isArray(notes)) return [];
        if (!selectedDocType || selectedDocType.trim() === '') return [];
        return notes.filter(n => (n?.document_type || '').trim() === selectedDocType);
    }, [notes, selectedDocType]);

    const fetchContent = useCallback(async (subjectToFetch) => {
        if (!subjectToFetch || !user.degree || !user.semester) {
            setNotes([]); setNotices([]); return;
        }
        setIsFetching(true);
        try {
            // Using auth()
            const [notesRes, noticesRes] = await Promise.all([
                auth().get("/notes", { params: { degree: user.degree, semester: user.semester, subject: subjectToFetch } }),
                auth().get("/notices", { params: { subject: subjectToFetch } })
            ]);
            setNotes(notesRes.data.notes || []);
            setNotices(noticesRes.data.notices || []);
        } catch (e) {
            // Only show general error if not 401 (401 handled by auth interceptor)
            if (e.response && e.response.status !== 401) {
                showMessage("Failed to load content.", 'error');
            }
            setNotes([]); setNotices([]);
        } finally {
            setIsFetching(false);
        }
    }, [user.degree, user.semester, showMessage]);

    useEffect(() => {
        if (user && user.degree && user.semester) { fetchSubjects(user.degree, user.semester); } else { fetchSubjects(null, null); }
    }, [user.degree, user.semester, fetchSubjects]);

    useEffect(() => {
        let subjectToUse = selectedSubject;
        if (Array.isArray(subjects) && subjects.length > 0) {
            if (!subjectToUse || !subjects.includes(subjectToUse)) {
                subjectToUse = subjects[0];
                setSelectedSubject(subjectToUse);
            }
        } else {
            setSelectedSubject('');
            subjectToUse = null;
        }
        if (subjectToUse) { fetchContent(subjectToUse); } else { setNotes([]); setNotices([]); }
    }, [subjects, selectedSubject, fetchContent]);

    const handleRefresh = () => {
        if (selectedSubject) fetchContent(selectedSubject);
    };

    if (!user.degree || !user.semester) {
        return <div className="text-center p-10 bg-white rounded-xl shadow-md text-gray-500">Student profile missing degree/semester information. Please contact admin.</div>;
    }
    if (!subjects || subjects.length === 0) {
        return <div className="text-center p-10 bg-white rounded-xl shadow-md text-gray-500">No subjects are currently defined for {user.degree} Sem {user.semester}.</div>;
    }

    return (
        <div className="space-y-8">
            <div className="bg-blue-900/20 p-6 rounded-xl border border-blue-500/20 shadow-inner backdrop-blur-sm">
                <strong className="text-xl text-blue-400 block mb-1">Content Context</strong>
                <div className="text-sm text-blue-200">{user.degree} (Semester {user.semester} / Section {user.section})</div>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center pt-4">
                    <label className="text-base text-blue-100 font-bold flex-shrink-0">Filter Subject:</label>
                    <Select className="flex-1 max-w-xs" value={selectedSubject || ''} onChange={e => setSelectedSubject(e.target.value)} disabled={!subjects.length || isFetching}>
                        {Array.isArray(subjects) && subjects.map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                    </Select>
                    <Select className="flex-1 max-w-xs" value={selectedDocType} onChange={e => setSelectedDocType(e.target.value)} disabled={isFetching || notes.length === 0}>
                        <option value="" className="text-slate-900">Choose Resource Type</option>
                        {availableDocTypes.map(t => <option key={t} value={t} className="text-slate-900">{t}</option>)}
                    </Select>
                    <button className={`${buttonClass} bg-slate-700 hover:bg-slate-600 text-white text-sm sm:w-48 py-2.5`} onClick={handleRefresh} disabled={isFetching || !selectedSubject}>
                        {isFetching ? <Loader2 className="animate-spin w-5 h-5 mr-1" /> : <RefreshCw className="w-5 h-5 mr-1" />}
                        {isFetching ? 'Refreshing...' : 'Refresh Content'}
                    </button>
                </div>
            </div>

            <div>
                <h4 className="text-xl font-bold mt-4 mb-4 text-blue-400 flex items-center"><Book className="w-5 h-5 mr-2" /> Notes for "{selectedSubject || '...'}"</h4>
                {isFetching && <div className="text-center p-4"><Loader2 className="animate-spin w-5 h-5 mx-auto text-blue-500" /></div>}
                {!isFetching && !selectedDocType && (
                    <div className="p-4 bg-slate-900/40 border border-white/10 rounded-xl text-slate-300 text-sm text-center">
                        Please select a document type (Notes, Question Bank, or Reference Book) to view documents.
                    </div>
                )}
                {!isFetching && selectedDocType && notes.length === 0 && (
                    <div className="p-4 bg-slate-900/40 border border-white/10 rounded-xl text-slate-500 text-sm">No notes uploaded for {selectedSubject} yet.</div>
                )}
                {!isFetching && selectedDocType && notes.length > 0 && filteredNotes.length === 0 && (
                    <div className="p-4 bg-slate-900/40 border border-white/10 rounded-xl text-slate-500 text-sm">
                        No documents found for <b className="text-slate-200">{selectedDocType}</b>.
                    </div>
                )}
                {!isFetching && selectedDocType && filteredNotes.length > 0 && (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredNotes.map(n => (
                            <div key={n.id} className="p-4 rounded-xl shadow-md border-l-4 border-blue-500 bg-slate-800 hover:bg-slate-700 transition duration-200">
                                <div className="font-bold text-lg text-white truncate">{n.title} <span className="text-xs text-blue-400">({n.document_type})</span></div>
                                <div className="flex items-center gap-2 mt-1">
                                    {n.uploader_role === 'admin' ? (
                                        <span className="bg-red-500/20 text-red-300 text-[10px] px-2 py-0.5 rounded border border-red-500/30">Uploaded by Admin</span>
                                    ) : n.uploader_role === 'professor' ? (
                                        <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded border border-emerald-500/30">Uploaded by Faculty</span>
                                    ) : null}
                                    <div className="text-xs text-slate-400">{n.subject} | {new Date(n.timestamp).toLocaleDateString()}</div>
                                </div>
                                <div className="mt-3">
                                    {n.file_url && <a className={`py-1.5 px-4 text-sm font-semibold rounded-full inline-flex items-center ${primaryButtonClass}`} href={n.file_url} target="_blank" rel="noopener noreferrer">View</a>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <h4 className="text-xl font-bold mt-8 mb-4 text-red-400 flex items-center"><Bell className="w-5 h-5 mr-2" /> Notices for "{selectedSubject || '...'}"</h4>
                {!isFetching && notices.length === 0 && <div className="p-4 bg-slate-900/40 border border-white/10 rounded-xl text-slate-500 text-sm">No recent notices for {selectedSubject} matching your context.</div>}
                <div className="space-y-4">
                    {notices.map(n => (
                        <div key={n.id} className="p-4 bg-red-900/20 border-l-4 border-red-500 rounded-xl shadow-md backdrop-blur-sm">
                            <div className="font-bold text-xl text-red-400">{n.title}</div>
                            <div className="text-xs text-slate-400 mt-1">
                                Subject: {n.subject} | Target: {n.degree} Sem {n.semester} Sec {n.section}
                            </div>
                            <p className="mt-2 text-slate-200 text-[0.95rem]">{n.message}</p>
                            <div className="flex justify-between items-center mt-3 pt-2 border-t border-red-500/20">
                                <div className="text-xs text-slate-500">
                                    Posted by: {n.professor_name} on {new Date(n.created_at).toLocaleDateString()}
                                    {n.deadline && <span className="font-bold text-red-400 block mt-1">Deadline: {new Date(n.deadline).toLocaleDateString()}</span>}
                                </div>
                                {n.attachment_url && <a href={n.attachment_url} className={`py-1.5 px-4 text-sm font-semibold rounded-full inline-flex items-center bg-red-600 hover:bg-red-700 text-white`} target="_blank" rel="noopener noreferrer">Attachment</a>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
