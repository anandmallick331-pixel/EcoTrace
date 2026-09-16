import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  HelpCircle,
  Shield,
  Clock,
  Compass,
  Briefcase,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  Thermometer,
  CloudRain,
  Wind,
  CheckCircle2,
  RefreshCw,
  X,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import {
  askWeatherIntelligence,
  getProactiveWeatherGuidance,
  WeatherIntelligenceAnswer,
  WeatherIntelligenceQuestion,
  ProactiveWeatherSummary,
  TravelerLocation,
} from '../services/api';

interface WeatherIntelligenceAIProps {
  destinationId: string;
  destinationName: string;
  activityId?: string | null;
  originId?: string | null;
  selectedCorridor?: string | null;
  travelerLocation?: TravelerLocation | null;
  routeGeometry?: Array<{ lat: number; lng: number }> | null;
  routeEta?: string | null;
  sessionId?: string | null;
  onOpenEvidenceDossier?: () => void;
  onOpenWarningDetail?: (warning?: any) => void;
  onOpenForecastModal?: () => void;
  onOpenObservationModal?: () => void;
  onOpenDecisionDossier?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  answerPayload?: WeatherIntelligenceAnswer;
  timestamp: string;
}

export const WeatherIntelligenceAI: React.FC<WeatherIntelligenceAIProps> = ({
  destinationId,
  destinationName,
  activityId,
  originId,
  selectedCorridor,
  travelerLocation,
  routeGeometry,
  routeEta,
  sessionId,
  onOpenEvidenceDossier,
  onOpenWarningDetail,
  onOpenForecastModal,
  onOpenObservationModal,
  onOpenDecisionDossier,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [proactiveSummary, setProactiveSummary] = useState<ProactiveWeatherSummary | null>(null);
  const [isLoadingProactive, setIsLoadingProactive] = useState<boolean>(false);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const conversationContainerRef = useRef<HTMLDivElement>(null);
  const lastAssistantMsgCountRef = useRef<number>(0);

  // Load proactive guidance whenever destination changes
  useEffect(() => {
    let isMounted = true;
    const fetchProactive = async () => {
      setIsLoadingProactive(true);
      try {
        const data = await getProactiveWeatherGuidance(destinationId || 'puri');
        if (isMounted) {
          setProactiveSummary(data);
        }
      } catch (err) {
        console.warn('Could not fetch proactive weather guidance:', err);
      } finally {
        if (isMounted) setIsLoadingProactive(false);
      }
    };
    fetchProactive();
    return () => {
      isMounted = false;
    };
  }, [destinationId]);

  // Smoothly scroll only the assistant conversation container when a new assistant response arrives
  const assistantMsgCount = messages.filter((m) => m.sender === 'assistant').length;
  useEffect(() => {
    if (assistantMsgCount > lastAssistantMsgCountRef.current) {
      lastAssistantMsgCountRef.current = assistantMsgCount;
      if (conversationContainerRef.current) {
        const container = conversationContainerRef.current;
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, [assistantMsgCount]);

  const handleSendQuestion = async (queryText: string) => {
    const q = queryText.trim();
    if (!q || isAsking) return;

    const userMsgId = `user_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsAsking(true);

    try {
      const historyPayload = messages.map((m) => ({
        question: m.sender === 'user' ? m.text : '',
        answer: m.sender === 'assistant' ? m.text : '',
        destination_slug: m.answerPayload?.destination_id,
        activity_id: m.answerPayload?.activity_id || undefined,
        response_id: m.answerPayload?.response_id,
      }));

      const payload: WeatherIntelligenceQuestion = {
        question: q,
        destination_slug: destinationId || 'puri',
        origin_slug: originId || undefined,
        activity_id: activityId || undefined,
        session_id: sessionId || undefined,
        traveler_location: travelerLocation || undefined,
        route_geometry: routeGeometry || undefined,
        route_eta: routeEta || undefined,
        session_history: historyPayload,
      };

      const answer = await askWeatherIntelligence(payload);
      const assistantMsg: ChatMessage = {
        id: answer.response_id || `asst_${Date.now()}`,
        sender: 'assistant',
        text: answer.answer,
        answerPayload: answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: 'I can’t reliably answer that right now because verified weather evidence is temporarily unavailable.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAsking(false);
    }
  };

  // Quick Chips adapted to current destination & activity
  const getContextualChips = () => {
    const chips = [
      { id: 'should_i_go', label: 'Should I go?', prompt: `Should I go to ${destinationName}?` },
      { id: 'when_to_go', label: 'When should I go?', prompt: `What is the lower-risk time to travel to ${destinationName}?` },
      { id: 'carry', label: '🎒 What should I carry?', prompt: `What should I carry for ${destinationName}?` },
      { id: 'watch_for', label: 'What should I watch for?', prompt: `What weather hazards should I watch for in ${destinationName}?` },
    ];

    if (destinationId === 'puri') {
      chips.push({ id: 'sea_bathing', label: '🌊 Is sea bathing advisable?', prompt: 'Is sea bathing advisable in Puri today?' });
    } else if (destinationId === 'chilika') {
      chips.push({ id: 'boating', label: '⛵ What about boating?', prompt: 'Is boating advisable on Chilika Lake right now?' });
    } else if (destinationId === 'konark') {
      chips.push({ id: 'sightseeing', label: '🏛️ Is sightseeing suitable?', prompt: 'Is outdoor sightseeing suitable in Konark right now?' });
    }

    if (originId || selectedCorridor) {
      chips.push({ id: 'route_rain', label: '🛣️ Will rain affect my route?', prompt: `Will rain affect my route to ${destinationName}?` });
    }

    return chips;
  };

  const quickChips = getContextualChips();

  return (
    <div
      id="ecotrace-weather-intelligence-container"
      className="rounded-3xl border border-[#D5E4D2] bg-[#FAFBF9] p-4 sm:p-6 shadow-xs space-y-5 transition-all"
    >
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between pb-3.5 border-b border-[#E3ECE1]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#1A381E] text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5 text-[#86EFAC]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif font-bold text-sm sm:text-base text-[#1A381E] tracking-tight">
                EcoTrace Weather Intelligence
              </h3>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#EBF2EA] text-[#244E31] border border-[#D5E4D2] font-semibold">
                Weather decision assistant
              </span>
            </div>
            <p className="text-xs text-[#556755] leading-tight">
              Weather-focused answers and decisions based on EcoTrace verified weather evidence.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-xl hover:bg-[#EBF2EA] text-[#4A5D4A] hover:text-[#1A381E] transition-colors cursor-pointer"
          title={isExpanded ? 'Collapse panel' : 'Expand panel'}
          aria-label={isExpanded ? 'Collapse panel' : 'Expand panel'}
        >
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-5 animate-in fade-in">
          {/* ── SOURCE STATUS INDICATOR ── */}
          <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 rounded-xl bg-white border border-[#E3ECE1] text-[11px] text-[#4A5D4A]">
            <div className="flex items-center gap-1.5 font-medium">
              <Shield className="w-3.5 h-3.5 text-[#244E31]" />
              <span>Using the latest available verified EcoTrace weather evidence</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-[#22C55E]" />
              <span className="font-semibold text-[#1A381E]">
                {proactiveSummary?.source_status?.source_breakdown ||
                  'IMD observation unavailable • model guidance available'}
              </span>
            </div>
          </div>

          {/* ── 3. PROACTIVE SUMMARY ── */}
          {proactiveSummary && (
            <div className="rounded-2xl border border-[#D5E4D2] bg-white p-4 sm:p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1A381E] font-serif">
                  Based on current verified weather evidence:
                </span>
                <span className="text-[10px] text-[#6B7E6A] font-mono">
                  {proactiveSummary.destination_name} Corridor
                </span>
              </div>

              {/* CURRENT */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-[#F7F9F7] border border-[#E3ECE1] text-xs">
                <div>
                  <span className="text-[10px] text-[#6B7E6A] block">Temperature</span>
                  <strong className="text-[#1A381E] text-sm">{proactiveSummary.current.temperature}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B7E6A] block">Rain</span>
                  <strong className="text-[#1A381E] text-sm">{proactiveSummary.current.rain}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B7E6A] block">Wind</span>
                  <strong className="text-[#1A381E] text-sm">{proactiveSummary.current.wind}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B7E6A] block">Current Risk</span>
                  <strong className="text-[#1A381E] text-xs">{(proactiveSummary.current.risk_badge || '').replace(/SAFE/g, 'LOW')}</strong>
                </div>
              </div>

              {/* WHAT TO KNOW, WHAT TO DO, PLAN, WATCH FOR */}
              <div className="space-y-2 text-xs divide-y divide-[#F0EBE1]">
                <div className="pt-1.5 flex items-start gap-2">
                  <span className="font-bold text-[#1A381E] min-w-[95px] shrink-0 text-[11px] uppercase tracking-wide">
                    WHAT TO KNOW:
                  </span>
                  <span className="text-[#3E4F3E] leading-relaxed">{proactiveSummary.what_to_know}</span>
                </div>

                <div className="pt-2 flex items-start gap-2">
                  <span className="font-bold text-[#1A381E] min-w-[95px] shrink-0 text-[11px] uppercase tracking-wide">
                    WHAT TO DO:
                  </span>
                  <span className="text-[#3E4F3E] leading-relaxed font-medium">{proactiveSummary.what_to_do}</span>
                </div>

                <div className="pt-2 flex items-start gap-2">
                  <span className="font-bold text-[#1A381E] min-w-[95px] shrink-0 text-[11px] uppercase tracking-wide">
                    PLAN:
                  </span>
                  <span className="text-[#3E4F3E] leading-relaxed">{proactiveSummary.plan}</span>
                </div>

                <div className="pt-2 flex items-start gap-2">
                  <span className="font-bold text-[#1A381E] min-w-[95px] shrink-0 text-[11px] uppercase tracking-wide">
                    WATCH FOR:
                  </span>
                  <span className="text-[#3E4F3E] leading-relaxed">{proactiveSummary.watch_for}</span>
                </div>
              </div>

              {/* Direct evidence links */}
              <div className="pt-2 border-t border-[#EFEAE0] flex items-center justify-end gap-3 text-[11px]">
                {onOpenForecastModal ? (
                  <button
                    onClick={onOpenForecastModal}
                    className="text-[#244E31] font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>View forecast details</span>
                    <span>→</span>
                  </button>
                ) : (
                  <span className="text-[#8E8779] italic">Forecast details unavailable</span>
                )}
                {onOpenEvidenceDossier ? (
                  <button
                    onClick={onOpenEvidenceDossier}
                    className="text-[#1A381E] font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>View Evidence Dossier</span>
                    <span>→</span>
                  </button>
                ) : (
                  <span className="text-[#8E8779] italic">Evidence dossier unavailable</span>
                )}
              </div>
            </div>
          )}

          {/* ── 4. CONVERSATIONAL MESSAGES STREAM ── */}
          {messages.length > 0 && (
            <div
              ref={conversationContainerRef}
              id="weather-intelligence-messages-container"
              className="space-y-3 max-h-[400px] overflow-y-auto pr-1"
            >
              {messages.map((msg) => {
                if (msg.sender === 'user') {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl bg-[#1A381E] text-white px-4 py-2.5 text-xs shadow-xs space-y-1">
                        <p className="leading-relaxed">{msg.text}</p>
                        <span className="text-[9px] text-[#A7C2A5] block text-right font-mono">{msg.timestamp}</span>
                      </div>
                    </div>
                  );
                }

                // Assistant structured response
                const payload = msg.answerPayload;
                const refs = [...(payload?.evidence_refs || []), ...(payload?.source_refs || [])];
                const aType = (payload?.answer_type as string) || '';
                const hasWarningRef = refs.some((r) => /warning|alert|bulletin/i.test(r)) || aType === 'WARNING_EXPLANATION';
                const hasForecastRef = refs.some((r) => /forecast|nwp|outlook|timeline/i.test(r)) || aType === 'FORECAST_QUERY' || aType === 'TIME_WINDOW' || aType === 'DEPARTURE_TIME';
                const hasStationRef = refs.some((r) => /station|telemetry|sensor|gauge|observation/i.test(r)) || aType === 'CURRENT_WEATHER' || aType === 'WEATHER_SUMMARY';
                const hasDecisionRef = refs.some((r) => /decision|should_i_go|risk/i.test(r)) || aType === 'TRAVEL_DECISION' || aType === 'ACTIVITY_DECISION' || aType === 'ACTIVITY_SUITABILITY';

                const handleEvidenceClick = () => {
                  if (hasWarningRef && onOpenWarningDetail) {
                    onOpenWarningDetail();
                  } else if (hasForecastRef && onOpenForecastModal) {
                    onOpenForecastModal();
                  } else if (hasStationRef && onOpenObservationModal) {
                    onOpenObservationModal();
                  } else if (hasDecisionRef && onOpenDecisionDossier) {
                    onOpenDecisionDossier();
                  } else if (onOpenEvidenceDossier) {
                    onOpenEvidenceDossier();
                  }
                };

                return (
                  <div key={msg.id} className="flex justify-start">
                    <div className="max-w-[95%] w-full rounded-2xl bg-white border border-[#D5E4D2] p-4 text-xs shadow-2xs space-y-3 text-[#1A381E]">
                      {/* Response Type & Timestamp */}
                      <div className="flex items-center justify-between flex-wrap gap-1 border-b border-[#EFEAE0] pb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#244E31] bg-[#EBF2EA] px-2 py-0.5 rounded border border-[#D5E4D2]">
                          {payload?.answer_type?.replace('_', ' ') || 'WEATHER INTELLIGENCE'}
                        </span>
                        <span className="text-[10px] text-[#6B7E6A] font-mono">
                          {payload?.destination_name || destinationName} · {msg.timestamp}
                        </span>
                      </div>

                      {/* Main Answer Headline */}
                      <div>
                        <h4 className="font-serif font-bold text-sm text-[#1A381E] leading-snug">
                          {payload?.answer || msg.text}
                        </h4>
                      </div>

                      {/* Structured breakdown if available */}
                      {payload && (
                        <div className="space-y-2 text-xs bg-[#FAFBF9] p-3 rounded-xl border border-[#EFEAE0]">
                          {payload.why && (
                            <div>
                              <strong className="text-[#1A381E] text-[11px] block">WHY:</strong>
                              <p className="text-[#3E4F3E] leading-relaxed">{payload.why}</p>
                            </div>
                          )}

                          {payload.what_to_do && (
                            <div className="pt-1.5 border-t border-[#EFEAE0]/80">
                              <strong className="text-[#1A381E] text-[11px] block">WHAT TO DO:</strong>
                              <p className="text-[#3E4F3E] leading-relaxed font-medium">{payload.what_to_do}</p>
                            </div>
                          )}

                          {payload.what_to_watch && (
                            <div className="pt-1.5 border-t border-[#EFEAE0]/80">
                              <strong className="text-[#1A381E] text-[11px] block">WHAT TO WATCH:</strong>
                              <p className="text-[#3E4F3E] leading-relaxed">{payload.what_to_watch}</p>
                            </div>
                          )}

                          {/* Packing list items */}
                          {payload.structured_data?.items && payload.structured_data.items.length > 0 && (
                            <div className="pt-2 border-t border-[#EFEAE0]/80 space-y-1.5">
                              <strong className="text-[#1A381E] text-[11px] block">RECOMMENDED ITEMS:</strong>
                              <ul className="space-y-1 pl-1">
                                {payload.structured_data.items.map((it, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5 text-xs text-[#244E31]">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0 mt-0.5" />
                                    <span>
                                      <strong>{it.item}</strong> — <span className="text-[#556755]">{it.reason}</span>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Precaution items */}
                          {payload.structured_data?.precautions && payload.structured_data.precautions.length > 0 && (
                            <div className="pt-2 border-t border-[#EFEAE0]/80 space-y-1.5">
                              <strong className="text-[#1A381E] text-[11px] block">SPECIFIC PRECAUTIONS:</strong>
                              <ul className="space-y-1 pl-1">
                                {payload.structured_data.precautions.map((p, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5 text-xs text-[#991B1B]">
                                    <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626] shrink-0 mt-0.5" />
                                    <span>
                                      <strong>{p.title}:</strong> <span className="text-[#4A5D4A]">{p.detail}</span>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Evidence footer */}
                      <div className="pt-1.5 border-t border-[#EFEAE0] flex items-center justify-between flex-wrap gap-2 text-[10px] text-[#6B7E6A]">
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-3 h-3 text-[#244E31]" />
                          <span>Confidence: <strong>{payload?.confidence || 'HIGH'}</strong></span>
                          <span>·</span>
                          <span>Sources: <strong>{payload?.source_refs?.join(', ') || 'VERIFIED_ECOTRACE'}</strong></span>
                        </div>

                        <div className="flex items-center gap-2">
                          {onOpenEvidenceDossier || onOpenForecastModal || onOpenWarningDetail || onOpenObservationModal || onOpenDecisionDossier ? (
                            <button
                              onClick={handleEvidenceClick}
                              className="text-[#244E31] font-bold hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <span>View evidence</span>
                              <span>→</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-[#8E8779] italic">Evidence unavailable</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {isAsking && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-white border border-[#D5E4D2] p-3.5 text-xs text-[#4A5D4A] flex items-center gap-2 shadow-2xs">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#244E31]" />
                    <span>Evaluating verified meteorological evidence...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 5. QUICK QUESTION CHIPS ── */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7E6A] font-serif block">
              Quick Decision Prompts:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickChips.map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => handleSendQuestion(chip.prompt)}
                  disabled={isAsking}
                  className="text-xs font-medium px-3 py-1.5 rounded-xl bg-white border border-[#D5E4D2] text-[#1A381E] hover:bg-[#EBF2EA] hover:border-[#244E31] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── 6. NATURAL LANGUAGE INPUT BAR ── */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuestion(inputQuery);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask EcoTrace Weather Intelligence (e.g. Will it rain? Should I leave now?)"
                disabled={isAsking}
                className="w-full text-xs sm:text-sm px-4 py-2.5 rounded-2xl bg-white border border-[#D5E4D2] text-[#1A381E] placeholder:text-[#889B87] focus:outline-hidden focus:ring-2 focus:ring-[#244E31]/20 focus:border-[#244E31] transition-all shadow-2xs disabled:bg-gray-50"
              />
            </div>
            <button
              type="submit"
              disabled={!inputQuery.trim() || isAsking}
              className="px-4 py-2.5 rounded-2xl bg-[#1A381E] hover:bg-[#244E31] text-white text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center shadow-xs shrink-0"
              title="Submit question"
              aria-label="Submit question"
            >
              <Send className="w-4 h-4 text-[#86EFAC]" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
