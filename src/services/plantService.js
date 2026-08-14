const PlantIndividual =
    require("../database/models/PlantIndividual");

const db =
    require("../database/database");

const Gene =
    require("./geneService");


/*
==================================================
PLANT SPECIES
==================================================
*/

function getSpecies(id) {

    return db
        .prepare(`
            SELECT *
            FROM plant_species
            WHERE id = ?
        `)
        .get(id);
}


function getSpeciesList() {

    return db
        .prepare(`
            SELECT *
            FROM plant_species
            ORDER BY rarity ASC, name ASC
        `)
        .all();
}


/*
==================================================
CREATE PLANT INDIVIDUAL
==================================================
*/

function createPlant(
    userId,
    speciesId
) {

    const species =
        getSpecies(speciesId);

    if (!species) {

        throw new Error(
            "Không tìm thấy giống cây."
        );
    }


    const now =
        Date.now();


    const readyAt =
        now +
        species.growth_seconds * 1000;


    /*
    ==============================================
    RANDOM INDIVIDUAL STATS
    ==============================================
    */

    const vitality =
        Math.max(
            1,
            species.base_vitality +
            Math.floor(
                Math.random() * 11
            ) -
            5
        );


    const growth =
        Math.max(
            1,
            species.base_growth +
            Math.floor(
                Math.random() * 11
            ) -
            5
        );


    const quality =
        Math.max(
            1,
            species.base_quality +
            Math.floor(
                Math.random() * 11
            ) -
            5
        );


    const luck =
        Math.max(
            0,
            species.base_luck +
            Math.floor(
                Math.random() * 5
            ) -
            2
        );


    /*
    ==============================================
    CREATE INDIVIDUAL
    ==============================================
    */

    const individual =
        PlantIndividual.create({

            userId,

            speciesId,

            generation:
                1,

            vitality,

            growth,

            quality,

            luck,

            plantedAt:
                new Date(
                    now
                ).toISOString(),

            readyAt:
                new Date(
                    readyAt
                ).toISOString()
        });


    /*
    ==============================================
    CREATE GENES
    ==============================================
    */

    Gene.createGenesForPlant(
        individual.id
    );


    /*
    ==============================================
    RETURN PLANT
    ==============================================
    */

    return getPlant(
        individual.id
    );
}


/*
==================================================
GET PLANT
==================================================
*/

function getPlant(
    id
) {

    const plant =
        PlantIndividual.getById(
            id
        );

    if (!plant) {

        return null;
    }


    const species =
        getSpecies(
            plant.species_id
        );

    if (!species) {

        return null;
    }


    return {

        ...plant,

        name:
            species.name,

        emoji:
            species.emoji,

        rarity:
            species.rarity,

        growth_seconds:
            species.growth_seconds,

        sell_price:
            species.sell_price
    };
}


/*
==================================================
GET USER PLANTS
==================================================
*/

function getUserPlants(
    userId
) {

    return PlantIndividual
        .getByUser(userId)
        .map(
            plant => {

                const species =
                    getSpecies(
                        plant.species_id
                    );


                return {

                    ...plant,

                    name:
                        species?.name,

                    emoji:
                        species?.emoji,

                    rarity:
                        species?.rarity,

                    growth_seconds:
                        species?.growth_seconds,

                    sell_price:
                        species?.sell_price
                };
            }
        );
}
/*
==================================================
GET INVENTORY
==================================================

Inventory chứa toàn bộ Plant Individual của user.

Cây đang trồng vẫn nằm trong inventory.
Farm chỉ giữ plant_id để xác định cây đang
nằm ở ô nào.
==================================================
*/

function getInventory(userId) {

    return getUserPlants(userId);
}

/*
==================================================
PLANT ON PLOT
==================================================
*/

function plantOnPlot(
    userId,
    slot,
    speciesId
) {

    const plot =
        db
            .prepare(`
                SELECT *
                FROM farm_plots
                WHERE user_id = ?
                AND slot = ?
            `)
            .get(
                userId,
                slot
            );


    if (!plot) {

        throw new Error(
            "Ô đất không tồn tại."
        );
    }


    if (!plot.unlocked) {

        throw new Error(
            "Ô đất này chưa được mở khóa."
        );
    }


    if (plot.plant_id) {

        throw new Error(
            "Ô đất này đang có cây."
        );
    }


    const plant =
        createPlant(
            userId,
            speciesId
        );


    db.prepare(`
        UPDATE farm_plots
        SET plant_id = ?
        WHERE user_id = ?
        AND slot = ?
    `).run(

        plant.id,

        userId,

        slot
    );


    return getPlant(
        plant.id
    );
}


