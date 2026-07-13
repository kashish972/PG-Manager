import { NextRequest, NextResponse } from 'next/server';
import { getTenantAISettings } from '@/lib/ai/ai-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const settings = await getTenantAISettings(tenantId);

    if (!settings) {
      return NextResponse.json(
        { error: 'AI is not configured for this PG.' },
        { status: 404 }
      );
    }

    // Only return public branding info, NEVER expose API key
    const response = {
      isEnabled: settings.isEnabled,
      branding: settings.branding,
    };

    // CORS headers for external websites
    const origin = request.headers.get('origin');
    const allowedOrigins = settings.allowedDomains || [];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (origin && allowedOrigins.length > 0) {
      const isAllowed = allowedOrigins.some((domain) => {
        if (origin.includes(domain)) return true;
        if (domain.startsWith('*.')) {
          const domainPattern = domain.replace('*.', '.');
          return origin.includes(domainPattern);
        }
        return origin === domain || origin.endsWith(`://${domain}`);
      });

      if (isAllowed) {
        headers['Access-Control-Allow-Origin'] = origin;
        headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
        headers['Access-Control-Allow-Headers'] = 'Content-Type';
      }
    }

    // For same-origin or wildcard
    if (!origin) {
      headers['Access-Control-Allow-Origin'] = '*';
    }

    return NextResponse.json(response, { headers });
  } catch (error) {
    console.error('AI settings API error:', error);
    return NextResponse.json(
      { error: 'Failed to load AI settings' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || '*';
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
