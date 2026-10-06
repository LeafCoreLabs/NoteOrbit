import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import gsap from "gsap";
import {
    LogIn, UserPlus, LogOut, ArrowLeft, ArrowRight, Loader2, CheckCircle, XCircle, ChevronDown,
    Book, Bell, Settings, Briefcase, User, Mail, Lock, GraduationCap, ClipboardList,
    BriefcaseBusiness, IndianRupee, Award, MessageSquare, Upload, RefreshCw,
    Trash2, Save, Home, Search, Download, Check, Atom, Star, Sparkles, Plus, Filter, Eye, EyeOff, Edit,
    BrainCircuit, AlertTriangle, Target, Lightbulb, Send as SendIcon, Paperclip, Menu, History, Bot, BarChart3
} from "lucide-react";
import { unauth } from "../api";

export function useCatalogs() {
    const [degrees, setDegrees] = useState([]);
    const [sections, setSections] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loaded, setLoaded] = useState(false);

    const fetchBasics = useCallback(async () => {
        try {
            // Using unauth() for public catalog lists
            const [deg] = await Promise.all([
                unauth().get("/admin/degrees"),
            ]);
            setDegrees(deg.data.degrees || []);
            // Sections now depend on context, don't fetch globally
        } catch (e) {
            console.error("Failed to fetch basics from backend:", e);
            setDegrees([]);
        } finally {
            setLoaded(true);
        }
    }, []);

    const fetchSubjects = useCallback(async (degree, semester) => {
        if (!degree || !semester) {
            setSubjects([]);
            return [];
        }
        try {
            // Using unauth() for public catalog lists
            const res = await unauth().get("/admin/subjects", { params: { degree, semester } });
            const subjNames = (res.data.subjects || []).map(s => s.name);
            setSubjects(subjNames);
            return subjNames;
        } catch (e) {
            console.error("Failed to fetch subjects:", e);
            setSubjects([]);
            return [];
        }
    }, []);

    const fetchSections = useCallback(async (degree, semester) => {
        if (!degree || !semester) {
            setSections([]);
            return [];
        }
        try {
            const res = await unauth().get("/admin/sections", { params: { degree, semester } });
            const secNames = res.data.sections || [];
            setSections(secNames);
            return secNames;
        } catch (e) {
            console.error("Failed to fetch sections:", e);
            setSections([]);
            return [];
        }
    }, []);

    useEffect(() => { fetchBasics(); }, [fetchBasics]);
    return { degrees, sections, subjects, fetchSubjects, fetchSections, loaded, fetchBasics };
}
