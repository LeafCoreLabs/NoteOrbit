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
import { Input, Select } from "../../components/ui";

export default function AdminNoteUpload({ showMessage, buttonClass, primaryButtonClass, catalogs }) {
    const { degrees, fetchSubjects, fetchSections } = catalogs;
    const [title, setTitle] = useState("");
    const [degree, setDegree] = useState("");
    const [semester, setSemester] = useState("1");
    const [section, setSection] = useState("");
    const [subject, setSubject] = useState("");
    const [documentType, setDocumentType] = useState("Notes");
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isListLoading, setIsListLoading] = useState(false);
    const [uploadedItems, setUploadedItems] = useState([]);

    // Dynamic Lists
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [availableSections, setAvailableSections] = useState([]);

    // Initialize defaults
    useEffect(() => {
        if (degrees.length && !degree) setDegree(degrees[0]);
    }, [degrees, degree]);

    // Fetch Subjects & Sections on Deg/Sem change
    useEffect(() => {
        if (degree && semester) {
            fetchSubjects(degree, semester).then(setAvailableSubjects);
            fetchSections(degree, semester).then(setAvailableSections);
        } else {
            setAvailableSubjects([]);
            setAvailableSections([]);
        }
    }, [degree, semester, fetchSubjects, fetchSections]);

    // Reset subject if not in new list
    useEffect(() => {
        if (availableSubjects.length && !availableSubjects.includes(subject)) {
            setSubject(availableSubjects[0]);
        } else if (!availableSubjects.length) {
            setSubject("");
        }
    }, [availableSubjects, subject]);


    const handleUpload = async () => {
        if (!title || !file || !degree || !semester || !section || !subject) {
            return showMessage("All fields are required.", 'error');
        }

        setIsLoading(true);
        const form = new FormData();
        form.append("title", title);
        form.append("degree", degree);
        form.append("semester", semester);
        form.append("section", section);
        form.append("subject", subject);
        form.append("document_type", documentType);
        form.append("file", file);

        try {
            await auth().post("/upload-note", form);
            showMessage("Study material uploaded successfully!", 'success');
            setTitle("");
            setFile(null);
            if (document.getElementById('adminNoteFile')) document.getElementById('adminNoteFile').value = '';
        } catch (err) {
            if (err.response && err.response.status !== 401) {
                showMessage(err.response?.data?.message || "Upload failed", 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUploaded = useCallback(async () => {
        if (!degree || !semester) {
            setUploadedItems([]);
            return;
        }
        setIsListLoading(true);
        try {
            const params = { degree, semester };
            if (subject) params.subject = subject;
            // If section is blank => fetch all sections for management
            if (section) params.section = section;
            if (documentType) params.document_type = documentType;

            const res = await auth().get("/notes", { params });
            setUploadedItems(res.data.notes || []);
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to load uploaded materials.", "error");
            }
            setUploadedItems([]);
        } finally {
            setIsListLoading(false);
        }
    }, [degree, semester, subject, section, documentType, showMessage]);

    useEffect(() => {
        // Keep the admin list in sync with the selected filters
        fetchUploaded();
    }, [fetchUploaded]);

    const handleDelete = async (noteId) => {
        const ok = window.confirm("Delete this uploaded material? This cannot be undone.");
        if (!ok) return;
        try {
            await auth().delete(`/admin/notes/${noteId}`);
            showMessage("Deleted successfully.", "success");
            fetchUploaded();
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Delete failed.", "error");
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-green-500/20 space-y-4">
                <h4 className="text-2xl font-bold mb-4 text-green-400 flex items-center"><Book className="w-6 h-6 mr-2" /> Upload Study Material (Admin)</h4>

                <Input placeholder="Title (e.g., Module 1 PPT)" value={title} onChange={e => setTitle(e.target.value)} disabled={isLoading} />

                <div className="grid grid-cols-3 gap-3">
                    <Select value={degree} onChange={e => setDegree(e.target.value)} disabled={isLoading}>
                        <option value="" className="text-slate-900">Select Degree</option>
                        {(degrees || []).map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                    </Select>
                    <Select value={semester} onChange={e => setSemester(e.target.value)} disabled={isLoading}>
                        {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s} className="text-slate-900">Sem {s}</option>)}
                    </Select>
                    <Select value={section} onChange={e => setSection(e.target.value)} disabled={isLoading}>
                        <option value="" className="text-slate-900">All Sections (Manage)</option>
                        <option value="ALL" className="text-amber-400 font-bold">All Sections</option>
                        {(availableSections || []).map(s => <option key={s} value={s} className="text-slate-900">Sec {s}</option>)}
                    </Select>
                </div>

                <Select value={subject} onChange={e => setSubject(e.target.value)} icon={Book} disabled={isLoading || !availableSubjects.length}>
                    <option value="" className="text-slate-900">Select Subject</option>
                    {(availableSubjects || []).map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                </Select>

                <Select value={documentType} onChange={e => setDocumentType(e.target.value)} disabled={isLoading}>
                    <option value="Notes" className="text-slate-900">Notes</option>
                    <option value="Question Bank" className="text-slate-900">Question Bank</option>
                    <option value="Reference Book" className="text-slate-900">Reference Book</option>
                </Select>

                <label className="block text-sm text-slate-300 font-medium pt-2">Select File (PDF, DOCX, PPTX):</label>
                <input
                    id="adminNoteFile"
                    type="file"
                    onChange={e => setFile(e.target.files[0])}
                    className="w-full text-slate-300 bg-slate-800/50 rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 transition duration-200"
                    disabled={isLoading}
                />

                <button
                    className={`${buttonClass} ${primaryButtonClass} w-full`}
                    onClick={handleUpload}
                    disabled={isLoading || !title || !file || !degree || !subject}
                >
                    {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Upload className="w-5 h-5 mr-2" />}
                    {isLoading ? 'Uploading...' : 'Upload Material'}
                </button>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-white/10">
                <div className="flex items-center justify-between gap-3 mb-4">
                    <h5 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        <History className="w-5 h-5 text-slate-400" /> Manage Uploaded Materials
                    </h5>
                    <button
                        className={`${buttonClass} bg-slate-700 hover:bg-slate-600 text-white text-sm`}
                        onClick={fetchUploaded}
                        disabled={isListLoading || !degree || !semester}
                    >
                        {isListLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Refresh
                    </button>
                </div>

                {!degree && <div className="text-sm text-slate-400">Select Degree/Semester to view uploaded materials.</div>}

                {degree && semester && !isListLoading && uploadedItems.length === 0 && (
                    <div className="p-4 bg-slate-900/40 border border-white/10 rounded-xl text-slate-500 text-sm">
                        No uploaded materials found for the selected filters.
                    </div>
                )}

                {isListLoading && (
                    <div className="text-center py-8">
                        <Loader2 className="animate-spin w-6 h-6 mx-auto text-slate-300" />
                    </div>
                )}

                <div className="space-y-3">
                    {uploadedItems.map((n) => (
                        <div key={n.id} className="p-4 rounded-xl border border-white/10 bg-slate-800/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="min-w-0">
                                <div className="font-bold text-white truncate">{n.title}</div>
                                <div className="text-xs text-slate-400 mt-1">
                                    {n.degree} • Sem {n.semester} • Sec {n.section} • {n.subject} • <span className="text-blue-300">{n.document_type}</span>
                                </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                                {n.file_url && (
                                    <a className={`py-2 px-4 text-sm font-semibold rounded-full inline-flex items-center ${primaryButtonClass}`} href={n.file_url} target="_blank" rel="noopener noreferrer">
                                        Download
                                    </a>
                                )}
                                <button
                                    className={`${buttonClass} bg-red-600 hover:bg-red-700 text-white text-sm`}
                                    onClick={() => handleDelete(n.id)}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// --- NEW ADMIN MODULE: Book Upload
