const { db } = require("../db");
const { DEFAULT_PLOTS } = require("../config");
const { now } = require("../utils/time");

// ============================================================
// ENSURE PLOTS
// ============================================================

function ensurePlots(userId) {

    if (!userId) {
        return;
    }

    const insert =
        db.prepare(`
            INSERT INTO plots
            (
                user_id,
                plot_id,
                plant_id,
                planted_at,
                finish_at,
                watered,
                mutation
            )
            VALUES (
                ?,
                ?,
                NULL,
                NULL,
                NULL,
                0,
                NULL
            )
        `);

    const transaction =
        db.transaction(() => {

            for (
                let plotId = 1;
                plotId <= DEFAULT_PLOTS;
                plotId++
            ) {

                const exists =
                    db.prepare(`
                        SELECT 1
                        FROM plots
                        WHERE user_id = ?
                        AND plot_id = ?
                        LIMIT 1
                    `).get(
                        userId,
                        plotId
                    );

                if (!exists) {

                    insert.run(
                        userId,
                        plotId
                    );
                }
            }
        });

    transaction();
}


// ============================================================
// GET ALL PLOTS
// ============================================================

function getPlots(userId) {

    ensurePlots(userId);

    return db.prepare(`
        SELECT
            user_id,
            plot_id,
            plant_id,
            planted_at,
            finish_at,
            watered,
            mutation
        FROM plots
        WHERE user_id = ?
        ORDER BY plot_id ASC
    `).all(
        userId
    );
}


// ============================================================
// GET ONE PLOT
// ============================================================

function getPlot(
    userId,
    plotId
) {

    plotId =
        Number(plotId);

    if (
        !Number.isInteger(plotId) ||
        plotId < 1 ||
        plotId > DEFAULT_PLOTS
    ) {
        return null;
    }

    ensurePlots(userId);

    return db.prepare(`
        SELECT
            user_id,
            plot_id,
            plant_id,
            planted_at,
            finish_at,
            watered,
            mutation
        FROM plots
        WHERE user_id = ?
        AND plot_id = ?
        LIMIT 1
    `).get(
        userId,
        plotId
    );
}


// ============================================================
// EMPTY PLOT
// ============================================================

function isEmpty(plot) {

    return !!(
        plot &&
        !plot.plant_id
    );
}


// ============================================================
// PLANTED PLOT
// ============================================================

function isPlanted(plot) {

    return !!(
        plot &&
        plot.plant_id
    );
}


// ============================================================
// WATERED
// ============================================================

function isWatered(plot) {

    return !!(
        plot &&
        Number(plot.watered) === 1
    );
}


// ============================================================
// READY
// ============================================================

function isReady(plot) {

    if (!plot) {
        return false;
    }

    if (!plot.plant_id) {
        return false;
    }

    const finishAt =
        Number(plot.finish_at);

    if (
        !Number.isFinite(finishAt)
    ) {
        return false;
    }

    return finishAt <= now();
}


// ============================================================
// REMAINING TIME
// ============================================================

function remainingTime(plot) {

    if (!plot || !plot.finish_at) {
        return 0;
    }

    return Math.max(
        0,
        Number(plot.finish_at) - now()
    );
}


// ============================================================
// RESET PLOT
// ============================================================

function resetPlot(
    userId,
    plotId
) {

    plotId =
        Number(plotId);

    if (
        !Number.isInteger(plotId)
    ) {
        return false;
    }

    const result =
        db.prepare(`
            UPDATE plots
            SET
                plant_id = NULL,
                planted_at = NULL,
                finish_at = NULL,
                watered = 0,
                mutation = NULL
            WHERE user_id = ?
            AND plot_id = ?
        `).run(
            userId,
            plotId
        );

    return result.changes > 0;
}


// ============================================================
// PLANT INTO PLOT
// ============================================================

function setPlant(
    userId,
    plotId,
    plantId,
    plantedAt,
    finishAt
) {

    plotId =
        Number(plotId);

    if (
        !Number.isInteger(plotId) ||
        plotId < 1 ||
        plotId > DEFAULT_PLOTS
    ) {
        return false;
    }

    const plot =
        getPlot(
            userId,
            plotId
        );

    if (!plot) {
        return false;
    }

    // Không cho gieo vào ô đang có cây
    if (
        plot.plant_id
    ) {
        return false;
    }

    const result =
        db.prepare(`
            UPDATE plots
            SET
                plant_id = ?,
                planted_at = ?,
                finish_at = ?,
                watered = 0,
                mutation = NULL
            WHERE user_id = ?
            AND plot_id = ?
            AND plant_id IS NULL
        `).run(
            plantId,
            plantedAt,
            finishAt,
            userId,
            plotId
        );

    return result.changes > 0;
}


// ============================================================
// WATER PLOT STATE
// ============================================================

function markWatered(
    userId,
    plotId
) {

    plotId =
        Number(plotId);

    if (
        !Number.isInteger(plotId)
    ) {
        return false;
    }

    const result =
        db.prepare(`
            UPDATE plots
            SET watered = 1
            WHERE user_id = ?
            AND plot_id = ?
            AND plant_id IS NOT NULL
            AND watered = 0
        `).run(
            userId,
            plotId
        );

    return result.changes > 0;
}


// ============================================================
// SET MUTATION
// ============================================================

function setMutation(
    userId,
    plotId,
    mutation
) {

    const result =
        db.prepare(`
            UPDATE plots
            SET mutation = ?
            WHERE user_id = ?
            AND plot_id = ?
            AND plant_id IS NOT NULL
        `).run(
            mutation,
            userId,
            plotId
        );

    return result.changes > 0;
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    ensurePlots,

    getPlots,
    getPlot,

    isEmpty,
    isPlanted,
    isWatered,
    isReady,

    remainingTime,

    setPlant,
    markWatered,
    setMutation,

    resetPlot
};