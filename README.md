# 💸 Expenses Tracker

Personal expense tracking webapp. Built with React + Express + Vite + Recharts, same stack as [InvestmentTracker](https://github.com/xirver/InvestmentTracker).

## Features

- **Dashboard** — KPI cards (balance, monthly expenses, YTD cashflow), monthly income vs expenses bar chart, YTD expense breakdown by group (pie), current month breakdown by category (pie), account balance trend
- **Transactions** — filterable list by year/month/type/category, add/edit/delete via modal
- **Budget** — monthly budget vs actual per category with progress bars, editable in-app
- **Account Balance** — full ledger with running balance and balance-over-time chart

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, React Router, Recharts, Vite |
| Backend | Express.js (Node 20) |
| Auth | JWT + bcryptjs |
| Storage | JSON files per user (`data/{userId}/db.json`) |
| Deploy | Docker + Docker Compose |

## Development

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Start dev server (backend :3002, frontend :5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), register an account and start adding transactions.

### Import from Excel

If you have an existing `Expenses Tracker YYYY.xlsx` file in the root folder:

```bash
# Install xlsx parser (one-time)
npm install xlsx

# Import (run after registering your account in the app)
node import-excel.js <username>
```

The script reads the **Transactions** sheet, imports all rows, sets the starting account balance from **One-time Setup**, and imports monthly budgets from the **Budget** sheet. Already-imported transactions are skipped on re-run.

## Docker (NAS / Production)

### First deploy

```bash
git clone https://github.com/xirver/ExpensesTracker.git
cd ExpensesTracker
```

Edit `docker-compose.yml` and set a strong `JWT_SECRET`:

```yaml
environment:
  - JWT_SECRET=your-secret-string-here
```

Then:

```bash
docker compose up -d
```

App runs at `http://<NAS-IP>:3002`. Data is persisted in `./data/` (Docker volume mount).

### Update after code changes

```bash
git pull
docker compose up -d --build
```

### Backup

The entire `data/` folder is the database. Copy it to back up all users and transactions.

## Data Model

```
data/
├── users.json              # user registry
└── {userId}/
    └── db.json             # per-user data
        ├── transactions[]  # date, description, category, group, type, amount, account, vendor, tags
        ├── settings        # categories, categoryGroups, accounts, tags
        └── budgets         # { year: { category: [jan..dec] } }
```

Transaction types: `Expense` | `Income` | `Transfer`

Default categories: Housing, Grocery, Take-out, Restaurant, Utilities, Subscriptions, Transportation, Household, Clothing, Self Care, Travel & Entertainment, Big Purchases, Gift, Charity, Paycheck, Investment Income, Investment, Transfer

## Ports

| Service | Port |
|---------|------|
| Expenses Tracker | 3002 |
| InvestmentTracker | 3001 |
