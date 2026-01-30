// GlobalAnalytics.jsx - CHRO Dashboard Analytics Widgets
import React, { useState, useEffect } from 'react';
import { BarChart2, Users, Briefcase, Award, TrendingUp, Loader2 } from 'lucide-react';
import { api } from '../../api';

const GlobalAnalytics = ({ token }) => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchMetrics(); }, []);

    const fetchMetrics = async () => {
        try {
            const res = await api.get('/hrd/analytics/overview', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setMetrics(res.data.metrics);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-purple-400" /></div>;

    const cards = [
        {
            label: 'Total Students',
            value: metrics?.total_students || 0,
            icon: Users,
            color: 'from-blue-500 to-cyan-500',
            bg: 'bg-blue-500/20'
        },
        {
            label: 'Placed Students',
            value: metrics?.placed_students || 0,
            icon: Award,
            color: 'from-emerald-500 to-green-500',
            bg: 'bg-emerald-500/20'
        },
        {
            label: 'Active Drives',
            value: metrics?.active_drives || 0,
            icon: Briefcase,
            color: 'from-purple-500 to-pink-500',
            bg: 'bg-purple-500/20'
        },
        {
            label: 'Placement %',
            value: `${metrics?.placement_percentage || 0}%`,
            icon: TrendingUp,
            color: 'from-orange-500 to-red-500',
            bg: 'bg-orange-500/20'
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <BarChart2 className="w-6 h-6 text-purple-400" /> Analytics Overview
                </h2>
                <p className="text-slate-400 mt-1">Real-time placement and training metrics</p>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, idx) => {
                    const Icon = card.icon;
                    return (
                        <div key={idx} className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 group hover:border-white/20 transition">
                            <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center mb-4`}>
                                <Icon className="w-6 h-6 text-white" />
                            </div>
                            <p className="text-slate-400 text-sm">{card.label}</p>
                            <p className={`text-3xl font-bold bg-gradient-to-r ${card.color} bg-clip-text text-transparent mt-1`}>
                                {card.value}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button className="p-4 bg-slate-800/50 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition text-sm">
                        📊 Export Report
                    </button>
                    <button className="p-4 bg-slate-800/50 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition text-sm">
                        📧 Email Students
                    </button>
                    <button className="p-4 bg-slate-800/50 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition text-sm">
                        📅 Schedule Drive
                    </button>
                    <button className="p-4 bg-slate-800/50 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition text-sm">
                        🔔 Send Reminder
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GlobalAnalytics;
