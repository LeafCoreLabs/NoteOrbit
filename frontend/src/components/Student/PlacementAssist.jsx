// PlacementAssist.jsx - Student Placement Portal
import React, { useState, useEffect } from 'react';
import {
    Briefcase, User, FileText, CheckCircle, TrendingUp,
    MapPin, DollarSign, Clock, Search, Upload, X, Loader2
} from 'lucide-react';
import axios from 'axios';

// Sub-components (defined in same file for modularity ease, can be split later)
const PlacementProfile = ({ token }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        skills: '',
        linkedin_url: '',
        github_url: '',
        portfolio_url: '',
        resume: null
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            // Mock response for now as backend might need this endpoint
            // In real integration, this would hit /student/placement/profile
            setProfile({
                skills: ['React', 'Python', 'Data Science'],
                linkedin_url: 'https://linkedin.com/in/student',
                github_url: 'https://github.com/student',
                resume_url: '#'
            });
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-cyan-400" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">My Professional Profile</h2>
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-4 py-2 bg-cyan-500/10 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all font-semibold"
                >
                    {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                </button>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                <div className="flex items-start gap-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-3xl font-bold text-white">
                        {/* Initials placeholder */}
                        ST
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-2">Student Name</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-slate-400 text-sm mb-1">Skills</p>
                                <div className="flex flex-wrap gap-2">
                                    {profile?.skills.map((skill, i) => (
                                        <span key={i} className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300 border border-white/5">{skill}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-slate-300 text-sm">
                                    <span className="font-semibold w-20">LinkedIn:</span>
                                    <a href={profile?.linkedin_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate">{profile?.linkedin_url}</a>
                                </div>
                                <div className="flex items-center gap-2 text-slate-300 text-sm">
                                    <span className="font-semibold w-20">GitHub:</span>
                                    <a href={profile?.github_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate">{profile?.github_url}</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Resume Section */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                <h3 className="text-lg font-bold text-white mb-4">Resume</h3>
                <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-cyan-500/30 transition-all cursor-pointer bg-slate-800/20">
                    <FileText className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                    <p className="text-slate-300 font-medium">Click to update resume (PDF)</p>
                    <p className="text-slate-500 text-sm mt-1">Last updated: 2 days ago</p>
                </div>
            </div>
        </div>
    );
};

const AvailableDrives = ({ token }) => {
    const [drives, setDrives] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDrives();
    }, []);

    const fetchDrives = async () => {
        try {
            // Using HRD endpoint for list, in real app might be filtered for students
            const response = await axios.get('/hrd/drives', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDrives(response.data.drives || []);
        } catch (error) {
            console.error('Failed to fetch drives');
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (driveId) => {
        if (!confirm('Confirm application to this drive?')) return;
        // API call to apply would go here
        alert('Application submitted successfully!');
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-white">Available Placement Drives</h2>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2].map(i => <div key={i} className="h-48 bg-slate-800/50 rounded-2xl animate-pulse" />)}
                </div>
            ) : drives.length === 0 ? (
                <div className="text-center p-12 text-slate-500">No active drives found.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {drives.map(drive => (
                        <div key={drive.id} className="relative bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-cyan-500/30 transition-all group overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Briefcase className="w-24 h-24 text-cyan-400" />
                            </div>

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-bold text-white line-clamp-1">{drive.company_name}</h3>
                                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded border border-emerald-500/20">Open</span>
                                </div>

                                <h4 className="text-lg text-cyan-400 font-medium mb-2">{drive.title}</h4>
                                <p className="text-slate-400 text-sm mb-4 line-clamp-2">{drive.description}</p>

                                <div className="space-y-2 mb-6">
                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                        <Briefcase className="w-4 h-4 text-cyan-500" />
                                        <span>{drive.role}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                        <DollarSign className="w-4 h-4 text-emerald-500" />
                                        <span>{drive.ctc_min} - {drive.ctc_max} LPA</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                        <MapPin className="w-4 h-4 text-purple-500" />
                                        <span>{drive.location || 'Multiple Locations'}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleApply(drive.id)}
                                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-semibold hover:shadow-lg hover:shadow-cyan-500/20 transition-all"
                                >
                                    Apply Now
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const MyOffers = ({ token }) => {
    // Placeholder as backend connection requires student-specific offer endpoint
    return (
        <div className="text-center p-12 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CheckCircle className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Offers Yet</h3>
            <p className="text-slate-400">Keep applying to drives! Your offers will appear here.</p>
        </div>
    );
};

const PlacementAssist = ({ token, user }) => {
    const [activeTab, setActiveTab] = useState('drives');

    const tabs = [
        { id: 'profile', label: 'My Profile', icon: User },
        { id: 'drives', label: 'Available Drives', icon: Briefcase },
        { id: 'applications', label: 'Applications', icon: FileText },
        { id: 'offers', label: 'My Offers', icon: CheckCircle },
    ];

    return (
        <div className="min-h-screen">
            {/* Header Area */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Placement Assist</h1>
                <p className="text-slate-400">Accelerate your career with campus opportunities</p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 mb-8 p-1 bg-slate-900/40 backdrop-blur-md rounded-xl border border-white/5 w-fit">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${isActive
                                    ? 'bg-cyan-500/20 text-cyan-400 shadow-sm border border-cyan-500/30'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {activeTab === 'profile' && <PlacementProfile token={token} />}
                {activeTab === 'drives' && <AvailableDrives token={token} />}
                {activeTab === 'applications' && (
                    <div className="text-center p-12 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl animate-in fade-in">
                        <TrendingUp className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">No Active Applications</h3>
                        <p className="text-slate-400">Start by applying to drives in the 'Available Drives' tab.</p>
                    </div>
                )}
                {activeTab === 'offers' && <MyOffers token={token} />}
            </div>
        </div>
    );
};

export default PlacementAssist;
