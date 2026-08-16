const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");

const { db } = require("../db");

const plantDatabase =
    require("../../database/plants");

const {
    COLORS,
    BREED_COST,
    BREED_COOLDOWN_MS
} = require("../config");

const {
    now,
    formatTime
} = require("../utils/time");

const {
    getUser,
    updateUser
} = require("./user");

const {
    getItemCount,
    getInventory,
    addItem
} = require("./inventory");

const {
    getPlant,
    isHybridPlant,
    plantName,
    plantEmoji,
    plantGrowth,
    plantYield,
    plantWaterCost,
    plantSellPrice
} = require("./plants");

const {
    farmEmbed
} = require("../ui/embeds");


// ============================================================
// CONSTANTS
// ============================================================

// Gene trong database của cây gốc: 10 -> 100
// Khi tính toán sẽ chuyển về 0.1 -> 1.0.
const GENE_MIN = 10;
const GENE_MAX = 100;

// Gene hybrid không được phép tăng vô hạn.
const HYBRID_GENE_MIN = 15;
const HYBRID_GENE_MAX = 100;

// Chỉ số cuối cùng cũng có giới hạn.
const MAX_GROWTH_TIME = 7200;
const MIN_GROWTH_TIME = 60;

const MAX_YIELD = 8;
const MIN_YIELD = 1;

const MAX_WATER = 60;
const MIN_WATER = 5;

const MAX_SELL_PRICE = 5000;
const MIN_SELL_PRICE = 1;


// ============================================================
// HELPERS
// ============================================================

function clamp(
    value,
    min,
    max
) {
    return Math.min(
        max,
        Math.max(
            min,
            value
        )
    );
}


function round(
    value,
    decimals = 0
) {
    const factor =
        Math.pow(
            10,
            decimals
        );

    return Math.round(
        value * factor
    ) / factor;
}


// ============================================================
// GENETICS
// ============================================================

function getGeneValue(
    plant,
    type
) {

    if (!plant) {
        return 50;
    }

    // Hybrid lấy gene trực tiếp từ database.
    if (
        isHybridPlant(
            plant.id
        )
    ) {

        const map = {
            growth:
                "growth_gene",

            yield:
                "yield_gene",

            water:
                "water_gene",

            rarity:
                "rarity_gene",

            mutation:
                "mutation_gene"
        };

        return clamp(
            Number(
                plant[
                    map[type]
                ]
            ) || 50,
            HYBRID_GENE_MIN,
            HYBRID_GENE_MAX
        );
    }

    // Cây gốc lấy gene từ database/plants.js.
    if (
        typeof plantDatabase.getGenes ===
        "function"
    ) {

        const genes =
            plantDatabase.getGenes(
                plant.id
            );

        if (
            genes &&
            genes[type] !== undefined
        ) {

            return clamp(
                Number(
                    genes[type]
                ) || 50,
                GENE_MIN,
                GENE_MAX
            );
        }
    }

    return 50;
}


// ============================================================
// GENE NORMALIZATION
// ============================================================

function normalizeGene(
    value
) {

    return clamp(
        Number(value) / 100,
        0.1,
        1
    );
}


// ============================================================
// DISPLAY GENETICS
// ============================================================

function geneticsEmbed(
    user
) {

    const data =
        getUser(user);

    let plants = [];

    if (
        typeof plantDatabase.getAvailablePlants ===
        "function"
    ) {

        plants =
            plantDatabase
                .getAvailablePlants(
                    data.level
                )
                .slice(
                    0,
                    10
                );
    }

    const hybrids =
        db.prepare(`
            SELECT *
            FROM bred_plants
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 10
        `).all(
            user.id
        );

    const lines = [

        `\`${user.username}\` — **Lv.${data.level}**`,

        "",

        "🧬 **GENETICS**",

        "> Gene càng cao thì khả năng tương ứng càng tốt.",

        "> Gene được giới hạn để tránh chỉ số tăng vô hạn.",

        "> Lai nhiều đời sẽ có xu hướng ổn định quanh gene của bố mẹ.",

        ""
    ];

    for (
        const plant of
        [
            ...plants,
            ...hybrids
        ].slice(0, 15)
    ) {

        lines.push(
            `${plantEmoji(plant)} **${plantName(plant)}**`
        );

        lines.push(
            `> G ${getGeneValue(plant, "growth").toFixed(0)} • ` +
            `Y ${getGeneValue(plant, "yield").toFixed(0)} • ` +
            `W ${getGeneValue(plant, "water").toFixed(0)} • ` +
            `R ${getGeneValue(plant, "rarity").toFixed(0)} • ` +
            `M ${getGeneValue(plant, "mutation").toFixed(0)}`
        );
    }

    return farmEmbed({
        user,
        title:
            "Genetics",
        description:
            lines.join("\n"),
        color:
            COLORS.purple
    });
}


