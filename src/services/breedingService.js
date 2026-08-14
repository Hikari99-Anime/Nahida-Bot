const db =
    require("../database/database");

const PlantIndividual =
    require("../database/models/PlantIndividual");

const PlantBreeding =
    require("../database/models/PlantBreeding");

const Plant =
    require("./plantService");

const Gene =
    require("./geneService");


/*
==================================================
BREEDING CONFIG
==================================================
*/

const MUTATION_CHANCE = 0.05;


/*
==================================================
GENE TYPES
==================================================
*/

const GENE_TYPES = [
    "vitality",
    "growth",
    "quality",
    "luck"
];


/*
==================================================
RANDOM
==================================================
*/

function randomChance(
    chance
) {

    return Math.random() < chance;
}


function randomItem(
    array
) {

    if (
        !Array.isArray(array) ||
        array.length === 0
    ) {

        return null;
    }

    return array[
        Math.floor(
            Math.random() *
            array.length
        )
    ];
}


/*
==================================================
GET USER PLANT
==================================================
*/

function getUserPlant(
    userId,
    plantId
) {

    const numericId =
        Number(plantId);

    if (
        !Number.isInteger(
            numericId
        ) ||
        numericId <= 0
    ) {

        return null;
    }

    const plant =
        Plant.getPlant(
            numericId
        );

    if (!plant) {

        return null;
    }

    if (
        String(
            plant.user_id
        ) !==
        String(
            userId
        )
    ) {

        return null;
    }

    return plant;
}


/*
==================================================
VALIDATE PARENTS
==================================================
*/

function validateParents(
    userId,
    parent1Id,
    parent2Id
) {

    const parent1 =
        getUserPlant(
            userId,
            parent1Id
        );

    if (!parent1) {

        throw new Error(
            "Không tìm thấy cây bố hoặc cây này không thuộc về bạn."
        );
    }


    const parent2 =
        getUserPlant(
            userId,
            parent2Id
        );

    if (!parent2) {

        throw new Error(
            "Không tìm thấy cây mẹ hoặc cây này không thuộc về bạn."
        );
    }


    /*
    ------------------------------------------
    KHÔNG LAI CHÍNH NÓ
    ------------------------------------------
    */

    if (
        Number(parent1.id) ===
        Number(parent2.id)
    ) {

        throw new Error(
            "Không thể lai một cây với chính nó."
        );
    }


    /*
    ------------------------------------------
    PHẢI TRƯỞNG THÀNH
    ------------------------------------------
    */

    if (
        !Plant.isReady(
            parent1
        )
    ) {

        throw new Error(
            `${parent1.emoji || "🌱"} ${parent1.name || "Cây"} #${String(parent1.id).padStart(4, "0")} chưa trưởng thành.`
        );
    }


    if (
        !Plant.isReady(
            parent2
        )
    ) {

        throw new Error(
            `${parent2.emoji || "🌱"} ${parent2.name || "Cây"} #${String(parent2.id).padStart(4, "0")} chưa trưởng thành.`
        );
    }


    return {

        parent1,

        parent2
    };
}


/*
==================================================
GET PARENT GENES
==================================================
*/

function getParentGenes(
    parent1,
    parent2
) {

    const genes1 =
        Gene.getPlantGenes(
            parent1.id
        );

    const genes2 =
        Gene.getPlantGenes(
            parent2.id
        );


    if (
        !Array.isArray(genes1) ||
        genes1.length === 0
    ) {

        throw new Error(
            `Cây #${String(parent1.id).padStart(4, "0")} chưa có dữ liệu Gene.`
        );
    }


    if (
        !Array.isArray(genes2) ||
        genes2.length === 0
    ) {

        throw new Error(
            `Cây #${String(parent2.id).padStart(4, "0")} chưa có dữ liệu Gene.`
        );
    }


    return {

        genes1,

        genes2
    };
}


/*
==================================================
GET GENE BY TYPE
==================================================
*/

function getGeneByType(
    genes,
    type
) {

    if (
        !Array.isArray(genes)
    ) {

        return null;
    }

    return genes.find(
        gene =>
            gene.gene_type === type
    ) || null;
}


