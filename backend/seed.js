const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// 32 Key Ahmedabad Intersections Grid
const intersectionsData = [
  { name: 'CG Road Junction', lng: 72.5580, lat: 23.0265, status: 'CONGESTED' },
  { name: 'SG Highway Flyover (ISCON)', lng: 72.5100, lat: 23.0340, status: 'HEAVY' },
  { name: 'Ashram Road Corner', lng: 72.5714, lat: 23.0225, status: 'MODERATE' },
  { name: 'Navrangpura Crossroad', lng: 72.5450, lat: 23.0400, status: 'MODERATE' },
  { name: 'Satellite Circle', lng: 72.5250, lat: 23.0180, status: 'CLEAR' },
  { name: 'Paldi Square', lng: 72.5650, lat: 23.0110, status: 'MODERATE' },
  { name: 'Vastrapur Lake Circle', lng: 72.5280, lat: 23.0360, status: 'HEAVY' },
  { name: 'Bodakdev Junction', lng: 72.5180, lat: 23.0420, status: 'CONGESTED' },
  { name: 'Sola Bridge Intersection', lng: 72.5050, lat: 23.0650, status: 'CRITICAL' },
  { name: 'Drive-In Road Junction', lng: 72.5350, lat: 23.0480, status: 'MODERATE' },
  { name: 'Ellisbridge Bridge Head', lng: 72.5720, lat: 23.0260, status: 'HEAVY' },
  { name: 'Riverfront East Promenade', lng: 72.5810, lat: 23.0300, status: 'CLEAR' },
  { name: 'Maninagar Railway Cross', lng: 72.6020, lat: 22.9980, status: 'CRITICAL' },
  { name: 'Bapunagar Circle', lng: 72.6250, lat: 23.0410, status: 'HEAVY' },
  { name: 'Naroda Highway Junction', lng: 72.6510, lat: 23.0720, status: 'MODERATE' },
  { name: 'Kalupur Central Circle', lng: 72.5950, lat: 23.0280, status: 'CRITICAL' },
  { name: 'Prahlad Nagar Garden Corner', lng: 72.5090, lat: 23.0120, status: 'MODERATE' },
  { name: 'Thaltej Crossroad', lng: 72.5020, lat: 23.0500, status: 'HEAVY' },
  { name: 'Science City Circle', lng: 72.4950, lat: 23.0750, status: 'CLEAR' },
  { name: 'Gota Flyover Junction', lng: 72.5320, lat: 23.0920, status: 'CONGESTED' },
  { name: 'Ranip Bus Terminal Cross', lng: 72.5780, lat: 23.0780, status: 'MODERATE' },
  { name: 'RTO Circle', lng: 72.5750, lat: 23.0610, status: 'HEAVY' },
  { name: 'Usmanpura Underpass', lng: 72.5680, lat: 23.0450, status: 'CONGESTED' },
  { name: 'Law Garden Junction', lng: 72.5560, lat: 23.0210, status: 'MODERATE' },
  { name: 'Nehrunagar Circle', lng: 72.5420, lat: 23.0150, status: 'HEAVY' },
  { name: 'Ambawadi Crossroad', lng: 72.5480, lat: 23.0190, status: 'MODERATE' },
  { name: 'Shyamal Crossroad', lng: 72.5280, lat: 23.0080, status: 'CONGESTED' },
  { name: 'Jodhpur Crossroad', lng: 72.5200, lat: 23.0150, status: 'MODERATE' },
  { name: 'CTM Express Highway Entry', lng: 72.6350, lat: 22.9950, status: 'CRITICAL' },
  { name: 'Odhav Ring Road Circle', lng: 72.6620, lat: 23.0180, status: 'HEAVY' },
  { name: 'Nikol Circle', lng: 72.6580, lat: 23.0480, status: 'MODERATE' },
  { name: 'Sabarmati Ashram Circle', lng: 72.5800, lat: 23.0600, status: 'CLEAR' }
];

// Seed Police Checkpoints
const checkpointsData = [
  { name: 'CG Road Police Checkpost', notes: 'Strict Helmet & License Checking in progress', lng: 72.5565, lat: 23.0255, active_from: '08:00:00', active_to: '22:00:00' },
  { name: 'SG Highway Underpass Trap', notes: 'Speed camera & Helmet enforcement team', lng: 72.5120, lat: 23.0325, active_from: '08:00:00', active_to: '22:00:00' },
  { name: 'Ashram Road Security Gate', notes: 'Routine document & helmet verification', lng: 72.5700, lat: 23.0210, active_from: '08:00:00', active_to: '22:00:00' },
  { name: 'University Area Drive-through Check', notes: 'Two-wheeler helmet checking squad', lng: 72.5430, lat: 23.0385, active_from: '08:00:00', active_to: '22:00:00' },
  { name: 'Vastrapur Lake Police Outpost', notes: 'Evening helmet inspection drive', lng: 72.5270, lat: 23.0350, active_from: '08:00:00', active_to: '22:00:00' },
  { name: 'Bodakdev Circle Police Booth', notes: 'Triple riding & helmet check', lng: 72.5170, lat: 23.0410, active_from: '08:00:00', active_to: '22:00:00' },
  { name: 'Ellisbridge Security Post', notes: 'Bridge entrance license & helmet check', lng: 72.5710, lat: 23.0250, active_from: '08:00:00', active_to: '22:00:00' },
  { name: 'Maninagar Traffic Police Squad', notes: 'Railway crossing helmet enforcement squad', lng: 72.6010, lat: 22.9970, active_from: '08:00:00', active_to: '22:00:00' },
  { name: 'Prahlad Nagar Police Check', notes: 'Garden side traffic helmet checking', lng: 72.5080, lat: 23.0110, active_from: '08:00:00', active_to: '22:00:00' },
  { name: 'Thaltej Highway Checkpost', notes: 'Over-speeding & helmet check', lng: 72.5010, lat: 23.0490, active_from: '08:00:00', active_to: '22:00:00' },
  { name: 'RTO Circle Traffic Patrol', notes: 'Document & license checking squad', lng: 72.5740, lat: 23.0600, active_from: '08:00:00', active_to: '22:00:00' },
  { name: 'Nehrunagar Police Check', notes: 'Two-wheeler helmet enforcement', lng: 72.5410, lat: 23.0140, active_from: '08:00:00', active_to: '22:00:00' },
  { name: 'Shyamal Crossroad Police Trap', notes: 'Inter-city checkpoint', lng: 72.5270, lat: 23.0070, active_from: '08:00:00', active_to: '22:00:00' },
  { name: 'CTM Highway Entrance Check', notes: 'Expressway entry helmet & belt check', lng: 72.6340, lat: 22.9940, active_from: '08:00:00', active_to: '22:00:00' }
];

async function seed() {
  console.log('🌱 Starting Expanded 32-Intersection Supabase Seeding...');

  try {
    console.log('Clearing old checkpoints...');
    await supabase.from('checkpoints').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('vehicle_counts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('predictions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('signal_timings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('intersections').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('Inserting Police Checkpoints...');
    for (const cp of checkpointsData) {
      const pointWkt = `POINT(${cp.lng} ${cp.lat})`;
      await supabase
        .from('checkpoints')
        .insert({
          name: cp.name,
          notes: cp.notes,
          geom: pointWkt,
          active_from: cp.active_from,
          active_to: cp.active_to
        });
    }
    console.log(`✅ Inserted ${checkpointsData.length} police checkpoints`);

    console.log('🎉 Seeding Completed!');
  } catch (err) {
    console.error('Seeding failed:', err);
  }
}

seed();
