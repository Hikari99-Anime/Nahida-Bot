// ============================================================
// NAHIDA FARM - DATABASE.JS
// SQLite database
// Compatible with:
//   ./database/models.js
// ============================================================

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const plantDatabase = require("./plants");
// ============================================================
// DATABASE PATH
// ============================================================

const DATA_DIR = path.join(__dirname);

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
        recursive: true
    });
}

const DB_PATH = path.join(
    DATA_DIR,
    "nahida.sqlite"
);

// ============================================================
// OPEN DATABASE
// ============================================================

const db = new Database(DB_PATH);

// Performance / stability
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("synchronous = NORMAL");

// ============================================================
// CREATE TABLES
// ============================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        username TEXT NOT NULL,

        profile_level INTEGER NOT NULL DEFAULT 1,
        profile_xp INTEGER NOT NULL DEFAULT 0,

        garden_level INTEGER NOT NULL DEFAULT 1,
        garden_xp INTEGER NOT NULL DEFAULT 0,

        mora INTEGER NOT NULL DEFAULT 1000,

        total_plants INTEGER NOT NULL DEFAULT 0,
        total_harvests INTEGER NOT NULL DEFAULT 0,
        total_bugs_caught INTEGER NOT NULL DEFAULT 0,

        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gardens (
        user_id TEXT PRIMARY KEY,

        level INTEGER NOT NULL DEFAULT 1,

        slots INTEGER NOT NULL DEFAULT 5,
        unlocked_slots INTEGER NOT NULL DEFAULT 5,

        water INTEGER NOT NULL DEFAULT 100,
        fertilizer INTEGER NOT NULL DEFAULT 0,

        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,

        FOREIGN KEY(user_id)
            REFERENCES users(user_id)
            ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS inventory (
        user_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        amount INTEGER NOT NULL DEFAULT 0,

        PRIMARY KEY (
            user_id,
            item_id
        ),

        FOREIGN KEY(user_id)
            REFERENCES users(user_id)
            ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS plants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id TEXT NOT NULL,

        slot INTEGER NOT NULL,

        plant_id TEXT NOT NULL,
        plant_name TEXT,

        planted_at INTEGER NOT NULL,
        finish_at INTEGER NOT NULL,

        watered INTEGER NOT NULL DEFAULT 0,
        bugs INTEGER NOT NULL DEFAULT 0,

        growth INTEGER NOT NULL DEFAULT 0,
        yield_amount INTEGER NOT NULL DEFAULT 1,

        rarity TEXT NOT NULL DEFAULT 'common',

        gene_growth INTEGER NOT NULL DEFAULT 1,
        gene_yield INTEGER NOT NULL DEFAULT 1,
        gene_water INTEGER NOT NULL DEFAULT 1,
        gene_rarity INTEGER NOT NULL DEFAULT 1,

        harvested INTEGER NOT NULL DEFAULT 0,

        FOREIGN KEY(user_id)
            REFERENCES users(user_id)
            ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_inventory_user
        ON inventory(user_id);

    CREATE INDEX IF NOT EXISTS idx_plants_user
        ON plants(user_id);

    CREATE INDEX IF NOT EXISTS idx_plants_slot
        ON plants(user_id, slot);
`);

// ============================================================
// TIME
// ============================================================

function now() {
    return Date.now();
}

// ============================================================
// SAFE NUMBER
// ============================================================

function number(value, fallback = 0) {

    const n = Number(value);

    if (!Number.isFinite(n)) {
        return fallback;
    }

    return n;
}

// ============================================================
// USER
// ============================================================

function getOrCreateUser(
    userId,
    username = "Traveler"
) {

    let user = db.prepare(`
        SELECT *
        FROM users
        WHERE user_id = ?
    `).get(userId);

    if (!user) {

        const time = now();

        db.prepare(`
            INSERT INTO users (
                user_id,
                username,

                profile_level,
                profile_xp,

                garden_level,
                garden_xp,

                mora,

                total_plants,
                total_harvests,
                total_bugs_caught,

                created_at,
                updated_at
            )
            VALUES (
                ?,
                ?,

                1,
                0,

                1,
                0,

                1000,

                0,
                0,
                0,

                ?,
                ?
            )
        `).run(
            userId,
            username || "Traveler",
            time,
            time
        );

        user = db.prepare(`
            SELECT *
            FROM users
            WHERE user_id = ?
        `).get(userId);
    }

    // Update username if changed
    if (
        username &&
        user.username !== username
    ) {

        db.prepare(`
            UPDATE users
            SET username = ?,
                updated_at = ?
            WHERE user_id = ?
        `).run(
            username,
            now(),
            userId
        );

        user.username = username;
    }

    // Ensure garden exists
    getGarden(userId);

    return user;
}

// ============================================================
// GET USER
// ============================================================

function getUser(userId) {

    return db.prepare(`
        SELECT *
        FROM users
        WHERE user_id = ?
    `).get(userId);
}

// ============================================================
// GARDEN
// ============================================================

function getGarden(userId) {

    let garden = db.prepare(`
        SELECT *
        FROM gardens
        WHERE user_id = ?
    `).get(userId);

    if (!garden) {

        const time = now();

        db.prepare(`
            INSERT INTO gardens (
                user_id,
                level,
                slots,
                unlocked_slots,
                water,
                fertilizer,
                created_at,
                updated_at
            )
            VALUES (
                ?,
                1,
                5,
                5,
                100,
                0,
                ?,
                ?
            )
        `).run(
            userId,
            time,
            time
        );

        garden = db.prepare(`
            SELECT *
            FROM gardens
            WHERE user_id = ?
        `).get(userId);
    }

    // ========================================================
    // SAFETY NORMALIZATION
    // ========================================================

    garden.level = Math.max(
        1,
        Math.min(
            100,
            number(garden.level, 1)
        )
    );

    garden.slots = Math.max(
        5,
        Math.min(
            25,
            number(garden.slots, 5)
        )
    );

    garden.unlocked_slots = Math.max(
        1,
        Math.min(
            garden.slots,
            number(
                garden.unlocked_slots,
                5
            )
        )
    );

    garden.water = Math.max(
        0,
        Math.min(
            100,
            number(garden.water, 100)
        )
    );

    garden.fertilizer = Math.max(
        0,
        number(garden.fertilizer, 0)
    );

    return garden;
}

// ============================================================
// UPDATE GARDEN
// ============================================================

function updateGarden(
    userId,
    {
        slots,
        unlockedSlots,
        fertilizer,
        water,
        level
    } = {}
) {

    const old = getGarden(userId);

    const newSlots =
        slots === undefined
            ? old.slots
            : Math.max(
                5,
                Math.min(
                    25,
                    number(slots, old.slots)
                )
            );

    const newUnlocked =
        unlockedSlots === undefined
            ? old.unlocked_slots
            : Math.max(
                1,
                Math.min(
                    newSlots,
                    number(
                        unlockedSlots,
                        old.unlocked_slots
                    )
                )
            );

    const newWater =
        water === undefined
            ? old.water
            : Math.max(
                0,
                Math.min(
                    100,
                    number(water, old.water)
                )
            );

    const newFertilizer =
        fertilizer === undefined
            ? old.fertilizer
            : Math.max(
                0,
                number(
                    fertilizer,
                    old.fertilizer
                )
            );

    const newLevel =
        level === undefined
            ? old.level
            : Math.max(
                1,
                Math.min(
                    100,
                    number(level, old.level)
                )
            );

    db.prepare(`
        UPDATE gardens

        SET
            level = ?,
            slots = ?,
            unlocked_slots = ?,
            water = ?,
            fertilizer = ?,
            updated_at = ?

        WHERE user_id = ?
    `).run(
        newLevel,
        newSlots,
        newUnlocked,
        newWater,
        newFertilizer,
        now(),
        userId
    );

    return getGarden(userId);
}

// ============================================================
// MORA
// ============================================================

function getMora(userId) {

    const user = getUser(userId);

    if (!user) {
        return 0;
    }

    return number(
        user.mora,
        0
    );
}

// ============================================================
// ADD MORA
// ============================================================

function addMora(
    userId,
    amount
) {

    amount = Math.floor(
        number(amount)
    );

    if (amount === 0) {
        return getMora(userId);
    }

    db.prepare(`
        UPDATE users

        SET
            mora = MAX(
                0,
                mora + ?
            ),
            updated_at = ?

        WHERE user_id = ?
    `).run(
        amount,
        now(),
        userId
    );

    return getMora(userId);
}

// ============================================================
// REMOVE MORA
// ============================================================

function removeMora(
    userId,
    amount
) {

    amount = Math.floor(
        number(amount)
    );

    if (amount < 0) {
        return false;
    }

    const result = db.prepare(`
        UPDATE users

        SET
            mora = mora - ?,
            updated_at = ?

        WHERE user_id = ?

        AND mora >= ?
    `).run(
        amount,
        now(),
        userId,
        amount
    );

    return result.changes > 0;
}

// ============================================================
// HAS MORA
// ============================================================

function hasMora(
    userId,
    amount
) {

    amount = Math.floor(
        number(amount)
    );

    const user = getUser(userId);

    if (!user) {
        return false;
    }

    return number(
        user.mora
    ) >= amount;
}

// ============================================================
// XP LEVEL FORMULA
// ============================================================
//
// XP required:
// Level 1 -> 100
// Level 2 -> 150
// Level 3 -> 200
// ...
//
// CÃ³ thá»ƒ thay cÃ´ng thá»©c sau nÃ y.
//

function xpRequiredForLevel(level) {

    level = Math.max(
        1,
        Math.floor(
            number(level, 1)
        )
    );

    return 100 + (
        (level - 1) * 50
    );
}

// ============================================================
// TOTAL XP -> LEVEL
// ============================================================

function calculateLevelFromXP(xp) {

    xp = Math.max(
        0,
        number(xp)
    );

    let level = 1;

    let remaining = xp;

    while (
        level < 100
    ) {

        const required =
            xpRequiredForLevel(
                level
            );

        if (
            remaining < required
        ) {
            break;
        }

        remaining -= required;

        level++;
    }

    return {
        level,
        progress: remaining,
        required:
            xpRequiredForLevel(
                level
            )
    };
}

// ============================================================
// LEVEL PROGRESS
// ============================================================

function getLevelProgress(xp) {

    return calculateLevelFromXP(
        xp
    );
}

// ============================================================
// ADD XP
// ============================================================

function addXP(
    userId,
    {
        profileXP = 0,
        gardenXP = 0
    } = {}
) {

    profileXP = Math.max(
        0,
        Math.floor(
            number(profileXP)
        )
    );

    gardenXP = Math.max(
        0,
        Math.floor(
            number(gardenXP)
        )
    );

    const user = getUser(userId);

    if (!user) {
        return null;
    }

    const newProfileXP =
        number(
            user.profile_xp
        ) + profileXP;

    const newGardenXP =
        number(
            user.garden_xp
        ) + gardenXP;

    const profileLevel =
        calculateLevelFromXP(
            newProfileXP
        ).level;

    const gardenLevel =
        calculateLevelFromXP(
            newGardenXP
        ).level;

    db.prepare(`
        UPDATE users

        SET
            profile_xp = ?,
            profile_level = ?,

            garden_xp = ?,
            garden_level = ?,

            updated_at = ?

        WHERE user_id = ?
    `).run(
        newProfileXP,
        profileLevel,

        newGardenXP,
        gardenLevel,

        now(),
        userId
    );

    // Keep garden level synchronized
    updateGarden(
        userId,
        {
            level: gardenLevel
        }
    );

    return getUser(userId);
}

// ============================================================
// INVENTORY
// ============================================================

function getInventory(userId) {

    return db.prepare(`
        SELECT
            item_id,
            amount

        FROM inventory

        WHERE user_id = ?

        AND amount > 0

        ORDER BY item_id ASC
    `).all(userId);
}

// ============================================================
// GET INVENTORY ITEM
// ============================================================

function getInventoryItem(
    userId,
    itemId
) {

    return db.prepare(`
        SELECT
            item_id,
            amount

        FROM inventory

        WHERE user_id = ?

        AND item_id = ?
    `).get(
        userId,
        itemId
    ) || null;
}

// ============================================================
// ADD ITEM
// ============================================================

function addItem(
    userId,
    itemId,
    amount
) {

    amount = Math.floor(
        number(amount)
    );

    if (
        !itemId ||
        amount <= 0
    ) {
        return false;
    }

    db.prepare(`
        INSERT INTO inventory (
            user_id,
            item_id,
            amount
        )

        VALUES (
            ?,
            ?,
            ?
        )

        ON CONFLICT (
            user_id,
            item_id
        )

        DO UPDATE SET
            amount =
                inventory.amount
                + excluded.amount
    `).run(
        userId,
        String(itemId).toLowerCase(),
        amount
    );

    return true;
}

// ============================================================
// REMOVE ITEM
// ============================================================

function removeItem(
    userId,
    itemId,
    amount
) {

    amount = Math.floor(
        number(amount)
    );

    if (
        !itemId ||
        amount <= 0
    ) {
        return false;
    }

    const item =
        getInventoryItem(
            userId,
            itemId
        );

    if (
        !item ||
        item.amount < amount
    ) {
        return false;
    }

    const newAmount =
        item.amount - amount;

    if (
        newAmount <= 0
    ) {

        db.prepare(`
            DELETE FROM inventory

            WHERE user_id = ?

            AND item_id = ?
        `).run(
            userId,
            itemId
        );

    } else {

        db.prepare(`
            UPDATE inventory

            SET amount = ?

            WHERE user_id = ?

            AND item_id = ?
        `).run(
            newAmount,
            userId,
            itemId
        );
    }

    return true;
}

// ============================================================
// HAS ITEM
// ============================================================

function hasItem(
    userId,
    itemId,
    amount = 1
) {

    amount = Math.floor(
        number(amount, 1)
    );

    const item =
        getInventoryItem(
            userId,
            itemId
        );

    if (!item) {
        return false;
    }

    return item.amount >= amount;
}

// ============================================================
// USER STAT
// ============================================================

function incrementStat(
    userId,
    stat,
    amount = 1
) {

    const allowed = [
        "total_plants",
        "total_harvests",
        "total_bugs_caught"
    ];

    if (
        !allowed.includes(stat)
    ) {
        return false;
    }

    amount = Math.floor(
        number(amount)
    );

    db.prepare(`
        UPDATE users

        SET
            ${stat} =
                MAX(
                    0,
                    ${stat} + ?
                ),
            updated_at = ?

        WHERE user_id = ?
    `).run(
        amount,
        now(),
        userId
    );

    return true;
}

// ============================================================
// PLANT
// ============================================================

function getPlant(
    userId,
    slot
) {

    return db.prepare(`
        SELECT *

        FROM plants

        WHERE user_id = ?

        AND slot = ?

        AND harvested = 0

        LIMIT 1
    `).get(
        userId,
        slot
    ) || null;
}

// ============================================================
// GET ALL PLANTS
// ============================================================

function getPlants(userId) {

    return db.prepare(`
        SELECT *

        FROM plants

        WHERE user_id = ?

        AND harvested = 0

        ORDER BY slot ASC
    `).all(userId);
}

// ============================================================
// CREATE PLANT
// ============================================================

function createPlant(
    userId,
    {
        slot,
        plantId,
        plantName = "",
        duration = 60000,
        yieldAmount = 1,
        rarity = "common",
        geneGrowth = 1,
        geneYield = 1,
        geneWater = 1,
        geneRarity = 1
    } = {}
) {

    const garden =
        getGarden(userId);

    slot = Math.floor(
        number(slot)
    );

    if (
        slot < 1 ||
        slot > garden.unlocked_slots
    ) {
        return {
            success: false,
            reason: "SLOT_LOCKED"
        };
    }

    if (
        getPlant(
            userId,
            slot
        )
    ) {
        return {
            success: false,
            reason: "SLOT_OCCUPIED"
        };
    }

    const plantedAt =
        now();

    const finishAt =
        plantedAt +
        Math.max(
            1000,
            number(duration, 60000)
        );

    const result =
        db.prepare(`
            INSERT INTO plants (

                user_id,
                slot,

                plant_id,
                plant_name,

                planted_at,
                finish_at,

                watered,
                bugs,

                growth,
                yield_amount,

                rarity,

                gene_growth,
                gene_yield,
                gene_water,
                gene_rarity,

                harvested
            )

            VALUES (
                ?,
                ?,

                ?,
                ?,

                ?,
                ?,

                0,
                0,

                0,
                ?,

                ?,

                ?,
                ?,
                ?,
                ?,

                0
            )
        `).run(

            userId,
            slot,

            String(
                plantId || "unknown"
            ),
            plantName,

            plantedAt,
            finishAt,

            Math.max(
                1,
                Math.floor(
                    number(
                        yieldAmount,
                        1
                    )
                )
            ),

            rarity,

            Math.max(
                1,
                number(
                    geneGrowth,
                    1
                )
            ),

            Math.max(
                1,
                number(
                    geneYield,
                    1
                )
            ),

            Math.max(
                1,
                number(
                    geneWater,
                    1
                )
            ),

            Math.max(
                1,
                number(
                    geneRarity,
                    1
                )
            )
        );

    incrementStat(
        userId,
        "total_plants",
        1
    );

    return {
        success: true,
        id: result.lastInsertRowid,
        plant: getPlant(
            userId,
            slot
        )
    };
}

// ============================================================
// UPDATE PLANT
// ============================================================

function updatePlant(
    plantId,
    {
        watered,
        bugs,
        growth,
        yieldAmount,
        finishAt
    } = {}
) {

    const plant =
        db.prepare(`
            SELECT *
            FROM plants
            WHERE id = ?
        `).get(plantId);

    if (!plant) {
        return null;
    }

    const newWatered =
        watered === undefined
            ? plant.watered
            : watered ? 1 : 0;

    const newBugs =
        bugs === undefined
            ? plant.bugs
            : Math.max(
                0,
                number(bugs)
            );

    const newGrowth =
        growth === undefined
            ? plant.growth
            : Math.max(
                0,
                number(growth)
            );

    const newYield =
        yieldAmount === undefined
            ? plant.yield_amount
            : Math.max(
                1,
                number(yieldAmount)
            );

    const newFinish =
        finishAt === undefined
            ? plant.finish_at
            : number(
                finishAt,
                plant.finish_at
            );

    db.prepare(`
        UPDATE plants

        SET
            watered = ?,
            bugs = ?,
            growth = ?,
            yield_amount = ?,
            finish_at = ?

        WHERE id = ?
    `).run(
        newWatered,
        newBugs,
        newGrowth,
        newYield,
        newFinish,
        plantId
    );

    return db.prepare(`
        SELECT *
        FROM plants
        WHERE id = ?
    `).get(plantId);
}

// ============================================================
// HARVEST PLANT
// ============================================================

function harvestPlant(
    userId,
    slot
) {

    const plant =
        getPlant(
            userId,
            slot
        );

    if (!plant) {
        return {
            success: false,
            reason: "NO_PLANT"
        };
    }

    if (
        now() < plant.finish_at
    ) {
        return {
            success: false,
            reason: "NOT_READY",
            remaining:
                plant.finish_at - now()
        };
    }

    db.prepare(`
        UPDATE plants

        SET harvested = 1

        WHERE id = ?

        AND user_id = ?
    `).run(
        plant.id,
        userId
    );

    const amount =
        Math.max(
            1,
            Math.floor(
                number(
                    plant.yield_amount,
                    1
                )
            )
        );

    addItem(
        userId,
        plant.plant_id,
        amount
    );

    incrementStat(
        userId,
        "total_harvests",
        1
    );

    // EXP
    addXP(
        userId,
        {
            profileXP: 10,
            gardenXP: 15
        }
    );

    return {
        success: true,
        plant,
        amount
    };
}

// ============================================================
// WATER GARDEN
// ============================================================

function addWater(
    userId,
    amount = 10
) {

    const garden =
        getGarden(userId);

    const newWater =
        Math.min(
            100,
            garden.water +
            Math.max(
                0,
                number(amount)
            )
        );

    return updateGarden(
        userId,
        {
            water: newWater
        }
    );
}

// ============================================================
// USE WATER
// ============================================================

function useWater(
    userId,
    amount = 10
) {

    amount = Math.max(
        0,
        number(amount)
    );

    const garden =
        getGarden(userId);

    if (
        garden.water < amount
    ) {
        return false;
    }

    updateGarden(
        userId,
        {
            water:
                garden.water - amount
        }
    );

    return true;
}

// ============================================================
// ADD FERTILIZER
// ============================================================

function addFertilizer(
    userId,
    amount = 1
) {

    const garden =
        getGarden(userId);

    return updateGarden(
        userId,
        {
            fertilizer:
                garden.fertilizer +
                Math.max(
                    0,
                    number(amount)
                )
        }
    );
}

// ============================================================
// USE FERTILIZER
// ============================================================

function useFertilizer(
    userId,
    amount = 1
) {

    amount = Math.max(
        0,
        number(amount)
    );

    const garden =
        getGarden(userId);

    if (
        garden.fertilizer < amount
    ) {
        return false;
    }

    updateGarden(
        userId,
        {
            fertilizer:
                garden.fertilizer -
                amount
        }
    );

    return true;
}

// ============================================================
// GARDEN UNLOCK SYSTEM
// ============================================================
//
// 5 Ä‘áº¥t máº·c Ä‘á»‹nh.
// Tá»‘i Ä‘a 25 Ä‘áº¥t.
// Má»—i láº§n má»Ÿ thÃªm 1 Ã´.
// YÃªu cáº§u Level + Mora.
//
// Level yÃªu cáº§u:
// slot 6  -> Lv.5
// slot 7  -> Lv.8
// slot 8  -> Lv.11
// ...
//
// Mora tÄƒng dáº§n.
//

function getSlotUnlockRequirement(
    slot
) {

    slot = Math.floor(
        number(slot)
    );

    if (
        slot <= 5
    ) {
        return {
            slot,
            required: false,
            level: 1,
            mora: 0
        };
    }

    if (
        slot > 25
    ) {
        return {
            slot,
            required: false,
            level: 100,
            mora: Infinity
        };
    }

    const index =
        slot - 5;

    const requiredLevel =
        Math.min(
            100,
            2 + (
                index * 3
            )
        );

    const requiredMora =
        Math.floor(
            1000 *
            Math.pow(
                1.55,
                index
            )
        );

    return {
        slot,
        required: true,
        level: requiredLevel,
        mora: requiredMora
    };
}

// ============================================================
// CAN UNLOCK SLOT
// ============================================================

function canUnlockSlot(
    userId,
    slot
) {

    const garden =
        getGarden(userId);

    const requirement =
        getSlotUnlockRequirement(
            slot
        );

    if (
        slot <= garden.unlocked_slots
    ) {
        return {
            success: false,
            reason: "ALREADY_UNLOCKED",
            requirement
        };
    }

    if (
        slot > 25
    ) {
        return {
            success: false,
            reason: "MAX_SLOTS",
            requirement
        };
    }

    const user =
        getUser(userId);

    if (
        number(
            user.garden_level
        ) < requirement.level
    ) {
        return {
            success: false,
            reason: "LEVEL_REQUIRED",
            requirement
        };
    }

    if (
        number(
            user.mora
        ) < requirement.mora
    ) {
        return {
            success: false,
            reason: "MORA_REQUIRED",
            requirement
        };
    }

    return {
        success: true,
        requirement
    };
}

// ============================================================
// UNLOCK SLOT
// ============================================================

function unlockSlot(
    userId,
    slot
) {

    slot = Math.floor(
        number(slot)
    );

    const check =
        canUnlockSlot(
            userId,
            slot
        );

    if (!check.success) {
        return check;
    }

    const requirement =
        check.requirement;

    const paid =
        removeMora(
            userId,
            requirement.mora
        );

    if (!paid) {

        return {
            success: false,
            reason: "MORA_REQUIRED",
            requirement
        };
    }

    const garden =
        getGarden(userId);

    const newUnlocked =
        Math.min(
            25,
            garden.unlocked_slots + 1
        );

    updateGarden(
        userId,
        {
            unlockedSlots:
                newUnlocked,
            slots:
                Math.max(
                    garden.slots,
                    newUnlocked
                )
        }
    );

    addXP(
        userId,
        {
            profileXP: 20,
            gardenXP: 30
        }
    );

    return {
        success: true,
        slot,
        unlockedSlots:
            newUnlocked,
        cost:
            requirement.mora,
        requirement
    };
}

// ============================================================
// GARDEN LEVEL
// ============================================================

function getGardenLevel(
    userId
) {

    const user =
        getUser(userId);

    if (!user) {
        return 1;
    }

    return Math.max(
        1,
        Math.min(
            100,
            number(
                user.garden_level,
                1
            )
        )
    );
}

// ============================================================
// AUTO REFRESH GARDEN
// ============================================================

function refreshGardenLevel(
    userId
) {

    const user =
        getUser(userId);

    if (!user) {
        return null;
    }

    const level =
        calculateLevelFromXP(
            user.garden_xp
        ).level;

    db.prepare(`
        UPDATE users

        SET
            garden_level = ?,
            updated_at = ?

        WHERE user_id = ?
    `).run(
        level,
        now(),
        userId
    );

    updateGarden(
        userId,
        {
            level
        }
    );

    return getGarden(
        userId
    );
}

// ============================================================
// DELETE USER
// ============================================================

function deleteUser(
    userId
) {

    return db.transaction(() => {

        db.prepare(`
            DELETE FROM plants
            WHERE user_id = ?
        `).run(userId);

        db.prepare(`
            DELETE FROM inventory
            WHERE user_id = ?
        `).run(userId);

        db.prepare(`
            DELETE FROM gardens
            WHERE user_id = ?
        `).run(userId);

        return db.prepare(`
            DELETE FROM users
            WHERE user_id = ?
        `).run(userId);

    })();
}

// ============================================================
// DATABASE CLOSE
// ============================================================

function close() {

    if (db.open) {
        db.close();
    }
}
// ============================================================
// PLANT DATABASE
// ============================================================

function getPlantData(
    plantId
) {

    return plantDatabase.getPlant(
        plantId
    );
}

function searchPlantData(
    query
) {

    return plantDatabase.searchPlants(
        query
    );
}

function getAvailablePlantData(
    level
) {

    return plantDatabase.getAvailablePlants(
        level
    );
}

function getPlantYield(
    plantId
) {

    return plantDatabase.getYield(
        plantId
    );
}

function getPlantGrowthTime(
    plantId
) {

    return plantDatabase.getGrowthTime(
        plantId
    );
}

function getPlantWaterCost(
    plantId
) {

    return plantDatabase.getWaterCost(
        plantId
    );
}

function getPlantSellPrice(
    plantId
) {

    return plantDatabase.getSellPrice(
        plantId
    );
}

function getPlantFarmXP(
    plantId
) {

    return plantDatabase.getFarmXP(
        plantId
    );
}

function getPlantProfileXP(
    plantId
) {

    return plantDatabase.getProfileXP(
        plantId
    );
}
// ============================================================
// EXPORT
// ============================================================

module.exports = {

    // Core
    db,
    close,

    // User
    getUser,
    getOrCreateUser,
    deleteUser,

    // Garden
    getGarden,
    updateGarden,
    getGardenLevel,
    refreshGardenLevel,

    // Garden resources
    addWater,
    useWater,

    addFertilizer,
    useFertilizer,

    // Garden slots
    getSlotUnlockRequirement,
    canUnlockSlot,
    unlockSlot,

    // Economy
    getMora,
    addMora,
    removeMora,
    hasMora,

    // XP
    xpRequiredForLevel,
    calculateLevelFromXP,
    getLevelProgress,
    addXP,

    // Inventory
    getInventory,
    getInventoryItem,
    addItem,
    removeItem,
    hasItem,

    // Stats
    incrementStat,

    // Plants
    getPlant,
    getPlants,
    createPlant,
    updatePlant,
    harvestPlant,


    // Plants Data
    getPlantData,
    searchPlantData,
    getAvailablePlantData,
    getPlantYield,
    getPlantGrowthTime,
    getPlantWaterCost,
    getPlantSellPrice,
    getPlantFarmXP,
    getPlantProfileXP
};

// ============================================================
// STARTUP MESSAGE
// ============================================================

console.log(
    `âœ… Nahida Farm SQLite loaded: ${DB_PATH}`
);
