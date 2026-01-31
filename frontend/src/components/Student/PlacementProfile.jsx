// PlacementProfile.jsx - Smart Profile Engine V2 for Students
import React, { useState, useEffect } from 'react';
import { User, Upload, Plus, X, Save, Loader2, Sparkles, FileText, Clock, CheckCircle2, Trash2 } from 'lucide-react';
import { api } from '../../api';

const PlacementProfile = ({ token }) => {
    const [profile, setProfile] = useState({
        skills: [],
        ai_skills: [],
        resume_url: '',
        resume_versions: [],
        linkedin_url: '',
        portfolio_url: '',
        preferred_roles: [],
        github_url: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newSkill, setNewSkill] = useState('');
    const [newResumeUrl, setNewResumeUrl] = useState('');
    const [parsing, setParsing] = useState(false);

    const roleOptions = [
        { id: 'sde', label: 'Software Development Engineer', icon: '💻' },
        { id: 'frontend', label: 'Frontend Developer', icon: '🎨' },
        { id: 'backend', label: 'Backend Developer', icon: '⚙️' },
        { id: 'fullstack', label: 'Full Stack Developer', icon: '🔥' },
        { id: 'analyst', label: 'Business Analyst', icon: '📊' },
        { id: 'data', label: 'Data Scientist/Engineer', icon: '📈' },
        { id: 'ml', label: 'ML/AI Engineer', icon: '🤖' },
        { id: 'devops', label: 'DevOps/SRE', icon: '🚀' },
        { id: 'cloud', label: 'Cloud Engineer', icon: '☁️' },
        { id: 'security', label: 'Security Engineer', icon: '🔒' },
        { id: 'product', label: 'Product Manager', icon: '📋' },
        { id: 'qa', label: 'QA/Test Engineer', icon: '🧪' },
        { id: 'mobile', label: 'Mobile Developer', icon: '📱' },
        { id: 'consulting', label: 'IT Consultant', icon: '💼' },
    ];

    useEffect(() => { fetchProfile(); }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/student/placement/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success && res.data.profile) {
                setProfile(p => ({ ...p, ...res.data.profile }));
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const saveProfile = async () => {
        setSaving(true);
        try {
            await api.put('/student/placement/profile', profile, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const addSkill = () => {
        if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
            setProfile(p => ({ ...p, skills: [...p.skills, newSkill.trim()] }));
            setNewSkill('');
        }
    };

    const removeSkill = (skill) => {
        setProfile(p => ({ ...p, skills: p.skills.filter(s => s !== skill) }));
    };

    const acceptAiSkill = (skill) => {
        if (!profile.skills.includes(skill)) {
            setProfile(p => ({
                ...p,
                skills: [...p.skills, skill],
                ai_skills: p.ai_skills.filter(s => s !== skill)
            }));
        }
    };

    const toggleRole = (roleId) => {
        setProfile(p => {
            const roles = p.preferred_roles || [];
            if (roles.includes(roleId)) {
                return { ...p, preferred_roles: roles.filter(r => r !== roleId) };
            } else if (roles.length < 3) {
                return { ...p, preferred_roles: [...roles, roleId] };
            }
            return p;
        });
    };

    const addResumeVersion = () => {
        if (!newResumeUrl.trim()) return;
        const version = {
            url: newResumeUrl.trim(),
            uploaded_at: new Date().toISOString(),
            version: (profile.resume_versions?.length || 0) + 1
        };
        setProfile(p => ({
            ...p,
            resume_url: newResumeUrl.trim(),
            resume_versions: [...(p.resume_versions || []), version]
        }));
        setNewResumeUrl('');
    };

    const parseResumeSkills = async () => {
        setParsing(true);
        // Simulated AI parsing - in production this would call an AI endpoint
        setTimeout(() => {
            const suggestedSkills = ['Python', 'JavaScript', 'React', 'Node.js', 'SQL', 'Git'];
            const existingSkills = profile.skills || [];
            const newAiSkills = suggestedSkills.filter(s => !existingSkills.includes(s));
            setProfile(p => ({ ...p, ai_skills: newAiSkills }));
            setParsing(false);
        }, 1500);
    };

    const deleteResume = async () => {
        if (!window.confirm("Are you sure you want to remove your resume from your profile?")) return;
        setSaving(true);
        try {
            await api.delete('/student/placement/resume', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfile(p => ({ ...p, resume_url: '' }));
            fetchProfile();
        } catch (e) {
            console.error(e);
            alert("Failed to delete resume.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-cyan-400" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Resume V2 Section */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cyan-400" /> Resume V2
                </h2>

                <div className="space-y-4">
                    {/* Current Resume */}
                    {profile.resume_url && (
                        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <div className="flex-1">
                                <p className="text-white font-medium">Current Resume</p>
                                <a href={profile.resume_url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-sm hover:underline truncate block">
                                    {profile.resume_url}
                                </a>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                    onClick={parseResumeSkills}
                                    disabled={parsing}
                                    className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30 hover:bg-purple-500/30 transition flex items-center gap-2 text-sm justify-center"
                                >
                                    {parsing ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                    AI Parse Skills
                                </button>
                                <button
                                    onClick={deleteResume}
                                    disabled={saving}
                                    className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-500/30 transition flex items-center gap-2 text-sm justify-center"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Add New Version (Real Upload) */}
                    <div className="relative">
                        <input
                            type="file"
                            id="resume-upload"
                            className="hidden"
                            accept=".pdf"
                            onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;

                                const formData = new FormData();
                                formData.append('file', file);

                                setParsing(true);
                                try {
                                    const res = await api.post('/student/placement/upload-resume', formData, {
                                        headers: {
                                            Authorization: `Bearer ${token}`,
                                            'Content-Type': 'multipart/form-data'
                                        }
                                    });
                                    if (res.data.success) {
                                        setProfile(p => ({ ...p, resume_url: res.data.url }));
                                        fetchProfile(); // Refresh history
                                    }
                                } catch (e) {
                                    console.error(e);
                                    alert("Upload failed. Please check file type and size.");
                                } finally {
                                    setParsing(false);
                                }
                            }}
                        />
                        <label
                            htmlFor="resume-upload"
                            className="w-full h-32 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/5 transition group"
                        >
                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center group-hover:scale-110 transition">
                                <Upload className="w-6 h-6 text-cyan-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-medium">Click to upload Resume</p>
                                <p className="text-slate-500 text-xs mt-1">PDF format (Max 10MB)</p>
                            </div>
                        </label>
                    </div>

                    {/* Version History */}
                    {profile.resume_versions?.length > 0 && (
                        <div className="mt-4">
                            <p className="text-sm text-slate-400 mb-2 flex items-center gap-1"><Clock className="w-4 h-4" /> Version History</p>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                                {profile.resume_versions.slice().reverse().map((v, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-slate-500 p-2 bg-slate-800/30 rounded-lg">
                                        <span className="text-cyan-400">v{v.version}</span>
                                        <span className="truncate flex-1">{v.url}</span>
                                        <span>{new Date(v.uploaded_at).toLocaleDateString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Skills & AI Parsing */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" /> Skill Matrix
                </h2>

                {/* AI Suggested Skills */}
                {profile.ai_skills?.length > 0 && (
                    <div className="mb-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                        <p className="text-sm text-purple-400 mb-2 flex items-center gap-1">
                            <Sparkles className="w-4 h-4" /> AI-Detected Skills (click to add)
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {profile.ai_skills.map(skill => (
                                <button
                                    key={skill}
                                    onClick={() => acceptAiSkill(skill)}
                                    className="px-3 py-1.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg text-sm hover:bg-purple-500/30 transition flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" /> {skill}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Manual Skills */}
                <div className="flex flex-wrap gap-2 mb-3">
                    {(profile.skills || []).map(skill => (
                        <span key={skill} className="px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg text-sm flex items-center gap-2">
                            {skill}
                            <button onClick={() => removeSkill(skill)} className="hover:text-red-400"><X className="w-3 h-3" /></button>
                        </span>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input
                        placeholder="Add skill manually (e.g. Python, React)"
                        value={newSkill}
                        onChange={e => setNewSkill(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addSkill()}
                        className="flex-1 bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white placeholder-slate-600"
                    />
                    <button onClick={addSkill} className="px-4 bg-cyan-500/20 text-cyan-400 rounded-xl hover:bg-cyan-500/30 transition">
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Preferred Roles */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <User className="w-5 h-5 text-cyan-400" /> Preferred Roles
                </h2>
                <p className="text-slate-500 text-sm mb-4">Select up to 3 roles you're interested in</p>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {roleOptions.map(role => {
                        const isSelected = (profile.preferred_roles || []).includes(role.id);
                        return (
                            <button
                                key={role.id}
                                onClick={() => toggleRole(role.id)}
                                className={`p-3 rounded-xl border text-left transition ${isSelected
                                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                                    : 'bg-slate-800/30 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                                    }`}
                            >
                                <span className="text-lg">{role.icon}</span>
                                <p className="text-sm font-medium mt-1">{role.label}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Links */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Profile Links</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-sm text-slate-400 mb-2 block">LinkedIn</label>
                        <input
                            type="url"
                            placeholder="https://linkedin.com/in/..."
                            value={profile.linkedin_url || ''}
                            onChange={e => setProfile(p => ({ ...p, linkedin_url: e.target.value }))}
                            className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white placeholder-slate-600"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-slate-400 mb-2 block">GitHub</label>
                        <input
                            type="url"
                            placeholder="https://github.com/..."
                            value={profile.github_url || ''}
                            onChange={e => setProfile(p => ({ ...p, github_url: e.target.value }))}
                            className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white placeholder-slate-600"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-slate-400 mb-2 block">Portfolio</label>
                        <input
                            type="url"
                            placeholder="https://yourportfolio.com"
                            value={profile.portfolio_url || ''}
                            onChange={e => setProfile(p => ({ ...p, portfolio_url: e.target.value }))}
                            className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white placeholder-slate-600"
                        />
                    </div>
                </div>
            </div>

            {/* Save */}
            <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
            >
                {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
                Save Profile
            </button>
        </div>
    );
};

export default PlacementProfile;
