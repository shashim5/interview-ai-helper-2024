import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

interface AISession {
  id: string;
  question: string;
  response: string;
  isListening: boolean;
  transcript: string;
  lastSimulationStep: number;
}

const API_KEY = 'AIzaSyDfbugjoSRGIb40hn4JoxT8kLL39tIzCzM';
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

const styles = {
  container: {
    minHeight: '100vh',
    padding: '40px 20px',
    backgroundColor: '#020617',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundImage: 'radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '60px',
    position: 'relative',
  },
  header: {
    textAlign: 'center',
    color: '#fff',
    fontSize: '2.25rem',
    fontWeight: '700',
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
    marginBottom: '20px',
  },
  transcriptArea: {
    width: '100%',
    maxWidth: '800px',
    padding: '32px',
    background: 'linear-gradient(to bottom, #1F2937, #111827)',
    borderRadius: '24px',
    color: '#fff',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    fontSize: '1.2rem',
    lineHeight: 1.7,
    position: 'relative',
    zIndex: 2,
  },
  horizontalScroll: {
    width: '100%',
    maxWidth: 'calc(100vw - 80px)',
    overflowX: 'auto',
    display: 'flex',
    gap: '30px',
    padding: '40px',
    scrollSnapType: 'x mandatory',
    position: 'relative',
    scrollBehavior: 'smooth',
    msOverflowStyle: 'none',
    scrollbarWidth: 'none',
    '&::-webkit-scrollbar': {
      display: 'none'
    }
  },
  aiCard: {
    minWidth: '350px',
    maxWidth: '350px',
    padding: '20px',
    background: 'linear-gradient(to bottom, #1F2937, #111827)',
    borderRadius: '24px',
    color: '#fff',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    fontSize: '1.2rem',
    lineHeight: 1.7,
    position: 'relative',
    scrollSnapAlign: 'center',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    overflow: 'visible',
    flex: '0 0 auto',
    zIndex: 1,
  },
  cardButton: {
    position: 'absolute',
    top: '10px',
    background: 'rgba(0, 0, 0, 0.8)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    cursor: 'pointer',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    color: '#fff',
    transition: 'all 0.2s ease-in-out',
    zIndex: 9999,
    borderRadius: '50%',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
    '&:hover': {
      transform: 'scale(1.1)',
      boxShadow: '0 6px 12px rgba(0, 0, 0, 0.4)',
    }
  },
  deleteButton: {
    right: '10px',
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
    '&:hover': {
      backgroundColor: 'rgba(255, 0, 0, 0.4)',
      color: '#fff',
    },
  },
  historyButton: {
    right: '55px',
    backgroundColor: 'rgba(0, 0, 255, 0.2)',
    '&:hover': {
      backgroundColor: 'rgba(0, 0, 255, 0.4)',
      color: '#fff',
    },
  },
  button: {
    padding: '14px 32px',
    background: 'linear-gradient(to bottom, #6366F1, #4338CA)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '1.1rem',
    fontWeight: '600',
    boxShadow: '0 8px 16px -2px rgba(79, 70, 229, 0.4)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  addButton: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'linear-gradient(to bottom, #6366F1, #4338CA)',
    color: '#fff',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.3s ease',
    zIndex: 1000,
    boxShadow: '0 8px 16px -2px rgba(79, 70, 229, 0.4)',
  },
  addButtonHover: {
    transform: 'scale(1.1)',
    background: 'linear-gradient(to bottom, #4F46E5, #3730A3)',
  }
} as const;

const App: React.FC = () => {
  const [aiSessions, setAiSessions] = useState<AISession[]>(() => {
    const savedSessions = localStorage.getItem('aiSessions');
    return savedSessions ? JSON.parse(savedSessions) : [];
  });
  const [historySessions, setHistorySessions] = useState<AISession[]>(() => {
    const savedHistory = localStorage.getItem('historySessions');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });
  const [isHovered, setIsHovered] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeSessionIndex, setActiveSessionIndex] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const lastTranscriptRef = useRef('');
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const simulationIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    console.log('Sessions updated:', aiSessions);
  }, [aiSessions]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const addNewSession = () => {
    console.log('Adding new session...');
    const newSession: AISession = {
      id: Math.random().toString(36).substr(2, 9),
      question: '',
      response: '🎙️ Click "Start Listening" to begin recording your interview questions.',
      isListening: false,
      transcript: '',
      lastSimulationStep: 0
    };
    setAiSessions(prev => {
      const updatedSessions = [...prev, newSession];
      localStorage.setItem('aiSessions', JSON.stringify(updatedSessions));
      return updatedSessions;
    });
    setActiveTab('current');
  };

  const deleteSession = (index: number, isHistory: boolean = false) => {
    if (isHistory) {
      setHistorySessions(prev => {
        const updatedSessions = prev.filter((_, i) => i !== index);
        localStorage.setItem('historySessions', JSON.stringify(updatedSessions));
        return updatedSessions;
      });
    } else {
      setAiSessions(prev => {
        const updatedSessions = prev.filter((_, i) => i !== index);
        localStorage.setItem('aiSessions', JSON.stringify(updatedSessions));
        return updatedSessions;
      });
    }
  };

  const moveToHistory = (index: number) => {
    setAiSessions(prev => {
      const sessionToMove = prev[index];
      setHistorySessions(prevHistory => {
        const updatedHistory = [...prevHistory, sessionToMove];
        localStorage.setItem('historySessions', JSON.stringify(updatedHistory));
        return updatedHistory;
      });
      const updatedSessions = prev.filter((_, i) => i !== index);
      localStorage.setItem('aiSessions', JSON.stringify(updatedSessions));
      return updatedSessions;
    });
  };

  const stopSession = (sessionId: string) => {
    setAiSessions(prev => {
      const session = prev.find(s => s.id === sessionId);
      if (!session) return prev;

      if (simulationIntervalRef.current) {
        window.clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }

      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      const updatedSession = {
        ...session,
        isListening: false,
        response: '✅ Session completed and saved to history'
      };

      setHistorySessions(prevHistory => {
        const updatedHistory = [...prevHistory, updatedSession];
        localStorage.setItem('historySessions', JSON.stringify(updatedHistory));
        return updatedHistory;
      });

      const updatedSessions = prev.filter(s => s.id !== sessionId);
      localStorage.setItem('aiSessions', JSON.stringify(updatedSessions));
      setCurrentSessionId(null);
      return updatedSessions;
    });
  };

  const toggleListening = (sessionId: string) => {
    const session = aiSessions.find(s => s.id === sessionId);
    if (session?.isListening) {
      setIsRecording(false);
      setCurrentSessionId(null);
      setAiSessions(prev => {
        const updatedSessions = prev.map(s =>
          s.id === sessionId ? {
            ...s,
            isListening: false,
            response: '⏸️ Session paused - Click Start Listening to resume'
          } : s
        );
        localStorage.setItem('aiSessions', JSON.stringify(updatedSessions));
        return updatedSessions;
      });
    } else {
      setIsRecording(true);
      setCurrentSessionId(sessionId);
    }
  };

  const formatCodeBlock = (text: string): React.ReactNode => {
    if (!text.includes('```')) return text;

    const parts = text.split('```');
    if (parts.length < 2) return text;

    const codeContent = parts[1].trim();
    try {
      const highlighted = hljs.highlightAuto(codeContent);
      return (
        <pre className="code-block">
          <code
            dangerouslySetInnerHTML={{ __html: highlighted.value }}
            style={{
              display: 'block',
              padding: '1rem',
              lineHeight: '1.5',
              tabSize: 4
            }}
          />
        </pre>
      );
    } catch (error) {
      return <pre className="code-block"><code>{codeContent}</code></pre>;
    }
  };

  return (
    <div style={styles.container as React.CSSProperties}>
      <button
        onClick={addNewSession}
        style={{
          ...styles.addButton,
          ...(isHovered ? styles.addButtonHover : {})
        } as React.CSSProperties}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        +
      </button>

      <div style={styles.header as React.CSSProperties}>
        <h1>Interview AI Helper</h1>
        <p>Your real-time interview assistant</p>
      </div>

      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '20px',
        alignItems: 'center'
      } as React.CSSProperties}>
        {currentSessionId && (
          <button
            onClick={() => stopSession(currentSessionId)}
            style={{
              ...styles.button,
              backgroundColor: '#dc3545',
              marginRight: '20px'
            } as React.CSSProperties}
          >
            Stop Session
          </button>
        )}
        <button
          onClick={() => setActiveTab('current')}
          style={{
            ...styles.button,
            opacity: activeTab === 'current' ? 1 : 0.7
          } as React.CSSProperties}
        >
          Current Session
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            ...styles.button,
            opacity: activeTab === 'history' ? 1 : 0.7
          } as React.CSSProperties}
        >
          History
        </button>
      </div>

      <div
        className="horizontal-scroll-container scroll-fade-edges"
        style={{
          ...styles.horizontalScroll,
          position: 'relative'
        } as React.CSSProperties}
      >
        {activeTab === 'current' && (
          <div style={{ display: 'flex', gap: '20px', padding: '20px', overflowX: 'auto' }}>
            {aiSessions.map((session, index) => (
              <div
                key={session.id}
                style={{
                  ...styles.aiCard,
                  border: session.id === currentSessionId ? '2px solid #4CAF50' : undefined,
                  boxShadow: session.id === currentSessionId ? '0 0 10px rgba(76, 175, 80, 0.3)' : undefined,
                  opacity: session.isListening ? 1 : 0.8
                } as React.CSSProperties}
              >
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '10px' }}>
                  <button
                    style={{
                      ...styles.cardButton,
                      ...styles.deleteButton
                    } as React.CSSProperties}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(index);
                    }}
                    title="Delete session"
                  >
                    ✕
                  </button>
                  <button
                    style={{
                      ...styles.cardButton,
                      ...styles.historyButton
                    } as React.CSSProperties}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveToHistory(index);
                    }}
                    title="Move to history"
                  >
                    📚
                  </button>
                </div>
                <button
                  onClick={() => toggleListening(session.id)}
                  style={{
                    ...styles.button,
                    margin: '10px',
                    backgroundColor: session.isListening ? '#4CAF50' : undefined
                  } as React.CSSProperties}
                >
                  {session.isListening ? 'Stop Listening' : 'Start Listening'}
                </button>
                <div style={{ padding: '10px' }}>
                  <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>Question:</p>
                  <p style={{ marginBottom: '20px' }}>{session.question || 'Waiting for question...'}</p>
                  <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>Response:</p>
                  <div>{formatCodeBlock(session.response)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', gap: '20px', padding: '20px', overflowX: 'auto' }}>
            {historySessions.map((session, index) => (
              <div
                key={session.id}
                style={{
                  ...styles.aiCard,
                  opacity: 0.8
                } as React.CSSProperties}
              >
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px' }}>
                  <button
                    style={{
                      ...styles.cardButton,
                      ...styles.deleteButton
                    } as React.CSSProperties}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(index, true);
                    }}
                    title="Delete from history"
                  >
                    ✕
                  </button>
                </div>
                <div style={{ padding: '10px' }}>
                  <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>Question:</p>
                  <p style={{ marginBottom: '20px' }}>{session.question}</p>
                  <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>Response:</p>
                  <div>{formatCodeBlock(session.response)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
