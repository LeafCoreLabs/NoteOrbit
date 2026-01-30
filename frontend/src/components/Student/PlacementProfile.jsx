// PlacementProfile.jsx - Student Professional Profile
import React, { useState, useEffect } from 'react';
import { User, FileText, Save, Loader2, Upload, Link as LinkIcon, Edit2 } from 'lucide-react';
import { api } from '../../api';

const PlacementProfile = ({ token }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        skills: '',
        linkedin_url: '',
        github_url: '',
        portfolio_url: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await api.get('/student/placement/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                const p = response.data.profile;
                setProfile(p);
                setFormData({
                    skills: p.skills ? p.skills.join(', ') : '',
                    linkedin_url: p.linkedin_url || '',
                    github_url: p.github_url || '',
                    portfolio_url: p.portfolio_url || ''
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                skills: formData.skills.split(',').map(s => s.trim()).filter(s => s)
            };
            const response = await api.post('/student/placement/profile', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                alert('Profile updated successfully');
                setIsEditing(false);
                fetchProfile();
            }
        } catch (error) {
            alert('Failed to update profile');
        }
    };

    const handleResumeUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('resume', file);

        setUploading(true);
        try {
            // Check if backend supports /resume endpoint specifically or part of profile
            const response = await api.post('/student/placement/resume', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            if (response.data.success) {
                alert('Resume uploaded!');
                fetchProfile();
            }
        } catch (error) {
            alert('Resume upload failed');
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-cyan-400" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">My Professional Profile</h2>
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-white/10"
                >
                    <Edit2 className="w-4 h-4" />
                    {isEditing ? 'Cancel' : 'Edit Profile'}
                </button>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                {isEditing ? (
                    <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2 space-y-1">
                            <label className="text-xs text-slate-400">Skills (Comma separated)</label>
                            <input
                                className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                                value={formData.skills}
                                onChange={e => setFormData({ ...formData, skills: e.target.value })}
                                placeholder="Java, Python, React, Leadership..."
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400">LinkedIn URL</label>
                            <input
                                className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                                value={formData.linkedin_url}
                                onChange={e => setFormData({ ...formData, linkedin_url: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400">GitHub URL</label>
                            <input
                                className="w-full bg-slate-900 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                                value={formData.github_url}
                                onChange={e => setFormData({ ...formData, github_url: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2 flex justify-end">
                            <button type="submit" className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold flex items-center gap-2">
                                <Save className="w-4 h-4" /> Save Changes
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Avatar / Info */}
                        <div className="flex-1 space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                                    {profile?.name ? profile.name.substring(0, 2).toUpperCase() : 'ME'}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{profile?.name || 'Student Name'}</h3>
                                    <p className="text-slate-400 font-mono text-sm">{profile?.usn || 'USN Not Found'}</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider">Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                    {profile?.skills && profile.skills.length > 0 ? (
                                        profile.skills.map((s, i) => (
                                            <span key={i} className="px-3 py-1 bg-slate-800 rounded-full text-sm text-cyan-300 border border-cyan-500/20">
                                                {s}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-slate-500 text-sm italic">No skills added yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Links & Resume */}
                        <div className="flex-1 space-y-6 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-8">
                            <div>
                                <h4 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Social Links</h4>
                                <div className="space-y-3">
                                    {profile?.linkedin_url && (
                                        <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-slate-300 hover:text-cyan-400 transition-colors bg-slate-800/50 p-3 rounded-lg border border-white/5 hover:border-cyan-500/30">
                                            <LinkIcon className="w-4 h-4" />
                                            <span className="truncate">{profile.linkedin_url}</span>
                                        </a>
                                    )}
                                    {profile?.github_url && (
                                        <a href={profile.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-slate-300 hover:text-purple-400 transition-colors bg-slate-800/50 p-3 rounded-lg border border-white/5 hover:border-purple-500/30">
                                            <LinkIcon className="w-4 h-4" />
                                            <span className="truncate">{profile.github_url}</span>
                                        </a>
                                    )}
                                    {(!profile?.linkedin_url && !profile?.github_url) && <p className="text-slate-500 text-sm italic">No links added.</p>}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Resume</h4>
                                <div className="relative group">
                                    {profile?.resume_url ? (
                                        <a
                                            href={profile.resume_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/20 transition-all group"
                                        >
                                            <FileText className="w-8 h-8 text-emerald-400" />
                                            <div>
                                                <p className="font-semibold text-white">View Current Resume</p>
                                                <p className="text-xs text-emerald-400/70">Click to open PDF</p>
                                            </div>
                                        </a>
                                    ) : (
                                        <div className="p-6 border-2 border-dashed border-slate-700 rounded-xl text-center">
                                            <p className="text-slate-500 mb-2">No resume uploaded</p>
                                        </div>
                                    )}

                                    <label className="mt-4 flex items-center justify-center gap-2 cursor-pointer w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm border border-white/10 transition-colors">
                                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                        {uploading ? 'Uploading...' : 'Upload New Resume'}
                                        <input type="file" accept=".pdf" className="hidden" onChange={handleResumeUpload} disabled={uploading} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlacementProfile;
