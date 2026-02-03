
import React from 'react';
import { DollarSign, Download, FileText, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

const invoices = [
  { id: 'INV-001', company: 'NIC. BR', amount: 4500.00, date: '15 Jan 2026', status: 'Pago' },
  { id: 'INV-002', company: 'Google Cloud SP', amount: 12000.00, date: '20 Jan 2026', status: 'Pendente' },
  { id: 'INV-003', company: 'Amazon Logística', amount: 8400.00, date: '10 Jan 2026', status: 'Atrasado' },
  { id: 'INV-004', company: 'Mercado Livre', amount: 3200.00, date: '18 Jan 2026', status: 'Pago' },
];

export const BillingView: React.FC = () => {
  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold text-white">Faturamento</h2>
        <p className="text-gray-400">Visão geral financeira e histórico de faturas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0F172A] p-8 rounded-[2rem] border border-blue-500/20">
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest mb-2">Receita Total</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-white">R$ 28.100,00</h3>
            <span className="text-emerald-400 text-xs font-bold bg-emerald-400/10 px-2 py-1 rounded">+12%</span>
          </div>
        </div>
        <div className="bg-[#0F172A] p-8 rounded-[2rem] border border-white/5">
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest mb-2">Pendente</p>
          <h3 className="text-3xl font-bold text-yellow-400">R$ 12.000,00</h3>
        </div>
        <div className="bg-[#0F172A] p-8 rounded-[2rem] border border-red-500/20">
          <p className="text-gray-500 text-sm font-bold uppercase tracking-widest mb-2">Atrasado</p>
          <h3 className="text-3xl font-bold text-red-500">R$ 8.400,00</h3>
        </div>
      </div>

      <div className="bg-[#0F172A] rounded-[2rem] border border-white/5">
        <div className="p-8 flex items-center justify-between border-b border-white/5">
          <h4 className="font-bold text-white">Faturas Recentes</h4>
          <button className="text-xs font-bold text-blue-400 hover:text-blue-300">Ver Todas</button>
        </div>
        <div className="p-4 space-y-2">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all group border border-transparent hover:border-white/5">
              <div className="flex items-center space-x-6">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-blue-400 transition-colors">
                  <FileText size={20} />
                </div>
                <div>
                  <h5 className="font-bold text-white">{inv.company}</h5>
                  <p className="text-xs text-gray-500">{inv.id} • {inv.date}</p>
                </div>
              </div>
              <div className="flex items-center space-x-8">
                <div className="text-right">
                  <p className="font-bold text-white">R$ {inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <div className="flex items-center justify-end space-x-1.5 mt-1">
                    {inv.status === 'Pago' ? <CheckCircle2 size={12} className="text-emerald-400" /> : 
                     inv.status === 'Pendente' ? <Clock size={12} className="text-yellow-400" /> : 
                     <AlertTriangle size={12} className="text-red-400" />}
                    <span className={`text-[10px] font-bold uppercase ${
                      inv.status === 'Pago' ? 'text-emerald-400' : 
                      inv.status === 'Pendente' ? 'text-yellow-400' : 
                      'text-red-400'
                    }`}>{inv.status}</span>
                  </div>
                </div>
                <button className="p-3 bg-white/5 hover:bg-blue-600 rounded-xl text-gray-400 hover:text-white transition-all">
                  <Download size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
