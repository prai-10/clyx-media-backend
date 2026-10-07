// Portfolio projects added on 2026-10-08: four more per category (Tech, Food, Fashion, D2C, Beauty), each with its
// own write-up for the project page. Sample content with illustrative numbers, like the other seed projects.
// Added to the live list once by seedNewCollections (see APPENDS in content.ts); titles already there are skipped.

const u = (id: string, w = 1000) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`;

type Story = {
  challenge: string;
  strategy: string[];
  drives: string[];
  impact: [string, string][];
  result: string;
};

const write = ({ challenge, strategy, drives, impact, result }: Story) =>
  [
    'The Challenge',
    challenge,
    '',
    'The Strategy',
    strategy.join('\n\n'),
    '',
    'The content was built to drive:',
    ...drives.map((point) => `• ${point}`),
    '',
    'The Impact',
    impact.map(([stat, label]) => `${stat}\n${label}`).join('\n\n'),
    '',
    'The Result',
    result,
  ].join('\n');

export const portfolioAdditions: Record<string, unknown>[] = [
  // ── Tech ──
  {
    title: 'Lumen AI',
    category: 'Tech',
    result: '+186% app installs • 32% lower CPI',
    image: u('photo-1593642632823-8f785ba67e45'),
    detail: write({
      challenge:
        'Lumen AI, an AI writing assistant, had a product people loved once they tried it, but its ads explained features instead of showing the magic. Installs were expensive and most viewers scrolled past before the product appeared on screen.',
      strategy: [
        'We rebuilt the creative around one idea: show the before and after in the first three seconds. Every ad opened on a messy draft and cut straight to the polished result.',
        'We paired screen-recorded demos with student and freelancer creators who used Lumen in their real work, then tested hooks across Meta and YouTube Shorts on small budgets before scaling the winners.',
      ],
      drives: ['Instant understanding of the product', 'Trust through real creator workflows', 'Lower cost per install', 'A steady pipeline of fresh hooks'],
      impact: [
        ['+186%', 'App installs in 60 days'],
        ['32%', 'Lower cost per install'],
        ['1.2M+', 'Views across demo-led ads'],
      ],
      result:
        'By leading with the outcome instead of the feature list, Lumen AI turned a hard-to-explain product into a three-second story, and scaled installs while paying less for each one.',
    }),
  },
  {
    title: 'Fintrail',
    category: 'Tech',
    result: '48K+ sign-ups • 41% lower CPL',
    image: u('photo-1511707171634-5f897ff02aa9'),
    detail: write({
      challenge:
        'Fintrail, a personal finance app for young earners, was competing with banks and big fintech brands for attention. Its ads looked like every other finance ad, and sign-ups stalled once the launch buzz faded.',
      strategy: [
        'We moved the conversation away from features and towards money moments people actually feel: the salary day spend, the forgotten subscription, the first SIP.',
        'Finance and lifestyle creators filmed honest "my money in a month" stories using the app. We turned the best moments into short-form ads and rebuilt the landing page so the first screen matched the promise of the ad.',
      ],
      drives: ['Relatable, money-moment storytelling', 'Credibility through finance creators', 'Faster, cleaner sign-up flow', 'Lower cost per lead'],
      impact: [
        ['48K+', 'New sign-ups in one quarter'],
        ['41%', 'Lower cost per lead'],
        ['2.7x', 'Higher landing page conversion'],
      ],
      result:
        'Fintrail stopped sounding like a bank and started sounding like a friend who is good with money. The result was a cheaper, steadier flow of sign-ups that kept growing after launch.',
    }),
  },
  {
    title: 'Gridline HR',
    category: 'Tech',
    result: '3.4x pipeline • 52% lower CPL',
    image: u('photo-1517694712202-14dd9538aa97'),
    detail: write({
      challenge:
        'Gridline HR, a payroll and HR SaaS for growing teams, was spending heavily on search but most leads were too small or not ready to buy. The sales team was busy, yet the pipeline was not growing.',
      strategy: [
        'We mapped the product to the three pains HR heads care about most: payroll errors, compliance stress and manual onboarding. Each pain got its own message, ad set and landing page.',
        'On LinkedIn and Meta we ran short demo videos and founder-led explainers, and connected the CRM to ad spend so we optimised for qualified demos instead of form fills.',
      ],
      drives: ['Pain-led messaging by persona', 'Demo-first video creative', 'Qualified, sales-ready leads', 'Spend tracked to real pipeline'],
      impact: [
        ['3.4x', 'Growth in qualified pipeline'],
        ['52%', 'Lower cost per qualified lead'],
        ['+64%', 'Demo-to-trial conversion'],
      ],
      result:
        'By tracking spend all the way to pipeline, Gridline HR stopped paying for leads that never closed. The budget moved to the messages that brought real buyers, and the sales calendar filled with the right meetings.',
    }),
  },
  {
    title: 'Axion Labs',
    category: 'Tech',
    result: '+58% demo requests • 2.2M impressions',
    image: u('photo-1581091226825-a6a2a5aee158'),
    detail: write({
      challenge:
        'Axion Labs builds automation hardware for small factories. The technology was strong, but buyers found it hard to picture on their own shop floor, and the brand was almost unknown outside trade shows.',
      strategy: [
        'We filmed the machines working inside real customer units and cut the footage into short "problem to solved" stories: the manual step, the Axion fix and the time saved.',
        'Engineers on the team became the faces of the brand, explaining the product in plain language. We ran the content on LinkedIn and YouTube to plant owners and operations heads, with retargeting that pushed viewers towards a live demo.',
      ],
      drives: ['Real factory proof', 'Clear, engineer-led explanations', 'Awareness beyond trade shows', 'More live demo bookings'],
      impact: [
        ['+58%', 'Demo requests'],
        ['2.2M', 'Impressions among target buyers'],
        ['3x', 'Website visits from manufacturing regions'],
      ],
      result:
        'Showing the hardware solving real problems made a complex product easy to understand. Axion Labs went from a trade-show name to a brand factory owners recognised and reached out to.',
    }),
  },

  // ── Food ──
  {
    title: 'Crumb & Co',
    category: 'Food',
    result: '+88% festive orders • 3.5x ROAS',
    image: u('photo-1565958011703-44f9829ba187'),
    detail: write({
      challenge:
        'Crumb & Co, a premium bakery with cloud kitchens across two cities, sold out on weekends but struggled to fill orders during the week. Festive season was coming, and its ads looked like every other cake page.',
      strategy: [
        'We shot slow, close-up, sound-led videos of the cakes being sliced, filled and finished, the kind of content that makes people hungry mid-scroll.',
        'Ahead of the festive season we built gifting bundles, pre-order offers and city-wise delivery messaging, then ran them on Meta and Instagram with local food creators who ordered, unboxed and tasted on camera.',
      ],
      drives: ['Craving-first visual content', 'Festive gifting and pre-orders', 'Weekday order demand', 'Local creator trust'],
      impact: [
        ['+88%', 'Festive season orders'],
        ['3.5x', 'Return on ad spend'],
        ['+46%', 'Weekday orders'],
      ],
      result:
        'Appetite-first content and sharper offers turned Crumb & Co from a weekend treat into an everyday gifting choice, and its biggest season became its most profitable one.',
    }),
  },
  {
    title: 'Smoke Yard',
    category: 'Food',
    result: '+64% table bookings • 2.1M reach',
    image: u('photo-1555939594-58d7cb561ad1'),
    detail: write({
      challenge:
        'Smoke Yard, a barbecue and grill restaurant, had loyal regulars but very little visibility with new diners. Weeknight tables sat empty and the Instagram page had not grown in months.',
      strategy: [
        'We turned the grill into the hero: flames, sizzling skewers and platters landing on the table, filmed for Reels with real sound.',
        'Food creators were invited for tasting nights and posted their honest reactions. We backed the best content with location-targeted ads and a simple "book a table" flow with weeknight offers.',
      ],
      drives: ['Discovery among new diners', 'Weeknight table bookings', 'Instagram growth', 'Word of mouth through creators'],
      impact: [
        ['+64%', 'Table bookings'],
        ['2.1M', 'People reached in the city'],
        ['+18K', 'New Instagram followers'],
      ],
      result:
        'By letting the food do the talking, Smoke Yard became a place people planned to visit, not just walked past, and weeknights stopped being the quiet part of the week.',
    }),
  },
  {
    title: 'Dough Republic',
    category: 'Food',
    result: '+120% online orders • 33% lower CPA',
    image: u('photo-1513104890138-7c749659a591'),
    detail: write({
      challenge:
        'Dough Republic, a wood-fired pizza brand, relied almost fully on aggregator apps. Commissions were eating margins, and its own ordering website barely got any traffic.',
      strategy: [
        'We built a direct-ordering push: cheese-pull and oven-fresh videos, a first-order offer only on the website and clear messaging on delivery time.',
        'The ordering page was simplified to three taps, and ads were targeted to the delivery radius of each outlet, with spend shifted daily towards the hours and areas that ordered most.',
      ],
      drives: ['Direct orders over aggregators', 'Craving-led short-form video', 'Faster ordering experience', 'Better margins on every order'],
      impact: [
        ['+120%', 'Direct online orders'],
        ['33%', 'Lower cost per order'],
        ['22%', 'Of all orders moved to the website'],
      ],
      result:
        'Dough Republic built its own ordering channel without giving up its app presence. More orders now come in directly, and each of them keeps more of the margin.',
    }),
  },
  {
    title: 'Brew Lab Coffee',
    category: 'Food',
    result: '4.2x ROAS • +70% subscriptions',
    image: u('photo-1495474472287-4d71bcdd2085'),
    detail: write({
      challenge:
        'Brew Lab Coffee sells specialty beans online. First orders were steady, but most customers never came back, which made paid ads hard to justify.',
      strategy: [
        'We built the brand story around the ritual of making coffee at home, with creators showing their morning brews and simple recipes using Brew Lab beans.',
        'A subscribe-and-save offer was placed at the centre of every ad and product page, and email and WhatsApp flows reminded buyers before their beans ran out.',
      ],
      drives: ['Coffee-ritual storytelling', 'Subscription sign-ups', 'Repeat purchases', 'Profitable paid growth'],
      impact: [
        ['4.2x', 'Return on ad spend'],
        ['+70%', 'Active subscriptions'],
        ['+38%', 'Repeat purchase rate'],
      ],
      result:
        'By selling the ritual instead of just the beans, Brew Lab Coffee turned one-time buyers into subscribers, and every new customer became worth far more than the first order.',
    }),
  },

  // ── Fashion ──
  {
    title: 'Rogue Leather',
    category: 'Fashion',
    result: '4.0x ROAS • +112% CTR',
    image: u('photo-1487222477894-8943e31ef7b2'),
    detail: write({
      challenge:
        'Rogue Leather makes premium jackets for men. The product was strong, but the price meant people needed more convincing, and its catalogue ads were not stopping anyone.',
      strategy: [
        'We built a bold street-style look for the brand and shot lookbooks and short videos in the city, showing how each jacket fits, moves and ages.',
        'Menswear creators styled the jackets three ways each. We used their content in prospecting ads and ran dynamic catalogue retargeting with care and quality details to close the sale.',
      ],
      drives: ['A strong brand look', 'Fit and quality proof', 'Confidence at a premium price', 'Higher click-through and sales'],
      impact: [
        ['4.0x', 'Return on ad spend'],
        ['+112%', 'Click-through rate'],
        ['+35%', 'Average order value'],
      ],
      result:
        'Rogue Leather now looks as premium online as its jackets feel in hand, and shoppers are buying at full price with more confidence.',
    }),
  },
  {
    title: 'Kaia Studio',
    category: 'Fashion',
    result: '180+ creators • 12M+ reach',
    image: u('photo-1539109136881-3be0616acf4b'),
    detail: write({
      challenge:
        'Kaia Studio was launching its first winter outerwear collection. The brand was known in a small circle, and the launch needed to reach far beyond its existing followers in a few weeks.',
      strategy: [
        'We ran a multi-creator launch, activating 180+ fashion and travel creators across cities to style the collection in their own way.',
        'Content went live in planned waves around the drop date, so the feed stayed full of fresh looks. The best-performing creator posts were then boosted as ads to scale reach and drive sales.',
      ],
      drives: ['Launch buzz at scale', 'Styling ideas across body types', 'Social proof and FOMO', 'Sales during the drop window'],
      impact: [
        ['180+', 'Creators activated'],
        ['12M+', 'People reached'],
        ['68%', 'Of the collection sold in the first month'],
      ],
      result:
        'Kaia Studio’s first outerwear drop felt like an event, not a product listing. The collection reached millions, and most of it sold within weeks.',
    }),
  },
  {
    title: 'Linen Lore',
    category: 'Fashion',
    result: '+92% repeat buyers • 3.3x ROAS',
    image: u('photo-1558769132-cb1aea458c5e'),
    detail: write({
      challenge:
        'Linen Lore makes sustainable everyday basics. Customers loved the fabric, but most only bought once, and the "sustainable" message was getting lost among many similar brands.',
      strategy: [
        'We made the fabric the story: close-up textures, wash-and-wear tests and honest notes on how each piece is made.',
        'Creators built capsule wardrobes with Linen Lore pieces, and we ran "complete the look" retargeting and post-purchase flows that suggested the next piece based on the first one.',
      ],
      drives: ['Clear sustainability proof', 'Capsule wardrobe ideas', 'Second and third purchases', 'Profitable paid growth'],
      impact: [
        ['+92%', 'Repeat buyers'],
        ['3.3x', 'Return on ad spend'],
        ['+41%', 'Items per order'],
      ],
      result:
        'By showing what makes the fabric different and how the pieces work together, Linen Lore turned first-time shoppers into loyal customers who keep building their wardrobe with the brand.',
    }),
  },
  {
    title: 'Urban Drift',
    category: 'Fashion',
    result: '6.5M views • +146% CTR',
    image: u('photo-1485968579580-b6d095142e6e'),
    detail: write({
      challenge:
        'Urban Drift is a streetwear label for Gen Z. Its ads looked too polished for the audience it wanted, and engagement on new drops kept falling.',
      strategy: [
        'We swapped studio shoots for raw, phone-shot street content: fit checks, outfit transitions and "what I wore this week" videos made with young creators.',
        'Every drop got a teaser, a reveal and a restock moment. We tested trends and audio fast and moved spend to whatever the audience reacted to most.',
      ],
      drives: ['Native, Gen Z content', 'Hype around every drop', 'Higher click-through', 'Community and repeat engagement'],
      impact: [
        ['6.5M', 'Video views'],
        ['+146%', 'Click-through rate'],
        ['3', 'Drops sold out in a season'],
      ],
      result:
        'Urban Drift started sounding like its audience instead of an ad. The content blended into the feed, and the drops turned into moments people waited for.',
    }),
  },

  // ── D2C ──
  {
    title: 'Solestory',
    category: 'D2C',
    result: '3.9x ROAS • +118% sales',
    image: u('photo-1560343090-f0409e92791a'),
    detail: write({
      challenge:
        'Solestory sells handcrafted shoes online. Shoppers were unsure about buying shoes without trying them, so many added to cart but very few completed the order.',
      strategy: [
        'We focused every piece of content on removing doubt: on-foot videos, size guides, walk tests and real reviews from buyers.',
        'The product pages were rebuilt with fit notes, easy exchange messaging and UGC videos, and remarketing ads answered the most common questions shoppers had.',
      ],
      drives: ['Confidence in fit and comfort', 'More completed checkouts', 'Trust through real buyers', 'Profitable scale'],
      impact: [
        ['3.9x', 'Return on ad spend'],
        ['+118%', 'Online sales'],
        ['-27%', 'Cart abandonment'],
      ],
      result:
        'By answering every doubt before it stopped the sale, Solestory turned browsers into buyers and grew sales while keeping ad spend efficient.',
    }),
  },
  {
    title: 'Pulsewear',
    category: 'D2C',
    result: '36% lower CPA • +94% revenue',
    image: u('photo-1546868871-7041f2a55e12'),
    detail: write({
      challenge:
        'Pulsewear sells affordable smartwatches in a crowded category. Ads leaned on specs and discounts, the cost per sale kept rising and the brand had no clear identity.',
      strategy: [
        'We built the brand around everyday life, showing the watch at the gym, in meetings and on morning runs, with creators who actually wore it for a month.',
        'We set target CPA from real margins, launched a weekly creative testing system and fixed the product page so the key features and reviews were visible without scrolling.',
      ],
      drives: ['A clear lifestyle identity', 'Lower cost per sale', 'Weekly creative refresh', 'Higher product page conversion'],
      impact: [
        ['36%', 'Lower cost per acquisition'],
        ['+94%', 'Revenue in two quarters'],
        ['40+', 'Ad creatives tested every month'],
      ],
      result:
        'Pulsewear stopped competing only on price and started standing for something. Sales grew faster than spend, and the brand finally had a look and voice of its own.',
    }),
  },
  {
    title: 'Packwell',
    category: 'D2C',
    result: '+155% sales • 4.2x ROAS',
    image: u('photo-1553062407-98eeb64c6a62'),
    detail: write({
      challenge:
        'Packwell makes everyday backpacks for students and office-goers. Sales peaked only around back-to-school season and dropped sharply for the rest of the year.',
      strategy: [
        'We built use-case content for every audience: the commuter, the student, the weekend traveller, each with its own creator and ad set.',
        'Product demos showed what fits inside, how the bag carries and how it handles rain. We added bundles and a gifting angle so the brand had reasons to sell all year.',
      ],
      drives: ['Year-round demand', 'Clear product demos', 'New audiences beyond students', 'Higher order values'],
      impact: [
        ['+155%', 'Sales year on year'],
        ['4.2x', 'Return on ad spend'],
        ['+29%', 'Average order value'],
      ],
      result:
        'Packwell is no longer a seasonal brand. With content for every use case, sales now hold steady through the year and peak even higher in season.',
    }),
  },
  {
    title: 'Sipwell',
    category: 'D2C',
    result: '4.6x ROAS • 28% lower CAC',
    image: u('photo-1602143407151-7111542de6e8'),
    detail: write({
      challenge:
        'Sipwell sells insulated steel bottles. The product looked simple in photos, so shoppers could not see why it cost more than a regular bottle.',
      strategy: [
        'We showed the proof instead of claiming it: ice that lasts all day, tea still hot hours later and drop tests on real floors.',
        'Fitness, travel and office creators carried the bottle through their day. We ran the best demos as ads, added colour bundles and launched a gifting campaign for the festive season.',
      ],
      drives: ['Visible proof of quality', 'Justified premium price', 'Lower customer acquisition cost', 'Bundle and gifting sales'],
      impact: [
        ['4.6x', 'Return on ad spend'],
        ['28%', 'Lower customer acquisition cost'],
        ['+52%', 'Bundle orders'],
      ],
      result:
        'Once people could see the difference, the price made sense. Sipwell grew profitably and became a go-to gifting choice in its category.',
    }),
  },

  // ── Beauty ──
  {
    title: 'Petal & Pore',
    category: 'Beauty',
    result: '3.7x ROAS • +80% repeat orders',
    image: u('photo-1619451334792-150fd785ee74'),
    detail: write({
      challenge:
        'Petal & Pore, a gentle skincare brand for sensitive skin, had loyal fans but was hard to discover. Its ads felt generic, and new customers were costly to win.',
      strategy: [
        'We built content around real skin: creators with sensitive skin, redness and breakouts tried the products and shared honest 30-day results.',
        'We tested texture, routine and before-and-after hooks against each other, kept only the winners and added a starter kit offer so new customers could try the full routine.',
      ],
      drives: ['Trust through real skin results', 'Discovery among new customers', 'Starter kit trials', 'Repeat orders'],
      impact: [
        ['3.7x', 'Return on ad spend'],
        ['+80%', 'Repeat orders'],
        ['4.5M', 'Views on creator routines'],
      ],
      result:
        'Honest, real-skin content made Petal & Pore believable to people who had been let down before, and the starter kit turned them into regular customers.',
    }),
  },
  {
    title: 'Kesar Skin',
    category: 'Beauty',
    result: '+210% serum sales • 9M+ views',
    image: u('photo-1576426863848-c21f53c60b19'),
    detail: write({
      challenge:
        'Kesar Skin launched a saffron glow serum in a market full of vitamin C and niacinamide products. It needed to stand out quickly and explain why saffron was worth trying.',
      strategy: [
        'We built the launch around the heritage of saffron in Indian skincare, mixing ingredient stories with modern routine videos.',
        'Beauty creators across skin tones filmed glow checks, layering routines and first impressions. The strongest videos were scaled as ads, with a launch offer for first-time buyers.',
      ],
      drives: ['A clear ingredient story', 'Launch buzz across creators', 'First-time trials', 'Sales of the hero product'],
      impact: [
        ['+210%', 'Serum sales'],
        ['9M+', 'Video views'],
        ['120+', 'Creators across skin tones'],
      ],
      result:
        'Kesar Skin gave saffron a modern story and made its serum the product people were talking about, and buying, during its launch.',
    }),
  },
  {
    title: 'Clean Slate',
    category: 'Beauty',
    result: '42% lower CAC • 250+ creators',
    image: u('photo-1631729371254-42c2892f0e6e'),
    detail: write({
      challenge:
        'Clean Slate is a minimal, fragrance-free skincare line. Its clean-beauty message sounded like every other brand, and customer acquisition costs kept climbing.',
      strategy: [
        'We activated 250+ micro-creators who already followed simple skincare routines, so the content felt native to their audiences.',
        'Their videos fed a weekly creative testing loop on Meta, and the winners were scaled with ingredient-first landing pages that explained exactly what was, and was not, inside each product.',
      ],
      drives: ['Authentic micro-creator content', 'A constant flow of fresh creatives', 'Clear ingredient transparency', 'Lower acquisition cost'],
      impact: [
        ['42%', 'Lower customer acquisition cost'],
        ['250+', 'Micro-creators activated'],
        ['+67%', 'New customers per month'],
      ],
      result:
        'With hundreds of real voices behind it, Clean Slate’s message finally felt believable. The brand grew faster and paid less for every new customer.',
    }),
  },
  {
    title: 'Silk Botanica',
    category: 'Beauty',
    result: '5.4M views • 3.2x ROAS',
    image: u('photo-1620916566398-39f1143ab7be'),
    detail: write({
      challenge:
        'Silk Botanica sells botanical body care. Body lotions are an everyday purchase, and the brand needed a reason for shoppers to switch from the products they already used.',
      strategy: [
        'We built a sensory content world: texture swatches, slow application shots and self-care routines that made the products feel like a small luxury.',
        'Creators shared their evening wind-down routines with Silk Botanica, and we paired the content with gift sets and bundle offers for festive and wedding seasons.',
      ],
      drives: ['A premium, sensory brand feel', 'Reasons to switch', 'Gift set and bundle sales', 'Profitable paid growth'],
      impact: [
        ['5.4M', 'Video views'],
        ['3.2x', 'Return on ad spend'],
        ['+58%', 'Gift set sales'],
      ],
      result:
        'Silk Botanica turned an everyday product into a small daily luxury, and gave shoppers a reason to switch, gift it and keep coming back.',
    }),
  },
];
