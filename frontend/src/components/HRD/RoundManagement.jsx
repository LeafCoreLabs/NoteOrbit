// RoundManagement.jsx - Interview Round Configuration per Drive
import React, { useState, useEffect } from 'react';
import { Settings, Plus, Loader2, ArrowLeft } from 'lucide-react';
import { api } from '../../api';

const RoundManagement = ({ token, driveId }) => {
    const [rounds, setRounds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newRound, setNewRound] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => { if (driveId) fetchRounds(); }, [driveId]);

    const fetchRounds = async () => {
        try {
            const res = await api.get(`/hrd/drives/${driveId}/rounds`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setRounds(res.data.rounds || []);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const addRound = async () => {
        if (!newRound.trim()) return;
        setSaving(true);
        try {
            await api.post(`/hrd/drives/${driveId}/rounds`, { name: newRound }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNewRound('');
            fetchRounds();
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    if (!driveId) return (
        <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-12 text-center">
            <Settings className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400">Select a drive from Drive Management to configure rounds.</p>
        </div>
    );

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-purple-400" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Settings className="w-6 h-6 text-purple-400" /> Interview Rounds
            </h2>

            {/* Add Round */}
            <div className="flex gap-3">
                <input
                    placeholder="Round name (e.g. Aptitude, Coding, HR)"
                    value={newRound}
                    onChange={e => setNewRound(e.target.value)}
                    className="flex-1 bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white"
                />
                <button
                    onClick={addRound}
                    disabled={!newRound.trim() || saving}
                    className="px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition disabled:opacity-50 flex items-center gap-2"
                >
                    {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus className="w-4 h-4" />} Add Round
                </button>
            </div>

            {/* Rounds List */}
            <div className="space-y-3">
                {rounds.map((r, idx) => (
                    <div key={r.id} className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                            {idx + 1}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-white font-medium">{r.name}</h3>
                            <p className="text-slate-500 text-xs">{r.date ? new Date(r.date).toLocaleDateString() : 'No date set'}</p>
                        </div>
                    </div>
                ))}
            </div>

            {rounds.length === 0 && (
                <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-12 text-center">
                    <p className="text-slate-400">No rounds configured. Add interview stages above.</p>
                </div>
            )}
        </div>
    );
};

export default RoundManagement;
