import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

import { getAdminClient } from '../src/lib/supabase/admin';

async function test() {
  const supabase = getAdminClient();
  const bookId = '4d702ea1-d284-4f69-9f5f-fc296e80a318';

  // Test 1: Plain query
  const q1 = 'Newton laws motion';
  const { data: res1, error: err1 } = await (supabase as any).rpc('match_book_chunks_text', {
    p_book_id: bookId,
    p_query_text: q1,
    p_match_count: 5,
  });
  console.log('Result for "Newton laws motion":', res1?.length, err1);
  if (res1 && res1.length > 0) {
    console.log('First chunk page:', res1[0].printed_page_number, res1[0].content.slice(0, 150));
  }
}

test().catch(console.error);

