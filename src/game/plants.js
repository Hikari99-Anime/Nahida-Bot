// src/game/plants.js
// ============================================================
// 🌱 NAHIDA FARM - PLANTS DATABASE
// ============================================================

const fs = require("fs");
const path = require("path");

// ============================================================
// DATABASE PATH
// ============================================================

const PLANTS_FILE = path.join(
    process.cwd(),
    "data",
    "plants.json"
);

console.log("========================================");
console.log("[PLANTS] Loading plants database...");
console.log("[PLANTS] CWD:", process.cwd());
console.log("[PLANTS] File:", PLANTS_FILE);
console.log("========================================");

// ============================================================
// LOAD
// ============================================================

let plants = [];

try {

    if (!fs.existsSync(PLANTS_FILE)) {

        console.error(
            `[PLANTS] ❌ Không tìm thấy file: ${PLANTS_FILE}`
        );

    } else {

        const raw =
            fs.readFileSync(
                PLANTS_FILE,
                "utf8"
            );

        const data =
            JSON.parse(raw);

        if (!Array.isArray(data)) {

            throw new Error(
                "plants.json phải chứa một Array"
            );
        }

        plants = data;

        console.log(
            `[PLANTS] ✅ Loaded ${plants.length} plants`
        );
    }

} catch (error) {

    console.error(
        "[PLANTS] ❌ Load error:",
        error
    );

    plants = [];
}

// ============================================================
// NORMALIZE
// ============================================================

plants =
    plants
        .filter(
            (plant) =>
                plant &&
                typeof plant === "object" &&
                plant.id
        )
        .map(
            (plant) => {

                // ====================================================
                // BASIC PRICE
                // ====================================================

                const sellPrice =
                    Number(
                        plant.sellPrice
                    ) || 0;

                // ----------------------------------------
                // Seed price fallback
                // ----------------------------------------

                const fallbackSeedPrice =
                    Math.max(
                        1,
                        Math.ceil(
                            sellPrice * 2
                        )
                    );

                const rawSeedPrice =
                    plant.seedPrice !== undefined
                        ? Number(
                            plant.seedPrice
                        )
                        : fallbackSeedPrice;

                const seedPrice =
                    Number.isFinite(
                        rawSeedPrice
                    )
                        ? Math.max(
                            1,
                            rawSeedPrice
                        )
                        : fallbackSeedPrice;

                // ====================================================
                // 🌱 YIELD BALANCE
                // ====================================================
                //
                // QUAN TRỌNG:
                //
                // Dù plants.json có:
                //
                // yield: {
                //     min: 20,
                //     max: 50
                // }
                //
                // hệ thống game vẫn chỉ cho:
                //
                // 1 -> 3
                //
                // Điều này tránh:
                //
                // 1 hạt -> 50 cây
                // 50 cây -> quá nhiều Mora
                //
                // ====================================================

                const yieldMin = 1;
                const yieldMax = 3;

                // ====================================================
                // GENES
                // ====================================================

                const genes = {

                    growth:
                        Number(
                            plant.genes?.growth
                        ) || 0,

                    yield:
                        Number(
                            plant.genes?.yield
                        ) || 0,

                    water:
                        Number(
                            plant.genes?.water
                        ) || 0,

                    rarity:
                        Number(
                            plant.genes?.rarity
                        ) || 0,

                    mutation:
                        Number(
                            plant.genes?.mutation
                        ) || 0,

                };

                // ====================================================
                // MUTATIONS
                // ====================================================

                const mutations =
                    Array.isArray(
                        plant.mutations
                    )
                        ? plant.mutations
                        : [];

                // ====================================================
                // NORMALIZED PLANT
                // ====================================================

                return {

                    ...plant,

                    // ==================================================
                    // ID
                    // ==================================================

                    id:
                        String(
                            plant.id
                        ),

                    // ==================================================
                    // NAME
                    // ==================================================

                    name:
                        plant.name ||
                        String(
                            plant.id
                        ),

                    nameVi:
                        plant.nameVi ||
                        plant.name ||
                        String(
                            plant.id
                        ),

                    // ==================================================
                    // DISPLAY
                    // ==================================================

                    emoji:
                        plant.emoji ||
                        "🌱",

                    color:
                        plant.color ||
                        "green",

                    description:
                        plant.description ||
                        "Một loại cây trong Nahida Farm.",

                    // ==================================================
                    // REGION
                    // ==================================================

                    region:
                        plant.region ||
                        "Unknown",

                    // ==================================================
                    // RARITY
                    // ==================================================

                    rarity:
                        Math.max(
                            1,
                            Math.min(
                                5,
                                Number(
                                    plant.rarity
                                ) || 1
                            )
                        ),

                    // ==================================================
                    // GROWTH TIME
                    // ==================================================

                    growthTime:
                        Math.max(
                            0,
                            Number(
                                plant.growthTime
                            ) || 300
                        ),

                    // ==================================================
                    // WATER
                    // ==================================================

                    waterCost:
                        Math.max(
                            0,
                            Number(
                                plant.waterCost
                            ) || 0
                        ),

                    // ==================================================
                    // 🌱 YIELD
                    // ==================================================

                    yield: {

                        min:
                            yieldMin,

                        max:
                            yieldMax,

                    },

                    // ==================================================
                    // PRICE
                    // ==================================================

                    sellPrice:
                        Math.max(
                            0,
                            sellPrice
                        ),

                    seedPrice:
                        seedPrice,

                    // ==================================================
                    // XP
                    // ==================================================

                    farmXP:
                        Math.max(
                            0,
                            Number(
                                plant.farmXP
                            ) || 0
                        ),

                    profileXP:
                        Math.max(
                            0,
                            Number(
                                plant.profileXP
                            ) || 0
                        ),

                    // ==================================================
                    // GENES
                    // ==================================================

                    genes:

                        genes,

                    // ==================================================
                    // MUTATIONS
                    // ==================================================

                    mutations:

                        mutations,

                    // ==================================================
                    // UNLOCK
                    // ==================================================

                    unlockLevel:
                        Math.max(
                            1,
                            Number(
                                plant.unlockLevel
                            ) || 1
                        ),

                };
            }
        );

