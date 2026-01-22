import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Identity } from 'spacetimedb';
import {
  DbConnection,
  ErrorContext,
  EventContext,
  tables,
  reducers,
} from './module_bindings/index.js';

// Configuration
const SPACETIMEDB_URI = process.env.SPACETIMEDB_URI ?? 'ws://localhost:3000';
const MODULE_NAME = process.env.SPACETIMEDB_MODULE ?? 'nodejs-ts';

// Token persistence (file-based for Node.js instead of localStorage)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = path.join(__dirname, '..', '.spacetimedb-token');

function loadToken(): string | undefined {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      return fs.readFileSync(TOKEN_FILE, 'utf-8').trim();
    }
  } catch (err) {
    console.warn('Could not load token:', err);
  }
  return undefined;
}

function saveToken(token: string): void {
  try {
    fs.writeFileSync(TOKEN_FILE, token, 'utf-8');
  } catch (err) {
    console.warn('Could not save token:', err);
  }
}

// Connection state
let conn: DbConnection | null = null;

// Connection callbacks
function onConnect(_conn: DbConnection, identity: Identity, token: string): void {
  console.log('Connected to SpacetimeDB!');
  console.log('Identity:', identity.toHexString());

  // Save token for future connections
  saveToken(token);

  // Subscribe to all tables
  _conn
    .subscriptionBuilder()
    .onApplied((ctx) => {
      console.log('Subscription applied, initial data received');

      // Log all existing people
      const people = ctx.db.person.iter();
      console.log('Current people in database:');
      for (const person of people) {
        console.log(`  - ${person.name}`);
      }

      // Example: Add a person after subscription is ready
      console.log('\nAdding a new person...');
      _conn.reducers.add({ name: `Node-User-${Date.now()}` });
    })
    .onError((ctx, err) => {
      console.error('Subscription error:', err);
    })
    .subscribeToAllTables();

  // Register callbacks for table changes
  _conn.db.person.onInsert((ctx: EventContext, person) => {
    console.log(`[INSERT] New person added: ${person.name}`);
  });

  _conn.db.person.onDelete((ctx: EventContext, person) => {
    console.log(`[DELETE] Person removed: ${person.name}`);
  });
}

function onDisconnect(_ctx: ErrorContext, error?: Error): void {
  if (error) {
    console.error('Disconnected with error:', error);
  } else {
    console.log('Disconnected from SpacetimeDB');
  }
}

function onConnectError(_ctx: ErrorContext, error: Error): void {
  console.error('Connection error:', error);
  process.exit(1);
}

// Main entry point
async function main(): Promise<void> {
  console.log(`Connecting to SpacetimeDB at ${SPACETIMEDB_URI}...`);
  console.log(`Module: ${MODULE_NAME}`);

  const token = loadToken();
  if (token) {
    console.log('Using saved authentication token');
  }

  // Build and establish connection
  conn = DbConnection.builder()
    .withUri(SPACETIMEDB_URI)
    .withModuleName(MODULE_NAME)
    .withToken(token)
    .onConnect(onConnect)
    .onDisconnect(onDisconnect)
    .onConnectError(onConnectError)
    .build();

  console.log('Connection initiated, waiting for callbacks...');
}

// Graceful shutdown
function shutdown(): void {
  console.log('\nShutting down...');
  if (conn) {
    conn.disconnect();
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Run the main function
main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
