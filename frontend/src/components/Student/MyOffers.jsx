// MyOffers.jsx - View and manage placement offers
import React, { useState, useEffect } from 'react';
import { Gift, IndianRupee, Building2, Calendar, Loader2 } from 'lucide-react';
import { api } from '../../api';

const MyOffers = ({ token }) => {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchOffers(); }, []);

    const fetchOffers = async () => {
        try {
            const res = await api.get('/student/placement/offers', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setOffers(res.data.offers || []);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-cyan-400" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-emerald-400" /> My Offers
            </h2>

            {offers.length === 0 ? (
                <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-12 text-center">
                    <Gift className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white">No Offers Yet</h3>
                    <p className="text-slate-400">Clear interview rounds to receive offers.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {offers.map(offer => (
                        <div key={offer.id} className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                    <Building2 className="w-6 h-6 text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">{offer.company_name}</h3>
                                    <p className="text-emerald-400 text-sm">{offer.role}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2 text-slate-300">
                                    <IndianRupee className="w-4 h-4 text-emerald-400" />
                                    <span>{offer.ctc} LPA</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-300">
                                    <Calendar className="w-4 h-4 text-emerald-400" />
                                    <span>{new Date(offer.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-white/10">
                                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
                                    🎉 Congratulations!
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyOffers;
