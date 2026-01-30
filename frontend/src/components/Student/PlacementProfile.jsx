// PlacementProfile.jsx - Smart Profile Engine for Students
import React, { useState, useEffect } from 'react';
import { User, Upload, Plus, X, Save, Loader2 } from 'lucide-react';
import { api } from '../../api';

const PlacementProfile = ({ token }) => {
    const [profile, setProfile] = useState({
        skills: [],
        resume_url: '',
        linkedin_url: '',
        portfolio_url: '',
        preferred_role: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [newSkill, setNewSkill] = useState('');

    useEffect(() => { fetchProfile(); }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/student/placement/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success && res.data.profile) {
                setProfile(res.data.profile);
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

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-cyan-400" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-cyan-400" /> Smart Profile
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Preferred Role */}
                    <div>
                        <label className="text-sm text-slate-400 mb-2 block">Preferred Role</label>
                        <select
                            value={profile.preferred_role || ''}
                            onChange={e => setProfile(p => ({ ...p, preferred_role: e.target.value }))}
                            className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white"
                        >
                            <option value="">Select Role...</option>
                            <option value="SDE">Software Development Engineer</option>
                            <option value="Analyst">Business Analyst</option>
                            <option value="Data">Data Scientist/Engineer</option>
                            <option value="DevOps">DevOps Engineer</option>
                            <option value="Product">Product Manager</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {/* Resume URL */}
                    <div>
                        <label className="text-sm text-slate-400 mb-2 block">Resume URL</label>
                        <input
                            type="url"
                            placeholder="https://drive.google.com/..."
                            value={profile.resume_url || ''}
                            onChange={e => setProfile(p => ({ ...p, resume_url: e.target.value }))}
                            className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white placeholder-slate-600"
                        />
                    </div>

                    {/* LinkedIn */}
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

                    {/* Portfolio */}
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

                {/* Skills */}
                <div className="mt-6">
                    <label className="text-sm text-slate-400 mb-2 block">Skill Matrix</label>
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
                            placeholder="Add skill (e.g. Python, React)"
                            value={newSkill}
                            onChange={e => setNewSkill(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addSkill()}
                            className="flex-1 bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white placeholder-slate-600"
                        />
                        <button onClick={addSkill} className="px-4  bg-cyan-500/20 text-cyan-400 rounded-xl hover:bg-cyan-500/30 transition">
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Save */}
                <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="mt-6 px-6 py-3 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-medium rounded-xl flex items-center gap-2 hover:opacity-90 transition disabled:opacity-50"
                >
                    {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                    Save Profile
                </button>
            </div>
        </div>
    );
};

export default PlacementProfile;
