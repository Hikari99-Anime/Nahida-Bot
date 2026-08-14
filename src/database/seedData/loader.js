const db = require("../database");
const plants = require("./plants");

function loadPlantSpecies() {
    const statement = db.prepare(`
        INSERT OR IGNORE INTO plant_species (
            id,
            name,
            emoji,
            rarity,
            growth_seconds,
            sell_price,
            base_vitality,
            base_growth,
            base_quality,
            base_luck
        )
        VALUES (
            @id,
            @name,
            @emoji,
            @rarity,
            @growthSeconds,
            @sellPrice,
            @vitality,
            @growth,
            @quality,
            @luck
        )
    `);

    const transaction = db.transaction(() => {
        for (const plant of plants) {
            statement.run(plant);
        }
    });

    transaction();
}

module.exports = {
    loadPlantSpecies
};