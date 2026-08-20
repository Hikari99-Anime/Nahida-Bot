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

// ============================================================
// PRAGMA
// ============================================================

db.pragma(
    "journal_mode = WAL"
);

db.pragma(
    "foreign_keys = ON"
);

// ============================================================
// USERS
// ============================================================

db.exec(`

CREATE TABLE IF NOT EXISTS users (

    id TEXT PRIMARY KEY,

    username TEXT,

    level INTEGER DEFAULT 1,

    xp INTEGER DEFAULT 0,

    mora INTEGER DEFAULT 2000,

    luck INTEGER DEFAULT 0,

    water INTEGER DEFAULT 200,

    last_water_at INTEGER DEFAULT 0,

    farm_level INTEGER DEFAULT 1,

    farm_xp INTEGER DEFAULT 25,

    harvest_count INTEGER DEFAULT 0,

    bug_count INTEGER DEFAULT 0,

    created_at INTEGER,

    updated_at INTEGER

);

`);

// ============================================================
// INVENTORY
// ============================================================

db.exec(`

CREATE TABLE IF NOT EXISTS inventory (

    user_id TEXT NOT NULL,

    item_id TEXT NOT NULL,

    quantity INTEGER DEFAULT 0,

    PRIMARY KEY (
        user_id,
        item_id
    )

);

`);

// ============================================================
// PLOTS
// ============================================================

db.exec(`

CREATE TABLE IF NOT EXISTS plots (

    user_id TEXT NOT NULL,

    plot_id INTEGER NOT NULL,

    plant_id TEXT,

    planted_at INTEGER,

    finish_at INTEGER,

    watered INTEGER DEFAULT 0,

    mutation TEXT,

    PRIMARY KEY (
        user_id,
        plot_id
    )

);

`);

// ============================================================
// SHOP STATE
// ============================================================

db.exec(`

CREATE TABLE IF NOT EXISTS shop_state (

    user_id TEXT PRIMARY KEY,

    seed_ids TEXT NOT NULL,

    refreshed_at INTEGER NOT NULL,

    free_refreshes INTEGER DEFAULT 3,

    refresh_day TEXT

);

`);

// ============================================================
// BRED PLANTS
// ============================================================

db.exec(`

CREATE TABLE IF NOT EXISTS bred_plants (

    id TEXT PRIMARY KEY,

    user_id TEXT NOT NULL,

    parent_a TEXT NOT NULL,

    parent_b TEXT NOT NULL,

    name TEXT NOT NULL,

    name_vi TEXT,

    emoji TEXT DEFAULT '🌱',

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

// ============================================================
// MIGRATION
// ============================================================
//
// Database cũ có thể chưa có last_water_at.
// CREATE TABLE IF NOT EXISTS sẽ không tự thêm column,
// nên cần kiểm tra và ALTER TABLE.
//
// ============================================================

try {

    const columns =
        db.prepare(`
            PRAGMA table_info(users)
        `).all();

    const hasLastWaterAt =
        columns.some(
            column =>
                column.name ===
                "last_water_at"
        );

    if (!hasLastWaterAt) {

        db.exec(`
            ALTER TABLE users
            ADD COLUMN last_water_at INTEGER DEFAULT 0
        `);

        console.log(
            "[DB] ✅ Added users.last_water_at"
        );
    }

} catch (error) {

    console.error(
        "[DB] ❌ Migration error:",
        error
    );
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    db
};