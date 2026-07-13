'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle,
  X,
  Minus,
  ChevronDown,
  Send,
  Sparkles,
  Plus,
  History,
  Trash2,
  Maximize2,
  Minimize2,
  PanelLeftOpen,
  PanelLeftClose,
} from 'lucide-react';
import styles from './AiChatWidget.module.css';

interface Branding {
  name: string;
  welcomeMessage: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  bubbleColor: string;
  tone: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ConversationSummary {
  _id: string;
  title: string;
  messageCount: number;
  updatedAt: Date;
}

interface AiChatWidgetProps {
  tenantId: string;
  branding?: Branding;
  isEnabled?: boolean;
  apiUrl?: string;
  mode?: 'fixed' | 'inline';
}

function getCSSVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function AiChatWidget({
  tenantId,
  branding: initialBranding,
  isEnabled: initialEnabled = true,
  apiUrl,
  mode = 'fixed',
}: AiChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(mode === 'inline' ? true : false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branding, setBranding] = useState<Branding | null>(initialBranding || null);
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [welcomeShown, setWelcomeShown] = useState(false);

  // Conversation management
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const baseUrl = apiUrl || process.env.NEXT_PUBLIC_APP_URL || '';

  // Load branding from backend if not provided
  useEffect(() => {
    if (!initialBranding && tenantId) {
      const settingsUrl = baseUrl
        ? `${baseUrl}/api/ai/settings?tenantId=${tenantId}`
        : `/api/ai/settings?tenantId=${tenantId}`;

      fetch(settingsUrl)
        .then((res) => res.json())
        .then((data) => {
          if (data.branding) {
            setBranding(data.branding);
          }
          if (data.isEnabled !== undefined) {
            setIsEnabled(data.isEnabled);
          }
        })
        .catch((err) => console.error('Failed to load AI branding:', err));
    }
  }, [initialBranding, tenantId, baseUrl]);

  // Show welcome message
  useEffect(() => {
    if (isOpen && !welcomeShown && branding?.welcomeMessage && messages.length === 0 && !activeConversationId) {
      setMessages([{ role: 'assistant', content: branding.welcomeMessage }]);
      setWelcomeShown(true);
    }
  }, [isOpen, welcomeShown, branding, messages.length, activeConversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMinimized]);

  // Load conversations on mount
  useEffect(() => {
    if (tenantId && isOpen) {
      loadConversations();
    }
  }, [tenantId, isOpen]);

  // Load conversation messages when switching
  const loadConversationMessages = useCallback(
    async (conversationId: string) => {
      const convUrl = baseUrl
        ? `${baseUrl}/api/ai/conversations/${conversationId}?tenantId=${tenantId}`
        : `/api/ai/conversations/${conversationId}?tenantId=${tenantId}`;

      try {
        const res = await fetch(convUrl);
        const data = await res.json();
        if (data.conversation) {
          setMessages(data.conversation.messages || []);
          setActiveConversationId(conversationId);
          setWelcomeShown(true);
          setShowSidebar(false);
          // Scroll to bottom after messages load
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      } catch (err) {
        console.error('Failed to load conversation:', err);
      }
    },
    [tenantId, baseUrl]
  );

  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    const listUrl = baseUrl
      ? `${baseUrl}/api/ai/conversations?tenantId=${tenantId}`
      : `/api/ai/conversations?tenantId=${tenantId}`;

    try {
      const res = await fetch(listUrl);
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [tenantId, baseUrl]);

  const handleNewChat = useCallback(async () => {
    setMessages([]);
    setActiveConversationId(null);
    setWelcomeShown(false);
    setShowSidebar(false);
    setInput('');
  }, []);

  const handleDeleteConversation = useCallback(
    async (e: React.MouseEvent, convId: string) => {
      e.stopPropagation();
      const delUrl = baseUrl
        ? `${baseUrl}/api/ai/conversations/${convId}?tenantId=${tenantId}`
        : `/api/ai/conversations/${convId}?tenantId=${tenantId}`;

      try {
        await fetch(delUrl, { method: 'DELETE' });
        setConversations((prev) => prev.filter((c) => c._id !== convId));
        if (activeConversationId === convId) {
          handleNewChat();
        }
      } catch (err) {
        console.error('Failed to delete conversation:', err);
      }
    },
    [tenantId, baseUrl, activeConversationId, handleNewChat]
  );

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setIsLoading(true);

    try {
      const chatUrl = baseUrl ? `${baseUrl}/api/ai/chat` : '/api/ai/chat';

      const res = await fetch(chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          tenantId,
          conversationId: activeConversationId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Update active conversation ID if it was a new conversation
      if (data.conversationId && data.conversationId !== activeConversationId) {
        setActiveConversationId(data.conversationId);
        // Reload conversations list to show the new one
        loadConversations();
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply },
      ]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, tenantId, baseUrl, activeConversationId, loadConversations]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
    setIsMinimized(false);
  };

  const toggleMinimize = () => {
    setIsMinimized((prev) => !prev);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  // CSS custom properties for branding
  const brandVars = {
    '--ai-primary': branding?.primaryColor || getCSSVar('--primary', '#2563eb'),
    '--ai-secondary': branding?.secondaryColor || getCSSVar('--primary-hover', '#1d4ed8'),
    '--ai-bubble': branding?.bubbleColor || '#e2e8f0',
  } as Record<string, string>;

  if (!isEnabled) {
    return null;
  }

  const chatPanelClass = [
    styles.chatPanel,
    isFullscreen ? styles.fullscreen : '',
  ]
    .filter(Boolean)
    .join(' ');

  // ──────────────────────────────────────────────
  // Inline (preview) mode
  // ──────────────────────────────────────────────
  if (mode === 'inline') {
    return (
      <div
        style={{
          border: '1px solid var(--border, #e2e8f0)',
          borderRadius: '16px',
          overflow: 'hidden',
          height: '400px',
          display: 'flex',
          flexDirection: 'column',
          background: brandVars['--ai-bubble'],
        }}
      >
        <div className={styles.header} style={{ background: brandVars['--ai-primary'], flexShrink: 0 }}>
          <div className={styles.headerLeft}>
            <div className={styles.avatar}>
              {branding?.logo ? (
                <img src={branding.logo} alt={branding?.name || 'AI'} />
              ) : (
                <Sparkles size={18} />
              )}
            </div>
            <div className={styles.headerInfo}>
              <span className={styles.headerTitle}>{branding?.name || 'AI Assistant'}</span>
              <span className={styles.headerStatus}>Online</span>
            </div>
          </div>
        </div>
        <div className={styles.messagesArea} style={{ flex: 1, overflowY: 'auto' }}>
          {messages.length === 0 && branding?.welcomeMessage && (
            <div className={`${styles.messageRow} ${styles.botRow}`}>
              <div className={`${styles.message} ${styles.botMessage}`} style={{ background: brandVars['--ai-bubble'] }}>
                {branding.welcomeMessage}
              </div>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`${styles.messageRow} ${msg.role === 'user' ? styles.userRow : styles.botRow}`}>
              <div
                className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.botMessage}`}
                style={msg.role === 'user' ? { background: brandVars['--ai-primary'] } : { background: brandVars['--ai-bubble'] }}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className={`${styles.messageRow} ${styles.botRow}`}>
              <div className={`${styles.message} ${styles.botMessage} ${styles.typingIndicator}`}>
                <span className={styles.typingDot}></span>
                <span className={styles.typingDot}></span>
                <span className={styles.typingDot}></span>
              </div>
            </div>
          )}
        </div>
        <div className={styles.inputArea} style={{ flexShrink: 0 }}>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a test message..."
            rows={1}
            disabled={isLoading}
          />
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{ background: brandVars['--ai-primary'] }}
            aria-label="Send"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // Fixed (floating) mode
  // ──────────────────────────────────────────────
  return (
    <>
      {/* Floating button */}
      <button
        className={`${styles.floatingButton} ${isOpen ? styles.floatingButtonMinimized : ''}`}
        onClick={toggleOpen}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        style={{ background: brandVars['--ai-primary'] }}
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </button>

      {/* Chat panel */}
      {isOpen && !isMinimized && (
        <div className={chatPanelClass} style={{ ...brandVars as React.CSSProperties, display: 'flex', flexDirection: showSidebar ? 'row' : 'column' }}>
          {/* Sidebar */}
          {showSidebar && (
            <div className={styles.sidebar}>
              <div className={styles.sidebarHeader}>
                <span className={styles.sidebarTitle}>Chat History</span>
                <button
                  className={styles.sidebarClose}
                  onClick={() => setShowSidebar(false)}
                  aria-label="Close sidebar"
                >
                  <X size={16} />
                </button>
              </div>
              <div className={styles.sidebarList}>
                {isLoadingConversations && (
                  <div className={styles.sidebarLoading}>Loading...</div>
                )}
                {!isLoadingConversations && conversations.length === 0 && (
                  <div className={styles.sidebarEmpty}>No conversations yet</div>
                )}
                {conversations.map((conv) => (
                  <div
                    key={conv._id}
                    className={`${styles.sidebarItem} ${
                      activeConversationId === conv._id ? styles.sidebarItemActive : ''
                    }`}
                    onClick={() => loadConversationMessages(conv._id)}
                  >
                    <div className={styles.sidebarItemInfo}>
                      <span className={styles.sidebarItemTitle}>
                        {conv.title}
                      </span>
                      <span className={styles.sidebarItemMeta}>
                        {conv.messageCount} messages
                      </span>
                    </div>
                    <button
                      className={styles.sidebarItemDelete}
                      onClick={(e) => handleDeleteConversation(e, conv._id)}
                      aria-label="Delete conversation"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main content column: header + messages + input */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
            {/* Header */}
            <div className={styles.header} style={{ background: brandVars['--ai-primary'] } as React.CSSProperties}>
              <div className={styles.headerLeft}>
                <button
                  className={styles.headerBtn}
                  onClick={() => setShowSidebar(!showSidebar)}
                  aria-label="Toggle history"
                >
                  {showSidebar ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
                </button>
                <div className={styles.avatar}>
                  {branding?.logo ? (
                    <img src={branding.logo} alt={branding?.name || 'AI'} />
                  ) : (
                    <Sparkles size={18} />
                  )}
                </div>
                <div className={styles.headerInfo}>
                  <span className={styles.headerTitle}>
                    {branding?.name || 'AI Assistant'}
                  </span>
                  <span className={styles.headerStatus}>Online</span>
                </div>
              </div>
              <div className={styles.headerActions}>
                <button
                  className={styles.headerBtn}
                  onClick={handleNewChat}
                  aria-label="New chat"
                  title="New Chat"
                >
                  <Plus size={18} />
                </button>
                <button
                  className={styles.headerBtn}
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
                <button
                  className={styles.headerBtn}
                  onClick={toggleMinimize}
                  aria-label="Minimize"
                  title="Minimize"
                >
                  <ChevronDown size={18} />
                </button>
                <button
                  className={styles.headerBtn}
                  onClick={toggleOpen}
                  aria-label="Close"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className={styles.messagesArea}>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`${styles.messageRow} ${
                    msg.role === 'user' ? styles.userRow : styles.botRow
                  }`}
                >
                  <div
                    className={`${styles.message} ${
                      msg.role === 'user' ? styles.userMessage : styles.botMessage
                    }`}
                    style={
                      msg.role === 'user'
                        ? { background: brandVars['--ai-primary'] }
                        : msg.role === 'assistant'
                        ? { background: brandVars['--ai-bubble'] }
                        : undefined
                    }
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className={`${styles.messageRow} ${styles.botRow}`}>
                  <div className={`${styles.message} ${styles.botMessage} ${styles.typingIndicator}`}>
                    <span className={styles.typingDot}></span>
                    <span className={styles.typingDot}></span>
                    <span className={styles.typingDot}></span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={styles.inputArea}>
              <textarea
                ref={inputRef}
                className={styles.input}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                rows={1}
                disabled={isLoading}
              />
              <button
                className={styles.sendBtn}
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                style={{ background: brandVars['--ai-primary'] }}
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
