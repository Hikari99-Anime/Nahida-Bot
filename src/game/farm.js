// src/game/farm.js
// ========================================
// 🌱 NAHIDA FARM - FARM SYSTEM
// ========================================

const {
    getPlant,
    getAvailablePlants,
    plantYield,
    plantWater,
    plantFarmXP,
    plantProfileXP,
    plantSeedPrice,
} = require("./plants");

// ========================================
// CONSTANTS
// ========================================

const DEFAULT_SLOTS = 6;
const DEFAULT_WATER = 100;
const DEFAULT_MORA = 1000;

// ========================================
// UTILS
// ========================================

function now() {
    return Date.now();
}

function randomInt(min, max) {
    min = Number(min) || 0;
    max = Number(max) || min;

    if (max < min) {
        [min, max] = [max, min];
    }

    return (
        Math.floor(
            Math.random() * (max - min + 1)
        ) + min
    );
}

function clamp(value, min, max) {
    return Math.max(
        min,
        Math.min(max, value)
    );
}

// ========================================
// CREATE FARM
// ========================================

function createFarm(options = {}) {
    const slots =
        Number(options.slots) ||
        DEFAULT_SLOTS;

    const water =
        Number(options.water) >= 0
            ? Number(options.water)
            : DEFAULT_WATER;

    const mora =
        Number(options.mora) >= 0
            ? Number(options.mora)
            : DEFAULT_MORA;

    return {
        level: 1,

        xp: 0,

        mora,

        water,

        maxWater: 100,

        slots: Array.from(
            { length: slots },
            (_, index) => ({
                id: index,
                plantId: null,
                plantedAt: null,
                readyAt: null,
                watered: 0,
                harvested: false,
            })
        ),

        inventory: {},

        statistics: {
            planted: 0,
            harvested: 0,
            sold: 0,
            mutations: 0,
        },

        createdAt: now(),

        updatedAt: now(),
    };
}

// ========================================
// VALIDATE FARM
// ========================================

function normalizeFarm(farm) {
    if (!farm || typeof farm !== "object") {
        return createFarm();
    }

    if (!Array.isArray(farm.slots)) {
        farm.slots = [];
    }

    if (farm.slots.length === 0) {
        farm.slots =
            createFarm().slots;
    }

    if (!farm.inventory) {
        farm.inventory = {};
    }

    if (!farm.statistics) {
        farm.statistics = {
            planted: 0,
            harvested: 0,
            sold: 0,
            mutations: 0,
        };
    }

    farm.level =
        Number(farm.level) || 1;

    farm.xp =
        Number(farm.xp) || 0;

    farm.mora =
        Number(farm.mora) || 0;

    farm.water =
        Number(farm.water) || 0;

    farm.maxWater =
        Number(farm.maxWater) || 100;

    return farm;
}

// ========================================
// LEVEL SYSTEM
// ========================================

function xpRequired(level) {
    level =
        Math.max(
            1,
            Number(level) || 1
        );

    return Math.floor(
        100 *
        Math.pow(level, 1.35)
    );
}

function addXP(farm, amount) {
    farm = normalizeFarm(farm);

    amount =
        Math.max(
            0,
            Number(amount) || 0
        );

    farm.xp += amount;

    let levelUps = 0;

    while (
        farm.xp >=
        xpRequired(farm.level)
    ) {
        farm.xp -=
            xpRequired(farm.level);

        farm.level++;

        levelUps++;
    }

    farm.updatedAt = now();

    return {
        amount,
        level: farm.level,
        xp: farm.xp,
        nextXP:
            xpRequired(farm.level),
        levelUps,
    };
}

// ========================================
// GET SLOT
// ========================================

function getSlot(farm, slotId) {
    farm = normalizeFarm(farm);

    slotId = Number(slotId);

    if (
        !Number.isInteger(slotId) ||
        slotId < 0
    ) {
        return null;
    }

    return (
        farm.slots.find(
            (slot) =>
                slot.id === slotId
        ) || null
    );
}

// ========================================
// EMPTY SLOTS
// ========================================

