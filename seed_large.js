import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://matrhsaxqhkiblurpczo.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_O7wjzST6KohORG--2DV_2Q_KnJJT47t';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const sentencesQ2 = [
  "We focused heavily on intercessory prayer for healing and financial breakthrough.",
  "Practiced praying in the spirit and saw immense peace in the room.",
  "Our focus was on praying for families and marriages.",
  "We spent time in worship and thanksgiving, thanking God for his grace.",
  "Focused on praying for career advancement and job opportunities.",
  "Prayed for the youth and students facing anxiety at school."
];

const sentencesQ3 = [
  "Main barriers were lack of time due to busy work schedules and fatigue.",
  "Some members struggled with distractions during personal prayer.",
  "Anxiety and depression are common themes making it hard to focus.",
  "Financial stress is taking a toll on many families.",
  "Inconsistency and lack of discipline in daily routines.",
  "Sickness and health issues prevented some from joining."
];

const sentencesQ4 = [
  "Amazing testimony of someone getting a new job after months of waiting!",
  "God provided healing for a member's mother who was sick.",
  "A huge financial breakthrough and debt cancellation testimony.",
  "Someone experienced peace from anxiety and depression this week.",
  "Family reconciliation and restored relationships.",
  "A member shared about discovering a new passion and faith in God's grace."
];

function getRandomItems(arr, count) {
  const shuffled = arr.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).join(' ');
}

async function seed() {
  console.log('Fetching cells...');
  const { data: cells } = await supabase.from('cells').select('*');
  
  let covenantCell = cells?.find(c => c.name.toLowerCase().includes('covenant'));
  let otherCell = cells?.find(c => c.name.toLowerCase().includes('grace') || !c.name.toLowerCase().includes('covenant'));

  const cellsToSeed = [covenantCell, otherCell].filter(Boolean);

  console.log('Cleaning up existing meetings/reports...');
  await supabase.from('meetings').delete().neq('id', 'dummy');
  await supabase.from('weeklyreports').delete().neq('id', 'dummy');

  for (const cell of cellsToSeed) {
    console.log(`\nFetching members for ${cell.name}...`);
    const { data: members } = await supabase.from('roster').select('id').eq('cellid', cell.id);
    const memberIds = members?.map(m => m.id) || [];

    console.log(`Seeding 52 meetings & reports for ${cell.name}...`);
    
    // Distribute across last 52 weeks
    for (let i = 0; i < 52; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7)); // 1 meeting per week going back
      const dateStr = date.toISOString().split('T')[0];
      
      const meetingId = `${cell.id}_${dateStr}`;
      
      // Random attendees (at least half)
      const numAttendees = Math.max(1, Math.floor(Math.random() * memberIds.length) + Math.ceil(memberIds.length / 2));
      const attendees = memberIds.sort(() => 0.5 - Math.random()).slice(0, numAttendees);

      await supabase.from('meetings').upsert({
        id: meetingId,
        cellid: cell.id,
        date: dateStr,
        attendees: attendees,
        salvations: Math.floor(Math.random() * 3),
        welfare: Math.floor(Math.random() * 2)
      });

      const reportId = `${cell.id}_${dateStr}`;
      
      const custom_responses = {
        "Number of members who maintained a consistent prayer routine during the week - prayed at least 5 days this week.": Math.floor(Math.random() * 5 + 1).toString(),
        "What prayer component or type did the cell practise and demonstrated growth in this week?": getRandomItems(sentencesQ2, 2),
        "What common barriers in prayer are affecting the cell members.": getRandomItems(sentencesQ3, 2),
        "Testimonies & Breakthroughs - themes": getRandomItems(sentencesQ4, 2)
      };

      await supabase.from('weeklyreports').upsert({
        id: reportId,
        cellid: cell.id,
        date: dateStr,
        q1: custom_responses["Number of members who maintained a consistent prayer routine during the week - prayed at least 5 days this week."] || '',
        q2: custom_responses["What prayer component or type did the cell practise and demonstrated growth in this week?"] || '',
        q3: custom_responses["What common barriers in prayer are affecting the cell members."] || '',
        q4: custom_responses["Testimonies & Breakthroughs - themes"] || '',
        custom_responses: custom_responses,
        timestamp: new Date().toISOString()
      });
    }
    console.log(`Finished ${cell.name}.`);
  }
  console.log('\nAll done!');
}

seed().catch(console.error);
