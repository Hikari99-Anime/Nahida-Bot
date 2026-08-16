const { db } = require("../db");
const { DEFAULT_PLOTS } = require("../config");
const { now } = require("../utils/time");

// ============================================================
// PLOTS
// ============================================================

function ensurePlots(
    userId
) {

    for (
        let i = 1;
        i <= DEFAULT_PLOTS;
        i++
    ) {

        const exists =
            db.prepare(`
                SELECT 1
                FROM plots
                WHERE user_id = ?
                AND plot_id = ?
            `).get(
                userId,
                i
            );

        if (!exists) {

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
            `).run(
                userId,
                i
            );
        }
    }
}

function getPlots(
    userId
) {

    ensurePlots(
        userId
    );

    return db.prepare(`
        SELECT *
        FROM plots
        WHERE user_id = ?
        ORDER BY plot_id
    `).all(
        userId
    );
}

function getPlot(
    userId,
    plotId
) {

    ensurePlots(
        userId
    );

    return db.prepare(`
        SELECT *
        FROM plots
        WHERE user_id = ?
        AND plot_id = ?
    `).get(
        userId,
        plotId
    );
}

function isReady(
    plot
) {

    return (
        plot &&
        plot.plant_id &&
        Number(
            plot.finish_at
        ) <= now()
    );
}

module.exports = {
    ensurePlots,
    getPlots,
    getPlot,
    isReady
};
