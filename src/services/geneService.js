const db =
    require("../database/database");


/*
==================================================
GENE POOL
==================================================
*/

const GENE_POOL = {

    vitality: [
        {
            code: "VIT_A",
            name: "Vitality Alpha",
            value: 10
        },
        {
            code: "VIT_B",
            name: "Vitality Bloom",
            value: 7
        },
        {
            code: "VIT_C",
            name: "Vitality Core",
            value: 5
        },
        {
            code: "VIT_D",
            name: "Vitality Seed",
            value: 3
        }
    ],

    growth: [
        {
            code: "GRO_A",
            name: "Rapid Growth",
            value: 10
        },
        {
            code: "GRO_B",
            name: "Swift Root",
            value: 7
        },
        {
            code: "GRO_C",
            name: "Fast Bloom",
            value: 5
        },
        {
            code: "GRO_D",
            name: "Young Sprout",
            value: 3
        }
    ],

    quality: [
        {
            code: "QUA_A",
            name: "Perfect Bloom",
            value: 10
        },
        {
            code: "QUA_B",
            name: "Pure Flower",
            value: 7
        },
        {
            code: "QUA_C",
            name: "Fine Quality",
            value: 5
        },
        {
            code: "QUA_D",
            name: "Clean Petal",
            value: 3
        }
    ],

    luck: [
        {
            code: "LUK_A",
            name: "Lucky Leaf",
            value: 10
        },
        {
            code: "LUK_B",
            name: "Fortune Root",
            value: 7
        },
        {
            code: "LUK_C",
            name: "Blessed Seed",
            value: 5
        },
        {
            code: "LUK_D",
            name: "Small Fortune",
            value: 3
        }
    ]
};


/*
==================================================
RANDOM ITEM
==================================================
*/

function randomItem(array) {

    return array[
        Math.floor(
            Math.random() *
            array.length
        )
    ];
}


/*
==================================================
DOMINANCE
==================================================
*/

function randomDominance() {

    return Math.random() < 0.5
        ? "dominant"
        : "recessive";
}


/*
==================================================
MUTATION
==================================================
*/

function rollMutation() {

    /*
    5% mutation
    */

    return Math.random() < 0.05;
}


/*
==================================================
FORMAT GENE TYPE
==================================================
*/

function formatGeneType(
    type
) {

    const map = {

        vitality:
            "❤️ Vitality",

        growth:
            "⚡ Growth",

        quality:
            "⭐ Quality",

        luck:
            "🍀 Luck"
    };

    return (
        map[type] ||
        `🧬 ${type || "Unknown"}`
    );
}


/*
==================================================
FORMAT DOMINANCE
==================================================
*/

function formatDominance(
    dominance
) {

    if (
        dominance ===
        "dominant"
    ) {

        return "👑 **Gen trội**";
    }

    if (
        dominance ===
        "recessive"
    ) {

        return "🌑 **Gen lặn**";
    }

    return "🧬 **Không xác định**";
}


/*
==================================================
GET EFFECTIVE GENE VALUE
==================================================

Dominant:
    100%

Recessive:
    50%

Mutation:
    Không giảm giá trị mutation.
==================================================
*/

function getEffectiveGeneValue(
    gene
) {

    if (!gene) {
        return 0;
    }

    const value =
        Number(
            gene.gene_value
        ) || 0;


    /*
    Mutation giữ toàn bộ giá trị.
    */

    if (
        Number(
            gene.mutation
        ) === 1
    ) {

        return value;
    }


    /*
    Gen trội.
    */

    if (
        gene.dominance ===
        "dominant"
    ) {

        return value;
    }


    /*
    Gen lặn.
    */

    if (
        gene.dominance ===
        "recessive"
    ) {

        return Math.floor(
            value / 2
        );
    }


    return 0;
}


/*
==================================================
GET GENE EFFECTS
==================================================

Tính tổng hiệu ứng Gene.

KHÔNG thay đổi database.
==================================================
*/

function getGeneEffects(
    plantId
) {

    const genes =
        getPlantGenes(
            plantId
        );

    const effects = {

        vitality: 0,

        growth: 0,

        quality: 0,

        luck: 0
    };


    for (
        const gene of genes
    ) {

        const value =
            getEffectiveGeneValue(
                gene
            );


        switch (
            gene.gene_type
        ) {

            case "vitality":

                effects.vitality +=
                    value;

                break;


            case "growth":

                effects.growth +=
                    value;

                break;


            case "quality":

                effects.quality +=
                    value;

                break;


            case "luck":

                effects.luck +=
                    value;

                break;
        }
    }


    return effects;
}


/*
==================================================
GET GENE EFFECT DETAIL
==================================================
*/

function getGeneEffectDetails(
    plantId
) {

    const genes =
        getPlantGenes(
            plantId
        );

    return genes.map(
        gene => ({

            id:
                gene.id,

            geneType:
                gene.gene_type,

            geneCode:
                gene.gene_code,

            geneName:
                gene.gene_name,

            baseValue:
                Number(
                    gene.gene_value
                ) || 0,

            effectiveValue:
                getEffectiveGeneValue(
                    gene
                ),

            dominance:
                gene.dominance,

            mutation:
                Boolean(
                    gene.mutation
                ),

            discovered:
                Number(
                    gene.discovered
                ) === 1
        })
    );
}


/*
==================================================
CREATE GENE
==================================================
*/