function getEmptySlots(farm) {
    farm = normalizeFarm(farm);

    return farm.slots.filter(
        (slot) =>
            !slot.plantId
    );
}

// ========================================
// READY SLOTS
// ========================================

function isPlantReady(slot) {
    if (!slot || !slot.plantId) {
        return false;
    }

    if (!slot.readyAt) {
        return false;
    }

    return now() >=
        Number(slot.readyAt);
}

function getReadySlots(farm) {
    farm = normalizeFarm(farm);

    return farm.slots.filter(
        (slot) =>
            isPlantReady(slot)
    );
}

// ========================================
// PLANT
// ========================================

function plantSeed(
    farm,
    slotId,
    plantId
) {
    farm = normalizeFarm(farm);

    const plant =
        getPlant(plantId);

    if (!plant) {
        return {
            success: false,
            error: "PLANT_NOT_FOUND",
            message:
                "Không tìm thấy loại cây.",
        };
    }

    if (
        plant.unlockLevel >
        farm.level
    ) {
        return {
            success: false,
            error: "PLANT_LOCKED",
            message:
                `Bạn cần level ${plant.unlockLevel} để mở khóa cây này.`,
            requiredLevel:
                plant.unlockLevel,
            currentLevel:
                farm.level,
        };
    }

    const slot =
        getSlot(
            farm,
            slotId
        );

    if (!slot) {
        return {
            success: false,
            error: "SLOT_NOT_FOUND",
            message:
                "Không tìm thấy ô đất.",
        };
    }

    if (slot.plantId) {
        return {
            success: false,
            error: "SLOT_OCCUPIED",
            message:
                "Ô đất này đang có cây.",
        };
    }

    const seedPrice =
        plantSeedPrice(plant);

    if (
        farm.mora <
        seedPrice
    ) {
        return {
            success: false,
            error: "NOT_ENOUGH_MORA",
            message:
                "Không đủ Mora để mua hạt giống.",
            required:
                seedPrice,
            current:
                farm.mora,
        };
    }

    farm.mora -= seedPrice;

    const plantedAt = now();

    const readyAt =
        plantedAt +
        plant.growthTime * 1000;

    slot.plantId =
        plant.id;

    slot.plantedAt =
        plantedAt;

    slot.readyAt =
        readyAt;

    slot.watered = 0;

    slot.harvested = false;

    farm.statistics.planted++;

    farm.updatedAt = now();

    return {
        success: true,

        slot,

        plant,

        spent:
            seedPrice,

        plantedAt,

        readyAt,
    };
}

// ========================================
// WATER
// ========================================

function waterPlant(
    farm,
    slotId
) {
    farm = normalizeFarm(farm);

    const slot =
        getSlot(
            farm,
            slotId
        );

    if (!slot) {
        return {
            success: false,
            error: "SLOT_NOT_FOUND",
            message:
                "Không tìm thấy ô đất.",
        };
    }

    if (!slot.plantId) {
        return {
            success: false,
            error: "NO_PLANT",
            message:
                "Ô đất chưa có cây.",
        };
    }

    if (isPlantReady(slot)) {
        return {
            success: false,
            error: "ALREADY_READY",
            message:
                "Cây đã trưởng thành.",
        };
    }

    const plant =
        getPlant(
            slot.plantId
        );

    if (!plant) {
        return {
            success: false,
            error: "PLANT_NOT_FOUND",
            message:
                "Dữ liệu cây không tồn tại.",
        };
    }

    const cost =
        plantWater(plant);

    if (farm.water < cost) {
        return {
            success: false,
            error: "NOT_ENOUGH_WATER",
            message:
                "Không đủ nước.",
            required:
                cost,
            current:
                farm.water,
        };
    }

    farm.water -= cost;

    slot.watered =
        Number(slot.watered || 0) + 1;

    farm.updatedAt = now();

    return {
        success: true,

        slot,

        plant,

        waterCost:
            cost,

        remainingWater:
            farm.water,
    };
}

// ========================================
// REFILL WATER
// ========================================

