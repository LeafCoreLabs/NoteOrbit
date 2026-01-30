// MyOffers.jsx - Student Offer Letters
import React, { useState, useEffect } from 'react';
import { Award, Download, CheckCircle, Building2, Loader2, Calendar } from 'lucide-react';
import { api } from '../../api';

const MyOffers = ({ token }) => {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOffers();
    }, []);

    const fetchOffers = async () => {
        try {
            const response = await api.get('/student/placement/offers', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setOffers(response.data.offers || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-cyan-400" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h2 className="text-2xl font-bold text-white">My Offers</h2>
                <p className="text-slate-400">Congratulations! View your job offers here.</p>
            </div>

            {offers.length === 0 ? (
                <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-12 text-center">
                    <Award className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white">No Offers Yet</h3>
                    <p className="text-slate-400">Keep applying. Your hard work will pay off!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {offers.map(offer => (
                        <div key={offer.id} className="relative bg-gradient-to-br from-slate-900 to-slate-800 border border-emerald-500/30 rounded-2xl p-6 overflow-hidden shadow-xl shadow-emerald-900/10">
                            {/* Confetti/Bg Effect */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-10 translate-x-10" />

                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center p-2 border border-white/10">
                                        <Building2 className="w-8 h-8 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-1">{offer.company_name}</h3>
                                        <p className="text-emerald-400 font-semibold flex items-center gap-1">
                                            <CheckCircle className="w-4 h-4" /> Selected
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-slate-400">Offer Date</p>
                                    <p className="text-white font-mono">{new Date(offer.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="p-4 bg-slate-900/50 rounded-xl border border-white/5 flex justify-between items-center">
                                    <span className="text-slate-400">Role</span>
                                    <span className="font-bold text-white">{offer.role}</span>
                                </div>
                                <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex justify-between items-center">
                                    <span className="text-emerald-300">Package (CTC)</span>
                                    <span className="font-bold text-emerald-400 text-lg">{offer.ctc} LPA</span>
                                </div>
                            </div>

                            <button className="w-full py-3 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                                <Download className="w-5 h-5" />
                                Download Offer Letter
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyOffers;
