const fs = require("fs");
const path = require("path");

// ============================================================
// ðŸŒ± NAHIDA FARM
// src/database/plants.js
// ============================================================

const DATA_PATH = path.join(
    __dirname,
    "..",
    "..",
    "data",
    "plants.json"

);

let plants = [];

// ============================================================
// RARITY
// ============================================================

const RARITY = {
    COMMON: "common",
    UNCOMMON: "uncommon",
    RARE: "rare",
    EPIC: "epic",
    LEGENDARY: "legendary",
    MYTHIC: "mythic"
};

// ============================================================
// ELEMENT
// ============================================================

const ELEMENT = {
    NONE: "none",
    ANEMO: "anemo",
    GEO: "geo",
    ELECTRO: "electro",
    DENDRO: "dendro",
    HYDRO: "hydro",
    PYRO: "pyro",
    CRYO: "cryo"
};

// ============================================================
// REGION
// ============================================================

const REGION = {
    MONDSTADT: "Mondstadt",
    LIYUE: "Liyue",
    INAZUMA: "Inazuma",
    SUMERU: "Sumeru",
    FONTAINE: "Fontaine",
    NATLAN: "Natlan",
    NOD_KRAI: "Nod-Krai"
};

// ============================================================
// MUTATIONS
// ============================================================

const DEFAULT_MUTATIONS = {
    golden: {
        id: "golden",
        name: "Golden",
        viName: "HoÃ ng Kim",
        emoji: "ðŸŒŸ",
        rarity: "legendary",
        yieldMultiplier: 2,
        sellMultiplier: 3,
        chance: 0.01
    },

    rainbow: {
        id: "rainbow",
        name: "Rainbow",
        viName: "Cáº§u Vá»“ng",
        emoji: "ðŸŒˆ",
        rarity: "mythic",
        yieldMultiplier: 3,
        sellMultiplier: 5,
        chance: 0.005
    },

    crystal: {
        id: "crystal",
        name: "Crystal",
        viName: "Tinh Thá»ƒ",
        emoji: "ðŸ’Ž",
        rarity: "legendary",
        yieldMultiplier: 2.5,
        sellMultiplier: 4,
        chance: 0.008
    },

    lunar: {
        id: "lunar",
        name: "Lunar",
        viName: "Nguyá»‡t",
        emoji: "ðŸŒ™",
        rarity: "epic",
        yieldMultiplier: 2,
        sellMultiplier: 3,
        chance: 0.02
    },

    divine: {
        id: "divine",
        name: "Divine",
        viName: "Tháº§n ThÃ¡nh",
        emoji: "âœ¨",
        rarity: "mythic",
        yieldMultiplier: 5,
        sellMultiplier: 10,
        chance: 0.001
    }
};

// ============================================================
// RESOURCES
// ============================================================

const RESOURCES = {
    apple: {
        id: "apple",
        name: "Apple",
        viName: "TÃ¡o",
        emoji: "ðŸŽ",
        type: "fruit",
        rarity: "common",
        sellPrice: 12
    },

    sunsettia: {
        id: "sunsettia",
        name: "Sunsettia",
        viName: "Quáº£ Nháº­t Láº¡c",
        emoji: "ðŸŠ",
        type: "fruit",
        rarity: "common",
        sellPrice: 14
    },

    berry: {
        id: "berry",
        name: "Berry",
        viName: "Quáº£ Má»ng",
        emoji: "ðŸ«",
        type: "fruit",
        rarity: "common",
        sellPrice: 10
    },

    mint: {
        id: "mint",
        name: "Mint",
        viName: "Báº¡c HÃ ",
        emoji: "ðŸŒ¿",
        type: "herb",
        rarity: "common",
        sellPrice: 10
    },

    mushroom: {
        id: "mushroom",
        name: "Mushroom",
        viName: "Náº¥m",
        emoji: "ðŸ„",
        type: "mushroom",
        rarity: "common",
        sellPrice: 15
    },

    pinecone: {
        id: "pinecone",
        name: "Pinecone",
        viName: "Quáº£ ThÃ´ng",
        emoji: "ðŸŒ°",
        type: "fruit",
        rarity: "common",
        sellPrice: 18
    },

    bamboo: {
        id: "bamboo",
        name: "Bamboo",
        viName: "Tre",
        emoji: "ðŸŽ‹",
        type: "wood",
        rarity: "uncommon",
        sellPrice: 25
    }
};

