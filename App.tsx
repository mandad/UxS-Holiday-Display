import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LogMessage, SystemStatus } from './types';
import { generateStatusBatch } from './services/geminiService';
import { SEED_MESSAGES } from './constants';
import { TerminalLine } from './components/TerminalLine';
import { StatusBadge } from './components/StatusBadge';
import { Activity, Battery, Cloud, Cpu, Gift, Pause, Play, Snowflake, Zap } from 'lucide-react';

const MAX_LOGS = 50;

// Helper to format time
const getTimestamp = () => {
  const now = new Date();
  return now.toISOString().split('T')[1].slice(0, 12);
};

// Helper to parse the raw string from Gemini into a structured object
const parseLogString = (raw: string): Omit<LogMessage, 'id' | 'timestamp'> => {
  // Expected format: "[TAG] Message"
  // Updated regex to handle tags with spaces, underscores, and numbers (e.g. [SYSTEM CHECK] or [ASSET_HEALTH])
  const match = raw.match(/^\[([A-Z0-9_ ]+)\]\s*(.*)/);
  if (match) {
    const system = match[1];
    const message = match[2];
    
    // Determine level based on keywords
    let level: LogMessage['level'] = 'INFO';
    if (message.toLowerCase().includes('critical') || message.toLowerCase().includes('fail') || message.toLowerCase().includes('error')) level = 'CRIT';
    else if (message.toLowerCase().includes('warning') || message.toLowerCase().includes('detect')) level = 'WARN';
    else if (system === 'SYS') level = 'SYS';

    return { system, message, level };
  }
  return { system: 'UNK', message: raw, level: 'INFO' };
};

