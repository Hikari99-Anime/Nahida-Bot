const db = require("../database");

db.exec(`
    CREATE TABLE IF NOT EXISTS plant_individuals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id TEXT NOT NULL,

        species_id INTEGER NOT NULL,

        generation INTEGER NOT NULL DEFAULT 1,

        vitality INTEGER NOT NULL DEFAULT 50,
        growth INTEGER NOT NULL DEFAULT 50,
        quality INTEGER NOT NULL DEFAULT 50,
        luck INTEGER NOT NULL DEFAULT 0,

        planted_at TEXT NOT NULL,
        ready_at TEXT NOT NULL,

        watered INTEGER NOT NULL DEFAULT 0,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
`);