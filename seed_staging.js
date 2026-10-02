import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = 'https://rfzifediywtzmbxbzyno.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmemlmZWRpeXd0em1ieGJ6eW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MzMzNTQsImV4cCI6MjEwNjUwOTM1NH0.FsgvcoFkeXO4-zrgT_fgFkq_JQ10nl4diBenLgES-p4';
const supabase = createClient(supabaseUrl, supabaseKey);

const cellNames = ['Northcliff Cell', 'Rosebank Cell', 'Sandton Cell'];
const leaderNames = ['Jason', 'Sarah', 'Michael'];
const cellIds = [];

const fNames = ['Alex', 'Brian', 'Chloe', 'David', 'Emma', 'Fiona', 'George', 'Hannah', 'Ian', 'Julia', 'Kevin', 'Laura', 'Matt', 'Nora', 'Oscar', 'Penny'];
const lNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

function getRandomName() {
  const f = fNames[Math.floor(Math.random() * fNames.length)];
  const l = lNames[Math.floor(Math.random() * lNames.length)];
  return `${f} ${l}`;
}

function getRandomPhone() {
  // random 10 digit number starting with 0
  const random8 = Math.floor(10000000 + Math.random() * 90000000);
  return `07${random8}`;
}

async function seed() {
  console.log('Seeding cells...');
  
  for (let i = 0; i < 3; i++) {
    const cellId = crypto.randomUUID();
    cellIds.push(cellId);
    
    // Create Cell
    const { error: cellErr } = await supabase.from('cells').insert({
      id: cellId,
      name: cellNames[i],
      leadername: leaderNames[i],
      password: 'password123',
    });
    if (cellErr) {
      console.error('Error creating cell:', cellErr);
      return;
    }
    
    // Add Leader to Roster
    await supabase.from('roster').insert({
      id: crypto.randomUUID(),
      cellid: cellId,
      name: leaderNames[i],
      phone: getRandomPhone(),
      type: 'M'
    });

    // Add 12-20 Members
    const numMembers = Math.floor(Math.random() * 9) + 12; // 12 to 20
    console.log(`Creating ${numMembers} members for ${cellNames[i]}...`);
    
    const members = [];
    for (let m = 0; m < numMembers; m++) {
      members.push({
        id: crypto.randomUUID(),
        cellid: cellId,
        name: getRandomName(),
        phone: getRandomPhone(),
        type: 'M'
      });
    }
    
    const { error: rosterErr } = await supabase.from('roster').insert(members);
    if (rosterErr) {
      console.error('Error inserting roster:', rosterErr);
    }
  }

  console.log('Seeding complete! 3 test cells and their members have been added.');
}

seed();
