const PINS = [
  { x: 220, y: 130, color: '#10b981', label: 'Anand Kumar',       module: 'Contacts', status: 'Visited'   },
  { x: 500, y: 160, color: '#8b5cf6', label: 'Priya Retail Co',   module: 'Accounts', status: 'Pending'   },
  { x: 580, y: 220, color: '#f59e0b', label: 'Sun Electronics',   module: 'Deals',    status: 'Follow-up' },
  { x: 290, y: 300, color: '#10b981', label: 'Metro Distributors',module: 'Accounts', status: 'Visited'   },
  { x: 430, y: 330, color: '#8b5cf6', label: 'City Pharma',       module: 'Contacts', status: 'Scheduled' },
  { x: 540, y: 380, color: '#f59e0b', label: 'Prime Auto Parts',  module: 'Deals',    status: 'New'       },
  { x: 200, y: 520, color: '#10b981', label: 'Harbour Textiles',  module: 'Accounts', status: 'Visited'   },
  { x: 380, y: 490, color: '#10b981', label: 'Raj & Sons',        module: 'Contacts', status: 'Visited'   },
  { x: 560, y: 520, color: '#f59e0b', label: 'Sunrise Traders',   module: 'Deals',    status: 'Follow-up' },
  { x: 700, y: 570, color: '#8b5cf6', label: 'Pacific Imports',   module: 'Accounts', status: 'Pending'   },
  { x: 650, y: 400, color: '#10b981', label: 'Green Organics',    module: 'Contacts', status: 'Visited'   },
];

const MODULE_COLORS = {
  Contacts: '#10b981',
  Accounts: '#8b5cf6',
  Deals:    '#f59e0b',
};

const ROADS = [
  { path: [[0,200],[800,180]] },
  { path: [[0,400],[800,420]] },
  { path: [[180,0],[200,640]] },
  { path: [[550,0],[560,640]] },
  { path: [[0,300],[800,280]], w: 6 },
  { path: [[350,0],[370,640]], w: 6 },
  { path: [[100,100],[300,300],[480,310],[600,500],[780,520]] },
  { path: [[0,500],[200,490],[400,480],[700,460]] },
  { path: [[600,0],[580,200],[560,400],[520,640]] },
];

const WATER = [
  [[80,100],[200,120],[350,160],[500,200],[650,230],[800,260],
   [800,300],[650,270],[500,240],[350,190],[200,150],[80,130]],
];

const NON_MAPPABLE = [
  { name: 'Sharan',                              addressStatus: 'empty',   module: 'contacts' },
  { name: 'Abhiram Dayina',                      addressStatus: 'invalid', module: 'contacts' },
  { name: 'Anguraj',                             addressStatus: 'empty',   module: 'contacts' },
  { name: 'Bharathithasan Shanmugam',            addressStatus: 'empty',   module: 'contacts' },
  { name: 'Bhavani Kumar B',                     addressStatus: 'empty',   module: 'contacts' },
  { name: 'Chandrashekar Lalapet Srinivas Prasa…', addressStatus: 'invalid', module: 'contacts' },
  { name: 'Chinnaiya Raja Velayutham',           addressStatus: 'empty',   module: 'contacts' },
  { name: 'Dayanand',                            addressStatus: 'empty',   module: 'contacts' },
  { name: 'Dayanithi',                           addressStatus: 'invalid', module: 'contacts' },
  { name: 'Jayaraj Durairaj',                    addressStatus: 'invalid', module: 'contacts' },
  { name: 'Madhumitha',                          addressStatus: 'empty',   module: 'contacts' },
  { name: 'Arnav',                               addressStatus: 'empty',   module: 'contacts' },
  { name: 'Karthik Selvam',                      addressStatus: 'invalid', module: 'contacts' },
  { name: 'Preethi Nair',                        addressStatus: 'empty',   module: 'contacts' },
  { name: 'Suresh Babu',                         addressStatus: 'empty',   module: 'contacts' },
  { name: 'Meenakshi R',                         addressStatus: 'invalid', module: 'contacts' },
  { name: 'Vetri Murugan',                       addressStatus: 'empty',   module: 'contacts' },
  { name: 'Global Traders Ltd',                  addressStatus: 'credits', module: 'accounts' },
  { name: 'Nexus Corp',                          addressStatus: 'invalid', module: 'accounts' },
  { name: 'Apex Solutions',                      addressStatus: 'queued',  module: 'accounts' },
  { name: 'Summit Enterprises',                  addressStatus: 'failed',  module: 'accounts' },
  { name: 'Horizon Retail',                      addressStatus: 'empty',   module: 'accounts' },
  { name: 'Q3 Enterprise Deal',                  addressStatus: 'invalid', module: 'deals'    },
  { name: 'Renewal - Harbour Co',                addressStatus: 'empty',   module: 'deals'    },
  { name: 'Expansion Pack - Nexus',              addressStatus: 'failed',  module: 'deals'    },
  { name: 'Rahul Verma',                         addressStatus: 'empty',   module: 'leads'    },
  { name: 'Sneha Pillai',                        addressStatus: 'invalid', module: 'leads'    },
  { name: 'Manoj Krishnan',                      addressStatus: 'queued',  module: 'leads'    },
  { name: 'Divya Rajan',                         addressStatus: 'empty',   module: 'leads'    },
  { name: 'Arun Shankar',                        addressStatus: 'failed',  module: 'leads'    },
  { name: 'Pooja Mehta',                         addressStatus: 'credits', module: 'leads'    },
  { name: 'Vikram Nair',                         addressStatus: 'empty',   module: 'leads'    },
  { name: 'Lakshmi Subramaniam',                 addressStatus: 'invalid', module: 'leads'    },
  { name: 'Gopal Iyer',                          addressStatus: 'queued',  module: 'leads'    },
  { name: 'Anitha Bose',                         addressStatus: 'empty',   module: 'leads'    },
  { name: 'Ravi Chandran',                       addressStatus: 'failed',  module: 'leads'    },
  { name: 'Nisha Thomas',                        addressStatus: 'empty',   module: 'leads'    },
  { name: 'Sunil Reddy',                         addressStatus: 'invalid', module: 'leads'    },
  { name: 'Kavitha Mohan',                       addressStatus: 'credits', module: 'leads'    },
];

const BLOCKS = [
  { x:210, y:210, w:120, h:70 }, { x:220, y:320, w:90,  h:60 },
  { x:370, y:200, w:100, h:80 }, { x:410, y:390, w:80,  h:50 },
  { x:600, y:290, w:100, h:70 }, { x:620, y:430, w:90,  h:60 },
  { x:100, y:350, w:70,  h:50 }, { x:250, y:440, w:90,  h:60 },
  { x:450, y:540, w:110, h:55 }, { x:620, y:560, w:80,  h:50 },
  { x:100, y:540, w:80,  h:60 }, { x:300, y:560, w:90,  h:50 },
];
