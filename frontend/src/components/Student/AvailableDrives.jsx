// AvailableDrives.jsx - List Active Placement Drives
import React, { useState, useEffect } from 'react';
import { Briefcase, MapPin, DollarSign, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../../api';

const AvailableDrives = ({ token }) => {
    const [drives, setDrives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(null); // drive_id being applied to

    useEffect(() => {
        fetchDrives();
    }, []);

    const fetchDrives = async () => {
        try {
            // Fetch drives. In a real scenario, this might be /student/placement/drives to show only eligible ones.
            // Using /hrd/drives for now as per CHRO dash availability.
            const response = await api.get('/hrd/drives', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                // Filter for active/open drives if the API returns all
                const allDrives = response.data.drives || [];
                // Client-side filter example: d.status === 'Open'
                setDrives(allDrives);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (driveId) => {
        if (!confirm('Are you sure you want to apply for this drive? Ensure your profile and resume are up to date.')) return;

        setApplying(driveId);
        try {
            const response = await api.post(`/student/placement/apply/${driveId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                alert('Application submitted successfully!');
                // Update local state to show 'Applied' status? 
                // Ideally refresh list or mark locally
                setDrives(prev => prev.map(d => d.id === driveId ? { ...d, has_applied: true } : d));
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Application failed. You might have already applied or are not eligible.');
        } finally {
            setApplying(null);
        }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-cyan-400" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-white">Active Placement Drives</h2>
                <p className="text-slate-400">Explore and apply to opportunities tailored for you.</p>
            </div>

            {drives.length === 0 ? (
                <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-12 text-center">
                    <Briefcase className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white">No Drives Available</h3>
                    <p className="text-slate-400">Check back soon for new opportunities.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {drives.map(drive => (
                        <div key={drive.id} className="group relative bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-cyan-500/50 transition-all hover:bg-slate-800/60 flex flex-col h-full overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl -translate-y-12 translate-x-12 group-hover:bg-cyan-500/20 transition-all" />

                            <div className="mb-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">{drive.company_name}</h3>
                                    {drive.has_applied ? (
                                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded border border-emerald-500/20 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" /> Applied
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded border border-blue-500/20">Open</span>
                                    )}
                                </div>
                                <h4 className="text-lg font-medium text-slate-200">{drive.title}</h4>
                            </div>

                            <div className="flex-1 space-y-3 mb-6">
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <Briefcase className="w-4 h-4 text-cyan-500" />
                                    <span>{drive.role}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <DollarSign className="w-4 h-4 text-emerald-500" />
                                    <span>{drive.ctc_min} - {drive.ctc_max} LPA</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <MapPin className="w-4 h-4 text-purple-500" />
                                    <span>{drive.location || 'Pan India'}</span>
                                </div>
                                <p className="text-sm text-slate-500 line-clamp-2 mt-2">{drive.description}</p>
                            </div>

                            <button
                                onClick={() => handleApply(drive.id)}
                                disabled={drive.has_applied || applying === drive.id}
                                className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${drive.has_applied
                                        ? 'bg-slate-800 text-emerald-400 cursor-default border border-emerald-500/20'
                                        : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/20'
                                    }`}
                            >
                                {applying === drive.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {drive.has_applied ? 'Application Sent' : 'Apply Now'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AvailableDrives;
