
import React, { useState, useEffect } from 'react';
import {
    Layers,
    Search,
    Edit3,
    Users,
    Package,
    CheckSquare,
    Square,
    X,
    Save,
    AlertCircle,
    CheckCircle2,
    Zap,
    RefreshCcw,
    Settings2,
    ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Plan {
    id: string;
    name: string;
    value: number;
    external_id: string;
    status: 'active' | 'inactive';
    description?: string;
}

interface PlanLimits {
    id?: string;
    plan_id: string;
    max_users: number;
    max_products: number;
    allowed_modules: string[];
}

// Módulos padrão - sempre incluídos em todos os planos
const STANDARD_MODULES = [
    { id: 'visao_geral', label: 'Visão Geral', description: 'Dashboard principal' },
    { id: 'produtos', label: 'Produtos', description: 'Catálogo de produtos' },
    { id: 'fornecedores', label: 'Fornecedores', description: 'Gestão de fornecedores' },
    { id: 'estoque', label: 'Estoque', description: 'Controle de inventário' },
    { id: 'movimentacoes', label: 'Movimentações', description: 'Entradas e saídas' },
    { id: 'suporte', label: 'Suporte', description: 'Central de ajuda' },
];

// Módulos premium - configuráveis por plano
const PREMIUM_MODULES = [
    { id: 'setores', label: 'Setores', description: 'Gestão de setores' },
    { id: 'compras', label: 'Compras', description: 'Gestão de compras' },
    { id: 'relatorios', label: 'Relatórios', description: 'Relatórios avançados' },
    { id: 'otimizacao', label: 'Otimização', description: 'Recursos de IA' },
    { id: 'planilhas', label: 'Planilhas', description: 'Importação/Exportação' },
    { id: 'aura_ia', label: 'Aura IA', description: 'Inteligência Artificial avançada' },
    { id: 'alertas', label: 'Alertas e Avisos', description: 'Notificações e monitoramento' },
];

// Todos os módulos para referência
const ALL_MODULES = [...STANDARD_MODULES, ...PREMIUM_MODULES];

export const PlansView: React.FC = () => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [planLimits, setPlanLimits] = useState<Map<string, PlanLimits>>(new Map());
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
    const [editingLimits, setEditingLimits] = useState<PlanLimits | null>(null);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            setLoading(true);

            // Fetch plans
            const { data: plansData, error: plansError } = await supabase
                .from('plans')
                .select('*')
                .order('value', { ascending: true });

            if (plansError) throw plansError;

            if (plansData) {
                setPlans(plansData.map(p => ({
                    id: p.id,
                    name: p.name,
                    value: Number(p.value),
                    external_id: p.external_id || '',
                    status: p.status || 'active',
                    description: p.description
                })));

                // Fetch limits for all plans
                const { data: limitsData, error: limitsError } = await supabase
                    .from('plan_limits')
                    .select('*');

                if (limitsError) throw limitsError;

                if (limitsData) {
                    const limitsMap = new Map<string, PlanLimits>();
                    limitsData.forEach(l => {
                        limitsMap.set(l.plan_id, {
                            id: l.id,
                            plan_id: l.plan_id,
                            max_users: l.max_users,
                            max_products: l.max_products,
                            allowed_modules: l.allowed_modules || []
                        });
                    });
                    setPlanLimits(limitsMap);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar planos:', error);
            notify('error', 'Erro ao carregar planos');
        } finally {
            setLoading(false);
        }
    };

    const notify = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleEditPlan = (plan: Plan) => {
        const limits = planLimits.get(plan.id) || {
            plan_id: plan.id,
            max_users: 5,
            max_products: 100,
            allowed_modules: []
        };
        setEditingPlan(plan);
        setEditingLimits({ ...limits });
    };

    const handleModuleToggle = (moduleId: string) => {
        if (!editingLimits) return;

        const modules = [...editingLimits.allowed_modules];
        const index = modules.indexOf(moduleId);

        if (index >= 0) {
            modules.splice(index, 1);
        } else {
            modules.push(moduleId);
        }

        setEditingLimits({ ...editingLimits, allowed_modules: modules });
    };

    const handleSave = async () => {
        if (!editingPlan || !editingLimits) return;

        try {
            setSaving(true);

            const existingLimits = planLimits.get(editingPlan.id);

            if (existingLimits?.id) {
                // Update existing
                const { error } = await supabase
                    .from('plan_limits')
                    .update({
                        max_users: editingLimits.max_users,
                        max_products: editingLimits.max_products,
                        allowed_modules: editingLimits.allowed_modules
                    })
                    .eq('id', existingLimits.id);

                if (error) throw error;
            } else {
                // Insert new
                const { error } = await supabase
                    .from('plan_limits')
                    .insert({
                        plan_id: editingPlan.id,
                        max_users: editingLimits.max_users,
                        max_products: editingLimits.max_products,
                        allowed_modules: editingLimits.allowed_modules
                    });

                if (error) throw error;
            }

            notify('success', `Limites do ${editingPlan.name} salvos com sucesso!`);
            setEditingPlan(null);
            setEditingLimits(null);
            fetchPlans();
        } catch (error) {
            console.error('Erro ao salvar:', error);
            notify('error', 'Erro ao salvar limites');
        } finally {
            setSaving(false);
        }
    };

    const filteredPlans = plans.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.external_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-12">
            {/* Toast Notification */}
            {notification && (
                <div className={`fixed top-8 right-8 z-[150] px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 flex items-center space-x-3 font-bold border ${notification.type === 'success'
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-red-600 text-white border-red-400'
                    }`}>
                    {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span>{notification.message}</span>
                </div>
            )}

            {/* Edit Modal */}
            {editingPlan && editingLimits && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#05070A]/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#0F172A] w-full max-w-xl max-h-[85vh] rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-600/10 text-blue-500 rounded-xl">
                                    <Settings2 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white">{editingPlan.name}</h3>
                                    <p className="text-[10px] text-slate-500 font-medium">ID Cakto: {editingPlan.external_id}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setEditingPlan(null); setEditingLimits(null); }}
                                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 space-y-4 overflow-y-auto flex-1">
                            {/* Limits Section */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                    <label className="flex items-center space-x-2 text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">
                                        <Users size={12} />
                                        <span>Máx. Usuários</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={editingLimits.max_users}
                                        onChange={(e) => setEditingLimits({ ...editingLimits, max_users: parseInt(e.target.value) || 1 })}
                                        className="w-full bg-white dark:bg-[#0A0D14] border border-slate-200 dark:border-white/10 rounded-lg py-2 px-3 text-base font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                    <label className="flex items-center space-x-2 text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">
                                        <Package size={12} />
                                        <span>Máx. Produtos</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={editingLimits.max_products}
                                        onChange={(e) => setEditingLimits({ ...editingLimits, max_products: parseInt(e.target.value) || 1 })}
                                        className="w-full bg-white dark:bg-[#0A0D14] border border-slate-200 dark:border-white/10 rounded-lg py-2 px-3 text-base font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    />
                                </div>
                            </div>

                            {/* Modules Section */}
                            <div>
                                {/* Standard Modules - Always Included */}
                                <h4 className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">
                                    Padrão <span className="text-emerald-500">(Sempre incluídos)</span>
                                </h4>
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                    {STANDARD_MODULES.map(module => (
                                        <div
                                            key={module.id}
                                            className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center space-x-1"
                                        >
                                            <CheckSquare size={10} className="flex-shrink-0" />
                                            <span className="font-bold text-[10px]">{module.label}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Premium Modules - Configurable */}
                                <h4 className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-2">
                                    Premium <span className="text-blue-500">(Configuráveis)</span>
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {PREMIUM_MODULES.map(module => {
                                        const isSelected = editingLimits.allowed_modules.includes(module.id);
                                        return (
                                            <button
                                                key={module.id}
                                                onClick={() => handleModuleToggle(module.id)}
                                                className={`p-2.5 rounded-xl border text-left transition-all ${isSelected
                                                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-500'
                                                    : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-500 hover:border-blue-500/20'
                                                    }`}
                                            >
                                                <div className="flex items-center space-x-2">
                                                    {isSelected ? (
                                                        <CheckSquare size={14} className="flex-shrink-0" />
                                                    ) : (
                                                        <Square size={14} className="flex-shrink-0" />
                                                    )}
                                                    <span className={`font-bold text-xs ${isSelected ? 'text-blue-500' : 'text-slate-900 dark:text-white'}`}>
                                                        {module.label}
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-100 dark:border-white/5 flex justify-end space-x-2">
                            <button
                                onClick={() => { setEditingPlan(null); setEditingLimits(null); }}
                                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white font-bold text-xs hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/30 flex items-center space-x-2 disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <RefreshCcw size={16} className="animate-spin" />
                                        <span>Salvando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} />
                                        <span>Salvar Limites</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Planos</h2>
                    <p className="text-slate-500 dark:text-gray-400 font-medium">Personalize os limites e módulos de cada assinatura Aura.</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={fetchPlans}
                        className="bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white px-6 py-3 rounded-xl font-bold transition-all text-sm flex items-center space-x-2 border border-slate-200 dark:border-white/5"
                    >
                        <RefreshCcw size={16} />
                        <span>Atualizar</span>
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Buscar plano..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white dark:bg-[#0A0D14] border border-slate-200 dark:border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-slate-400"
                />
            </div>

            {/* Plans Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredPlans.map(plan => {
                        const limits = planLimits.get(plan.id);
                        const hasLimits = !!limits;

                        return (
                            <div
                                key={plan.id}
                                className="bg-white dark:bg-[#0A0D14] rounded-3xl border border-slate-200 dark:border-white/5 p-4 hover:border-blue-500/30 transition-all group shadow-lg"
                            >
                                {/* Plan Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3 rounded-2xl text-white shadow-lg ${plan.external_id === 'partners-exclusive'
                                        ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-orange-900/30'
                                        : 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-900/30'
                                        }`}>
                                        <Zap size={18} />
                                    </div>
                                    <div className="flex flex-col items-end space-y-1">
                                        {plan.external_id === 'partners-exclusive' && (
                                            <div className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                                                Exclusivo
                                            </div>
                                        )}
                                        <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${plan.status === 'active'
                                            ? 'bg-emerald-500/10 text-emerald-500'
                                            : 'bg-slate-500/10 text-slate-500'
                                            }`}>
                                            {plan.status === 'active' ? 'Ativo' : 'Inativo'}
                                        </div>
                                    </div>
                                </div>

                                {/* Plan Info */}
                                <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">{plan.name}</h3>
                                <p className={`text-xl font-black mb-1 ${plan.external_id === 'partners-exclusive'
                                    ? 'text-amber-500'
                                    : 'text-blue-600 dark:text-blue-400'
                                    }`}>
                                    {plan.value === 0 ? 'Grátis' : `R$ ${plan.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                    {plan.value > 0 && <span className="text-[10px] text-slate-500 font-medium">/mês</span>}
                                </p>

                                {/* Cakto ID */}
                                <div className="flex items-center space-x-1 text-[10px] text-slate-400 mb-4">
                                    <ExternalLink size={12} />
                                    <span className="font-mono">{plan.external_id === 'partners-exclusive' ? 'Plano Interno' : plan.external_id}</span>
                                </div>

                                {/* Limits Preview */}
                                {hasLimits ? (
                                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 mb-4">
                                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                                            <div>
                                                <span className="text-slate-400 uppercase tracking-wide">Usuários</span>
                                                <p className={`font-black ${limits.max_users === -1 ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                                                    {limits.max_users === -1 ? '∞ Ilimitado' : limits.max_users}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 uppercase tracking-wide">Produtos</span>
                                                <p className={`font-black ${limits.max_products === -1 ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                                                    {limits.max_products === -1 ? '∞ Ilimitado' : limits.max_products}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                                            <span className="text-slate-400 uppercase tracking-wide text-[9px]">Módulos Premium</span>
                                            <p className="font-bold text-slate-700 dark:text-slate-300 text-[10px]">
                                                {limits.allowed_modules.length > 0
                                                    ? limits.allowed_modules.map(m => PREMIUM_MODULES.find(am => am.id === m)?.label || m).join(', ')
                                                    : 'Nenhum configurado'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20 mb-4 flex items-center space-x-2">
                                        <AlertCircle size={14} className="text-yellow-500" />
                                        <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-500">Sem limites configurados</span>
                                    </div>
                                )}

                                {/* Action Button */}
                                <button
                                    onClick={() => handleEditPlan(plan)}
                                    className="w-full py-3 px-4 bg-slate-100 dark:bg-white/5 hover:bg-blue-600 text-slate-700 dark:text-white hover:text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-2 group-hover:bg-blue-600 group-hover:text-white"
                                >
                                    <Edit3 size={14} />
                                    <span>{hasLimits ? 'Editar Limites' : 'Configurar'}</span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredPlans.length === 0 && (
                <div className="text-center py-20">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Layers size={24} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Nenhum plano encontrado</h3>
                    <p className="text-sm text-slate-500">Tente ajustar sua busca ou sincronize os planos com a Cakto.</p>
                </div>
            )}

        </div>
    );
};
