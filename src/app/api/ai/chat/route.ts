import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getTenantAISettings,
  getAIProvider,
  buildSystemPrompt,
  buildTenantContext,
  checkRateLimit,
  createConversation,
  getConversation,
  addMessageToConversation,
  updateConversationTitle,
  UserRole,
} from '@/lib/ai/ai-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, tenantId, conversationId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!tenantId || typeof tenantId !== 'string') {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Determine caller role: check NextAuth session; fall back to visitor
    const session = await getServerSession(authOptions);
    const effectiveRole: UserRole =
      session?.user?.role === 'owner' ||
      session?.user?.role === 'admin' ||
      session?.user?.role === 'superadmin'
        ? 'owner'
        : session?.user?.role === 'member'
        ? 'member'
        : 'visitor';

    // Rate limiting by IP + role
    const ip =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rateKey = `ai_chat:${ip}`;

    const isOwner = effectiveRole === 'owner';
    const perMinuteLimit = isOwner ? 60 : 5;
    const dailyLimit = isOwner ? 1000 : effectiveRole === 'member' ? 50 : 20;

    if (!checkRateLimit(`min:${rateKey}`, perMinuteLimit, 60000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down and try again.' },
        { status: 429 }
      );
    }

    if (!checkRateLimit(`day:${rateKey}`, dailyLimit, 86400000)) {
      return NextResponse.json(
        { error: 'Daily message limit reached. Please try again tomorrow.' },
        { status: 429 }
      );
    }

    // Load tenant AI settings
    const settings = await getTenantAISettings(tenantId);

    if (!settings) {
      return NextResponse.json(
        { error: 'AI is not configured for this PG.' },
        { status: 404 }
      );
    }

    if (!settings.isEnabled) {
      return NextResponse.json(
        { error: 'AI assistant is currently disabled for this PG.' },
        { status: 403 }
      );
    }

    if (!settings.apiKey) {
      return NextResponse.json(
        { error: 'AI is not configured for this PG.' },
        { status: 404 }
      );
    }

    // Check allowed domains for external requests
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    if (
      origin &&
      settings.allowedDomains &&
      settings.allowedDomains.length > 0
    ) {
      const isAllowed = settings.allowedDomains.some((domain) => {
        if (origin.includes(domain)) return true;
        if (domain.startsWith('*.')) {
          const domainPattern = domain.replace('*.', '.');
          return origin.includes(domainPattern);
        }
        return origin === domain || origin.endsWith(`://${domain}`);
      });

      if (!isAllowed) {
        return NextResponse.json(
          { error: 'Unauthorized origin' },
          { status: 403 }
        );
      }
    }

    // ── Conversation Management ──────────────────────────────────────
    // Resolve or create a conversation for message history
    let activeConversationId = conversationId;
    let isNewConversation = false;
    let conversationHistory: Array<{ role: string; content: string }> = [];

    if (!activeConversationId) {
      activeConversationId = await createConversation(tenantId);
      isNewConversation = true;
    } else {
      // Load existing conversation to build history
      const conv = await getConversation(tenantId, activeConversationId);
      if (conv) {
        conversationHistory = conv.messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));
      }
    }

    // Store user message
    await addMessageToConversation(tenantId, activeConversationId, {
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    // Auto-generate title from first user message in new conversations
    if (isNewConversation && message.trim().length > 0) {
      const title =
        message.trim().substring(0, 60) + (message.trim().length > 60 ? '...' : '');
      await updateConversationTitle(tenantId, activeConversationId, title);
    }

    // ── AI Chat ──────────────────────────────────────────────────────
    const tenantContext = await buildTenantContext(tenantId, effectiveRole);
    const systemPrompt = buildSystemPrompt(settings, tenantContext, effectiveRole);

    const provider = getAIProvider(settings.provider);

    // Build messages array with history for context
    const aiMessages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-20), // keep last 20 messages for context
      { role: 'user', content: message },
    ];

    const result = await provider.chat(
      {
        messages: aiMessages as any,
        model: settings.model || undefined,
      },
      settings.apiKey
    );

    // Store AI response
    await addMessageToConversation(tenantId, activeConversationId, {
      role: 'assistant',
      content: result.content,
      timestamp: new Date(),
    });

    return NextResponse.json({
      reply: result.content,
      usage: result.usage,
      conversationId: activeConversationId,
      isNewConversation,
    });
  } catch (error) {
    console.error('AI chat error:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json(
      { error: `AI chat failed: ${message}` },
      { status: 500 }
    );
  }
}
