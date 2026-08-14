const db = require("./src/database/database");

const Breeding =
    require("./src/services/breedingService");


/*
==================================================
TEST BREEDING
==================================================
*/

console.log("\n========================================");
console.log("       TEST PLANT BREEDING");
console.log("========================================\n");


/*
==================================================
GET USER
==================================================
*/

const user =
    db.prepare(`
        SELECT id
        FROM users
        ORDER BY rowid ASC
        LIMIT 1
    `).get();


if (!user) {

    console.error(
        "❌ Không tìm thấy user trong database."
    );

    process.exit(1);
}


console.log(
    "User:",
    user.id
);


/*
==================================================
GET READY PLANTS
==================================================
*/

const plants =
    db.prepare(`
        SELECT *
        FROM plant_individuals

        WHERE user_id = ?

        ORDER BY id ASC
    `).all(
        user.id
    );


console.log(
    "\nTổng số cây:",
    plants.length
);


if (
    plants.length < 2
) {

    console.error(
        "❌ Cần ít nhất 2 cây để lai."
    );

    process.exit(1);
}


/*
==================================================
SHOW PLANTS
==================================================
*/

console.log(
    "\n=== PLANTS ==="
);

console.table(
    plants.map(
        plant => ({

            id:
                plant.id,

            species:
                plant.species_id,

            generation:
                plant.generation,

            readyAt:
                plant.ready_at,

            vitality:
                plant.vitality,

            growth:
                plant.growth,

            quality:
                plant.quality,

            luck:
                plant.luck
        })
    )
);


/*
==================================================
CHOOSE PARENTS
==================================================
*/
/*
==================================================
CHOOSE PARENTS WITH GENES
==================================================
*/

const plantsWithGenes =
    plants.filter(
        plant => {

            const count =
                db.prepare(`
                    SELECT COUNT(*) AS count
                    FROM plant_genes
                    WHERE plant_id = ?
                `).get(
                    plant.id
                ).count;

            return Number(count) > 0;
        }
    );


if (
    plantsWithGenes.length < 2
) {

    console.error(
        "❌ Không có đủ 2 cây có Gene để lai."
    );

    process.exit(1);
}


const parent1 =
    plantsWithGenes[0];

const parent2 =
    plantsWithGenes[1];


console.log(
    "\n=== PARENTS ==="
);

console.log(
    `🌱 Parent 1: #${String(parent1.id).padStart(4, "0")}`
);

console.log(
    `🌱 Parent 2: #${String(parent2.id).padStart(4, "0")}`
);


/*
==================================================
CHECK CAN BREED
==================================================
*/

console.log(
    "\n=== CHECK CAN BREED ==="
);

const check =
    Breeding.canBreed(
        user.id,
        parent1.id,
        parent2.id
    );


console.log(
    check
);


if (!check.canBreed) {

    console.error(
        "\n❌ Không thể lai:"
    );

    console.error(
        check.reason
    );

    process.exit(1);
}


console.log(
    "\n✅ Có thể lai."
);


/*
==================================================
BREED
==================================================
*/

console.log(
    "\n=== START BREEDING ==="
);


try {

    const result =
        Breeding.breed(
            user.id,
            parent1.id,
            parent2.id
        );


    console.log(
        "\n========================================"
    );

    console.log(
        "       BREEDING SUCCESS"
    );

    console.log(
        "========================================\n"
    );


    /*
    ------------------------------------------
    PARENTS
    ------------------------------------------
    */

    console.log(
        "Parent 1:",
        `#${String(result.parent1.id).padStart(4, "0")}`
    );

    console.log(
        "Parent 2:",
        `#${String(result.parent2.id).padStart(4, "0")}`
    );


    /*
    ------------------------------------------
    CHILD
    ------------------------------------------
    */

    console.log(
        "\n=== CHILD ==="
    );

    console.table([
        {

            id:
                result.child.id,

            species:
                result.child.species_id,

            generation:
                result.child.generation,

            vitality:
                result.child.vitality,

            growth:
                result.child.growth,

            quality:
                result.child.quality,

            luck:
                result.child.luck
        }
    ]);


    /*
    ------------------------------------------
    GENES
    ------------------------------------------
    */

    console.log(
        "\n=== CHILD GENES ==="
    );

    console.table(
        result.genes.map(
            gene => ({

                id:
                    gene.id,

                plantId:
                    gene.plant_id,

                type:
                    gene.gene_type,

                code:
                    gene.gene_code,

                value:
                    gene.gene_value,

                dominance:
                    gene.dominance,

                mutation:
                    gene.mutation,

                discovered:
                    gene.discovered
            })
        )
    );


    /*
    ------------------------------------------
    SUMMARY
    ------------------------------------------
    */

    console.log(
        "\n=== GENE SUMMARY ==="
    );

    console.table([
        result.geneSummary
    ]);


    /*
    ------------------------------------------
    BREEDING RECORD
    ------------------------------------------
    */

    console.log(
        "\n=== BREEDING RECORD ==="
    );

    console.table([
        result.breeding
    ]);


    /*
    ------------------------------------------
    GENERATION
    ------------------------------------------
    */

    console.log(
        "\nGeneration:",
        result.generation
    );


    /*
    ------------------------------------------
    SUCCESS
    ------------------------------------------
    */

    console.log(
        "\n✅ TEST BREEDING THÀNH CÔNG."
    );


} catch (error) {

    console.error(
        "\n❌ BREEDING ERROR:"
    );

    console.error(
        error
    );

    process.exit(1);
}