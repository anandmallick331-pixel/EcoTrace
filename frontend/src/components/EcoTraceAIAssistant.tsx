import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Activity,
  ArrowRight,
  RefreshCw,
  Compass,
  Layers,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronDown,
  HelpCircle,
  BarChart3,
  Copy,
  Check,
  Flame,
  Info
} from 'lucide-react';
import { api, AIAskRequest, AIAskResponse, AISupportingMetric, AIEvidenceCitation } from '../services/api';
import { Destination } from '../types';

interface EcoTraceAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  destinations: Destination[];
  currentDestinationId?: string;
  onSelectDestination?: (destId: string) => void;
  initialQuery?: string;
  currentPage?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text?: string;
  response?: AIAskResponse;
  timestamp: string;
  isError?: boolean;
}

const QUICK_PROMPTS = [
  { label: 'Why is the impact score like this?', query: 'Why is this destination impact score like this, and what should we improve first?' },
  { label: 'Biggest tourism pressures', query: 'What are the biggest tourism pressures and ecological stress factors here?' },
  { label: 'What tourists can do', query: 'What can tourists do to reduce their impact and support local communities?' },
  { label: 'Government & policy priorities', query: 'What should local authorities prioritize for sustainable management?' },
  { label: 'What-if: 50% boat electrification', query: 'What happens if boat electrification is increased to 50%?' },
  { label: 'Data gaps & unrecorded metrics', query: 'What verified evidence supports these scores, and what are the current data gaps?' },
  { label: 'Compare with another destination', query: 'Compare this destination with another destination in the corridor on key indicators.' },
];

