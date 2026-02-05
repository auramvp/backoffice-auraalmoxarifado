
import React, { useState, useEffect, useRef } from 'react';
import {
    Megaphone, Plus, Image, Link2, Clock, Eye, MousePointerClick, Trash2,
    RefreshCcw, X, Upload, Calendar, ExternalLink, BarChart3, TrendingUp,
    CheckCircle2, AlertTriangle, Loader2
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
    created_at: string;
}

export const MarketingView: React.FC = () => {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [newBanner, setNewBanner] = useState({
        title: '',
        image_url: '',
        destination_url: '',
        start_date: '',
        end_date: '',
        is_active: true
    });

    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useEffect(() => {
        fetchBanners();
    }, []);

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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);

        // Preview local
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewImage(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `banner_${Date.now()}.${fileExt}`;
        const filePath = `banners/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('marketing')
            .upload(filePath, file, {
                upsert: true
            });

        if (uploadError) {
            console.error('Upload error details:', uploadError);
            alert('Erro ao fazer upload: ' + uploadError.message);
            setUploading(false);
            return;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('marketing')
            .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
            console.log('Public URL generated:', urlData.publicUrl);
            setNewBanner(prev => ({ ...prev, image_url: urlData.publicUrl }));
        } else {
            alert('Erro ao gerar URL pública da imagem');
        }
        setUploading(false);
    };

    const handleSaveBanner = async () => {
        if (!newBanner.title || !newBanner.image_url) {
            alert('Preencha o título e faça upload de uma imagem');
            return;
        }

        setSaving(true);

        const { data: { user } } = await supabase.auth.getUser();

        // Limpa o link de destino se for apenas o prefixo padrão ou vazio
        const cleanDestinationUrl = newBanner.destination_url.trim() === 'https://' || !newBanner.destination_url.trim()
            ? null
            : newBanner.destination_url.trim();

        const { data, error } = await supabase
            .from('banners')
            .insert([{
                title: newBanner.title,
                image_url: newBanner.image_url,
                destination_url: cleanDestinationUrl,
                start_date: newBanner.start_date || null,
                end_date: newBanner.end_date || null,
                is_active: newBanner.is_active,
                created_by: user?.id
            }])
            .select();

        if (!error && data) {
            setBanners([data[0] as Banner, ...banners]);
            setShowModal(false);
            resetForm();
        } else {
            alert('Erro ao salvar banner: ' + error?.message);
        }

        setSaving(false);
    };

    const resetForm = () => {
        setNewBanner({
            title: '',
            image_url: '',
            destination_url: '',
            start_date: '',
            end_date: '',
            is_active: true
        });
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

        const { error } = await supabase
            .from('banners')
            .delete()
            .eq('id', id);

        if (!error) {
            setBanners(banners.filter(b => b.id !== id));
        }
    };

    const totalClicks = banners.reduce((acc, b) => acc + b.clicks, 0);
    const totalImpressions = banners.reduce((acc, b) => acc + b.impressions, 0);
    const activeBanners = banners.filter(b => b.is_active).length;
    const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
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
                        Gerencie banners e campanhas do aplicativo.
                    </p>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={fetchBanners}
                        className="p-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-500/10 transition-all"
                    >
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>

                    <button
                        onClick={() => { setShowModal(true); resetForm(); }}
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl font-bold text-sm hover:from-blue-500 hover:to-indigo-600 transition-all flex items-center space-x-2 shadow-lg shadow-blue-900/30"
                    >
                        <Plus size={18} />
                        <span>Novo Banner</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#0A0D14] p-5 rounded-2xl border border-slate-200 dark:border-white/5">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
                            <Image size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{banners.length}</p>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Total Banners</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0A0D14] p-5 rounded-2xl border border-slate-200 dark:border-white/5">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500">
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{activeBanners}</p>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Ativos</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0A0D14] p-5 rounded-2xl border border-slate-200 dark:border-white/5">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
                            <MousePointerClick size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{totalClicks.toLocaleString()}</p>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Total Cliques</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#0A0D14] p-5 rounded-2xl border border-slate-200 dark:border-white/5">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-orange-500/10 rounded-xl text-orange-500">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{avgCTR}%</p>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">CTR Médio</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Banners List */}
            {loading ? (
                <div className="py-20 text-center bg-white dark:bg-[#0A0D14] rounded-3xl border border-slate-200 dark:border-white/5">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Carregando banners...</p>
                </div>
            ) : banners.length === 0 ? (
                <div className="py-20 text-center bg-white dark:bg-[#0A0D14] rounded-3xl border border-slate-200 dark:border-white/5">
                    <div className="p-4 bg-blue-500/10 rounded-full w-fit mx-auto mb-4">
                        <Megaphone size={32} className="text-blue-500" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Nenhum Banner</h3>
                    <p className="text-sm text-slate-500 mb-6">Crie seu primeiro banner clicando no botão acima.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                    {banners.map((banner) => (
                        <div
                            key={banner.id}
                            className="bg-white dark:bg-[#0A0D14] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden group hover:border-blue-500/30 transition-all"
                        >
                            {/* Banner Image */}
                            <div className="relative aspect-[16/9] bg-slate-100 dark:bg-white/5 overflow-hidden">
                                <img
                                    src={banner.image_url}
                                    alt={banner.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute top-3 right-3">
                                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${banner.is_active
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-slate-500 text-white'
                                        }`}>
                                        {banner.is_active ? 'Ativo' : 'Inativo'}
                                    </span>
                                </div>
                            </div>

                            {/* Banner Info */}
                            <div className="p-4">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-2 truncate">
                                    {banner.title}
                                </h3>

                                {banner.destination_url && (
                                    <a
                                        href={banner.destination_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center space-x-1 text-xs text-blue-500 hover:text-blue-400 mb-3 truncate"
                                    >
                                        <Link2 size={12} />
                                        <span className="truncate">{banner.destination_url}</span>
                                    </a>
                                )}

                                {/* Stats */}
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

                                {/* Schedule */}
                                {(banner.start_date || banner.end_date) && (
                                    <div className="flex items-center space-x-2 text-[10px] text-slate-500 mb-3">
                                        <Clock size={12} />
                                        <span>
                                            {banner.start_date ? formatDate(banner.start_date) : '...'} até {banner.end_date ? formatDate(banner.end_date) : '...'}
                                        </span>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                                    <button
                                        onClick={() => toggleBannerStatus(banner.id, banner.is_active)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${banner.is_active
                                            ? 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-red-100 hover:text-red-500'
                                            : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                                            }`}
                                    >
                                        {banner.is_active ? 'Desativar' : 'Ativar'}
                                    </button>
                                    <button
                                        onClick={() => deleteBanner(banner.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* New Banner Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#05070A]/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#0F172A] w-full max-w-lg rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl text-white">
                                    <Image size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Novo Banner</h3>
                                    <p className="text-[10px] text-slate-500">Configure a imagem e programação</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            {/* Image Upload */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                    Imagem do Banner
                                </label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-4 text-center cursor-pointer hover:border-blue-500/50 transition-all"
                                >
                                    {uploading ? (
                                        <div className="py-6">
                                            <Loader2 size={32} className="text-blue-500 animate-spin mx-auto mb-2" />
                                            <p className="text-xs text-slate-500">Fazendo upload...</p>
                                        </div>
                                    ) : previewImage || newBanner.image_url ? (
                                        <div className="relative">
                                            <img
                                                src={previewImage || newBanner.image_url}
                                                alt="Preview"
                                                className="w-full h-40 object-cover rounded-xl"
                                            />
                                            <p className="text-[10px] text-blue-500 mt-2">Clique para trocar</p>
                                        </div>
                                    ) : (
                                        <div className="py-6">
                                            <Upload size={32} className="text-slate-400 mx-auto mb-2" />
                                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                                Clique para fazer upload
                                            </p>
                                            <p className="text-[10px] text-slate-400">PNG, JPG, WEBP até 5MB</p>
                                        </div>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                    Título do Banner
                                </label>
                                <input
                                    type="text"
                                    value={newBanner.title}
                                    onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    placeholder="Ex: Promoção de Natal"
                                />
                            </div>

                            {/* Destination URL */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                    Link de Destino
                                </label>
                                <div className="relative">
                                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        value={newBanner.destination_url}
                                        onChange={(e) => setNewBanner({ ...newBanner, destination_url: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        placeholder="https://exemplo.com/promocao"
                                    />
                                </div>
                            </div>

                            {/* Schedule */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                        Data Início
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="date"
                                            value={newBanner.start_date}
                                            onChange={(e) => setNewBanner({ ...newBanner, start_date: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                        Data Fim
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="date"
                                            value={newBanner.end_date}
                                            onChange={(e) => setNewBanner({ ...newBanner, end_date: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Active Toggle */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Ativar imediatamente</span>
                                <button
                                    onClick={() => setNewBanner({ ...newBanner, is_active: !newBanner.is_active })}
                                    className={`w-12 h-6 rounded-full transition-all ${newBanner.is_active ? 'bg-blue-600' : 'bg-slate-300 dark:bg-white/10'}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${newBanner.is_active ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-100 dark:border-white/5 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-5 py-2.5 text-slate-500 hover:text-slate-700 dark:hover:text-white font-bold text-sm transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveBanner}
                                disabled={saving || uploading || !newBanner.title || !newBanner.image_url}
                                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl font-bold text-sm hover:from-blue-500 hover:to-indigo-600 transition-all flex items-center space-x-2 shadow-lg shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                {saving ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Plus size={16} className="group-active:scale-90 transition-transform" />
                                )}
                                <span>{saving ? 'Salvando...' : 'Criar Banner'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