function refillWater(
    farm,
    amount
) {
    farm = normalizeFarm(farm);

    amount =
        Number(amount);

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        return {
            success: false,
            error: "INVALID_AMOUNT",
            message:
                "Số lượng nước không hợp lệ.",
        };
    }

    const before =
        farm.water;

    farm.water =
        clamp(
            farm.water + amount,
            0,
            farm.maxWater
        );

    farm.updatedAt = now();

    return {
        success: true,
        added:
            farm.water - before,
        water:
            farm.water,
        maxWater:
            farm.maxWater,
    };
}

// ========================================
// MUTATION
// ========================================

function rollMutation(plant) {
    const mutations =
        Array.isArray(
            plant?.mutations
        )
            ? plant.mutations
            : [];

    if (
        mutations.length === 0
    ) {
        return null;
    }

    const gene =
        Number(
            plant.genes?.mutation
        ) || 0;

    const chance =
        clamp(
            gene / 10,
            0,
            25
        );

    const roll =
        Math.random() * 100;

    if (roll >= chance) {
        return null;
    }

    return mutations[
        Math.floor(
            Math.random() *
            mutations.length
        )
    ];
}

// ========================================
// HARVEST
// ========================================

function harvestPlant(
    farm,
    slotId
) {
    farm = normalizeFarm(farm);

    const slot =
        getSlot(
            farm,
            slotId
        );

    if (!slot) {
        return {
            success: false,
            error: "SLOT_NOT_FOUND",
            message:
                "Không tìm thấy ô đất.",
        };
    }

    if (!slot.plantId) {
        return {
            success: false,
            error: "NO_PLANT",
            message:
                "Ô đất không có cây.",
        };
    }

    if (!isPlantReady(slot)) {
        const remaining =
            Math.max(
                0,
                Math.ceil(
                    (
                        Number(
                            slot.readyAt
                        ) -
                        now()
                    ) / 1000
                )
            );

        return {
            success: false,
            error: "NOT_READY",
            message:
                "Cây chưa trưởng thành.",
            remaining,
        };
    }

    const plant =
        getPlant(
            slot.plantId
        );

    if (!plant) {
        return {
            success: false,
            error: "PLANT_NOT_FOUND",
            message:
                "Không tìm thấy dữ liệu cây.",
        };
    }

    const yieldData =
        plantYield(plant);

    let quantity =
        randomInt(
            yieldData.min,
            yieldData.max
        );

    // Water bonus
    const watered =
        Number(slot.watered) || 0;

    if (watered >= 3) {
        quantity++;
    }

    const mutation =
        rollMutation(plant);

    const inventoryKey =
        mutation
            ? `${plant.id}:${mutation}`
            : plant.id;

    if (
        !farm.inventory[
            inventoryKey
        ]
    ) {
        farm.inventory[
            inventoryKey
        ] = {
            plantId:
                plant.id,

            quantity: 0,

            mutation:
                mutation || null,
        };
    }

    farm.inventory[
        inventoryKey
    ].quantity += quantity;

    farm.statistics.harvested +=
        quantity;

    if (mutation) {
        farm.statistics.mutations++;
    }

    const farmXP =
        plantFarmXP(plant);

    const profileXP =
        plantProfileXP(plant);

    const xpResult =
        addXP(
            farm,
            farmXP
        );

    const harvestedPlant = {
        plantId:
            plant.id,

        name:
            plant.name,

        nameVi:
            plant.nameVi,

        emoji:
            plant.emoji,

        quantity,

        mutation:
            mutation || null,

        farmXP,

        profileXP,
    };

    // Reset slot
    slot.plantId = null;
    slot.plantedAt = null;
    slot.readyAt = null;
    slot.watered = 0;
    slot.harvested = true;

    farm.updatedAt = now();

    return {
        success: true,

        harvested:
            harvestedPlant,

        inventory:
            farm.inventory,

        xp:
            xpResult,

        farm,
    };
}

// ========================================
// SELL ONE INVENTORY ITEM
// ========================================

