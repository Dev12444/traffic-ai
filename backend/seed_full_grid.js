const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// 150+ Ahmedabad Metro Intersections (Including Ghatlodiya, Naranpura, Akhbarnagar, etc.)
const ahmedabadAreas = [
  "Ghatlodiya Junction", "Ghatlodiya Cross Road", "Chanakyapuri Ghatlodiya", "Karmachari Nagar Ghatlodiya",
  "CG Road Junction", "SG Highway Flyover (ISCON)", "Ashram Road Corner", "Navrangpura Crossroad",
  "Satellite Circle", "Paldi Square", "Vastrapur Lake Circle", "Bodakdev Junction",
  "Sola Bridge Intersection", "Drive-In Road Junction", "Ellisbridge Bridge Head", "Riverfront East Promenade",
  "Maninagar Railway Cross", "Bapunagar Circle", "Naroda Highway Junction", "Kalupur Central Circle",
  "Prahlad Nagar Garden Corner", "Thaltej Crossroad", "Science City Circle", "Gota Flyover Junction",
  "Ranip Bus Terminal Cross", "RTO Circle", "Usmanpura Underpass", "Law Garden Junction",
  "Nehrunagar Circle", "Ambawadi Crossroad", "Shyamal Crossroad", "Jodhpur Crossroad",
  "CTM Express Highway Entry", "Odhav Ring Road Circle", "Nikol Circle", "Sabarmati Ashram Circle",
  "Sarkhej Highway Junction", "Sanand Crossroad Ring Road", "Bopal Approach Junction", "South Bopal Ring Circle",
  "Shela Ring Road Cross", "Makarba Crossing", "Vejalpur Bus Stop Corner", "Vasna Barrage Circle",
  "Anjali Crossroad Subhash Bridge", "Kankaria Lake East Gate", "Gita Mandir Bus Stand Cross", "Astodia Gate Circle",
  "Delhi Darwaja Square", "Shahibaug Underpass Corner", "Airport Road Circle", "Hansol Highway Cross",
  "GIFT City Connector South", "Chandkheda Zundal Circle", "Adalaj Trimandir Cross", "Motera Stadium Entry",
  "Sabarmati Railway Station Gate", "Dharmanagar Circle", "Akhbarnagar Underpass", "Naranpura Telephone Exchange",
  "Vijay Cross Road", "Commerce Six Roads", "Gulbai Tekra Junction", "Panjrapole Crossroad",
  "IIM Ahmedabad Gate", "ATIRA Circle", "ISRO Colony Gate", "Ramdevnagar Crossroad",
  "Fun Republic Cinema Corner", "Gurukul Road Junction", "Memnagar Fire Station Cross", "Helmet Circle Drive-In",
  "Subhash Bridge Corner", "Dudheshwar Water Works", "Gheekanta Metro Station", "Relief Road Junction",
  "Sarangpur Gate", "Raipur Darwaja", "Jamalpur Flower Market", "Sardar Patel Bridge",
  "Danilimda Crossroad", "Chandola Lake North", "Narol Circle", "Isanpur Highway Corner", "Ghodasar Canal Cross",
  "Vatva GIDC Phase 1", "Vatva Railway Station", "Hatkeshwar Circle", "Amraiwadi Metro Station",
  "Khokhra Bridge", "Saraspur Crossroad", "Rakhial Crossroad", "Gomtipur Market", "Asarwa Civil Hospital Corner",
  "Mehsani Circle Asarwa", "Shahpur Darwaja", "Mirzapur Court Gate", "Khanpur Gate",
  "Bhadra Plaza", "Lal Darwaja Bus Terminus", "Paldi Bhatta", "Kochrab Ashram Corner",
  "Vasna Bus Stop", "Gupta Nagar Cross", "Juhapura Crossroad", "Gyaspur Depot Gate",
  "Sarkhej Roza Gate", "Vishala Circle", "Bakrol Circle SP Ring Road", "Bhadaj Circle SP Ring Road",
  "Ognaj Circle SP Ring Road", "Lapkaman Cross", "Rancharda Lake Corner", "Shilaj Circle",
  "Ghuma Bus Stop", "Godhavi Ring Road", "Garodia Crossroad", "Moraiya GIDC Gate",
  "Changodar Industrial Hub", "Tajpur Cross", "Sanand GIDC Gate 1", "Shela Lake Corner",
  "Manipur Crossroad", "Telav Village Cross", "Nandej Railway Crossing", "Bareja Highway Corner",
  "Aslali Bypass Ring Road", "Jetalpur Highway", "Pirana Dumpsite Gate", "Piplaj Village Cross",
  "Kamod Circle", "Lambha Temple Corner", "Vatva GIDC Phase 4", "Ramol Ring Road Cross",
  "Vastral Metro Station", "Vastral Ring Road Circle", "Singarva Crossroad", "Kathwada GIDC Circle",
  "Kuha Highway Cross", "Muthiya Village Cross", "Naroda GIDC Phase 1", "Naroda Patiya Crossroad",
  "Kubernagar Railway Gate", "Sardarnagar Market", "Noblenagar Tenament Cross", "Kotarpur Water Works",
  "Sughad Circle Gandhinagar Highway", "Koba Circle", "Bhat Circle SP Ring Road", "Apollo Hospital Corner"
];

// Generate 150 Ahmedabad locations
const fullGrid = ahmedabadAreas.map((name, idx) => {
  let lat = 23.0700;
  let lng = 72.5400;

  if (name.includes("Ghatlodiya")) {
    lat = 23.0700 + (idx * 0.001);
    lng = 72.5400 + (idx * 0.001);
  } else {
    const row = Math.floor(idx / 12);
    const col = idx % 12;
    lat = 22.960 + (row * 0.012) + ((idx % 3) * 0.002);
    lng = 72.460 + (col * 0.018) + ((idx % 4) * 0.003);
  }

  const n = Math.floor(Math.random() * 25) + 5;
  const s = Math.floor(Math.random() * 28) + 6;
  const e = Math.floor(Math.random() * 18) + 4;
  const w = Math.floor(Math.random() * 19) + 4;
  const total = n + s + e + w;

  let st = 'MODERATE';
  if (total > 75) st = 'CRITICAL';
  else if (total > 50) st = 'HEAVY';
  else if (total > 30) st = 'CONGESTED';
  else if (total < 20) st = 'CLEAR';

  return {
    id: `int-${idx + 1}`,
    name,
    lng: Math.round(lng * 10000) / 10000,
    lat: Math.round(lat * 10000) / 10000,
    lane_counts: { N: n, S: s, E: e, W: w },
    status: st
  };
});

console.log(`Generated ${fullGrid.length} full city intersections dataset.`);
module.exports = fullGrid;
