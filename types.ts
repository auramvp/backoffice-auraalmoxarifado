
export enum View {
  DASHBOARD = 'DASHBOARD',
  USERS = 'USERS',
  COMPANIES = 'COMPANIES',
  FINANCE = 'FINANCE',
  SUBSCRIPTIONS = 'SUBSCRIPTIONS',
  TEAM = 'TEAM',
  LOG = 'LOG',
  SUPPORT = 'SUPPORT'
}

export interface SupportTicket {
  id: string;
  created_at: string;
  user_name: string;
  user_id?: string;
  company_name: string;
  company_id?: string;
  description: string;
  status: 'Em aberto' | 'Em andamento' | 'Resolvido';
  resolution?: string;
  resolved_at?: string;
  started_at?: string;
  started_by?: string;
  resolved_by?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  lastLogin: string;
  company: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  accessCode: string;
  role: string;
  permissions: string[];
  status: 'active' | 'inactive';
}

export interface ActivityLog {
  id: string;
  userName: string;
  userRole: string;
  action: string;
  module: View;
  timestamp: string;
  details: string;
  type: 'info' | 'success' | 'warning' | 'critical';
}

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  plan: string;
  usersCount: number;
  status: 'active' | 'suspended';
}

export interface Invoice {
  id: string;
  company: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'overdue';
}

export interface Subscription {
  id: string;
  company: string;
  planName: string;
  price: number;
  nextBilling: string;
  active: boolean;
}
