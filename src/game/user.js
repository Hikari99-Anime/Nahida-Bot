const { db } = require("../db");
const { now } = require("../utils/time");

// ============================================================
// WATER CONFIG
// ============================================================

const MAX_WATER = 200;

// +1 Water mỗi 60 giây
const WATER_REGEN_MS = 60 * 1000;


// ============================================================
// WATER DATABASE MIGRATION
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
            "[USER] ✅ Added users.last_water_at"
        );
    }

} catch (error) {

    console.error(
        "[USER] ❌ Water migration error:",
        error
    );
}


// ============================================================
// USER
// ============================================================

function getUser(user) {

    const id =
        typeof user === "string"
            ? user
            : user.id;

    if (!id) {
        throw new Error("USER_ID_REQUIRED");
    }

    let row =
        db.prepare(`
            SELECT *
            FROM users
            WHERE id = ?
        `).get(id);

    if (!row) {

        const username =
            typeof user === "string"
                ? "Unknown"
                : (
                    user.username ||
                    user.globalName ||
                    "Unknown"
                );

        const timestamp =
            now();

        db.prepare(`
            INSERT INTO users
            (
                id,
                username,
                level,
                xp,
                mora,
                luck,
                water,
                farm_level,
                farm_xp,
                harvest_count,
                bug_count,
                last_water_at,
                created_at,
                updated_at
            )
            VALUES (
                ?,
                ?,
                1,
                0,
                1000,
                0,
                100,
                1,
                25,
                0,
                0,
                ?,
                ?,
                ?
            )
        `).run(
            id,
            username,
            timestamp,
            timestamp,
            timestamp
        );

        row =
            db.prepare(`
                SELECT *
                FROM users
                WHERE id = ?
            `).get(id);
    }

    // ========================================================
    // SYNC WATER
    // ========================================================

    row =
        syncWaterRow(row);

    return row;
}


// ============================================================
// WATER SYNC INTERNAL
// ============================================================

