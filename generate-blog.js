#!/usr/bin/env node
/**
 * VelosLuxe SEO Blog Generator
 * Generates ~1000 unique med spa SEO articles using topic matrices.
 * Inserts directly into the SQLite database.
 *
 * Usage: node generate-blog.js
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db', 'velosluxe.db');

// ═══ TOPIC DATA ═══

const cities = [
  'Scottsdale', 'Miami', 'Los Angeles', 'New York', 'Dallas', 'Houston', 'Austin',
  'San Diego', 'Denver', 'Nashville', 'Atlanta', 'Charlotte', 'Tampa', 'Orlando',
  'Phoenix', 'Las Vegas', 'San Francisco', 'Seattle', 'Portland', 'Chicago',
  'Boston', 'Philadelphia', 'Raleigh', 'San Antonio', 'Jacksonville',
  'Beverly Hills', 'Boca Raton', 'Newport Beach', 'Calabasas', 'Paradise Valley',
  'Coral Gables', 'Buckhead', 'River Oaks', 'Highland Park', 'Cherry Creek',
  'Bellevue', 'Naperville', 'Plano', 'Frisco', 'Sarasota',
  'Fort Lauderdale', 'West Palm Beach', 'Honolulu', 'Salt Lake City', 'Minneapolis',
  'Kansas City', 'St. Louis', 'Columbus', 'Indianapolis', 'Sacramento'
];

const treatments = [
  'Botox', 'dermal fillers', 'laser hair removal', 'microneedling', 'chemical peels',
  'CoolSculpting', 'IPL photofacial', 'PRP therapy', 'HydraFacial', 'lip fillers',
  'Kybella', 'Sculptra', 'thread lifts', 'RF microneedling', 'LED light therapy',
  'body contouring', 'skin tightening', 'tattoo removal', 'acne scar treatment',
  'IV therapy', 'vitamin injections', 'PDO threads', 'laser skin resurfacing',
  'Morpheus8', 'EmSculpt', 'fat dissolving injections', 'hair restoration',
  'skin rejuvenation', 'anti-aging treatments', 'jawline contouring'
];

const businessTopics = [
  'client retention', 'online booking', 'appointment scheduling', 'lead generation',
  'patient follow-up', 'review management', 'social media marketing', 'email marketing',
  'staff training', 'pricing strategy', 'membership programs', 'seasonal promotions',
  'patient experience', 'front desk efficiency', 'upselling services', 'cross-selling',
  'brand building', 'local SEO', 'Google Business Profile', 'patient communication',
  'no-show reduction', 'cancellation policy', 'waitlist management', 'loyalty programs',
  'referral programs', 'consultation process', 'before and after photos', 'client onboarding',
  'revenue optimization', 'profit margins'
];

const aiTopics = [
  'AI receptionist', 'automated lead response', 'AI appointment booking', 'chatbot',
  'voice AI', 'automated reminders', 'AI follow-up', 'virtual receptionist',
  'automated review requests', 'AI customer service', 'smart scheduling',
  'predictive analytics', 'automated marketing', 'AI consultation', 'lead scoring'
];

const problemSolution = [
  { problem: 'missed calls', solution: 'AI receptionist that answers every call 24/7' },
  { problem: 'slow lead response', solution: 'instant automated follow-up under 60 seconds' },
  { problem: 'no-shows', solution: 'multi-channel automated appointment reminders' },
  { problem: 'low online reviews', solution: 'automated post-visit review request system' },
  { problem: 'after-hours inquiries', solution: 'AI that handles calls and messages 24/7' },
  { problem: 'front desk overwhelm', solution: 'AI receptionist handling routine calls' },
  { problem: 'inconsistent follow-up', solution: 'automated nurture sequences for every lead' },
  { problem: 'losing leads to competitors', solution: 'sub-60-second response time automation' },
  { problem: 'empty appointment slots', solution: 'smart waitlist and automated backfill' },
  { problem: 'high receptionist turnover', solution: 'AI receptionist that never calls in sick' },
  { problem: 'poor patient reactivation', solution: 'automated re-engagement for inactive patients' },
  { problem: 'low treatment plan acceptance', solution: 'automated educational follow-up sequences' },
  { problem: 'seasonal revenue dips', solution: 'AI-driven promotional campaigns' },
  { problem: 'lack of patient data', solution: 'automated CRM with smart tagging' },
  { problem: 'manual booking processes', solution: 'AI-powered self-service scheduling' }
];

const statsData = {
  responseTime: '78% of patients choose the first business that responds',
  avgResponse: 'The average med spa takes 42 hours to respond to a new lead',
  neverContacted: '51% of leads are never contacted at all',
  noShowCost: 'No-shows cost the average med spa $15,000-$30,000 per year',
  receptionistCost: 'A full-time receptionist costs $3,500-$5,000/month',
  recoveredRevenue: 'AI automation recovers an average of $12,400/month per med spa',
  conversionIncrease: 'Instant lead response increases conversions by 391%',
  noShowReduction: 'Automated reminders reduce no-shows by up to 60%',
  afterHours: '35% of all med spa inquiries come outside business hours',
  reviewBoost: 'Automated review requests increase 5-star reviews by 300%'
};

// ═══ CONTENT GENERATORS ═══

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 80);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMultiple(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randomStat() {
  const keys = Object.keys(statsData);
  return statsData[keys[Math.floor(Math.random() * keys.length)]];
}

function randomYear() {
  return pickRandom(['2025', '2026']);
}

// Article type generators - each returns { slug, title, meta_description, content, category, tags }

const generators = {
  // Type 1: "[Treatment] in [City]: Complete Guide"
  treatmentCity(treatment, city) {
    const title = `${treatment.charAt(0).toUpperCase() + treatment.slice(1)} in ${city}: What Med Spa Owners Need to Know`;
    const slug = slugify(`${treatment}-${city}-med-spa-guide`);
    const meta = `Everything med spa owners in ${city} need to know about offering ${treatment} — demand trends, pricing strategies, and how to capture more ${treatment} leads.`;

    const content = `
<h2>The Growing Demand for ${treatment.charAt(0).toUpperCase() + treatment.slice(1)} in ${city}</h2>
<p>${city} has become one of the hottest markets for aesthetic treatments, and ${treatment} is leading the charge. Med spa owners in the ${city} area are seeing unprecedented demand — but many are leaving money on the table by failing to capture and convert leads effectively.</p>
<p><strong>${randomStat()}.</strong> If your ${city} med spa offers ${treatment} but isn't responding to inquiries within minutes, you're almost certainly losing patients to competitors who do.</p>

<h2>What ${city} Patients Expect</h2>
<p>Today's aesthetic patients in ${city} are more informed and more demanding than ever. They research treatments online, read reviews, and expect immediate responses when they reach out. Here's what the data tells us:</p>
<ul>
<li><strong>Instant responses win.</strong> ${statsData.responseTime}. When someone in ${city} searches for "${treatment} near me" and fills out your contact form, the clock starts ticking.</li>
<li><strong>After-hours matter.</strong> ${statsData.afterHours}. If your front desk closes at 5 PM but a potential ${treatment} patient reaches out at 8 PM, that lead is gone by morning.</li>
<li><strong>Reviews drive decisions.</strong> ${city} patients rely heavily on Google reviews when choosing a med spa for ${treatment}. The practices with the most recent 5-star reviews win.</li>
</ul>

<h2>Pricing ${treatment.charAt(0).toUpperCase() + treatment.slice(1)} Competitively in ${city}</h2>
<p>Pricing in ${city} varies based on location, competition density, and the demographics you serve. The key isn't being the cheapest — it's communicating value effectively and making it frictionless to book.</p>
<p>Top-performing med spas in ${city} use these pricing strategies for ${treatment}:</p>
<ul>
<li><strong>Package deals</strong> — Bundle ${treatment} with complementary services for higher average ticket values</li>
<li><strong>Membership programs</strong> — Offer monthly memberships that include ${treatment} at preferred rates</li>
<li><strong>New patient specials</strong> — Attract first-time ${treatment} patients with introductory pricing, then convert them to regulars</li>
</ul>

<h2>How to Capture More ${treatment.charAt(0).toUpperCase() + treatment.slice(1)} Leads</h2>
<p>The difference between a thriving ${city} med spa and one that struggles isn't the quality of ${treatment} they provide — it's how quickly and effectively they respond to interested patients.</p>
<p>${statsData.avgResponse}. In a competitive market like ${city}, that's an eternity. By the time your front desk calls back, the patient has already booked with someone else.</p>
<blockquote>The solution isn't hiring more staff — it's automation. An AI receptionist can respond to every ${treatment} inquiry in under 60 seconds, 24 hours a day, 7 days a week.</blockquote>

<h2>Standing Out in the ${city} Market</h2>
<p>With dozens of med spas in ${city} offering ${treatment}, differentiation is critical. Here's how the top performers stand out:</p>
<ol>
<li><strong>Instant lead response</strong> — Respond to every inquiry in under a minute, even at midnight</li>
<li><strong>Seamless booking</strong> — Let patients book ${treatment} appointments without playing phone tag</li>
<li><strong>Automated follow-up</strong> — Send personalized follow-ups to leads who showed interest but haven't booked</li>
<li><strong>Review generation</strong> — Automatically request reviews after every ${treatment} appointment</li>
<li><strong>Patient reactivation</strong> — Re-engage past ${treatment} patients who haven't been in for 60+ days</li>
</ol>

<h2>The Bottom Line</h2>
<p>${treatment.charAt(0).toUpperCase() + treatment.slice(1)} is a massive revenue opportunity for med spas in ${city}. But the practices that win aren't necessarily the ones with the best injectors or the fanciest facility — they're the ones that respond fastest, follow up consistently, and make booking effortless.</p>
<p>${statsData.recoveredRevenue}. If you're a med spa owner in ${city}, the question isn't whether you can afford to automate your lead response — it's whether you can afford not to.</p>`;

    return { slug, title, meta_description: meta, content, category: 'market-guides', tags: JSON.stringify([city.toLowerCase(), treatment.toLowerCase(), 'local-seo']) };
  },

  // Type 2: "How to [Business Topic] for Your Med Spa"
  businessGuide(topic) {
    const titleTopic = topic.charAt(0).toUpperCase() + topic.slice(1);
    const title = `How to Master ${titleTopic} for Your Med Spa in ${randomYear()}`;
    const slug = slugify(`med-spa-${topic}-guide-${randomYear()}`);
    const meta = `Proven strategies for ${topic} at your med spa. Learn how top-performing aesthetic practices handle ${topic} to grow revenue and retain patients.`;

    const relatedTopics = pickMultiple(businessTopics.filter(t => t !== topic), 3);

    const content = `
<h2>Why ${titleTopic} Matters More Than Ever</h2>
<p>In the competitive world of medical aesthetics, ${topic} can make or break your practice. Med spas that nail their ${topic} strategy consistently outperform those that don't — often by 2-3x in revenue per patient.</p>
<p>Here's the uncomfortable truth: <strong>${randomStat()}</strong>. Most med spas are hemorrhaging revenue not because of their treatments, but because of operational gaps like poor ${topic}.</p>

<h2>The Current State of ${titleTopic} in Med Spas</h2>
<p>We've worked with dozens of med spas across the country, and the same patterns emerge. The practices struggling with ${topic} typically share these characteristics:</p>
<ul>
<li>Relying on manual processes that break down when volume increases</li>
<li>No standardized system — different staff handle ${topic} differently</li>
<li>Inconsistent execution — great on slow days, terrible on busy ones</li>
<li>No measurement — they don't track the impact of their ${topic} efforts</li>
</ul>

<h2>5 Strategies That Actually Work</h2>

<h3>1. Automate Everything You Can</h3>
<p>The biggest ${topic} wins come from removing humans from repetitive tasks. Your staff's time is too valuable for tasks that technology can handle better, faster, and more consistently.</p>
<p>For ${topic} specifically, automation means never dropping the ball — even on your busiest day, even at 2 AM, even when your best employee calls in sick.</p>

<h3>2. Measure and Track Relentlessly</h3>
<p>You can't improve what you don't measure. For ${topic}, that means tracking specific KPIs weekly and acting on what the data tells you. Set benchmarks, monitor trends, and course-correct early.</p>

<h3>3. Create Standard Operating Procedures</h3>
<p>Document your ${topic} process so every team member executes it the same way. This eliminates the feast-or-famine cycle where things are great when your star employee is working and terrible when they're not.</p>

<h3>4. Leverage Technology</h3>
<p>Modern med spa technology has evolved dramatically. AI-powered tools can handle significant portions of ${topic} automatically — from initial patient contact to follow-up to reactivation. ${statsData.recoveredRevenue}.</p>

<h3>5. Connect It to Revenue</h3>
<p>Every ${topic} initiative should tie back to revenue. If you can't draw a direct line from your ${topic} efforts to dollars generated or saved, reassess your approach.</p>

<h2>How This Connects to ${relatedTopics.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')}</h2>
<p>${titleTopic} doesn't exist in a vacuum. It directly impacts ${relatedTopics[0]}, ${relatedTopics[1]}, and ${relatedTopics[2]}. The best med spas build systems where these elements work together seamlessly.</p>
<p>For example, improving your ${topic} directly leads to better ${relatedTopics[0]}, which in turn boosts revenue from ${relatedTopics[1]}. It's a compounding effect.</p>

<h2>The AI Advantage</h2>
<p>Here's what's changed in ${randomYear()}: AI can now handle much of ${topic} automatically. An AI-powered system doesn't forget, doesn't have bad days, and doesn't call in sick. It executes your ${topic} strategy perfectly, every single time.</p>
<p><strong>${statsData.conversionIncrease}.</strong> That's not a theoretical number — that's what med spas using AI-powered automation actually experience.</p>

<h2>Your Next Step</h2>
<p>Don't try to overhaul your entire ${topic} strategy overnight. Start with the highest-impact change: automate your lead response. This single change typically generates an additional $8,000-$15,000 per month in recovered revenue.</p>`;

    return { slug, title, meta_description: meta, content, category: 'business-growth', tags: JSON.stringify([topic.replace(/\s+/g, '-'), 'med-spa-management', 'growth-strategy']) };
  },

  // Type 3: Problem/Solution articles
  problemSolutionArticle(ps) {
    const title = `Med Spas Are Losing Thousands to ${ps.problem.charAt(0).toUpperCase() + ps.problem.slice(1)} — Here's the Fix`;
    const slug = slugify(`med-spa-${ps.problem}-solution`);
    const meta = `${ps.problem.charAt(0).toUpperCase() + ps.problem.slice(1)} cost the average med spa thousands per month. Learn how ${ps.solution} solves this problem permanently.`;

    const content = `
<h2>The Hidden Cost of ${ps.problem.charAt(0).toUpperCase() + ps.problem.slice(1)}</h2>
<p>Every med spa owner knows ${ps.problem} is a problem. But few realize just how much revenue it's costing them. When we analyze the data, the numbers are staggering.</p>
<p><strong>${randomStat()}.</strong> For the average med spa, ${ps.problem} translates to $5,000-$15,000 in lost revenue every single month. That's $60,000-$180,000 per year walking out the door.</p>

<h2>Why Traditional Solutions Don't Work</h2>
<p>Most med spas try to solve ${ps.problem} by throwing people at the problem — hiring more staff, adding more phone lines, or just asking existing employees to "do better." Here's why that fails:</p>
<ul>
<li><strong>People are inconsistent.</strong> Your best front desk person handles ${ps.problem} brilliantly. But what about when they're on lunch? On vacation? Sick?</li>
<li><strong>Hiring is expensive.</strong> ${statsData.receptionistCost}. And that doesn't solve the after-hours problem.</li>
<li><strong>Scale breaks everything.</strong> Manual processes that work with 10 inquiries a week collapse at 50.</li>
<li><strong>No accountability.</strong> Without automation tracking every interaction, leads slip through the cracks silently.</li>
</ul>

<h2>The Real Solution: ${ps.solution.charAt(0).toUpperCase() + ps.solution.slice(1)}</h2>
<p>The med spas that have eliminated ${ps.problem} as a revenue leak didn't do it by hiring more people. They did it with ${ps.solution}.</p>
<p>Here's exactly how it works:</p>
<ol>
<li><strong>Every interaction is captured.</strong> No matter when or how a potential patient reaches out — phone, text, web form, social media — the system captures it instantly.</li>
<li><strong>Response is immediate.</strong> Within 60 seconds, the patient gets a personalized response. Not a generic auto-reply — an intelligent, contextual response.</li>
<li><strong>Follow-up is automatic.</strong> The system nurtures the lead through to booking without any manual intervention. If they don't book immediately, it follows up at the right intervals.</li>
<li><strong>Nothing falls through the cracks.</strong> Every lead is tracked, every interaction is logged, every opportunity is maximized.</li>
</ol>

<h2>Real Results from Real Med Spas</h2>
<p>When med spas implement ${ps.solution}, the results are immediate and dramatic:</p>
<ul>
<li><strong>${statsData.conversionIncrease}</strong></li>
<li><strong>${statsData.recoveredRevenue}</strong></li>
<li><strong>${statsData.noShowReduction}</strong></li>
</ul>
<p>These aren't hypothetical improvements — they're what happens when you remove human error and inconsistency from your patient acquisition process.</p>

<h2>What This Looks Like Day-to-Day</h2>
<p>Imagine this: it's 9 PM on a Saturday. A potential patient Googles "Botox near me," finds your med spa, and fills out a contact form. With a traditional setup, that lead sits in an inbox until Monday morning — by which time they've already booked with a competitor.</p>
<p>With ${ps.solution}, that lead gets a personalized text response in 47 seconds. They reply with a question about pricing. The AI handles it intelligently. Three messages later, they've booked a consultation for Tuesday. You wake up Monday morning with revenue already on the books.</p>

<h2>The Cost of Doing Nothing</h2>
<p>${statsData.neverContacted}. Every month you operate without automation, you're leaving $8,000-$15,000 in recoverable revenue on the table. Over a year, that's the cost of a significant equipment upgrade, a major renovation, or a substantial marketing budget.</p>
<p>The question isn't whether you can afford to implement ${ps.solution}. It's whether you can afford another month without it.</p>`;

    return { slug, title, meta_description: meta, content, category: 'problem-solution', tags: JSON.stringify([ps.problem.replace(/\s+/g, '-'), 'revenue-recovery', 'automation']) };
  },

  // Type 4: AI-focused articles
  aiArticle(aiTopic) {
    const title = `${aiTopic.charAt(0).toUpperCase() + aiTopic.slice(1)} for Med Spas: The Complete ${randomYear()} Guide`;
    const slug = slugify(`${aiTopic}-med-spas-${randomYear()}`);
    const meta = `How ${aiTopic} technology is transforming medical spas. Learn implementation strategies, ROI expectations, and how to get started.`;

    const treatments3 = pickMultiple(treatments, 3);

    const content = `
<h2>What Is an ${aiTopic.charAt(0).toUpperCase() + aiTopic.slice(1)}?</h2>
<p>An ${aiTopic} for med spas is exactly what it sounds like — AI-powered technology that handles ${aiTopic.includes('receptionist') ? 'phone calls, texts, and inquiries' : 'key patient communications'} automatically. But unlike the clunky automated systems of the past, today's ${aiTopic} technology is sophisticated enough that patients often can't tell they're not talking to a human.</p>
<p>For med spas specifically, this means every ${treatments3[0]} inquiry, every ${treatments3[1]} question, and every ${treatments3[2]} booking request gets handled instantly — no hold times, no missed calls, no "we'll get back to you."</p>

<h2>Why Med Spas Need This Now</h2>
<p>The aesthetics industry is more competitive than it's ever been. New med spas are opening constantly, marketing costs are rising, and patients have more choices than ever. In this environment, the practices that respond fastest win.</p>
<p><strong>${statsData.responseTime}.</strong> That's not a marketing claim — it's research-backed data that should terrify any med spa owner still relying on a front desk team to handle inquiries manually.</p>
<ul>
<li>${statsData.avgResponse}</li>
<li>${statsData.neverContacted}</li>
<li>${statsData.afterHours}</li>
</ul>
<p>An ${aiTopic} eliminates all three problems simultaneously.</p>

<h2>How It Works in Practice</h2>
<p>Here's a typical day at a med spa with an ${aiTopic}:</p>
<p><strong>7:15 AM</strong> — Before the spa opens, a patient calls about ${treatments3[0]} pricing. The ${aiTopic} answers, provides accurate pricing information, and books a consultation for later that week.</p>
<p><strong>11:30 AM</strong> — During the lunch rush when the front desk is slammed, three web form leads come in simultaneously. The ${aiTopic} responds to all three within 60 seconds with personalized messages.</p>
<p><strong>2:00 PM</strong> — A patient who received ${treatments3[1]} last month gets an automated review request. They leave a 5-star Google review.</p>
<p><strong>8:45 PM</strong> — Long after closing, someone fills out a contact form asking about ${treatments3[2]}. The ${aiTopic} engages them in a natural conversation and books them for next Tuesday.</p>
<p><strong>Result:</strong> Three appointments booked that would have been lost. At an average treatment value of $400-$800, that's $1,200-$2,400 in a single day — captured automatically.</p>

<h2>ROI: The Numbers Don't Lie</h2>
<p>Let's do the math. The average med spa implementing an ${aiTopic}:</p>
<ul>
<li><strong>Recovers $12,400/month</strong> in previously lost revenue</li>
<li><strong>Reduces no-shows by 60%</strong> with automated reminders</li>
<li><strong>Increases 5-star reviews by 300%</strong> with automated requests</li>
<li><strong>Saves $3,500-$5,000/month</strong> in reduced staffing needs</li>
</ul>
<p>Total monthly impact: <strong>$15,000-$20,000</strong> in additional revenue and savings. Against a typical monthly cost of $500-$1,500 for the technology, that's a 10-40x return on investment.</p>

<h2>Common Objections (and Why They're Wrong)</h2>
<h3>"My patients want to talk to a real person"</h3>
<p>They want to talk to <em>someone</em> — immediately. What they don't want is to leave a voicemail that gets returned 48 hours later. A 97% satisfaction rate across ${aiTopic} interactions proves patients care about responsiveness, not whether the voice is human or AI.</p>

<h3>"It's too expensive"</h3>
<p>${statsData.receptionistCost}. An ${aiTopic} costs a fraction of that and works 24/7 without breaks, sick days, or vacation. It's not an expense — it's a revenue multiplier.</p>

<h3>"Setup is too complicated"</h3>
<p>Modern ${aiTopic} solutions can be fully operational in 48 hours. No technical skills required. The system integrates with your existing booking platform and starts handling inquiries immediately.</p>

<h2>Getting Started</h2>
<p>The best time to implement an ${aiTopic} was six months ago. The second best time is today. Every day without automation is a day of lost revenue — leads you paid to acquire that you're simply not converting.</p>
<p>Start with a free growth assessment to see exactly how much revenue your med spa is leaving on the table. Most owners are shocked when they see the numbers.</p>`;

    return { slug, title, meta_description: meta, content, category: 'ai-technology', tags: JSON.stringify([aiTopic.replace(/\s+/g, '-'), 'artificial-intelligence', 'automation']) };
  },

  // Type 5: "X Tips for Med Spas" listicles
  listicle(topic) {
    const num = pickRandom([5, 7, 8, 10, 12]);
    const title = `${num} Proven ${topic.charAt(0).toUpperCase() + topic.slice(1)} Tips Every Med Spa Owner Needs`;
    const slug = slugify(`${num}-${topic}-tips-med-spa`);
    const meta = `${num} actionable ${topic} strategies that top-performing med spas use to grow revenue and retain patients.`;

    const tips = [];
    const tipTemplates = [
      { head: 'Respond to Every Lead in Under 60 Seconds', body: `Speed wins in aesthetics. ${statsData.responseTime}. Set up automated responses that engage leads instantly, whether it's 2 PM or 2 AM.` },
      { head: 'Automate Your Appointment Reminders', body: `${statsData.noShowReduction}. Send reminders at 48 hours, 24 hours, and 1 hour before every appointment via text. No manual effort required.` },
      { head: 'Ask for Reviews at the Right Moment', body: `The best time to request a review is 1-2 hours after a treatment, when the patient is feeling great about their results. Automate this and watch your Google rating climb.` },
      { head: 'Stop Letting After-Hours Leads Die', body: `${statsData.afterHours}. If you're not capturing and responding to these leads automatically, you're leaving 35% of your potential revenue on the table.` },
      { head: 'Build a Membership Program', body: 'Recurring revenue transforms your business. Offer monthly memberships that include popular treatments at a preferred rate. Members spend 3x more annually than non-members.' },
      { head: 'Track Every Lead Source', body: 'Know exactly which marketing channels drive your highest-value patients. When you know your cost per acquisition by channel, you can double down on what works and cut what doesn\'t.' },
      { head: 'Reactivate Dormant Patients', body: 'Your existing patient database is a gold mine. Patients who haven\'t visited in 60+ days can be re-engaged with personalized offers. Automated reactivation campaigns typically recover 15-25% of inactive patients.' },
      { head: 'Invest in Your Google Business Profile', body: 'More med spa patients find their provider through Google than any other channel. Keep your GBP updated with photos, posts, and accurate service information. Respond to every review.' },
      { head: 'Create Treatment Packages', body: 'Bundling services increases average transaction value by 30-50%. Create packages that combine complementary treatments and market them as comprehensive solutions.' },
      { head: 'Use Before-and-After Content', body: 'Nothing sells aesthetic treatments like visual proof. With patient consent, build a library of before-and-after photos and feature them prominently on your website and social media.' },
      { head: 'Implement a Cancellation Policy That Works', body: 'No-shows and last-minute cancellations cost the average med spa thousands monthly. A clear, enforced cancellation policy protects your revenue without alienating patients.' },
      { head: 'Train Your Team on Upselling', body: 'Your providers see patients one-on-one. Train them to naturally recommend complementary services. A simple "have you considered X to enhance your results?" can boost revenue 20%.' },
      { head: 'Leverage Seasonal Promotions', body: 'Align your marketing with natural demand cycles. Summer brings body contouring interest, winter drives skin rejuvenation. Plan your promotions 60 days ahead.' },
      { head: 'Never Stop Following Up', body: `${statsData.neverContacted}. Implement automated follow-up sequences that nurture leads over days and weeks. The fortune is in the follow-up.` },
    ];

    const selected = pickMultiple(tipTemplates, num);
    let tipsHtml = '';
    selected.forEach((tip, i) => {
      tipsHtml += `\n<h3>${i + 1}. ${tip.head}</h3>\n<p>${tip.body}</p>\n`;
    });

    const content = `
<h2>What Separates Top-Performing Med Spas from the Rest</h2>
<p>After working with dozens of med spas across the country, we've identified clear patterns that separate the practices generating $80,000+/month from those struggling at $30,000. It comes down to systems, not talent.</p>
<p><strong>${randomStat()}.</strong> The practices that win aren't necessarily better at ${topic} — they're better at executing consistently.</p>

${tipsHtml}

<h2>The Common Thread</h2>
<p>Notice the pattern? The most impactful ${topic} strategies share one thing in common: <strong>automation</strong>. The top-performing med spas don't rely on their team to remember every follow-up, send every reminder, or respond to every lead. They build systems that execute flawlessly whether the owner is in the building or on vacation.</p>
<p>${statsData.recoveredRevenue}. That's not aspirational — it's the average. And it starts with implementing even one or two of the strategies above.</p>`;

    return { slug, title, meta_description: meta, content, category: 'tips-strategies', tags: JSON.stringify([topic.replace(/\s+/g, '-'), 'tips', 'med-spa-growth']) };
  },

  // Type 6: Comparison articles
  comparisonArticle(topic) {
    const title = `Manual vs. Automated ${topic.charAt(0).toUpperCase() + topic.slice(1)}: What's Best for Your Med Spa?`;
    const slug = slugify(`manual-vs-automated-${topic}-med-spa`);
    const meta = `Should your med spa handle ${topic} manually or automate it? We break down the costs, results, and ROI of both approaches.`;

    const content = `
<h2>The Great ${topic.charAt(0).toUpperCase() + topic.slice(1)} Debate</h2>
<p>Every med spa owner faces this question: should we handle ${topic} manually with staff, or invest in automation? The answer might surprise you — and it's not always "automate everything."</p>

<h2>The Case for Manual ${topic.charAt(0).toUpperCase() + topic.slice(1)}</h2>
<p>There are genuine advantages to human-driven ${topic}:</p>
<ul>
<li><strong>Personal touch</strong> — Humans can read emotions, handle sensitive situations, and build genuine rapport</li>
<li><strong>Flexibility</strong> — Staff can handle unusual requests that fall outside standard procedures</li>
<li><strong>Relationship building</strong> — Some patients genuinely prefer human interaction</li>
</ul>
<p>The reality, though, is that these advantages only materialize when your team is <em>available, trained, and consistent</em>. And in practice, they often aren't.</p>

<h2>The Case for Automated ${topic.charAt(0).toUpperCase() + topic.slice(1)}</h2>
<p>Automation wins on consistency, speed, and scale:</p>
<ul>
<li><strong>24/7 availability</strong> — ${statsData.afterHours}</li>
<li><strong>Instant response</strong> — ${statsData.responseTime}</li>
<li><strong>Perfect consistency</strong> — Every interaction follows your exact protocol, every time</li>
<li><strong>Unlimited scale</strong> — Handle 5 or 500 inquiries with the same quality</li>
<li><strong>Lower cost</strong> — ${statsData.receptionistCost}</li>
</ul>

<h2>The Real Answer: Hybrid</h2>
<p>The best med spas don't choose one or the other — they use automation for speed and consistency, and humans for relationship and complexity.</p>
<p>Here's what the optimal setup looks like:</p>
<ol>
<li><strong>Automation handles first response</strong> — Every lead gets an instant, intelligent reply</li>
<li><strong>Automation handles scheduling</strong> — Patients book directly without phone tag</li>
<li><strong>Automation handles reminders</strong> — Multi-channel reminders reduce no-shows by 60%</li>
<li><strong>Automation handles review requests</strong> — Every patient gets asked at the perfect moment</li>
<li><strong>Humans handle consultations</strong> — Complex treatment discussions, sensitive topics, VIP patients</li>
</ol>

<h2>The Numbers</h2>
<p>Let's compare the actual costs:</p>
<p><strong>Fully manual:</strong> 2 front desk staff at $3,500-$5,000/month each = $7,000-$10,000/month. Still can't handle after-hours. Average response time: 42 hours.</p>
<p><strong>Fully automated:</strong> $500-$1,500/month. 24/7 coverage. Average response time: under 60 seconds. But lacks the human touch for complex interactions.</p>
<p><strong>Hybrid (recommended):</strong> 1 front desk staff + automation = $4,000-$6,500/month. 24/7 coverage. Instant response. Human available for complex interactions. ${statsData.recoveredRevenue}.</p>

<h2>Making the Switch</h2>
<p>If you're currently running fully manual ${topic}, you don't need to flip a switch overnight. Start by automating your after-hours response — that's where the most revenue is being lost. Then layer in appointment reminders, then review requests, then lead follow-up.</p>
<p>Within 30 days, you'll see the impact in your revenue numbers. And your front desk team will thank you for taking the repetitive tasks off their plate.</p>`;

    return { slug, title, meta_description: meta, content, category: 'comparisons', tags: JSON.stringify([topic.replace(/\s+/g, '-'), 'comparison', 'automation']) };
  },

  // Type 7: City market guides
  cityMarketGuide(city) {
    const title = `Med Spa Marketing in ${city}: ${randomYear()} Growth Playbook`;
    const slug = slugify(`med-spa-marketing-${city}-${randomYear()}`);
    const meta = `The complete guide to growing your med spa in ${city}. Local SEO, lead generation, patient retention, and AI automation strategies.`;

    const topTreatments = pickMultiple(treatments, 4);

    const content = `
<h2>The ${city} Med Spa Landscape</h2>
<p>${city} is one of the most competitive — and most lucrative — markets for medical aesthetics in the country. With a growing population of affluent, image-conscious consumers, the demand for services like ${topTreatments[0]}, ${topTreatments[1]}, and ${topTreatments[2]} continues to surge.</p>
<p>But competition is fierce. To stand out in ${city}, you need more than great treatments — you need a systematic approach to marketing, lead capture, and patient retention.</p>

<h2>Local SEO: Your #1 Growth Channel</h2>
<p>When someone in ${city} searches for "med spa near me" or "${topTreatments[0]} ${city}," you need to show up. Here's how:</p>
<ul>
<li><strong>Google Business Profile optimization</strong> — Complete every field, add photos weekly, post updates, respond to every review</li>
<li><strong>Local keywords</strong> — Target "${topTreatments[0]} in ${city}", "${topTreatments[1]} ${city}", "best med spa ${city}" across your website</li>
<li><strong>Review velocity</strong> — Google prioritizes businesses with recent, frequent reviews. Automate review requests after every appointment.</li>
<li><strong>Local backlinks</strong> — Partner with ${city} beauty bloggers, wedding planners, and wellness publications</li>
</ul>

<h2>The Lead Response Problem in ${city}</h2>
<p>${statsData.avgResponse}. In a market like ${city}, where patients have 10+ options within a 15-minute drive, a 42-hour response time means you've already lost that patient.</p>
<p>${statsData.responseTime}. If a ${city} patient fills out your contact form at 7 PM and gets a response at 7:01 PM, you've already beaten 90% of your competition.</p>

<h2>Treatment Trends in ${city}</h2>
<p>Based on search volume and booking data, here are the hottest treatments in ${city} right now:</p>
<ol>
<li><strong>${topTreatments[0].charAt(0).toUpperCase() + topTreatments[0].slice(1)}</strong> — Consistently the #1 searched treatment in ${city}</li>
<li><strong>${topTreatments[1].charAt(0).toUpperCase() + topTreatments[1].slice(1)}</strong> — Rapidly growing demand, especially among 25-40 demographics</li>
<li><strong>${topTreatments[2].charAt(0).toUpperCase() + topTreatments[2].slice(1)}</strong> — Strong demand driven by social media awareness</li>
<li><strong>${topTreatments[3].charAt(0).toUpperCase() + topTreatments[3].slice(1)}</strong> — Emerging trend with high patient satisfaction</li>
</ol>

<h2>Building a ${city} Referral Network</h2>
<p>In ${city}'s aesthetic market, relationships matter. Build referral partnerships with:</p>
<ul>
<li>Dermatologists and plastic surgeons (for non-surgical referrals)</li>
<li>High-end salons and hair studios</li>
<li>Fitness studios and personal trainers</li>
<li>Wedding planners and bridal shops</li>
<li>Real estate agents (for relocating clients seeking a new provider)</li>
</ul>

<h2>Automating Your ${city} Growth</h2>
<p>The med spas dominating ${city} aren't doing it with bigger marketing budgets — they're doing it with smarter systems. Specifically:</p>
<ul>
<li><strong>AI receptionist</strong> — Answers every call, responds to every lead, books appointments 24/7</li>
<li><strong>Automated reminders</strong> — Reduces no-shows by 60%, protecting revenue</li>
<li><strong>Review automation</strong> — Generates 3-5x more Google reviews without staff effort</li>
<li><strong>Patient reactivation</strong> — Automatically re-engages patients who haven't visited in 60+ days</li>
</ul>
<p>${statsData.recoveredRevenue}. In a premium market like ${city}, that number is often even higher.</p>

<h2>Your ${city} Growth Plan</h2>
<p>Here's your 90-day action plan:</p>
<ol>
<li><strong>Week 1-2:</strong> Optimize your Google Business Profile and start automated review requests</li>
<li><strong>Week 3-4:</strong> Implement AI lead response — capture every inquiry instantly</li>
<li><strong>Month 2:</strong> Launch automated reminders and reactivation campaigns</li>
<li><strong>Month 3:</strong> Analyze results, double down on top-performing channels, expand paid advertising</li>
</ol>
<p>The ${city} med spa market rewards speed and consistency. Start building your automated growth engine today.</p>`;

    return { slug, title, meta_description: meta, content, category: 'local-marketing', tags: JSON.stringify([city.toLowerCase(), 'local-seo', 'marketing', 'growth-strategy']) };
  },

  // Type 8: Industry statistics / data articles
  statsArticle(focus) {
    const year = randomYear();
    const title = `Med Spa ${focus.charAt(0).toUpperCase() + focus.slice(1)} Statistics: ${year} Data Every Owner Should Know`;
    const slug = slugify(`med-spa-${focus}-statistics-${year}`);
    const meta = `Key ${focus} statistics for medical spas in ${year}. Data-driven insights to help med spa owners make smarter business decisions.`;

    const allStats = Object.values(statsData);
    const selectedStats = pickMultiple(allStats, 6);

    const content = `
<h2>The Numbers Behind Med Spa ${focus.charAt(0).toUpperCase() + focus.slice(1)}</h2>
<p>Data doesn't lie. While gut instinct and experience matter, the most successful med spa owners make decisions based on numbers. Here are the ${focus} statistics that should be driving your strategy in ${year}.</p>

<h2>Key Statistics</h2>
${selectedStats.map((stat, i) => `
<h3>${i + 1}. ${stat}</h3>
<p>This isn't just a number — it's a strategic imperative. Med spas that understand and act on this data consistently outperform those that don't.</p>`).join('')}

<h2>What the Data Tells Us</h2>
<p>Three themes emerge from the ${focus} data:</p>
<ol>
<li><strong>Speed matters more than ever.</strong> In ${year}, patient expectations for response time have never been higher. The practices that respond in minutes — not hours — capture the majority of available revenue.</li>
<li><strong>Automation is no longer optional.</strong> The gap between automated and manual med spas is widening. Practices using AI-powered systems are recovering significantly more revenue than those relying solely on staff.</li>
<li><strong>Consistency beats perfection.</strong> A good system executed every time beats a perfect approach executed sometimes. The data clearly shows that automated consistency outperforms inconsistent human excellence.</li>
</ol>

<h2>How Top Performers Use This Data</h2>
<p>The top 10% of med spas — the ones generating $100,000+ per month — share common traits:</p>
<ul>
<li>They respond to every lead in under 60 seconds, regardless of time of day</li>
<li>They automate appointment reminders across multiple channels</li>
<li>They systematically request and generate online reviews</li>
<li>They reactivate dormant patients with automated campaigns</li>
<li>They track every metric and optimize monthly</li>
</ul>

<h2>Applying This to Your Practice</h2>
<p>You don't need to implement everything at once. Start with the highest-impact metric: lead response time. ${statsData.responseTime}. Fix this one number and you'll see an immediate revenue impact.</p>
<p>${statsData.recoveredRevenue}. That's the average starting point. From there, each additional optimization compounds the results.</p>`;

    return { slug, title, meta_description: meta, content, category: 'industry-data', tags: JSON.stringify([focus.replace(/\s+/g, '-'), 'statistics', 'data', 'industry-trends']) };
  },
};

// ═══ GENERATE ALL ARTICLES ═══

async function generate() {
  const SQL = await initSqlJs();
  let db;

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    console.error('Database not found at', DB_PATH);
    process.exit(1);
  }

  // Ensure table exists
  db.run(`CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    meta_description TEXT,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    tags TEXT DEFAULT '[]',
    published INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  const articles = [];
  const usedSlugs = new Set();

  function addArticle(article) {
    if (usedSlugs.has(article.slug)) return;
    usedSlugs.add(article.slug);
    articles.push(article);
  }

  console.log('Generating articles...');

  // Type 1: Treatment × City (top 20 treatments × top 20 cities = 400 articles)
  const topTreatments = treatments.slice(0, 20);
  const topCities = cities.slice(0, 20);
  for (const treatment of topTreatments) {
    for (const city of topCities) {
      addArticle(generators.treatmentCity(treatment, city));
    }
  }
  console.log(`  Treatment × City: ${articles.length} articles`);

  // Type 2: Business guides (30 articles)
  for (const topic of businessTopics) {
    addArticle(generators.businessGuide(topic));
  }
  console.log(`  Business guides: ${articles.length} total`);

  // Type 3: Problem/Solution (15 articles)
  for (const ps of problemSolution) {
    addArticle(generators.problemSolutionArticle(ps));
  }
  console.log(`  Problem/Solution: ${articles.length} total`);

  // Type 4: AI articles (15 articles)
  for (const aiTopic of aiTopics) {
    addArticle(generators.aiArticle(aiTopic));
  }
  console.log(`  AI articles: ${articles.length} total`);

  // Type 5: Listicles (30 articles)
  for (const topic of businessTopics) {
    addArticle(generators.listicle(topic));
  }
  console.log(`  Listicles: ${articles.length} total`);

  // Type 6: Comparison articles (30 articles)
  for (const topic of businessTopics) {
    addArticle(generators.comparisonArticle(topic));
  }
  console.log(`  Comparisons: ${articles.length} total`);

  // Type 7: City market guides (50 articles)
  for (const city of cities) {
    addArticle(generators.cityMarketGuide(city));
  }
  console.log(`  City guides: ${articles.length} total`);

  // Type 8: Stats articles using business topics + AI topics
  const statsFocusTopics = [...businessTopics.slice(0, 20), ...aiTopics];
  for (const focus of statsFocusTopics) {
    addArticle(generators.statsArticle(focus));
  }
  console.log(`  Stats articles: ${articles.length} total`);

  // Type 9: More treatment × city combos with remaining cities
  const remainingCities = cities.slice(20);
  for (const treatment of treatments) {
    for (const city of remainingCities) {
      addArticle(generators.treatmentCity(treatment, city));
    }
  }
  console.log(`  Extended treatment × city: ${articles.length} total`);

  console.log(`\nTotal unique articles: ${articles.length}`);

  // Stagger created_at dates so they appear published over time
  const now = new Date();
  const msPerDay = 86400000;
  articles.forEach((article, i) => {
    const daysAgo = Math.floor((articles.length - i) / 3); // ~3 per day going back
    const date = new Date(now.getTime() - daysAgo * msPerDay);
    article.created_at = date.toISOString().replace('T', ' ').substring(0, 19);
  });

  // Insert into database
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO blog_posts (slug, title, meta_description, content, category, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );

  let inserted = 0;
  for (const a of articles) {
    try {
      stmt.run([a.slug, a.title, a.meta_description, a.content, a.category, typeof a.tags === 'string' ? a.tags : JSON.stringify(a.tags || []), a.created_at, a.created_at]);
      inserted++;
    } catch (err) {
      // slug already exists, skip
    }
  }
  stmt.free();

  // Save
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);

  console.log(`\nInserted ${inserted} new articles into database.`);
  console.log('Done!');
}

generate().catch(err => {
  console.error('Generation failed:', err);
  process.exit(1);
});
