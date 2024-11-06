import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

interface AISession {
  question: string;
  response: string;
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
  const [transcript, setTranscript] = useState('');
  const [aiSessions, setAiSessions] = useState<AISession[]>([]);
  const [historySessions, setHistorySessions] = useState<AISession[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [activeSessionIndex, setActiveSessionIndex] = useState<number | null>(null);

  const recognitionRef = useRef<any>(null);
  const lastTranscriptRef = useRef('');
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const generateAIResponse = async (text: string): Promise<string> => {
    try {
      const result = await model.generateContent(text);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating AI response:', error);
      return 'Error generating response. Please try again.';
    }
  };

  const startListening = useCallback(() => {
    if (aiSessions.length > 0) {
      setHistorySessions(prev => [...prev, ...aiSessions]);
      setAiSessions([]);
    }
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');

        setTranscript(transcript);

        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
        }

        processingTimeoutRef.current = setTimeout(async () => {
          lastTranscriptRef.current = transcript;
          const response = await generateAIResponse(transcript);
          setAiSessions(prev => [...prev, { question: transcript, response }]);
        }, 3000);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } else {
      console.error('Speech recognition not supported');
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const deleteSession = (index: number, isHistory: boolean = false) => {
    if (isHistory) {
      setHistorySessions(prev => prev.filter((_, i) => i !== index));
    } else {
      setAiSessions(prev => prev.filter((_, i) => i !== index));
    }
  };

  const moveToHistory = (index: number) => {
    setAiSessions(prev => {
      const sessionToMove = prev[index];
      setHistorySessions(prevHistory => [...prevHistory, sessionToMove]);
      return prev.filter((_, i) => i !== index);
    });
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        stopListening();
      }
    };
  }, [stopListening]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const addNewSession = async () => {
    if (transcript && transcript !== lastTranscriptRef.current) {
      setIsLoading(true);
      const response = await generateAIResponse(transcript);
      setAiSessions(prev => [...prev, {
        question: transcript,
        response: response
      }]);
      setIsLoading(false);
      lastTranscriptRef.current = transcript;
    } else {
      setAiSessions(prev => [...prev, {
        question: '',
        response: 'New session started. Ask a question to begin.'
      }]);
    }
  };

  const formatCodeBlock = (text: string): React.ReactNode => {
    if (text.includes('```')) {
      const codeContent = text.split('```')[1].trim();
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
    }
    return text;
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
        marginBottom: '20px'
      } as React.CSSProperties}>
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
        <button
          onClick={toggleListening}
          style={styles.button as React.CSSProperties}
        >
          {isListening ? 'Stop Listening' : 'Start Listening'}
        </button>
      </div>
      <div style={styles.transcriptArea as React.CSSProperties}>
        {transcript || 'No speech detected yet...'}
      </div>

      <div
        className="horizontal-scroll-container scroll-fade-edges"
        style={styles.horizontalScroll as React.CSSProperties}
      >
        {activeTab === 'current' ? (
          <>
            {aiSessions.map((session, index) => (
              <div
                key={index}
                style={styles.aiCard as React.CSSProperties}
              >
                <button
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    width: '40px',
                    height: '40px',
                    background: '#ff4444',
                    border: 'none',
                    borderRadius: '50%',
                    color: 'white',
                    fontSize: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 9999,
                    fontWeight: 'bold'
                  }}
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
                    position: 'absolute',
                    top: '10px',
                    right: '60px',
                    width: '40px',
                    height: '40px',
                    background: '#4444ff',
                    border: 'none',
                    borderRadius: '50%',
                    color: 'white',
                    fontSize: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 9999,
                    fontWeight: 'bold'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveToHistory(index);
                  }}
                  title="Move to history"
                >
                  📚
                </button>
                <div onClick={() => setActiveSessionIndex(activeSessionIndex === index ? null : index)}>
                  <h3>Session {index + 1}</h3>
                  {activeSessionIndex === index ? (
                    <>
                      <h4>Question:</h4>
                      <p>{session.question}</p>
                      <h4>Response:</h4>
                      <div>{formatCodeBlock(session.response)}</div>
                    </>
                  ) : (
                    <p>Click to view content</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={styles.aiCard as React.CSSProperties}>
                <h3>New Session</h3>
                <p>Generating response...</p>
              </div>
            )}
          </>
        ) : (
          historySessions.map((session, index) => (
            <div
              key={index}
              style={styles.aiCard as React.CSSProperties}
            >
              <button
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  width: '40px',
                  height: '40px',
                  background: '#ff4444',
                  border: 'none',
                  borderRadius: '50%',
                  color: 'white',
                  fontSize: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 99999,
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  transform: 'translateZ(0)'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setHistorySessions(prev => prev.filter((_, i) => i !== index));
                }}
                title="Delete session"
              >
                ✕
              </button>
              <div onClick={() => setActiveSessionIndex(activeSessionIndex === index ? null : index)}>
                <h3>History Session {index + 1}</h3>
                {activeSessionIndex === index ? (
                  <>
                    <h4>Question:</h4>
                    <p>{session.question}</p>
                    <h4>Response:</h4>
                    <div>{formatCodeBlock(session.response)}</div>
                  </>
                ) : (
                  <p>Click to view content</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default App;
