# CodeAlpha_EcommerceStore

**Loomwell** is a full-stack clothing store built for the **CodeAlpha Full Stack Development Internship – Task 1**.

Shoppers can browse a clothing catalog, view product details, manage a cart, register / log in, and place orders that are stored in a database and shown in an order history.

**Stack:** Vanilla HTML/CSS/JS frontend · Node.js + Express REST API · SQLite database · JWT authentication.

---

## Features

- **Landing page** funnelling to a dedicated shop, with featured products and customer testimonials
- **Dedicated Shop page** with rich filters: category, price range, minimum rating, in-stock-only, search, and sorting
- **Product details page** with quantity selector, stock status, and related items
- **Shopping cart** (add / update quantity / remove) with live totals and a free-shipping threshold
- **Guest checkout** — buy without an account, or log in for faster checkout and order history
- **User registration & login** with hashed passwords (bcrypt) and JWT sessions
- **Order processing** — checkout validates stock, computes totals on the server, decrements inventory, and saves the order
- **Order history** for logged-in users
- Responsive UI with a **light / dark theme toggle** (light by default), subtle scroll animations, loading skeletons, and empty / error states

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

### Demo account

A demo account is created automatically:

```
Email:    demo@loomwell.co
Password: demo1234
```

Or create your own account from the **Create account** page.

---

## Project structure

```
CodeAlpha_EcommerceStore/
├── server.js               # Express app entry point
├── src/
│   ├── db.js               # SQLite connection + schema
│   ├── seed.js             # Catalog + demo-account seeding
│   ├── auth.js             # JWT signing + auth middleware
│   └── routes/
│       ├── auth.js         # register / login / me
│       ├── products.js     # list / detail / categories
│       └── orders.js       # create / list / get orders
├── public/                 # Frontend (served statically)
│   ├── index.html          # Landing page
│   ├── shop.html           # Shop with filters
│   ├── product.html        # Product detail
│   ├── cart.html           # Cart
│   ├── checkout.html       # Checkout (guest or signed in)
│   ├── login.html          # Login
│   ├── register.html       # Register
│   ├── orders.html         # Order history
│   ├── css/styles.css      # Design system
│   ├── js/                 # api, cart, ui + per-page scripts
│   └── images/products/    # Product photography
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

### Orders

| Method | Endpoint      | Auth          | Body                                           | Description                          |
| ------ | ------------- | ------------- | ---------------------------------------------- | ------------------------------------ |
| POST   | `/orders`     | Optional      | `{ items: [{productId, quantity}], shipping }` | Place an order (guest or signed in)  |
| GET    | `/orders`     | Required      | —                                              | Current user's orders                |
| GET    | `/orders/:id` | Required      | —                                              | A single order                       |

Guest orders are stored with a null `user_id`; signed-in orders are linked to the account and appear in order history.

---

## Security notes

- Passwords are hashed with **bcrypt**; the plain password is never stored.
- Order totals are recomputed **server-side** from database prices — client-submitted prices are ignored.
- Stock is validated and decremented inside a single database **transaction**.
- Protected routes require a valid **JWT**.

---

## License

MIT
