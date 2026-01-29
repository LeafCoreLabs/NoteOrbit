// HRDDashboard.jsx - Mobile-Optimized HRD Dashboard (StudentPanel Layout)
import React, { useState, useEffect, useRef } from 'react';
import {
    LayoutDashboard, Building2, Briefcase, FileText, BrainCircuit,
    BarChart3, LogOut, Menu, X, TrendingUp, Users, ChevronDown,
    DollarSign, Award
} from 'lucide-react';
import axios from 'axios';
import gsap from 'gsap';

// Import HRD sub-components
import CompanyManagement from './CompanyManagement';
import DriveManagement from './DriveManagement';
import OfferManagement from './OfferManagement';
import AIAnalysis from './AIAnalysis';
import Analytics from './Analytics';

const HRDDashboard = ({ token, setPage, setToken }) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // GSAP Refs for animations
    const navRef = useRef(null);
    const indicatorRef = useRef(null);
    const contentRef = useRef(null);

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
        setPage('user_type');
    };

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'companies', label: 'Companies', icon: Building2 },
        { id: 'drives', label: 'Drives', icon: Briefcase },
        { id: 'offers', label: 'Offers', icon: FileText },
        { id: 'ai-analysis', label: 'AI Analysis', icon: BrainCircuit },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ];

    // GSAP Navigation Animation - Match StudentPanel
    useEffect(() => {
        if (navRef.current && indicatorRef.current) {
            const activeBtn = navRef.current.querySelector(`button[data-key="${activeTab}"]`);
            if (activeBtn) {
                gsap.to(indicatorRef.current, {
                    y: activeBtn.offsetTop,
                    height: activeBtn.offsetHeight,
                    opacity: 1,
                    duration: 0.5,
                    ease: "elastic.out(1, 0.6)"
                });
            }
        }
        // Content animation
        if (contentRef.current) {
            gsap.fromTo(contentRef.current,
                { opacity: 0, x: 20 },
                { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }
            );
        }
    }, [activeTab]);

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
        <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar - Mobile Optimized like StudentPanel */}
            <div className="w-full md:w-56 bg-slate-900/60 backdrop-blur-xl p-4 rounded-xl shadow-lg border border-white/10 flex-shrink-0 animate-in slide-in-from-left-4 duration-500">
                <h5 className="text-lg font-bold text-blue-400 mb-4 ml-2">HRD Hub</h5>

                {/* Desktop Navigation */}
                <nav className="space-y-1 relative hidden md:block" ref={navRef}>
                    <div ref={indicatorRef} className="absolute left-0 top-0 w-full bg-blue-600/20 border border-blue-500/30 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.2)] pointer-events-none opacity-0 z-0" style={{ height: 0 }} />
                    {menuItems.map(item => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                data-key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center p-3 rounded-xl font-semibold transition-colors duration-200 relative z-10 ${isActive
                                    ? 'text-blue-300'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Icon className="w-5 h-5 mr-3" />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                {/* Mobile Navigation Dropdown - Exact StudentPanel Style */}
                <div className="md:hidden">
                    <div className="relative">
                        <Menu className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 pointer-events-none" />
                        <select
                            value={activeTab}
                            onChange={(e) => setActiveTab(e.target.value)}
                            className="w-full bg-slate-800/80 border border-blue-500/30 rounded-xl py-3 pl-10 pr-4 text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500/50 shadow-lg font-semibold"
                        >
                            {menuItems.map(item => (
                                <option key={item.id} value={item.id} className="bg-slate-900 text-white py-2">
                                    {item.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Logout Button */}
                <div className="mt-6 pt-4 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all font-semibold"
                    >
                        <LogOut className="w-5 h-5" />
                        Logout
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div ref={contentRef} className="flex-1 min-h-[600px] bg-slate-900/60 backdrop-blur-xl p-6 rounded-xl shadow-2xl border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                {renderContent()}
            </div>
        </div>
    );
};

export default HRDDashboard;
