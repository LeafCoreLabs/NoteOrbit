// TrainerManagement.jsx - Trainer Onboarding & Management
import React, { useState, useEffect } from 'react';
import { Users, Plus, Loader2, Mail, UserPlus } from 'lucide-react';
import { api } from '../../api';

const TrainerManagement = ({ token }) => {
    const [trainers, setTrainers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newTrainer, setNewTrainer] = useState({ name: '', email: '', password: '', emp_id: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchTrainers(); }, []);

    const fetchTrainers = async () => {
        try {
            const res = await api.get('/hrd/chro/trainers', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setTrainers(res.data.trainers || []);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const createTrainer = async () => {
        setSaving(true);
        try {
            const res = await api.post('/hrd/chro/trainers', newTrainer, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                fetchTrainers();
                setShowForm(false);
                setNewTrainer({ name: '', email: '', password: '', emp_id: '' });
            }
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-purple-400" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Users className="w-6 h-6 text-purple-400" /> Trainers
                </h2>
                <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30 hover:bg-purple-500/30 transition flex items-center gap-2"
                >
                    <UserPlus className="w-4 h-4" /> Onboard Trainer
                </button>
            </div>

            {showForm && (
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Onboard New Trainer</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Full Name</label>
                            <input
                                value={newTrainer.name}
                                onChange={e => setNewTrainer(p => ({ ...p, name: e.target.value }))}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Email</label>
                            <input
                                type="email"
                                value={newTrainer.email}
                                onChange={e => setNewTrainer(p => ({ ...p, email: e.target.value }))}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Employee ID</label>
                            <input
                                value={newTrainer.emp_id}
                                onChange={e => setNewTrainer(p => ({ ...p, emp_id: e.target.value }))}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-slate-400 mb-2 block">Password</label>
                            <input
                                type="password"
                                value={newTrainer.password}
                                onChange={e => setNewTrainer(p => ({ ...p, password: e.target.value }))}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl p-3 text-white"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={createTrainer}
                            disabled={!newTrainer.name || !newTrainer.email || saving}
                            className="px-6 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="animate-spin w-4 h-4" /> : 'Create'}
                        </button>
                        <button onClick={() => setShowForm(false)} className="px-6 py-2 text-slate-400 hover:text-white">Cancel</button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trainers.map(t => (
                    <div key={t.id} className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                        <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-3 text-purple-400 font-bold">
                            {t.name?.substring(0, 2).toUpperCase()}
                        </div>
                        <h3 className="text-white font-bold">{t.name}</h3>
                        <p className="text-slate-400 text-sm flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3" /> {t.email}
                        </p>
                    </div>
                ))}
            </div>

            {trainers.length === 0 && !showForm && (
                <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-12 text-center">
                    <Users className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-400">No trainers onboarded. Add your first trainer.</p>
                </div>
            )}
        </div>
    );
};

export default TrainerManagement;
