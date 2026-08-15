const fs = require("fs");
const path = require("path");

// ============================================================
// 🌱 NAHIDA FARM
// database/plants.js
//
// DATABASE ADAPTER
// - Đọc dữ liệu từ data/plants.json
// - Giữ logic database hiện tại
// - Bổ sung API tương thích với index.js
// - Hỗ trợ genetics / mutations
// ============================================================


// ============================================================
// DATA PATH
// ============================================================

const DATA_PATH = path.join(
    __dirname,
    "..",
    "data",
    "plants.json"
);


// ============================================================
// INTERNAL DATA
// ============================================================

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
//
// Có thể lấy mutation từ plants.json.
//
// Đồng thời giữ sẵn các mutation mặc định để index.js
// không bị crash nếu plants.json chưa khai báo mutations.
// ============================================================

const DEFAULT_MUTATIONS = {

    golden: {
        id: "golden",
        name: "Golden",
        viName: "Hoàng Kim",
        emoji: "🌟",
        rarity: "legendary",
        yieldMultiplier: 2,
        sellMultiplier: 3,
        chance: 0.01
    },

    rainbow: {
        id: "rainbow",
        name: "Rainbow",
        viName: "Cầu Vồng",
        emoji: "🌈",
        rarity: "mythic",
        yieldMultiplier: 3,
        sellMultiplier: 5,
        chance: 0.005
    },

    crystal: {
        id: "crystal",
        name: "Crystal",
        viName: "Tinh Thể",
        emoji: "💎",
        rarity: "legendary",
        yieldMultiplier: 2.5,
        sellMultiplier: 4,
        chance: 0.008
    },

    lunar: {
        id: "lunar",
        name: "Lunar",
        viName: "Nguyệt",
        emoji: "🌙",
        rarity: "epic",
        yieldMultiplier: 2,
        sellMultiplier: 3,
        chance: 0.02
    },

    divine: {
        id: "divine",
        name: "Divine",
        viName: "Thần Thánh",
        emoji: "✨",
        rarity: "mythic",
        yieldMultiplier: 5,
        sellMultiplier: 10,
        chance: 0.001
    }
};


// ============================================================
// RESOURCES
//
// Giữ để index.js có thể gọi getResource/getAllResources.
// ============================================================

const RESOURCES = {

    apple: {
        id: "apple",
        name: "Apple",
        viName: "Táo",
        emoji: "🍎",
        type: "fruit",
        rarity: "common",
        sellPrice: 12
    },

    sunsettia: {
        id: "sunsettia",
        name: "Sunsettia",
        viName: "Quả Nhật Lạc",
        emoji: "🍊",
        type: "fruit",
        rarity: "common",
        sellPrice: 14
    },

    berry: {
        id: "berry",
        name: "Berry",
        viName: "Quả Mọng",
        emoji: "🫐",
        type: "fruit",
        rarity: "common",
        sellPrice: 10
    },

    mint: {
        id: "mint",
        name: "Mint",
        viName: "Bạc Hà",
        emoji: "🌿",
        type: "herb",
        rarity: "common",
        sellPrice: 10
    },

    mushroom: {
        id: "mushroom",
        name: "Mushroom",
        viName: "Nấm",
        emoji: "🍄",
        type: "mushroom",
        rarity: "common",
        sellPrice: 15
    },

    pinecone: {
        id: "pinecone",
        name: "Pinecone",
        viName: "Quả Thông",
        emoji: "🌰",
        type: "fruit",
        rarity: "common",
        sellPrice: 18
    },

    bamboo: {
        id: "bamboo",
        name: "Bamboo",
        viName: "Tre",
        emoji: "🎋",
        type: "wood",
        rarity: "uncommon",
        sellPrice: 25
    }
};


// ============================================================
// LOAD DATA
// ============================================================

function loadPlants() {

    try {

        if (!fs.existsSync(DATA_PATH)) {

            console.error(
                "❌ Không tìm thấy data/plants.json"
            );

            plants = [];

            return;
        }

        const raw =
            fs.readFileSync(
                DATA_PATH,
                "utf8"
            );

        const data =
            JSON.parse(raw);

        if (!Array.isArray(data)) {

            throw new Error(
                "plants.json phải là Array."
            );
        }

        plants = data;

        console.log(
            `🌱 Loaded ${plants.length} plants.`
        );

    } catch (error) {

        console.error(
            "❌ Plant database error:",
            error
        );

        plants = [];
    }
}