/*
==================================================
READY
==================================================
*/

function isReady(
    plant
) {

    if (!plant) {

        return false;
    }


    const readyAt =
        new Date(
            plant.ready_at
        ).getTime();


    return (
        Date.now() >=
        readyAt
    );
}


/*
==================================================
GROWTH INFO
==================================================
*/

function getGrowthInfo(
    plant
) {

    if (!plant) {

        return {

            remaining:
                0,

            progress:
                0,

            ready:
                false
        };
    }


    const now =
        Date.now();


    const plantedAt =
        new Date(
            plant.planted_at
        ).getTime();


    const readyAt =
        new Date(
            plant.ready_at
        ).getTime();


    const total =
        Math.max(
            1,
            readyAt -
            plantedAt
        );


    const remaining =
        Math.max(
            0,
            readyAt -
            now
        );


    const progress =
        Math.min(
            100,
            Math.floor(
                (
                    (
                        total -
                        remaining
                    ) /
                    total
                ) *
                100
            )
        );


    return {

        remaining,

        progress,

        ready:
            remaining <= 0
    };
}


/*
==================================================
PROGRESS BAR
==================================================
*/

function createProgressBar(
    progress,
    length = 16
) {

    progress =
        Math.max(
            0,
            Math.min(
                100,
                Number(progress) || 0
            )
        );


    const filled =
        Math.floor(
            (
                progress /
                100
            ) *
            length
        );


    return (
        "█".repeat(
            filled
        ) +
        "░".repeat(
            length -
            filled
        )
    );
}


/*
==================================================
GET BASE STATS
==================================================

Đây là chỉ số thật được lưu trong database.

KHÔNG cộng Gene ở đây.
==================================================
*/

function getBaseStats(
    plant
) {

    if (!plant) {

        return {

            vitality:
                0,

            growth:
                0,

            quality:
                0,

            luck:
                0
        };
    }


    return {

        vitality:
            Number(
                plant.vitality
            ) || 0,

        growth:
            Number(
                plant.growth
            ) || 0,

        quality:
            Number(
                plant.quality
            ) || 0,

        luck:
            Number(
                plant.luck
            ) || 0
    };
}


/*
==================================================
GET FINAL STATS
==================================================

Base Stats
    +
Gene Effects
    =
Final Stats

Gene không được ghi ngược vào database.

Điều này tránh lỗi:

Mở cây
→ cộng Gene
→ mở lại
→ cộng tiếp
→ stat tăng vô hạn.
==================================================
*/

function getFinalStats(
    plantId
) {

    const plant =
        getPlant(
            plantId
        );


    if (!plant) {

        return {

            vitality:
                0,

            growth:
                0,

            quality:
                0,

            luck:
                0,

            geneEffects: {

                vitality:
                    0,

                growth:
                    0,

                quality:
                    0,

                luck:
                    0
            }
        };
    }


    const base =
        getBaseStats(
            plant
        );


    let effects = {

        vitality:
            0,

        growth:
            0,

        quality:
            0,

        luck:
            0
    };


    try {

        effects =
            Gene.getGeneEffects(
                plant.id
            );

    } catch (error) {

        console.error(
            "Gene effects error:",
            error
        );
    }


    return {

        vitality:
            Math.max(
                0,
                base.vitality +
                Number(
                    effects.vitality
                || 0)
            ),

        growth:
            Math.max(
                0,
                base.growth +
                Number(
                    effects.growth
                || 0)
            ),

        quality:
            Math.max(
                0,
                base.quality +
                Number(
                    effects.quality
                || 0)
            ),

        luck:
            Math.max(
                0,
                base.luck +
                Number(
                    effects.luck
                || 0)
            ),

        geneEffects:
            effects
    };
}


