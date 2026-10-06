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
import { Input } from "../../components/ui";

export default function AdminFacultyOnboarding({ showMessage, buttonClass, primaryButtonClass }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [empId, setEmpId] = useState(""); // <-- NEW EMP ID FIELD
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!name || !email || !password || !empId) {
            return showMessage("Full Name, Email, Password, and Employee ID are required.", 'error');
        }

        setIsLoading(true);
        try {
            const payload = {
                name, email, password,
                emp_id: empId, // <-- Send the new EMP ID field
            };
            // Using auth()
            const res = await auth().post("/admin/add-faculty", payload);
            showMessage(res.data.message, 'success');
            setName('');
            setEmail('');
            setPassword('');
            setEmpId('');
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to add faculty account.", 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-yellow-500/20 space-y-4">
            <h4 className="text-2xl font-bold mb-4 text-yellow-400 flex items-center"><UserPlus className="w-6 h-6 mr-2" /> Onboard New Faculty Member</h4>

            <Input placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} disabled={isLoading} />
            <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
            <Input type="password" placeholder="Temporary Password" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />

            <Input placeholder="Employee ID (e.g., FCLT001)" value={empId} onChange={e => setEmpId(e.target.value)} disabled={isLoading} />

            <button
                className={`${buttonClass} ${primaryButtonClass} w-full`}
                onClick={handleSubmit}
                disabled={isLoading || !name || !email || !password || !empId}
            >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                {isLoading ? 'Processing...' : 'Create Professor Account'}
            </button>
        </div>
    );
}
