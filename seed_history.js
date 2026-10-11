import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = 'https://rfzifediywtzmbxbzyno.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmemlmZWRpeXd0em1ieGJ6eW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MzMzNTQsImV4cCI6MjEwNjUwOTM1NH0.FsgvcoFkeXO4-zrgT_fgFkq_JQ10nl4diBenLgES-p4';
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper for dates
function getPastDate(weeksAgo) {
  const d = new Date();
  d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1)); // get last monday
  d.setDate(d.getDate() - (weeksAgo * 7));
  return d.toISOString().split('T')[0];
}

async function run() {
  console.log('Fetching data...');
  
  const { data: settingsData } = await supabase.from('settings').select('*').eq('id', 'admin').single();
  const pillars = settingsData.pillar_questions;
  
  const { data: cells } = await supabase.from('cells').select('*');
  const { data: roster } = await supabase.from('roster').select('*');
  
  if (!cells || cells.length === 0) return console.log('No cells found.');
  
  console.log('Modifying roster types for variety...');
  // Modify some members to be RM, V, C
  for (const cell of cells) {
    const members = roster.filter(m => m.cellid === cell.id && m.name !== cell.leadername); // Exclude leader
    
    // Pick 2 RM
    if (members.length >= 2) {
      await supabase.from('roster').update({ type: 'RM' }).eq('id', members[0].id);
      await supabase.from('roster').update({ type: 'RM' }).eq('id', members[1].id);
    }
    
    // Pick 1-2 V
    const vCount = Math.floor(Math.random() * 2) + 1;
    for (let i = 2; i < 2 + vCount && i < members.length; i++) {
      await supabase.from('roster').update({ type: 'V' }).eq('id', members[i].id);
    }
    
    // Pick 2-4 C
    const cCount = Math.floor(Math.random() * 3) + 2;
    for (let i = 4; i < 4 + cCount && i < members.length; i++) {
      await supabase.from('roster').update({ type: 'C' }).eq('id', members[i].id);
    }
  }

  console.log('Generating 6 months (24 weeks) of meetings and assessments...');
  
  const allMeetings = [];
  const allAssessments = [];
  
  // Create a consistent "personality" for each member for scoring
  const memberPersonalities = {};
  roster.forEach(m => {
    const r = Math.random();
    if (r < 0.2) memberPersonalities[m.id] = 'high';
    else if (r < 0.6) memberPersonalities[m.id] = 'mid';
    else if (r < 0.8) memberPersonalities[m.id] = 'low';
    else memberPersonalities[m.id] = 'erratic';
  });

  for (let w = 24; w >= 0; w--) {
    const dateStr = getPastDate(w);
    
    for (const cell of cells) {
      const cellMembers = roster.filter(m => m.cellid === cell.id);
      
      // Meeting
      const attendeesMap = {};
      const attendeesList = [];
      let presentCount = 0;
      cellMembers.forEach(m => {
        // 80% attendance rate for M/RM, 40% for V, 90% for C
        let chance = 0.8;
        if (m.type === 'V') chance = 0.4;
        if (m.type === 'C') chance = 0.9;
        
        if (Math.random() < chance) {
          attendeesMap[m.id] = true;
          attendeesList.push(m.id);
          presentCount++;
        } else {
          attendeesMap[m.id] = false;
        }
      });
      
      allMeetings.push({
        id: crypto.randomUUID(),
        cellid: cell.id,
        date: dateStr,
        attendees: attendeesList,
        salvations: Math.random() < 0.2 ? 1 : 0,
        welfare: Math.random() < 0.1 ? 50 : 0
      });

      // Assessments
      for (const member of cellMembers) {
        // Children and Visitors usually don't do assessments, but let's say 20% do
        if (member.type === 'V' || member.type === 'C') {
          if (Math.random() > 0.2) continue;
        }
        // If they didn't attend, 50% chance they still did assessment
        if (!attendeesMap[member.id] && Math.random() > 0.5) continue;
        
        const personality = memberPersonalities[member.id];
        const scoresObj = { _snapshot: pillars };
        
        pillars.forEach((pillar, pIdx) => {
          scoresObj[pIdx] = {};
          pillar.questions.forEach((q, qIdx) => {
            let score = 0;
            if (personality === 'high') {
              score = Math.floor(Math.random() * 2) + 4; // 4 or 5
            } else if (personality === 'mid') {
              score = Math.floor(Math.random() * 3) + 2; // 2, 3, 4
            } else if (personality === 'low') {
              score = Math.floor(Math.random() * 2) + 1; // 1 or 2
            } else {
              // erratic: 0 to 5
              score = Math.floor(Math.random() * 6);
            }
            if (score > 0) scoresObj[pIdx][qIdx] = score;
          });
        });

        allAssessments.push({
          id: `${cell.id}_${member.id}_${dateStr}`,
          cellid: cell.id,
          memberid: member.id,
          date: dateStr,
          scores: scoresObj,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  // Insert in chunks to avoid payload limits
  console.log(`Inserting ${allMeetings.length} meetings...`);
  const chunkSize = 500;
  for (let i = 0; i < allMeetings.length; i += chunkSize) {
    const chunk = allMeetings.slice(i, i + chunkSize);
    await supabase.from('meetings').insert(chunk);
  }
  
  console.log(`Inserting ${allAssessments.length} assessments...`);
  for (let i = 0; i < allAssessments.length; i += chunkSize) {
    const chunk = allAssessments.slice(i, i + chunkSize);
    const { error } = await supabase.from('assessments').upsert(chunk);
    if (error) console.error("Error inserting assessments:", error);
  }

  console.log('Fully populated Sandbox with 6 months of historical data!');
}

run();
