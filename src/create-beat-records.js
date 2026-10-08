/* ============================================================
   Create Beat — prototype records

   Enough records per module to need more than one page at the 50-a-page
   limit: Leads 100, Contacts 50, Deals 25, Vendors 200. Generated from a
   fixed seed, so every load places the same records in the same spots.
   Each record carries the fields the toolbar's Filter can test.
   Create Beat alone draws these; every other page keeps data.js's PINS.
   ============================================================ */
const CB_RECORDS = (() => {
  /* mulberry32 — small, seedable, good enough for scattering pins */
  let seed = 20261007;
  const rand = () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const pick = list => list[Math.floor(rand() * list.length)];
  const between = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

  const FIRST = ['Anand', 'Priya', 'Karthik', 'Meena', 'Suresh', 'Divya', 'Rahul', 'Sneha',
    'Vikram', 'Lakshmi', 'Arjun', 'Kavya', 'Manoj', 'Deepa', 'Ravi', 'Nisha', 'Gokul',
    'Swathi', 'Harish', 'Pooja', 'Senthil', 'Revathi', 'Naveen', 'Anitha', 'Prakash', 'Janani'];
  const LAST = ['Kumar', 'Raman', 'Selvam', 'Nair', 'Babu', 'Iyer', 'Verma', 'Pillai', 'Shah',
    'Krishnan', 'Reddy', 'Menon', 'Rao', 'Murugan', 'Prasad', 'Das', 'Joseph', 'Varma'];
  const BRAND = ['Sun', 'Metro', 'Prime', 'Harbour', 'Pacific', 'Green', 'Apex', 'Nexus',
    'Summit', 'Horizon', 'Royal', 'Silver', 'Delta', 'Lotus', 'Crest', 'Coastal', 'Vista',
    'Orbit', 'Bright', 'Everest'];
  const TRADE = ['Electronics', 'Distributors', 'Pharma', 'Auto Parts', 'Textiles', 'Traders',
    'Imports', 'Organics', 'Foods', 'Hardware', 'Logistics', 'Agencies', 'Supplies', 'Packaging'];
  const DEAL = ['Renewal', 'Expansion', 'Q4 Order', 'Annual Contract', 'Pilot', 'Upgrade', 'Bulk Order'];

  const person  = () => `${pick(FIRST)} ${pick(LAST)}`;
  const company = () => `${pick(BRAND)} ${pick(TRADE)}`;

  const MODULES = [
    { module: 'Leads',    count: 100, name: person },
    { module: 'Contacts', count: 50,  name: person },
    { module: 'Deals',    count: 25,  name: () => `${pick(DEAL)} - ${company()}` },
    { module: 'Vendors',  count: 200, name: company },
  ];

  /* The values the Filter's picklists offer */
  const STATUS = ['Visited', 'Pending', 'Follow-up', 'Scheduled', 'New'];
  const CITY   = ['Chennai', 'Bengaluru', 'Hyderabad', 'Coimbatore'];
  const OWNER  = ['Cameron Williamson', 'Priya Raman', 'Vikram Shah'];

  const records = [];
  MODULES.forEach(({ module, count, name }) => {
    for (let i = 0; i < count; i++) {
      records.push({
        /* inside the 800 × 640 map world, clear of its edges */
        x: between(30, 770),
        y: between(45, 620),
        label: name(),
        module,
        status: pick(STATUS),
        city: pick(CITY),
        owner: pick(OWNER),
        revenue: between(5, 99) * 1000,
        lastVisit: between(0, 90),
      });
    }
  });
  return records;
})();
