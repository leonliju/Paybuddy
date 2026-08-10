import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import API from '../services/api';

const CHIPS = [
  "How much did I spend on Food last month?",
  "Which category should I cut to save more?",
  "What are my biggest expenses?",
  "Do I have any unusual transactions?",
  "Am I on track with my savings goals?",
];

export default function Assistant() {
  const [messages, setMessages] = useState([
    { role:'bot', text:'Hi! I am PayBuddy, your personal finance assistant. Ask me anything about your transactions, spending patterns, or savings goals. I will answer based strictly on your own financial data.' }
  ]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  const send = async (text) => {
    const question = text || input.trim();
    if (!question) return;
    setInput('');
    setMessages(m => [...m, { role:'user', text:question }]);
    setLoading(true);
    try {
      const res = await API.post('/assistant/ask', { question });
      setMessages(m => [...m, {
        role:'bot', text:res.data.answer,
        source:res.data.source
      }]);
    } catch {
      setMessages(m => [...m, {
        role:'bot',
        text:'Sorry, I could not process that question. Please try again.',
        source:'error'
      }]);
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-title">AI Assistant</div>

      {/* Suggested questions */}
      <div className="chat-chips">
        {CHIPS.map((c,i) => (
          <div key={i} className="chip" onClick={() => send(c)}>{c}</div>
        ))}
      </div>

      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((m,i) => (
            <div key={i}>
              <div className={`chat-bubble ${m.role}`}>{m.text}</div>
              {m.role==='bot' && m.source && (
                <div className="chat-source" style={{
                  textAlign:'left', paddingLeft:4, marginTop:2
                }}>
                  {m.source==='gemini' ? '🤖 Powered by Gemini AI'
                   : m.source==='fallback' ? '📊 Data summary (AI unavailable)'
                   : m.source==='error' ? '⚠️ Error'
                   : '📊 Based on your transaction data'}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="chat-bubble bot">
              <div className="typing">
                <span/><span/><span/>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="chat-input-row">
          <input
            className="form-control"
            style={{ flex:1 }}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key==='Enter' && !loading && send()}
            placeholder="Ask about your finances..."
            disabled={loading}
          />
          <button className="btn btn-primary" onClick={() => send()} disabled={loading}>
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}