// ── Color constants ────────────────────────────────────────────────────
const C = { green:'#22c87a', red:'#f04f4f', amber:'#f0a020', blue:'#4a9eff', yellow:'#f0d040' };
const cc = v => v > 0 ? C.green : v < 0 ? C.red : 'var(--text2)';

// ── Feedback modal ─────────────────────────────────────────────────────
const FORMSPREE_URL = 'https://formspree.io/f/mzdqelne';

// ── State ──────────────────────────────────────────────────────────────
let chart2 = null, chart3 = null, chart4 = null, chart4b = null;
let chart5 = null, chart5b = null;
let _data = null;
let _breadthHistory = [];
let _news = {};
let _rotationLog = null;
let _rotView = 'leaders';
let sortCol = 'vsSpx12m', sortDir = -1;
let filterSector = 'all';
let industryFilterSector = 'all';
let leadersSector = 'all';
let leadersIndustry = 'all';
let leadersMaStatus = 'all';
let leadersRsYtd = 'all';
let searchTicker = '';
let activeTab = 'overview';
let newsSelectedDate = null;
let newsSearch = '';
let newsTagFilter = null;
let breadthSortCol = 'contribYtd', breadthSortDir = -1;
let industryBreadthSortCol = 'contribYtd', industryBreadthSortDir = -1;
let internalsFilterSector = 'all';
let internalsFilterIndustry = 'all';

// ── Sector → distinct color map (11 GICS sectors) ─────────────────────
const SECTOR_COLOR = {
  'Information Technology':  '#4a9eff',  // blue
  'Health Care':             '#22c87a',  // green
  'Financials':              '#f0a020',  // amber
  'Consumer Discretionary':  '#f07030',  // orange
  'Consumer Staples':        '#20c8b0',  // teal
  'Energy':                  '#f0d040',  // yellow
  'Industrials':             '#a878ff',  // purple
  'Materials':               '#c89050',  // copper
  'Real Estate':             '#f060a8',  // pink
  'Utilities':               '#40d8f0',  // cyan
  'Communication Services':  '#ff6060',  // coral
};
function sectorColor(sec) {
  return SECTOR_COLOR[sec] || '#8a92a2';
}

// ── Abbreviated industry names (≤25 chars) ────────────────────────────
const IND_SHORT = {
  'Agricultural & Farm Machinery':              'Ag & Farm Machinery',
  'Agricultural Products & Services':           'Ag Products & Services',
  'Apparel, Accessories & Luxury Goods':        'Apparel & Luxury Goods',
  'Asset Management & Custody Banks':           'Asset Management',
  'Construction Machinery & Heavy Transportation Equipment': 'Construction Machinery',
  'Consumer Staples Merchandise Retail':        'Staples Merch Retail',
  'Data Processing & Outsourced Services':      'Data Processing & Outsrc',
  'Electrical Components & Equipment':          'Electrical Components',
  'Electronic Equipment & Instruments':         'Electronic Equipment',
  'Electronic Manufacturing Services':          'Electronic Mfg Services',
  'Environmental & Facilities Services':        'Environmental Services',
  'Fertilizers & Agricultural Chemicals':       'Fertilizers & Ag Chem',
  'Human Resource & Employment Services':       'HR & Employment Services',
  'IT Consulting & Other Services':             'IT Consulting',
  'Independent Power Producers & Energy Traders':'Indep. Power Producers',
  'Industrial Machinery & Supplies & Components':'Industrial Machinery',
  'Integrated Telecommunication Services':      'Integrated Telecom',
  'Internet Services & Infrastructure':         'Internet Infrastructure',
  'Investment Banking & Brokerage':             'Investment Banking',
  'Life Sciences Tools & Services':             'Life Sciences Tools',
  'Metal, Glass & Plastic Containers':          'Metal & Plastic Containers',
  'Multi-Family Residential REITs':             'Multi-Family REITs',
  'Oil & Gas Equipment & Services':             'O&G Equipment & Services',
  'Oil & Gas Exploration & Production':         'O&G Exploration & Prod',
  'Oil & Gas Refining & Marketing':             'O&G Refining & Mktg',
  'Oil & Gas Storage & Transportation':         'O&G Storage & Transport',
  'Paper & Plastic Packaging Products & Materials': 'Paper & Plastic Pkg',
  'Passenger Ground Transportation':            'Passenger Ground Trans',
  'Property & Casualty Insurance':              'P&C Insurance',
  'Research & Consulting Services':             'Research & Consulting',
  'Semiconductor Materials & Equipment':        'Semicond. Materials',
  'Single-Family Residential REITs':            'Single-Family REITs',
  'Soft Drinks & Non-alcoholic Beverages':      'Soft Drinks & NA Bev',
  'Specialized Consumer Services':              'Specialized Cons Svcs',
  'Technology Hardware, Storage & Peripherals': 'Tech Hardware & Storage',
  'Transaction & Payment Processing Services':  'Payment Processing',
  'Trading Companies & Distributors':           'Trading & Distributors',
  'Wireless Telecommunication Services':        'Wireless Telecom',
  'Hotels, Resorts & Cruise Lines':             'Hotels & Cruise Lines',
  'Interactive Home Entertainment':             'Interactive Entertain.',
  'Interactive Media & Services':               'Interactive Media',
  'Financial Exchanges & Data':                 'Financial Exchanges',
  'Diversified Support Services':               'Diversified Support Svcs',
  'Computer & Electronics Retail':              'Computer & Elec Retail',
  'Construction & Engineering':                 'Construction & Eng',
  'Air Freight & Logistics':                    'Air Freight & Logistics',
};
function shortInd(ind) {
  return IND_SHORT[ind] || ind;
}