export const EcoTraceAIAssistant: React.FC<EcoTraceAIAssistantProps> = ({
  isOpen,
  onClose,
  destinations,
  currentDestinationId = 'chilika',
  onSelectDestination,
  initialQuery,
  currentPage,
}) => {
  const [selectedDestId, setSelectedDestId] = useState<string>(currentDestinationId);
  const [comparisonDestId, setComparisonDestId] = useState<string>('none');
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync selected destination when prop changes
  useEffect(() => {
    if (currentDestinationId) {
      setSelectedDestId(currentDestinationId);
    }
  }, [currentDestinationId]);

  // Handle initial query if passed
  useEffect(() => {
    if (isOpen && initialQuery && initialQuery.trim()) {
      handleSend(initialQuery);
    }
  }, [isOpen, initialQuery]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      if (messages.length === 0) {
        // Welcome message
        setMessages([
          {
            id: 'welcome',
            sender: 'ai',
            text: "Hello! I'm **EcoTrace AI**, your destination intelligence assistant. Ask me anything about impact scores, live telemetry metrics, or intervention scenarios—I'll give you clear, data-backed answers.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    }
  }, [isOpen]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Escape key close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Resolve numeric destination ID for backend
  const getNumericDestId = (strId: string): number => {
    const s = String(strId).toLowerCase();
    
    // First try finding matching destination from props
    const found = destinations.find(
      (d) => String(d.id).toLowerCase() === s || d.name.toLowerCase().includes(s) || s.includes(d.name.toLowerCase())
    );
    if (found) {
      const p = typeof found.id === 'number' ? found.id : parseInt(found.id, 10);
      if (!isNaN(p)) return p;
    }

    if (s.includes('chilika') || s === '44' || s === '1') return 1;
    if (s.includes('bhubaneswar') || s === '100' || s === '2') return 2;
    if (s.includes('konark') || s === '102' || s === '3') return 3;
    if (s.includes('puri') || s === '103') return 103;

    const parsed = parseInt(strId, 10);
    return isNaN(parsed) ? 1 : parsed;
  };

  const handleSend = async (queryToSend?: string) => {
    const q = (queryToSend || inputQuery).trim();
    if (!q || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryToSend) setInputQuery('');
    setIsLoading(true);

    const destNum = getNumericDestId(selectedDestId);
    const compNum = comparisonDestId !== 'none' ? getNumericDestId(comparisonDestId) : undefined;
    const activeDestObj = destinations.find((d) => d.id === selectedDestId);
    const compDestObj = destinations.find((d) => d.id === comparisonDestId);

    const historyPayload = messages.slice(-6).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.sender === 'user' ? (m.text || '') : (m.response?.answer || m.text || ''),
    }));

    try {
      const payload: AIAskRequest = {
        destination_id: destNum,
        query: q,
        comparison_destination_id: compNum,
        context: {
          currentPage: currentPage || 'landing',
          selectedDestination: activeDestObj?.name || 'Chilika Lake',
          comparisonDestination: compDestObj?.name,
        },
        history: historyPayload,
      };

      const res = await api.askEcoTraceAI(payload);

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        response: res,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      console.warn('AI Assistant error:', err);
      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: '⚠️ I encountered an error connecting to the EcoTrace Grounding Service. Please check if the backend is reachable, or try asking about another recorded destination indicator.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s.includes('VERIFIED')) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2] inline-flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-[#244E31]" /> VERIFIED
        </span>
      );
    }
    if (s.includes('DERIVED')) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 inline-flex items-center gap-1">
          <Activity className="w-3 h-3 text-sky-700" /> DERIVED
        </span>
      );
    }
    if (s.includes('ESTIMATED') || s.includes('PROXY')) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-700" /> ESTIMATED / PROXY
        </span>
      );
    }
    if (s.includes('GAP')) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-rose-700" /> DATA GAP
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
        {status}
      </span>
    );
  };

  const renderFormattedText = (text: string) => {
    if (!text) return null;
    const paragraphs = text.split('\n\n');
    return (
      <div className="space-y-3 text-[#1C2A1E]">
        {paragraphs.map((p, pIdx) => {
          const lines = p.split('\n');
          return (
            <div key={pIdx} className="space-y-1">
              {lines.map((line, lIdx) => {
                const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
                return (
                  <div
                    key={lIdx}
                    className={isBullet ? 'pl-3 text-[#1C2A1E]' : ''}
                    dangerouslySetInnerHTML={{ __html: formattedLine }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const activeDestName = destinations.find((d) => d.id === selectedDestId)?.name || 'Selected Corridor';

  return (
    <div id="ecotrace-ai-assistant-modal" className="fixed inset-0 z-50 overflow-hidden flex items-center justify-end">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-[#1C2A1E]/60 backdrop-blur-xs transition-opacity" />

      {/* Slide-in Assistant Panel */}
      <div className="relative w-full max-w-2xl h-full bg-[#FAF8F5] border-l border-[#E8E3D7] shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#1A381E] via-[#204427] to-[#244E31] text-white border-b border-[#2E5839] shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl border border-white/20 text-[#A9D19E] shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-serif font-bold text-white leading-tight">
                  EcoTrace AI
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#A9D19E]/20 text-[#A9D19E] px-2 py-0.5 rounded-full border border-[#A9D19E]/30">
                  Evidence-Based
                </span>
              </div>
              <p className="text-[11px] text-[#C5D8C3]">
                Verified evidence &amp; destination impact analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMessages([])}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Clear Conversation"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="Close Assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Controls Bar: Destination Selectors */}
        <div className="px-6 py-3 bg-white border-b border-[#E8E3D7] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1A381E]">Destination:</span>
            <select
              value={selectedDestId}
              onChange={(e) => {
                setSelectedDestId(e.target.value);
                if (onSelectDestination) onSelectDestination(e.target.value);
              }}
              className="bg-[#FAF8F5] border border-[#E8E3D7] text-[#1A381E] font-medium rounded-xl px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#244E31]"
            >
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#6B7E6A] font-medium">Compare with:</span>
            <select
              value={comparisonDestId}
              onChange={(e) => setComparisonDestId(e.target.value)}
              className="bg-[#FAF8F5] border border-[#E8E3D7] text-[#1A381E] font-medium rounded-xl px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#244E31]"
            >
              <option value="none">None (Single Destination)</option>
              {destinations
                .filter((d) => d.id !== selectedDestId)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-thin scrollbar-thumb-[#D0C8B8]">
          {messages.map((msg) => {
            const isAI = msg.sender === 'ai';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 animate-in fade-in duration-200 ${
                  isAI ? 'justify-start' : 'justify-end'
                }`}
              >
                {isAI && (
                  <div className="p-2 bg-[#1A381E] text-white rounded-xl shrink-0 mt-1 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] rounded-3xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed ${
                    isAI
                      ? 'bg-white border border-[#E8E3D7] shadow-sm text-[#1C2A1E]'
                      : 'bg-[#1A381E] text-white rounded-tr-xs shadow-xs'
                  }`}
                >
                  {/* Message Plain Text or AI Structured Payload */}
                  {msg.text && (
                    <div className={`whitespace-pre-line ${isAI ? 'text-[#1C2A1E]' : 'text-white font-medium'}`}>
                      {msg.text}
                    </div>
                  )}

                  {msg.response && (
                    <div className="space-y-4">
                      
                      {/* Top AI Answer Text */}
                      <div className="border-b border-[#F0EBE1] pb-3 text-xs sm:text-sm leading-relaxed">
                        {renderFormattedText(msg.response.answer)}
                      </div>

                      {/* Supporting Telemetry & Indicators Card */}
                      {msg.response.supporting_metrics && msg.response.supporting_metrics.length > 0 && (
                        <div className="space-y-2 bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E8E3D7]">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[#1A381E] uppercase tracking-wider flex items-center gap-1.5">
                              <BarChart3 className="w-3.5 h-3.5 text-[#244E31]" />
                              <span>Relevant Evidence Records ({msg.response.supporting_metrics.length})</span>
                            </span>
                            <span className="text-[10px] text-[#6B7E6A] font-mono">
                              Database Records
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {msg.response.supporting_metrics.map((m, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 bg-white rounded-xl border border-[#E8E3D7] text-[11px] space-y-1"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-[#1A381E] truncate" title={m.metric_name}>
                                    {m.metric_name}
                                  </span>
                                  {getStatusBadge(m.status)}
                                </div>
                                <div className="flex items-baseline justify-between text-[#556755]">
                                  <span className="font-mono text-xs font-bold text-[#244E31]">
                                    {m.value !== null ? `${m.value} ${m.unit || ''}` : 'Pending'}
                                  </span>
                                  <span className="text-[10px] text-[#6B7E6A] truncate max-w-[50%]">
                                    {m.period || '2023-24'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* What-If Scenario Projection Box */}
                      {msg.response.scenario_projection && (
                        <div className="p-3.5 bg-[#FFFBEB] rounded-2xl border border-[#FDE68A] text-xs space-y-2 text-[#78350F]">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#92400E] flex items-center gap-1.5 uppercase text-[11px]">
                              <Activity className="w-3.5 h-3.5" />
                              <span>{msg.response.scenario_projection.description || 'Counterfactual Scenario'}</span>
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                              {msg.response.scenario_projection.label}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 bg-white/70 p-2.5 rounded-xl border border-[#FDE68A]/60 text-center">
                            <div>
                              <span className="text-[10px] text-[#92400E] block uppercase">Baseline Score</span>
                              <span className="font-mono font-bold text-xs text-[#78350F]">
                                {msg.response.scenario_projection.baseline_score}/100
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#92400E] block uppercase">Projected Score</span>
                              <span className="font-mono font-bold text-xs text-[#047857]">
                                {msg.response.scenario_projection.projected_score}/100
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#92400E] block uppercase">Net Change</span>
                              <span className="font-mono font-bold text-xs text-[#047857]">
                                +{msg.response.scenario_projection.score_change} pts
                              </span>
                            </div>
                          </div>

                          <p className="text-[10px] text-[#92400E] italic">
                            *Projected via scenario simulation model. Not a historical fact.
                          </p>
                        </div>
                      )}

                      {/* Data Gaps Callout */}
                      {msg.response.data_gaps && msg.response.data_gaps.length > 0 && (
                        <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-900 space-y-1">
                          <span className="font-bold flex items-center gap-1.5 text-rose-800 uppercase text-[10px]">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Identified Data Gaps</span>
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-950">
                            {msg.response.data_gaps.map((gap, gIdx) => (
                              <li key={gIdx}>{gap}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Prioritized Recommendations */}
                      {msg.response.recommendations && msg.response.recommendations.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <span className="text-[11px] font-bold text-[#1A381E] uppercase tracking-wider block">
                            Recommended Priorities:
                          </span>
                          <div className="space-y-1.5">
                            {msg.response.recommendations.slice(0, 2).map((r, rIdx) => (
                              <div
                                key={rIdx}
                                className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#E8E3D7] text-xs"
                              >
                                <div className="font-bold text-[#1A381E] mb-0.5">{r.title}</div>
                                <div className="text-[11px] text-[#556755] mb-1">{r.expected_impact}</div>
                                {r.evidence_source && (
                                  <div className="text-[10px] text-[#244E31] font-medium flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3 shrink-0" />
                                    <span>Evidence: {r.evidence_source}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Provenance & Citation Footer */}
                      {msg.response.evidence && msg.response.evidence.length > 0 && (
                        <div className="pt-2 border-t border-[#F0EBE1] flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#6B7E6A]">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3 text-[#244E31]" />
                            <span>Cited Source: <strong>{msg.response.evidence[0].source}</strong></span>
                          </span>
                          <span className="font-mono text-[9px] bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E8E3D7]">
                            EcoTrace Evidence Engine
                          </span>
                        </div>
                      )}

                    </div>
                  )}

                  {/* Message Action Strip */}
                  <div className={`mt-2 pt-1 flex items-center justify-between text-[10px] ${isAI ? 'text-[#8C9B8B]' : 'text-white/80'}`}>
                    <span>{msg.timestamp}</span>
                    {isAI && (
                      <button
                        onClick={() => copyToClipboard(msg.response?.answer || msg.text || '', msg.id)}
                        className="hover:text-[#1A381E] p-1 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-[#244E31]" />
                            <span className="text-[#244E31]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {!isAI && (
                  <div className="p-2 bg-[#FAF8F5] border border-[#E8E3D7] text-[#1A381E] rounded-xl shrink-0 mt-1 shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading Bubble */}
          {isLoading && (
            <div className="flex items-start gap-3 animate-in fade-in">
              <div className="p-2 bg-[#1A381E] text-white rounded-xl shrink-0 mt-1">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-white border border-[#E8E3D7] rounded-3xl p-4 text-xs text-[#556755] flex items-center gap-2 shadow-xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#244E31]" />
                <span>Reviewing verified evidence records for {activeDestName}...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts Carousel */}
        <div className="px-4 py-2 bg-white border-t border-[#E8E3D7] shrink-0">
          <div className="text-[10px] font-bold uppercase text-[#6B7E6A] mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#244E31]" />
            <span>Suggested Inquiries for {activeDestName}:</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt.query)}
                disabled={isLoading}
                className="shrink-0 px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#EBF2EA] text-[#1A381E] border border-[#E8E3D7] hover:border-[#D5E4D2] rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap active:scale-98 disabled:opacity-50"
              >
                {prompt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-[#FAF8F5] border-t border-[#E8E3D7] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={`Ask EcoTrace AI about ${activeDestName}...`}
              disabled={isLoading}
              className="flex-1 bg-white border border-[#E8E3D7] rounded-2xl px-4 py-3 text-xs sm:text-sm font-medium text-[#1A381E] focus:outline-hidden focus:ring-2 focus:ring-[#244E31] shadow-2xs"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className="px-5 py-3 bg-[#1A381E] hover:bg-[#244E31] text-white rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 shrink-0"
            >
              <span>Ask</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="text-[10px] text-center text-[#8C9B8B] mt-2">
            Based on verified EcoTrace database records and statutory sources.
          </div>
        </div>

      </div>
    </div>
  );
};
