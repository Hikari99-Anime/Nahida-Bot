const db = require("../database");

class PlantIndividual {

    // ==========================================
    // CREATE
    // ==========================================

    static create({
        userId,
        speciesId,
        generation = 1,
        vitality = 50,
        growth = 50,
        quality = 50,
        luck = 0,
        plantedAt,
        readyAt
    }) {

        const stmt = db.prepare(`
            INSERT INTO plant_individuals (
                user_id,
                species_id,
                generation,
                vitality,
                growth,
                quality,
                luck,
                planted_at,
                ready_at
            )
            VALUES (
                @userId,
                @speciesId,
                @generation,
                @vitality,
                @growth,
                @quality,
                @luck,
                @plantedAt,
                @readyAt
            )
        `);

        const result = stmt.run({
            userId,
            speciesId,
            generation,
            vitality,
            growth,
            quality,
            luck,
            plantedAt,
            readyAt
        });

        return this.getById(
            result.lastInsertRowid
        );
    }


    // ==========================================
    // GET BY ID
    // ==========================================

    static getById(id) {

        return db.prepare(`
            SELECT *
            FROM plant_individuals
            WHERE id = ?
        `).get(id);
    }


    // ==========================================
    // GET USER PLANTS
    // ==========================================

    static getByUser(userId) {

        return db.prepare(`
            SELECT *
            FROM plant_individuals
            WHERE user_id = ?
            ORDER BY id DESC
        `).all(userId);
    }


    // ==========================================
    // GET INVENTORY
    // ==========================================

    static getInventory(userId) {

        return db.prepare(`
            SELECT
                pi.*,

                ps.name,
                ps.emoji,
                ps.rarity,
                ps.growth_seconds,
                ps.sell_price

            FROM plant_individuals pi

            LEFT JOIN plant_species ps
                ON ps.id = pi.species_id

            WHERE pi.user_id = ?

            ORDER BY pi.id DESC
        `).all(userId);
    }


    // ==========================================
    // UPDATE
    // ==========================================

    static update(id, data) {

        const fields = [];
        const values = {};

        for (
            const [key, value]
            of Object.entries(data)
        ) {

            fields.push(
                `${key} = @${key}`
            );

            values[key] = value;
        }

        if (fields.length === 0) {

            return this.getById(id);
        }

        values.id = id;

        db.prepare(`
            UPDATE plant_individuals

            SET ${fields.join(", ")}

            WHERE id = @id
        `).run(values);

        return this.getById(id);
    }


    // ==========================================
    // DELETE
    // ==========================================

    static delete(id) {

        return db.prepare(`
            DELETE FROM plant_individuals
            WHERE id = ?
        `).run(id);
    }
}

module.exports = PlantIndividual;