/*
==================================================
CHOOSE ALLELE
==================================================
*/

function chooseAllele(
    gene
) {

    if (!gene) {

        return null;
    }


    const alleleA =
        gene.allele_a ||
        gene.gene_code ||
        null;

    const alleleB =
        gene.allele_b ||
        gene.gene_code ||
        null;


    if (
        !alleleA &&
        !alleleB
    ) {

        return null;
    }


    if (!alleleA) {

        return alleleB;
    }


    if (!alleleB) {

        return alleleA;
    }


    return Math.random() < 0.5
        ? alleleA
        : alleleB;
}


/*
==================================================
GET GENE BASE VALUE
==================================================
*/

function getGeneBaseValue(
    gene,
    allele
) {

    if (!gene) {

        return 0;
    }


    const value =
        Number(
            gene.gene_value
        ) || 0;


    /*
    Gene cũ chưa có allele riêng.
    Dùng gene_value trực tiếp.
    */

    if (!allele) {

        return value;
    }


    return value;
}


/*
==================================================
GET DOMINANCE
==================================================
*/

function calculateDominance(
    gene1,
    gene2,
    childAlleleA,
    childAlleleB
) {

    /*
    ------------------------------------------
    Nếu hai allele giống nhau
    ------------------------------------------
    */

    if (
        childAlleleA &&
        childAlleleB &&
        childAlleleA === childAlleleB
    ) {

        /*
        Nếu bố/mẹ có dominance thì ưu tiên
        trạng thái dominant nếu một bên có.
        */

        if (
            gene1 &&
            gene1.dominance === "dominant"
        ) {

            return "dominant";
        }


        if (
            gene2 &&
            gene2.dominance === "dominant"
        ) {

            return "dominant";
        }


        /*
        Cùng allele nhưng không có dominant
        */

        return "recessive";
    }


    /*
    ------------------------------------------
    Khác allele
    ------------------------------------------
    */

    const candidates = [];


    if (gene1) {

        candidates.push(
            gene1.dominance
        );
    }


    if (gene2) {

        candidates.push(
            gene2.dominance
        );
    }


    /*
    Có dominant thì ưu tiên dominant.
    */

    if (
        candidates.includes(
            "dominant"
        )
    ) {

        return "dominant";
    }


    return "recessive";
}


/*
==================================================
GET DOMINANT / RECESSIVE ALLELE
==================================================
*/

function calculateAlleleDominance(
    alleleA,
    alleleB,
    dominance
) {

    if (
        !alleleA &&
        !alleleB
    ) {

        return {

            dominantAllele:
                null,

            recessiveAllele:
                null
        };
    }


    /*
    ------------------------------------------
    Hai allele giống nhau
    ------------------------------------------
    */

    if (
        alleleA === alleleB
    ) {

        return {

            dominantAllele:
                alleleA,

            recessiveAllele:
                alleleA
        };
    }


    /*
    ------------------------------------------
    Dominant
    ------------------------------------------
    */

    if (
        dominance === "dominant"
    ) {

        return {

            dominantAllele:
                alleleA,

            recessiveAllele:
                alleleB
        };
    }


    /*
    ------------------------------------------
    Recessive
    ------------------------------------------
    */

    return {

        dominantAllele:
            alleleB,

        recessiveAllele:
            alleleA
    };
}


/*
==================================================
CREATE CHILD GENE DATA
==================================================
*/