// ============================================================
// LOAD
// ============================================================

function loadPlants() {
    try {
        if (!fs.existsSync(DATA_PATH)) {
            console.error(
                `âŒ KhÃ´ng tÃ¬m tháº¥y: ${DATA_PATH}`
            );

            plants = [];
            return;
        }

        const raw = fs.readFileSync(
            DATA_PATH,
            "utf8"
        );

        const data = JSON.parse(raw);

        if (!Array.isArray(data)) {
            throw new Error(
                "data/plants.json pháº£i lÃ  Array."
            );
        }

        plants = data;

        console.log(
            `ðŸŒ± Loaded ${plants.length} plants.`
        );

    } catch (error) {
        console.error(
            "âŒ Plant database error:",
            error
        );

        plants = [];
    }
}

loadPlants();

// ============================================================
// BASIC
// ============================================================

function getAllPlants() {
    return plants;
}

function getPlant(id) {
    if (!id) {
        return null;
    }

    const searchId = String(id)
        .toLowerCase()
        .trim();

    return plants.find(
        plant =>
            String(plant.id || "")
                .toLowerCase()
                .trim() === searchId
    ) || null;
}

function hasPlant(id) {
    return Boolean(getPlant(id));
}

// ============================================================
// SEARCH
// ============================================================

function searchPlants(query) {
    if (!query) {
        return [];
    }

    const text = String(query)
        .toLowerCase()
        .trim();

    return plants.filter(plant => {
        const id = String(
            plant.id || ""
        ).toLowerCase();

        const name = String(
            plant.name || ""
        ).toLowerCase();

        const nameVi = String(
            plant.nameVi ||
            plant.viName ||
            ""
        ).toLowerCase();

        const region = String(
            plant.region || ""
        ).toLowerCase();

        return (
            id.includes(text) ||
            name.includes(text) ||
            nameVi.includes(text) ||
            region.includes(text)
        );
    });
}

// ============================================================
// FILTER
// ============================================================

function getPlantsByRegion(region) {
    if (!region) {
        return [];
    }

    const value = String(region)
        .toLowerCase()
        .trim();

    return plants.filter(
        plant =>
            String(plant.region || "")
                .toLowerCase()
                .trim() === value
    );
}

function getPlantsByRarity(rarity) {
    if (rarity === undefined || rarity === null) {
        return [];
    }

    const text = String(rarity)
        .toLowerCase()
        .trim();

    return plants.filter(
        plant =>
            String(plant.rarity || "")
                .toLowerCase()
                .trim() === text
    );
}

function getAvailablePlants(level) {
    const currentLevel = Math.max(
        1,
        Number(level) || 1
    );

    return plants.filter(plant => {
        const unlockLevel =
            Number(plant.unlockLevel) || 1;

        return unlockLevel <= currentLevel;
    });
}

function isPlantUnlocked(plantId, level) {
    const plant = getPlant(plantId);

    if (!plant) {
        return false;
    }

    const currentLevel = Math.max(
        1,
        Number(level) || 1
    );

    const unlockLevel =
        Number(plant.unlockLevel) || 1;

    return currentLevel >= unlockLevel;
}

// ============================================================
// RANDOM
// ============================================================

function randomPlant(level = 1) {
    const available =
        getAvailablePlants(level);

    if (!available.length) {
        return null;
    }

    return available[
        Math.floor(
            Math.random() * available.length
        )
    ];
}

function randomCommonPlant() {
    const common = plants.filter(plant => {
        const rarity =
            String(
                plant.rarity || ""
            ).toLowerCase();

        return (
            rarity === "common" ||
            rarity === "1"
        );
    });

    if (!common.length) {
        return plants[0] || null;
    }

    return common[
        Math.floor(
            Math.random() * common.length
        )
    ];
}

// ============================================================
// FARM
// ============================================================

function getYield(plantId) {
    const plant = getPlant(plantId);

    if (!plant) {
        return 0;
    }

    if (
        plant.yield &&
        typeof plant.yield === "object"
    ) {
        const min =
            Number(plant.yield.min) || 1;

        const max =
            Number(plant.yield.max) || min;

        return Math.floor(
            Math.random() *
            (max - min + 1)
        ) + min;
    }

    return Math.max(
        1,
        Number(plant.yield) || 1
    );
}