/*
==================================================
GET STAT DETAIL
==================================================

Dùng cho UI nâng cao.

Ví dụ:

❤️ Vitality
Base: 42
Gene: +12
Final: 54
==================================================
*/

function getStatDetails(
    plantId
) {

    const plant =
        getPlant(
            plantId
        );


    if (!plant) {

        return null;
    }


    const base =
        getBaseStats(
            plant
        );


    const finalStats =
        getFinalStats(
            plantId
        );


    return {

        vitality: {

            base:
                base.vitality,

            gene:
                finalStats.geneEffects
                    .vitality,

            final:
                finalStats.vitality
        },


        growth: {

            base:
                base.growth,

            gene:
                finalStats.geneEffects
                    .growth,

            final:
                finalStats.growth
        },


        quality: {

            base:
                base.quality,

            gene:
                finalStats.geneEffects
                    .quality,

            final:
                finalStats.quality
        },


        luck: {

            base:
                base.luck,

            gene:
                finalStats.geneEffects
                    .luck,

            final:
                finalStats.luck
        }
    };
}


/*
==================================================
WATER PLANT
==================================================
*/

function waterPlant(
    userId,
    slot
) {

    const plot =
        db
            .prepare(`
                SELECT *
                FROM farm_plots
                WHERE user_id = ?
                AND slot = ?
            `)
            .get(
                userId,
                slot
            );


    if (
        !plot ||
        !plot.plant_id
    ) {

        throw new Error(
            "Ô đất này không có cây."
        );
    }


    const plant =
        getPlant(
            plot.plant_id
        );


    if (!plant) {

        throw new Error(
            "Không tìm thấy cây."
        );
    }


    if (plant.watered) {

        throw new Error(
            "Cây này đã được tưới."
        );
    }


    /*
    ------------------------------------------
    TĂNG GROWTH BASE
    ------------------------------------------
    */

    PlantIndividual.update(
        plant.id,
        {

            watered:
                1,

            growth:
                Number(
                    plant.growth
                ) +
                5
        }
    );


    return getPlant(
        plant.id
    );
}


/*
==================================================
HARVEST
==================================================
*/

function harvestPlant(
    userId,
    slot
) {

    const plot =
        db
            .prepare(`
                SELECT *
                FROM farm_plots
                WHERE user_id = ?
                AND slot = ?
            `)
            .get(
                userId,
                slot
            );


    if (
        !plot ||
        !plot.plant_id
    ) {

        throw new Error(
            "Ô đất này không có cây."
        );
    }


    const plant =
        getPlant(
            plot.plant_id
        );


    if (!plant) {

        throw new Error(
            "Không tìm thấy cây."
        );
    }


    if (!isReady(plant)) {

        throw new Error(
            "Cây chưa trưởng thành."
        );
    }


    /*
    ==========================================
    LẤY FINAL STATS TRƯỚC KHI THU HOẠCH
    ==========================================
    */

    const finalStats =
        getFinalStats(
            plant.id
        );


    const harvested = {

        ...plant,

        vitality:
            finalStats.vitality,

        growth:
            finalStats.growth,

        quality:
            finalStats.quality,

        luck:
            finalStats.luck,

        base_vitality:
            Number(
                plant.vitality
            ) || 0,

        base_growth:
            Number(
                plant.growth
            ) || 0,

        base_quality:
            Number(
                plant.quality
            ) || 0,

        base_luck:
            Number(
                plant.luck
            ) || 0,

        gene_effects:
            finalStats.geneEffects
    };


    /*
    ==========================================
    CHỈ BỎ CÂY KHỎI PLOT
    ==========================================

    Individual vẫn được giữ trong Collection.
    */

    db.prepare(`
        UPDATE farm_plots
        SET plant_id = NULL
        WHERE user_id = ?
        AND slot = ?
    `).run(
        userId,
        slot
    );


    return harvested;
}


/*
==================================================
PLANT DISPLAY INFO
==================================================
*/

