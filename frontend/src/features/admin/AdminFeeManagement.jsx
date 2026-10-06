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

export default function AdminFeeManagement({ showMessage, buttonClass, primaryButtonClass, catalogs }) {
    const { degrees, loaded } = catalogs;
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState(''); // Amount in Rupees
    const [category, setCategory] = useState('tuition');
    const [dueDate, setDueDate] = useState('');
    const [targetType, setTargetType] = useState('batch'); // batch, sem, custom, single

    // Dynamic targeting fields
    const [targetDegree, setTargetDegree] = useState(degrees[0] || '');
    const [targetSemester, setTargetSemester] = useState('1');
    const [targetSections, setTargetSections] = useState(''); // Comma separated, e.g., "A,B"
    const [customSrns, setCustomSrns] = useState(''); // Comma separated, e.g., "SRN001,SRN005"
    const [singleSrn, setSingleSrn] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (loaded && Array.isArray(degrees) && degrees.length > 0) {
            if (!targetDegree) setTargetDegree(degrees[0]);
        }
    }, [loaded, degrees, targetDegree]);

    const handleSubmit = async () => {
        if (!title || !amount || parseFloat(amount) <= 0 || !targetType) {
            return showMessage("Title and a valid Amount are required.", 'error');
        }

        const amountCents = Math.round(parseFloat(amount) * 100);

        let payload = {
            title, description, amount_cents: amountCents, category,
            due_date: dueDate || undefined, target: targetType,
        };

        if (targetType === 'sem') {
            if (!targetDegree || !targetSemester) return showMessage("Degree and Semester are required for sem targeting.", 'error');
            payload.degree = targetDegree;
            payload.semester = parseInt(targetSemester);
        } else if (targetType === 'custom') {
            const srnList = customSrns.split(',').map(s => s.trim()).filter(s => s);
            if (srnList.length === 0) return showMessage("Enter at least one SRN for custom targeting.", 'error');
            payload.srns = srnList;
        } else if (targetType === 'single') {
            if (!singleSrn.trim()) return showMessage("Enter a single SRN for targeted fee.", 'error');
            payload.single_srn = singleSrn.trim();
        }

        if (targetSections && (targetType === 'batch' || targetType === 'sem')) {
            payload.sections = targetSections;
        }

        setIsLoading(true);
        try {
            // Using auth()
            const res = await auth().post("/admin/fees/create", payload);
            showMessage(`Fee Notification created. Targets created: **${res.data.targets_created}**`, 'success');
            setTitle(''); setDescription(''); setAmount(''); setDueDate('');
            setTargetSections(''); setCustomSrns(''); setSingleSrn('');
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Fee creation failed. Check input data or backend logs.", 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const isSemesterTarget = targetType === 'sem';
    const isCustomTarget = targetType === 'custom';
    const isSingleTarget = targetType === 'single';
    const isBroadTarget = targetType === 'batch' || targetType === 'sem';


    return (
        <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-yellow-500/20 space-y-4">
            <h4 className="text-2xl font-bold mb-4 text-yellow-400 flex items-center"><IndianRupee className="w-6 h-6 mr-2" /> Create New Fee Notification</h4>

            <Input placeholder="Fee Title (e.g., Tuition Fee Sem 4)" value={title} onChange={e => setTitle(e.target.value)} disabled={isLoading} />
            <Input
                type="number"
                placeholder="Amount in Rupees (e.g., 5000.00)"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                disabled={isLoading}
            />

            <div className="grid grid-cols-2 gap-3">
                <Select value={category} onChange={e => setCategory(e.target.value)} disabled={isLoading}>
                    <option value="tuition" className="text-slate-900">Tuition Fee</option>
                    <option value="hostel" className="text-slate-900">Hostel Fee</option>
                    <option value="transport" className="text-slate-900">Transport Fee</option>
                    <option value="exam" className="text-slate-900">Exam Fee</option>
                    <option value="misc" className="text-slate-900">Miscellaneous</option>
                </Select>
                <Input type="date" placeholder="Due Date (Optional)" value={dueDate} onChange={e => setDueDate(e.target.value)} disabled={isLoading} className="text-slate-300" />
            </div>

            <h5 className="text-lg font-bold text-slate-300 pt-4 border-t border-white/10">Target Students:</h5>

            <Select value={targetType} onChange={e => setTargetType(e.target.value)} disabled={isLoading}>
                <option value="batch" className="text-slate-900">Whole Student Body (All Degrees/Sems)</option>
                <option value="sem" className="text-slate-900">Specific Degree & Semester</option>
                <option value="custom" className="text-slate-900">Custom List of SRNs (Bulk)</option>
                <option value="single" className="text-slate-900">Single SRN</option>
            </Select>

            {isSemesterTarget && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
                    {loaded && Array.isArray(degrees) && degrees.length > 0 ? (
                        <>
                            <Select value={targetDegree} onChange={e => setTargetDegree(e.target.value)} disabled={isLoading}>
                                {degrees.map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                            </Select>
                            <Select value={targetSemester} onChange={e => setTargetSemester(e.target.value)} disabled={isLoading}>
                                {Array.from({ length: 8 }, (_, i) => i + 1).map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                            </Select>
                        </>
                    ) : <div className="col-span-2 text-center text-sm text-slate-500">Loading degree list...</div>}
                </div>
            )}

            {(isBroadTarget) && (
                <Input
                    placeholder="Sections (Optional, Comma-separated: A, B, C)"
                    value={targetSections}
                    onChange={e => setTargetSections(e.target.value)}
                    disabled={isLoading}
                    className="animate-in fade-in duration-300"
                />
            )}

            {isCustomTarget && (
                <textarea
                    className="w-full bg-slate-800/50 backdrop-blur-xl text-white border border-white/10 rounded-xl py-3 px-4 h-24 placeholder-slate-500 focus:ring-2 focus:ring-yellow-500/50 outline-none"
                    placeholder="Enter SRNs separated by commas (e.g., SRN001, SRN005, SRN010)"
                    value={customSrns}
                    onChange={e => setCustomSrns(e.target.value)}
                    disabled={isLoading}
                />
            )}

            {isSingleTarget && (
                <Input
                    placeholder="Enter Single SRN"
                    value={singleSrn}
                    onChange={e => setSingleSrn(e.target.value)}
                    disabled={isLoading}
                />
            )}

            <button
                className={`${buttonClass} ${primaryButtonClass} w-full mt-4`}
                onClick={handleSubmit}
                disabled={isLoading}
            >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                {isLoading ? 'Creating Notification...' : 'Create Fee Notification'}
            </button>
        </div>
    );
}

// --- ADMIN MODULE: Hostel Complaints (MODIFIED) ---
