
import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Download,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Users,
  BarChart3,
  Calendar,
  Filter,
  ArrowRight,
  X,
  Plus,
  Tag,
  Info,
  RefreshCcw,
  Loader2,
  TrendingUp,
  Save,
  Calculator,
  Layers,
  Check,
  Repeat,
  Target as TargetIcon,
  CalendarDays,
  Palette,
  Trash2,
  ChevronDown,
  Sparkles,
  Archive,
  Package,
  XCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type FinanceTab = 'receita' | 'despesas' | 'cac';

interface Invoice {
  id: string;
  company_id: string;
  amount: number;
  billing_date: string;
  due_date?: string;
  status: string;
  companies?: { name: string };
}

interface Expense {
  id: string;
  name: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  status: string;
  recurrence: string;
  billing_day?: number;
  is_cac: boolean;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

export const FinanceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FinanceTab>('receita');
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    pendingRevenue: 0,
    overdueRevenue: 0,
    totalExpenses: 0,
    cloudTech: 0,
    marketing: 0,
    cac: 0,
    ltvCac: 0,
    payback: 0,
    conversion: 0,
    activeCompanies: 0
  });
  const [userProfile, setUserProfile] = useState<{ name: string, role: string } | null>(null);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      // Helper to safely fetch data with fallback
      const safeFetch = async (promise: any, fallbackValue: any) => {
        try {
          const { data, error, count } = await promise;
          if (error) throw error;
          return { data, count };
        } catch (err) {
          console.warn("Fetch error, using fallback:", err);
          return { data: fallbackValue, count: 0 };
        }
      };

      // Fetch active companies (try with filter first, then all if status column missing)
      let activeCompaniesCount = 0;
      try {
        const { count, error } = await supabase.from('companies').select('id', { count: 'exact' }).eq('status', 'Ativo');
        if (error) throw error;
        activeCompaniesCount = count || 0;
      } catch (err) {
        // Fallback: count all companies if status column is missing or other error
        const { count } = await supabase.from('companies').select('id', { count: 'exact' });
        activeCompaniesCount = count || 0;
      }

      const [invRes, expRes, catRes] = await Promise.all([
        safeFetch(supabase.from('invoices').select('*, companies(name)').order('billing_date', { ascending: false }), []),
        safeFetch(supabase.from('expenses').select('*').order('date', { ascending: false }), []),
        safeFetch(supabase.from('expense_categories').select('*').order('name'), [])
      ]);

      const invData = invRes.data || [];

      const localCats = JSON.parse(localStorage.getItem('aura_categories') || '[]');
      const dbCats = catRes.data || [];
      const combinedCats = [...dbCats, ...localCats.filter((lc: Category) => !dbCats.some((dc: Category) => dc.name.toLowerCase() === lc.name.toLowerCase()))];

      const localExpenses = JSON.parse(localStorage.getItem('aura_expenses') || '[]');
      const dbExpenses = expRes.data || [];
      // Combine DB and Local expenses (simple merge, assuming IDs are unique enough or just appending)
      const combinedExpenses = [...dbExpenses, ...localExpenses.filter((le: Expense) => !dbExpenses.some((de: Expense) => de.id === le.id))];

      setInvoices(invData);
      setExpenses(combinedExpenses);
      setCategories(combinedCats);

      const revenue = invData.filter(i => i.status === 'paid').reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
      const pending = invData.filter(i => i.status === 'open').reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
      const overdue = invData.filter(i => i.status === 'overdue').reduce((acc, i) => acc + (Number(i.amount) || 0), 0);

      const totalExp = combinedExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
      const cloud = combinedExpenses.filter(e => e.category?.toLowerCase() === 'infraestrutura' || e.category?.toLowerCase() === 'saas').reduce((acc, e) => acc + (e.amount || 0), 0);

      const mktSpend = combinedExpenses
        .filter(e => e.is_cac === true)
        .reduce((acc, e) => acc + (e.amount || 0), 0);

      const calculatedCac = activeCompaniesCount > 0 ? mktSpend / activeCompaniesCount : 0;
      const arpu = activeCompaniesCount > 0 ? revenue / activeCompaniesCount : 0;
      const ltv = arpu * 24;
      const ltvCacRatio = calculatedCac > 0 ? ltv / calculatedCac : 0;
      const paybackMonths = arpu > 0 ? calculatedCac / arpu : 0;

      setMetrics({
        totalRevenue: revenue,
        pendingRevenue: pending,
        overdueRevenue: overdue,
        totalExpenses: totalExp,
        cloudTech: cloud,
        marketing: mktSpend,
        cac: calculatedCac,
        ltvCac: ltvCacRatio,
        payback: paybackMonths,
        conversion: 3.8,
        activeCompanies: activeCompaniesCount
      });
    } catch (err) {
      console.error("Erro ao sincronizar dados financeiros:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Prioridade 1: Buscar do perfil público (tabela profiles) pois é mais atualizável
        let name = null;
        let role = null;

        const { data: profile } = await supabase
          .from('profiles')
          .select('name, role')
          .eq('id', user.id)
          .single();

        if (profile) {
          name = profile.name;
          role = profile.role;
        }

        // Prioridade 2: Metadados do Auth se profile falhar
        if (!name) {
          name = user.user_metadata?.name;
          role = user.user_metadata?.role;
        }

        // Prioridade 3: Email como fallback temporário se não houver nome
        if (!name && user.email) {
          name = user.email.split('@')[0];
        }

        setUserProfile({
          name: name || 'Usuário Backoffice',
          role: role || 'ADMIN'
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  useEffect(() => {
    fetchFinanceData();
    fetchUserProfile();
  }, []);

  const createAuditLog = async (action: string, details: string, type: 'info' | 'success' | 'warning' | 'critical' = 'info') => {
    let currentName = userProfile?.name;
    let currentRole = userProfile?.role;

    // Fallback de segurança: Busca dados do usuário se o estado estiver vazio
    if (!currentName) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Tenta buscar do profile primeiro
          const { data: profile } = await supabase.from('profiles').select('name, role').eq('id', user.id).single();
          if (profile) {
            currentName = profile.name;
            currentRole = profile.role;
          }

          // Se não achar, tenta metadata
          if (!currentName) {
            currentName = user.user_metadata?.name;
            currentRole = user.user_metadata?.role;
          }
        }
      } catch (e) {
        console.error("Erro ao recuperar usuário para log:", e);
      }
    }

    await supabase.from('activity_logs').insert([{
      user_name: currentName || 'Usuário Backoffice',
      user_role: currentRole || 'MASTER_ADMIN',
      action,
      details,
      module: 'FINANCE',
      type,
      timestamp: new Date().toISOString()
    }]);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-700 pb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-1 tracking-tight uppercase italic leading-none">Gestão Financeira</h2>
          <p className="text-slate-500 dark:text-gray-400 font-medium tracking-tight uppercase tracking-widest text-[9px]">Análise de custos e segmentação de investimentos AURA.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchFinanceData}
            className="p-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-blue-500 hover:bg-blue-600/10 transition-all flex items-center shadow-sm"
          >
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/5 shadow-inner">
            <TabButton active={activeTab === 'receita'} onClick={() => setActiveTab('receita')} label="Receita" />
            <TabButton active={activeTab === 'despesas'} onClick={() => setActiveTab('despesas')} label="Despesas" />
            <TabButton active={activeTab === 'cac'} onClick={() => setActiveTab('cac')} label="CAC & Métricas" />
          </div>
        </div>
      </div>

      {activeTab === 'receita' && <ReceitaSection metrics={metrics} invoices={invoices} />}
      {activeTab === 'despesas' && <DespesasSection metrics={metrics} expenses={expenses} categories={categories} setCategories={setCategories} onRefresh={fetchFinanceData} onLog={createAuditLog} />}
      {activeTab === 'cac' && <CACSection metrics={metrics} />}
    </div>
  );
};