function sellItem(
    farm,
    inventoryKey,
    quantity = 1
) {
    farm = normalizeFarm(farm);

    quantity =
        Math.floor(
            Number(quantity) || 0
        );

    if (quantity <= 0) {
        return {
            success: false,
            error: "INVALID_QUANTITY",
            message:
                "Số lượng bán không hợp lệ.",
        };
    }

    const item =
        farm.inventory[
            inventoryKey
        ];

    if (!item) {
        return {
            success: false,
            error: "ITEM_NOT_FOUND",
            message:
                "Không tìm thấy vật phẩm.",
        };
    }

    if (
        item.quantity <
        quantity
    ) {
        return {
            success: false,
            error: "NOT_ENOUGH_ITEMS",
            message:
                "Không đủ vật phẩm.",
            available:
                item.quantity,
        };
    }

    const plant =
        getPlant(
            item.plantId
        );

    if (!plant) {
        return {
            success: false,
            error: "PLANT_NOT_FOUND",
            message:
                "Không tìm thấy cây.",
        };
    }

    let price =
        Number(
            plant.sellPrice
        ) || 0;

    // Mutation price bonus
    if (item.mutation) {
        const mutationMultiplier = {
            golden: 2,
            shiny: 2,
            lunar: 2.5,
            crystal: 3,
            rainbow: 5,
            wind: 2,
            poison: 2,
            burning: 2.5,
            electro: 3,
            giant: 3,
            divine: 10,
        };

        price *=
            mutationMultiplier[
                item.mutation
            ] || 1;
    }

    price =
        Math.floor(price);

    const total =
        price * quantity;

    item.quantity -=
        quantity;

    if (
        item.quantity <= 0
    ) {
        delete farm.inventory[
            inventoryKey
        ];
    }

    farm.mora += total;

    farm.statistics.sold +=
        quantity;

    farm.updatedAt = now();

    return {
        success: true,

        sold: {
            plantId:
                item.plantId,

            quantity,

            mutation:
                item.mutation || null,

            unitPrice:
                price,

            total,
        },

        mora:
            farm.mora,
    };
}

// ========================================
// SELL ALL
// ========================================

function sellAll(farm) {
    farm = normalizeFarm(farm);

    let totalMora = 0;
    let totalItems = 0;

    const entries =
        Object.entries(
            farm.inventory
        );

    for (
        const [
            key,
            item
        ] of entries
    ) {
        if (!item) continue;

        const result =
            sellItem(
                farm,
                key,
                item.quantity
            );

        if (result.success) {
            totalMora +=
                result.sold.total;

            totalItems +=
                result.sold.quantity;
        }
    }

    return {
        success: true,

        totalMora,

        totalItems,

        mora:
            farm.mora,

        inventory:
            farm.inventory,
    };
}

// ========================================
// FARM STATUS
// ========================================

function getFarmStatus(farm) {
    farm = normalizeFarm(farm);

    const slots =
        farm.slots.map(
            (slot) => {
                if (!slot.plantId) {
                    return {
                        ...slot,
                        status: "empty",
                    };
                }

                const plant =
                    getPlant(
                        slot.plantId
                    );

                const ready =
                    isPlantReady(
                        slot
                    );

                const remaining =
                    ready
                        ? 0
                        : Math.max(
                            0,
                            Math.ceil(
                                (
                                    Number(
                                        slot.readyAt
                                    ) -
                                    now()
                                ) /
                                1000
                            )
                        );

                return {
                    ...slot,

                    plant,

                    status:
                        ready
                            ? "ready"
                            : "growing",

                    remaining,
                };
            }
        );

    return {
        level:
            farm.level,

        xp:
            farm.xp,

        nextXP:
            xpRequired(
                farm.level
            ),

        mora:
            farm.mora,

        water:
            farm.water,

        maxWater:
            farm.maxWater,

        slots,

        inventory:
            farm.inventory,

        statistics:
            farm.statistics,
    };
}

// ========================================
// EXPORT
// ========================================

module.exports = {
    createFarm,
    normalizeFarm,

    xpRequired,
    addXP,

    getSlot,
    getEmptySlots,
    getReadySlots,

    isPlantReady,

    plantSeed,
    waterPlant,
    refillWater,
    harvestPlant,

    sellItem,
    sellAll,

    getFarmStatus,
};