// ============================================================
// BREED SELECT
// ============================================================

function getBreedablePlants(
    userId
) {

    const items =
        getInventory(
            userId
        );

    return items
        .map(
            item =>
                getPlant(
                    item.item_id
                )
        )
        .filter(Boolean);
}


function breedParentMenu(
    userId,
    parentType,
    selectedParent
) {

    const plants =
        getBreedablePlants(
            userId
        ).slice(
            0,
            25
        );

    if (!plants.length) {
        return null;
    }

    const options =
        plants.map(
            plant => {

                const count =
                    getItemCount(
                        userId,
                        plant.id
                    );

                return {

                    label:
                        `${plantEmoji(plant)} ${plantName(plant)}`
                            .slice(0, 100),

                    description:
                        `Có: ${count} • G ${getGeneValue(plant, "growth").toFixed(0)} • Y ${getGeneValue(plant, "yield").toFixed(0)}`
                            .slice(0, 100),

                    value:
                        plant.id
                };
            }
        );

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                `breed_parent_${parentType}`
            )
            .setPlaceholder(
                parentType === "a"
                    ? "🌱 Chọn cây BỐ..."
                    : "🌱 Chọn cây MẸ..."
            )
            .addOptions(
                options
            );

    const rows = [

        new ActionRowBuilder()
            .addComponents(
                menu
            )
    ];

    if (
        selectedParent
    ) {

        rows.push(

            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            "home_genetics"
                        )
                        .setLabel(
                            "Quay lại"
                        )
                        .setEmoji(
                            "⬅️"
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        )
                )
        );
    }

    return rows;
}


// ============================================================
// BREED STATE
// ============================================================

const breedingSessions =
    new Map();


// ============================================================
// INHERIT GENE
// ============================================================

/*
 * Gene đời con KHÔNG lấy nguyên gene bố/mẹ rồi nhân tiếp.
 *
 * Ví dụ:
 *
 * A = 80
 * B = 90
 *
 * Trung bình = 85
 *
 * Sau đó có variance nhẹ.
 *
 * Và kéo nhẹ về 50 để chống snowball.
 *
 * Nhờ vậy:
 *
 * A + B -> ~85
 * C + D -> ~80-90
 *
 * chứ không thành:
 *
 * 80 -> 6400 -> 512000...
 */

function inheritGene(
    a,
    b,
    variance = 0.08
) {

    const first =
        clamp(
            Number(a) || 50,
            GENE_MIN,
            GENE_MAX
        );

    const second =
        clamp(
            Number(b) || 50,
            GENE_MIN,
            GENE_MAX
        );

    const average =
        (
            first +
            second
        ) / 2;

    // Random nhẹ.
    const randomFactor =
        1 +
        (
            (
                Math.random() * 2
            ) - 1
        ) *
        variance;

    let result =
        average *
        randomFactor;

    /*
     * Regression về 50.
     *
     * Gene càng xa 50 thì càng bị kéo nhẹ về 50.
     * Điều này cực kỳ quan trọng cho breeding nhiều đời.
     */

    result =
        (
            result * 0.85
        ) +
        (
            50 * 0.15
        );

    return round(
        clamp(
            result,
            HYBRID_GENE_MIN,
            HYBRID_GENE_MAX
        ),
        2
    );
}


// ============================================================
// BREED MUTATION
// ============================================================

