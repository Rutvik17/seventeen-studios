/**
 * The tradeable universe, by industry.
 *
 * Industries rather than the eleven GICS sectors, and that is a modelling
 * decision rather than a labelling one. The factors are neutralised WITHIN these
 * buckets — see `industryNeutral` in `lib/portfolio.ts` — so the granularity
 * decides what the model is allowed to bet on.
 *
 * Rank a semiconductor against a utility on twelve-month momentum and most of
 * what the ranking measures is that semiconductors ran and utilities did not.
 * That is a sector call wearing a stock-selection costume, it is already
 * available for nothing in a sector ETF, and it is the first thing that breaks
 * when the leadership rotates. Demeaning inside "Semiconductors" asks the
 * question that actually has an answer: which semiconductor, against the others.
 *
 * A bucket needs at least a handful of names to demean against, which sets the
 * floor on how fine these can get. Anything with fewer than four names is folded
 * into a neighbour at load time rather than left to rank against itself.
 */

export type UniverseEntry = {
  symbol: string;
  name: string;
  industry: string;
};

const RAW: [string, string, string][] = [
  // Mag 7
  ['AAPL', 'Apple', 'Mag 7'],
  ['MSFT', 'Microsoft', 'Mag 7'],
  ['NVDA', 'NVIDIA', 'Mag 7'],
  ['AMZN', 'Amazon', 'Mag 7'],
  ['GOOGL', 'Alphabet', 'Mag 7'],
  ['META', 'Meta', 'Mag 7'],
  ['TSLA', 'Tesla', 'Mag 7'],

  // Semiconductors
  ['AVGO', 'Broadcom', 'Semiconductors'],
  ['AMD', 'AMD', 'Semiconductors'],
  ['QCOM', 'Qualcomm', 'Semiconductors'],
  ['TXN', 'Texas Instruments', 'Semiconductors'],
  ['INTC', 'Intel', 'Semiconductors'],
  ['MU', 'Micron', 'Semiconductors'],
  ['ADI', 'Analog Devices', 'Semiconductors'],
  ['NXPI', 'NXP Semiconductors', 'Semiconductors'],
  ['MRVL', 'Marvell', 'Semiconductors'],
  ['ON', 'ON Semiconductor', 'Semiconductors'],
  ['MCHP', 'Microchip', 'Semiconductors'],
  ['SWKS', 'Skyworks', 'Semiconductors'],

  // Semiconductor equipment
  ['AMAT', 'Applied Materials', 'Semi Equipment'],
  ['LRCX', 'Lam Research', 'Semi Equipment'],
  ['KLAC', 'KLA', 'Semi Equipment'],
  ['ASML', 'ASML', 'Semi Equipment'],
  ['TER', 'Teradyne', 'Semi Equipment'],
  ['ENTG', 'Entegris', 'Semi Equipment'],

  // Software — infrastructure
  ['ORCL', 'Oracle', 'Software Infrastructure'],
  ['ADBE', 'Adobe', 'Software Infrastructure'],
  ['SNOW', 'Snowflake', 'Software Infrastructure'],
  ['MDB', 'MongoDB', 'Software Infrastructure'],
  ['DDOG', 'Datadog', 'Software Infrastructure'],
  ['NET', 'Cloudflare', 'Software Infrastructure'],
  ['AKAM', 'Akamai', 'Software Infrastructure'],

  // Software — application
  ['CRM', 'Salesforce', 'Software Application'],
  ['NOW', 'ServiceNow', 'Software Application'],
  ['INTU', 'Intuit', 'Software Application'],
  ['WDAY', 'Workday', 'Software Application'],
  ['TEAM', 'Atlassian', 'Software Application'],
  ['HUBS', 'HubSpot', 'Software Application'],
  ['ADSK', 'Autodesk', 'Software Application'],

  // Cyber security
  ['PANW', 'Palo Alto Networks', 'Cyber Security'],
  ['CRWD', 'CrowdStrike', 'Cyber Security'],
  ['FTNT', 'Fortinet', 'Cyber Security'],
  ['ZS', 'Zscaler', 'Cyber Security'],
  ['OKTA', 'Okta', 'Cyber Security'],
  ['S', 'SentinelOne', 'Cyber Security'],

  // Computer hardware & networking
  ['DELL', 'Dell', 'Computer Hardware'],
  ['HPQ', 'HP', 'Computer Hardware'],
  ['SMCI', 'Super Micro', 'Computer Hardware'],
  ['ANET', 'Arista Networks', 'Computer Hardware'],
  ['CSCO', 'Cisco', 'Computer Hardware'],
  ['NTAP', 'NetApp', 'Computer Hardware'],
  ['WDC', 'Western Digital', 'Computer Hardware'],
  ['STX', 'Seagate', 'Computer Hardware'],

  // Aerospace & defence
  ['LMT', 'Lockheed Martin', 'Aerospace & Defence'],
  ['RTX', 'RTX', 'Aerospace & Defence'],
  ['NOC', 'Northrop Grumman', 'Aerospace & Defence'],
  ['GD', 'General Dynamics', 'Aerospace & Defence'],
  ['BA', 'Boeing', 'Aerospace & Defence'],
  ['LHX', 'L3Harris', 'Aerospace & Defence'],
  ['HWM', 'Howmet Aerospace', 'Aerospace & Defence'],
  ['TDG', 'TransDigm', 'Aerospace & Defence'],
  ['AXON', 'Axon Enterprise', 'Aerospace & Defence'],
  ['RKLB', 'Rocket Lab', 'Aerospace & Defence'],

  // Robotics & automation
  ['ROK', 'Rockwell Automation', 'Robotics & Automation'],
  ['EMR', 'Emerson Electric', 'Robotics & Automation'],
  ['PTC', 'PTC', 'Robotics & Automation'],
  ['ISRG', 'Intuitive Surgical', 'Robotics & Automation'],
  ['ZBRA', 'Zebra Technologies', 'Robotics & Automation'],

  // Photonics & optics
  ['COHR', 'Coherent', 'Photonics'],
  ['LITE', 'Lumentum', 'Photonics'],
  ['IPGP', 'IPG Photonics', 'Photonics'],
  ['FN', 'Fabrinet', 'Photonics'],

  // Industrials
  ['CAT', 'Caterpillar', 'Industrials'],
  ['DE', 'Deere', 'Industrials'],
  ['HON', 'Honeywell', 'Industrials'],
  ['GE', 'GE Aerospace', 'Industrials'],
  ['MMM', '3M', 'Industrials'],
  ['ETN', 'Eaton', 'Industrials'],
  ['PH', 'Parker Hannifin', 'Industrials'],
  ['CMI', 'Cummins', 'Industrials'],
  ['UNP', 'Union Pacific', 'Industrials'],
  ['UPS', 'UPS', 'Industrials'],

  // Automotive
  ['GM', 'General Motors', 'Automotive'],
  ['F', 'Ford', 'Automotive'],
  ['RIVN', 'Rivian', 'Automotive'],
  ['LCID', 'Lucid', 'Automotive'],
  ['APTV', 'Aptiv', 'Automotive'],
  ['LEA', 'Lear', 'Automotive'],

  // Biotechnology
  ['AMGN', 'Amgen', 'Biotechnology'],
  ['GILD', 'Gilead', 'Biotechnology'],
  ['VRTX', 'Vertex', 'Biotechnology'],
  ['REGN', 'Regeneron', 'Biotechnology'],
  ['BIIB', 'Biogen', 'Biotechnology'],
  ['MRNA', 'Moderna', 'Biotechnology'],
  ['ALNY', 'Alnylam', 'Biotechnology'],
  ['INCY', 'Incyte', 'Biotechnology'],

  // Pharmaceuticals
  ['LLY', 'Eli Lilly', 'Pharmaceuticals'],
  ['JNJ', 'Johnson & Johnson', 'Pharmaceuticals'],
  ['MRK', 'Merck', 'Pharmaceuticals'],
  ['PFE', 'Pfizer', 'Pharmaceuticals'],
  ['ABBV', 'AbbVie', 'Pharmaceuticals'],
  ['BMY', 'Bristol Myers Squibb', 'Pharmaceuticals'],
  ['ZTS', 'Zoetis', 'Pharmaceuticals'],

  // Medical devices & services
  ['TMO', 'Thermo Fisher', 'Medical Devices'],
  ['ABT', 'Abbott', 'Medical Devices'],
  ['DHR', 'Danaher', 'Medical Devices'],
  ['MDT', 'Medtronic', 'Medical Devices'],
  ['SYK', 'Stryker', 'Medical Devices'],
  ['BSX', 'Boston Scientific', 'Medical Devices'],
  ['UNH', 'UnitedHealth', 'Medical Services'],
  ['CVS', 'CVS Health', 'Medical Services'],
  ['CI', 'Cigna', 'Medical Services'],
  ['HCA', 'HCA Healthcare', 'Medical Services'],

  // Banks
  ['JPM', 'JPMorgan Chase', 'Banks'],
  ['BAC', 'Bank of America', 'Banks'],
  ['WFC', 'Wells Fargo', 'Banks'],
  ['C', 'Citigroup', 'Banks'],
  ['USB', 'US Bancorp', 'Banks'],
  ['PNC', 'PNC Financial', 'Banks'],
  ['TFC', 'Truist', 'Banks'],
  ['MTB', 'M&T Bank', 'Banks'],

  // Financial services
  ['GS', 'Goldman Sachs', 'Financial Services'],
  ['MS', 'Morgan Stanley', 'Financial Services'],
  ['BLK', 'BlackRock', 'Financial Services'],
  ['SCHW', 'Charles Schwab', 'Financial Services'],
  ['SPGI', 'S&P Global', 'Financial Services'],
  ['ICE', 'Intercontinental Exchange', 'Financial Services'],
  ['CME', 'CME Group', 'Financial Services'],
  ['MCO', 'Moody’s', 'Financial Services'],

  // Credit services
  ['V', 'Visa', 'Credit Services'],
  ['MA', 'Mastercard', 'Credit Services'],
  ['AXP', 'American Express', 'Credit Services'],
  ['PYPL', 'PayPal', 'Credit Services'],
  ['COF', 'Capital One', 'Credit Services'],
  ['SYF', 'Synchrony', 'Credit Services'],

  // Insurance
  ['CB', 'Chubb', 'Insurance'],
  ['PGR', 'Progressive', 'Insurance'],
  ['TRV', 'Travelers', 'Insurance'],
  ['ALL', 'Allstate', 'Insurance'],
  ['MET', 'MetLife', 'Insurance'],

  // Oil & gas
  ['XOM', 'Exxon Mobil', 'Oil & Gas'],
  ['CVX', 'Chevron', 'Oil & Gas'],
  ['COP', 'ConocoPhillips', 'Oil & Gas'],
  ['EOG', 'EOG Resources', 'Oil & Gas'],
  ['SLB', 'SLB', 'Oil & Gas'],
  ['PSX', 'Phillips 66', 'Oil & Gas'],
  ['MPC', 'Marathon Petroleum', 'Oil & Gas'],
  ['OXY', 'Occidental', 'Oil & Gas'],
  ['HAL', 'Halliburton', 'Oil & Gas'],
  ['DVN', 'Devon Energy', 'Oil & Gas'],

  // Utilities & renewables
  ['NEE', 'NextEra Energy', 'Utilities'],
  ['DUK', 'Duke Energy', 'Utilities'],
  ['SO', 'Southern Company', 'Utilities'],
  ['AEP', 'American Electric Power', 'Utilities'],
  ['VST', 'Vistra', 'Utilities'],
  ['CEG', 'Constellation Energy', 'Utilities'],
  ['ENPH', 'Enphase Energy', 'Renewables'],
  ['FSLR', 'First Solar', 'Renewables'],
  ['NXT', 'Nextracker', 'Renewables'],
  ['RUN', 'Sunrun', 'Renewables'],

  // Retail
  ['WMT', 'Walmart', 'Retail'],
  ['COST', 'Costco', 'Retail'],
  ['TGT', 'Target', 'Retail'],
  ['HD', 'Home Depot', 'Retail'],
  ['LOW', "Lowe's", 'Retail'],
  ['TJX', 'TJX', 'Retail'],
  ['DG', 'Dollar General', 'Retail'],
  ['ROST', 'Ross Stores', 'Retail'],

  // Consumer products
  ['PG', 'Procter & Gamble', 'Consumer Products'],
  ['CL', 'Colgate-Palmolive', 'Consumer Products'],
  ['KMB', 'Kimberly-Clark', 'Consumer Products'],
  ['EL', 'Estée Lauder', 'Consumer Products'],
  ['NKE', 'Nike', 'Consumer Products'],

  // Restaurants
  ['SBUX', 'Starbucks', 'Restaurants'],
  ['MCD', "McDonald's", 'Restaurants'],
  ['CMG', 'Chipotle', 'Restaurants'],
  ['YUM', 'Yum! Brands', 'Restaurants'],

  // Beverages — non-alcoholic
  ['KO', 'Coca-Cola', 'Beverages'],
  ['PEP', 'PepsiCo', 'Beverages'],
  ['MNST', 'Monster Beverage', 'Beverages'],
  ['KDP', 'Keurig Dr Pepper', 'Beverages'],

  // Media & telecom
  ['NFLX', 'Netflix', 'Media'],
  ['DIS', 'Disney', 'Media'],
  ['CMCSA', 'Comcast', 'Media'],
  ['WBD', 'Warner Bros Discovery', 'Media'],
  ['T', 'AT&T', 'Telecom'],
  ['VZ', 'Verizon', 'Telecom'],
  ['TMUS', 'T-Mobile', 'Telecom'],

  // Materials & chemicals
  ['LIN', 'Linde', 'Chemicals'],
  ['SHW', 'Sherwin-Williams', 'Chemicals'],
  ['DOW', 'Dow', 'Chemicals'],
  ['DD', 'DuPont', 'Chemicals'],
  ['PPG', 'PPG Industries', 'Chemicals'],
  ['FCX', 'Freeport-McMoRan', 'Metals & Mining'],
  ['NUE', 'Nucor', 'Metals & Mining'],
  ['NEM', 'Newmont', 'Metals & Mining'],
  ['STLD', 'Steel Dynamics', 'Metals & Mining'],

  // Entertainment
  ['LYV', 'Live Nation', 'Entertainment'],
  ['EA', 'Electronic Arts', 'Entertainment'],
  ['TTWO', 'Take-Two', 'Entertainment'],
  ['RBLX', 'Roblox', 'Entertainment'],
  ['SPOT', 'Spotify', 'Entertainment'],

  // Casinos & gaming
  ['LVS', 'Las Vegas Sands', 'Casinos & Gaming'],
  ['MGM', 'MGM Resorts', 'Casinos & Gaming'],
  ['WYNN', 'Wynn Resorts', 'Casinos & Gaming'],
  ['DKNG', 'DraftKings', 'Casinos & Gaming'],
  ['CZR', 'Caesars', 'Casinos & Gaming'],

  // Cruise lines
  ['RCL', 'Royal Caribbean', 'Cruise Lines'],
  ['CCL', 'Carnival', 'Cruise Lines'],
  ['NCLH', 'Norwegian Cruise Line', 'Cruise Lines'],

  // Airlines
  ['DAL', 'Delta Air Lines', 'Airlines'],
  ['UAL', 'United Airlines', 'Airlines'],
  ['LUV', 'Southwest Airlines', 'Airlines'],
  ['AAL', 'American Airlines', 'Airlines'],

  // Hotels & travel
  ['MAR', 'Marriott', 'Hotels & Travel'],
  ['HLT', 'Hilton', 'Hotels & Travel'],
  ['ABNB', 'Airbnb', 'Hotels & Travel'],
  ['BKNG', 'Booking Holdings', 'Hotels & Travel'],
  ['EXPE', 'Expedia', 'Hotels & Travel'],

  // Construction & engineering
  ['PWR', 'Quanta Services', 'Construction'],
  ['J', 'Jacobs Solutions', 'Construction'],
  ['ACM', 'AECOM', 'Construction'],
  ['MAS', 'Masco', 'Construction'],
  ['VMC', 'Vulcan Materials', 'Construction'],
  ['MLM', 'Martin Marietta', 'Construction'],

  // Homebuilders
  ['DHI', 'D.R. Horton', 'Homebuilders'],
  ['LEN', 'Lennar', 'Homebuilders'],
  ['NVR', 'NVR', 'Homebuilders'],
  ['PHM', 'PulteGroup', 'Homebuilders'],

  // Real estate
  ['AMT', 'American Tower', 'Real Estate'],
  ['PLD', 'Prologis', 'Real Estate'],
  ['SPG', 'Simon Property', 'Real Estate'],
  ['EQIX', 'Equinix', 'Real Estate'],
  ['O', 'Realty Income', 'Real Estate'],

  // Transport & logistics
  ['FDX', 'FedEx', 'Transport & Logistics'],
  ['CSX', 'CSX', 'Transport & Logistics'],
  ['NSC', 'Norfolk Southern', 'Transport & Logistics'],
  ['ODFL', 'Old Dominion', 'Transport & Logistics'],

  // Waste & environmental
  ['WM', 'Waste Management', 'Waste & Environmental'],
  ['RSG', 'Republic Services', 'Waste & Environmental'],
  ['WCN', 'Waste Connections', 'Waste & Environmental'],
  ['ECL', 'Ecolab', 'Waste & Environmental'],

  // Packaged foods & agriculture
  ['MDLZ', 'Mondelez', 'Packaged Foods'],
  ['GIS', 'General Mills', 'Packaged Foods'],
  ['HSY', 'Hershey', 'Packaged Foods'],
  ['SYY', 'Sysco', 'Packaged Foods'],
  ['ADM', 'Archer-Daniels-Midland', 'Agriculture'],
  ['CTVA', 'Corteva', 'Agriculture'],
  ['MOS', 'Mosaic', 'Agriculture'],
  ['CF', 'CF Industries', 'Agriculture'],

  // Apparel & luxury
  ['LULU', 'Lululemon', 'Apparel'],
  ['RL', 'Ralph Lauren', 'Apparel'],
  ['DECK', 'Deckers', 'Apparel'],
  ['VFC', 'VF Corporation', 'Apparel'],

  // Tobacco
  ['MO', 'Altria', 'Tobacco'],
  ['PM', 'Philip Morris', 'Tobacco'],
];

export const UNIVERSE: UniverseEntry[] = RAW.map(([symbol, name, industry]) => ({
  symbol,
  name,
  industry,
}));

export const INDUSTRIES = [...new Set(UNIVERSE.map((u) => u.industry))].sort();

/** Symbol → entry, for the places that hold a ticker and want its label. */
export const BY_SYMBOL = new Map(UNIVERSE.map((u) => [u.symbol, u]));
