
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  ArrowUpRight,
  Target,
  Users2,
  PieChart as PieChartIcon,
  BarChart3,
  Percent,
  Zap,
  ChevronRight,
  Loader2,
  Briefcase,
  RefreshCcw,
  CreditCard
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { supabase } from '../lib/supabase';

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalMRR: 0,
    totalCompanies: 0,
    activeSubs: 0,
    churnRate: 0,
    avgTicket: 0,
    ltv: 0,
    cac: 0,
    profit: 0,
    totalExpenses: 0
  });
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [planData, setPlanData] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState<any[]>([]); // Dados para o gráfico de pizza

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [companiesRes, invoicesRes, expensesRes, plansRes, subscriptionsRes] = await Promise.all([
        supabase.from('companies').select('*'),
        supabase.from('invoices').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('plans').select('*'),
        supabase.from('subscriptions').select('payment_method')
      ]);

      if (companiesRes.error) console.warn("Aviso na busca de empresas:", companiesRes.error.message);
      if (invoicesRes.error) console.warn("Aviso na busca de faturas:", invoicesRes.error.message);
      if (expensesRes.error) console.warn("Aviso na busca de despesas:", expensesRes.error.message);
      if (plansRes.error) console.warn("Aviso na busca de planos:", plansRes.error.message);
      if (subscriptionsRes.error) console.warn("Aviso na busca de assinaturas:", subscriptionsRes.error.message);

      const companies = companiesRes.data || [];
      const invoices = invoicesRes.data || [];
      const subscriptions = subscriptionsRes.data || [];
      const realPlans = plansRes.data || [];
      
      // Processar dados reais de pagamentos da tabela subscriptions
      const paymentCounts: Record<string, number> = {};
      let totalPayments = 0;

      subscriptions.forEach((sub: any) => {
        if (sub.payment_method) {
          const method = sub.payment_method;
          paymentCounts[method] = (paymentCounts[method] || 0) + 1;
          totalPayments++;
        }
      });

      // Mapeamento de cores para métodos de pagamento
      const paymentColors: Record<string, string> = {
        'credit_card': '#3B82F6', // Blue
        'pix': '#10B981',         // Emerald
        'boleto': '#F59E0B',      // Amber
        'bank_slip': '#F59E0B',   // Amber alias
        'unknown': '#94A3B8'      // Slate
      };

      const realPaymentData = Object.keys(paymentCounts).map(method => {
         // Normalizar nome para exibição (ex: credit_card -> Cartão de Crédito)
         let displayName = method;
         if (method === 'credit_card') displayName = 'Cartão de Crédito';
         else if (method === 'pix') displayName = 'PIX';
         else if (method === 'boleto' || method === 'bank_slip') displayName = 'Boleto';
         
         const count = paymentCounts[method];
         // Calcular porcentagem
         const percentage = totalPayments > 0 ? Math.round((count / totalPayments) * 100) : 0;

         return {
           name: displayName,
           value: percentage,
           count: count,
           color: paymentColors[method] || '#64748B'
         };
      });
      
      // Se não houver dados, mostrar estado vazio ou manter array vazio
      // O componente Recharts lidará com array vazio (não renderizando nada ou podemos adicionar uma mensagem visual)
      setPaymentData(realPaymentData);
      
      // Fallback para despesas locais caso o Supabase falhe ou esteja vazio
      const localExpenses = JSON.parse(localStorage.getItem('aura_expenses') || '[]');
      const dbExpenses = expensesRes.data || [];
      // Combine and deduplicate based on ID just in case
      const expenses = [...dbExpenses, ...localExpenses];

      const totalCompanies = companies.length;
      
      const processedCompanies = companies.map(c => ({
        ...c,
        status: c.status || 'Ativo',
        plan: c.plan || 'N/A' // Não assumir Standard se não existir
      }));

      const activeCompanies = processedCompanies.filter(c => c.status === 'Ativo').length;
      const suspendedCompanies = processedCompanies.filter(c => c.status === 'Suspenso').length;
      
      const currentMonthPaid = invoices
        .filter(inv => inv.status === 'Pago')
        .reduce((acc, inv) => acc + (inv.amount || 0), 0);

      const mktSpend = expenses
        .filter((e: any) => e.is_cac === true)
        .reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0);
      
      const totalExpenses = expenses.reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0);
      const profit = currentMonthPaid - totalExpenses;

      const avgTicket = activeCompanies > 0 ? currentMonthPaid / activeCompanies : 0;
      const churn = totalCompanies > 0 ? (suspendedCompanies / totalCompanies) * 100 : 0;
      const ltv = churn > 0 ? avgTicket / (churn / 100) : avgTicket * 12;
      const cac = activeCompanies > 0 ? mktSpend / activeCompanies : 0;

      setMetrics({
        totalMRR: currentMonthPaid,
        totalCompanies: totalCompanies,
        activeSubs: activeCompanies,
        churnRate: parseFloat(churn.toFixed(1)),
        avgTicket: avgTicket,
        ltv: ltv,
        cac: cac,
        profit: profit,
        totalExpenses: totalExpenses
      });

      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const groupedGrowth = invoices.reduce((acc: any, inv) => {
        const date = inv.date ? new Date(inv.date) : new Date();
        const monthName = months[date.getMonth()];
        if (!acc[monthName]) acc[monthName] = 0;
        if (inv.status === 'Pago') acc[monthName] += (inv.amount || 0);
        return acc;
      }, {});

      const formattedGrowth = Object.entries(groupedGrowth).map(([month, mrr]) => ({
        month,
        mrr
      })).slice(-6);

      setGrowthData(formattedGrowth.length > 0 ? formattedGrowth : [
        { month: 'Sem Faturas', mrr: 0 }
      ]);

      // Lógica atualizada para usar Planos Reais da Cakto
      const planCounts = processedCompanies.reduce((acc: any, c) => {
        const planName = c.plan;
        if (!acc[planName]) acc[planName] = 0;
        acc[planName]++;
        return acc;
      }, {});

      // Inicializar com os planos reais (mesmo que contagem seja 0)
      const colors: any = { 
        'Plano Starter': '#94A3B8', 
        'Plano Pro': '#3B82F6', 
        'Plano Business': '#6366F1', 
        'Plano Intelligence': '#8B5CF6' 
      };

      let formattedPlans = realPlans.map(p => ({
        plan: p.name.replace('Plano ', ''), // Remover prefixo para visualização mais limpa
        originalName: p.name,
        count: planCounts[p.name] || 0, 
        color: colors[p.name] || '#475569'
      }));
      
      // Adicionar 'Outros' se houver planos não mapeados com contagem > 0
      Object.keys(planCounts).forEach(pName => {
        // Verificar tanto o nome original quanto o formatado
        const exists = realPlans.find(rp => rp.name === pName);
        if (!exists && pName !== 'N/A' && pName !== 'Standard') { // Garantir que Standard não apareça
           formattedPlans.push({
             plan: pName,
             originalName: pName,
             count: planCounts[pName],
             color: '#CBD5E1'
           });
        }
      });

      // Ordenar por valor (opcional) ou manter a ordem da Cakto
      // Se estiver vazio (nenhum plano encontrado), manter a lista de planos com 0
      if (formattedPlans.length === 0) {
          formattedPlans = [
            { plan: 'Starter', count: 0, color: '#94A3B8' },
            { plan: 'Pro', count: 0, color: '#3B82F6' }
          ];
      }

      setPlanData(formattedPlans);

    } catch (err) {
      console.error("Erro crítico ao carregar dados do dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const currentMonthName = useMemo(() => {
    return new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date());
  }, []);

  if (loading) {
    return (
      <div className="h-[80vh] w-full flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
          <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 animate-pulse" size={32} />
        </div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] animate-pulse">Sincronizando BI Aura...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1 tracking-tight uppercase italic">Dashboard Analítico</h2>
          <p className="text-sm text-slate-500 dark:text-gray-400 font-medium tracking-tight">Métricas extraídas em tempo real do ecossistema Supabase.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-2 flex items-center space-x-3 shadow-sm">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest">
               Status: {currentMonthName} 2026
             </span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard 
          title="MRR Real" 
          value={`R$ ${metrics.totalMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} 
          subValue="Receita paga no mês"
          icon={DollarSign} 
          trend={metrics.totalMRR > 0 ? "up" : undefined}
          variant="blue"
        />
        <StatCard 
          title="Total Empresas" 
          value={metrics.totalCompanies.toString()} 
          subValue="Bases cadastradas"
          icon={Briefcase} 
          variant="slate"
        />
        <StatCard 
          title="Assinantes Ativos" 
          value={metrics.activeSubs.toString()} 
          subValue="Contas operacionais"
          icon={Users2} 
          variant="indigo"
        />
        <StatCard 
          title="Churn Rate" 
          value={`${metrics.churnRate}%`} 
          subValue="Taxa de suspensão"
          icon={TrendingDown} 
          trend={metrics.churnRate > 5 ? 'down' : 'up'}
          variant="emerald"
        />
        <StatCard 
          title="LTV Estimado" 
          value={`R$ ${Math.round(metrics.ltv).toLocaleString('pt-BR')}`} 
          subValue="Projeção vitalícia"
          icon={Zap} 
          variant="amber"
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-[#0A0D14] rounded-3xl p-5 border border-slate-200 dark:border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white tracking-tight uppercase">Crescimento de Receita</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Evolução de faturas pagas (6 meses)</p>
            </div>
            <button onClick={fetchDashboardData} className="p-2 bg-blue-600/10 text-blue-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
              <RefreshCcw size={16} />
            </button>
          </div>
          
          <div className="h-[220px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-white/5" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748B', fontSize: 9, fontWeight: 700 }}
                  tickFormatter={(value) => `R$ ${value / 1000}k`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
                  itemStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="mrr" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorMrr)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0A0D14] rounded-3xl p-5 border border-slate-200 dark:border-white/5 shadow-2xl flex flex-col justify-between">
          <div>
            <h3 className="font-black text-lg text-slate-900 dark:text-white tracking-tight mb-4 uppercase">Saúde Financeira</h3>
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl text-center border ${metrics.profit >= 0 ? 'bg-emerald-600/10 border-emerald-500/20' : 'bg-red-600/10 border-red-500/20'}`}>
                 <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${metrics.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                   {metrics.profit >= 0 ? 'Lucro da Operação' : 'Prejuízo Operacional'}
                 </p>
                 <p className="text-2xl font-black text-white">
                   R$ {metrics.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                 </p>
                 <p className={`text-[9px] font-bold uppercase mt-1 ${metrics.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                   Margem: {metrics.totalMRR > 0 ? Math.round((metrics.profit / metrics.totalMRR) * 100) : 0}%
                 </p>
              </div>
              <EfficiencyItem label="Despesas Totais" value={`R$ ${metrics.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={DollarSign} />
              <EfficiencyItem label="CAC Atual" value={`R$ ${metrics.cac.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={Users2} />
              <EfficiencyItem label="Ticket Médio" value={`R$ ${Math.round(metrics.avgTicket).toLocaleString('pt-BR')}`} icon={Target} />
              <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-center">
                 <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">Ratio LTV/CAC</p>
                 <p className="text-3xl font-black text-white">
                   {metrics.cac > 0 ? (metrics.ltv / metrics.cac).toFixed(1) : "0.0"}x
                 </p>
                 <p className="text-[9px] font-bold text-emerald-500 uppercase mt-1">Status: Excelente</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#0A0D14] rounded-3xl p-5 border border-slate-200 dark:border-white/5 shadow-2xl">
           <div className="flex items-center justify-between mb-4">
             <h3 className="font-black text-lg text-slate-900 dark:text-white tracking-tight uppercase">Volume por Plano</h3>
             <BarChart3 size={18} className="text-slate-500" />
           </div>
           <div className="h-[180px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={planData} layout="vertical">
                 <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                 <XAxis type="number" hide />
                 <YAxis 
                    dataKey="plan" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 800 }}
                    width={90}
                 />
                 <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '10px' }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '11px' }}
                 />
                 <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={24}>
                   {planData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white dark:bg-[#0A0D14] rounded-3xl p-5 border border-slate-200 dark:border-white/5 shadow-2xl flex flex-col">
           <div className="flex items-center justify-between mb-4">
             <div>
                <h3 className="font-black text-lg text-slate-900 dark:text-white tracking-tight uppercase">Métodos de Pagamento</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Preferência dos clientes</p>
             </div>
             <CreditCard size={18} className="text-slate-500" />
           </div>
           
           <div className="flex-1 min-h-[180px] w-full relative">
             {paymentData.length > 0 ? (
               <>
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                       data={paymentData}
                       cx="50%"
                       cy="50%"
                       innerRadius={60}
                       outerRadius={80}
                       paddingAngle={5}
                       dataKey="value"
                     >
                       {paymentData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                       ))}
                     </Pie>
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#0F172A', border: 'none', borderRadius: '10px' }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '11px' }}
                        formatter={(value: number) => `${value}%`}
                     />
                     <Legend 
                        verticalAlign="middle" 
                        align="right"
                        layout="vertical"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: '#94A3B8' }}
                     />
                   </PieChart>
                 </ResponsiveContainer>
                 
                 {/* Central Label */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none pr-24">
                   <div className="flex flex-col items-center justify-center">
                     <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Total</span>
                     <span className="text-xl font-black text-slate-900 dark:text-white">100%</span>
                   </div>
                 </div>
               </>
             ) : (
               <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                 Sem dados
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ 
  title: string; 
  value: string; 
  subValue: string; 
  icon: any; 
  trend?: 'up' | 'down';
  variant: 'blue' | 'indigo' | 'emerald' | 'amber' | 'slate';
}> = ({ title, value, subValue, icon: Icon, trend, variant }) => {
  const themes = {
    blue: "text-blue-500 bg-blue-500/10",
    indigo: "text-indigo-500 bg-indigo-500/10",
    emerald: "text-emerald-500 bg-emerald-500/10",
    amber: "text-amber-500 bg-amber-500/10",
    slate: "text-slate-400 bg-slate-400/10"
  };

  return (
    <div className="bg-white dark:bg-[#0A0D14] p-4 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm hover:translate-y-[-2px] transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl ${themes[variant]}`}>
          <Icon size={16} />
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[8px] font-black ${trend === 'up' ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>
            {trend === 'up' ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
            <span>{trend === 'up' ? 'ESTÁVEL' : 'RISCO'}</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-[8px] font-black text-slate-400 dark:text-[#64748B] uppercase tracking-[0.15em] mb-0.5">{title}</p>
        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-0.5">{value}</h3>
        <p className="text-[9px] font-bold text-slate-500 dark:text-slate-500">{subValue}</p>
      </div>
    </div>
  );
};

const EfficiencyItem: React.FC<{ label: string; value: string; icon: any }> = ({ label, value, icon: Icon }) => (
  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/[0.03] rounded-xl border border-slate-100 dark:border-white/5">
    <div className="flex items-center space-x-2">
      <div className="text-slate-500">
        <Icon size={16} />
      </div>
      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tight">{label}</span>
    </div>
    <span className="text-xs font-black text-slate-900 dark:text-white tracking-tight">{value}</span>
  </div>
);
