import React, { useState } from 'react';
import { MessageCircle, Send, X, Loader2 } from 'lucide-react';

interface Msg { role: 'user' | 'assistant'; text: string; }

export default function AIAssistant({ token }: { token: string | null }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', text: 'Hi! Ask me about stations, destinations, or routes.' }]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text }]);
    setLoading(true);
    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { role: 'assistant', text: data?.reply || 'Sorry, no response.' }]);
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', text: 'Network error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        id="btn-ai-assistant"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 bg-[#4f46e5] hover:bg-[#4338ca] text-white p-3.5 rounded-full shadow-lg cursor-pointer"
        aria-label="AI assistant"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
      {open && (
        <div id="ai-assistant-panel" className="fixed bottom-20 right-5 z-40 w-[340px] max-w-[calc(100vw-40px)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-[#4f46e5] text-white">
            <span className="text-sm font-bold">AI Route Assistant</span>
            <button type="button" onClick={() => setOpen(false)} className="cursor-pointer"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 max-h-72 overflow-y-auto p-3 space-y-2 text-xs">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <span className={`inline-block px-3 py-2 rounded-xl ${m.role === 'user' ? 'bg-[#4f46e5] text-white' : 'bg-slate-100 text-slate-700'}`}>{m.text}</span>
              </div>
            ))}
            {loading && <div className="text-left"><span className="inline-block px-3 py-2 rounded-xl bg-slate-100 text-slate-500"><Loader2 className="h-3 w-3 animate-spin inline" /></span></div>}
          </div>
          <div className="p-3 border-t border-slate-100 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
              placeholder="Ask about a station or destination..."
              className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#4f46e5]"
            />
            <button type="button" onClick={send} disabled={loading} className="bg-[#4f46e5] hover:bg-[#4338ca] text-white p-2 rounded-xl cursor-pointer disabled:opacity-50">
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