function getPlantDisplayInfo(
    id
) {

    const plant =
        getPlant(
            id
        );


    if (!plant) {

        return null;
    }


    /*
    ==========================================
    GROWTH
    ==========================================
    */

    const growth =
        getGrowthInfo(
            plant
        );


    /*
    ==========================================
    GENE
    ==========================================
    */

    const genes =
        Gene.getPlantGenes(
            plant.id
        );


    const geneSummary =
        Gene.getGeneSummary(
            plant.id
        );


    /*
    ==========================================
    FINAL STATS
    ==========================================
    */

    const finalStats =
        getFinalStats(
            plant.id
        );


    const statDetails =
        getStatDetails(
            plant.id
        );


    /*
    ==========================================
    RETURN
    ==========================================
    */

    return {

        /*
        --------------------------------------
        BASIC
        --------------------------------------
        */

        id:
            plant.id,

        displayId:
            `#${String(
                plant.id
            ).padStart(
                4,
                "0"
            )}`,

        name:
            plant.name,

        emoji:
            plant.emoji,

        rarity:
            plant.rarity,

        generation:
            plant.generation,


        /*
        --------------------------------------
        BASE STATS
        --------------------------------------

        Giữ lại để UI có thể phân biệt
        Base / Gene / Final.
        */

        baseVitality:
            Number(
                plant.vitality
            ) || 0,

        baseGrowth:
            Number(
                plant.growth
            ) || 0,

        baseQuality:
            Number(
                plant.quality
            ) || 0,

        baseLuck:
            Number(
                plant.luck
            ) || 0,


        /*
        --------------------------------------
        FINAL STATS
        --------------------------------------

        Đây là stats nên dùng để hiển thị
        cho người chơi.
        */

        vitality:
            finalStats.vitality,

        growth:
            finalStats.growth,

        quality:
            finalStats.quality,

        luck:
            finalStats.luck,


        /*
        --------------------------------------
        GENE EFFECTS
        --------------------------------------
        */

        geneEffects:
            finalStats.geneEffects,

        statDetails,


        /*
        --------------------------------------
        WATER
        --------------------------------------
        */

        watered:
            Boolean(
                plant.watered
            ),


        /*
        --------------------------------------
        TIME
        --------------------------------------
        */

        plantedAt:
            plant.planted_at,

        readyAt:
            plant.ready_at,

        growthSeconds:
            plant.growth_seconds,


        /*
        --------------------------------------
        SELL
        --------------------------------------
        */

        sellPrice:
            plant.sell_price,


        /*
        --------------------------------------
        GROWTH
        --------------------------------------
        */

        progress:
            growth.progress,

        remaining:
            growth.remaining,

        ready:
            growth.ready,


        /*
        --------------------------------------
        GENES
        --------------------------------------
        */

        genes,

        geneSummary
    };
}


/*
==================================================
GET FINAL SELL VALUE
==================================================

Hiện tại giữ nguyên sell_price của species.

Hàm này được tách riêng để sau này có thể
cho Quality / Luck / Mutation ảnh hưởng
giá bán mà không phải sửa harvest logic.
==================================================
*/

function getFinalSellPrice(
    plantId
) {

    const plant =
        getPlant(
            plantId
        );


    if (!plant) {

        return 0;
    }


    const finalStats =
        getFinalStats(
            plant.id
        );


    /*
    ------------------------------------------
    BASE PRICE
    ------------------------------------------
    */

    const basePrice =
        Number(
            plant.sell_price
        ) || 0;


    /*
    ------------------------------------------
    QUALITY BONUS
    ------------------------------------------

    Hiện tại chưa cộng bonus vào giá.

    Giữ nguyên để tránh thay đổi economy
    của game ngoài ý muốn.
    */

    void finalStats;


    return basePrice;
}
/*
==================================================
INVENTORY
==================================================

Inventory chứa toàn bộ cá thể cây của người chơi.

- Cây đang trồng vẫn tồn tại trong inventory.
- Cây đã thu hoạch vẫn tồn tại trong inventory.
- Cây con từ breeding cũng tồn tại trong inventory.
- farm_plots.plant_id chỉ xác định cây đang nằm trên ô nào.
==================================================
*/

function getInventory(userId) {

    return getUserPlants(userId);
}


/*
==================================================
GET PLANTED PLANTS
==================================================
*/

function getPlantedPlants(userId) {

    const plots = db.prepare(`
        SELECT plant_id
        FROM farm_plots
        WHERE user_id = ?
        AND plant_id IS NOT NULL
    `).all(userId);

    const plantedIds =
        new Set(
            plots.map(
                plot => Number(plot.plant_id)
            )
        );

    return getUserPlants(userId)
        .filter(
            plant =>
                plantedIds.has(
                    Number(plant.id)
                )
        );
}


