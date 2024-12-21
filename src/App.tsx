import React, { useState, useEffect, useRef, useCallback, CSSProperties, ReactNode } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import {
  AISession,
  SpeechRecognition,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent,
  SpeechRecognitionResult
} from './types';

// PLACEHOLDER: styles object and API key setup

// PLACEHOLDER: styles object

const API_KEY = 'AIzaSyDfbugjoSRGIb40hn4JoxT8kLL39tIzCzM';
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

const styles = {
  container: {
    maxWidth: '100vw',
    minHeight: '100vh',
    padding: '2rem',
    backgroundColor: '#f5f5f5',
    position: 'relative',
    overflow: 'hidden'
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
    color: '#333'
  },
  horizontalScroll: {
    display: 'flex',
    overflowX: 'auto',
    gap: '20px',
    padding: '20px',
    position: 'relative',
    WebkitOverflowScrolling: 'touch'
  },
  aiCard: {
    flex: '0 0 auto',
    width: '400px',
    minHeight: '300px',
    backgroundColor: 'white',
    borderRadius: '15px',
    padding: '20px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    position: 'relative',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column'
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'background-color 0.3s ease',
    '&:hover': {
      backgroundColor: '#45a049'
    }
  },
  addButton: {
    position: 'fixed',
    bottom: '2rem',
    right: '2rem',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    fontSize: '32px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.3s ease',
    zIndex: 1000
  },
  addButtonHover: {
    transform: 'scale(1.1)',
    boxShadow: '0 6px 8px rgba(0, 0, 0, 0.2)'
  },
  cardButton: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: 'none',
    color: 'white',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease'
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    '&:hover': {
      backgroundColor: '#ff0000'
    }
  },
  historyButton: {
    backgroundColor: '#4444ff',
    '&:hover': {
      backgroundColor: '#0000ff'
    }
  }
} as const;

const App = () => {
  const [aiSessions, setAiSessions] = useState<AISession[]>(() => {
    const savedSessions = localStorage.getItem('aiSessions');
    return savedSessions ? JSON.parse(savedSessions) : [];
  });
  const [historySessions, setHistorySessions] = useState<AISession[]>(() => {
    const savedHistory = localStorage.getItem('historySessions');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeSessionIndex, setActiveSessionIndex] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastTranscriptRef = useRef<string>('');
  const processingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simulationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    localStorage.setItem('aiSessions', JSON.stringify(aiSessions));
  }, [aiSessions]);

  useEffect(() => {
    localStorage.setItem('historySessions', JSON.stringify(historySessions));
  }, [historySessions]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
    }
  }, []);

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

  const toggleListening = async (sessionId: string) => {
    // Update session state
    setAiSessions(prev => {
      const updatedSessions = prev.map(s =>
        s.id === sessionId ? { ...s, isListening: !s.isListening } : s
      );
      return updatedSessions;
    });

    const session = aiSessions.find(s => s.id === sessionId);
    if (!session) return;

    if (!session.isListening) {
      // Start listening
      if (!('webkitSpeechRecognition' in window)) {
        setAiSessions(prev => prev.map(s =>
          s.id === sessionId ? { ...s, isListening: false } : s
        ));
        alert('Speech recognition is not supported in this browser.');
        return;
      }

      const SpeechRecognition = window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = async (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results as unknown as ArrayLike<SpeechRecognitionResult>)
          .map((result: SpeechRecognitionResult) => result[0].transcript)
          .join('');

        if (event.results[event.results.length - 1].isFinal) {
          setAiSessions(prev => prev.map(s =>
            s.id === sessionId ? {
              ...s,
              transcript,
              question: transcript
            } : s
          ));

          try {
            const prompt = `You are an AI interview assistant. Please provide a concise and professional response to this interview question: ${transcript}`;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const aiResponse = response.text();

            setAiSessions(prev => prev.map(s =>
              s.id === sessionId ? {
                ...s,
                response: aiResponse
              } : s
            ));
          } catch (error) {
            console.error('Error generating AI response:', error);
            setAiSessions(prev => prev.map(s =>
              s.id === sessionId ? {
                ...s,
                response: 'Error generating response. Please try again.'
              } : s
            ));
          }
        }
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setAiSessions(prev => prev.map(s =>
          s.id === sessionId ? { ...s, isListening: false } : s
        ));
      };

      recognitionRef.current.onend = () => {
        if (session.isListening) {
          recognitionRef.current?.start();
        }
      };

      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setAiSessions(prev => prev.map(s =>
          s.id === sessionId ? { ...s, isListening: false } : s
        ));
      }
    } else {
      // Stop listening
      recognitionRef.current?.stop();
      setAiSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, isListening: false } : s
      ));
    }
  };

  const formatCodeBlock = (text: string): ReactNode => {
    if (!text.includes('```')) return text;

    const parts = text.split('```');
    return parts.map((part, index) => {
      if (index % 2 === 0) {
        return part;
      } else {
        const code = part.trim();
        const highlightedCode = hljs.highlightAuto(code).value;
        return (
          <pre key={index} style={{
            background: '#1a1a1a',
            padding: '1rem',
            borderRadius: '0.5rem',
            marginTop: '1rem',
            marginBottom: '1rem',
            overflow: 'auto'
          }}>
            <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
          </pre>
        );
      }
    });
  };

  return (
    <div style={styles.container as CSSProperties}>
      <button
        onClick={addNewSession}
        style={{
          ...styles.addButton,
          ...(isHovered ? styles.addButtonHover : {})
        } as CSSProperties}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        +
      </button>

      <div style={styles.header as CSSProperties}>
        <h1>Interview AI Helper</h1>
        <p>Your real-time interview assistant</p>
      </div>

      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '20px',
        alignItems: 'center'
      } as CSSProperties}>
        {currentSessionId && (
          <button
            onClick={() => stopSession(currentSessionId)}
            style={{
              ...styles.button,
              backgroundColor: '#dc3545',
              marginRight: '20px'
            } as CSSProperties}
          >
            Stop Session
          </button>
        )}
        <button
          onClick={() => setActiveTab('current')}
          style={{
            ...styles.button,
            opacity: activeTab === 'current' ? 1 : 0.7
          } as CSSProperties}
        >
          Current Session
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            ...styles.button,
            opacity: activeTab === 'history' ? 1 : 0.7
          } as CSSProperties}
        >
          History
        </button>
      </div>

      <div
        className="horizontal-scroll-container scroll-fade-edges"
        style={{
          ...styles.horizontalScroll,
          position: 'relative'
        } as CSSProperties}
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
                } as CSSProperties}
              >
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '10px' }}>
                  <button
                    style={{
                      ...styles.cardButton,
                      ...styles.deleteButton
                    } as CSSProperties}
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
                    } as CSSProperties}
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
                  } as CSSProperties}
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
                } as CSSProperties}
              >
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px' }}>
                  <button
                    style={{
                      ...styles.cardButton,
                      ...styles.deleteButton
                    } as CSSProperties}
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
