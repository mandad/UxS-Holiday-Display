import React, { useEffect, useState } from 'react';
import { LogMessage } from '../types';
import { SYSTEM_COLORS } from '../constants';

interface TerminalLineProps {
  log: LogMessage;
  isNew: boolean;
}

export const TerminalLine: React.FC<TerminalLineProps> = ({ log, isNew }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Staggered fade in effect
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const colorClass = SYSTEM_COLORS[log.system as keyof typeof SYSTEM_COLORS] || "text-green-400";
  const levelColor = log.level === 'CRIT' ? 'text-red-500 bg-red-900/20' : 
                     log.level === 'WARN' ? 'text-yellow-500' : 'text-slate-500';

  return (
    <div 
      className={`
        font-mono text-sm md:text-base py-1 px-2 border-l-2 border-transparent hover:bg-slate-900/50 transition-all duration-300
        ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}
        ${isNew ? 'bg-green-900/10' : ''}
      `}
    >
      <span className="text-slate-600 mr-3 text-xs">{log.timestamp}</span>
      <span className={`font-bold mr-3 ${levelColor} text-xs w-10 inline-block`}>{log.level}</span>
      <span className={`font-bold mr-2 ${colorClass}`}>[{log.system}]</span>
      <span className="text-slate-300 tracking-tight">{log.message}</span>
    </div>
  );
};