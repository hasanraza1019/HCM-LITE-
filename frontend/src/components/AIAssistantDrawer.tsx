import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, User, ShieldAlert, Clock, Calendar, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  toolCalled?: string | null;
  latencyMs?: number;
  timestamp: string;
  smartLeaveData?: any;
}

interface AIAssistantDrawerProps {
  onPreFillLeave?: (leaveData: any) => void;
}

export function AIAssistantDrawer({ onPreFillLeave }: AIAssistantDrawerProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Hello! I am your **HCM Lite AI Copilot**. You are operating in **${user?.role || 'Guest'}** scope.\n\nAsk me about attendance trends, leave quotas, who is out today, or request leaves in natural language (Roman Urdu or English).`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const quickQuestions: Record<string, string[]> = {
    Admin: [
      'What is this month’s attendance rate?',
      'Who is on leave today?',
      'Who came late most often this month?',
      'What is the company payroll summary?'
    ],
    HR: [
      'How many active employees are in Engineering?',
      'Who came late most often this month?',
      'What is this month’s attendance rate?',
      'Who is on leave today?'
    ],
    Employee: [
      'How many sick leaves do I have left this year?',
      'What is my salary breakdown?',
      'What is colleague’s salary?',
      'Need next Monday and Tuesday off for sister’s wedding',
      'Bhai ki shadi hai aglay peer chutti chahiye'
    ]
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!messageText) setInput('');
    setLoading(true);

    try {
      const lower = textToSend.toLowerCase();
      const isLeavePhrase = lower.includes('chutti') || lower.includes('leave') || lower.includes('off for') || lower.includes('vacation') || lower.includes('wedding');

      let smartLeaveData: any = null;
      if (isLeavePhrase && (lower.includes('need') || lower.includes('chahiye') || lower.includes('want') || lower.includes('next') || lower.includes('tomorrow'))) {
        try {
          const smartRes = await api.post('/ai/smart-leave', { prompt: textToSend });
          smartLeaveData = smartRes.parsed;
        } catch (e) {
          // ignore
        }
      }

      const res = await api.post('/ai/chat', { message: textToSend });

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: res.answer,
        toolCalled: res.toolCalled,
        latencyMs: res.latencyMs,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        smartLeaveData
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: `⚠️ **AI Service Notice:** ${err.message || 'Could not complete request. Please try again.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Radiant Floating Trigger Pill */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 group inline-flex items-center space-x-2.5 px-5 py-3.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-xl shadow-indigo-500/35 hover:shadow-2xl hover:shadow-purple-500/40 hover:scale-105 active:scale-95 transition-all duration-300 ring-2 ring-white/20 dark:ring-white/10"
      >
        <div className="relative">
          <Bot className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-300" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white" />
        </div>
        <span className="tracking-wide">AI Copilot</span>
        <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] uppercase font-mono font-extrabold tracking-widest">
          GPT / Tool
        </span>
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 transition-opacity animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Cyber Glass Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-[480px] glass-panel bg-white/95 dark:bg-slate-900/95 border-l border-slate-200 dark:border-slate-800 z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Futuristic Gradient Header */}
        <div className="p-4 border-b border-white/10 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-sm tracking-wide">HCM Lite AI Copilot</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 font-bold uppercase tracking-wider">
                  {user?.role || 'Guest'}
                </span>
              </div>
              <p className="text-[11px] text-blue-100/90 flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Tool Calling & Deterministic Safeguards
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2.5 bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800/80 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
            <Zap className="w-3 h-3" />
            <span>Prompts:</span>
          </div>
          {(quickQuestions[user?.role || 'Employee'] || []).map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-xs px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-300 text-slate-700 dark:text-slate-300 shadow-xs transition-all duration-150 shrink-0 font-medium"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}
            >
              <div
                className={`max-w-[88%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs shadow-md shadow-indigo-500/20'
                    : 'glass-card text-slate-800 dark:text-slate-100 rounded-bl-xs border border-slate-200/80 dark:border-slate-700/80'
                }`}
              >
                <div className="whitespace-pre-wrap space-y-1.5 font-normal">
                  {msg.text}
                </div>

                {/* Smart Leave Pre-fill Interactive Card */}
                {msg.smartLeaveData && (
                  <div className="mt-3.5 p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 shadow-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-extrabold text-xs flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Smart Leave Application</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                        {msg.smartLeaveData.days_count} Working Days
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      <b>{msg.smartLeaveData.leave_type_name} Leave:</b> {msg.smartLeaveData.start_date} → {msg.smartLeaveData.end_date}
                    </p>
                    {onPreFillLeave && (
                      <button
                        onClick={() => {
                          onPreFillLeave(msg.smartLeaveData);
                          setIsOpen(false);
                        }}
                        className="mt-2.5 w-full py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20 transition-all duration-200"
                      >
                        <span>Apply in Leave Portal</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Message Metadata */}
              <div className="flex items-center space-x-2 mt-1 text-[10px] text-slate-400 px-1 font-mono">
                <span>{msg.timestamp}</span>
                {msg.toolCalled && (
                  <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-md border border-indigo-200/50 dark:border-indigo-800/50">
                    tool: {msg.toolCalled} {msg.latencyMs ? `(${msg.latencyMs}ms)` : ''}
                  </span>
                )}
                {msg.sender === 'ai' && (
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">Verified AI</span>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2.5 text-slate-500 dark:text-slate-400 text-xs p-3 glass-card rounded-2xl w-fit">
              <Sparkles className="w-4 h-4 animate-spin text-indigo-600" />
              <span className="font-medium">AI Copilot is reasoning & querying company tools...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3.5 border-t border-slate-200/80 dark:border-slate-800/80 glass-panel flex items-center space-x-2"
        >
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask question or apply leave in Roman Urdu or English..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-indigo-500/25 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </>
  );
}
