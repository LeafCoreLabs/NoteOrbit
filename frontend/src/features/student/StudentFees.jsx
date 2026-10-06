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

export default function StudentFees({ user, showMessage, primaryButtonClass, buttonClass }) {
    const [fees, setFees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchFees = useCallback(async () => {
        setIsLoading(true);
        try {
            // Using auth()
            const res = await auth().get("/fees/list");
            setFees(res.data.fees || []);
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage("Failed to fetch fee list.", 'error');
            }
            setFees([]);
        } finally {
            setIsLoading(false);
        }
    }, [showMessage]);

    useEffect(() => { fetchFees(); }, [fetchFees]);

    const handlePay = async (targetId) => {
        try {
            // Using auth()
            const res = await auth().post("/fees/pay", { target_id: targetId });
            const { order_id } = res.data;
            // The backend returns an order_id which is used to redirect to the demo payment page
            window.location.href = `${BACKEND_BASE_URL}/demo/checkout/${order_id}`;
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Payment initiation failed.", 'error');
            }
        }
    };

    const handleReceipt = async (paymentId) => {
        try {
            // paymentId here is the ft.order_id which is set to the Payment ID after checkout
            // Using auth()
            const res = await auth().get(`/fees/receipt/${paymentId}`);
            window.open(res.data.receipt_url, '_blank');
        } catch (e) {
            if (e.response && e.response.status !== 401) {
                showMessage(e.response?.data?.message || "Failed to get receipt URL. It may have expired.", 'error');
            }
        }
    };

    if (isLoading) {
        return <div className="text-center p-10"><Loader2 className="animate-spin w-8 h-8 mx-auto text-blue-500" /></div>;
    }

    return (
        <div className="space-y-6">
            <h4 className="text-2xl font-bold text-blue-400 flex items-center"><IndianRupee className="w-6 h-6 mr-2" /> Fee Payment History</h4>
            {fees.length === 0 && <div className="p-4 bg-slate-900/40 border border-white/10 rounded-xl text-slate-500">No fee notifications found for your account.</div>}

            <div className="space-y-4">
                {fees.map(f => (
                    <div key={f.target_id} className={`p-4 rounded-xl shadow-lg transition duration-200 ${f.status === 'paid'
                        ? 'bg-green-900/20 border-l-4 border-green-500'
                        : 'bg-red-900/20 border-l-4 border-red-500'
                        }`}>
                        <div className="flex justify-between items-center">
                            <div className="flex-1">
                                <div className="font-bold text-lg text-white">{f.title} <span className="text-xs font-normal text-slate-400">({f.category})</span></div>
                                <div className="text-sm text-slate-300 mt-1">Amount: <strong className="text-white">₹{f.amount}</strong> | Due: {f.due_date ? new Date(f.due_date).toLocaleDateString() : 'N/A'}</div>
                            </div>
                            <div className="flex-shrink-0 ml-4">
                                {f.status === 'pending' && (
                                    <button
                                        className={`${buttonClass} w-32 py-2.5 ${primaryButtonClass}`}
                                        onClick={() => handlePay(f.target_id)}
                                    >
                                        Pay Now
                                    </button>
                                )}
                                {f.status === 'paid' && (
                                    <button
                                        className={`${buttonClass} w-32 py-2.5 bg-green-600 hover:bg-green-700 text-white`}
                                        onClick={() => handleReceipt(f.payment_id)}
                                    >
                                        Receipt
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 mt-2 border-t border-white/10 pt-1">Status: **{f.status.toUpperCase()}** {f.paid_at && `on ${new Date(f.paid_at).toLocaleDateString()}`}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
