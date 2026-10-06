import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import gsap from "gsap";
import {
    LogIn, UserPlus, LogOut, ArrowLeft, ArrowRight, Loader2, CheckCircle, XCircle, ChevronDown,
    Book, Bell, Settings, Briefcase, User, Mail, Lock, GraduationCap, ClipboardList,
    BriefcaseBusiness, IndianRupee, Award, MessageSquare, Upload, RefreshCw,
    Trash2, Save, Home, Search, Download, Check, Atom, Star, Sparkles, Plus, Filter, Eye, EyeOff, Edit,
    BrainCircuit, AlertTriangle, Target, Lightbulb, Send as SendIcon, Paperclip, Menu, History, Bot, BarChart3
} from "lucide-react";
import { setAuthToken } from "../api";

export function useLocalUser() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadUser = useCallback(() => {
        const raw = localStorage.getItem("noteorbit_user");
        const token = localStorage.getItem("noteorbit_token");

        if (raw && token) {
            try {
                const parsedUser = JSON.parse(raw);
                setUser(parsedUser);
                setAuthToken(token);
            } catch (e) {
                console.error("Corrupted user data in localStorage", e);
                setAuthToken(null);
                localStorage.removeItem("noteorbit_user");
                setUser(null);
            }
        }
        setIsLoading(false);
    }, []);

    useEffect(() => { loadUser(); }, [loadUser]);

    return [user, setUser, isLoading];
}

// --- UI COMPONENTS (Praman Style) ---
