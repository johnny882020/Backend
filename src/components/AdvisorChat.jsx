import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send } from 'lucide-react';

export function AdvisorChat({ scenario, drugs }) {
  const [conversation, setConversation] = useState(null);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const unsubscribeRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    setConversation(null);
    if (unsubscribeRef.current) unsubscribeRef.current();
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
    };
  }, [scenario?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages?.length]);

  const ensureConversation = async () => {
    if (conversation) return conversation;
    const conv = await base44.agents.createConversation({
      agent_name: 'oncology_advisor',
      metadata: { scenario_id: scenario.id, scenario_name: scenario.name },
    });
    unsubscribeRef.current = base44.agents.subscribeToConversation(conv.id, (updated) => {
      setConversation(updated);
    });
    setConversation(conv);
    return conv;
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;
    setInput('');
    setIsSending(true);
    try {
      const conv = await ensureConversation();
      const isFirstMessage = !conv.messages || conv.messages.length === 0;
      const drugList = drugs.map((d) => d.name).join(', ');
      const content = isFirstMessage
        ? `Scenario: "${scenario.name}" (${scenario.cancer_type}). Target: ${scenario.target_name} (PDB ${scenario.target_pdb_id}). Candidate drugs: ${drugList}.\n\nQuestion: ${text}`
        : text;
      await base44.agents.addMessage(conv, { role: 'user', content });
    } finally {
      setIsSending(false);
    }
  };

  const messages = conversation?.messages?.filter((m) => !m.hidden) ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <Sparkles className="w-4 h-4 text-teal-600" />
        <h3 className="text-sm font-semibold text-slate-900">Oncology Advisor</h3>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[220px]">
        {messages.length === 0 && (
          <p className="text-sm text-slate-400">
            Ask about mechanism of action, binding predictions, or adverse-effect tradeoffs
            for {scenario.name}.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`text-sm rounded-xl px-3 py-2 max-w-[90%] whitespace-pre-wrap ${
              m.role === 'user'
                ? 'ml-auto bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-800'
            }`}
          >
            {typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}
          </div>
        ))}
        {isSending && (
          <div className="bg-slate-100 text-slate-400 text-sm rounded-xl px-3 py-2 max-w-[90%]">
            Thinking&hellip;
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