// Load database ngay khi require
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

    const searchId =
        String(id)
            .toLowerCase()
            .trim();

    return plants.find(
        plant =>
            String(plant.id || "")
                .toLowerCase() === searchId
    ) || null;
}


function hasPlant(id) {

    return Boolean(
        getPlant(id)
    );
}


// ============================================================
// SEARCH
// ============================================================

function searchPlants(query) {

    if (!query) {
        return [];
    }

    const text =
        String(query)
            .toLowerCase()
            .trim();

    return plants.filter(
        plant => {

            const id =
                String(
                    plant.id || ""
                ).toLowerCase();

            const name =
                String(
                    plant.name || ""
                ).toLowerCase();

            const nameVi =
                String(
                    plant.nameVi ||
                    plant.viName ||
                    ""
                ).toLowerCase();

            const region =
                String(
                    plant.region || ""
                ).toLowerCase();

            return (
                id.includes(text) ||
                name.includes(text) ||
                nameVi.includes(text) ||
                region.includes(text)
            );
        }
    );
}


// ============================================================
// REGION
// ============================================================

function getPlantsByRegion(region) {

    if (!region) {
        return [];
    }

    const value =
        String(region)
            .toLowerCase()
            .trim();

    return plants.filter(
        plant =>
            String(
                plant.region || ""
            )
                .toLowerCase() === value
    );
}


// ============================================================
// RARITY
// ============================================================

function getPlantsByRarity(rarity) {

    if (rarity === undefined || rarity === null) {
        return [];
    }

    const text =
        String(rarity)
            .toLowerCase()
            .trim();

    return plants.filter(
        plant => {

            const plantRarity =
                String(
                    plant.rarity ?? ""
                ).toLowerCase();

            return (
                plantRarity === text ||
                String(plant.rarity) === text
            );
        }
    );
}


// ============================================================
// LEVEL
// ============================================================

function getAvailablePlants(level) {

    const currentLevel =
        Math.max(
            1,
            Number(level) || 1
        );

    return plants.filter(
        plant => {

            const unlockLevel =
                Number(
                    plant.unlockLevel
                ) || 1;

            return (
                unlockLevel <=
                currentLevel
            );
        }
    );
}


function isPlantUnlocked(
    plantId,
    level
) {

    const plant =
        getPlant(plantId);

    if (!plant) {
        return false;
    }

    const currentLevel =
        Math.max(
            1,
            Number(level) || 1
        );

    const unlockLevel =
        Number(
            plant.unlockLevel
        ) || 1;

    return (
        currentLevel >=
        unlockLevel
    );
}


// ============================================================
// RANDOM PLANT
// ============================================================

function randomPlant(level = 1) {

    const available =
        getAvailablePlants(
            level
        );

    if (
        available.length === 0
    ) {
        return null;
    }

    return available[
        Math.floor(
            Math.random() *
            available.length
        )
    ];
}


// ============================================================
// RANDOM COMMON PLANT
// ============================================================

function randomCommonPlant() {

    const common =
        plants.filter(
            plant => {

                const rarity =
                    String(
                        plant.rarity || ""
                    ).toLowerCase();

                return (
                    rarity === "common" ||
                    rarity === "1"
                );
            }
        );

    if (!common.length) {

        return (
            plants[0] ||
            null
        );
    }

    return common[
        Math.floor(
            Math.random() *
            common.length
        )
    ];
}


// ============================================================
// YIELD
// ============================================================

function getYield(plantId) {

    const plant =
        getPlant(plantId);

    if (!plant) {
        return 0;
    }

    // Trường hợp yield là object:
    //
    // yield: {
    //     min: 2,
    //     max: 5
    // }

    if (
        plant.yield &&
        typeof plant.yield === "object"
    ) {

        const min =
            Number(
                plant.yield.min
            ) || 1;

        const max =
            Number(
                plant.yield.max
            ) || min;

        return Math.floor(
            Math.random() *
            (max - min + 1)
        ) + min;
    }

    // Trường hợp yield là number
    if (
        typeof plant.yield === "number"
    ) {

        return Math.max(
            1,
            Math.floor(
                plant.yield
            )
        );
    }

    return 1;
}


// ============================================================
// COMPATIBILITY
// getPlantYield()
// ============================================================

