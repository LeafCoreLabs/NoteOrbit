// HRDDashboard.jsx - Main HRD Admin Dashboard with Navigation
import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard, Building2, Briefcase, FileText, BrainCircuit,
    BarChart3, Settings, LogOut, Menu, X, TrendingUp, Users,
    DollarSign, Award
} from 'lucide-react';
import axios from 'axios';

// Import HRD sub-components
import CompanyManagement from './CompanyManagement';
import DriveManagement from './DriveManagement';
import OfferManagement from './OfferManagement';
import AIAnalysis from './AIAnalysis';
import Analytics from './Analytics';

const HRDDashboard = ({ token, setPage, setToken }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        try {
            const response = await axios.get('/hrd/analytics/overview', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('noteorbit_token');
        localStorage.removeItem('noteorbit_user');
        setToken(null);
        setPage('welcome');
    };

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'companies', label: 'Companies', icon: Building2 },
        { id: 'drives', label: 'Placement Drives', icon: Briefcase },
        { id: 'offers', label: 'Offers', icon: FileText },
        { id: 'ai-analysis', label: 'AI Analysis', icon: BrainCircuit },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ];

    const StatCard = ({ title, value, icon: Icon, gradient, trend }) => (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
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

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <div className="space-y-6">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">HRD Dashboard</h1>
                            <p className="text-slate-400">Placement & Career Services Overview</p>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                            </div>
                        ) : (
                            <>
                                {/* Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <StatCard
                                        title="Total Students"
                                        value={stats?.total_students || 0}
                                        icon={Users}
                                        gradient="from-blue-500 to-blue-600"
                                    />
                                    <StatCard
                                        title="Active Drives"
                                        value={stats?.active_drives || 0}
                                        icon={Briefcase}
                                        gradient="from-emerald-500 to-emerald-600"
                                    />
                                    <StatCard
                                        title="Total Offers"
                                        value={stats?.total_offers || 0}
                                        icon={Award}
                                        gradient="from-purple-500 to-purple-600"
                                        trend="+12%"
                                    />
                                    <StatCard
                                        title="Placement Rate"
                                        value={`${stats?.placement_percentage || 0}%`}
                                        icon={TrendingUp}
                                        gradient="from-pink-500 to-pink-600"
                                    />
                                </div>

                                {/* Quick Actions */}
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <button
                                            onClick={() => setActiveTab('companies')}
                                            className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-6 text-left hover:border-blue-500/50 transition-all group"
                                        >
                                            <Building2 className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                                            <h3 className="text-white font-bold mb-1">Add Company</h3>
                                            <p className="text-slate-400 text-sm">Register a new company</p>
                                        </button>

                                        <button
                                            onClick={() => setActiveTab('drives')}
                                            className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 rounded-xl p-6 text-left hover:border-emerald-500/50 transition-all group"
                                        >
                                            <Briefcase className="w-8 h-8 text-emerald-400 mb-3 group-hover:scale-110 transition-transform" />
                                            <h3 className="text-white font-bold mb-1">Create Drive</h3>
                                            <p className="text-slate-400 text-sm">Schedule placement drive</p>
                                        </button>

                                        <button
                                            onClick={() => setActiveTab('ai-analysis')}
                                            className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-6 text-left hover:border-purple-500/50 transition-all group"
                                        >
                                            <BrainCircuit className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                                            <h3 className="text-white font-bold mb-1">AI Analysis</h3>
                                            <p className="text-slate-400 text-sm">Analyze resumes with AI</p>
                                        </button>
                                    </div>
                                </div>

                                {/* Recent Activity Placeholder */}
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
                                    <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                                        <p className="text-slate-400 text-center py-8">No recent activity</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                );

            case 'companies':
                return <CompanyManagement token={token} />;

            case 'drives':
                return <DriveManagement token={token} />;

            case 'offers':
                return <OfferManagement token={token} />;

            case 'ai-analysis':
                return <AIAnalysis token={token} />;

            case 'analytics':
                return <Analytics token={token} />;

            default:
                return <div>Coming soon...</div>;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/10 to-purple-950/10 flex">
            {/* Sidebar */}
            <div className={`${sidebarOpen ? 'w-64' : 'w-0'} lg:w-64 transition-all duration-300 bg-slate-900/80 backdrop-blur-xl border-r border-white/10 flex flex-col`}>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <Briefcase className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold">HRD Portal</h2>
                            <p className="text-xs text-slate-400">Placement Cell</p>
                        </div>
                    </div>

                    <nav className="space-y-2">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium">{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="mt-auto p-6 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-slate-900/60 backdrop-blur-xl border-b border-white/10 p-6 flex items-center justify-between">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="lg:hidden text-white hover:bg-white/5 p-2 rounded-lg transition-colors"
                    >
                        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>

                    <div className="flex items-center gap-4 ml-auto">
                        <div className="text-right">
                            <p className="text-white font-semibold">HRD Admin</p>
                            <p className="text-xs text-slate-400">Placement Officer</p>
                        </div>
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold">H</span>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-7xl mx-auto">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default HRDDashboard;
