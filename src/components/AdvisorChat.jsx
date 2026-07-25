import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send } from 'lucide-react';

export function AdvisorChat({ scenario, drugs }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    setMessages([]);
    setError(null);
  }, [scenario?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;
    setInput('');
    setError(null);
    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setIsSending(true);
    try {
      const res = await base44.functions.invoke('oncology-chat', {
        scenarioId: scenario.id,
        question: text,
        history: messages,
      });
      setMessages([...nextMessages, { role: 'assistant', content: res.data.answer }]);
    } catch (err) {
      const message = err?.response?.data?.error || err?.message || 'Something went wrong.';
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <Sparkles className="w-4 h-4 text-teal-600" />
        <h3 className="text-sm font-semibold text-slate-900">Oncology Advisor</h3>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[220px]">
        {messages.length === 0 && !error && (
          <p className="text-sm text-slate-400">
            Ask about mechanism of action, binding predictions, or adverse-effect tradeoffs
            for {scenario.name}. No sign-in required.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm rounded-xl px-3 py-2 max-w-[90%] whitespace-pre-wrap ${
              m.role === 'user'
                ? 'ml-auto bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-800'
            }`}
          >
            {m.content}
          </div>
        ))}
        {isSending && (
          <div className="bg-slate-100 text-slate-400 text-sm rounded-xl px-3 py-2 max-w-[90%]">
            Thinking&hellip;
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="flex gap-2 p-3 border-t border-slate-100">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Why does osimertinib spare wild-type EGFR?"
          className="flex-1"
        />
        <Button type="submit" disabled={!input.trim() || isSending} className="bg-teal-700 hover:bg-teal-800 shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
