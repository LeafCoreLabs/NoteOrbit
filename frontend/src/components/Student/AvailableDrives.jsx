// AvailableDrives.jsx - Eligible Placement Drives with One-Click Apply
import React, { useState, useEffect } from 'react';
import { Briefcase, MapPin, DollarSign, Send, Check, Loader2, Search } from 'lucide-react';
import { api } from '../../api';

const AvailableDrives = ({ token }) => {
    const [drives, setDrives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => { fetchDrives(); }, []);

    const fetchDrives = async () => {
        try {
            const res = await api.get('/student/placement/drives', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setDrives(res.data.drives || []);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const applyToDrive = async (driveId) => {
        setApplying(driveId);
        try {
            const res = await api.post('/student/placement/apply', { drive_id: driveId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setDrives(d => d.map(dr => dr.id === driveId ? { ...dr, already_applied: true } : dr));
            }
        } catch (e) { console.error(e); }
        finally { setApplying(null); }
    };

    const filtered = drives.filter(d =>
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-cyan-400" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Search */}
            <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                <Search className="w-5 h-5 text-slate-500" />
                <input
                    placeholder="Search drives by company, role..."
                    className="bg-transparent border-none outline-none text-white w-full placeholder-slate-600"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Drives Grid */}
            {filtered.length === 0 ? (
                <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-12 text-center">
                    <Briefcase className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white">No Eligible Drives</h3>
                    <p className="text-slate-400">Check back later for new opportunities matching your profile.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(drive => (
                        <div key={drive.id} className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-cyan-500/30 transition-colors group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 flex items-center justify-center text-cyan-400 font-bold text-lg">
                                    {drive.company.substring(0, 2).toUpperCase()}
                                </div>
                                {drive.already_applied && (
                                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30 flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Applied
                                    </span>
                                )}
                            </div>

                            <h3 className="text-lg font-bold text-white mb-1">{drive.title}</h3>
                            <p className="text-cyan-400 text-sm font-medium mb-3">{drive.company}</p>

                            <div className="space-y-2 text-sm text-slate-400 mb-4">
                                <div className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4" /> {drive.role || 'Multiple Roles'}
                                </div>
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" /> {drive.ctc}
                                </div>
                                {drive.location && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4" /> {drive.location}
                                    </div>
                                )}
                            </div>

                            {!drive.already_applied && (
                                <button
                                    onClick={() => applyToDrive(drive.id)}
                                    disabled={applying === drive.id}
                                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
                                >
                                    {applying === drive.id ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                                    Apply Now
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AvailableDrives;
