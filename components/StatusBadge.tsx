import React from 'react';

interface StatusBadgeProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  color?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, value, unit, icon, color = "border-green-500/30 text-green-400" }) => {
  return (
    <div className={`border ${color} bg-slate-900/50 p-3 rounded flex flex-col items-center justify-center min-w-[100px] backdrop-blur-sm`}>
      <div className="mb-1 opacity-80">{icon}</div>
      <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">{label}</div>
      <div className="text-xl font-bold font-share">
        {value}<span className="text-xs ml-1 opacity-60">{unit}</span>
      </div>
    </div>
  );
};