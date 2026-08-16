const { db } = require("../db");

const plantDatabase = require("../database/plants");

// ============================================================
// PLANT HELPERS
// ============================================================

function getHybridPlant(
    plantId
) {

    return db.prepare(`
        SELECT *
        FROM bred_plants
        WHERE id = ?
    `).get(
        plantId
    );
}

function isHybridPlant(
    plantId
) {

    return !!getHybridPlant(
        plantId
    );
}

function getPlant(
    plantId
) {

    if (
        isHybridPlant(
            plantId
        )
    ) {

        return getHybridPlant(
            plantId
        );
    }

    return plantDatabase.getPlant(
        plantId
    );
}

function plantName(
    plant
) {

    if (!plant) {
        return "CÃ¢y khÃ´ng xÃ¡c Ä‘á»‹nh";
    }

    return (
        plant.name_vi ||
        plant.nameVi ||
        plant.viName ||
        plant.name ||
        plant.id
    );
}

function plantEmoji(
    plant
) {

    return (
        plant?.emoji ||
        "ðŸŒ±"
    );
}

function plantGrowth(
    plant
) {

    if (
        plant.growth_time
    ) {

        return Math.max(
            1,
            Number(
                plant.growth_time
            )
        );
    }

    return Math.max(
        1,
        Number(
            plant.growthTime
        ) ||
        Number(
            plantDatabase.getGrowthTime(
                plant.id
            )
        ) ||
        1
    );
}

function plantYield(
    plant
) {

    if (
        plant.yield_min
    ) {

        const min =
            Number(
                plant.yield_min
            );

        const max =
            Number(
                plant.yield_max
            ) || min;

        return (
            min +
            Math.floor(
                Math.random() *
                (
                    max -
                    min +
                    1
                )
            )
        );
    }

    if (
        typeof plantDatabase.getYield ===
        "function"
    ) {

        return plantDatabase.getYield(
            plant.id
        );
    }

    if (
        typeof plant.yield ===
        "number"
    ) {

        return plant.yield;
    }

    if (
        plant.yield &&
        typeof plant.yield ===
        "object"
    ) {

        const min =
            Number(
                plant.yield.min
            ) || 1;

        const max =
            Number(
                plant.yield.max
            ) || min;

        return (
            min +
            Math.floor(
                Math.random() *
                (
                    max -
                    min +
                    1
                )
            )
        );
    }

    return 1;
}

function plantSellPrice(
    plant
) {

    if (
        plant.sell_price
    ) {

        return Math.max(
            0,
            Number(
                plant.sell_price
            )
        );
    }

    return Math.max(
        0,
        Number(
            plantDatabase.getSellPrice(
                plant.id
            )
        ) || 0
    );
}

function plantWaterCost(
    plant
) {

    if (
        plant.water_cost
    ) {

        return Math.max(
            1,
            Number(
                plant.water_cost
            )
        );
    }

    return Math.max(
        1,
        Number(
            plantDatabase.getWaterCost(
                plant.id
            )
        ) || 1
    );
}

// ============================================================
// SEED PRICE
// ============================================================

function getSeedPrice(
    plant
) {

    if (!plant) {
        return 0;
    }

    const direct =
        Number(
            plant.seedPrice
        );

    if (
        Number.isFinite(
            direct
        ) &&
        direct > 0
    ) {

        return Math.floor(
            direct
        );
    }

    const sell =
        plantSellPrice(
            plant
        );

    const growth =
        plantGrowth(
            plant
        );

    const rarity =
        Number(
            plant.rarity
        ) || 1;

    return Math.max(
        10,
        Math.floor(
            (
                sell * 3
            ) +
            (
                growth * 0.25
            ) +
            (
                rarity * 10
            )
        )
    );
}

module.exports = {
    getHybridPlant,
    isHybridPlant,
    getPlant,
    plantName,
    plantEmoji,
    plantGrowth,
    plantYield,
    plantSellPrice,
    plantWaterCost,
    getSeedPrice
};

