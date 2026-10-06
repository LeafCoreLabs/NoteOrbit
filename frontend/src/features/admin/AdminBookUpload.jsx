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

export default function AdminBookUpload({ showMessage, buttonClass, primaryButtonClass, catalogs }) {
    const { degrees } = catalogs;
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [isbn, setIsbn] = useState("");
    const [file, setFile] = useState(null);
    const [degree, setDegree] = useState(degrees[0] || "");
    const [semester, setSemester] = useState("1");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (degrees.length && !degree) setDegree(degrees[0]);
    }, [degrees, degree]);

    const handleUpload = async () => {
        if (!title || !author || !degree || !semester || !file) {
            return showMessage("Title, Author, Degree, Semester, and File are required.", 'error');
        }

        setIsLoading(true);
        const form = new FormData();
        form.append("title", title);
        form.append("author", author);
        form.append("isbn", isbn);
        form.append("degree", degree);
        form.append("semester", semester);
        form.append("file", file);

        try {
            const res = await auth().post("/api/admin/library/book", form);
            showMessage(res.data.message, 'success');
            setTitle("");
            setAuthor("");
            setIsbn("");
            setFile(null);
            if (document.getElementById('bookFile')) document.getElementById('bookFile').value = '';
        } catch (err) {
            if (err.response && err.response.status !== 401) {
                showMessage(err.response?.data?.message || "Book upload failed.", 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-blue-500/20 space-y-4">
            <h4 className="text-2xl font-bold mb-4 text-blue-400 flex items-center"><Upload className="w-6 h-6 mr-2" /> Upload Internal E-Book / Resource</h4>

            <Input placeholder="Book Title" value={title} onChange={e => setTitle(e.target.value)} disabled={isLoading} />
            <Input placeholder="Author Name" value={author} onChange={e => setAuthor(e.target.value)} disabled={isLoading} />
            <Input placeholder="ISBN (Optional)" value={isbn} onChange={e => setIsbn(e.target.value)} disabled={isLoading} />

            <div className="grid grid-cols-2 gap-3">
                <Select value={degree} onChange={e => setDegree(e.target.value)} disabled={isLoading}>
                    <option value="" className="text-slate-900">Select Degree</option>
                    {(degrees || []).map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                </Select>
                <Select value={semester} onChange={e => setSemester(e.target.value)} disabled={isLoading}>
                    {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                </Select>
            </div>

            <label className="block text-sm text-slate-300 font-medium pt-2">Select Book File (PDF, EPUB, DOCX):</label>
            <input
                id="bookFile"
                type="file"
                onChange={e => setFile(e.target.files[0])}
                className="w-full text-slate-300 bg-slate-800/50 rounded-lg p-3 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition duration-200"
                disabled={isLoading}
            />

            <button
                className={`${buttonClass} ${primaryButtonClass} w-full`}
                onClick={handleUpload}
                disabled={isLoading || !title || !author || !degree || !semester || !file}
            >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                {isLoading ? 'Uploading Book...' : 'Upload Book'}
            </button>
        </div>
    );
}
