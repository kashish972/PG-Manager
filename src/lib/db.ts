import { MongoClient, Db } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';

let client: MongoClient | null = null;
let mainDb: Db | null = null;

export async function connectToMainDb(): Promise<Db> {
  if (mainDb) return mainDb;
  
  try {
    if (!client) {
      console.log('Connecting to MongoDB:', MONGO_URI.replace(/:[^:@]+@/, ':****@'));
      client = new MongoClient(MONGO_URI);
      await client.connect();
    }
    
    mainDb = client.db('pgmanager_main');
    return mainDb;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export async function connectToTenantDb(tenantId: string): Promise<Db> {
  try {
    if (!client) {
      client = new MongoClient(MONGO_URI);
      await client.connect();
    }
    
    return client.db(`pg_${tenantId}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export async function getClient(): Promise<MongoClient> {
  if (!client) {
    client = new MongoClient(MONGO_URI);
    await client.connect();
  }
  return client;
}

export async function closeDbConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    mainDb = null;
  }
}