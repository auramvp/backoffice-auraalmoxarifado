
import React, { useState, useEffect, useRef } from 'react';
import {
    Megaphone, Plus, Image, Link2, Clock, Eye, MousePointerClick, Trash2,
    RefreshCcw, X, Upload, Calendar, ExternalLink, BarChart3, TrendingUp,
    CheckCircle2, AlertTriangle, Loader2, Ticket, Percent, DollarSign as DollarIcon,
    ChevronRight, ArrowRight, Tag, ArrowRightLeft, Edit3, Save

} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Banner {
    id: string;
    title: string;
    image_url: string;
    destination_url: string;
    is_active: boolean;
    start_date: string | null;
    end_date: string | null;
    clicks: number;
    impressions: number;
    target_type: 'all' | 'partners' | 'plan';
    target_value: string | null;
    created_at: string;
}

interface Coupon {
    id: string;
    code: string;
    type: 'fixed' | 'percentage';
    value: number;
    is_active: boolean;
    max_uses: number | null;
    current_uses: number;
    end_date: string | null;
    created_at: string;
}

interface Plan {
    id: string;
    name: string;
    value: number;
}

// --- Sub-components ---
const StatsCard: React.FC<{ icon: any, label: string, value: string | number, blue?: boolean, green?: boolean, orange?: boolean, blueSecondary?: boolean }> = ({ icon: Icon, label, value, blue, green, orange, blueSecondary }) => (
    <div className="bg-white dark:bg-[#0A0D14] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
        <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${blue ? 'bg-blue-500/10 text-blue-500' : green ? 'bg-emerald-500/10 text-emerald-500' : blueSecondary ? 'bg-indigo-500/10 text-indigo-500' : 'bg-orange-500/10 text-orange-500'}`}>
                <Icon size={20} />
            </div>
            <div>
                <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">{value}</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-1">{label}</p>
            </div>
        </div>
    </div>
);

const InputField: React.FC<{ label: string, value: string, onChange: (v: string) => void, placeholder?: string, icon?: any, type?: string }> = ({ label, value, onChange, placeholder, icon: Icon, type = 'text' }) => (
    <div className="space-y-2">
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
        <div className="relative">
            {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />}
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${Icon ? 'pl-10' : ''}`}
                placeholder={placeholder}
            />
        </div>
    </div>
);

const LoadingState: React.FC<{ text: string }> = ({ text }) => (
    <div className="py-20 text-center bg-white dark:bg-[#0A0D14] rounded-3xl border border-slate-200 dark:border-white/5">
        <Loader2 size={32} className="text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-sm font-black text-slate-500 uppercase tracking-widest">{text}</p>
    </div>
);

const EmptyState: React.FC<{ icon: any, title: string, description: string }> = ({ icon: Icon, title, description }) => (
    <div className="py-20 text-center bg-white dark:bg-[#0A0D14] rounded-3xl border border-slate-200 dark:border-white/5">
        <div className="p-4 bg-blue-500/10 rounded-full w-fit mx-auto mb-4"><Icon size={32} className="text-blue-500" /></div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6">{description}</p>
    </div>
);