function createGene(
    plantId,
    geneType
) {

    const pool =
        GENE_POOL[geneType];

    if (!pool) {

        throw new Error(
            `Không tồn tại loại Gene: ${geneType}`
        );
    }

    const baseGene =
        randomItem(pool);

    const mutation =
        rollMutation();

    let value =
        baseGene.value;

    let geneCode =
        baseGene.code;

    let geneName =
        baseGene.name;


    /*
    ==========================================
    MUTATION
    ==========================================
    */

    if (mutation) {

        const bonus =
            Math.floor(
                Math.random() * 6
            ) + 5;

        value += bonus;

        geneCode += "_M";

        geneName =
            `Mutation ${geneName}`;
    }


    /*
    ==========================================
    DOMINANCE
    ==========================================
    */

    const dominance =
        randomDominance();


    /*
    ==========================================
    INSERT
    ==========================================
    */

    const result =
        db.prepare(`
            INSERT INTO plant_genes (
                plant_id,
                gene_type,
                gene_code,
                gene_name,
                gene_value,
                dominance,
                mutation
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(

            plantId,

            geneType,

            geneCode,

            geneName,

            value,

            dominance,

            mutation
                ? 1
                : 0
        );


    return getGene(
        result.lastInsertRowid
    );
}


/*
==================================================
CREATE GENES FOR PLANT
==================================================
*/

function createGenesForPlant(
    plantId
) {

    const genes = [];


    genes.push(
        createGene(
            plantId,
            "vitality"
        )
    );


    genes.push(
        createGene(
            plantId,
            "growth"
        )
    );


    genes.push(
        createGene(
            plantId,
            "quality"
        )
    );


    genes.push(
        createGene(
            plantId,
            "luck"
        )
    );


    return genes;
}


/*
==================================================
GET GENE
==================================================
*/

function getGene(
    id
) {

    return db
        .prepare(`
            SELECT *
            FROM plant_genes
            WHERE id = ?
        `)
        .get(id);
}


/*
==================================================
GET PLANT GENES
==================================================
*/

function getPlantGenes(
    plantId
) {

    return db
        .prepare(`
            SELECT *
            FROM plant_genes
            WHERE plant_id = ?
            ORDER BY
                CASE gene_type
                    WHEN 'vitality' THEN 1
                    WHEN 'growth' THEN 2
                    WHEN 'quality' THEN 3
                    WHEN 'luck' THEN 4
                    ELSE 5
                END,
                id ASC
        `)
        .all(plantId);
}


/*
==================================================
GET GENE SUMMARY
==================================================
*/

function getGeneSummary(
    plantId
) {

    const genes =
        getPlantGenes(
            plantId
        );

    return {

        total:
            genes.length,

        mutations:
            genes.filter(
                gene =>
                    Boolean(
                        gene.mutation
                    )
            ).length,

        dominant:
            genes.filter(
                gene =>
                    gene.dominance ===
                    "dominant"
            ).length,

        recessive:
            genes.filter(
                gene =>
                    gene.dominance ===
                    "recessive"
            ).length,

        discovered:
            genes.filter(
                gene =>
                    Number(
                        gene.discovered
                    ) === 1
            ).length
    };
}


/*
==================================================
CHECK GENES DISCOVERED
==================================================
*/

function areGenesDiscovered(
    plantId
) {

    const genes =
        getPlantGenes(
            plantId
        );

    if (
        genes.length === 0
    ) {

        return false;
    }

    return genes.every(
        gene =>
            Number(
                gene.discovered
            ) === 1
    );
}


/*
==================================================
DISCOVER PLANT GENES
==================================================
*/

function discoverPlantGenes(
    plantId
) {

    const genes =
        getPlantGenes(
            plantId
        );

    if (
        genes.length === 0
    ) {

        throw new Error(
            "Cá thể này chưa có Gene."
        );
    }


    /*
    ==========================================
    KIỂM TRA ĐÃ KHÁM PHÁ
    ==========================================
    */

    const undiscovered =
        genes.filter(
            gene =>
                Number(
                    gene.discovered
                ) !== 1
        );


    if (
        undiscovered.length === 0
    ) {

        return {

            alreadyDiscovered:
                true,

            count: 0,

            genes
        };
    }


    /*
    ==========================================
    DISCOVER
    ==========================================
    */

    const now =
        Date.now();


    db.prepare(`
        UPDATE plant_genes

        SET
            discovered = 1,
            discovered_at = ?

        WHERE
            plant_id = ?
            AND discovered = 0
    `).run(
        now,
        plantId
    );


    /*
    ==========================================
    RETURN NEW DATA
    ==========================================
    */

    return {

        alreadyDiscovered:
            false,

        count:
            undiscovered.length,

        genes:
            getPlantGenes(
                plantId
            )
    };
}


/*
==================================================
DELETE PLANT GENES
==================================================
*/

function deletePlantGenes(
    plantId
) {

    return db
        .prepare(`
            DELETE FROM plant_genes
            WHERE plant_id = ?
        `)
        .run(plantId);
}


/*
==================================================
EXPORT
==================================================
*/

module.exports = {

    createGene,

    createGenesForPlant,

    getGene,

    getPlantGenes,

    getGeneSummary,

    deletePlantGenes,

    discoverPlantGenes,

    areGenesDiscovered,

    formatGeneType,

    formatDominance,

    getEffectiveGeneValue,

    getGeneEffects,

    getGeneEffectDetails
};