export default function App() {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [buffer, setBuffer] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  
  // System State (Mock data that fluctuates)
  const [systemState, setSystemState] = useState<SystemStatus>({
    cheerLevel: 98,
    speed: 1400,
    cookieBuffer: 84,
    reindeerSync: 100
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Refs to maintain state access in callbacks without triggering re-renders
  const logsRef = useRef<LogMessage[]>([]);
  const bufferRef = useRef<string[]>([]);
  const isLoadingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Ref to track alternation between API and Seed messages
  const useGeminiNext = useRef(true);

  // Sync refs with state
  useEffect(() => { logsRef.current = logs; }, [logs]);
  useEffect(() => { bufferRef.current = buffer; }, [buffer]);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

  // Initial seed
  useEffect(() => {
    const initialLogs: LogMessage[] = [
      { id: 'init-1', timestamp: getTimestamp(), level: 'SYS', system: 'SYS', message: 'SleighOS v25.12.24 Boot Sequence Initiated...' },
      { id: 'init-2', timestamp: getTimestamp(), level: 'INFO', system: 'NET', message: 'Connected to North Pole Command Uplink.' },
      { id: 'init-3', timestamp: getTimestamp(), level: 'INFO', system: 'UAS', message: 'Drone Swarm pre-flight checks green.' },
    ];
    setLogs(initialLogs);
    // Trigger initial fetch
    fetchMoreLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Dynamic status updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemState(prev => ({
        cheerLevel: Math.min(100, Math.max(80, prev.cheerLevel + (Math.random() - 0.5) * 2)),
        speed: Math.max(0, prev.speed + (Math.random() - 0.5) * 50),
        cookieBuffer: Math.max(0, prev.cookieBuffer - (Math.random() > 0.8 ? 1 : 0)),
        reindeerSync: Math.min(100, Math.max(90, prev.reindeerSync + (Math.random() - 0.5))),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Stable fetch function that doesn't depend on changing state
  const fetchMoreLogs = useCallback(async () => {
    if (isLoadingRef.current) return;
    setIsLoading(true);
    
    // Logic to alternate between Gemini API and random Seed messages
    if (useGeminiNext.current) {
      // API Turn
      const currentMessages = logsRef.current.slice(-5).map(l => `[${l.system}] ${l.message}`);
      const { logs: newRawLogs, error } = await generateStatusBatch(currentMessages, 1);
      
      setAiError(error);
      setBuffer(prev => [...prev, ...newRawLogs]);
    } else {
      // Seed Turn (Mock)
      // Pick a random message from the seed constants
      const randomMsg = SEED_MESSAGES[Math.floor(Math.random() * SEED_MESSAGES.length)];
      setBuffer(prev => [...prev, randomMsg]);
      // Note: We do not update aiError here to avoid flickering the status light
      // if the API is down. We simply preserve the last known API status.
    }

    // Toggle for next time
    useGeminiNext.current = !useGeminiNext.current;
    setIsLoading(false);
  }, []);

  // Consumer Loop: Consumes the buffer and adds to logs with random intervals
  useEffect(() => {
    const processNextMessage = () => {
      if (!isRunning) return;

      let currentBufferLen = bufferRef.current.length;

      if (currentBufferLen > 0) {
        // Pop from buffer
        const nextRaw = bufferRef.current[0];
        const newBuffer = bufferRef.current.slice(1);
        
        setBuffer(newBuffer);
        currentBufferLen = newBuffer.length;
        
        const parsed = parseLogString(nextRaw);
        const newLog: LogMessage = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: getTimestamp(),
          ...parsed
        };

        setLogs(prev => {
          const updated = [...prev, newLog];
          return updated.slice(-MAX_LOGS); // Keep list manageable
        });
      } else {
        // Buffer empty, try fetch
        fetchMoreLogs();
      }

      // If buffer is getting low, preemptively fetch more
      if (currentBufferLen < 2 && !isLoadingRef.current) {
        fetchMoreLogs();
      }

      // Schedule next tick randomly between 1000ms (1s) and 4000ms (4s)
      const delay = Math.random() * 3000 + 1000;
      timeoutRef.current = setTimeout(processNextMessage, delay);
    };

    if (isRunning) {
      processNextMessage();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isRunning, fetchMoreLogs]);

  return (
    <div className="h-screen bg-slate-950 text-green-500 font-mono flex flex-col relative overflow-hidden selection:bg-green-500 selection:text-slate-950">
      
      {/* Background Decor */}
      <div className="absolute inset-0 animate-scanline pointer-events-none z-10"></div>
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-green-900/10 to-transparent pointer-events-none"></div>

      {/* Header / HUD */}
      <header className="border-b border-green-900/50 bg-slate-900/80 backdrop-blur-md p-4 sticky top-0 z-20 shadow-lg shadow-green-900/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-full border border-green-500/50">
              <Snowflake className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tighter text-white font-share">
                SLEIGH<span className="text-green-500">OS</span> v25.12
              </h1>
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  AUTONOMOUS FLEET CONTROL
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className={`w-2 h-2 rounded-full ${aiError ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></span>
                  AI STATUS: {aiError ? 'OFFLINE (FALLBACK)' : 'ONLINE'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
            <StatusBadge 
              icon={<Activity className="w-4 h-4" />} 
              label="Cheer Level" 
              value={systemState.cheerLevel.toFixed(1)} 
              unit="%" 
            />
             <StatusBadge 
              icon={<Zap className="w-4 h-4" />} 
              label="Swarm Spd" 
              value={Math.floor(systemState.speed)} 
              unit=" KPH" 
              color="border-blue-500/30 text-blue-400"
            />
            <StatusBadge 
              icon={<Gift className="w-4 h-4" />} 
              label="Payload" 
              value={systemState.cookieBuffer} 
              unit=" TONS" 
              color="border-orange-500/30 text-orange-400"
            />
             <StatusBadge 
              icon={<Cpu className="w-4 h-4" />} 
              label="Net Sync" 
              value={systemState.reindeerSync.toFixed(1)} 
              unit="%" 
              color="border-purple-500/30 text-purple-400"
            />
          </div>
        </div>
      </header>

      {/* Main Terminal Area */}
      <main className="flex-1 overflow-hidden relative container mx-auto p-4 flex flex-col">
        
        <div className="flex justify-between items-end mb-2 px-2">
          <h2 className="text-sm text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Battery className="w-4 h-4" /> Live Fleet Telemetry
          </h2>
          <div className="flex gap-2">
             <button 
              onClick={() => setIsRunning(!isRunning)}
              className={`
                flex items-center gap-2 px-3 py-1 rounded text-xs font-bold border transition-colors
                ${isRunning 
                  ? 'border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10' 
                  : 'border-green-500/30 text-green-500 hover:bg-green-500/10'
                }
              `}
            >
              {isRunning ? <><Pause className="w-3 h-3" /> PAUSE</> : <><Play className="w-3 h-3" /> RESUME</>}
            </button>
            <div className="px-2 py-1 rounded border border-slate-700 bg-slate-900 text-xs text-slate-400">
               BUFFER: {buffer.length}
            </div>
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="flex-1 bg-black/40 border border-green-900/30 rounded-lg p-4 overflow-y-auto shadow-inner relative font-mono"
        >
          {logs.map((log, index) => (
            <TerminalLine 
              key={log.id} 
              log={log} 
              isNew={index === logs.length - 1}
            />
          ))}
          
          {logs.length === 0 && (
            <div className="text-center text-slate-600 mt-20">
              Initializing autonomous fleet uplink...
            </div>
          )}

          {/* Typing Indicator at bottom if generating */}
          {isLoading && buffer.length < 1 && (
            <div className="mt-2 text-xs text-green-500/50 animate-pulse pl-2">
              > DOWNLOADING TELEMETRY PACKET...
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-2 text-center text-[10px] text-slate-600 border-t border-slate-900 bg-slate-950 z-20">
        SLEIGH_OS_KERNEL_V2.5 // UAS/USV/UUV COMMAND LINK // NORTH POLE REMOTE OPERATIONS CENTER
      </footer>
    </div>
  );
}