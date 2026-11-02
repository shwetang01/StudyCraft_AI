const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function uploadAndSync() {
  const results = JSON.parse(fs.readFileSync('re_rendered_results.json', 'utf8'));
  console.log(`Uploading and updating ${results.length} figures...`);

  for (let i = 0; i < results.length; i++) {
    const item = results[i];
    const fileBytes = fs.readFileSync(item.local_path);
    const storagePath = item.storage_path;

    // 1. Upload to Supabase Storage bucket book-figures
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('book-figures')
      .upload(storagePath, fileBytes, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadErr) {
      console.error(`[${i+1}] Failed to upload ${storagePath}:`, uploadErr);
      continue;
    }

    // 2. Update book_figures record
    const { error: updateErr } = await supabase
      .from('book_figures')
      .update({
        storage_path: storagePath,
        metadata: {
          format: 'png',
          source: 'rendered_pixmap_srgb',
          width: item.width,
          height: item.height,
        },
      })
      .eq('id', item.id);

    if (updateErr) {
      console.error(`[${i+1}] Failed to update book_figures ${item.id}:`, updateErr);
    } else {
      console.log(`[${i+1}/${results.length}] Successfully updated Figure ${item.id} -> ${storagePath}`);
    }
  }

  console.log('All figures updated in Supabase Storage and database successfully!');
}

uploadAndSync();

