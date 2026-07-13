'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { AiChatWidget } from '@/components/ai/AiChatWidget';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAISettings, updateAISettings } from '@/actions/ai.actions';
import { Sparkles, Copy, Check, Globe } from 'lucide-react';
import { ImageUpload } from '@/components/ui/ImageUpload';
import styles from './page.module.css';

export default function AISettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  // Form state — enabled by default so new configs work immediately
  const [isEnabled, setIsEnabled] = useState(true);
  const [provider, setProvider] = useState<'gemini' | 'openrouter'>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [aiName, setAiName] = useState('PG Assistant');
  const [welcomeMessage, setWelcomeMessage] = useState('Hi! How can I help you today?');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#1d4ed8');
  const [bubbleColor, setBubbleColor] = useState('#e2e8f0');
  const [tone, setTone] = useState<'professional' | 'friendly' | 'formal' | 'casual'>('professional');
  const [logo, setLogo] = useState('');
  const [allowedDomains, setAllowedDomains] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role === 'member') {
      router.push('/dashboard');
    }
  }, [status, router, session]);

  useEffect(() => {
    if (session?.user?.role === 'owner' || session?.user?.role === 'admin') {
      getAISettings()
        .then((data) => {
          if (data && !('error' in data)) {
            setIsEnabled(data.isEnabled);
            setProvider(data.provider || 'gemini');
            setModel(data.model || '');
            setHasApiKey(data.hasApiKey);

            if (data.branding) {
              setAiName(data.branding.name || 'PG Assistant');
              setWelcomeMessage(data.branding.welcomeMessage || 'Hi! How can I help you today?');
              setPrimaryColor(data.branding.primaryColor || '#2563eb');
              setSecondaryColor(data.branding.secondaryColor || '#1d4ed8');
              setBubbleColor(data.branding.bubbleColor || '#e2e8f0');
            setTone(data.branding.tone || 'professional');
            setLogo(data.branding.logo || '');
          }

          if (data.allowedDomains) {
              setAllowedDomains(data.allowedDomains.join('\n'));
            }
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const form = new FormData();
    form.append('isEnabled', String(isEnabled));
    form.append('provider', provider);
    if (apiKey) form.append('apiKey', apiKey);
    form.append('model', model);
    form.append('aiName', aiName);
    form.append('welcomeMessage', welcomeMessage);
    form.append('primaryColor', primaryColor);
    form.append('secondaryColor', secondaryColor);
    form.append('bubbleColor', bubbleColor);
    form.append('tone', tone);
    form.append('logo', logo);
    form.append('allowedDomains', allowedDomains);

    const result = await updateAISettings(form);

    if (result?.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: 'AI settings saved successfully!' });
      setHasApiKey(!!apiKey || hasApiKey);
      setPreviewKey((k) => k + 1);
    }

    setSaving(false);
  };

  const getCDNScript = () => {
    const tenantId = session?.user?.tenantId || 'YOUR_TENANT_ID';
    return `<script
  src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/pg-ai-widget.js"
  data-tenant-id="${tenantId}"
  data-position="bottom-right"
></script>`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getCDNScript());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = getCDNScript();
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className={styles.container}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>AI Assistant Settings</h1>
          <p className={styles.subtitle}>
            Configure your AI-powered chatbot for residents and website visitors
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* ====== SINGLE CARD: Configuration + Branding + Allowed Domains + Save ====== */}
          <div className={styles.mainCard}>
            {/* --- Configuration --- */}
            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>
                <Sparkles size={20} /> Configuration
              </h2>

              <div className={styles.form}>
                <div className={styles.toggleRow}>
                  <div>
                    <div className={styles.label}>Enable AI Assistant</div>
                    <div className={styles.hint}>Show the AI chat widget across your PG pages</div>
                  </div>
                  <button
                    type="button"
                    className={`${styles.toggle} ${isEnabled ? styles.toggleActive : ''}`}
                    onClick={() => setIsEnabled(!isEnabled)}
                  >
                    <div className={styles.toggleKnob} />
                  </button>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>AI Provider</label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as 'gemini' | 'openrouter')}
                    className={styles.select}
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="openrouter">OpenRouter</option>
                  </select>
                  <span className={styles.hint}>
                    {provider === 'gemini'
                      ? 'Get your API key from aistudio.google.com'
                      : 'Get your API key from openrouter.ai/keys'}
                  </span>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    API Key {hasApiKey && apiKey === '' && <span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>(saved)</span>}
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={hasApiKey ? 'Leave empty to keep existing key' : 'Enter your API key'}
                    className={styles.input}
                  />
                  <span className={styles.hint}>
                    Your API key is stored securely and never exposed to the browser
                  </span>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Model (optional)</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder={provider === 'gemini' ? 'gemini-2.0-flash' : 'google/gemini-2.0-flash-001'}
                    className={styles.input}
                  />
                  <span className={styles.hint}>Leave empty to use the default model</span>
                </div>
              </div>
            </div>

            <div className={styles.divider} />

            {/* --- Branding --- */}
            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>
                <Sparkles size={20} /> Branding
              </h2>

              <div className={styles.form}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>AI Assistant Name</label>
                  <input
                    type="text"
                    value={aiName}
                    onChange={(e) => setAiName(e.target.value)}
                    placeholder="PG Assistant"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Welcome Message</label>
                  <textarea
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    placeholder="Hi! How can I help you today?"
                    className={styles.textarea}
                    rows={2}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Primary Color</label>
                    <div className={styles.colorRow}>
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className={styles.colorInput}
                      />
                      <span className={styles.colorValue}>{primaryColor}</span>
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Secondary Color</label>
                    <div className={styles.colorRow}>
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className={styles.colorInput}
                      />
                      <span className={styles.colorValue}>{secondaryColor}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Chat Bubble Color</label>
                    <div className={styles.colorRow}>
                      <input
                        type="color"
                        value={bubbleColor}
                        onChange={(e) => setBubbleColor(e.target.value)}
                        className={styles.colorInput}
                      />
                      <span className={styles.colorValue}>{bubbleColor}</span>
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Tone</label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value as typeof tone)}
                      className={styles.select}
                    >
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="formal">Formal</option>
                      <option value="casual">Casual</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>AI Logo</label>
                  <ImageUpload
                    value={logo}
                    onChange={(url) => setLogo(url)}
                    label="AI Logo"
                    aspectRatio="square"
                    uploadType="ai-logo"
                  />
                  <span className={styles.hint}>Upload your brand logo shown in the chat header</span>
                </div>
              </div>
            </div>

            <div className={styles.divider} />

            {/* --- Allowed Domains --- */}
            <div className={styles.formSection}>
              <h2 className={styles.sectionTitle}>
                <Globe size={20} /> Allowed Domains
              </h2>

              <div className={styles.form}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Allowed External Domains</label>
                  <textarea
                    value={allowedDomains}
                    onChange={(e) => setAllowedDomains(e.target.value)}
                    placeholder="example.com&#10;my-pg-website.com"
                    className={styles.textarea}
                    rows={4}
                  />
                  <span className={styles.hint}>
                    One domain per line. Add domains where you embed the AI widget.
                    Leave empty to allow all origins (not recommended).
                  </span>
                </div>

                {allowedDomains.trim() && (
                  <div className={styles.domainList}>
                    {allowedDomains.split('\n').filter(Boolean).map((domain, i) => (
                      <span key={i} className={styles.domainTag}>
                        {domain}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Save area */}
            <div className={styles.saveArea}>
              <div className={styles.saveAreaInner}>
                <div>
                  {message && (
                    <div className={`${styles.message} ${styles[message.type]}`}>
                      {message.text}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>

          {/* ====== CDN Script Section ====== */}
          <div className={styles.cdnSection}>
            <h2 className={styles.sectionTitle}>
              <Sparkles size={20} /> Embed on External Website
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
              Add this script to any external website to embed the AI widget. The widget
              will load your branding automatically from the backend.
            </p>

            <div className={styles.cdnScript}>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={copyToClipboard}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? ' Copied!' : ' Copy'}
              </button>
              {getCDNScript()}
            </div>

            <div className={styles.cdnNote}>
              <strong>Note:</strong> The CDN widget script loads the AI chat widget in an isolated
              container. It fetches your branding from the backend and works independently from
              your main site&apos;s CSS. Make sure the domain is added to the allowed domains list above.
            </div>
          </div>

          {/* ====== Preview Section ====== */}
          <div className={styles.previewSection}>
            <h2 className={styles.sectionTitle}>
              <Sparkles size={20} /> Preview
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
              The AI widget appears as a floating chat button at the bottom-right of your pages.
              Here&apos;s how it looks:
            </p>

            {session?.user?.tenantId && (
              <div style={{ height: '440px' }}>
                <AiChatWidget
                  key={previewKey}
                  tenantId={session.user.tenantId}
                  branding={{
                    name: aiName,
                    welcomeMessage,
                    logo: logo || undefined,
                    primaryColor,
                    secondaryColor,
                    bubbleColor,
                    tone,
                  }}
                  isEnabled={true}
                  mode="inline"
                  apiUrl={typeof window !== 'undefined' ? window.location.origin : undefined}
                />
              </div>
            )}
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
