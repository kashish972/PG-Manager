'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiSettingsRepository } from '@/repositories/ai-settings.repository';
import { revalidatePath } from 'next/cache';
import { AIProvider, AITone } from '@/types';

export async function getAISettings() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return { error: 'Not authenticated' };
  }

  if (session.user.role === 'member') {
    return { error: 'Only owners can manage AI settings' };
  }

  try {
    const settings = await aiSettingsRepository.get(session.user.tenantId);
    if (!settings) return null;

    return {
      isEnabled: settings.isEnabled,
      provider: settings.provider,
      model: settings.model,
      branding: settings.branding,
      allowedDomains: settings.allowedDomains,
      hasApiKey: !!settings.apiKey && settings.apiKey.length > 0,
    };
  } catch (error) {
    console.error('Get AI settings error:', error);
    return { error: 'Failed to load AI settings' };
  }
}

export async function updateAISettings(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || session.user.role !== 'owner') {
    return { error: 'Only owner can update AI settings' };
  }

  try {
    const isEnabled = formData.get('isEnabled') === 'true';
    const provider = formData.get('provider') as AIProvider;
    const apiKey = formData.get('apiKey') as string;
    const model = formData.get('model') as string;
    const aiName = formData.get('aiName') as string;
    const welcomeMessage = formData.get('welcomeMessage') as string;
    const primaryColor = formData.get('primaryColor') as string;
    const secondaryColor = formData.get('secondaryColor') as string;
    const bubbleColor = formData.get('bubbleColor') as string;
    const logo = formData.get('logo') as string;
    const tone = formData.get('tone') as AITone;
    const allowedDomainsRaw = formData.get('allowedDomains') as string;

    const allowedDomains = allowedDomainsRaw
      ? allowedDomainsRaw
          .split('\n')
          .map((d) => d.trim())
          .filter(Boolean)
      : [];

    await aiSettingsRepository.upsert(session.user.tenantId, {
      isEnabled,
      provider,
      apiKey: apiKey || undefined,
      model,
      branding: {
        name: aiName,
        welcomeMessage,
        logo: logo || undefined,
        primaryColor,
        secondaryColor,
        bubbleColor,
        tone,
      },
      allowedDomains,
    });

    revalidatePath('/ai-settings');
    return { success: true };
  } catch (error) {
    console.error('Update AI settings error:', error);
    return { error: 'Failed to update AI settings' };
  }
}

export async function toggleAISettings(enabled: boolean) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId || session.user.role !== 'owner') {
    return { error: 'Only owner can toggle AI settings' };
  }

  try {
    await aiSettingsRepository.upsert(session.user.tenantId, {
      isEnabled: enabled,
    });
    revalidatePath('/ai-settings');
    return { success: true };
  } catch (error) {
    console.error('Toggle AI settings error:', error);
    return { error: 'Failed to toggle AI settings' };
  }
}
