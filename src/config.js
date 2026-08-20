// ============================================================
// CONSTANTS
// ============================================================

const PREFIX = "n";

// ============================================================
// ADMIN
// ============================================================

const ADMIN_ID =
    process.env.ADMIN_ID || "";

// ============================================================
// COLORS
// ============================================================

const COLORS = {

    green: 0x78C850,
    dendro: 0x6FBF4A,
    darkGreen: 0x31572C,

    water: 0x4EA5D9,
    gold: 0xE7B84B,

    purple: 0x9B72CF,
    pink: 0xE58AB5,

    red: 0xD9534F,
    gray: 0x687078,
    white: 0xF5F5F5
};

// ============================================================
// FARM
// ============================================================

const MAX_WATER = 100;

const DEFAULT_PLOTS = 5;

// ============================================================
// SHOP CONFIG
// ============================================================

const SHOP_SIZE = 5;

const SHOP_REFRESH_MS =
    30 * 60 * 1000;

const SHOP_REFRESH_COST = 50;

const FREE_SHOP_REFRESHES = 3;

const MAX_BUY_QUANTITY = 999;

// ============================================================
// BREEDING CONFIG
// ============================================================

const BREED_COST = 100;

const BREED_COOLDOWN_MS =
    5 * 60 * 1000;

const BREED_MAX_PARENT_LEVEL = 1;

// ============================================================
// EXPORT
// ============================================================

module.exports = {

    PREFIX,

    ADMIN_ID,

    COLORS,

    MAX_WATER,
    DEFAULT_PLOTS,

    SHOP_SIZE,
    SHOP_REFRESH_MS,
    SHOP_REFRESH_COST,
    FREE_SHOP_REFRESHES,
    MAX_BUY_QUANTITY,

    BREED_COST,
    BREED_COOLDOWN_MS,
    BREED_MAX_PARENT_LEVEL
};