function getPlantYield(plantId) {

    const plant =
        getPlant(plantId);

    if (!plant) {
        return 1;
    }

    if (
        plant.yield &&
        typeof plant.yield === "object"
    ) {

        const min =
            Number(
                plant.yield.min
            ) || 1;

        return min;
    }

    return Math.max(
        1,
        Number(
            plant.yield
        ) || 1
    );
}


// ============================================================
// GROWTH
// ============================================================

function getGrowthTime(plantId) {

    const plant =
        getPlant(plantId);

    if (!plant) {
        return 300;
    }

    return Math.max(
        1,
        Number(
            plant.growthTime
        ) || 300
    );
}


// Compatibility
function getPlantGrowthTime(plantId) {

    return getGrowthTime(
        plantId
    );
}


// ============================================================
// WATER
// ============================================================

function getWaterCost(plantId) {

    const plant =
        getPlant(plantId);

    if (!plant) {
        return 10;
    }

    return Math.max(
        1,
        Number(
            plant.waterCost
        ) || 10
    );
}


// ============================================================
// SEED PRICE
// ============================================================

function getPlantSeedPrice(plantId) {

    const plant =
        getPlant(plantId);

    if (!plant) {
        return 0;
    }

    return Math.max(
        0,
        Number(
            plant.seedPrice
        ) || 0
    );
}


// ============================================================
// SELL PRICE
// ============================================================

function getSellPrice(plantId) {

    const plant =
        getPlant(plantId);

    if (!plant) {
        return 0;
    }

    return Math.max(
        0,
        Number(
            plant.sellPrice
        ) || 0
    );
}


// Compatibility
function getPlantSellPrice(plantId) {

    return getSellPrice(
        plantId
    );
}


// ============================================================
// XP
// ============================================================

function getFarmXP(plantId) {

    const plant =
        getPlant(plantId);

    if (!plant) {
        return 0;
    }

    return Math.max(
        0,
        Number(
            plant.farmXP
        ) || 0
    );
}


function getProfileXP(plantId) {

    const plant =
        getPlant(plantId);

    if (!plant) {
        return 0;
    }

    return Math.max(
        0,
        Number(
            plant.profileXP
        ) || 0
    );
}


// ============================================================
// GENETICS
// ============================================================

function getGenes(plantId) {

    const plant =
        getPlant(plantId);

    if (!plant) {
        return null;
    }

    return {

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

        beauty:
            Number(
                plant.genes?.beauty
            ) || 0,

        mutation:
            Number(
                plant.genes?.mutation
            ) || 0
    };
}


// ============================================================
// MUTATIONS PER PLANT
// ============================================================

function getMutations(plantId) {

    const plant =
        getPlant(plantId);

    if (!plant) {
        return [];
    }

    if (
        !Array.isArray(
            plant.mutations
        )
    ) {
        return [];
    }

    return [
        ...plant.mutations
    ];
}


// ============================================================
// GET ALL MUTATIONS
//
// Đây là phần sửa lỗi:
// plantDatabase.getAllMutations is not a function
// ============================================================

