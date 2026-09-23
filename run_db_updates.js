import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Fetching cells...');
  const { data: cells, error: cellsError } = await supabase.from('cells').select('*');
  
  if (cellsError) {
    console.error('Error fetching cells:', cellsError);
    return;
  }

  // 1. Delete test cells
  const testCells = cells.filter(c => {
    const name = c.name.toLowerCase();
    return name.includes('covenant test') || name.includes('grace test');
  });

  for (const cell of testCells) {
    console.log(`\n--- Cleaning up test cell: ${cell.name} (${cell.id}) ---`);
    await supabase.from('meetings').delete().eq('cellid', cell.id);
    await supabase.from('weeklyreports').delete().eq('cellid', cell.id);
    await supabase.from('roster').delete().eq('cellid', cell.id);
    await supabase.from('assessments').delete().eq('cellid', cell.id);
    await supabase.from('cells').delete().eq('id', cell.id);
    console.log(`Deleted all data for ${cell.name}`);
  }

  // 2. Add leaders to roster for remaining cells
  const { data: roster, error: rosterError } = await supabase.from('roster').select('*');
  if (rosterError) {
    console.error('Error fetching roster:', rosterError);
    return;
  }

  const remainingCells = cells.filter(c => !testCells.some(tc => tc.id === c.id));
  
  for (const cell of remainingCells) {
    // Check if a member with the leader's name exists in this cell
    const leaderExists = roster.some(r => r.cellid === cell.id && r.name.toLowerCase() === cell.leadername.toLowerCase());
    
    if (!leaderExists) {
      console.log(`Adding leader ${cell.leadername} to roster for cell ${cell.name}`);
      const id = Date.now().toString() + Math.floor(Math.random() * 1000);
      await supabase.from('roster').insert({
        id: id,
        cellid: cell.id,
        name: cell.leadername,
        phone: '', // Can be updated by them later
        type: 'M'
      });
      // Sleep to ensure unique IDs
      await new Promise(r => setTimeout(r, 10));
    } else {
      console.log(`Leader ${cell.leadername} already in roster for cell ${cell.name}`);
    }
  }

  console.log('\nData management complete!');
}

run().catch(console.error);
