import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, User, ShieldAlert, Clock, Calendar, CheckCircle2, ChevronRight } from 'lucide-react';
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
      text: `Hello! I am your **HCM Lite AI Assistant**. You are operating in **${user?.role || 'Guest'}** scope. Ask me questions about attendance, leaves, headcounts, policies, or request leave in plain words.`,
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
      'What is colleague’s salary?',
      'What is my salary?',
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
      // Check if it looks like a smart leave request
      const lower = textToSend.toLowerCase();
      const isLeavePhrase = lower.includes('chutti') || lower.includes('leave') || lower.includes('off for') || lower.includes('vacation') || lower.includes('wedding');

      let smartLeaveData: any = null;
      if (isLeavePhrase && (lower.includes('need') || lower.includes('chahiye') || lower.includes('want') || lower.includes('next') || lower.includes('tomorrow'))) {
        try {
          const smartRes = await api.post('/ai/smart-leave', { prompt: textToSend });
          smartLeaveData = smartRes.parsed;
        } catch (e) {
          // ignore smart leave parse failure
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
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center space-x-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
      >
        <div className="relative">
          <Bot className="w-5 h-5 text-white" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse border-2 border-indigo-700" />
        </div>
        <span>Ask AI Assistant</span>
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-[460px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm tracking-wide">HCM Lite AI Assistant</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/20 font-mono uppercase font-bold">
                  {user?.role || 'User'}
                </span>
              </div>
              <p className="text-[11px] text-blue-100">Live Tool Calling · Strict Policy Scoping</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center space-x-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Suggested Prompts:</span>
          {(quickQuestions[user?.role || 'Employee'] || []).map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-xs px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 text-slate-700 dark:text-slate-300 transition shrink-0"
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
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                {/* Format markdown bold / bullets */}
                <div className="whitespace-pre-wrap space-y-1">
                  {msg.text}
                </div>

                {/* Smart Leave Pre-fill Action */}
                {msg.smartLeaveData && (
                  <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">✨ Smart Leave Extracted</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-200 dark:bg-emerald-800 font-medium">
                        {msg.smartLeaveData.days_count} Working Days
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      {msg.smartLeaveData.leave_type_name} Leave: {msg.smartLeaveData.start_date} to {msg.smartLeaveData.end_date}
                    </p>
                    {onPreFillLeave && (
                      <button
                        onClick={() => {
                          onPreFillLeave(msg.smartLeaveData);
                          setIsOpen(false);
                        }}
                        className="mt-2 w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center space-x-1"
                      >
                        <span>Pre-fill & Apply Now</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Message metadata */}
              <div className="flex items-center space-x-2 mt-1 text-[10px] text-slate-400 px-1">
                <span>{msg.timestamp}</span>
                {msg.toolCalled && (
                  <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded font-mono">
                    tool: {msg.toolCalled}
                  </span>
                )}
                {msg.sender === 'ai' && (
                  <span className="text-[10px] text-indigo-500 font-semibold">AI-generated</span>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2 text-slate-400 text-xs p-2">
              <Sparkles className="w-4 h-4 animate-spin text-blue-500" />
              <span>AI is thinking & querying verified tools...</span>
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
          className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center space-x-2"
        >
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask question or apply leave in plain words..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </>
  );
}