// ============================================================
// MAP
// ============================================================

const plantsById =
    new Map();

for (
    const plant of plants
) {

    plantsById.set(
        plant.id,
        plant
    );
}

// ============================================================
// DATABASE GETTERS
// ============================================================

function getAllPlants() {

    return plants;

}

// ============================================================
// ALIAS
// ============================================================

function getPlants() {

    return getAllPlants();

}

function getPlantList() {

    return getAllPlants();

}

// ============================================================
// GET ONE PLANT
// ============================================================

function getPlant(
    id
) {

    if (!id) {

        return null;

    }

    return (
        plantsById.get(
            String(id)
        ) || null
    );

}

function getPlantById(
    id
) {

    return getPlant(
        id
    );

}

function hasPlant(
    id
) {

    return Boolean(
        getPlant(
            id
        )
    );

}

// ============================================================
// AVAILABLE / UNLOCKED
// ============================================================

function getAvailablePlants(
    level = 1
) {

    level =
        Number(level) || 1;

    return plants.filter(
        (plant) =>
            plant.unlockLevel <= level
    );

}

function getUnlockedPlants(
    level = 1
) {

    return getAvailablePlants(
        level
    );

}

function getLockedPlants(
    level = 1
) {

    level =
        Number(level) || 1;

    return plants.filter(
        (plant) =>
            plant.unlockLevel > level
    );

}

// ============================================================
// REGION
// ============================================================

function getPlantsByRegion(
    region
) {

    if (!region) {

        return [];

    }

    const target =
        String(
            region
        )
            .toLowerCase()
            .trim();

    return plants.filter(
        (plant) =>
            String(
                plant.region
            )
                .toLowerCase()
                .trim() ===
            target
    );

}

// ============================================================
// RARITY
// ============================================================

function getPlantsByRarity(
    rarity
) {

    rarity =
        Number(
            rarity
        );

    return plants.filter(
        (plant) =>
            plant.rarity ===
            rarity
    );

}

// ============================================================
// SHOP
// ============================================================

function getShopPlants(
    level = 1,
    options = {}
) {

    level =
        Number(level) || 1;

    let result =
        getAvailablePlants(
            level
        );

    // ========================================================
    // REGION FILTER
    // ========================================================

    if (
        options.region
    ) {

        const targetRegion =
            String(
                options.region
            )
                .toLowerCase()
                .trim();

        result =
            result.filter(
                (plant) =>
                    String(
                        plant.region
                    )
                        .toLowerCase()
                        .trim() ===
                    targetRegion
            );
    }

    // ========================================================
    // RARITY FILTER
    // ========================================================

    if (
        options.rarity !== undefined &&
        options.rarity !== null
    ) {

        const targetRarity =
            Number(
                options.rarity
            );

        result =
            result.filter(
                (plant) =>
                    plant.rarity ===
                    targetRarity
            );
    }

    // ========================================================
    // LIMIT
    // ========================================================

    if (
        options.limit !== undefined &&
        options.limit !== null
    ) {

        const limit =
            Number(
                options.limit
            );

        if (
            Number.isFinite(
                limit
            ) &&
            limit > 0
        ) {

            result =
                result.slice(
                    0,
                    Math.floor(
                        limit
                    )
                );

        }
    }

    return result;

}

