import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx';

const supabaseUrl = 'https://matrhsaxqhkiblurpczo.supabase.co';
const supabaseAnonKey = 'sb_publishable_O7wjzST6KohORG--2DV_2Q_KnJJT47t';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to check if a name is likely the leader
function isLeader(memberName, leaderName) {
  if (!memberName || !leaderName) return false;
  const m = memberName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const l = leaderName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (m.includes(l) || l.includes(m)) return true;
  
  const mWords = memberName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const lWords = leaderName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  
  let matches = 0;
  for (const mw of mWords) {
    if (lWords.includes(mw)) matches++;
  }
  
  if (matches >= 2) return true;
  
  return false;
}

async function run() {
  const { data: cells } = await supabase.from('cells').select('*');
  
  console.log('Cleaning up previously inserted non-test members...');
  for (const cell of cells) {
    if (cell.id.toLowerCase().includes('test') || cell.name.toLowerCase().includes('test')) continue;
    await supabase.from('roster').delete().eq('cellid', cell.id);
  }

  const workbook = xlsx.readFile('C:\\Users\\jason\\AppData\\Local\\Packages\\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\\LocalState\\sessions\\CD472D4E136A587B0C3486485FB2C46F804007E5\\transfers\\2026-32\\Cells Reporting Template.xlsx');
  
  console.log('\n--- Processing Excel Sheets ---');
  let totalMembers = 0;
  const cellCounts = {};

  for (const sheetName of workbook.SheetNames) {
    if (sheetName.toLowerCase().includes('consol') || sheetName.toLowerCase().includes('instruction')) continue;
    
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    if (data.length < 2) continue;

    const row0 = data[0]; 
    const row1 = data[1]; 
    
    let leaderValue = null;
    for (const key of Object.keys(row0)) {
       const val = row0[key];
       if (typeof val === 'string' && val !== 'Cell Leader: ' && val !== 'Cell Name: ' && val.trim() !== '') {
           leaderValue = val.trim();
           break;
       }
    }
    if (!leaderValue) continue;

    let matchedCell = cells.find(c => {
       if (c.id.toLowerCase().includes('test') || c.name.toLowerCase().includes('test')) return false;
       return c.leadername && c.leadername.toLowerCase().includes(leaderValue.toLowerCase());
    });

    if (!matchedCell) {
       matchedCell = cells.find(c => {
         if (c.id.toLowerCase().includes('test') || c.name.toLowerCase().includes('test')) return false;
         return c.name.toLowerCase().replace(/\s+/g, '') === sheetName.toLowerCase().replace(/\s+/g, '');
       });
    }

    if (!matchedCell) continue;

    let nameKey = null;
    let phoneKey = null;
    let typeKey = null;
    let indexKey = null; // The '#' column

    for (const key of Object.keys(row1)) {
       const val = row1[key];
       if (typeof val === 'string') {
           const lower = val.toLowerCase().replace(/[\s\r\n]+/g, '');
           if (lower.includes('fullname') || lower.includes('name')) nameKey = key;
           if (lower.includes('phone')) phoneKey = key;
           if (lower.includes('member/visitor') || lower.includes('member')) typeKey = key;
           if (lower === '#' || lower === 'no' || lower === 'number') indexKey = key;
       }
    }

    if (!nameKey) continue;
    // Fallback for indexKey if it's the first key
    if (!indexKey) {
        indexKey = Object.keys(row1)[0];
    }

    const membersToInsert = [];
    
    for (let r = 2; r < data.length; r++) {
       const row = data[r];
       
       // Only process rows that have a number or value in the '#' column
       const idxVal = row[indexKey];
       if (idxVal === undefined || idxVal === null || String(idxVal).trim() === '') continue;
       
       const name = row[nameKey];
       if (!name || typeof name !== 'string' || name.trim() === '') continue;
       if (name.toLowerCase().includes('full name') || name.toLowerCase() === 'name') continue;
       if (name.toLowerCase() === 'none' || name.toLowerCase() === 'n/a') continue;
       
       if (isLeader(name.trim(), matchedCell.leadername)) {
         continue; // skip leader
       }
       
       let phone = phoneKey ? row[phoneKey] : '';
       if (phone === undefined || phone === null) phone = '';
       
       let typeVal = typeKey ? row[typeKey] : 'M';
       let typeStr = 'M';
       if (typeof typeVal === 'string') {
          const t = typeVal.toLowerCase();
          if (t.includes('v')) typeStr = 'V';
       }

       // Split names if they are like "Precious and Marvellous" or "Precious & Marvellous"
       const namesArray = [];
       if (name.toLowerCase().includes(' and ')) {
           const parts = name.split(/ and /i);
           parts.forEach(p => namesArray.push(p.trim()));
       } else if (name.includes('&')) {
           const parts = name.split('&');
           parts.forEach(p => namesArray.push(p.trim()));
       } else {
           namesArray.push(name.trim());
       }
       
       for (const singleName of namesArray) {
           if (singleName === '') continue;
           
           const id = `mem_${matchedCell.id}_${Date.now()}_${membersToInsert.length}_${r}`;
           
           membersToInsert.push({
              id,
              cellid: matchedCell.id,
              name: singleName,
              phone: String(phone).trim(),
              type: typeStr
           });
       }
    }

    if (membersToInsert.length > 0) {
       await supabase.from('roster').insert(membersToInsert);
       cellCounts[matchedCell.name] = membersToInsert.length;
       totalMembers += membersToInsert.length;
    }
  }
  
  console.log('\n--- Summary ---');
  for (const [cellName, count] of Object.entries(cellCounts)) {
    console.log(`${cellName}: ${count} members`);
  }
  console.log(`\nAll done! Total members inserted: ${totalMembers}`);
}

run().catch(console.error);