// ── Tab 4: News ───────────────────────────────────────────────────────
const NEWS_TAGS = [
  { id:'fed',        label:'Fed / Rates',  color:'#7c5cbf', bg:'rgba(124,92,191,0.18)',
    pat:/\b(fed|federal reserve|fomc|rate hike|rate cut|interest rate|powell|monetary policy|hawkish|dovish)\b/i },
  { id:'inflation',  label:'Inflation',    color:'#f0a020', bg:'rgba(240,160,32,0.18)',
    pat:/\b(inflation|cpi|pce|consumer price|price index|deflation|stagflation|cost of living)\b/i },
  { id:'jobs',       label:'Jobs',         color:'#22c87a', bg:'rgba(34,200,122,0.18)',
    pat:/\b(jobs|payroll|unemployment|nonfarm|labor market|hiring|layoff|jobless|employment|workers)\b/i },
  { id:'gdp',        label:'GDP',          color:'#4a9eff', bg:'rgba(74,158,255,0.18)',
    pat:/\b(gdp|gross domestic product|recession|economic growth|contraction|expansion|output)\b/i },
  { id:'earnings',   label:'Earnings',     color:'#f04f4f', bg:'rgba(240,79,79,0.18)',
    pat:/\b(earnings|eps|revenue|quarterly results|beat|miss|guidance|profit|loss|q[1-4])\b/i },
  { id:'geopolitical',label:'Geopolitical',color:'#e88c30', bg:'rgba(232,140,48,0.18)',
    pat:/\b(war|conflict|sanctions|tariff|trade war|geopolitical|iran|china|russia|taiwan|middle east|opec)\b/i },
  { id:'tech',       label:'Tech / AI',    color:'#a78bfa', bg:'rgba(167,139,250,0.18)',
    pat:/\b(ai|artificial intelligence|nvidia|semiconductor|chip|tech stock|cloud|microsoft|apple|alphabet|google|meta|amazon)\b/i },
  { id:'ipo',        label:'IPO',          color:'#34d399', bg:'rgba(52,211,153,0.18)',
    pat:/\b(ipo|initial public offering|debut|goes public|going public|direct listing|spac|de-spac|priced its ipo|listed on)\b/i },
  { id:'sp500',      label:'S&P 500',      color:'#60a5fa', bg:'rgba(96,165,250,0.18)',
    pat:/\b(s&p 500|s&p500|sp500|s&p index|added to the s&p|joins the s&p|removed from the s&p|index inclusion|index addition|index rebalance)\b/i },
  { id:'ma',         label:'M&A',          color:'#f472b6', bg:'rgba(244,114,182,0.18)',
    pat:/\b(merger|acquisition|acquires|takeover|buyout|deal|bid|offer|acquire|acquired|combine|spinoff|spin-off|divest|divestiture|lbo|private equity)\b/i },
  { id:'energy',     label:'Energy / Oil', color:'#fb923c', bg:'rgba(251,146,60,0.18)',
    pat:/\b(oil|crude|brent|wti|opec|natural gas|lng|energy|petroleum|refinery|gasoline|barrel|pipeline|exxon|chevron|bp|shell|halliburton)\b/i },
  { id:'biotech',    label:'Biotech',      color:'#2dd4bf', bg:'rgba(45,212,191,0.18)',
    pat:/\b(fda|biotech|pharmaceutical|drug|clinical trial|approval|biologic|therapy|cancer|vaccine|pfizer|moderna|merck|abbvie|eli lilly|phase [123])\b/i },
];
