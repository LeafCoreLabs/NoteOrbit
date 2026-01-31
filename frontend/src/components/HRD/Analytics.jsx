// Analytics.jsx - Placement Analytics and Statistics Dashboard
import React, { useState, useEffect } from 'react';
import {
    BarChart3, TrendingUp, Users, Briefcase, Award, IndianRupee,
    Loader2, PieChart, Activity
} from 'lucide-react';
import { api } from '../../api';

const Analytics = ({ token }) => {
    const [stats, setStats] = useState(null);
    const [branchStats, setBranchStats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const [overview, branches] = await Promise.all([
                api.get('/hrd/analytics/overview', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/hrd/analytics/branch-wise', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            setStats(overview.data);
            setBranchStats(branches.data.branch_stats || []);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, value, icon: Icon, color, trend }) => (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
            <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                {trend && (
                    <div className="flex items-center gap-1 text-emerald-400 text-sm font-semibold">
                        <TrendingUp className="w-4 h-4" />
                        <span>{trend}</span>
                    </div>
                )}
            </div>
            <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
            <p className="text-3xl font-bold text-white">{value}</p>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
                <p className="text-slate-400">Placement statistics and insights</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Students"
                    value={stats?.total_students || 0}
                    icon={Users}
                    color="from-blue-500 to-blue-600"
                />
                <StatCard
                    title="Total Offers"
                    value={stats?.total_offers || 0}
                    icon={Award}
                    color="from-purple-500 to-purple-600"
                    trend="+15%"
                />
                <StatCard
                    title="Active Drives"
                    value={stats?.active_drives || 0}
                    icon={Briefcase}
                    color="from-emerald-500 to-emerald-600"
                />
                <StatCard
                    title="Placement Rate"
                    value={`${stats?.placement_percentage || 0}%`}
                    icon={TrendingUp}
                    color="from-cyan-500 to-cyan-600"
                    trend="+8%"
                />
            </div>

            {/* Branch-wise Statistics */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <PieChart className="w-6 h-6 text-cyan-400" />
                    Branch-wise Placement Statistics
                </h2>

                {branchStats.length === 0 ? (
                    <div className="text-center py-12">
                        <Activity className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400">No data available</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {branchStats.map((branch, idx) => {
                            const percentage = branch.total > 0
                                ? ((branch.placed / branch.total) * 100).toFixed(1)
                                : 0;

                            return (
                                <div key={idx} className="bg-slate-800/50 border border-white/5 rounded-xl p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h3 className="text-white font-bold text-lg">{branch.branch}</h3>
                                            <p className="text-slate-400 text-sm">
                                                {branch.placed} placed out of {branch.total} students
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-bold text-cyan-400">{percentage}%</div>
                                            <p className="text-xs text-slate-500">Placement Rate</p>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-slate-700 rounded-full h-2">
                                        <div
                                            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>

                                    {/* Additional Stats */}
                                    {branch.avg_package && (
                                        <div className="mt-3 flex items-center gap-4 text-sm">
                                            <div className="flex items-center gap-2 text-emerald-400">
                                                <IndianRupee className="w-4 h-4" />
                                                <span>Avg: {branch.avg_package} LPA</span>
                                            </div>
                                            {branch.highest_package && (
                                                <div className="flex items-center gap-2 text-purple-400">
                                                    <Award className="w-4 h-4" />
                                                    <span>Highest: {branch.highest_package} LPA</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* CTC Distribution Chart Placeholder */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-purple-400" />
                    CTC Distribution
                </h2>
                <div className="text-center py-12">
                    <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 mb-2">CTC Distribution Chart</p>
                    <p className="text-slate-500 text-sm">Chart visualizations coming soon...</p>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