function createChildGeneData(
    gene1,
    gene2
) {

    if (
        !gene1 &&
        !gene2
    ) {

        return null;
    }


    /*
    ==========================================
    ALLELE TỪ BỐ
    ==========================================
    */

    const alleleFromParent1 =
        chooseAllele(
            gene1
        );


    /*
    ==========================================
    ALLELE TỪ MẸ
    ==========================================
    */

    const alleleFromParent2 =
        chooseAllele(
            gene2
        );


    /*
    ==========================================
    NẾU CHỈ CÓ MỘT BÊN
    ==========================================
    */

    const alleleA =
        alleleFromParent1 ||
        alleleFromParent2 ||
        null;

    const alleleB =
        alleleFromParent2 ||
        alleleFromParent1 ||
        null;


    /*
    ==========================================
    INHERITED GENE
    ==========================================
    */

    const inherited =
        gene1 && gene2

            ? (
                Math.random() < 0.5
                    ? gene1
                    : gene2
            )

            : (
                gene1 ||
                gene2
            );


    if (!inherited) {

        return null;
    }


    /*
    ==========================================
    BASE DATA
    ==========================================
    */

    let geneType =
        inherited.gene_type;

    let geneCode =
        inherited.gene_code;

    let geneName =
        inherited.gene_name;

    let value =
        Number(
            inherited.gene_value
        ) || 0;

    let mutation =
        Number(
            inherited.mutation
        ) === 1;


    /*
    ==========================================
    VALUE TỪ HAI PARENT
    ==========================================
    */

    if (
        gene1 &&
        gene2
    ) {

        const parentValue1 =
            Number(
                gene1.gene_value
            ) || 0;

        const parentValue2 =
            Number(
                gene2.gene_value
            ) || 0;


        /*
        Con lấy trung bình nhẹ giữa bố/mẹ
        và có biến động nhỏ.
        */

        const average =
            (
                parentValue1 +
                parentValue2
            ) / 2;


        const variation =
            Math.floor(
                Math.random() * 3
            ) - 1;


        value =
            Math.max(
                0,
                Math.round(
                    average
                ) + variation
            );
    }


    /*
    ==========================================
    DOMINANCE
    ==========================================
    */

    const dominance =
        calculateDominance(
            gene1,
            gene2,
            alleleA,
            alleleB
        );


    /*
    ==========================================
    DOMINANT / RECESSIVE ALLELE
    ==========================================
    */

    const alleleInfo =
        calculateAlleleDominance(
            alleleA,
            alleleB,
            dominance
        );


    /*
    ==========================================
    MUTATION
    ==========================================
    */

    if (
        randomChance(
            MUTATION_CHANCE
        )
    ) {

        const bonus =
            Math.floor(
                Math.random() * 6
            ) + 5;


        value +=
            bonus;


        geneCode =
            `${geneCode}_M`;


        geneName =
            `Mutation ${geneName}`;


        mutation =
            true;
    }


    /*
    ==========================================
    RETURN
    ==========================================
    */

    return {

        geneType,

        geneCode,

        geneName,

        value,

        dominance,

        mutation,

        alleleA,

        alleleB,

        dominantAllele:
            alleleInfo.dominantAllele,

        recessiveAllele:
            alleleInfo.recessiveAllele
    };
}


/*
==================================================
CREATE CHILD GENES
==================================================
*/

function createChildGenes(
    childId,
    parent1Genes,
    parent2Genes
) {

    const createdGenes = [];


    for (
        const geneType of
        GENE_TYPES
    ) {

        const gene1 =
            getGeneByType(
                parent1Genes,
                geneType
            );


        const gene2 =
            getGeneByType(
                parent2Genes,
                geneType
            );


        const childGene =
            createChildGeneData(
                gene1,
                gene2
            );


        if (!childGene) {

            continue;
        }


        const result =
            db.prepare(`
                INSERT INTO plant_genes (

                    plant_id,

                    gene_type,

                    gene_code,

                    gene_name,

                    gene_value,

                    dominance,

                    mutation,

                    allele_a,

                    allele_b,

                    dominant_allele,

                    recessive_allele,

                    discovered,

                    discovered_at

                )

                VALUES (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    0,
                    NULL
                )
            `).run(

                childId,

                childGene.geneType,

                childGene.geneCode,

                childGene.geneName,

                childGene.value,

                childGene.dominance,

                childGene.mutation
                    ? 1
                    : 0,

                childGene.alleleA ||
                    "",

                childGene.alleleB ||
                    "",

                childGene.dominantAllele,

                childGene.recessiveAllele
            );


        const gene =
            Gene.getGene(
                result.lastInsertRowid
            );


        createdGenes.push(
            gene
        );
    }


    return createdGenes;
}


