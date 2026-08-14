const db = require("../database/database");
const User = require("../database/models/User");

function createFarm(userId) {
    const existing = getFarm(userId);

    if (existing) {
        return existing;
    }

    const now = Date.now();

    db.prepare(`
        INSERT INTO farms (
            user_id,
            level,
            exp,
            plot_count,
            created_at,
            updated_at
        )
        VALUES (?, 1, 0, 4, ?, ?)
    `).run(userId, now, now);

    for (let slot = 1; slot <= 4; slot++) {
        db.prepare(`
            INSERT INTO farm_plots (
                user_id,
                slot,
                unlocked
            )
            VALUES (?, ?, 1)
        `).run(userId, slot);
    }

    return getFarm(userId);
}

function getFarm(userId) {
    return db
        .prepare(`
            SELECT *
            FROM farms
            WHERE user_id = ?
        `)
        .get(userId);
}

function getPlots(userId) {
    return db
        .prepare(`
            SELECT
                fp.*,
                p.species_id,
                p.generation,
                p.rarity,
                p.growth,
                p.quality,
                p.luck,
                p.planted_at,
                p.ready_at,
                p.watered
            FROM farm_plots fp
            LEFT JOIN plants p
                ON fp.plant_id = p.id
            WHERE fp.user_id = ?
            ORDER BY fp.slot ASC
        `)
        .all(userId);
}

function getPlot(userId, slot) {
    return db
        .prepare(`
            SELECT *
            FROM farm_plots
            WHERE user_id = ?
            AND slot = ?
        `)
        .get(userId, slot);
}

function addFarmExp(userId, amount) {
    let farm = getFarm(userId);

    if (!farm) {
        createFarm(userId);
        farm = getFarm(userId);
    }

    let level = farm.level;
    let exp = farm.exp + amount;

    let levelUps = 0;

    while (exp >= getRequiredFarmExp(level)) {
        exp -= getRequiredFarmExp(level);
        level++;
        levelUps++;
    }

    let plotCount = farm.plot_count;

    if (levelUps > 0) {
        plotCount += levelUps;
    }

    db.prepare(`
        UPDATE farms
        SET
            level = ?,
            exp = ?,
            plot_count = ?,
            updated_at = ?
        WHERE user_id = ?
    `).run(
        level,
        exp,
        plotCount,
        Date.now(),
        userId
    );

    for (let slot = 1; slot <= plotCount; slot++) {
        db.prepare(`
            INSERT OR IGNORE INTO farm_plots (
                user_id,
                slot,
                unlocked
            )
            VALUES (?, ?, 1)
        `).run(userId, slot);
    }

    return getFarm(userId);
}

function getRequiredFarmExp(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
}

function ensureFarm(userId, username) {
    User.getOrCreateUser(userId, username);
    return createFarm(userId);
}

module.exports = {
    createFarm,
    ensureFarm,
    getFarm,
    getPlots,
    getPlot,
    addFarmExp,
    getRequiredFarmExp
};