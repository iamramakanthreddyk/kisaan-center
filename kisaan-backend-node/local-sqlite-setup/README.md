# KisaanCenter Local SQLite Setup

This folder contains scripts to set up a local SQLite database for development and testing.

## Files
- `schema.sqlite.sql`: SQLite-compatible schema based on the production PostgreSQL schema.
- `seed-data.sqlite.sql`: Basic seed data for categories, plans, users, shops, and products.

## How to Use

1. **Install SQLite (if not already installed):**
   - Windows: Download from https://www.sqlite.org/download.html
   - Or use a package manager (e.g., `choco install sqlite`)

2. **Create the database and load schema/data:**
   Open a terminal in this folder and run:
   ```sh
   sqlite3 kisaan_local.db < schema.sqlite.sql
   sqlite3 kisaan_local.db < seed-data.sqlite.sql
   ```

3. **Inspect the database:**
   You can use the `sqlite3` CLI or a GUI tool (e.g., DB Browser for SQLite) to view and modify data.

4. **Connect your backend (Node.js) to this SQLite DB for local development:**
   - Update your backend config to use `kisaan_local.db` as the database file.

## Notes
- This schema is simplified for SQLite and omits some PostgreSQL-specific features (enums, sequences, advanced constraints).
- Add more seed data as needed for your development workflows.
