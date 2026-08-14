const db =
    require("../database");


/*
==================================================
PLANT BREEDING MODEL
==================================================
*/


/*
==================================================
CREATE BREEDING RECORD
==================================================
*/

function create({

    userId,

    parent1Id,

    parent2Id,

    childId,

    generation

}) {

    const now =
        Date.now();


    const result =
        db.prepare(`
            INSERT INTO plant_breedings (

                user_id,

                parent_1_id,

                parent_2_id,

                child_id,

                generation,

                created_at

            )

            VALUES (?, ?, ?, ?, ?, ?)
        `).run(

            userId,

            parent1Id,

            parent2Id,

            childId,

            generation,

            now
        );


    return getById(
        result.lastInsertRowid
    );
}


/*
==================================================
GET BY ID
==================================================
*/

function getById(
    id
) {

    return db
        .prepare(`
            SELECT *
            FROM plant_breedings
            WHERE id = ?
        `)
        .get(id);
}


/*
==================================================
GET BREEDING BY CHILD
==================================================
*/

function getByChildId(
    childId
) {

    return db
        .prepare(`
            SELECT *
            FROM plant_breedings
            WHERE child_id = ?
            LIMIT 1
        `)
        .get(childId);
}


/*
==================================================
GET BREEDING BY PARENT
==================================================
*/

function getByParentId(
    plantId
) {

    return db
        .prepare(`
            SELECT *
            FROM plant_breedings

            WHERE
                parent_1_id = ?
                OR parent_2_id = ?

            ORDER BY
                id DESC
        `)
        .all(

            plantId,

            plantId
        );
}


/*
==================================================
GET USER BREEDINGS
==================================================
*/

function getByUser(
    userId
) {

    return db
        .prepare(`
            SELECT *
            FROM plant_breedings

            WHERE user_id = ?

            ORDER BY
                id DESC
        `)
        .all(
            userId
        );
}


/*
==================================================
CHECK PARENT PAIR
==================================================
*/

function hasBreedPair(
    parent1Id,
    parent2Id
) {

    const result =
        db
            .prepare(`
                SELECT id

                FROM plant_breedings

                WHERE
                    (
                        parent_1_id = ?
                        AND
                        parent_2_id = ?
                    )

                    OR

                    (
                        parent_1_id = ?
                        AND
                        parent_2_id = ?
                    )

                LIMIT 1
            `)
            .get(

                parent1Id,
                parent2Id,

                parent2Id,
                parent1Id
            );


    return Boolean(
        result
    );
}


/*
==================================================
COUNT USER BREEDINGS
==================================================
*/

function countByUser(
    userId
) {

    const result =
        db
            .prepare(`
                SELECT COUNT(*) AS count

                FROM plant_breedings

                WHERE user_id = ?
            `)
            .get(
                userId
            );


    return Number(
        result?.count || 0
    );
}


/*
==================================================
GET BREEDING DETAIL
==================================================
*/

function getDetail(
    id
) {

    return db
        .prepare(`
            SELECT

                b.*,

                p1.species_id AS parent_1_species_id,
                p1.generation AS parent_1_generation,

                p2.species_id AS parent_2_species_id,
                p2.generation AS parent_2_generation,

                c.species_id AS child_species_id,
                c.generation AS child_generation

            FROM plant_breedings b

            LEFT JOIN plant_individuals p1
                ON p1.id = b.parent_1_id

            LEFT JOIN plant_individuals p2
                ON p2.id = b.parent_2_id

            LEFT JOIN plant_individuals c
                ON c.id = b.child_id

            WHERE b.id = ?
        `)
        .get(id);
}


/*
==================================================
EXPORT
==================================================
*/

module.exports = {

    create,

    getById,

    getByChildId,

    getByParentId,

    getByUser,

    hasBreedPair,

    countByUser,

    getDetail
};