function rollBreedingMutation(
    mutationGene
) {

    const gene =
        clamp(
            Number(
                mutationGene
            ) || 50,
            0,
            100
        );

    /*
     * Mutation base khoảng 3%.
     *
     * Gene 50 -> khoảng 6%
     * Gene 100 -> khoảng 9%
     *
     * Không cho vượt quá 10%.
     */

    const chance =
        0.03 +
        (
            gene / 100
        ) *
        0.06;

    const roll =
        Math.random();

    /*
     * Legendary:
     * cực hiếm.
     */

    if (
        roll <
        chance * 0.03
    ) {

        return {

            id:
                "legendary",

            name:
                "Legendary Mutation",

            emoji:
                "🌟",

            multiplier:
                1.60
        };
    }

    /*
     * Golden
     */

    if (
        roll <
        chance * 0.18
    ) {

        return {

            id:
                "golden",

            name:
                "Golden Mutation",

            emoji:
                "✨",

            multiplier:
                1.30
        };
    }

    /*
     * Rare
     */

    if (
        roll <
        chance
    ) {

        return {

            id:
                "rare",

            name:
                "Rare Mutation",

            emoji:
                "💜",

            multiplier:
                1.15
        };
    }

    return null;
}


// ============================================================
// HYBRID NAME
// ============================================================

/*
 * Lấy tên "gốc" của hybrid.
 *
 * Ví dụ:
 *
 * Bạc Hà
 * Hoa Ngọt
 *
 * -> ["Bạc Hà", "Hoa Ngọt"]
 *
 * Nếu:
 *
 * (Bạc Hà + Hoa Ngọt) + Bạc Hà
 *
 * -> ["Bạc Hà", "Hoa Ngọt"]
 *
 * Không còn:
 *
 * "Giống Lai Giống Lai Bạc Hà Hoa Ngọt"
 */

function getPlantLineage(
    plant,
    depth = 0
) {

    if (
        !plant ||
        depth > 8
    ) {
        return [];
    }

    if (
        !isHybridPlant(
            plant.id
        )
    ) {

        return [
            plantName(plant)
        ];
    }

    const result = [];

    if (
        plant.parent_a
    ) {

        const parentA =
            getPlant(
                plant.parent_a
            );

        if (parentA) {

            result.push(
                ...getPlantLineage(
                    parentA,
                    depth + 1
                )
            );
        }
    }

    if (
        plant.parent_b
    ) {

        const parentB =
            getPlant(
                plant.parent_b
            );

        if (parentB) {

            result.push(
                ...getPlantLineage(
                    parentB,
                    depth + 1
                )
            );
        }
    }

    /*
     * Nếu hybrid cũ không có parent
     * thì lấy tên nhưng loại prefix.
     */

    if (!result.length) {

        const raw =
            plant.name_vi ||
            plant.name ||
            "Hybrid";

        return [
            cleanHybridName(
                raw
            )
        ];
    }

    return result;
}


function cleanHybridName(
    name
) {

    if (!name) {
        return "Cây Lai";
    }

    return String(name)

        .replace(
            /^Giống Lai\s*/i,
            ""
        )

        .replace(
            /^Lai\s*/i,
            ""
        )

        .trim();
}


function createHybridName(
    parentA,
    parentB
) {

    let lineage = [

        ...getPlantLineage(
            parentA
        ),

        ...getPlantLineage(
            parentB
        )
    ];

    lineage =
        lineage
            .map(
                cleanHybridName
            )
            .filter(Boolean);

    /*
     * Xóa tên trùng.
     *
     * Bạc Hà + Hoa Ngọt + Bạc Hà
     *
     * => Bạc Hà + Hoa Ngọt
     */

    lineage =
        [
            ...new Set(
                lineage
            )
        ];

    /*
     * Không để tên quá dài.
     */

    if (
        lineage.length > 4
    ) {

        lineage =
            lineage.slice(
                0,
                4
            );
    }

    if (
        lineage.length === 0
    ) {

        return {
            name:
                "Hybrid Plant",

            nameVi:
                "Cây Lai"
        };
    }

    if (
        lineage.length === 1
    ) {

        return {

            name:
                `Hybrid ${lineage[0]}`,

            nameVi:
                `Cây Lai ${lineage[0]}`
        };
    }

    return {

        name:
            `Hybrid ${lineage.join(" × ")}`,

        nameVi:
            `Cây Lai ${lineage.join(" × ")}`
    };
}