const TabButton: React.FC<{ active: boolean, onClick: () => void, label: string }> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${active
      ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-lg shadow-blue-900/10'
      : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
      }`}
  >
    {label}
  </button>
);

const ReceitaSection: React.FC<{ metrics: any, invoices: Invoice[] }> = ({ metrics, invoices }) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'open' | 'overdue' | 'canceled'>('all');

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const isOverdue = inv.status === 'open' && inv.due_date && new Date(inv.due_date) < new Date();
      const status = isOverdue ? 'overdue' : inv.status;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'canceled') return ['void', 'uncollectible', 'canceled'].includes(status);
      return status === statusFilter;
    });
  }, [invoices, statusFilter]);

  return (
    <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatBox title="Receita Total" value={`R$ ${metrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} trend="+12%" positive />
        <StatBox title="A Receber" value={`R$ ${metrics.pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} sub="Faturas pendentes" />
        <StatBox title="Atrasado" value={`R$ ${metrics.overdueRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} sub="Risco de Churn" warning />
      </div>

      <div className="bg-white dark:bg-[#0A0D14] rounded-3xl border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight italic leading-none">Fluxo de Faturamento Real</h3>
            <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/5">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${statusFilter === 'all' ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter('open')}
                className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${statusFilter === 'open' ? 'bg-white dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Pendentes
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${statusFilter === 'paid' ? 'bg-white dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Confirmados
              </button>
              <button
                onClick={() => setStatusFilter('overdue')}
                className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${statusFilter === 'overdue' ? 'bg-white dark:bg-red-500/20 text-red-600 dark:text-red-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Atrasados
              </button>
              <button
                onClick={() => setStatusFilter('canceled')}
                className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${statusFilter === 'canceled' ? 'bg-white dark:bg-slate-500/20 text-slate-600 dark:text-slate-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Cancelados
              </button>
            </div>
          </div>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-lg">Fonte: Table 'invoices'</span>
        </div>
        <div className="p-2 space-y-1">
          {filteredInvoices.length > 0 ? filteredInvoices.map((inv) => {
            const isOverdue = inv.status === 'open' && inv.due_date && new Date(inv.due_date) < new Date();
            const currentStatus = isOverdue ? 'overdue' : inv.status;

            return (
              <div key={inv.id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] rounded-2xl transition-all group border border-transparent hover:border-slate-200 dark:hover:border-white/5">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h5 className="font-black text-slate-900 dark:text-white text-sm">{inv.companies?.name || 'Empresa Aura'}</h5>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">#{inv.id.substring(0, 8)} • {inv.billing_date ? new Date(inv.billing_date).toLocaleDateString('pt-BR') : 'N/A'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900 dark:text-white text-base leading-none mb-1">R$ {inv.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <StatusBadge status={currentStatus} />
                </div>
              </div>
            );
          }) : (
            <div className="py-20 text-center opacity-50">
              <FileText size={48} className="mx-auto mb-4 text-slate-600" />
              <p className="text-xs font-black uppercase tracking-widest">Nenhuma fatura encontrada nesta categoria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DespesasSection: React.FC<{ metrics: any, expenses: Expense[], categories: Category[], setCategories: any, onRefresh: () => void, onLog: (a: string, d: string, t: any) => void }> = ({ metrics, expenses, categories, setCategories, onRefresh, onLog }) => {
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: '',
    recurrence: 'MENSAL',
    billing_day: '10',
    date: new Date().toISOString().split('T')[0],
    category: '',
    status: 'paid',
    is_cac: false
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    color: '#2563EB'
  });

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  const handleSaveExpense = async () => {
    if (!formData.name || !formData.amount) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const amountValue = parseFloat(formData.amount.replace('R$', '').replace('.', '').replace(',', '.').trim());

      const expenseData = {
        name: formData.name,
        description: formData.description,
        amount: amountValue,
        recurrence: formData.recurrence,
        billing_day: parseInt(formData.billing_day),
        date: formData.date,
        category: formData.category,
        status: formData.status,
        is_cac: formData.is_cac
      };

      let error;

      if (editingExpenseId) {
        // Update existing expense
        const { error: updateError } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpenseId);
        error = updateError;

        if (!error) {
          onLog('Despesa Atualizada', `Despesa ${formData.name} foi atualizada.`, 'info');
        }
      } else {
        // Create new expense
        const { error: insertError } = await supabase
          .from('expenses')
          .insert([expenseData]);
        error = insertError;

        if (!error) {
          onLog('Nova Despesa', `Despesa ${formData.name} criada com valor de R$ ${amountValue}.`, 'success');
        }
      }

      if (error) throw error;

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsSaving(false);
        setShowModal(false);
        setEditingExpenseId(null);
        setFormData({
          name: '',
          description: '',
          amount: '',
          recurrence: 'MENSAL',
          billing_day: '10',
          date: new Date().toISOString().split('T')[0],
          category: '',
          status: 'Pago',
          is_cac: false
        });
        onRefresh();
      }, 1000);

    } catch (err: any) {
      console.error("Erro ao salvar despesa:", err);
      alert("Erro ao salvar: " + err.message);
      setIsSaving(false);
    }
  };

  const handleEditClick = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setFormData({
      name: expense.name,
      description: expense.description || '',
      amount: `R$ ${expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      recurrence: expense.recurrence || 'MENSAL',
      billing_day: expense.billing_day?.toString() || '10',
      date: expense.date,
      category: expense.category || '',
      status: expense.status || 'Pago',
      is_cac: expense.is_cac || false
    });
    setShowModal(true);
  };

  const handleDeleteClick = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir a despesa "${name}"?`)) {
      try {
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (error) throw error;
        onLog('Despesa Excluída', `Despesa ${name} foi removida.`, 'warning');
        onRefresh();
      } catch (err: any) {
        alert("Erro ao excluir: " + err.message);
      }
    }
  };


  const handleSaveCategory = async () => {
    if (!categoryFormData.name) return;
    const exists = categories.some(c => c.name.toLowerCase() === categoryFormData.name.toLowerCase());
    if (exists) {
      alert("Esta categoria já está cadastrada.");
      return;
    }
    setIsSaving(true);
    const tempId = `cat_${Math.random().toString(36).substring(2, 9)}`;
    const newCategory = { id: tempId, ...categoryFormData };
    try {
      await supabase.from('expense_categories').insert([newCategory]);
      const existingLocal = JSON.parse(localStorage.getItem('aura_categories') || '[]');
      localStorage.setItem('aura_categories', JSON.stringify([...existingLocal, newCategory]));
      setCategories((prev: Category[]) => [...prev, newCategory]);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setCategoryFormData({ name: '', color: '#2563EB' });
        setShowCategoryModal(false);
        onRefresh();
      }, 800);
    } catch (err) {
      console.error("Erro ao salvar:", err);
      setCategories((prev: Category[]) => [...prev, newCategory]);
      setSaveSuccess(true);
      setTimeout(() => { setShowCategoryModal(false); setSaveSuccess(false); }, 1000);
    } finally { setIsSaving(false); }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Deseja excluir a categoria ${name}?`)) return;
    try {
      await supabase.from('expense_categories').delete().eq('id', id);
      const existingLocal = JSON.parse(localStorage.getItem('aura_categories') || '[]');
      localStorage.setItem('aura_categories', JSON.stringify(existingLocal.filter((c: any) => c.id !== id)));
      setCategories((prev: Category[]) => prev.filter(c => c.id !== id));
      onRefresh();
    } catch (err) {
      alert("Erro ao excluir: " + (err as any).message);
    }
  };

  const formatCurrencyInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return 'R$ 0,00';
    const amount = parseInt(digits) / 100;
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value);
    setFormData({ ...formData, amount: formatted });
  };

  const presetColors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#64748B', '#06B6D4'];
  const recurrenceOptions = ['Única', 'MENSAL', 'TRIMESTRAL', 'ANUAL'];

  return (
    <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatBox title="Custo Operacional" value={`R$ ${metrics.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} sub="Soma total de saídas" />
        <StatBox title="Marketing Real (CAC)" value={`R$ ${metrics.marketing.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} sub="Soma de itens marcados como CAC" />
        <StatBox title="Tecnologia" value={`R$ ${metrics.cloudTech.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} sub="Infraestrutura SaaS" />
      </div>

      <div className="bg-white dark:bg-[#0A0D14] rounded-3xl border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/10 dark:bg-transparent">
          <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight italic leading-none">Extrato de Despesas</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCategoryModal(true)}
              className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center space-x-2 shadow-sm"
            >
              <Tag size={12} className="text-blue-500" />
              <span>Cadastrar Categoria</span>
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/30 transition-all flex items-center space-x-2"
            >
              <Plus size={12} strokeWidth={3} />
              <span>Novo Lançamento</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0F172A] border-b border-slate-200 dark:border-white/5">
                <th className="px-3 py-2 text-[9px] font-black uppercase text-slate-400 tracking-widest">Categoria</th>
                <th className="px-3 py-2 text-[9px] font-black uppercase text-slate-400 tracking-widest">Item</th>
                <th className="px-3 py-2 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Valor</th>
                <th className="px-3 py-2 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Métrica</th>
                <th className="px-3 py-2 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                  <td className="px-3 py-2">
                    <span className="bg-slate-100 dark:bg-white/5 text-[9px] font-black text-slate-500 px-2 py-1 rounded-lg uppercase border border-slate-200 dark:border-white/10 tracking-widest leading-none">{exp.category || 'Geral'}</span>
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-black text-slate-800 dark:text-white uppercase text-[10px] leading-tight">{exp.name}</p>
                    <p className="text-[8px] text-slate-500 italic mt-0.5">{exp.date} • {exp.recurrence}</p>
                  </td>
                  <td className="px-3 py-2 text-center font-black text-slate-900 dark:text-white text-xs">R$ {exp.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-center">
                    {exp.is_cac ? (
                      <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">CAC</span>
                    ) : (
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">OPEX</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <StatusBadge status={exp.status} />
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditClick(exp)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                          title="Editar Despesa"
                        >
                          <FileText size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(exp.id, exp.name)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Excluir Despesa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {expenses.length === 0 && (
            <div className="py-20 text-center opacity-30">
              <Package size={48} className="mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma despesa registrada.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL CADASTRAR CATEGORIA */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-[#05070A]/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#0A0D14] w-full max-w-md rounded-2xl p-5 shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/10 animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600/10 rounded-lg flex items-center justify-center text-blue-500 border border-blue-500/10">
                  <Tag size={16} />
                </div>
                <h3 className="text-base font-black text-white uppercase italic tracking-tighter leading-none">Cadastrar Categoria</h3>
              </div>
              <button onClick={() => setShowCategoryModal(false)} className="p-1 bg-white/5 rounded-md text-slate-400 hover:text-white transition-all shadow-md">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nome da Categoria</label>
                  <input
                    type="text"
                    placeholder="Ex: ADS, RH, INFRA..."
                    className="w-full bg-[#111827] border border-white/10 p-2 rounded-lg text-white font-black text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-600"
                    value={categoryFormData.name}
                    onChange={e => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                    <Palette size={12} className="text-blue-500" />
                    Selecione a Identidade Visual
                  </label>
                  <div className="grid grid-cols-8 gap-1.5">
                    {presetColors.map(color => (
                      <button
                        key={color}
                        onClick={() => setCategoryFormData({ ...categoryFormData, color })}
                        className={`h-6 rounded-md transition-all border-2 flex items-center justify-center ${categoryFormData.color === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        style={{ backgroundColor: color }}
                      >
                        {categoryFormData.color === color && <Check size={12} className="text-white" strokeWidth={4} />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setShowCategoryModal(false)} className="flex-1 py-2.5 text-[9px] font-black uppercase text-slate-500 hover:text-white transition-colors tracking-widest">Cancelar</button>
                  <button
                    onClick={handleSaveCategory}
                    disabled={isSaving || saveSuccess}
                    className={`flex-[2] py-2.5 rounded-lg text-[9px] font-black uppercase text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 tracking-[0.15em] ${saveSuccess ? 'bg-emerald-600 shadow-emerald-900/40' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/40'
                      }`}
                  >
                    {saveSuccess ? <CheckCircle2 size={14} /> : (isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />)}
                    <span>{saveSuccess ? 'Concluído!' : 'Salvar'}</span>
                  </button>
                </div>
              </div>
              <div className="space-y-3 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Archive size={10} className="text-blue-500" />
                    Categorias já cadastradas
                  </h4>
                  <span className="text-[8px] font-bold text-slate-600">{categories.length} Itens</span>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {categories.map((cat) => (
                    <div key={cat.id} className="bg-[#111827] border border-white/5 rounded-xl p-3 flex items-center justify-between group hover:border-blue-500/20 transition-all shadow-md">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-[10px] font-black text-white uppercase tracking-tight truncate leading-none">{cat.name}</span>
                      </div>
                      <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="p-1 text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={10} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO LANÇAMENTO FINANCEIRO (ULTRA COMPACTO) */}
      {showModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#05070A]/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#0A0D14] w-full max-w-md rounded-2xl p-5 shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/10 animate-in zoom-in-95 duration-300 relative overflow-hidden max-h-[95vh] overflow-y-auto custom-scrollbar">

            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
              <div>
                <h3 className="text-base font-black text-white uppercase italic tracking-tighter leading-none">Novo Lançamento</h3>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">Protocolo AURA</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 bg-white/5 rounded-md text-slate-400 hover:text-white transition-all shadow-md">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Nome e Valor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nome da despesa</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ex: Google ADS"
                      className="w-full bg-[#111827] border border-white/10 p-2 pl-8 rounded-lg text-white font-black text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-800"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                    <FileText size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Valor em R$</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="R$ 0,00"
                      className="w-full bg-[#111827] border border-white/10 p-2 rounded-lg text-white font-black text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-900"
                      value={formData.amount || 'R$ 0,00'}
                      onChange={handleAmountChange}
                    />
                  </div>
                </div>
              </div>

              {/* Descrição Detalhada */}
              <div className="space-y-0.5">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Descrição detalhada</label>
                <textarea
                  placeholder="Tráfego pago..."
                  rows={2}
                  className="w-full bg-[#111827] border border-white/10 p-2 rounded-lg text-white font-bold text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-800 resize-none"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Periodicidade do Pagamento */}
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-1.5">
                  <Repeat size={10} className="text-blue-500" />
                  Periodicidade
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                  {recurrenceOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFormData({ ...formData, recurrence: opt })}
                      className={`py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all border ${formData.recurrence === opt
                        ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40 scale-[1.02]'
                        : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300 hover:bg-white/10'
                        }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categoria e Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Categoria</label>
                  <div className="relative">
                    <select
                      className="w-full bg-[#111827] border border-white/10 p-2 rounded-lg text-white font-black text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all appearance-none uppercase"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="">SELECIONAR...</option>
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Data / Início</label>
                  <div className="relative">
                    <input
                      type="date"
                      className="w-full bg-[#111827] border border-white/10 p-2 rounded-lg text-white font-black text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all appearance-none"
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                    />
                    <Calendar size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Vencimento Fixo (Aparece se recorrente) */}
              {formData.recurrence !== 'Única' && (
                <div className="space-y-0.5 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-1.5 italic">
                    <CalendarDays size={10} />
                    Dia do Vencimento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="Ex: 10"
                    className="w-full bg-[#111827] border border-blue-500/20 p-2 rounded-lg text-white font-black text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-blue-900/30"
                    value={formData.billing_day}
                    onChange={e => setFormData({ ...formData, billing_day: e.target.value })}
                  />
                </div>
              )}

              {/* Classificar como CAC (Toggle Estilizado) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_cac: !formData.is_cac })}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group/cac ${formData.is_cac ? 'bg-blue-600 border-blue-400 text-white shadow-[0_15px_40px_rgba(37,99,235,0.4)]' : 'bg-[#111827] border-white/5 text-slate-500 hover:border-white/10'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${formData.is_cac ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-600'}`}>
                      <TargetIcon size={16} />
                    </div>
                    <div className="text-left">
                      <span className="text-[9px] font-black uppercase tracking-[0.15em] block leading-none">Classificar como CAC</span>
                      <p className="text-[8px] font-bold opacity-60 tracking-tight mt-0.5 leading-none">Custo de aquisição</p>
                    </div>
                  </div>
                  {formData.is_cac ? (
                    <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center border border-white/20 shadow-inner">
                      <Check size={14} strokeWidth={4} className="text-blue-600" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 border-2 border-slate-800 rounded-full shadow-inner" />
                  )}
                </button>
              </div>

              {/* Ações Finais */}
              <div className="flex gap-2 pt-3 border-t border-white/5 items-center">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-[9px] font-black uppercase text-slate-500 hover:text-white transition-colors tracking-[0.2em]">Cancelar</button>
                <button
                  onClick={handleSaveExpense}
                  disabled={isSaving}
                  className="flex-[2] py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-[9px] font-black uppercase text-white shadow-[0_15px_30px_rgba(37,99,235,0.5)] transition-all active:scale-[0.97] flex items-center justify-center gap-2 tracking-[0.2em]"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} strokeWidth={3} />}
                  <span>Confirmar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CACSection: React.FC<{ metrics: any }> = ({ metrics }) => (
  <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatBox title="CAC Atual (Real)" value={metrics.cac > 0 ? `R$ ${metrics.cac.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : "R$ 0"} sub="Custo p/ novo cliente" warning={metrics.cac === 0} />
      <StatBox title="LTV/CAC Real" value={`${metrics.ltvCac.toFixed(1)}x`} sub="Rentabilidade p/ cliente" positive={metrics.ltvCac > 3} />
      <StatBox title="Payback Real" value={`${metrics.payback.toFixed(1)} m`} sub="Meses p/ retorno" />
      <StatBox title="Contas Ativas" value={metrics.activeCompanies.toString()} sub="Volume operacional" />
    </div>
  </div>
);

const StatBox: React.FC<{ title: string, value: string, sub?: string, trend?: string, positive?: boolean, warning?: boolean }> = ({ title, value, sub, trend, positive, warning }) => (
  <div className="bg-white dark:bg-[#0A0D14] p-5 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm text-left relative overflow-hidden group transition-all hover:border-slate-300 dark:hover:border-white/10">
    <p className="text-[9px] font-black text-slate-400 dark:text-[#64748B] uppercase tracking-[0.2em] mb-2 leading-none">{title}</p>
    <div className="flex items-end justify-between">
      <h3 className={`text-2xl font-black ${warning ? 'text-yellow-500 opacity-60' : 'text-slate-900 dark:text-white'} tracking-tight`}>{value}</h3>
      {trend && (
        <span className={`px-2 py-1 rounded-lg text-[9px] font-black ${positive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
          {trend}
        </span>
      )}
    </div>
    {sub && <p className="text-[9px] font-bold text-slate-500 mt-1.5 uppercase tracking-tight italic leading-none">{sub}</p>}
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const configs: any = {
    'paid': { label: 'Confirmado', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
    'open': { label: 'Pendente', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Clock },
    'overdue': { label: 'Atrasado', color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertTriangle },
    'canceled': { label: 'Cancelado', color: 'text-slate-500', bg: 'bg-slate-500/10', icon: XCircle },
    'void': { label: 'Cancelado', color: 'text-slate-500', bg: 'bg-slate-500/10', icon: XCircle },
    'uncollectible': { label: 'Cancelado', color: 'text-slate-500', bg: 'bg-slate-500/10', icon: XCircle },
    // Fallbacks para labels antigos se existirem
    'Pago': { label: 'Confirmado', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
    'Pendente': { label: 'Pendente', color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Clock }
  };
  const config = configs[status] || { label: status, color: 'text-slate-400', bg: 'bg-slate-400/10', icon: Clock };
  return (
    <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full ${config.bg} ${config.color}`}>
      <config.icon size={11} strokeWidth={3} />
      <span className="text-[9px] font-black uppercase tracking-widest leading-none">{config.label}</span>
    </div>
  );
};
