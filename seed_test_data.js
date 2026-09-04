import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

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
  
  // Target test cells
  let covenantTest = cells?.find(c => c.id === '1786206217794');
  let graceTest = cells?.find(c => c.id === 'cell_1786208718044');

  const cellsToSeed = [covenantTest, graceTest].filter(Boolean);

  for (const cell of cellsToSeed) {
    console.log(`\n--- Seeding ${cell.name} ---`);
    
    console.log('Cleaning up existing data for this cell...');
    await supabase.from('meetings').delete().eq('cellid', cell.id);
    await supabase.from('weeklyreports').delete().eq('cellid', cell.id);
    await supabase.from('roster').delete().eq('cellid', cell.id);
    await supabase.from('assessments').delete().eq('cellid', cell.id);

    console.log(`Seeding 15 members for ${cell.name}...`);
    const memberIds = [];
    for (let i = 1; i <= 15; i++) {
      const id = `mem_${cell.id}_${i}`;
      await supabase.from('roster').insert({ 
        id, 
        cellid: cell.id, 
        name: `${cell.name} Member ${i}`, 
        phone: '555-' + Math.floor(1000 + Math.random() * 9000), 
        type: 'M' 
      });
      memberIds.push(id);
    }

    console.log(`Seeding 52 weeks of meetings & reports...`);
    // Distribute across last 52 weeks
    for (let i = 0; i < 52; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7)); // 1 meeting per week going back
      const dateStr = date.toISOString().split('T')[0];
      
      const meetingId = `${cell.id}_${dateStr}`;
      
      // Random attendees (between 8 and 15)
      const numAttendees = Math.floor(8 + Math.random() * 8);
      const attendees = memberIds.sort(() => 0.5 - Math.random()).slice(0, numAttendees);

      await supabase.from('meetings').insert({
        id: meetingId,
        cellid: cell.id,
        date: dateStr,
        attendees: attendees,
        salvations: Math.floor(Math.random() * 3),
        welfare: Math.floor(Math.random() * 2)
      });

      const reportId = `${cell.id}_${dateStr}`;
      
      const custom_responses = {
        "Number of members who maintained a consistent prayer routine during the week - prayed at least 5 days this week.": Math.floor(Math.random() * 5 + 5).toString(),
        "What prayer component or type did the cell practise and demonstrated growth in this week?": getRandomItems(sentencesQ2, 2),
        "What common barriers in prayer are affecting the cell members.": getRandomItems(sentencesQ3, 2),
        "Testimonies & Breakthroughs - themes": getRandomItems(sentencesQ4, 2)
      };

      await supabase.from('weeklyreports').insert({
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

      // Once a month (every 4 weeks), create an assessment for all members
      if (i % 4 === 0) {
        console.log(`Seeding assessments for date ${dateStr}...`);
        for (const mId of memberIds) {
          // random scores 
          // pillarIndex: 0-3, questionIndex: 0-3
          const scores = {};
          for (let p=0; p<4; p++) {
            scores[p] = {};
            for (let q=0; q<4; q++) {
              scores[p][q] = Math.floor(Math.random() * 5) + 1; // 1 to 5
            }
          }
          await supabase.from('assessments').insert({
            id: `${cell.id}_${mId}_${dateStr}`,
            cellid: cell.id,
            memberid: mId,
            date: dateStr,
            scores: scores,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    console.log(`Finished ${cell.name}.`);
  }
  console.log('\nAll done!');
}

seed().catch(console.error);