function getAllMutations() {

    const mutations = {};

    // Lấy mutation từ plants.json
    for (
        const plant of plants
    ) {

        if (
            !Array.isArray(
                plant.mutations
            )
        ) {
            continue;
        }

        for (
            const mutation of plant.mutations
        ) {

            if (
                typeof mutation === "string"
            ) {

                const id =
                    mutation
                        .toLowerCase()
                        .trim();

                if (!mutations[id]) {

                    mutations[id] = {

                        id,

                        name:
                            mutation,

                        viName:
                            mutation,

                        emoji:
                            "✨",

                        rarity:
                            "rare",

                        yieldMultiplier:
                            1,

                        sellMultiplier:
                            1,

                        chance:
                            0
                    };
                }

                continue;
            }

            if (
                mutation &&
                typeof mutation === "object"
            ) {

                const id =
                    String(
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

    // Bổ sung mutation mặc định
    // nếu plants.json chưa có
    for (
        const [id, mutation]
        of Object.entries(
            DEFAULT_MUTATIONS
        )
    ) {

        if (
            !mutations[id]
        ) {

            mutations[id] = {
                ...mutation
            };
        }
    }

    return Object.values(
        mutations
    );
}


// ============================================================
// GET MUTATION
// ============================================================

function getMutation(id) {

    if (!id) {
        return null;
    }

    const value =
        String(id)
            .toLowerCase()
            .trim();

    const mutations =
        getAllMutations();

    return mutations.find(
        mutation =>
            String(
                mutation.id
            ).toLowerCase() === value
    ) || null;
}


// ============================================================
// MUTATION ROLL
// ============================================================

function rollMutation() {

    const mutations =
        getAllMutations();

    // Sắp xếp mutation hiếm trước
    const sorted =
        [...mutations]
            .sort(
                (a, b) =>
                    Number(a.chance || 0) -
                    Number(b.chance || 0)
            );

    for (
        const mutation of sorted
    ) {

        const chance =
            Number(
                mutation.chance
            ) || 0;

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

    const value =
        String(id)
            .toLowerCase()
            .trim();

    return (
        RESOURCES[value] ||
        null
    );
}


function getAllResources() {

    return Object.values(
        RESOURCES
    );
}


// ============================================================
// DISPLAY
// ============================================================

function getRarityStars(rarity) {

    let value =
        Number(rarity);

    // Nếu rarity là string
    const rarityMap = {

        common: 1,
        uncommon: 2,
        rare: 3,
        epic: 4,
        legendary: 5,
        mythic: 5
    };

    if (
        typeof rarity === "string" &&
        rarityMap[
            rarity.toLowerCase()
        ]
    ) {

        value =
            rarityMap[
                rarity.toLowerCase()
            ];
    }

    value =
        Math.max(
            1,
            Math.min(
                5,
                value || 1
            )
        );

    return (
        "⭐".repeat(value)
    );
}


function getPlantDisplay(
    plantId
) {

    const plant =
        getPlant(plantId);

    if (!plant) {
        return null;
    }

    return {

        id:
            plant.id,

        name:
            plant.name,

        nameVi:
            plant.nameVi ||
            plant.viName,

        emoji:
            plant.emoji ||
            "🌱",

        region:
            plant.region,

        rarity:
            plant.rarity,

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
            getGenes(
                plant.id
            ),

        mutations:
            getMutations(
                plant.id
            ),

        unlockLevel:
            plant.unlockLevel,

        description:
            plant.description
    };
}


// ============================================================
// FORMAT PLANT
// ============================================================

function formatPlant(id) {

    const plant =
        getPlant(id);

    if (!plant) {

        return (
            "🌱 Cây không xác định"
        );
    }

    const emoji =
        plant.emoji ||
        "🌱";

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

    for (
        const plant of plants
    ) {

        if (!plant.id) {

            errors.push(
                "Plant thiếu id."
            );

            continue;
        }

        if (!plant.name) {

            errors.push(
                `${plant.id}: thiếu name`
            );
        }

        if (
            !plant.nameVi &&
            !plant.viName
        ) {

            errors.push(
                `${plant.id}: thiếu nameVi`
            );
        }

        if (!plant.emoji) {

            errors.push(
                `${plant.id}: thiếu emoji`
            );
        }

        if (
            plant.growthTime === undefined
        ) {

            errors.push(
                `${plant.id}: thiếu growthTime`
            );
        }

        if (
            plant.yield === undefined
        ) {

            errors.push(
                `${plant.id}: thiếu yield`
            );
        }

        if (!plant.genes) {

            errors.push(
                `${plant.id}: thiếu genes`
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

    // Data
    plants,

    RARITY,
    ELEMENT,
    REGION,

    RESOURCES,
    DEFAULT_MUTATIONS,

    // Loading
    loadPlants,
    reloadPlants,

    // Plants
    getAllPlants,
    getPlant,
    hasPlant,
    searchPlants,

    // Filter
    getPlantsByRegion,
    getPlantsByRarity,
    getAvailablePlants,
    isPlantUnlocked,

    // Random
    randomPlant,
    randomCommonPlant,

    // Farm
    getYield,
    getPlantYield,

    getGrowthTime,
    getPlantGrowthTime,

    getWaterCost,

    getPlantSeedPrice,

    getSellPrice,
    getPlantSellPrice,

    // XP
    getFarmXP,
    getProfileXP,

    // Genetics
    getGenes,

    // Mutation
    getMutations,
    getAllMutations,
    getMutation,
    rollMutation,

    // Resources
    getResource,
    getAllResources,

    // Display
    getRarityStars,
    getPlantDisplay,
    formatPlant,

    // Validate
    validatePlants
};