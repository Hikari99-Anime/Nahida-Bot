const db = require("./src/database/database");

console.log("\n=== plant_genes ===");

const genes = db
    .prepare("PRAGMA table_info(plant_genes)")
    .all();

console.table(genes);

console.log("\n=== plant_individuals ===");

const plants = db
    .prepare("PRAGMA table_info(plant_individuals)")
    .all();

console.table(plants);

console.log("\n=== TEST ===");

console.log(
    db.prepare(`
        SELECT *
        FROM plant_genes
        LIMIT 5
    `).all()
);