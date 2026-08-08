import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://matrhsaxqhkiblurpczo.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_O7wjzST6KohORG--2DV_2Q_KnJJT47t';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seed() {
  console.log('Fetching cells...');
  const { data: cells } = await supabase.from('cells').select('*');
  
  let covenantCell = cells?.find(c => c.name.toLowerCase().includes('covenant'));
  let otherCell = cells?.find(c => !c.name.toLowerCase().includes('covenant'));

  if (!covenantCell) {
    console.log('Creating Covenant cell...');
    const id = 'cell_' + Date.now();
    await supabase.from('cells').insert({ id, name: 'Covenant', leadername: 'Test Leader 1', password: '123' });
    covenantCell = { id, name: 'Covenant' };
  }
  
  if (!otherCell) {
    console.log('Creating Grace cell...');
    const id = 'cell_' + (Date.now() + 1);
    await supabase.from('cells').insert({ id, name: 'Grace', leadername: 'Test Leader 2', password: '123' });
    otherCell = { id, name: 'Grace' };
  }

  const cellsToSeed = [covenantCell, otherCell];

  // Cleanup existing test meetings/reports
  console.log('Cleaning up existing meetings/reports...');
  await supabase.from('meetings').delete().neq('id', 'dummy');
  await supabase.from('weeklyreports').delete().neq('id', 'dummy');

  for (const cell of cellsToSeed) {
    console.log(`\nSeeding members for ${cell.name}...`);
    // Create 3 members
    const memberIds = [];
    for (let i = 1; i <= 3; i++) {
      const id = `mem_${cell.id}_${i}`;
      await supabase.from('roster').upsert({ id, cellid: cell.id, name: `${cell.name} Member ${i}`, phone: '555-0000', type: 'M' });
      memberIds.push(id);
    }

    console.log(`Seeding 3 meetings & reports for ${cell.name}...`);
    for (let i = 1; i <= 3; i++) {
      const date = new Date(2026, 7, i); // August 1-5, 2026
      const dateStr = date.toISOString().split('T')[0];
      
      const meetingId = `${cell.id}_${dateStr}`;
      await supabase.from('meetings').upsert({
        id: meetingId,
        cellid: cell.id,
        date: dateStr,
        attendees: memberIds,
        salvations: Math.floor(Math.random() * 3),
        welfare: Math.floor(Math.random() * 2)
      });

      const reportId = `${cell.id}_${dateStr}`;
      await supabase.from('weeklyreports').upsert({
        id: reportId,
        cellid: cell.id,
        date: dateStr,
        q1: Math.floor(Math.random() * 3 + 1).toString(),
        q2: 'Prayed for families and healing.',
        q3: 'Distractions and busy schedules.',
        q4: 'Someone got a new job!',
        timestamp: new Date().toISOString()
      });
    }
    console.log(`Finished ${cell.name}.`);
  }
  console.log('\nAll done!');
}

seed().catch(console.error);
