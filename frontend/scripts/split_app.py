"""Split monolithic app.jsx into distributed feature modules."""
from __future__ import annotations

import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
LEGACY = os.path.join(SRC, "app.jsx")

# component name -> (subdir under features/, export default?)
MAP = {
    "useCatalogs": ("hooks", False),
    "useLocalUser": ("hooks", False),
    "OrbitLogo": ("components/ui", True),
    "cents_to_rupees_str": ("utils", False),
    "Input": ("components/ui", True),
    "Select": ("components/ui", True),
    "MessageBar": ("components/ui", True),
    "WelcomeLoader": ("components/ui", True),
    "ComplaintAuditTimeline": ("components/ui", True),
    "UserTypeSelection": ("features/auth", True),
    "ForgotPasswordModal": ("features/auth", True),
    "CredentialsView": ("features/auth", True),
    "StudentFeedback": ("features/student", True),
    "StudentNotesNotices": ("features/student", True),
    "StudentFees": ("features/student", True),
    "StudentMarks": ("features/student", True),
    "HostelComplaints": ("features/student", True),
    "UnifiedLibrarySearch": ("features/student", True),
    "AIChat": ("features/student", True),
    "StudentAttendanceCalendar": ("features/student", True),
    "StudentAttendanceFeature": ("features/student", True),
    "AcademicInsights": ("features/student", True),
    "StudentPanel": ("features/student", True),
    "ProfessorMarksUpload": ("features/professor", True),
    "ProfessorFeedback": ("features/professor", True),
    "ProfessorMessages": ("features/professor", True),
    "ProfessorPanel": ("features/professor", True),
    "AdminNoteUpload": ("features/admin", True),
    "AdminBookUpload": ("features/admin", True),
    "FacultyAttendance": ("features/admin", True),
    "AdminHostelManagement": ("features/admin", True),
    "AdminStudentList": ("features/admin", True),
    "AdminFacultyOnboarding": ("features/admin", True),
    "AdminFeeManagement": ("features/admin", True),
    "AdminHostelComplaints": ("features/admin", True),
    "AdminFacultyManagement": ("features/admin", True),
    "AdminPanel": ("features/admin", True),
    "ParentContactFaculty": ("features/parent", True),
    "ParentPanel": ("features/parent", True),
    "App": ("app", True),
}

HEADER = '''import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import gsap from "gsap";
import {
    LogIn, UserPlus, LogOut, ArrowLeft, ArrowRight, Loader2, CheckCircle, XCircle, ChevronDown,
    Book, Bell, Settings, Briefcase, User, Mail, Lock, GraduationCap, ClipboardList,
    BriefcaseBusiness, IndianRupee, Award, MessageSquare, Upload, RefreshCw,
    Trash2, Save, Home, Search, Download, Check, Atom, Star, Sparkles, Plus, Filter, Eye, EyeOff, Edit,
    BrainCircuit, AlertTriangle, Target, Lightbulb, Send as SendIcon, Paperclip, Menu, History, Bot, BarChart3
} from "lucide-react";
import { api, auth, unauth } from "../../api";
import { setAuthToken, sendOtp, verifyOtp, resetPassword, registerWithOtp } from "../../api/auth";
import { cents_to_rupees_str } from "../../utils/format";
import { useCatalogs } from "../../hooks/useCatalogs";
import { useLocalUser } from "../../hooks/useLocalUser";
import OrbitLogo from "../../components/ui/OrbitLogo";
import { Input, Select, MessageBar, WelcomeLoader, ComplaintAuditTimeline } from "../../components/ui";
import ParticleBackground from "../../components/ParticleBackground";
'''

# Simpler per-folder depth for imports
def rel_imports(depth: int) -> str:
    p = "/".join([".."] * depth)
    return f'''import React, {{ useEffect, useState, useCallback, useRef, useMemo }} from "react";
import gsap from "gsap";
import {{
    LogIn, UserPlus, LogOut, ArrowLeft, ArrowRight, Loader2, CheckCircle, XCircle, ChevronDown,
    Book, Bell, Settings, Briefcase, User, Mail, Lock, GraduationCap, ClipboardList,
    BriefcaseBusiness, IndianRupee, Award, MessageSquare, Upload, RefreshCw,
    Trash2, Save, Home, Search, Download, Check, Atom, Star, Sparkles, Plus, Filter, Eye, EyeOff, Edit,
    BrainCircuit, AlertTriangle, Target, Lightbulb, Send as SendIcon, Paperclip, Menu, History, Bot, BarChart3
}} from "lucide-react";
import {{ api, auth, unauth }} from "{p}/api";
import {{ setAuthToken, sendOtp, verifyOtp, resetPassword, registerWithOtp }} from "{p}/api/auth";
import {{ cents_to_rupees_str }} from "{p}/utils/format";
'''


def main():
    with open(LEGACY, encoding="utf-8") as f:
        content = f.read()

    # Strip HRD portal block
    content = re.sub(
        r"\n\s*// HRD Portal Routing.*?return <HRDLogin[^;]+;\n\s*\}\n",
        "\n",
        content,
        flags=re.DOTALL,
    )
    content = re.sub(r".*HRDDashboard.*\n", "", content)
    content = re.sub(r".*HRDLogin.*\n", "", content)

    # Find chunks: function Name or const Name =
    pattern = re.compile(
        r"^(function (\w+)|const (\w+) = (?:\(|function))",
        re.MULTILINE,
    )
    matches = list(pattern.finditer(content))
    chunks = {}
    for i, m in enumerate(matches):
        name = m.group(2) or m.group(3)
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(content)
        chunks[name] = content[start:end].rstrip()

    os.makedirs(os.path.join(SRC, "app"), exist_ok=True)
    for name, body in chunks.items():
        if name not in MAP:
            print("skip unmapped:", name)
            continue
        subdir, is_default = MAP[name]
        out_dir = os.path.join(SRC, subdir.replace("/", os.sep))
        os.makedirs(out_dir, exist_ok=True)
        depth = len(subdir.split("/")) + 1  # from file to src
        imports = rel_imports(depth)
        if name == "App":
            imports = rel_imports(1)
        out = imports + "\n" + body + "\n"
        if is_default and name != "App":
            out = out.replace(f"function {name}", f"export default function {name}")
            out = out.replace(f"const {name} =", f"const {name} =")  # arrow - add export default at end
            if f"export default function {name}" not in out and body.strip().startswith("const"):
                out = out.rstrip() + f"\nexport default {name};\n"
        elif name in ("useCatalogs", "useLocalUser", "cents_to_rupees_str"):
            out = out.replace(f"function {name}", f"export function {name}")
            if body.strip().startswith("const"):
                out += f"\nexport {{ {name} }};\n"
        fname = f"{name}.jsx" if name == "App" else f"{name}.jsx"
        path = os.path.join(out_dir, fname if name != "App" else "App.jsx")
        with open(path, "w", encoding="utf-8") as wf:
            wf.write(out)
        print("wrote", path)


if __name__ == "__main__":
    main()