// ============================================================
// PLANT RESOLVER
// ============================================================

function resolvePlant(
    plant
) {

    if (!plant) {

        return null;

    }

    if (
        typeof plant ===
        "string"
    ) {

        return getPlant(
            plant
        );

    }

    if (
        typeof plant ===
        "object"
    ) {

        return plant;

    }

    return null;

}

// ============================================================
// EMOJI
// ============================================================

function plantEmoji(
    plant
) {

    plant =
        resolvePlant(
            plant
        );

    return (
        plant?.emoji ||
        "🌱"
    );

}

// ============================================================
// NAME
// ============================================================

function plantName(
    plant
) {

    plant =
        resolvePlant(
            plant
        );

    return (
        plant?.name ||
        "Unknown Plant"
    );

}

function plantNameVi(
    plant
) {

    plant =
        resolvePlant(
            plant
        );

    return (
        plant?.nameVi ||
        plant?.name ||
        "Không rõ"
    );

}

// ============================================================
// GROWTH
// ============================================================

function plantGrowth(
    plant
) {

    plant =
        resolvePlant(
            plant
        );

    return Number(
        plant?.growthTime
    ) || 0;

}

// ============================================================
// WATER
// ============================================================

function plantWater(
    plant
) {

    plant =
        resolvePlant(
            plant
        );

    return Number(
        plant?.waterCost
    ) || 0;

}

// ============================================================
// SELL PRICE
// ============================================================

function plantSellPrice(
    plant
) {

    plant =
        resolvePlant(
            plant
        );

    return Number(
        plant?.sellPrice
    ) || 0;

}

// ============================================================
// SEED PRICE
// ============================================================

function plantSeedPrice(
    plant
) {

    plant =
        resolvePlant(
            plant
        );

    return Number(
        plant?.seedPrice
    ) || 0;

}

function seedPrice(
    plant
) {

    return plantSeedPrice(
        plant
    );

}

// ============================================================
// RARITY
// ============================================================

function plantRarity(
    plant
) {

    plant =
        resolvePlant(
            plant
        );

    return Number(
        plant?.rarity
    ) || 1;

}

// ============================================================
// UNLOCK LEVEL
// ============================================================

function plantUnlockLevel(
    plant
) {

    plant =
        resolvePlant(
            plant
        );

    return Number(
        plant?.unlockLevel
    ) || 1;

}

// ============================================================
// 🌱 YIELD
// ============================================================
//
// Đây là điểm cân bằng quan trọng.
//
// Mọi cây thường:
//
// 1 hạt giống
//      ↓
//  trồng
//      ↓
//  thu hoạch
//      ↓
//  1–3 sản phẩm
//
// Không có cây thường nào vượt quá 3.
//
// ============================================================

function plantYield(
    plant
) {

    plant =
        resolvePlant(
            plant
        );

    if (!plant) {

        return {

            min: 1,

            max: 1,

        };

    }

    return {

        min: 1,

        max: 3,

    };

}

// ============================================================
// RANDOM YIELD
// ============================================================
//
// Dùng function này nếu farm cần lấy trực tiếp
// số lượng sản phẩm thu hoạch.
//
// Kết quả:
// 1 / 2 / 3
//
// ============================================================

function randomPlantYield(
    plant
) {

    const range =
        plantYield(
            plant
        );

    return (
        Math.floor(
            Math.random() *
            (
                range.max -
                range.min +
                1
            )
        ) +
        range.min
    );

}

// ============================================================
// MUTATIONS
// ============================================================

function plantMutations(
    plant
) {

    plant =
        resolvePlant(
            plant
        );

    return Array.isArray(
        plant?.mutations
    )
        ? plant.mutations
        : [];

}

// ============================================================
// REGION
// ============================================================

function plantRegion(
    plant
) {

    plant =
        resolvePlant(
            plant
        );

    return (
        plant?.region ||
        "Unknown"
    );

}

// ============================================================
// COLOR
// ============================================================

function plantColor(
    plant
) {

    plant =
        resolvePlant(
            plant
        );

    return (
        plant?.color ||
        "green"
    );

}

// ============================================================
// XP
// ============================================================

function plantFarmXP(
    plant
) {

    plant =
        resolvePlant(
            plant
        );

    return Number(
        plant?.farmXP
    ) || 0;

}

function plantProfileXP(
    plant
) {

    plant =
        resolvePlant(
            plant
        );

    return Number(
        plant?.profileXP
    ) || 0;

}

// ============================================================
// DESCRIPTION
// ============================================================

function plantDescription(
    plant
) {

    plant =
        resolvePlant(
            plant
        );

    return (
        plant?.description ||
        ""
    );

}

// ============================================================
// TIME FORMAT
// ============================================================