// ============================================================
// RARITY
// ============================================================

function calculateHybridRarity(
    parentA,
    parentB,
    rarityGene
) {

    const parentRarityA =
        clamp(
            Number(
                parentA.rarity
            ) || 1,
            1,
            5
        );

    const parentRarityB =
        clamp(
            Number(
                parentB.rarity
            ) || 1,
            1,
            5
        );

    const average =
        (
            parentRarityA +
            parentRarityB
        ) / 2;

    /*
     * Gene chỉ ảnh hưởng rất nhẹ.
     *
     * 50 gene = không thay đổi.
     */

    const geneBonus =
        (
            rarityGene -
            50
        ) / 100;

    return round(
        clamp(
            average +
            geneBonus,
            1,
            5
        ),
        2
    );
}


// ============================================================
// CREATE HYBRID
// ============================================================

function createHybridPlant(
    userId,
    parentA,
    parentB
) {

    // --------------------------------------------------------
    // GENES
    // --------------------------------------------------------

    const growthGene =
        inheritGene(
            getGeneValue(
                parentA,
                "growth"
            ),
            getGeneValue(
                parentB,
                "growth"
            )
        );

    const yieldGene =
        inheritGene(
            getGeneValue(
                parentA,
                "yield"
            ),
            getGeneValue(
                parentB,
                "yield"
            )
        );

    const waterGene =
        inheritGene(
            getGeneValue(
                parentA,
                "water"
            ),
            getGeneValue(
                parentB,
                "water"
            )
        );

    const rarityGene =
        inheritGene(
            getGeneValue(
                parentA,
                "rarity"
            ),
            getGeneValue(
                parentB,
                "rarity"
            )
        );

    const mutationGene =
        inheritGene(
            getGeneValue(
                parentA,
                "mutation"
            ),
            getGeneValue(
                parentB,
                "mutation"
            )
        );


    // --------------------------------------------------------
    // MUTATION
    // --------------------------------------------------------

    const mutation =
        rollBreedingMutation(
            mutationGene
        );

    const mutationMultiplier =
        mutation
            ? mutation.multiplier
            : 1;


    // --------------------------------------------------------
    // BASE VALUES
    // --------------------------------------------------------

    const parentGrowthA =
        Math.max(
            MIN_GROWTH_TIME,
            Number(
                plantGrowth(parentA)
            ) || 300
        );

    const parentGrowthB =
        Math.max(
            MIN_GROWTH_TIME,
            Number(
                plantGrowth(parentB)
            ) || 300
        );

    const baseGrowth =
        (
            parentGrowthA +
            parentGrowthB
        ) / 2;


    const parentYieldA =
        plantYield(
            parentA
        );

    const parentYieldB =
        plantYield(
            parentB
        );

    const baseYield =
        (
            (
                Number(parentYieldA?.min) ||
                1
            ) +
            (
                Number(parentYieldB?.min) ||
                1
            )
        ) / 2;

    const baseYieldMax =
        (
            (
                Number(parentYieldA?.max) ||
                1
            ) +
            (
                Number(parentYieldB?.max) ||
                1
            )
        ) / 2;


    const baseWater =
        (
            (
                Number(
                    plantWaterCost(
                        parentA
                    )
                ) ||
                10
            ) +
            (
                Number(
                    plantWaterCost(
                        parentB
                    )
                ) ||
                10
            )
        ) / 2;


    const baseSell =
        (
            (
                Number(
                    plantSellPrice(
                        parentA
                    )
                ) ||
                1
            ) +
            (
                Number(
                    plantSellPrice(
                        parentB
                    )
                ) ||
                1
            )
        ) / 2;


    // --------------------------------------------------------
    // NORMALIZED GENES
    // --------------------------------------------------------

    const growthFactor =
        normalizeGene(
            growthGene
        );

    const yieldFactor =
        normalizeGene(
            yieldGene
        );

    const waterFactor =
        normalizeGene(
            waterGene
        );

    const rarityFactor =
        normalizeGene(
            rarityGene
        );


    // --------------------------------------------------------
    // GROWTH
    // --------------------------------------------------------

    /*
     * Gene 50 = x1.00
     *
     * Gene 100 = nhanh hơn khoảng 20%
     *
     * Gene 10 = chậm hơn khoảng 20%
     *
     * Không bao giờ chia trực tiếp cho gene.
     */

    const growthModifier =
        clamp(
            1.20 -
            (
                growthFactor *
                0.40
            ),
            0.80,
            1.20
        );

    let growthTime =
        Math.round(
            baseGrowth *
            growthModifier
        );

    growthTime =
        clamp(
            growthTime,
            MIN_GROWTH_TIME,
            MAX_GROWTH_TIME
        );


    // --------------------------------------------------------
    // YIELD
    // --------------------------------------------------------

    /*
     * Gene chỉ ảnh hưởng tối đa khoảng ±20%.
     *
     * Mutation thêm tối đa 60%.
     */

    const yieldModifier =
        clamp(
            0.80 +
            (
                yieldFactor *
                0.40
            ),
            0.84,
            1.20
        );

    let yieldMin =
        Math.round(
            baseYield *
            yieldModifier *
            mutationMultiplier
        );

    let yieldMax =
        Math.round(
            baseYieldMax *
            yieldModifier *
            mutationMultiplier
        );

    yieldMin =
        clamp(
            yieldMin,
            MIN_YIELD,
            MAX_YIELD
        );

    yieldMax =
        clamp(
            yieldMax,
            yieldMin,
            MAX_YIELD
        );


    // --------------------------------------------------------
    // WATER
    // --------------------------------------------------------

    /*
     * Gene water cao => tốn ít nước hơn.
     *
     * Chỉ dao động khoảng ±20%.
     */

    const waterModifier =
        clamp(
            1.20 -
            (
                waterFactor *
                0.40
            ),
            0.80,
            1.20
        );

    let waterCost =
        Math.round(
            baseWater *
            waterModifier
        );

    waterCost =
        clamp(
            waterCost,
            MIN_WATER,
            MAX_WATER
        );


    // --------------------------------------------------------
    // SELL PRICE
    // --------------------------------------------------------

    /*
     * Đây là phần quan trọng nhất.
     *
     * KHÔNG:
     *
     * baseSell * rarityGene
     *
     * vì rarityGene 80/90/100 sẽ phá economy.
     *
     * Chỉ lấy giá trung bình bố mẹ.
     *
     * Gene rarity chỉ ảnh hưởng tối đa khoảng ±15%.
     */

    const rarityModifier =
        clamp(
            0.85 +
            (
                rarityFactor *
                0.30
            ),
            0.88,
            1.15
        );

    let sellPrice =
        Math.round(
            baseSell *
            rarityModifier *
            mutationMultiplier
        );

    sellPrice =
        clamp(
            sellPrice,
            MIN_SELL_PRICE,
            MAX_SELL_PRICE
        );


    // --------------------------------------------------------
    // RARITY
    // --------------------------------------------------------

    const rarity =
        calculateHybridRarity(
            parentA,
            parentB,
            rarityGene
        );


    // --------------------------------------------------------
    // NAME
    // --------------------------------------------------------

    const names =
        createHybridName(
            parentA,
            parentB
        );

    const name =
        names.name;

    const nameVi =
        names.nameVi;


    // --------------------------------------------------------
    // ID
    // --------------------------------------------------------

    const id =
        `hybrid_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;


    // --------------------------------------------------------
    // EMOJI
    // --------------------------------------------------------

    let emoji =
        "🌱";

    if (mutation) {

        emoji =
            mutation.emoji;

    } else {

        const emojiA =
            plantEmoji(
                parentA
            );

        const emojiB =
            plantEmoji(
                parentB
            );

        emoji =
            emojiA ||
            emojiB ||
            "🌱";
    }


    // --------------------------------------------------------
    // DATABASE
    // --------------------------------------------------------

    db.prepare(`
        INSERT INTO bred_plants
        (
            id,
            user_id,
            parent_a,
            parent_b,
            name,
            name_vi,
            emoji,
            growth_time,
            yield_min,
            yield_max,
            water_cost,
            sell_price,
            rarity,
            growth_gene,
            yield_gene,
            water_gene,
            rarity_gene,
            mutation_gene,
            mutation_id,
            mutation_name,
            mutation_emoji,
            created_at
        )
        VALUES
        (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
    `).run(

        id,

        userId,

        parentA.id,

        parentB.id,

        name,

        nameVi,

        emoji,

        growthTime,

        yieldMin,

        yieldMax,

        waterCost,

        sellPrice,

        rarity,

        growthGene,

        yieldGene,

        waterGene,

        rarityGene,

        mutationGene,

        mutation
            ? mutation.id
            : null,

        mutation
            ? mutation.name
            : null,

        mutation
            ? mutation.emoji
            : null,

        now()
    );


    // --------------------------------------------------------
    // ADD TO INVENTORY
    // --------------------------------------------------------

    addItem(
        userId,
        id,
        1
    );


    // --------------------------------------------------------
    // RETURN
    // --------------------------------------------------------

    return {

        id,

        name,

        nameVi,

        emoji,

        growthTime,

        yieldMin,

        yieldMax,

        waterCost,

        sellPrice,

        rarity,

        growthGene,

        yieldGene,

        waterGene,

        rarityGene,

        mutationGene,

        mutation
    };
}


// ============================================================
// BREED PROCESS
// ============================================================

async function breedPlants(
    interaction,
    parentAId,
    parentBId
) {

    const user =
        getUser(
            interaction.user
        );


    // --------------------------------------------------------
    // SAME PARENT
    // --------------------------------------------------------

    if (
        parentAId ===
        parentBId
    ) {

        return interaction.reply({

            content:
                "❌ Cây bố và cây mẹ phải là hai cây khác nhau.",

            ephemeral:
                true
        });
    }


    // --------------------------------------------------------
    // GET PARENTS
    // --------------------------------------------------------

    const parentA =
        getPlant(
            parentAId
        );

    const parentB =
        getPlant(
            parentBId
        );


    if (
        !parentA ||
        !parentB
    ) {

        return interaction.reply({

            content:
                "❌ Không tìm thấy cây bố hoặc cây mẹ.",

            ephemeral:
                true
        });
    }


    // --------------------------------------------------------
    // INVENTORY
    // --------------------------------------------------------

    if (
        getItemCount(
            interaction.user.id,
            parentA.id
        ) <= 0
    ) {

        return interaction.reply({

            content:
                `❌ Bạn không còn **${plantName(parentA)}**.`,

            ephemeral:
                true
        });
    }


    if (
        getItemCount(
            interaction.user.id,
            parentB.id
        ) <= 0
    ) {

        return interaction.reply({

            content:
                `❌ Bạn không còn **${plantName(parentB)}**.`,

            ephemeral:
                true
        });
    }


    // --------------------------------------------------------
    // COOLDOWN
    // --------------------------------------------------------

    const last =
        breedingSessions.get(
            interaction.user.id
        );


    if (
        last &&
        now() -
        last <
        BREED_COOLDOWN_MS
    ) {

        const remaining =
            Math.ceil(
                (
                    BREED_COOLDOWN_MS -
                    (
                        now() -
                        last
                    )
                ) /
                1000
            );


        return interaction.reply({

            content:
                `⏳ Bạn cần chờ **${formatTime(remaining)}** trước khi lai tiếp.`,

            ephemeral:
                true
        });
    }


    // --------------------------------------------------------
    // MORA
    // --------------------------------------------------------

    if (
        user.mora <
        BREED_COST
    ) {

        return interaction.reply({

            content:
                `❌ Cần **${BREED_COST} Mora** để lai.`,

            ephemeral:
                true
        });
    }


    // --------------------------------------------------------
    // TRANSACTION
    // --------------------------------------------------------

    const transaction =
        db.transaction(() => {

            const freshUser =
                getUser(
                    interaction.user.id
                );


            if (
                freshUser.mora <
                BREED_COST
            ) {

                throw new Error(
                    "NOT_ENOUGH_MORA"
                );
            }


            if (
                getItemCount(
                    interaction.user.id,
                    parentA.id
                ) <= 0 ||
                getItemCount(
                    interaction.user.id,
                    parentB.id
                ) <= 0
            ) {

                throw new Error(
                    "NO_PARENT"
                );
            }


            updateUser(
                interaction.user.id,
                {
                    mora:
                        freshUser.mora -
                        BREED_COST
                }
            );


            addItem(
                interaction.user.id,
                parentA.id,
                -1
            );


            addItem(
                interaction.user.id,
                parentB.id,
                -1
            );
        });


    try {

        transaction();

    } catch (error) {

        if (
            error.message ===
            "NOT_ENOUGH_MORA"
        ) {

            return interaction.reply({

                content:
                    "❌ Bạn không đủ Mora.",

                ephemeral:
                    true
            });
        }


        if (
            error.message ===
            "NO_PARENT"
        ) {

            return interaction.reply({

                content:
                    "❌ Một trong hai cây không còn trong túi.",

                ephemeral:
                    true
            });
        }


        throw error;
    }


    // --------------------------------------------------------
    // CREATE CHILD
    // --------------------------------------------------------

    let child;


    try {

        child =
            createHybridPlant(
                interaction.user.id,
                parentA,
                parentB
            );

    } catch (error) {

        /*
         * Rollback nếu tạo hybrid lỗi.
         */

        addItem(
            interaction.user.id,
            parentA.id,
            1
        );

        addItem(
            interaction.user.id,
            parentB.id,
            1
        );

        updateUser(
            interaction.user.id,
            {
                mora:
                    getUser(
                        interaction.user.id
                    ).mora +
                    BREED_COST
            }
        );

        throw error;
    }


    // --------------------------------------------------------
    // COOLDOWN SAVE
    // --------------------------------------------------------

    breedingSessions.set(
        interaction.user.id,
        now()
    );


    // --------------------------------------------------------
    // RESULT
    // --------------------------------------------------------

    const result = [

        `${parentA.emoji || "🌱"} **${plantName(parentA)}**`,

        "        🧬 +",

        `${parentB.emoji || "🌱"} **${plantName(parentB)}**`,

        "",

        "        ↓",

        "",

        `${child.emoji} **${child.nameVi}**`,

        "",

        `> ⭐ Độ hiếm: **${child.rarity.toFixed(2)} / 5**`,

        `> 🧬 Gene: G ${child.growthGene.toFixed(0)} • Y ${child.yieldGene.toFixed(0)} • W ${child.waterGene.toFixed(0)} • R ${child.rarityGene.toFixed(0)} • M ${child.mutationGene.toFixed(0)}`,

        `> ⏱️ Sinh trưởng: **${formatTime(child.growthTime)}**`,

        `> 🌾 Sản lượng: **${child.yieldMin}–${child.yieldMax}**`,

        `> 💧 Nước: **${child.waterCost}**`,

        `> 💰 Bán: **${child.sellPrice.toLocaleString()} Mora**`,

        "",

        `> 🎒 Cây con đã được thêm vào túi.`
    ];


    // --------------------------------------------------------
    // MUTATION RESULT
    // --------------------------------------------------------

    if (
        child.mutation
    ) {

        result.push(

            "",

            `> ${child.mutation.emoji} **${child.mutation.name}!**`,

            `> ✨ Multiplier ×${child.mutation.multiplier}`
        );
    }


    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return interaction.reply({

        embeds: [

            farmEmbed({

                user:
                    interaction.user,

                title:
                    "🧬 Lai Tạo Thành Công",

                description:
                    result.join("\n"),

                color:
                    COLORS.purple
            })
        ],

        components: [

            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            "home_inventory"
                        )
                        .setLabel(
                            "Túi đồ"
                        )
                        .setEmoji(
                            "🎒"
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "home_genetics"
                        )
                        .setLabel(
                            "Lai tiếp"
                        )
                        .setEmoji(
                            "🧬"
                        )
                        .setStyle(
                            ButtonStyle.Primary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "home_farm"
                        )
                        .setLabel(
                            "Nông trại"
                        )
                        .setEmoji(
                            "🌱"
                        )
                        .setStyle(
                            ButtonStyle.Success
                        )
                )
        ]
    });
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    getGeneValue,

    geneticsEmbed,

    getBreedablePlants,

    breedParentMenu,

    breedingSessions,

    inheritGene,

    rollBreedingMutation,

    createHybridPlant,

    breedPlants
};