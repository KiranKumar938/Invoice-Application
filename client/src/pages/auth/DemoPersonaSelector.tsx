import React from 'react';
import { Crown, Briefcase, Zap, Check, ArrowRight } from 'lucide-react';
import { sound } from '../../utils/soundEffects.js';

export interface Persona {
  id: string;
  name: string;
  roleTitle: string;
  badge: string;
  email: string;
  password: string;
  icon: React.ComponentType<{ className?: string }>;
  avatarUrl: string;
  colorScheme: {
    border: string;
    bg: string;
    activeRing: string;
    badgeBg: string;
    badgeText: string;
    iconColor: string;
  };
  description: string;
}

export const DEMO_PERSONAS: Persona[] = [
  {
    id: 'admin',
    name: 'Mahesh Kumar',
    roleTitle: 'Super Admin & Owner',
    badge: 'Full Access',
    email: 'admin@klanvision.com',
    password: 'Password123!',
    icon: Crown,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    colorScheme: {
      border: 'hover:border-amber-400/50',
      bg: 'hover:bg-amber-500/5',
      activeRing: 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10',
      badgeBg: 'bg-amber-100 text-amber-900 border-amber-200',
      badgeText: 'text-amber-800',
      iconColor: 'text-amber-500',
    },
    description: 'Company settings, multi-GSTIN management, audit trails, and financial metrics.',
  },
  {
    id: 'accountant',
    name: 'Priya Sharma (CA)',
    roleTitle: 'Chief Accountant & Auditor',
    badge: 'GST & Compliance',
    email: 'accountant@klanvision.com',
    password: 'Password123!',
    icon: Briefcase,
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    colorScheme: {
      border: 'hover:border-cyan-400/50',
      bg: 'hover:bg-cyan-500/5',
      activeRing: 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/10',
      badgeBg: 'bg-cyan-100 text-cyan-900 border-cyan-200',
      badgeText: 'text-cyan-800',
      iconColor: 'text-cyan-600',
    },
    description: 'Tax computation, GSTR-1 & 3B reports, ledger reconciliation, and E-Way bills.',
  },
  {
    id: 'sales',
    name: 'Rahul Verma',
    roleTitle: 'Head of Sales & Invoicing',
    badge: 'Fast Billing',
    email: 'sales@klanvision.com',
    password: 'Password123!',
    icon: Zap,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    colorScheme: {
      border: 'hover:border-blue-400/50',
      bg: 'hover:bg-blue-500/5',
      activeRing: 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10',
      badgeBg: 'bg-blue-100 text-blue-900 border-blue-200',
      badgeText: 'text-blue-800',
      iconColor: 'text-blue-600',
    },
    description: 'Instant customer quotes, fast tax invoices, and real-time payment link dispatch.',
  },
];

interface DemoPersonaSelectorProps {
  currentEmail: string;
  onSelectPersona: (persona: Persona, autoSubmit?: boolean) => void;
  isSubmitting?: boolean;
}

export const DemoPersonaSelector: React.FC<DemoPersonaSelectorProps> = ({
  currentEmail,
  onSelectPersona,
  isSubmitting = false,
}) => {
  const handleSelect = (persona: Persona, autoSubmit: boolean = false) => {
    sound.playPersonaSwitch();
    onSelectPersona(persona, autoSubmit);
  };

  return (
    <div className="w-full space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Demo Personas (1-Click Fill & Test)</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
          Sandbox Enabled
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {DEMO_PERSONAS.map((persona) => {
          const isSelected = currentEmail.toLowerCase() === persona.email.toLowerCase();
          const Icon = persona.icon;

          return (
            <div
              key={persona.id}
              onClick={() => handleSelect(persona, false)}
              className={`group relative p-2.5 rounded-2xl border text-left cursor-pointer transition-all duration-200 select-none ${
                isSelected
                  ? `${persona.colorScheme.activeRing} bg-slate-50/80`
                  : `border-slate-200/90 bg-white hover:bg-slate-50/60 ${persona.colorScheme.border} hover:shadow-sm`
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="relative">
                  <img
                    src={persona.avatarUrl}
                    alt={persona.name}
                    className="w-7 h-7 rounded-full object-cover border border-white shadow-sm"
                  />
                  <div className={`absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white shadow-xs`}>
                    <Icon className={`w-2.5 h-2.5 ${persona.colorScheme.iconColor}`} />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 truncate">{persona.name}</p>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-slate-500 truncate leading-tight font-medium">
                    {persona.roleTitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[10px]">
                <span className={`px-1.5 py-0.5 rounded-md font-semibold border ${persona.colorScheme.badgeBg}`}>
                  {persona.badge}
                </span>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(persona, true);
                  }}
                  className="font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 hover:underline"
                >
                  <span>Sign In</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
