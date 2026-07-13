import { IAISettings, AIProvider as AIProviderType } from '@/types';
import { AIProvider } from './providers/provider.interface';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { connectToTenantDb, connectToMainDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

export type UserRole = 'owner' | 'admin' | 'member' | 'visitor';

export function getAIProvider(providerType: AIProviderType): AIProvider {
  switch (providerType) {
    case 'gemini':
      return new GeminiProvider();
    case 'openrouter':
      return new OpenRouterProvider();
    default:
      throw new Error(`Unknown AI provider: ${providerType}`);
  }
}

/**
 * Build a rich context block with real PG data from the database.
 * Filters sensitive data based on the caller's role.
 *
 * Role visibility:
 *   owner/admin: full data (residents, revenue, complaints, all)
 *   member:      room info, notices, own-relevant data only
 *                NEVER reveals other residents' names, rents, or revenue
 *   visitor:     public info only (rooms, availability, general pricing)
 */
export async function buildTenantContext(
  tenantId: string,
  role: UserRole = 'visitor'
): Promise<string> {
  const parts: string[] = [];
  const isOwner = role === 'owner' || role === 'admin';
  const isMember = role === 'member';

  try {
    const tenantDb = await connectToTenantDb(tenantId);

    // 1. PG Info — visible to all roles
    try {
      const mainDb = await connectToMainDb();
      const pg = await mainDb
        .collection('pgs')
        .findOne({ slug: tenantId });

      if (pg) {
        parts.push('--- PG INFORMATION ---');
        parts.push(`PG Name: ${pg.name || 'N/A'}`);
        parts.push(`Address: ${pg.address || 'N/A'}`);
        parts.push(`Total Rooms: ${pg.totalRooms || 'N/A'}`);
        parts.push(`Default Room Capacity: ${pg.defaultCapacity || 'N/A'} persons`);
        parts.push(`Monthly Rent: ₹${pg.monthlyRent || 'N/A'}`);
        if (pg.noticePeriodDays) parts.push(`Notice Period: ${pg.noticePeriodDays} days`);
        if (pg.status) parts.push(`Status: ${pg.status}`);
        if (pg.upiId) parts.push(`UPI ID for payments: ${pg.upiId}`);
      }
    } catch {
      parts.push('(Could not load PG details)');
    }

    // 2. Blocks & Rooms — visible to all roles
    try {
      const blocks = await tenantDb
        .collection('blocks')
        .find()
        .sort({ name: 1 })
        .toArray();

      const activePersons = await tenantDb
        .collection('persons')
        .find({ isActive: true })
        .toArray();

      const occupiedRoomNumbers = new Set(
        activePersons.map((p: any) => p.roomNumber)
      );

      if (blocks.length > 0) {
        parts.push('\n--- ROOMS & BLOCKS ---');
        let totalRooms = 0;
        let acRooms = 0;
        let nonAcRooms = 0;
        let availableRooms = 0;

        for (const block of blocks) {
          const blockRooms = (block as any).rooms || [];
          totalRooms += blockRooms.length;
          parts.push(`\nBlock: ${(block as any).name}`);

          for (const room of blockRooms) {
            const isAC = (room as any).isAC;
            const roomNumber = (room as any).roomNumber;
            const capacity = (room as any).capacity || 1;
            const isOccupied = occupiedRoomNumbers.has(roomNumber);

            if (isAC) acRooms++;
            else nonAcRooms++;
            if (!isOccupied) availableRooms++;

            const acLabel = isAC ? 'AC' : 'Non-AC';
            const status = isOccupied ? 'Occupied' : 'Available';
            parts.push(`  • Room ${roomNumber} — ${acLabel}, Capacity: ${capacity} persons — ${status}`);
          }
        }

        parts.push(`\nRoom Summary: ${totalRooms} total rooms, ${acRooms} AC, ${nonAcRooms} Non-AC, ${availableRooms} available`);
      } else {
        parts.push('\n--- ROOMS ---');
        parts.push(`No blocks configured. Total rooms capacity: ${(await tenantDb.collection('pgs').findOne({}))?.totalRooms || 'N/A'}`);
      }
    } catch {
      parts.push('(Could not load room data)');
    }

    // 3. Active Occupants — filtered by role
    try {
      const active = await tenantDb
        .collection('persons')
        .find({ isActive: true })
        .toArray();

      if (active.length > 0) {
        if (isOwner) {
          // Owner/Admin: full details
          parts.push(`\n--- CURRENT RESIDENTS (${active.length}) ---`);
          for (const person of active.slice(0, 10)) {
            const p = person as any;
            parts.push(
              `  • ${p.name} — Room ${p.roomNumber}, Rent: ₹${p.monthlyRent}/month, Phone: ${p.phone || 'N/A'}`
            );
          }
          if (active.length > 10) {
            parts.push(`  ... and ${active.length - 10} more residents`);
          }

          // Revenue — owner only
          const totalRentResult = await tenantDb
            .collection('persons')
            .aggregate([
              { $match: { isActive: true } },
              { $group: { _id: null, total: { $sum: '$monthlyRent' } } },
            ])
            .toArray();
          const totalMonthlyRent = totalRentResult[0]?.total || 0;
          parts.push(`\nTotal Monthly Rent from all active residents: ₹${totalMonthlyRent}`);
        } else if (isMember) {
          // Member: count only, no names or individual rents
          parts.push(`\n--- RESIDENTS ---`);
          parts.push(`There are currently ${active.length} residents in the PG.`);
          parts.push('(Individual resident rent details are private.)');
        } else {
          // Visitor: no resident info
          // Don't even mention resident count
        }
      } else {
        if (isOwner || isMember) {
          parts.push('\n--- CURRENT RESIDENTS ---');
          parts.push('No active residents currently.');
        }
      }
    } catch {
      parts.push('(Could not load resident data)');
    }

    // 4. Recent Notices — visible to owner and member, NOT visitors
    if (isOwner || isMember) {
      try {
        const notices = await tenantDb
          .collection('notices')
          .find({ isActive: true })
          .sort({ createdAt: -1 })
          .limit(5)
          .toArray();

        if (notices.length > 0) {
          parts.push(`\n--- RECENT NOTICES (${notices.length}) ---`);
          for (const notice of notices) {
            const n = notice as any;
            parts.push(
              `  • [${n.priority?.toUpperCase()}] ${n.title}: ${n.content?.substring(0, 120)}${n.content?.length > 120 ? '...' : ''}`
            );
          }
        }
      } catch {
        // Skip notices
      }
    }

    // 5. Payments Overview — owner only (contains revenue info)
    if (isOwner) {
      try {
        const currentMonth = new Date().toISOString().substring(0, 7);
        const payments = await tenantDb
          .collection('rentPayments')
          .find({ month: currentMonth })
          .toArray();

        const paidCount = payments.filter((p: any) => p.status === 'paid').length;
        const pendingCount = payments.filter((p: any) => p.status === 'pending' || p.status === 'overdue').length;
        const totalPaid = payments
          .filter((p: any) => p.status === 'paid')
          .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

        if (payments.length > 0) {
          parts.push(`\n--- PAYMENTS THIS MONTH (${currentMonth}) ---`);
          parts.push(`Paid: ${paidCount} residents, Pending: ${pendingCount} residents`);
          parts.push(`Total collected: ₹${totalPaid}`);
        }
      } catch {
        // Skip payments
      }
    }

    // 6. Pending Issues — owner only
    if (isOwner) {
      try {
        const openComplaints = await tenantDb
          .collection('complaints')
          .countDocuments({ status: { $ne: 'resolved' } });
        const openMaintenance = await tenantDb
          .collection('maintenance')
          .countDocuments({ status: { $ne: 'resolved' } });

        if (openComplaints > 0 || openMaintenance > 0) {
          parts.push('\n--- PENDING ISSUES ---');
          if (openComplaints > 0) parts.push(`Open complaints: ${openComplaints}`);
          if (openMaintenance > 0) parts.push(`Pending maintenance requests: ${openMaintenance}`);
        }
      } catch {
        // Skip
      }
    }

    // 7. Staff Overview — owner only (contains salary information)
    if (isOwner) {
      try {
        const staff = await tenantDb
          .collection('staff')
          .find({ isActive: true })
          .sort({ role: 1 })
          .toArray();

        if (staff.length > 0) {
          parts.push(`\n--- STAFF (${staff.length}) ---`);
          for (const member of staff) {
            const s = member as any;
            parts.push(
              `  • ${s.name} — ${s.role}, Salary: ₹${s.salary}/month, Phone: ${s.phone || 'N/A'}, Joined: ${s.joinDate ? new Date(s.joinDate).toLocaleDateString() : 'N/A'}`
            );
          }

          // Total monthly salary expense
          const totalSalaryResult = await tenantDb
            .collection('staff')
            .aggregate([
              { $match: { isActive: true } },
              { $group: { _id: null, total: { $sum: '$salary' } } },
            ])
            .toArray();
          const totalSalary = totalSalaryResult[0]?.total || 0;
          parts.push(`\nTotal Monthly Salary Expense: ₹${totalSalary}`);
        }
      } catch {
        // Skip staff
      }
    }

    // 8. Inventory Overview — owner only
    if (isOwner) {
      try {
        const items = await tenantDb
          .collection('inventory')
          .find()
          .sort({ category: 1, name: 1 })
          .toArray();

        if (items.length > 0) {
          parts.push(`\n--- INVENTORY (${items.length} items) ---`);

          // Group by category for readability
          const byCategory = new Map<string, any[]>();
          for (const item of items) {
            const i = item as any;
            const cat = i.category || 'Uncategorized';
            if (!byCategory.has(cat)) byCategory.set(cat, []);
            byCategory.get(cat)!.push(i);
          }

          for (const [category, categoryItems] of byCategory) {
            parts.push(`\n  ${category}:`);
            for (const item of categoryItems.slice(0, 8)) {
              parts.push(
                `    • ${item.name} — Qty: ${item.quantity}, Condition: ${item.condition}, Location: ${item.location || 'N/A'}`
              );
            }
            if (categoryItems.length > 8) {
              parts.push(`    ... and ${categoryItems.length - 8} more items in ${category}`);
            }
          }
        }
      } catch {
        // Skip inventory
      }
    }

    parts.push('');
  } catch (error) {
    console.error('Failed to build tenant context:', error);
    parts.push('(Could not load PG data for context)');
  }

  return parts.join('\n');
}

export function buildSystemPrompt(
  settings: IAISettings,
  tenantContext: string,
  role: UserRole = 'visitor'
): string {
  const { branding } = settings;
  const tone = branding.tone || 'professional';
  const isOwner = role === 'owner' || role === 'admin';

  const toneInstructions: Record<string, string> = {
    professional:
      'Respond in a professional, courteous manner. Be precise and clear.',
    friendly:
      'Respond in a warm, friendly manner. Be approachable and helpful.',
    formal:
      'Respond in a formal, respectful tone. Use proper language and structure.',
    casual:
      'Respond in a casual, conversational tone. Be relaxed and easygoing.',
  };

  // Role-specific privacy rules
  const privacyRules = isOwner
    ? `PRIVACY & CAPABILITIES (you are speaking to the PG OWNER or ADMIN):
- You have FULL ACCESS to all tenant data including individual resident names, rents, phone numbers, payment records, revenue, and pending issues.
- You can answer any question about operations, finances, residents, and management.
- Help generate notices, summarize reports, classify complaints, and provide insights.
- You may reveal any data shown in the context below.`
    : role === 'member'
    ? `PRIVACY & CAPABILITIES (you are speaking to a RESIDENT/MEMBER):
- You can ONLY answer about public information and this resident's own data.
- You MUST NEVER reveal another resident's name, rent, payment status, phone number, or any personal information.
- If asked about another resident's rent or personal details, say "I'm sorry, I cannot share another resident's personal information."
- You may share: room availability, PG facility info, recent notices, general rules.
- You CANNOT share: revenue, total collected rent, pending payment amounts, complaint counts.`
    : `PRIVACY & CAPABILITIES (you are speaking to a VISITOR or website guest):
- You can ONLY share public PG information.
- You may answer: room availability, AC/Non-AC pricing, facilities, address, contact info, general rules.
- You MUST NOT share: any resident names, individual rent amounts, payment data, notices, or internal issues.
- If asked about specific resident data or revenue, say "I'm sorry, that information is private."`;

  return `You are "${branding.name || 'PG Assistant'}", an AI assistant for a Paying Guest (PG) accommodation management system.

${toneInstructions[tone] || toneInstructions.professional}

${branding.welcomeMessage ? `Welcome message: "${branding.welcomeMessage}"` : ''}

${privacyRules}

RULES:
- ALWAYS use the real data in the "TENANT DATA CONTEXT" section below to answer questions
- Be concise but thorough — keep responses under 400 words
- If a specific detail is not in the data provided, say so clearly — do not make up information

========== TENANT DATA CONTEXT ==========
${tenantContext}
==========================================`;
}

export async function getTenantAISettings(
  tenantId: string
): Promise<IAISettings | null> {
  try {
    const db = await connectToTenantDb(tenantId);
    const settings = await db
      .collection<IAISettings>('aiSettings')
      .findOne({});
    return settings;
  } catch (error) {
    console.error('Failed to load AI settings:', error);
    return null;
  }
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 20,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

// ─── Conversation Storage ────────────────────────────────────────────
// Conversations are stored in the tenant DB under the `aiConversations` collection.
// Each document contains an array of messages (limited to 200 per conversation).

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Conversation {
  _id?: any;
  tenantId: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export async function createConversation(
  tenantId: string,
  title?: string
): Promise<string> {
  const db = await connectToTenantDb(tenantId);
  const result = await db.collection('aiConversations').insertOne({
    tenantId,
    title: title || 'New Chat',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result.insertedId.toString();
}

export async function getConversations(
  tenantId: string
): Promise<Array<{ _id: string; title: string; messageCount: number; updatedAt: Date }>> {
  const db = await connectToTenantDb(tenantId);
  const conversations = await db
    .collection('aiConversations')
    .find({ tenantId })
    .sort({ updatedAt: -1 })
    .toArray();

  return conversations.map((c: any) => ({
    _id: c._id.toString(),
    title: c.title,
    messageCount: c.messages?.length || 0,
    updatedAt: c.updatedAt,
  }));
}

export async function getConversation(
  tenantId: string,
  conversationId: string
): Promise<{
  _id: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
} | null> {
  const db = await connectToTenantDb(tenantId);
  const conversation = await db
    .collection('aiConversations')
    .findOne({ _id: new ObjectId(conversationId), tenantId });

  if (!conversation) return null;

  return {
    _id: conversation._id.toString(),
    title: conversation.title,
    messages: conversation.messages || [],
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

export async function addMessageToConversation(
  tenantId: string,
  conversationId: string,
  message: ConversationMessage
): Promise<void> {
  const db = await connectToTenantDb(tenantId);

  await db.collection('aiConversations').updateOne(
    { _id: new ObjectId(conversationId), tenantId },
    {
      $push: { messages: message as any },
      $set: { updatedAt: new Date() },
    } as any
  );
}

export async function updateConversationTitle(
  tenantId: string,
  conversationId: string,
  title: string
): Promise<void> {
  const db = await connectToTenantDb(tenantId);

  await db.collection('aiConversations').updateOne(
    { _id: new ObjectId(conversationId), tenantId },
    { $set: { title, updatedAt: new Date() } }
  );
}

export async function deleteConversation(
  tenantId: string,
  conversationId: string
): Promise<void> {
  const db = await connectToTenantDb(tenantId);

  await db.collection('aiConversations').deleteOne({
    _id: new ObjectId(conversationId),
    tenantId,
  });
}