/*
==================================================
GET UNPLANTED PLANTS
==================================================

Cây có trong Inventory nhưng hiện không nằm
trên bất kỳ ô đất nào.
==================================================
*/

function getUnplantedPlants(userId) {

    const plots = db.prepare(`
        SELECT plant_id
        FROM farm_plots
        WHERE user_id = ?
        AND plant_id IS NOT NULL
    `).all(userId);

    const plantedIds =
        new Set(
            plots.map(
                plot => Number(plot.plant_id)
            )
        );

    return getUserPlants(userId)
        .filter(
            plant =>
                !plantedIds.has(
                    Number(plant.id)
                )
        );
}


/*
==================================================
PLANT EXISTING PLANT
==================================================

Lấy một cá thể đã tồn tại trong Inventory
và đưa nó vào ô đất.

KHÔNG tạo cây mới.
KHÔNG tạo Gene mới.
==================================================
*/

function plantExistingPlant(
    userId,
    plantId,
    slot
) {

    const numericPlantId =
        Number(plantId);

    const numericSlot =
        Number(slot);


    if (
        !Number.isInteger(numericPlantId) ||
        numericPlantId <= 0
    ) {

        throw new Error(
            "ID cây không hợp lệ."
        );
    }


    if (
        !Number.isInteger(numericSlot) ||
        numericSlot <= 0
    ) {

        throw new Error(
            "Ô đất không hợp lệ."
        );
    }


    /*
    ------------------------------------------
    KIỂM TRA CÂY
    ------------------------------------------
    */

    const plant =
        getPlant(
            numericPlantId
        );


    if (!plant) {

        throw new Error(
            "Không tìm thấy cây."
        );
    }


    /*
    ------------------------------------------
    KIỂM TRA OWNER
    ------------------------------------------
    */

    if (
        String(plant.user_id) !==
        String(userId)
    ) {

        throw new Error(
            "Bạn không sở hữu cây này."
        );
    }


    /*
    ------------------------------------------
    KIỂM TRA CÂY ĐÃ ĐƯỢC TRỒNG CHƯA
    ------------------------------------------
    */

    const existingPlot =
        db.prepare(`
            SELECT *
            FROM farm_plots
            WHERE user_id = ?
            AND plant_id = ?
        `).get(
            userId,
            numericPlantId
        );


    if (existingPlot) {

        throw new Error(
            `Cây #${String(numericPlantId).padStart(4, "0")} đang được trồng ở ô ${existingPlot.slot}.`
        );
    }


    /*
    ------------------------------------------
    KIỂM TRA Ô ĐẤT
    ------------------------------------------
    */

    const plot =
        db.prepare(`
            SELECT *
            FROM farm_plots
            WHERE user_id = ?
            AND slot = ?
        `).get(
            userId,
            numericSlot
        );


    if (!plot) {

        throw new Error(
            "Ô đất không tồn tại."
        );
    }


    if (
        plot.unlocked === 0 ||
        plot.unlocked === false
    ) {

        throw new Error(
            "Ô đất này chưa được mở khóa."
        );
    }


    if (plot.plant_id) {

        throw new Error(
            "Ô đất này đang có cây."
        );
    }


    /*
    ------------------------------------------
    ĐƯA CÂY VÀO Ô
    ------------------------------------------
    */

    db.prepare(`
        UPDATE farm_plots
        SET plant_id = ?
        WHERE user_id = ?
        AND slot = ?
    `).run(
        numericPlantId,
        userId,
        numericSlot
    );


    return getPlant(
        numericPlantId
    );
}

/*
==================================================
EXPORT
==================================================
*/

module.exports = {

    getSpecies,
    getSpeciesList,

    createPlant,
    getPlant,
    getUserPlants,
    getInventory,
    plantOnPlot,

    isReady,
    getGrowthInfo,
    createProgressBar,

    getBaseStats,
    getFinalStats,
    getStatDetails,

    waterPlant,
    harvestPlant,

    getPlantDisplayInfo,
    getFinalSellPrice
};