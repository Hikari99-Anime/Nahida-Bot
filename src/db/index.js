const Database = require("better-sqlite3");
const path = require("path");

// ============================================================
// DATABASE
// ============================================================

const dbPath =
    path.join(
        __dirname,
        "..",
        "..",
        "nahidafarm.sqlite"
    );

const db =
    new Database(dbPath);

db.pragma(
    "journal_mode = WAL"
);

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    mora INTEGER DEFAULT 1000,
    luck INTEGER DEFAULT 0,
    water INTEGER DEFAULT 100,
    farm_level INTEGER DEFAULT 1,
    farm_xp INTEGER DEFAULT 25,
    harvest_count INTEGER DEFAULT 0,
    bug_count INTEGER DEFAULT 0,
    created_at INTEGER,
    updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS inventory (
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    quantity INTEGER DEFAULT 0,
    PRIMARY KEY(user_id, item_id)
);

CREATE TABLE IF NOT EXISTS plots (
    user_id TEXT NOT NULL,
    plot_id INTEGER NOT NULL,
    plant_id TEXT,
    planted_at INTEGER,
    finish_at INTEGER,
    watered INTEGER DEFAULT 0,
    mutation TEXT,
    PRIMARY KEY(user_id, plot_id)
);

CREATE TABLE IF NOT EXISTS shop_state (
    user_id TEXT PRIMARY KEY,
    seed_ids TEXT NOT NULL,
    refreshed_at INTEGER NOT NULL,
    free_refreshes INTEGER DEFAULT 3,
    refresh_day TEXT
);

CREATE TABLE IF NOT EXISTS bred_plants (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    parent_a TEXT NOT NULL,
    parent_b TEXT NOT NULL,
    name TEXT NOT NULL,
    name_vi TEXT,
    emoji TEXT DEFAULT 'ðŸŒ±',
    growth_time INTEGER DEFAULT 60,
    yield_min INTEGER DEFAULT 1,
    yield_max INTEGER DEFAULT 1,
    water_cost INTEGER DEFAULT 10,
    sell_price INTEGER DEFAULT 5,
    rarity REAL DEFAULT 1,
    growth_gene REAL DEFAULT 1,
    yield_gene REAL DEFAULT 1,
    water_gene REAL DEFAULT 1,
    rarity_gene REAL DEFAULT 1,
    mutation_gene REAL DEFAULT 1,
    mutation_id TEXT,
    mutation_name TEXT,
    mutation_emoji TEXT,
    created_at INTEGER
);
`);

module.exports = {
    db
};

