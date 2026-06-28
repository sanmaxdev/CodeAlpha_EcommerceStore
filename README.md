# CodeAlpha_EcommerceStore

**Loomwell** is a full-stack clothing store built for the **CodeAlpha Full Stack Development Internship – Task 1**.

Shoppers can browse a clothing catalog, view product details, manage a cart, register / log in, and place orders that are stored in a database and shown in an order history.

**Stack:** Vanilla HTML/CSS/JS frontend · Node.js + Express REST API · SQLite database · JWT authentication.

---

## Features

### Storefront
- **Landing page** with a lifestyle hero slideshow, featured products, lookbook, and testimonials
- **Dedicated Shop page** with rich filters: category, price range, minimum rating, in-stock-only, search, and sorting
- **Product details page** with quantity selector, stock status, related items, and **verified-buyer reviews** (only customers who purchased the item can review it; one review each, ratings drive the product's star rating)
- **Shopping cart** (add / update quantity / remove) with live totals and a free-shipping threshold
- **Guest checkout** — buy without an account, or log in for faster checkout and order history
- **PayPal and Stripe** payment at checkout (choose either), with a built-in "Place order" fallback; plus user registration & login (bcrypt + JWT)
- **Order processing** — validates stock, computes totals on the server, decrements inventory, saves the order
- **Order history** for logged-in users
- **Policy pages** (privacy, terms, shipping & returns) and a contact page
- Responsive UI with a **light / dark theme toggle**, subtle animations, and loading / empty / error states

### Admin panel (`/admin.html`)
- **Dashboard** — products, orders, revenue, customers, and low-stock at a glance, plus recent orders
- **Product management** — create, edit, and delete products, with image upload or URL
- **Order management** — view every order and update its status (pending / paid / shipped / delivered / cancelled)
- **Role-based access** — admin-only, protected by JWT + an `is_admin` flag

---

## Tech stack

| Layer     | Technology                                    |
| --------- | --------------------------------------------- |
| Frontend  | HTML, CSS, vanilla JavaScript (no framework)  |
| Backend   | Node.js, Express.js                           |
| Database  | SQLite (via `better-sqlite3`)                 |
| Auth      | JSON Web Tokens (`jsonwebtoken`) + `bcryptjs` |

The database is created **and seeded automatically** on first run — there's no database server to install. Product images are bundled in the repository under `public/images/products`, so the store works fully offline.

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer

### Install & run

```bash
npm install
npm start
```

Then open **http://localhost:4000**.

> Optional: copy `.env.example` to `.env` to change the port or JWT secret. The app runs fine without it.

### Demo accounts

Created automatically on first run:

```
Shopper:  demo@loomwell.co  / demo1234
Admin:    admin@loomwell.co / admin1234
```

Log in as the admin and open **/admin.html** (an "Admin" link also appears in the header). Or create your own shopper account from the **Create account** page.

### Enabling payments (optional)

The store works out of the box with a "Place order" checkout. Configure either or both providers in `.env` (copy from `.env.example`) and the checkout shows a payment-method selector automatically.

**PayPal** — create Sandbox REST credentials at the [PayPal Developer dashboard](https://developer.paypal.com/dashboard/applications/sandbox):

```
PAYPAL_CLIENT_ID=your-client-id
PAYPAL_CLIENT_SECRET=your-client-secret
PAYPAL_MODE=sandbox        # or "live"
```

Orders are created and captured server-side via the PayPal REST API.

**Stripe** — create test API keys at the [Stripe dashboard](https://dashboard.stripe.com/test/apikeys):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # optional, for the webhook below
```

Stripe uses hosted **Checkout**: the server creates a Checkout Session, the customer pays on Stripe, and the order is finalised on return (idempotently). For production, also point a Stripe webhook at `POST /api/payments/stripe/webhook` (event `checkout.session.completed`) so orders are recorded even if the customer closes the tab.

Restart the server after editing `.env`.

---

## Project structure

```
CodeAlpha_EcommerceStore/
├── server.js               # Express app entry point
├── src/
│   ├── db.js               # SQLite connection + schema + migrations
│   ├── seed.js             # Catalog + demo/admin seeding
│   ├── auth.js             # JWT + auth/admin middleware
│   ├── orders-service.js   # Shared order validation + creation
│   ├── lib/paypal.js       # PayPal REST helper (token/create/capture)
│   ├── lib/stripe.js       # Stripe client helper
│   └── routes/
│       ├── auth.js         # register / login / me
│       ├── products.js     # list / detail / categories
│       ├── orders.js       # create / list / get orders
│       ├── admin.js        # dashboard, product CRUD, order mgmt, upload
│       └── payments.js     # PayPal config / create / capture
├── public/                 # Frontend (served statically)
│   ├── index.html          # Landing page
│   ├── shop.html           # Shop with filters
│   ├── product.html        # Product detail
│   ├── cart.html           # Cart
│   ├── checkout.html       # Checkout (PayPal or direct)
│   ├── login.html / register.html / orders.html
│   ├── contact.html, privacy.html, terms.html, shipping-returns.html
│   ├── admin.html          # Admin panel
│   ├── css/styles.css      # Design system
│   ├── js/                 # api, cart, ui, admin + per-page scripts
│   └── images/             # Product + lifestyle photography
├── .env.example
└── package.json
```

---

## API reference

Base URL: `http://localhost:4000/api`

### Auth

| Method | Endpoint         | Body                        | Description                 |
| ------ | ---------------- | --------------------------- | --------------------------- |
| POST   | `/auth/register` | `{ name, email, password }` | Create account, returns JWT |
| POST   | `/auth/login`    | `{ email, password }`       | Log in, returns JWT         |
| GET    | `/auth/me`       | — *(Bearer token)*          | Current user                |

### Products

| Method | Endpoint               | Description                                                     |
| ------ | ---------------------- | -------------------------------------------------------------- |
| GET    | `/products`            | List products. Query: `category`, `search`, `sort`, `featured` |
| GET    | `/products/categories` | Distinct categories with counts                                |
| GET    | `/products/:id`        | Single product + related items                                 |
| GET    | `/products/:id/reviews`| Reviews + summary (+ the caller's review eligibility)           |
| POST   | `/products/:id/reviews`| Add a review *(auth; verified buyers only, one per product)*    |

### Orders

| Method | Endpoint      | Auth          | Body                                           | Description                          |
| ------ | ------------- | ------------- | ---------------------------------------------- | ------------------------------------ |
| POST   | `/orders`     | Optional      | `{ items: [{productId, quantity}], shipping }` | Place an order (guest or signed in)  |
| GET    | `/orders`     | Required      | —                                              | Current user's orders                |
| GET    | `/orders/:id` | Required      | —                                              | A single order                       |

Guest orders are stored with a null `user_id`; signed-in orders are linked to the account and appear in order history.

### Payments

| Method | Endpoint                          | Description                                  |
| ------ | --------------------------------- | -------------------------------------------- |
| GET    | `/payments/config`                | Which providers are enabled (PayPal/Stripe)  |
| POST   | `/payments/paypal/create-order`   | Create a PayPal order for the cart           |
| POST   | `/payments/paypal/capture-order`  | Capture payment and store the local order    |
| POST   | `/payments/stripe/create-session` | Create a Stripe Checkout Session             |
| POST   | `/payments/stripe/confirm`        | Finalise the order after a Stripe redirect   |
| POST   | `/payments/stripe/webhook`        | Stripe webhook (checkout.session.completed)  |

### Admin *(require an admin `Authorization: Bearer <token>`)*

| Method | Endpoint                      | Description                          |
| ------ | ----------------------------- | ------------------------------------ |
| GET    | `/admin/stats`                | Dashboard metrics + recent orders    |
| GET    | `/admin/products`             | All products                         |
| POST   | `/admin/products`             | Create a product                     |
| PUT    | `/admin/products/:id`         | Update a product                     |
| DELETE | `/admin/products/:id`         | Delete a product                     |
| POST   | `/admin/upload`               | Upload a product image (multipart)   |
| GET    | `/admin/orders`               | All orders                           |
| PUT    | `/admin/orders/:id/status`    | Update an order's status             |

---

## Security notes

- Passwords are hashed with **bcrypt**; the plain password is never stored.
- Order totals are recomputed **server-side** from database prices — client-submitted prices are ignored.
- Stock is validated and decremented inside a single database **transaction**.
- Protected routes require a valid **JWT**.

---

## License

MIT
