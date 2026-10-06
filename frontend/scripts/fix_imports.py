"""Fix exports and cross-imports after split."""
import os
import re

SRC = os.path.join(os.path.dirname(os.path.dirname(__file__)), "src")

PANEL_IMPORTS = {
    "features/student/StudentPanel.jsx": [
        "StudentNotesNotices", "UnifiedLibrarySearch", "StudentFees", "StudentMarks",
        "StudentFeedback", "StudentAttendanceCalendar", "StudentAttendanceFeature",
        "HostelComplaints", "AcademicInsights", "AIChat",
    ],
    "features/professor/ProfessorPanel.jsx": [
        "ProfessorMessages", "ProfessorMarksUpload", "ProfessorFeedback",
    ],
    "features/admin/AdminPanel.jsx": [
        "AdminFacultyManagement", "AdminFacultyOnboarding", "AdminNoteUpload",
        "AdminBookUpload", "AdminFeeManagement", "AdminHostelComplaints",
        "AdminStudentList", "AdminHostelManagement",
    ],
    "features/parent/ParentPanel.jsx": ["ParentContactFaculty"],
}

CROSS_FEATURE = {
    "features/professor/ProfessorPanel.jsx": [
        ("UnifiedLibrarySearch", "features/student/UnifiedLibrarySearch"),
        ("FacultyAttendance", "features/admin/FacultyAttendance"),
        ("AIChat", "features/student/AIChat"),
        ("Input", "components/ui/Input"),
        ("Select", "components/ui/Select"),
    ],
    "features/admin/AdminPanel.jsx": [
        ("Input", "components/ui/Input"),
        ("Select", "components/ui/Select"),
    ],
}

UI_EXPORTS = {
    "Input.jsx": "Input",
    "Select.jsx": "Select",
    "MessageBar.jsx": "MessageBar",
    "WelcomeLoader.jsx": "WelcomeLoader",
    "ComplaintAuditTimeline.jsx": "ComplaintAuditTimeline",
}


def add_exports_ui():
    ui_dir = os.path.join(SRC, "components", "ui")
    for fname, name in UI_EXPORTS.items():
        path = os.path.join(ui_dir, fname)
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as f:
            text = f.read()
        if f"export {{ {name} }}" in text or f"export const {name}" in text:
            continue
        if not text.rstrip().endswith(f"export {{ {name} }};"):
            with open(path, "a", encoding="utf-8") as f:
                f.write(f"\nexport {{ {name} }};\n")


def inject_imports(rel_path, names, prefix="./"):
    path = os.path.join(SRC, rel_path.replace("/", os.sep))
    with open(path, encoding="utf-8") as f:
        text = f.read()
    lines = []
    for n in names:
        if f"import {n}" in text or f"import {{ {n}" in text:
            continue
        lines.append(f'import {n} from "{prefix}{n}";')
    if not lines:
        return
    # after last import line block
    m = re.search(r'(import[^;]+;\n)+', text)
    insert_at = m.end() if m else 0
    text = text[:insert_at] + "\n".join(lines) + "\n" + text[insert_at:]
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def inject_cross(rel_path, pairs):
    path = os.path.join(SRC, rel_path.replace("/", os.sep))
    depth = rel_path.count("/")
    with open(path, encoding="utf-8") as f:
        text = f.read()
    lines = []
    for name, mod in pairs:
        if name in ("Input", "Select"):
            if "from \"../../components/ui\"" in text or f"import {{ {name}" in text:
                continue
        elif f'import {name}' in text:
            continue
        up = "/".join([".."] * (depth + 1))
        modpath = mod.replace("features/", f"{up}/features/").replace("components/", f"{up}/components/")
        if name in ("Input", "Select"):
            lines.append(f'import {{ {name} }} from "{up}/components/ui";')
        else:
            comp = mod.split("/")[-1]
            lines.append(f'import {comp} from "{modpath}.jsx";')
    if lines:
        m = re.search(r'(import[^;]+;\n)+', text)
        insert_at = m.end() if m else 0
        text = text[:insert_at] + "\n".join(lines) + "\n" + text[insert_at:]
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)


def fix_app():
    path = os.path.join(SRC, "app", "App.jsx")
    extra = '''import { useCatalogs } from "../hooks/useCatalogs";
import { useLocalUser } from "../hooks/useLocalUser";
import { OrbitLogo, MessageBar, WelcomeLoader } from "../components/ui";
import ParticleBackground from "../components/ParticleBackground";
import UserTypeSelection from "../features/auth/UserTypeSelection";
import CredentialsView from "../features/auth/CredentialsView";
import AdminPanel from "../features/admin/AdminPanel";
import ProfessorPanel from "../features/professor/ProfessorPanel";
import StudentPanel from "../features/student/StudentPanel";
import ParentPanel from "../features/parent/ParentPanel";
'''
    with open(path, encoding="utf-8") as f:
        text = f.read()
    if "useCatalogs" not in text.split("function App")[0]:
        idx = text.find('import { cents_to_rupees_str }')
        if idx >= 0:
            end = text.find("\n", idx) + 1
            text = text[:end] + extra + text[end:]
    if "export default App" not in text:
        text = text.rstrip() + "\n\nexport default App;\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def main():
    add_exports_ui()
    for rel, names in PANEL_IMPORTS.items():
        inject_imports(rel, names)
    for rel, pairs in CROSS_FEATURE.items():
        inject_cross(rel, pairs)
    fix_app()
    print("fixed imports")


if __name__ == "__main__":
    main()
