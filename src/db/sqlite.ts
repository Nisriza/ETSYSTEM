import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface AppDatabase {
  get(sql: string, params?: any[]): Promise<any>;
  all(sql: string, params?: any[]): Promise<any[]>;
  run(sql: string, params?: any[]): Promise<{ lastID?: number; changes?: number }>;
  exec(sql: string): Promise<void>;
}

function escapeParam(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (val instanceof Date) return `'${val.toISOString()}'`;
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

function bindParams(sql: string, params: any[]): string {
  let idx = 0;
  return sql.replace(/\?/g, () => {
    if (idx < params.length) return escapeParam(params[idx++]);
    return '?';
  });
}

function createSupabaseAdapter(supabase: SupabaseClient): AppDatabase {
  return {
    async get(sql: string, params: any[] = []): Promise<any> {
      const finalSql = bindParams(sql, params);
      const { data, error } = await supabase.rpc('exec_sql', { query: finalSql });
      if (error) throw new Error(`Supabase get error: ${error.message}`);
      return data?.[0] ?? null;
    },
    async all(sql: string, params: any[] = []): Promise<any[]> {
      const finalSql = bindParams(sql, params);
      const { data, error } = await supabase.rpc('exec_sql', { query: finalSql });
      if (error) throw new Error(`Supabase all error: ${error.message}`);
      return data ?? [];
    },
    async run(sql: string, params: any[] = []): Promise<{ lastID?: number; changes?: number }> {
      const finalSql = bindParams(sql, params);
      const lowerSql = sql.trim().toUpperCase();

      if (lowerSql.startsWith('BEGIN') || lowerSql.startsWith('COMMIT') || lowerSql.startsWith('ROLLBACK')) {
        return {};
      }

      if (lowerSql.startsWith('INSERT')) {
        const returnSql = finalSql.replace(/;$/, '') + ' RETURNING id';
        const { data, error } = await supabase.rpc('exec_sql', { query: returnSql });
        if (error) throw new Error(`Supabase insert error: ${error.message}`);
        let lastID = null;
        if (data && data.length > 0) {
          const row = data[0];
          if (row.id !== undefined) lastID = row.id;
          else if (row.result && row.result.id !== undefined) lastID = row.result.id;
        }
        return { lastID, changes: 1 };
      }

      if (lowerSql.startsWith('UPDATE') || lowerSql.startsWith('DELETE')) {
        let returnSql = finalSql.replace(/;$/, '');
        if (!returnSql.toUpperCase().includes('WHERE')) {
          returnSql += ' WHERE 1=1';
        }
        returnSql += ' RETURNING 1 as affected';
        const { error } = await supabase.rpc('exec_sql', { query: returnSql });
        if (error) {
          throw new Error(`Supabase run error: ${error.message}`);
        }
        return { changes: 1 };
      }

      const { data, error } = await supabase.rpc('exec_sql', { query: finalSql });
      if (error) throw new Error(`Supabase exec error: ${error.message}`);
      return { changes: 1 };
    },
    async exec(sql: string): Promise<void> {
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      for (const stmt of statements) {
        const upper = stmt.toUpperCase();
        if (upper.startsWith('CREATE') || upper.startsWith('ALTER') || upper.startsWith('DROP')) {
          console.warn('Schema changes not supported via exec_sql RPC. Run supabase_schema.sql in Supabase SQL Editor manually. Skipping:', stmt.slice(0, 80));
          continue;
        }
        if (upper.startsWith('INSERT') || upper.startsWith('UPDATE') || upper.startsWith('DELETE')) {
          const { error } = await supabase.rpc('exec_sql', { query: stmt });
          if (error && !String(error.message).includes('already exists')) {
            console.warn('Supabase exec_sql warning:', error.message);
          }
        }
      }
    },
  };
}

let dbInstance: AppDatabase | null = null;

export async function getDB(): Promise<AppDatabase> {
  if (dbInstance) return dbInstance;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file. ' +
'Run supabase_schema.sql in your Supabase SQL Editor to set up the database schema.'
    );
  }

  console.log('Connecting to Supabase via RPC...');
  const supabase = createClient(supabaseUrl, supabaseKey, {
    db: { schema: 'public' },
  });

  const adapter = createSupabaseAdapter(supabase);
  await adapter.get('SELECT 1 as ok');

  console.log('Successfully connected to Supabase PostgreSQL via RPC.');
  dbInstance = adapter;
  return dbInstance;
}