export const MarketingView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'banners' | 'coupons'>('banners');
    const [banners, setBanners] = useState<Banner[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);

    // Banner states
    const [showBannerModal, setShowBannerModal] = useState(false);
    const [savingBanner, setSavingBanner] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [newBanner, setNewBanner] = useState({
        title: '',
        image_url: '',
        destination_url: '',
        start_date: '',
        end_date: '',
        target_type: 'all' as 'all' | 'partners' | 'plan',
        target_value: '',
        is_active: true
    });
    const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Coupon states
    const [showCouponModal, setShowCouponModal] = useState(false);
    const [savingCoupon, setSavingCoupon] = useState(false);
    const [newCoupon, setNewCoupon] = useState({
        code: '',
        type: 'percentage' as 'fixed' | 'percentage',
        value: 0,
        max_uses: '',
        end_date: '',
        is_active: true
    });
    const [editingCouponId, setEditingCouponId] = useState<string | null>(null);


    useEffect(() => {
        fetchData();
        fetchPlans(); // Always fetch plans for previews
    }, [activeTab]);

    const fetchData = async () => {
        if (activeTab === 'banners') {
            await fetchBanners();
        } else {
            await fetchCoupons();
        }
    };

    const fetchBanners = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('banners')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setBanners(data as Banner[]);
        }
        setLoading(false);
    };

    const fetchCoupons = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            setCoupons(data as Coupon[]);
        }
        setLoading(false);
    };

    const fetchPlans = async () => {
        const { data, error } = await supabase
            .from('plans')
            .select('id, name, value')
            .eq('status', 'active')
            .order('value', { ascending: true });

        if (!error && data) {
            setPlans(data as Plan[]);
        }
    };

    // --- Banner Actions ---
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewImage(reader.result as string);
        };
        reader.readAsDataURL(file);

        const fileExt = file.name.split('.').pop();
        const fileName = `banner_${Date.now()}.${fileExt}`;
        const filePath = `banners/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('marketing')
            .upload(filePath, file, { upsert: true });

        if (uploadError) {
            alert('Erro ao fazer upload: ' + uploadError.message);
            setUploading(false);
            return;
        }

        const { data: urlData } = supabase.storage
            .from('marketing')
            .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
            setNewBanner(prev => ({ ...prev, image_url: urlData.publicUrl }));
        }
        setUploading(false);
    };

    const handleSaveBanner = async () => {
        if (!newBanner.title || !newBanner.image_url) {
            alert('Preencha o título e faça upload de uma imagem');
            return;
        }

        setSavingBanner(true);
        const { data: { user } } = await supabase.auth.getUser();

        const cleanDestinationUrl = newBanner.destination_url.trim() === 'https://' || !newBanner.destination_url.trim()
            ? null
            : newBanner.destination_url.trim();

        const bannerData = {
            title: newBanner.title,
            image_url: newBanner.image_url,
            destination_url: cleanDestinationUrl,
            start_date: newBanner.start_date || null,
            end_date: newBanner.end_date || null,
            target_type: newBanner.target_type,
            target_value: newBanner.target_type === 'plan' ? newBanner.target_value : null,
            is_active: newBanner.is_active,
            created_by: user?.id
        };

        if (editingBannerId) {
            const { error } = await supabase
                .from('banners')
                .update(bannerData)
                .eq('id', editingBannerId);

            if (!error) {
                await logAction('Banner Atualizado', `O banner ${newBanner.title} foi atualizado.`);
                fetchBanners();
                setShowBannerModal(false);
                resetBannerForm();
            } else {
                alert('Erro ao atualizar banner: ' + error.message);
            }
        } else {
            const { data, error } = await supabase
                .from('banners')
                .insert([bannerData])
                .select();

            if (!error && data) {
                await logAction('Novo Banner Criado', `O banner ${newBanner.title} foi criado.`);
                setBanners([data[0] as Banner, ...banners]);
                setShowBannerModal(false);
                resetBannerForm();
            } else {
                alert('Erro ao salvar banner: ' + error?.message);
            }
        }
        setSavingBanner(false);
    };

    const handleEditBanner = (banner: Banner) => {
        setEditingBannerId(banner.id);
        setNewBanner({
            title: banner.title,
            image_url: banner.image_url,
            destination_url: banner.destination_url || '',
            start_date: banner.start_date ? banner.start_date.split('T')[0] : '',
            end_date: banner.end_date ? banner.end_date.split('T')[0] : '',
            target_type: banner.target_type || 'all',
            target_value: banner.target_value || '',
            is_active: banner.is_active
        });
        setPreviewImage(banner.image_url);
        setShowBannerModal(true);
    };

    const resetBannerForm = () => {
        setNewBanner({
            title: '',
            image_url: '',
            destination_url: '',
            start_date: '',
            end_date: '',
            target_type: 'all',
            target_value: '',
            is_active: true
        });
        setEditingBannerId(null);
        setPreviewImage(null);
    };

    const toggleBannerStatus = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('banners')
            .update({ is_active: !currentStatus })
            .eq('id', id);

        if (!error) {
            setBanners(banners.map(b => b.id === id ? { ...b, is_active: !currentStatus } : b));
        }
    };

    const deleteBanner = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este banner?')) return;
        const { error } = await supabase.from('banners').delete().eq('id', id);
        if (!error) setBanners(banners.filter(b => b.id !== id));
    };

    // --- Coupon Actions ---
    const logAction = async (action: string, details: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('activity_logs').insert([{
            user_name: user?.user_metadata?.name || 'Admin',
            user_role: user?.user_metadata?.role || 'ADMIN',
            action,
            details,
            module: 'MARKETING',
            type: 'success',
            timestamp: new Date().toISOString()
        }]);
    };

    const handleSaveCoupon = async () => {
        if (!newCoupon.code || newCoupon.value <= 0) {
            alert('Preencha o código e o valor do desconto');
            return;
        }

        if (newCoupon.type === 'percentage' && newCoupon.value > 100) {
            alert('O desconto percentual não pode ultrapassar 100%');
            return;
        }

        setSavingCoupon(true);
        try {
            const couponData = {
                code: newCoupon.code.toUpperCase().replace(/\s/g, ''),
                type: newCoupon.type,
                value: newCoupon.value,
                max_uses: newCoupon.max_uses ? parseInt(newCoupon.max_uses) : null,
                end_date: newCoupon.end_date || null,
                is_active: newCoupon.is_active
            };

            let error;
            if (editingCouponId) {
                const { error: updateError } = await supabase
                    .from('coupons')
                    .update(couponData)
                    .eq('id', editingCouponId);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('coupons')
                    .insert([couponData]);
                error = insertError;
            }

            if (error) throw error;

            await logAction(
                editingCouponId ? 'Cupom Atualizado' : 'Novo Cupom Criado',
                `O cupom ${newCoupon.code} foi ${editingCouponId ? 'atualizado' : 'criado'} com sucesso.`
            );

            setShowCouponModal(false);
            setEditingCouponId(null);
            resetCouponForm();
            fetchCoupons();
        } catch (error: any) {
            console.error('Erro ao salvar cupom:', error);
            alert('Erro ao salvar cupom: ' + error.message);
        } finally {
            setSavingCoupon(false);
        }
    };

    const handleEditCoupon = (coupon: Coupon) => {
        setEditingCouponId(coupon.id);
        setNewCoupon({
            code: coupon.code,
            type: coupon.type,
            value: Number(coupon.value),
            max_uses: coupon.max_uses?.toString() || '',
            end_date: coupon.end_date || '',
            is_active: coupon.is_active
        });
        setShowCouponModal(true);
    };

    const resetCouponForm = () => {
        setNewCoupon({
            code: '',
            type: 'percentage',
            value: 0,
            max_uses: '',
            end_date: '',
            is_active: true
        });
        setEditingCouponId(null);
    };


    const toggleCouponStatus = async (id: string, currentStatus: boolean) => {

        const { error } = await supabase
            .from('coupons')
            .update({ is_active: !currentStatus })
            .eq('id', id);

        if (!error) {
            setCoupons(coupons.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
        }
    };

    const deleteCoupon = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este cupom?')) return;
        const { error } = await supabase.from('coupons').delete().eq('id', id);
        if (!error) setCoupons(coupons.filter(c => c.id !== id));
    };

    // --- Stats Helpers ---
    const totalClicks = banners.reduce((acc, b) => acc + b.clicks, 0);
    const totalImpressions = banners.reduce((acc, b) => acc + b.impressions, 0);
    const activeBanners = banners.filter(b => b.is_active).length;
    const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl text-white">
                            <Megaphone size={24} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">
                            Marketing
                        </h2>
                    </div>
                    <p className="text-slate-500 dark:text-gray-400 font-medium">
                        Gerencie banners e campanhas de cupons do ecossistema.
                    </p>
                </div>

                <div className="flex items-center space-x-3">
                    <div className="flex bg-white dark:bg-[#0F172A] p-1 rounded-xl border border-slate-200 dark:border-white/10 mr-2">
                        <button
                            onClick={() => setActiveTab('banners')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center space-x-2 ${activeTab === 'banners' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                        >
                            <Image size={14} />
                            <span>Banners</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('coupons')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center space-x-2 ${activeTab === 'coupons' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                        >
                            <Ticket size={14} />
                            <span>Cupons</span>
                        </button>
                    </div>

                    <button
                        onClick={activeTab === 'banners' ? fetchBanners : fetchCoupons}
                        className="p-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-500/10 transition-all"
                    >
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>

                    <button
                        onClick={() => { activeTab === 'banners' ? setShowBannerModal(true) : setShowCouponModal(true); activeTab === 'banners' ? resetBannerForm() : resetCouponForm(); }}
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl font-bold text-sm hover:from-blue-500 hover:to-indigo-600 transition-all flex items-center space-x-2 shadow-lg shadow-blue-900/30"
                    >
                        <Plus size={18} />
                        <span>{activeTab === 'banners' ? 'Novo Banner' : 'Novo Cupom'}</span>
                    </button>
                </div>
            </div>

            {activeTab === 'banners' ? (
                <>
                    {/* Banners Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatsCard icon={Image} label="Total Banners" value={banners.length} blue />
                        <StatsCard icon={CheckCircle2} label="Ativos" value={activeBanners} green />
                        <StatsCard icon={MousePointerClick} label="Total Cliques" value={totalClicks.toLocaleString()} blueSecondary />
                        <StatsCard icon={TrendingUp} label="CTR Médio" value={`${avgCTR}%`} orange />
                    </div>

                    {/* Banners Grid */}
                    {loading ? (
                        <LoadingState text="Carregando banners..." />
                    ) : banners.length === 0 ? (
                        <EmptyState icon={Megaphone} title="Nenhum Banner" description="Crie seu primeiro banner clicando no botão acima." />
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                            {banners.map((banner) => (
                                <div key={banner.id} className="bg-white dark:bg-[#0A0D14] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden group hover:border-blue-500/30 transition-all">
                                    <div className="relative aspect-[16/9] bg-slate-100 dark:bg-white/5 overflow-hidden">
                                        <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute top-3 right-3">
                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${banner.is_active ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'}`}>
                                                {banner.is_active ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-bold text-slate-900 dark:text-white mb-2 truncate">{banner.title}</h3>
                                        {banner.destination_url && (
                                            <a href={banner.destination_url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1 text-xs text-blue-500 hover:text-blue-400 mb-3 truncate">
                                                <Link2 size={12} />
                                                <span className="truncate">{banner.destination_url}</span>
                                            </a>
                                        )}
                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-lg text-center">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{banner.clicks.toLocaleString()}</p>
                                                <p className="text-[8px] text-slate-500 uppercase font-bold">Cliques</p>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-lg text-center">
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{banner.impressions.toLocaleString()}</p>
                                                <p className="text-[8px] text-slate-500 uppercase font-bold">Impressões</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                                            <div className="flex items-center space-x-2">
                                                <button onClick={() => toggleBannerStatus(banner.id, banner.is_active)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${banner.is_active ? 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-red-100 hover:text-red-500' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'}`}>
                                                    {banner.is_active ? 'Desativar' : 'Ativar'}
                                                </button>
                                                <button onClick={() => handleEditBanner(banner)} className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors">
                                                    <Edit3 size={16} />
                                                </button>
                                            </div>
                                            <button onClick={() => deleteBanner(banner.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <>
                    {/* Coupons Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatsCard icon={Ticket} label="Total Cupons" value={coupons.length} blue />
                        <StatsCard icon={CheckCircle2} label="Cupons Ativos" value={coupons.filter(c => c.is_active).length} green />
                        <StatsCard icon={ArrowRightLeft} label="Usos Totais" value={coupons.reduce((acc, c) => acc + c.current_uses, 0)} blueSecondary />
                        <StatsCard icon={TrendingUp} label="Taxa de Uso" value={`${coupons.length > 0 ? (coupons.reduce((acc, c) => acc + (c.current_uses > 0 ? 1 : 0), 0) / coupons.length * 100).toFixed(0) : 0}%`} orange />
                    </div>

                    {/* Coupons List */}
                    {loading ? (
                        <LoadingState text="Carregando cupons..." />
                    ) : coupons.length === 0 ? (
                        <EmptyState icon={Ticket} title="Nenhum Cupom" description="Crie seu primeiro cupom promocional clicando no botão acima." />
                    ) : (
                        <div className="bg-white dark:bg-[#0A0D14] rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5">
                                            <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Código</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Desconto</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Uso / Limite</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Status</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">Expiração</th>
                                            <th className="px-6 py-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                                        {coupons.map((coupon) => (
                                            <tr key={coupon.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                                                            <Tag size={16} />
                                                        </div>
                                                        <span className="font-black text-slate-900 dark:text-white tracking-widest uppercase">{coupon.code}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center space-x-1.5">
                                                        {coupon.type === 'percentage' ? <Percent size={14} className="text-emerald-500" /> : <DollarIcon size={14} className="text-emerald-500" />}
                                                        <span className="font-bold text-slate-900 dark:text-white">
                                                            {coupon.type === 'percentage' ? `${coupon.value}%` : `R$ ${Number(coupon.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-xs font-black text-slate-900 dark:text-white">{coupon.current_uses} / {coupon.max_uses || '∞'}</span>
                                                        <div className="w-20 h-1 bg-slate-200 dark:bg-white/5 rounded-full mt-1 overflow-hidden">
                                                            <div
                                                                className="h-full bg-blue-500"
                                                                style={{ width: `${coupon.max_uses ? Math.min((coupon.current_uses / coupon.max_uses) * 100, 100) : 5}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => toggleCouponStatus(coupon.id, coupon.is_active)}
                                                        className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase border ${coupon.is_active ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}
                                                    >
                                                        {coupon.is_active ? 'Ativo' : 'Inativo'}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center space-x-2 text-xs text-slate-500">
                                                        <Calendar size={12} />
                                                        <span>{formatDate(coupon.end_date || '')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <button onClick={() => handleEditCoupon(coupon)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button onClick={() => deleteCoupon(coupon.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>

                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Banner Modal */}
            {showBannerModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#05070A]/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#0F172A] w-full max-w-lg rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl text-white"><Image size={20} /></div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Novo Banner</h3>
                                    <p className="text-[10px] text-slate-500">Configure a imagem e programação</p>
                                </div>
                            </div>
                            <button onClick={() => setShowBannerModal(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-4 text-center cursor-pointer hover:border-blue-500/50 transition-all">
                                {uploading ? <LoadingState text="Fazendo upload..." /> : previewImage || newBanner.image_url ? <img src={previewImage || newBanner.image_url} alt="Preview" className="w-full h-40 object-cover rounded-xl" /> : <div className="py-6"><Upload size={32} className="text-slate-400 mx-auto mb-2" /><p className="text-sm font-medium text-slate-600 dark:text-slate-400">Clique para fazer upload</p></div>}
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            <InputField label="Título do Banner" value={newBanner.title} onChange={v => setNewBanner({ ...newBanner, title: v })} placeholder="Ex: Promoção de Natal" />
                            <InputField label="Link de Destino" icon={Link2} value={newBanner.destination_url} onChange={v => setNewBanner({ ...newBanner, destination_url: v })} placeholder="https://exemplo.com/promocao" />
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="Data Início" icon={Calendar} type="date" value={newBanner.start_date} onChange={v => setNewBanner({ ...newBanner, start_date: v })} />
                                <InputField label="Data Fim" icon={Calendar} type="date" value={newBanner.end_date} onChange={v => setNewBanner({ ...newBanner, end_date: v })} />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Público-Alvo</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'all', label: 'Todos' },
                                        { id: 'partners', label: 'Parceiros' },
                                        { id: 'plan', label: 'Plano Espec.' }
                                    ].map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setNewBanner({ ...newBanner, target_type: t.id as any })}
                                            className={`py-2 rounded-lg text-[10px] font-bold transition-all border ${newBanner.target_type === t.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500'}`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {newBanner.target_type === 'plan' && (
                                <div className="animate-in slide-in-from-top-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Selecione o Plano</label>
                                    <select
                                        value={newBanner.target_value}
                                        onChange={(e) => setNewBanner({ ...newBanner, target_value: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                                    >
                                        <option value="">Selecione um plano...</option>
                                        {plans.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-slate-100 dark:border-white/5 flex justify-end space-x-3">
                            <button onClick={() => setShowBannerModal(false)} className="px-5 py-2.5 text-slate-500 hover:text-white font-bold text-sm transition-colors">Cancelar</button>
                            <button onClick={handleSaveBanner} disabled={savingBanner || uploading || !newBanner.title || !newBanner.image_url} className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl font-bold text-sm flex items-center space-x-2 shadow-lg disabled:opacity-50">
                                {savingBanner ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                <span>{savingBanner ? 'Salvando...' : 'Criar Banner'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Coupon Modal */}
            {showCouponModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#05070A]/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#0F172A] w-full max-w-4xl rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col md:flex-row h-fit max-h-[90vh]">
                        {/* Left Side: Form */}
                        <div className="flex-1 p-8 overflow-y-auto border-r border-slate-100 dark:border-white/5">
                            <div className="flex items-center space-x-3 mb-8">
                                <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                                    <Tag size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Configurar Desconto</h3>
                                    <p className="text-xs text-slate-500 font-medium">Defina as regras e validade do cupom</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <InputField
                                    label="Código do Cupom"
                                    value={newCoupon.code}
                                    onChange={v => setNewCoupon({ ...newCoupon, code: v.toUpperCase() })}
                                    placeholder="EX: AURA10"
                                />

                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Tipo de Desconto</label>
                                    <div className="flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl border border-slate-200 dark:border-white/10">
                                        <button
                                            onClick={() => setNewCoupon({ ...newCoupon, type: 'percentage' })}
                                            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 ${newCoupon.type === 'percentage' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}
                                        >
                                            <Percent size={14} />
                                            <span>Porcentagem</span>
                                        </button>
                                        <button
                                            onClick={() => setNewCoupon({ ...newCoupon, type: 'fixed' })}
                                            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 ${newCoupon.type === 'fixed' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'}`}
                                        >
                                            <DollarIcon size={14} />
                                            <span>Valor Fixo</span>
                                        </button>
                                    </div>
                                </div>

                                <InputField
                                    label={newCoupon.type === 'percentage' ? "Valor do Desconto (%)" : "Valor do Desconto (R$)"}
                                    type="number"
                                    value={newCoupon.value.toString()}
                                    onChange={v => {
                                        let val = parseFloat(v) || 0;
                                        if (newCoupon.type === 'percentage' && val > 100) val = 100;
                                        setNewCoupon({ ...newCoupon, value: val });
                                    }}
                                    placeholder={newCoupon.type === 'percentage' ? "10" : "50.00"}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <InputField label="Limite de Usos" type="number" value={newCoupon.max_uses || ''} onChange={v => setNewCoupon({ ...newCoupon, max_uses: v })} placeholder="∞" />
                                    <InputField label="Data de Expiração" type="date" value={newCoupon.end_date || ''} onChange={v => setNewCoupon({ ...newCoupon, end_date: v })} />
                                </div>
                            </div>

                            <div className="mt-10 flex items-center space-x-3">
                                <button onClick={() => { setShowCouponModal(false); setEditingCouponId(null); }} className="flex-1 py-4 text-slate-500 hover:text-slate-900 dark:hover:text-white font-black text-xs uppercase tracking-widest transition-all">Cancelar</button>
                                <button
                                    onClick={handleSaveCoupon}
                                    disabled={savingCoupon || !newCoupon.code || newCoupon.value <= 0}
                                    className="flex-[2] py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 shadow-xl shadow-blue-500/20 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {savingCoupon ? <Loader2 size={16} className="animate-spin" /> : editingCouponId ? <Save size={18} /> : <CheckCircle2 size={18} />}
                                    <span>{savingCoupon ? 'Salvando...' : editingCouponId ? 'Salvar Cupom' : 'Criar Cupom'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Right Side: Simulation Preview */}
                        <div className="w-full md:w-80 lg:w-96 bg-slate-50 dark:bg-[#0A0D14] p-8 flex flex-col">
                            <div className="mb-6">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Preview e Simulação</h4>
                                <h3 className="text-lg font-black text-slate-800 dark:text-white italic uppercase tracking-tight">Impacto nos Planos</h3>
                            </div>

                            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                                {plans.map(plan => {
                                    const discount = newCoupon.type === 'percentage' ? (plan.value * (newCoupon.value / 100)) : newCoupon.value;
                                    const finalValue = Math.max(0, plan.value - discount);

                                    return (
                                        <div key={plan.id} className="p-4 bg-white dark:bg-white/[0.03] rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm group hover:border-blue-500/30 transition-all">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{plan.name}</span>
                                                <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">-{newCoupon.type === 'percentage' ? `${newCoupon.value}%` : `R$ ${newCoupon.value}`}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-slate-400 line-through">R$ {plan.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-lg font-black text-slate-900 dark:text-white">R$ {finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                    <ArrowRight size={14} className="text-blue-500 group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-8 p-4 bg-blue-600/5 dark:bg-blue-500/5 rounded-2xl border border-blue-500/10">
                                <div className="flex items-start space-x-3">
                                    <AlertTriangle size={18} className="text-blue-500 mt-1" />
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium leading-relaxed">
                                        Os valores acima são estimativas mensais. Certifique-se de validar as regras antes de divulgar o código.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
