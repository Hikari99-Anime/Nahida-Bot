const { db } = require("../db");
const { now } = require("../utils/time");

// ============================================================
// USER
// ============================================================

function getUser(user) {

    const id =
        typeof user === "string"
            ? user
            : user.id;

    let row =
        db.prepare(`
            SELECT *
            FROM users
            WHERE id = ?
        `).get(id);

    if (!row) {

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
                ?
            )
        `).run(
            id,
            typeof user === "string"
                ? "Unknown"
                : user.username,
            now(),
            now()
        );

        row =
            db.prepare(`
                SELECT *
                FROM users
                WHERE id = ?
            `).get(id);
    }

    return row;
}

function updateUser(
    id,
    fields
) {

    const keys =
        Object.keys(fields);

    if (!keys.length) {
        return;
    }

    const set =
        keys
            .map(
                key =>
                    `${key} = @${key}`
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
// XP
// ============================================================

function xpRequired(
    level
) {

    return Math.floor(
        100 +
        ((level - 1) * 50)
    );
}

function addXP(
    userId,
    amount
) {

    const user =
        getUser(userId);

    let xp =
        user.xp +
        Math.max(
            0,
            amount
        );

    let level =
        user.level;

    let levelUps =
        0;

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

function addFarmXP(
    userId,
    amount
) {

    const user =
        getUser(userId);

    let farmXP =
        user.farm_xp +
        Math.max(
            0,
            amount
        );

    let farmLevel =
        user.farm_level;

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

module.exports = {
    getUser,
    updateUser,
    xpRequired,
    addXP,
    addFarmXP
};