function getPlantYield(plantId) {
    const plant = getPlant(plantId);

    if (!plant) {
        return 1;
    }

    if (
        plant.yield &&
        typeof plant.yield === "object"
    ) {
        return Math.max(
            1,
            Number(plant.yield.min) || 1
        );
    }

    return Math.max(
        1,
        Number(plant.yield) || 1
    );
}

function getGrowthTime(plantId) {
    const plant = getPlant(plantId);

    if (!plant) {
        return 300;
    }

    return Math.max(
        1,
        Number(plant.growthTime) || 300
    );
}

function getPlantGrowthTime(plantId) {
    return getGrowthTime(plantId);
}

function getWaterCost(plantId) {
    const plant = getPlant(plantId);

    if (!plant) {
        return 10;
    }

    return Math.max(
        1,
        Number(plant.waterCost) || 10
    );
}

function getPlantSeedPrice(plantId) {
    const plant = getPlant(plantId);

    if (!plant) {
        return 0;
    }

    return Math.max(
        0,
        Number(plant.seedPrice) || 0
    );
}

function getSellPrice(plantId) {
    const plant = getPlant(plantId);

    if (!plant) {
        return 0;
    }

    return Math.max(
        0,
        Number(plant.sellPrice) || 0
    );
}

function getPlantSellPrice(plantId) {
    return getSellPrice(plantId);
}

// ============================================================
// XP
// ============================================================

function getFarmXP(plantId) {
    const plant = getPlant(plantId);

    if (!plant) {
        return 0;
    }

    return Math.max(
        0,
        Number(plant.farmXP) || 0
    );
}

function getProfileXP(plantId) {
    const plant = getPlant(plantId);

    if (!plant) {
        return 0;
    }

    return Math.max(
        0,
        Number(plant.profileXP) || 0
    );
}

// ============================================================
// GENETICS
// ============================================================

function getGenes(plantId) {
    const plant = getPlant(plantId);

    if (!plant) {
        return null;
    }

    const genes = plant.genes || {};

    return {
        growth:
            Number(genes.growth) || 0,

        yield:
            Number(genes.yield) || 0,

        water:
            Number(genes.water) || 0,

        rarity:
            Number(genes.rarity) || 0,

        beauty:
            Number(genes.beauty) || 0,

        mutation:
            Number(genes.mutation) || 0
    };
}

// ============================================================
// MUTATIONS
// ============================================================

function getMutations(plantId) {
    const plant = getPlant(plantId);

    if (
        !plant ||
        !Array.isArray(plant.mutations)
    ) {
        return [];
    }

    return [...plant.mutations];
}

function getAllMutations() {
    const mutations = {};

    for (const plant of plants) {
        if (!Array.isArray(plant.mutations)) {
            continue;
        }

        for (const mutation of plant.mutations) {
            if (typeof mutation === "string") {
                const id = mutation
                    .toLowerCase()
                    .trim();

                if (!mutations[id]) {
                    mutations[id] = {
                        id,
                        name: mutation,
                        viName: mutation,
                        emoji: "âœ¨",
                        rarity: "rare",
                        yieldMultiplier: 1,
                        sellMultiplier: 1,
                        chance: 0
                    };
                }

                continue;
            }

            if (
                mutation &&
                typeof mutation === "object"
            ) {
                const id = String(
                    mutation.id ||
                    mutation.name ||
                    ""
                )
                    .toLowerCase()
                    .trim();

                if (id) {
                    mutations[id] = {
                        ...mutation,
                        id
                    };
                }
            }
        }
    }

    for (
        const [id, mutation]
        of Object.entries(DEFAULT_MUTATIONS)
    ) {
        if (!mutations[id]) {
            mutations[id] = {
                ...mutation
            };
        }
    }

    return Object.values(mutations);
}

function getMutation(id) {
    if (!id) {
        return null;
    }

    const value = String(id)
        .toLowerCase()
        .trim();

    return getAllMutations().find(
        mutation =>
            String(mutation.id)
                .toLowerCase() === value
    ) || null;
}

function rollMutation() {
    const mutations = getAllMutations();

    const sorted = [...mutations].sort(
        (a, b) =>
            Number(b.chance || 0) -
            Number(a.chance || 0)
    );

    for (const mutation of sorted) {
        const chance =
            Number(mutation.chance) || 0;

        if (
            chance > 0 &&
            Math.random() < chance
        ) {
            return mutation;
        }
    }

    return null;
}