function syncWaterRow(row) {

    if (!row) {
        return row;
    }

    let water =
        Math.max(
            0,
            Math.min(
                MAX_WATER,
                Number(row.water || 0)
            )
        );

    let lastWaterAt =
        Number(
            row.last_water_at || 0
        );

    const currentTime =
        now();

    // ========================================================
    // Nếu chưa có timestamp
    // ========================================================

    if (!lastWaterAt) {

        lastWaterAt =
            currentTime;

        db.prepare(`
            UPDATE users
            SET
                water = ?,
                last_water_at = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            water,
            lastWaterAt,
            currentTime,
            row.id
        );

        row.water =
            water;

        row.last_water_at =
            lastWaterAt;

        return row;
    }

    // ========================================================
    // Đã full
    // ========================================================

    if (water >= MAX_WATER) {

        water =
            MAX_WATER;

        // Full rồi thì timestamp hiện tại
        lastWaterAt =
            currentTime;

        db.prepare(`
            UPDATE users
            SET
                water = ?,
                last_water_at = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            water,
            lastWaterAt,
            currentTime,
            row.id
        );

        row.water =
            water;

        row.last_water_at =
            lastWaterAt;

        return row;
    }

    // ========================================================
    // TÍNH WATER ĐÃ HỒI
    // ========================================================

    const elapsed =
        Math.max(
            0,
            currentTime -
            lastWaterAt
        );

    const regenerated =
        Math.floor(
            elapsed /
            WATER_REGEN_MS
        );

    // Chưa đủ 1 phút
    if (regenerated <= 0) {

        row.water =
            water;

        row.last_water_at =
            lastWaterAt;

        return row;
    }

    const oldWater =
        water;

    water =
        Math.min(
            MAX_WATER,
            water + regenerated
        );

    // Giữ lại phần thời gian dư
    lastWaterAt +=
        regenerated *
        WATER_REGEN_MS;

    // Nếu vừa đạt full
    if (
        water >= MAX_WATER
    ) {

        water =
            MAX_WATER;

        lastWaterAt =
            currentTime;
    }

    // Chỉ update nếu water thực sự thay đổi
    if (
        water !== oldWater ||
        lastWaterAt !==
            Number(row.last_water_at || 0)
    ) {

        db.prepare(`
            UPDATE users
            SET
                water = ?,
                last_water_at = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            water,
            lastWaterAt,
            currentTime,
            row.id
        );
    }

    row.water =
        water;

    row.last_water_at =
        lastWaterAt;

    return row;
}


// ============================================================
// UPDATE USER
// ============================================================

function updateUser(
    id,
    fields
) {

    if (!id) {
        throw new Error("USER_ID_REQUIRED");
    }

    if (
        !fields ||
        typeof fields !== "object"
    ) {
        return;
    }

    const keys =
        Object.keys(fields);

    if (!keys.length) {
        return;
    }

    const set =
        keys
            .map(
                key =>
                    `"${key}" = @${key}`
            )
            .join(", ");

    db.prepare(`
        UPDATE users
        SET
            ${set},
            updated_at = @updated_at
        WHERE id = @id
    `).run({
        ...fields,
        updated_at: now(),
        id
    });
}


// ============================================================
// WATER
// ============================================================

function getWater(user) {

    const current =
        getUser(user);

    return Math.max(
        0,
        Math.min(
            MAX_WATER,
            Number(
                current.water || 0
            )
        )
    );
}


// ============================================================
// CONSUME WATER
// ============================================================

function consumeWater(
    user,
    amount
) {

    const userId =
        typeof user === "string"
            ? user
            : user.id;

    if (!userId) {
        throw new Error(
            "USER_ID_REQUIRED"
        );
    }

    amount =
        Math.floor(
            Number(amount) || 0
        );

    if (amount <= 0) {

        return {
            success: false,
            reason: "INVALID_AMOUNT",
            water:
                getWater(userId)
        };
    }

    // getUser() tự sync water
    const current =
        getUser(userId);

    const water =
        Number(
            current.water || 0
        );

    if (
        water < amount
    ) {

        return {
            success: false,
            reason:
                "NOT_ENOUGH_WATER",

            water,

            required:
                amount
        };
    }

    const newWater =
        water - amount;

    // Bắt đầu tính regen từ lúc tiêu water
    updateUser(
        userId,
        {
            water:
                newWater,

            last_water_at:
                now()
        }
    );

    return {
        success: true,

        water:
            newWater,

        consumed:
            amount
    };
}


// ============================================================
// ADD WATER
// ============================================================

function addWater(
    user,
    amount
) {

    const userId =
        typeof user === "string"
            ? user
            : user.id;

    if (!userId) {
        throw new Error(
            "USER_ID_REQUIRED"
        );
    }

    amount =
        Math.floor(
            Number(amount) || 0
        );

    if (amount <= 0) {

        return {
            success: false,
            reason: "INVALID_AMOUNT",
            water:
                getWater(userId)
        };
    }

    const current =
        getUser(userId);

    const oldWater =
        Number(
            current.water || 0
        );

    const newWater =
        Math.min(
            MAX_WATER,
            oldWater + amount
        );

    updateUser(
        userId,
        {
            water:
                newWater,

            last_water_at:
                now()
        }
    );

    return {
        success: true,

        water:
            newWater,

        added:
            newWater - oldWater
    };
}


// ============================================================
// WATER REGEN TIME
// ============================================================

function getWaterRegenRemainingMs(
    user
) {

    const current =
        getUser(user);

    const water =
        Number(
            current.water || 0
        );

    // Đã đầy
    if (
        water >= MAX_WATER
    ) {
        return 0;
    }

    const lastWaterAt =
        Number(
            current.last_water_at || 0
        );

    if (!lastWaterAt) {
        return 0;
    }

    const elapsed =
        Math.max(
            0,
            now() -
            lastWaterAt
        );

    return Math.max(
        0,
        WATER_REGEN_MS -
        (
            elapsed %
            WATER_REGEN_MS
        )
    );
}


// ============================================================
// WATER REGEN SECONDS
// ============================================================

function getWaterRegenRemainingSeconds(
    user
) {

    return Math.ceil(
        getWaterRegenRemainingMs(
            user
        ) / 1000
    );
}


// ============================================================
// WATER DISPLAY
// ============================================================

function formatWater(
    user
) {

    const water =
        getWater(user);

    return `${water}/${MAX_WATER}`;
}


// ============================================================
// MORA
// ============================================================

function addMora(
    user,
    amount
) {

    const userId =
        typeof user === "string"
            ? user
            : user.id;

    amount =
        Math.floor(
            Number(amount) || 0
        );

    if (!userId) {
        throw new Error("USER_ID_REQUIRED");
    }

    if (amount === 0) {
        return getUser(userId).mora;
    }

    const current =
        getUser(userId);

    const mora =
        Math.max(
            0,
            Number(current.mora || 0) +
            amount
        );

    updateUser(
        userId,
        {
            mora
        }
    );

    return mora;
}


// ============================================================
// XP REQUIRED
// ============================================================

function xpRequired(
    level
) {

    level =
        Math.max(
            1,
            Math.floor(
                Number(level) || 1
            )
        );

    return Math.floor(
        100 +
        ((level - 1) * 50)
    );
}


// ============================================================
// ADD XP
// ============================================================

function addXP(
    user,
    amount
) {

    const userId =
        typeof user === "string"
            ? user
            : user.id;

    amount =
        Math.max(
            0,
            Math.floor(
                Number(amount) || 0
            )
        );

    const current =
        getUser(userId);

    let xp =
        Math.max(
            0,
            Number(current.xp || 0)
        ) + amount;

    let level =
        Math.max(
            1,
            Number(current.level || 1)
        );

    let levelUps = 0;

    while (
        xp >=
        xpRequired(level)
    ) {

        xp -=
            xpRequired(level);

        level++;
        levelUps++;
    }

    updateUser(
        userId,
        {
            xp,
            level
        }
    );

    return {
        level,
        xp,
        levelUps
    };
}


// ============================================================
// ALIAS
// ============================================================
// Giữ tương thích với code cũ đang gọi addXp()

function addXp(
    user,
    amount
) {
    return addXP(
        user,
        amount
    );
}


// ============================================================
// FARM XP
// ============================================================

function addFarmXP(
    user,
    amount
) {

    const userId =
        typeof user === "string"
            ? user
            : user.id;

    amount =
        Math.max(
            0,
            Math.floor(
                Number(amount) || 0
            )
        );

    const current =
        getUser(userId);

    let farmXP =
        Math.max(
            0,
            Number(current.farm_xp || 0)
        ) + amount;

    let farmLevel =
        Math.max(
            1,
            Number(current.farm_level || 1)
        );

    while (
        farmXP >=
        farmLevel * 100
    ) {

        farmXP -=
            farmLevel * 100;

        farmLevel++;
    }

    updateUser(
        userId,
        {
            farm_xp: farmXP,
            farm_level: farmLevel
        }
    );

    return {
        farmLevel,
        farmXP
    };
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    // user
    getUser,
    updateUser,

    // water
    MAX_WATER,
    WATER_REGEN_MS,
    getWater,
    consumeWater,
    addWater,
    getWaterRegenRemainingMs,
    getWaterRegenRemainingSeconds,
    formatWater,

    // mora
    addMora,

    // xp
    xpRequired,
    addXP,
    addXp,

    // farm xp
    addFarmXP
};