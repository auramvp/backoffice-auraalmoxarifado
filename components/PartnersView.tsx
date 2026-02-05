import React, { useState, useEffect } from 'react';
import {
    Handshake, Plus, Building2, Package, ArrowUpDown, Users, Mail, MapPin,
    Phone, RefreshCcw, Search, ExternalLink, X, Send, Loader2, CheckCircle2,
    AlertTriangle, TrendingUp, Activity, DollarSign, Calendar, Eye, ArrowDownLeft, ArrowUpRight,
    LayoutGrid, List
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Partner {
    id: string;
    name: string;
    cnpj: string;
    email: string;
    phone?: string;
    address?: string;
    plan: string;
    status: string;
    created_at: string;
    products_count?: number;
    movements_total?: number;
    users_count?: number;
    total_value?: number;
    economy_generated?: number;
    entry_value?: number;
    exit_value?: number;
    monthly_entry_avg?: number;
    monthly_exit_avg?: number;
}

interface CNPJData {
    razao_social: string;
    nome_fantasia: string;
    logradouro: string;
    numero: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
    telefone?: string;
    email?: string;
}

export const PartnersView: React.FC = () => {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [cnpj, setCnpj] = useState('');
    const [email, setEmail] = useState('');
    const [nomeFantasia, setNomeFantasia] = useState('');
    const [endereco, setEndereco] = useState('');
    const [phone, setPhone] = useState('');
    const [fetchingCNPJ, setFetchingCNPJ] = useState(false);
    const [cnpjError, setCnpjError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [inviteLink, setInviteLink] = useState('');

    // Partner details modal
    const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    // View mode
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        fetchPartners();
    }, []);

    const fetchPartners = async () => {
        setLoading(true);
        try {
            // Buscar empresas com plano Partners
            const { data: companiesData, error } = await supabase
                .from('companies')
                .select('*, profiles(id)')
                .eq('plan', 'Partners')
                .neq('status', 'Pendente')
                .order('name');

            if (!error && companiesData) {
                // Para cada empresa, buscar estatísticas
                const partnersWithStats = await Promise.all(
                    companiesData.map(async (company: any) => {
                        // Buscar produtos
                        let productsCount = 0;
                        let movementsTotal = 0;
                        let totalValue = 0;
                        let entryValue = 0;
                        let exitValue = 0;

                        try {
                            const { count: pCount } = await supabase
                                .from('products')
                                .select('*', { count: 'exact', head: true })
                                .eq('company_id', company.id);
                            productsCount = pCount || 0;

                            // Buscar movimentações com valores
                            const { data: movData } = await supabase
                                .from('stock_movements')
                                .select('quantity, total_value, type')
                                .eq('company_id', company.id);

                            if (movData && movData.length > 0) {
                                movementsTotal = movData.reduce((acc: number, m: any) => acc + Math.abs(parseFloat(m.quantity) || 0), 0);

                                // Calcular entradas e saídas
                                movData.forEach((m: any) => {
                                    const value = parseFloat(m.total_value) || 0;
                                    // type 'IN' = entrada, 'OUT' = saída
                                    if (m.type === 'IN') {
                                        entryValue += value;
                                    } else if (m.type === 'OUT') {
                                        exitValue += value;
                                    }
                                    totalValue += value;
                                });
                            }
                        } catch (e) {
                            console.error('Error fetching movements:', e);
                            // Tables may not exist yet
                        }

                        // Calcular economia (estimativa: 15% de economia via otimização)
                        const economyGenerated = totalValue * 0.15;

                        // Calcular médias mensais (baseado na data de criação da empresa)
                        const createdAt = new Date(company.created_at);
                        const now = new Date();
                        const monthsDiff = Math.max(1, (now.getFullYear() - createdAt.getFullYear()) * 12 + (now.getMonth() - createdAt.getMonth()) + 1);
                        const monthlyEntryAvg = entryValue / monthsDiff;
                        const monthlyExitAvg = exitValue / monthsDiff;

                        return {
                            ...company,
                            users_count: company.profiles?.length || 0,
                            products_count: productsCount,
                            movements_total: movementsTotal,
                            total_value: totalValue,
                            economy_generated: economyGenerated,
                            entry_value: entryValue,
                            exit_value: exitValue,
                            monthly_entry_avg: monthlyEntryAvg,
                            monthly_exit_avg: monthlyExitAvg
                        };
                    })
                );
                setPartners(partnersWithStats);
            }
        } catch (err) {
            console.error("Error fetching partners:", err);
        } finally {
            setLoading(false);
        }
    };

    const formatCNPJ = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        return cleaned
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .substring(0, 18);
    };

    const handleCNPJChange = async (value: string) => {
        const formatted = formatCNPJ(value);
        setCnpj(formatted);
        setCnpjError('');

        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length === 14) {
            setFetchingCNPJ(true);
            try {
                const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleaned}`);
                if (response.ok) {
                    const data: CNPJData = await response.json();
                    setNomeFantasia(data.nome_fantasia || data.razao_social);
                    setEndereco(`${data.logradouro}, ${data.numero} - ${data.bairro}, ${data.municipio}/${data.uf}`);
                    if (data.telefone) setPhone(data.telefone);
                    if (data.email) setEmail(data.email);
                } else {
                    setCnpjError('CNPJ não encontrado na base da Receita Federal');
                }
            } catch (err) {
                setCnpjError('Erro ao consultar CNPJ');
            } finally {
                setFetchingCNPJ(false);
            }
        }
    };

    const handleSendInvite = async () => {
        if (!cnpj || !email || !nomeFantasia) {
            setSaveError('Preencha todos os campos obrigatórios');
            return;
        }

        setSaving(true);
        setSaveError('');

        try {
            const cleanedCnpj = cnpj.replace(/\D/g, '');

            // Check if company already exists
            const { data: existing } = await supabase
                .from('companies')
                .select('id')
                .eq('cnpj', cleanedCnpj)
                .single();

            if (existing) {
                // Update to Partners plan
                await supabase
                    .from('companies')
                    .update({ plan: 'Partners' })
                    .eq('id', existing.id);
            } else {
                // Create new company
                const { error } = await supabase
                    .from('companies')
                    .insert({
                        cnpj: cleanedCnpj,
                        name: nomeFantasia,
                        email: email,
                        phone: phone,
                        address: endereco,
                        plan: 'Partners',
                        status: 'Pendente'
                    });

                if (error) throw error;
            }

            // Generate invite link
            const generatedLink = `https://auraalmoxarifado.com.br/registro?cnpj=${cleanedCnpj}&email=${encodeURIComponent(email)}`;
            setInviteLink(generatedLink);

            // Re-fetch list to be safe, though it shouldn't show the pending one
            fetchPartners();
        } catch (err: any) {
            console.error("Error:", err);
            setSaveError(err.message || 'Erro ao criar parceiro');
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setCnpj('');
        setEmail('');
        setNomeFantasia('');
        setEndereco('');
        setPhone('');
        setCnpjError('');
        setSaveError('');
        setInviteLink('');
    };

    const filteredPartners = partners.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cnpj?.includes(searchTerm)
    );

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
                            <Handshake size={24} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">
                            Partners
                        </h2>
                    </div>
                    <p className="text-slate-500 dark:text-gray-400 font-medium">
                        Gestão de empresas parceiras com acesso ilimitado.
                    </p>
                </div>

                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar parceiro..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-12 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all w-64"
                        />
                    </div>

                    <button
                        onClick={fetchPartners}
                        className="p-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-500/10 transition-all"
                    >
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>

                    {/* View Toggle */}
                    <div className="flex items-center bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2.5 transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-blue-500'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2.5 transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-blue-500'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>

                    <button
                        onClick={() => { setShowModal(true); resetForm(); }}
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl font-bold text-sm hover:from-blue-500 hover:to-indigo-600 transition-all flex items-center space-x-2 shadow-lg shadow-blue-900/30"
                    >
                        <Plus size={18} />
                        <span>Novo Parceiro</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white dark:bg-[#0A0D14] p-5 rounded-2xl border border-slate-200 dark:border-white/5">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{partners.length}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Parceiros</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#0A0D14] p-5 rounded-2xl border border-slate-200 dark:border-white/5">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
                            <Users size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">
                                {partners.reduce((acc, p) => acc + (p.users_count || 0), 0)}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Usuários</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#0A0D14] p-5 rounded-2xl border border-slate-200 dark:border-white/5">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500">
                            <Package size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">
                                {partners.reduce((acc, p) => acc + (p.products_count || 0), 0).toLocaleString()}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Produtos</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#0A0D14] p-5 rounded-2xl border border-slate-200 dark:border-white/5">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-500">
                            <ArrowUpDown size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">
                                {partners.reduce((acc, p) => acc + (p.movements_total || 0), 0).toLocaleString()}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Movimentações</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#0A0D14] p-5 rounded-2xl border border-slate-200 dark:border-white/5">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-500">
                            <DollarSign size={20} />
                        </div>
                        <div>
                            <p className="text-xl font-black text-slate-900 dark:text-white">
                                R$ {(partners.reduce((acc, p) => acc + (p.total_value || 0), 0) / 1000).toFixed(0)}k
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Movim.</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#0A0D14] p-5 rounded-2xl border border-slate-200 dark:border-white/5">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-green-500/10 rounded-xl text-green-500">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <p className="text-xl font-black text-green-500">
                                R$ {(partners.reduce((acc, p) => acc + (p.economy_generated || 0), 0) / 1000).toFixed(0)}k
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Economia</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Partners Grid */}
            {loading ? (
                <div className="py-20 text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Carregando partners...</p>
                </div>
            ) : filteredPartners.length === 0 ? (
                <div className="py-20 text-center bg-white dark:bg-[#0A0D14] rounded-3xl border border-slate-200 dark:border-white/5">
                    <div className="p-4 bg-blue-500/10 rounded-full w-fit mx-auto mb-4">
                        <Handshake size={32} className="text-blue-500" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Nenhum Parceiro</h3>
                    <p className="text-sm text-slate-500 mb-6">Adicione seu primeiro parceiro clicando no botão acima.</p>
                </div>
            ) : (
                <>
                    {/* Grid View */}
                    {viewMode === 'grid' && (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                            {filteredPartners.map((partner) => (
                                <div
                                    key={partner.id}
                                    className="bg-white dark:bg-[#0A0D14] rounded-3xl p-6 border border-slate-200 dark:border-white/5 hover:border-amber-500/30 transition-all group"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center space-x-4">
                                            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-lg shadow-blue-900/20">
                                                <Building2 size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors uppercase tracking-tight">
                                                    {partner.name}
                                                </h3>
                                                <p className="text-[10px] text-slate-500 font-mono tracking-wider">{partner.cnpj}</p>
                                            </div>
                                        </div>
                                        <div className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                                            Partner
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                        <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl text-center">
                                            <p className="text-xl font-black text-slate-900 dark:text-white">{partner.users_count || 0}</p>
                                            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Usuários</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl text-center">
                                            <p className="text-xl font-black text-slate-900 dark:text-white">{partner.products_count?.toLocaleString() || 0}</p>
                                            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Produtos</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl text-center">
                                            <p className="text-xl font-black text-slate-900 dark:text-white">{partner.movements_total?.toLocaleString() || 0}</p>
                                            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Movimentações</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                                        <div className="flex items-center space-x-4 text-xs text-slate-500">
                                            <div className="flex items-center space-x-1">
                                                <Mail size={12} className="text-blue-500" />
                                                <span>{partner.email || '-'}</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <Calendar size={12} className="text-blue-500" />
                                                <span>{formatDate(partner.created_at)}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setSelectedPartner(partner); setShowDetailsModal(true); }}
                                            className="px-4 py-2 bg-blue-500/10 text-blue-500 rounded-xl font-bold text-xs hover:bg-blue-600 hover:text-white transition-all flex items-center space-x-2"
                                        >
                                            <Eye size={14} />
                                            <span>Ver Empresa</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* List View */}
                    {viewMode === 'list' && (
                        <div className="bg-white dark:bg-[#0A0D14] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-white/5">
                                        <th className="text-left px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Empresa</th>
                                        <th className="text-center px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Usuários</th>
                                        <th className="text-center px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Produtos</th>
                                        <th className="text-center px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Movim.</th>
                                        <th className="text-center px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Entrada R$</th>
                                        <th className="text-center px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Saída R$</th>
                                        <th className="text-right px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPartners.map((partner, index) => (
                                        <tr
                                            key={partner.id}
                                            className={`border-b border-slate-50 dark:border-white/5 hover:bg-amber-500/5 transition-all ${index === filteredPartners.length - 1 ? 'border-b-0' : ''}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl text-white">
                                                        <Building2 size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-900 dark:text-white">{partner.name}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono">{partner.cnpj}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-center px-4 py-4">
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">{partner.users_count || 0}</span>
                                            </td>
                                            <td className="text-center px-4 py-4">
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">{partner.products_count?.toLocaleString() || 0}</span>
                                            </td>
                                            <td className="text-center px-4 py-4">
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">{partner.movements_total?.toLocaleString() || 0}</span>
                                            </td>
                                            <td className="text-center px-4 py-4">
                                                <span className="text-sm font-bold text-emerald-500">
                                                    R$ {(partner.entry_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="text-center px-4 py-4">
                                                <span className="text-sm font-bold text-red-500">
                                                    R$ {(partner.exit_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="text-right px-6 py-4">
                                                <button
                                                    onClick={() => { setSelectedPartner(partner); setShowDetailsModal(true); }}
                                                    className="px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-lg font-bold text-xs hover:bg-blue-600 hover:text-white transition-all flex items-center space-x-1 ml-auto"
                                                >
                                                    <Eye size={12} />
                                                    <span>Ver</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* New Partner Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#05070A]/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#0F172A] w-full max-w-lg rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl text-white">
                                    <Handshake size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Novo Parceiro</h3>
                                    <p className="text-[10px] text-slate-500">Convide uma empresa para ser Partner</p>
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
                        <div className="p-6 space-y-4">
                            {inviteLink ? (
                                <div className="space-y-4 animate-in zoom-in-95 duration-300">
                                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                                        <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-emerald-900/20">
                                            <CheckCircle2 size={24} />
                                        </div>
                                        <h4 className="text-lg font-black text-emerald-500 uppercase tracking-tight mb-1">Convite Gerado!</h4>
                                        <p className="text-xs text-slate-500 font-medium">Copie o link abaixo e envie para o parceiro concluir o cadastro.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">Link de Convite</label>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                readOnly
                                                value={inviteLink}
                                                className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-xs font-mono text-blue-500"
                                            />
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(inviteLink);
                                                    alert('Link copiado!');
                                                }}
                                                className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all"
                                                title="Copiar Link"
                                            >
                                                <ExternalLink size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => { setShowModal(false); resetForm(); }}
                                        className="w-full py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                                    >
                                        Fechar
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* CNPJ Field */}
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">
                                            CNPJ da Empresa
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={cnpj}
                                                onChange={(e) => handleCNPJChange(e.target.value)}
                                                placeholder="00.000.000/0000-00"
                                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            />
                                            {fetchingCNPJ && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                    <Loader2 size={18} className="animate-spin text-blue-500" />
                                                </div>
                                            )}
                                        </div>
                                        {cnpjError && (
                                            <p className="text-xs text-red-500 mt-1 flex items-center space-x-1">
                                                <AlertTriangle size={12} />
                                                <span>{cnpjError}</span>
                                            </p>
                                        )}
                                    </div>

                                    {/* Auto-filled fields */}
                                    {nomeFantasia && (
                                        <>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">
                                                    Nome Fantasia
                                                </label>
                                                <div className="flex items-center space-x-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                                    <CheckCircle2 size={16} className="text-emerald-500" />
                                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{nomeFantasia}</span>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">
                                                    Endereço
                                                </label>
                                                <div className="flex items-start space-x-2 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
                                                    <MapPin size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
                                                    <span className="text-sm text-slate-600 dark:text-slate-300">{endereco}</span>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Email Field */}
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">
                                            E-mail do Responsável
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="email@empresa.com.br"
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        />
                                    </div>

                                    {saveError && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-2">
                                            <AlertTriangle size={16} className="text-red-500" />
                                            <span className="text-xs font-bold text-red-500">{saveError}</span>
                                        </div>
                                    )}

                                    {/* Modal Footer */}
                                    <div className="pt-4 flex space-x-3">
                                        <button
                                            onClick={() => setShowModal(false)}
                                            className="flex-1 px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white font-bold text-sm hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleSendInvite}
                                            disabled={saving || !cnpj || !email || !nomeFantasia}
                                            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold text-sm hover:from-blue-500 hover:to-indigo-600 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {saving ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                <>
                                                    <Send size={18} />
                                                    <span>Gerar Convite</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Partner Details Modal */}
            {showDetailsModal && selectedPartner && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#05070A]/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#0F172A] w-full max-w-2xl rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-white/5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white">
                                        <Building2 size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                            {selectedPartner.name}
                                        </h3>
                                        <p className="text-[10px] text-slate-500 font-mono">{selectedPartner.cnpj}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-slate-500">
                                <div className="flex items-center space-x-1">
                                    <Mail size={12} />
                                    <span>{selectedPartner.email}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <MapPin size={12} />
                                    <span className="truncate max-w-[200px]">{selectedPartner.address || '-'}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <Calendar size={12} />
                                    <span>Desde: {formatDate(selectedPartner.created_at)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6">
                            {/* Financial Stats Grid */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <div className="p-2 bg-emerald-500/20 rounded-xl">
                                            <ArrowDownLeft size={20} className="text-emerald-500" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Entrada R$</span>
                                    </div>
                                    <p className="text-2xl font-black text-emerald-500">
                                        R$ {(selectedPartner.entry_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>

                                <div className="bg-red-500/10 p-5 rounded-2xl border border-red-500/20">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <div className="p-2 bg-red-500/20 rounded-xl">
                                            <ArrowUpRight size={20} className="text-red-500" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Saída R$</span>
                                    </div>
                                    <p className="text-2xl font-black text-red-500">
                                        R$ {(selectedPartner.exit_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>

                                <div className="bg-blue-500/10 p-5 rounded-2xl border border-blue-500/20">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <div className="p-2 bg-blue-500/20 rounded-xl">
                                            <TrendingUp size={20} className="text-blue-500" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Média Mensal Entrada</span>
                                    </div>
                                    <p className="text-2xl font-black text-blue-500">
                                        R$ {(selectedPartner.monthly_entry_avg || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>

                                <div className="bg-orange-500/10 p-5 rounded-2xl border border-orange-500/20">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <div className="p-2 bg-orange-500/20 rounded-xl">
                                            <TrendingUp size={20} className="text-orange-500 rotate-180" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">Média Mensal Saída</span>
                                    </div>
                                    <p className="text-2xl font-black text-orange-500">
                                        R$ {(selectedPartner.monthly_exit_avg || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            {/* Summary Stats */}
                            <div className="grid grid-cols-4 gap-3">
                                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl text-center">
                                    <p className="text-2xl font-black text-slate-900 dark:text-white">{selectedPartner.users_count || 0}</p>
                                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Usuários</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl text-center">
                                    <p className="text-2xl font-black text-slate-900 dark:text-white">{selectedPartner.products_count?.toLocaleString() || 0}</p>
                                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Produtos</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl text-center">
                                    <p className="text-2xl font-black text-slate-900 dark:text-white">{selectedPartner.movements_total?.toLocaleString() || 0}</p>
                                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Movimentações</p>
                                </div>
                                <div className="bg-green-500/10 p-4 rounded-xl text-center border border-green-500/20">
                                    <p className="text-2xl font-black text-green-500">
                                        R$ {((selectedPartner.economy_generated || 0) / 1000).toFixed(0)}k
                                    </p>
                                    <p className="text-[9px] text-green-500 uppercase tracking-widest font-bold">Economia</p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-100 dark:border-white/5">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-sm hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-orange-900/30"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