function formatGrowthTime(
    seconds
) {

    seconds =
        Number(
            seconds
        ) || 0;

    if (
        seconds <= 0
    ) {

        return "Ngay lập tức";

    }

    const hours =
        Math.floor(
            seconds / 3600
        );

    const minutes =
        Math.floor(
            (
                seconds % 3600
            ) / 60
        );

    const secs =
        Math.floor(
            seconds % 60
        );

    const parts = [];

    if (
        hours > 0
    ) {

        parts.push(
            `${hours}h`
        );

    }

    if (
        minutes > 0
    ) {

        parts.push(
            `${minutes}m`
        );

    }

    if (
        secs > 0 &&
        hours === 0
    ) {

        parts.push(
            `${secs}s`
        );

    }

    return (
        parts.join(" ") ||
        "0s"
    );

}

// ============================================================
// RARITY DISPLAY
// ============================================================

function rarityStars(
    rarity
) {

    rarity =
        Math.max(
            1,
            Math.min(
                5,
                Number(
                    rarity
                ) || 1
            )
        );

    return "⭐".repeat(
        Math.floor(
            rarity
        )
    );

}

function rarityName(
    rarity
) {

    rarity =
        Number(
            rarity
        ) || 1;

    const names = {

        1: "Common",

        2: "Uncommon",

        3: "Rare",

        4: "Epic",

        5: "Legendary",

    };

    return (
        names[
            Math.floor(
                rarity
            )
        ] ||
        "Unknown"
    );

}

// ============================================================
// SEARCH
// ============================================================

function searchPlants(
    query
) {

    if (!query) {

        return [];

    }

    const q =
        String(
            query
        )
            .toLowerCase()
            .trim();

    if (!q) {

        return [];

    }

    return plants.filter(
        (plant) =>

            String(
                plant.id
            )
                .toLowerCase()
                .includes(q) ||

            String(
                plant.name
            )
                .toLowerCase()
                .includes(q) ||

            String(
                plant.nameVi
            )
                .toLowerCase()
                .includes(q)

    );

}

// ============================================================
// RANDOM
// ============================================================

function randomPlant(
    list = plants
) {

    if (
        !Array.isArray(
            list
        ) ||
        list.length === 0
    ) {

        return null;

    }

    return list[
        Math.floor(
            Math.random() *
            list.length
        )
    ];

}

function randomAvailablePlant(
    level = 1
) {

    return randomPlant(
        getAvailablePlants(
            level
        )
    );

}

// ============================================================
// DEBUG
// ============================================================

console.log(
    "[PLANTS] Kiểm tra giá hạt giống:"
);

plants
    .slice(
        0,
        10
    )
    .forEach(
        (plant) => {

            console.log(

                `  ${plant.emoji} ` +
                `${plant.id} -> ` +
                `${plant.seedPrice} Mora ` +
                `| Yield ${plant.yield.min}-${plant.yield.max}`

            );

        }
    );

console.log(
    `[PLANTS] Total valid plants: ${plants.length}`
);

console.log(
    "[PLANTS] 🌱 Global harvest yield: 1-3"
);

console.log(
    "========================================"
);

// ============================================================
// EXPORT
// ============================================================

module.exports = {

    // ========================================================
    // DATABASE
    // ========================================================

    plants,

    plantsById,

    // ========================================================
    // MAIN GETTERS
    // ========================================================

    getAllPlants,

    getPlants,

    getPlantList,

    // ========================================================
    // SINGLE PLANT
    // ========================================================

    getPlant,

    getPlantById,

    hasPlant,

    // ========================================================
    // UNLOCK
    // ========================================================

    getAvailablePlants,

    getUnlockedPlants,

    getLockedPlants,

    // ========================================================
    // FILTERS
    // ========================================================

    getPlantsByRegion,

    getPlantsByRarity,

    // ========================================================
    // SHOP
    // ========================================================

    getShopPlants,

    // ========================================================
    // RESOLVE
    // ========================================================

    resolvePlant,

    // ========================================================
    // DISPLAY
    // ========================================================

    plantEmoji,

    plantName,

    plantNameVi,

    // ========================================================
    // STATS
    // ========================================================

    plantGrowth,

    plantWater,

    plantSellPrice,

    plantSeedPrice,

    seedPrice,

    plantRarity,

    plantUnlockLevel,

    plantYield,

    randomPlantYield,

    plantMutations,

    plantRegion,

    plantColor,

    plantFarmXP,

    plantProfileXP,

    plantDescription,

    // ========================================================
    // FORMAT
    // ========================================================

    formatGrowthTime,

    rarityStars,

    rarityName,

    // ========================================================
    // SEARCH
    // ========================================================

    searchPlants,

    // ========================================================
    // RANDOM
    // ========================================================

    randomPlant,

    randomAvailablePlant,

};