/*
==================================================
CHOOSE CHILD SPECIES
==================================================
*/

function chooseChildSpecies(
    parent1,
    parent2
) {

    return Math.random() < 0.5
        ? parent1.species_id
        : parent2.species_id;
}


/*
==================================================
GET CHILD GENERATION
==================================================
*/

function getChildGeneration(
    parent1,
    parent2
) {

    const generation1 =
        Number(
            parent1.generation
        ) || 1;

    const generation2 =
        Number(
            parent2.generation
        ) || 1;


    return (
        Math.max(
            generation1,
            generation2
        ) + 1
    );
}


/*
==================================================
CALCULATE CHILD STATS
==================================================
*/

function calculateChildStats(
    species,
    genes
) {

    const baseVitality =
        Number(
            species.base_vitality
        ) || 0;

    const baseGrowth =
        Number(
            species.base_growth
        ) || 0;

    const baseQuality =
        Number(
            species.base_quality
        ) || 0;

    const baseLuck =
        Number(
            species.base_luck
        ) || 0;


    const effects = {

        vitality: 0,

        growth: 0,

        quality: 0,

        luck: 0
    };


    /*
    ==========================================
    GENE EFFECT
    ==========================================
    */

    for (
        const gene of genes
    ) {

        const value =
            Gene.getEffectiveGeneValue(
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


    /*
    ==========================================
    RANDOM VARIATION
    ==========================================
    */

    const vitality =
        Math.max(
            1,
            baseVitality +
            effects.vitality +
            Math.floor(
                Math.random() * 7
            ) - 3
        );


    const growth =
        Math.max(
            1,
            baseGrowth +
            effects.growth +
            Math.floor(
                Math.random() * 7
            ) - 3
        );


    const quality =
        Math.max(
            1,
            baseQuality +
            effects.quality +
            Math.floor(
                Math.random() * 7
            ) - 3
        );


    const luck =
        Math.max(
            0,
            baseLuck +
            effects.luck +
            Math.floor(
                Math.random() * 3
            ) - 1
        );


    return {

        vitality,

        growth,

        quality,

        luck
    };
}


/*
==================================================
CREATE CHILD PLANT
==================================================
*/

function createChildPlant(
    userId,
    parent1,
    parent2
) {

    const speciesId =
        chooseChildSpecies(
            parent1,
            parent2
        );


    const species =
        Plant.getSpecies(
            speciesId
        );


    if (!species) {

        throw new Error(
            "Không tìm thấy giống cây kế thừa."
        );
    }


    const generation =
        getChildGeneration(
            parent1,
            parent2
        );


    /*
    ==========================================
    TIME
    ==========================================
    */

    const now =
        Date.now();


    const readyAt =
        now +
        Number(
            species.growth_seconds
        ) * 1000;


    /*
    ==========================================
    CREATE BASIC PLANT
    ==========================================
    */

    const result =
        PlantIndividual.create({

            userId,

            speciesId,

            generation,

            vitality:
                1,

            growth:
                1,

            quality:
                1,

            luck:
                0,

            plantedAt:
                new Date(
                    now
                ).toISOString(),

            readyAt:
                new Date(
                    readyAt
                ).toISOString()
        });


    if (!result) {

        throw new Error(
            "Không thể tạo cây con."
        );
    }


    /*
    ==========================================
    GET PARENT GENES
    ==========================================
    */

    const {
        genes1,
        genes2
    } =
        getParentGenes(
            parent1,
            parent2
        );


    /*
    ==========================================
    CREATE CHILD GENES
    ==========================================
    */

    const genes =
        createChildGenes(
            result.id,
            genes1,
            genes2
        );


    if (
        genes.length === 0
    ) {

        throw new Error(
            "Không thể tạo Gene cho cây con."
        );
    }


    /*
    ==========================================
    CALCULATE STATS
    ==========================================
    */

    const stats =
        calculateChildStats(
            species,
            genes
        );


    /*
    ==========================================
    UPDATE STATS
    ==========================================
    */

    PlantIndividual.update(
        result.id,
        {

            vitality:
                stats.vitality,

            growth:
                stats.growth,

            quality:
                stats.quality,

            luck:
                stats.luck
        }
    );


    /*
    ==========================================
    RETURN
    ==========================================
    */

    return Plant.getPlant(
        result.id
    );
}


/*
==================================================
BREED
==================================================
*/

function breed(
    userId,
    parent1Id,
    parent2Id
) {

    /*
    ==========================================
    VALIDATE
    ==========================================
    */

    const {
        parent1,
        parent2
    } =
        validateParents(
            userId,
            parent1Id,
            parent2Id
        );


    /*
    ==========================================
    GET GENES
    ==========================================
    */

    const {
        genes1,
        genes2
    } =
        getParentGenes(
            parent1,
            parent2
        );


    /*
    ==========================================
    GENERATION
    ==========================================
    */

    const generation =
        getChildGeneration(
            parent1,
            parent2
        );


    /*
    ==========================================
    CREATE CHILD
    ==========================================
    */

    const child =
        createChildPlant(
            userId,
            parent1,
            parent2
        );


    if (!child) {

        throw new Error(
            "Không thể tạo cây con."
        );
    }


    /*
    ==========================================
    CREATE BREEDING RECORD
    ==========================================
    */

    const breeding =
        PlantBreeding.create({

            userId,

            parent1Id:
                parent1.id,

            parent2Id:
                parent2.id,

            childId:
                child.id,

            generation
        });


    /*
    ==========================================
    GET CHILD GENES
    ==========================================
    */

    const childGenes =
        Gene.getPlantGenes(
            child.id
        );


    const geneSummary =
        Gene.getGeneSummary(
            child.id
        );


    /*
    ==========================================
    RETURN
    ==========================================
    */

    return {

        breeding,

        parent1,

        parent2,

        child,

        genes:
            childGenes,

        geneSummary,

        generation,

        parentGeneCount: {

            parent1:
                genes1.length,

            parent2:
                genes2.length
        }
    };
}


/*
==================================================
GET BREEDING
==================================================
*/

function getBreeding(
    id
) {

    return PlantBreeding.getDetail(
        id
    );
}


/*
==================================================
GET CHILD PARENTS
==================================================
*/

function getChildParents(
    childId
) {

    const breeding =
        PlantBreeding.getByChildId(
            childId
        );


    if (!breeding) {

        return null;
    }


    return {

        parent1:
            Plant.getPlant(
                breeding.parent_1_id
            ),

        parent2:
            Plant.getPlant(
                breeding.parent_2_id
            ),

        breeding
    };
}


/*
==================================================
GET PARENT CHILDREN
==================================================
*/

function getParentChildren(
    plantId
) {

    const breedings =
        PlantBreeding.getByParentId(
            plantId
        );


    return breedings.map(
        breeding => ({

            breeding,

            child:
                Plant.getPlant(
                    breeding.child_id
                )
        })
    );
}


/*
==================================================
GET USER BREEDING HISTORY
==================================================
*/

function getUserBreedingHistory(
    userId
) {

    return PlantBreeding
        .getByUser(
            userId
        );
}


/*
==================================================
CHECK CAN BREED
==================================================
*/

function canBreed(
    userId,
    parent1Id,
    parent2Id
) {

    try {

        validateParents(
            userId,
            parent1Id,
            parent2Id
        );


        getParentGenes(
            getUserPlant(
                userId,
                parent1Id
            ),

            getUserPlant(
                userId,
                parent2Id
            )
        );


        return {

            canBreed:
                true,

            reason:
                null
        };

    } catch (error) {

        return {

            canBreed:
                false,

            reason:
                error.message
        };
    }
}


/*
==================================================
EXPORT
==================================================
*/

module.exports = {

    breed,

    canBreed,

    getBreeding,

    getChildParents,

    getParentChildren,

    getUserBreedingHistory,

    validateParents,

    getParentGenes,

    getChildGeneration,

    createChildPlant,

    createChildGenes,

    createChildGeneData,

    calculateChildStats,

    chooseAllele,

    calculateDominance,

    calculateAlleleDominance
};