import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
}

interface ChatbotPanelProps {
  context: Record<string, any>;
}

export default function ChatbotPanel({ context }: ChatbotPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: '¡Hola! Soy tu asistente de IA especializado en bioinformática. He recibido los datos de la estructura actual. ¿En qué puedo ayudarte hoy?',
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const response = await api.askGemini(userMessage, context);
      setMessages(prev => [
        ...prev, 
        { id: (Date.now() + 1).toString(), sender: 'ai', text: response.reply || 'Sin respuesta.' }
      ]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev, 
        { id: (Date.now() + 1).toString(), sender: 'ai', text: 'Ups, parece que hubo un error conectando con la IA.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const overrideComponents = {
    // Styling the markdown components to match our aesthetic
    p: ({node, ...props}: any) => <p style={{ margin: '0 0 10px 0', lineHeight: '1.5' }} {...props} />,
    a: ({node, ...props}: any) => <a style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }} {...props} />,
    code: ({node, inline, ...props}: any) => (
      inline ? 
      <code style={{ background: 'var(--bg-surface-hover)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.85em', color: '#ff7d45' }} {...props} /> :
      <pre style={{ background: 'var(--bg-color-main)', padding: '12px', borderRadius: '8px', overflowX: 'auto', marginBottom: '10px', fontSize: '0.9em' }}>
        <code style={{ fontFamily: 'monospace' }} {...props} />
      </pre>
    ),
    ul: ({node, ...props}: any) => <ul style={{ paddingLeft: '20px', margin: '0 0 10px 0' }} {...props} />,
    ol: ({node, ...props}: any) => <ol style={{ paddingLeft: '20px', margin: '0 0 10px 0' }} {...props} />,
    li: ({node, ...props}: any) => <li style={{ marginBottom: '4px' }} {...props} />,
    h1: ({node, ...props}: any) => <h1 style={{ fontSize: '1.4em', marginBottom: '12px', color: 'var(--accent-cyan)' }} {...props} />,
    h2: ({node, ...props}: any) => <h2 style={{ fontSize: '1.2em', marginBottom: '10px', color: 'var(--text-primary)' }} {...props} />,
    h3: ({node, ...props}: any) => <h3 style={{ fontSize: '1.1em', marginBottom: '8px', color: 'var(--text-primary)' }} {...props} />,
    table: ({node, ...props}: any) => <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }} {...props} /></div>,
    th: ({node, ...props}: any) => <th style={{ borderBottom: '1px solid var(--border-color)', padding: '8px', textAlign: 'left', color: 'var(--accent-cyan)' }} {...props} />,
    td: ({node, ...props}: any) => <td style={{ borderBottom: '1px solid var(--border-color)', padding: '8px' }} {...props} />
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '700px',
      background: 'var(--bg-surface)',
      borderRadius: '16px',
      border: '1px solid var(--border-color)',
      boxShadow: 'var(--glass-shadow)',
      backdropFilter: 'blur(12px)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'var(--bg-surface-hover)'
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'linear-gradient(135deg, var(--accent-cyan), #0053d6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 15px rgba(101, 203, 243, 0.3)'
        }}>
          <Bot size={20} color="#fff" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 600, letterSpacing: '0.5px' }}>Gemini IA</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-cyan)', display: 'inline-block', boxShadow: '0 0 8px var(--accent-cyan)' }}></span>
            Conectado al contexto
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{
            display: 'flex',
            gap: '12px',
            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%'
          }}>
            {msg.sender === 'ai' && (
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'rgba(101, 203, 243, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: '4px', border: '1px solid rgba(101,203,243,0.3)'
              }}>
                <Bot size={16} color="var(--accent-cyan)" />
              </div>
            )}
            
            <div style={{
              padding: '14px 18px',
              borderRadius: msg.sender === 'user' ? '18px 18px 0 18px' : '18px 18px 18px 0',
              background: msg.sender === 'user' 
                ? 'linear-gradient(135deg, rgba(101,203,243,0.15), rgba(0,83,214,0.15))' 
                : 'var(--bg-color-main)',
              border: '1px solid',
              borderColor: msg.sender === 'user' ? 'rgba(101,203,243,0.3)' : 'var(--border-color)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
              color: 'var(--text-primary)',
              fontSize: '0.95rem'
            }}>
              {msg.sender === 'ai' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={overrideComponents}>
                  {msg.text}
                </ReactMarkdown>
              ) : (
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{msg.text}</div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'var(--bg-surface-hover)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: '4px'
              }}>
                <User size={16} color="var(--text-secondary)" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start', maxWidth: '85%' }}>
             <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'rgba(101, 203, 243, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: '4px'
              }}>
                <Bot size={16} color="var(--accent-cyan)" />
              </div>
              <div style={{
                padding: '16px', borderRadius: '18px 18px 18px 0',
                background: 'var(--bg-color-main)',
                border: '1px solid var(--border-color)',
                color: 'var(--accent-cyan)',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.9rem' }}>Analizando...</span>
                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
              </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '16px',
        background: 'var(--bg-surface-hover)',
        borderTop: '1px solid var(--border-color)'
      }}>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta sobre esta proteína..."
            disabled={isLoading}
            style={{
              flex: 1,
              background: 'var(--bg-color-main)',
              border: '1px solid var(--border-color)',
              borderRadius: '24px',
              padding: '12px 20px',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              outline: 'none',
              transition: 'all 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent-cyan)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: input.trim() && !isLoading ? 'linear-gradient(135deg, var(--accent-cyan), #0053d6)' : 'var(--bg-color-main)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              color: input.trim() && !isLoading ? '#fff' : 'var(--text-secondary)',
              boxShadow: input.trim() && !isLoading ? '0 4px 15px rgba(101, 203, 243, 0.4)' : 'none'
            }}
          >
            <Send size={18} style={{ marginLeft: '4px' }} />
          </button>
        </form>
      </div>
    </div>
  );
}