// ============================================================
// RESOURCES
// ============================================================

function getResource(id) {
    if (!id) {
        return null;
    }

    const value = String(id)
        .toLowerCase()
        .trim();

    return RESOURCES[value] || null;
}

function getAllResources() {
    return Object.values(RESOURCES);
}

// ============================================================
// DISPLAY
// ============================================================

function getRarityStars(rarity) {
    const map = {
        common: 1,
        uncommon: 2,
        rare: 3,
        epic: 4,
        legendary: 5,
        mythic: 5
    };

    let value;

    if (typeof rarity === "string") {
        value =
            map[rarity.toLowerCase()];
    } else {
        value = Number(rarity);
    }

    value = Math.max(
        1,
        Math.min(
            5,
            value || 1
        )
    );

    return "â­".repeat(value);
}

function getPlantDisplay(plantId) {
    const plant = getPlant(plantId);

    if (!plant) {
        return null;
    }

    return {
        id: plant.id,

        name: plant.name,

        nameVi:
            plant.nameVi ||
            plant.viName,

        emoji:
            plant.emoji ||
            "ðŸŒ±",

        region: plant.region,

        rarity: plant.rarity,

        rarityText:
            getRarityStars(
                plant.rarity
            ),

        growthTime:
            plant.growthTime,

        waterCost:
            plant.waterCost,

        yield:
            plant.yield,

        sellPrice:
            plant.sellPrice,

        seedPrice:
            plant.seedPrice,

        farmXP:
            plant.farmXP,

        profileXP:
            plant.profileXP,

        color:
            plant.color,

        genes:
            getGenes(plant.id),

        mutations:
            getMutations(plant.id),

        unlockLevel:
            plant.unlockLevel,

        description:
            plant.description
    };
}

function formatPlant(id) {
    const plant = getPlant(id);

    if (!plant) {
        return "ðŸŒ± CÃ¢y khÃ´ng xÃ¡c Ä‘á»‹nh";
    }

    const emoji =
        plant.emoji || "ðŸŒ±";

    const name =
        plant.nameVi ||
        plant.viName ||
        plant.name ||
        plant.id;

    return `${emoji} ${name}`;
}

// ============================================================
// VALIDATE
// ============================================================

function validatePlants() {
    const errors = [];

    for (const plant of plants) {
        if (!plant.id) {
            errors.push("Plant thiáº¿u id.");
            continue;
        }

        if (!plant.name) {
            errors.push(
                `${plant.id}: thiáº¿u name`
            );
        }

        if (
            !plant.nameVi &&
            !plant.viName
        ) {
            errors.push(
                `${plant.id}: thiáº¿u nameVi`
            );
        }

        if (!plant.emoji) {
            errors.push(
                `${plant.id}: thiáº¿u emoji`
            );
        }

        if (
            plant.growthTime === undefined
        ) {
            errors.push(
                `${plant.id}: thiáº¿u growthTime`
            );
        }

        if (
            plant.yield === undefined
        ) {
            errors.push(
                `${plant.id}: thiáº¿u yield`
            );
        }

        if (!plant.genes) {
            errors.push(
                `${plant.id}: thiáº¿u genes`
            );
        }
    }

    return errors;
}

// ============================================================
// RELOAD
// ============================================================

function reloadPlants() {
    loadPlants();
    return plants;
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    get plants() {
        return plants;
    },

    RARITY,
    ELEMENT,
    REGION,

    RESOURCES,
    DEFAULT_MUTATIONS,

    loadPlants,
    reloadPlants,

    getAllPlants,
    getPlant,
    hasPlant,
    searchPlants,

    getPlantsByRegion,
    getPlantsByRarity,
    getAvailablePlants,
    isPlantUnlocked,

    randomPlant,
    randomCommonPlant,

    getYield,
    getPlantYield,

    getGrowthTime,
    getPlantGrowthTime,

    getWaterCost,

    getPlantSeedPrice,

    getSellPrice,
    getPlantSellPrice,

    getFarmXP,
    getProfileXP,

    getGenes,

    getMutations,
    getAllMutations,
    getMutation,
    rollMutation,

    getResource,
    getAllResources,

    getRarityStars,
    getPlantDisplay,
    formatPlant,

    validatePlants
};
