import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://matrhsaxqhkiblurpczo.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_O7wjzST6KohORG--2DV_2Q_KnJJT47t';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanup() {
  console.log('Fetching cells...');
  const { data: cells, error: cellsError } = await supabase.from('cells').select('*');
  
  if (cellsError) {
    console.error('Error fetching cells:', cellsError);
    return;
  }

  for (const cell of cells) {
    const isCovenantTest = cell.name.toLowerCase().includes('covenant test');

    if (isCovenantTest) {
      console.log(`Skipping data deletion for ${cell.name} (covenant test)`);
      continue;
    }

    console.log(`\n--- Cleaning up data for ${cell.name} ---`);
    
    // Delete associated data
    await supabase.from('meetings').delete().eq('cellid', cell.id);
    await supabase.from('weeklyreports').delete().eq('cellid', cell.id);
    await supabase.from('roster').delete().eq('cellid', cell.id);
    await supabase.from('assessments').delete().eq('cellid', cell.id);
    
    console.log(`Deleted roster, meetings, reports, and assessments for ${cell.name}`);

    // Set password to null
    await supabase.from('cells').update({ password: null }).eq('id', cell.id);
    console.log(`Set password to null for ${cell.name}`);
  }

  console.log('\nCleanup complete!');
}

cleanup().catch(console.error);
