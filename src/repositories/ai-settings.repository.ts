import { ObjectId } from 'mongodb';
import { connectToTenantDb } from '@/lib/db';
import { IAISettings, AIProvider, AITone } from '@/types';

export interface UpdateAISettingsInput {
  isEnabled?: boolean;
  provider?: AIProvider;
  apiKey?: string;
  branding?: {
    name?: string;
    welcomeMessage?: string;
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    bubbleColor?: string;
    tone?: AITone;
  };
  allowedDomains?: string[];
  model?: string;
}

export class AISettingsRepository {
  async get(tenantId: string): Promise<IAISettings | null> {
    const db = await connectToTenantDb(tenantId);
    return db.collection<IAISettings>('aiSettings').findOne({});
  }

  async upsert(
    tenantId: string,
    input: UpdateAISettingsInput
  ): Promise<IAISettings | null> {
    const db = await connectToTenantDb(tenantId);

    const existing = await this.get(tenantId);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (input.isEnabled !== undefined) updateData.isEnabled = input.isEnabled;
    if (input.provider !== undefined) updateData.provider = input.provider;
    if (input.apiKey !== undefined) updateData.apiKey = input.apiKey;
    if (input.model !== undefined) updateData.model = input.model;
    if (input.allowedDomains !== undefined)
      updateData.allowedDomains = input.allowedDomains;

    if (input.branding) {
      if (existing) {
        const mergedBranding = { ...existing.branding, ...input.branding };
        updateData.branding = mergedBranding;
      } else {
        updateData.branding = {
          name: input.branding.name || 'PG Assistant',
          welcomeMessage:
            input.branding.welcomeMessage ||
            'Hi! How can I help you today?',
          logo: input.branding.logo || '',
          primaryColor: input.branding.primaryColor || '#2563eb',
          secondaryColor: input.branding.secondaryColor || '#1d4ed8',
          bubbleColor: input.branding.bubbleColor || '#e2e8f0',
          tone: input.branding.tone || 'professional',
        };
      }
    }

    if (!existing) {
      const now = new Date();
      const defaults: IAISettings = {
        _id: new ObjectId(),
        isEnabled: input.isEnabled ?? true,
        provider: input.provider || 'gemini',
        apiKey: input.apiKey || '',
        branding: {
          name: 'PG Assistant',
          welcomeMessage: 'Hi! How can I help you today?',
          logo: '',
          primaryColor: '#2563eb',
          secondaryColor: '#1d4ed8',
          bubbleColor: '#e2e8f0',
          tone: 'professional',
          ...input.branding,
        },
        allowedDomains: input.allowedDomains || [],
        model: input.model || 'gemini-2.0-flash',
        createdAt: now,
        updatedAt: now,
      };
      await db.collection<IAISettings>('aiSettings').insertOne(defaults);
      return defaults;
    }

    await db
      .collection<IAISettings>('aiSettings')
      .updateOne({ _id: existing._id }, { $set: updateData });

    return this.get(tenantId);
  }

  async delete(tenantId: string): Promise<boolean> {
    const db = await connectToTenantDb(tenantId);
    const result = await db.collection<IAISettings>('aiSettings').deleteOne({});
    return result.deletedCount > 0;
  }
}

export const aiSettingsRepository = new AISettingsRepository();
