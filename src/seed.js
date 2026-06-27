'use strict';

const bcrypt = require('bcryptjs');
const db = require('./db');

const img = (file) => `/images/products/${file}.webp`;

const PRODUCTS = [
  {
    name: 'Coastline Check Shirt',
    category: 'Shirts',
    price_cents: 6800,
    stock: 38,
    rating: 4.3,
    featured: 1,
    image: img('flannel-check-shirt'),
    description:
      'A brushed-cotton check shirt in blue and slate. Cut for an easy regular fit with a soft collar that sits well open or buttoned. The kind of shirt that works under a jacket or on its own.',
  },
  {
    name: 'Camden Plaid Overshirt',
    category: 'Shirts',
    price_cents: 8400,
    stock: 24,
    rating: 4.4,
    featured: 0,
    image: img('brushed-plaid-shirt'),
    description:
      'A heavier plaid overshirt you can wear as a light layer. Double chest pockets, corozo buttons, and a slightly longer hem so it stays put when you move.',
  },
  {
    name: 'Tattersall Cotton Shirt',
    category: 'Shirts',
    price_cents: 6200,
    stock: 50,
    rating: 4.1,
    featured: 0,
    image: img('tattersall-shirt'),
    description:
      'A classic tattersall check woven from long-staple cotton. Breathable, hard-wearing, and smart enough for the office without feeling stiff.',
  },
  {
    name: 'Breeze Short-Sleeve Shirt',
    category: 'Shirts',
    price_cents: 5400,
    stock: 2,
    rating: 3.9,
    featured: 0,
    image: img('camp-collar-shirt'),
    description:
      'A relaxed short-sleeve shirt in a lightweight check, made for warm days. Open camp collar and a boxy cut that drapes rather than clings.',
  },
  {
    name: 'Bluebell Day Dress',
    category: 'Dresses',
    price_cents: 9600,
    stock: 52,
    rating: 4.2,
    featured: 1,
    image: img('linen-day-dress'),
    description:
      'A breezy day dress in a soft cornflower blue. A gently fitted bodice flows into a full skirt that moves with you. Easy to dress up or down.',
  },
  {
    name: 'Ashfield Midi Dress',
    category: 'Dresses',
    price_cents: 11200,
    stock: 30,
    rating: 4.0,
    featured: 0,
    image: img('draped-midi-dress'),
    description:
      'A draped midi in heathered grey with a clean neckline and a skirt that falls just below the knee. Understated enough to wear anywhere.',
  },
  {
    name: 'Highland Tartan Dress',
    category: 'Dresses',
    price_cents: 12800,
    stock: 18,
    rating: 4.5,
    featured: 1,
    image: img('tartan-shift-dress'),
    description:
      'A tailored tartan dress with a structured shape and a timeless pattern. Lined for comfort and finished with a concealed back zip.',
  },
  {
    name: 'Noir Corset Skirt Set',
    category: 'Dresses',
    price_cents: 14800,
    stock: 12,
    rating: 4.6,
    featured: 0,
    image: img('corset-skirt-set'),
    description:
      'A two-piece set pairing a fitted corset top with a matching black skirt. Boned for shape and structure, made for evenings out.',
  },
  {
    name: 'Polka Tea Dress',
    category: 'Dresses',
    price_cents: 8800,
    stock: 6,
    rating: 4.8,
    featured: 0,
    image: img('pea-wrap-dress'),
    description:
      'A strapless tea dress in white with a red polka dot and a tied waist bow. A full, swishy skirt gives it a vintage feel that never dates.',
  },
  {
    name: 'Meadow Summer Dress',
    category: 'Dresses',
    price_cents: 7200,
    stock: 43,
    rating: 4.7,
    featured: 0,
    image: img('summer-tier-dress'),
    description:
      'A light, tiered summer dress that packs flat and shrugs off creases. Perfect for travel, markets, and long warm evenings.',
  },
  {
    name: 'Gilded Pointed Pump',
    category: 'Footwear',
    price_cents: 13800,
    stock: 26,
    rating: 4.3,
    featured: 1,
    image: img('gold-strap-heel'),
    description:
      'A pointed-toe pump in a soft gold finish with a comfortable mid heel and a lightly cushioned footbed. A quiet statement with everything.',
  },
  {
    name: 'Crimson Court Heel',
    category: 'Footwear',
    price_cents: 12400,
    stock: 7,
    rating: 4.1,
    featured: 0,
    image: img('crimson-court-heel'),
    description:
      'A classic court heel in deep crimson. Sleek, versatile, and built on a balanced heel you can actually walk in all evening.',
  },
  {
    name: 'Saddle Suede Loafer',
    category: 'Footwear',
    price_cents: 11600,
    stock: 34,
    rating: 4.0,
    featured: 0,
    image: img('suede-loafer'),
    description:
      'A soft suede loafer with a flexible sole and a hand-stitched apron. Slips on easily and only looks better with wear.',
  },
  {
    name: 'Acetate Sunglasses',
    category: 'Accessories',
    price_cents: 8600,
    stock: 60,
    rating: 4.4,
    featured: 0,
    image: img('acetate-sunglasses'),
    description:
      'A timeless acetate frame in gloss black with UV400 lenses. Lightweight, well balanced, and supplied with a hard case and cloth.',
  },
  {
    name: 'Ivory Faux-Leather Backpack',
    category: 'Accessories',
    price_cents: 9800,
    stock: 39,
    rating: 3.9,
    featured: 0,
    image: img('minimal-backpack'),
    description:
      'A clean-lined backpack in ivory faux leather with a padded laptop sleeve and a magnetic flap. Smart enough for work, roomy enough for the weekend.',
  },
  {
    name: 'Structured Leather Bag',
    category: 'Accessories',
    price_cents: 16400,
    stock: 11,
    rating: 4.5,
    featured: 1,
    image: img('structured-tote'),
    description:
      'A structured handbag in black leather with polished gold hardware and a buckle detail. Holds its shape and fits the everyday essentials.',
  },
];

function seed() {
  const productCount = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;

  if (productCount === 0) {
    const insert = db.prepare(`
      INSERT INTO products (name, slug, description, price_cents, category, image, stock, rating, featured)
      VALUES (@name, @slug, @description, @price_cents, @category, @image, @stock, @rating, @featured)
    `);
    const insertMany = db.transaction((rows) => {
      for (const p of rows) {
        const slug = p.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        insert.run({ ...p, slug });
      }
    });
    insertMany(PRODUCTS);
    console.log(`Seeded ${PRODUCTS.length} products.`);
  }

  const demoEmail = 'demo@loomwell.co';
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(demoEmail);
  if (!existing) {
    const hash = bcrypt.hashSync('demo1234', 10);
    db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(
      'Demo Shopper',
      demoEmail,
      hash
    );
    console.log(`Created demo account: ${demoEmail} / demo1234`);
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
