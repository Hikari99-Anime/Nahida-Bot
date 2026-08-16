const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");

const { db } = require("../db");

const plantDatabase =
    require("../database/plants");

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

// Gene trong database cá»§a cÃ¢y gá»‘c: 10 -> 100
// Khi tÃ­nh toÃ¡n sáº½ chuyá»ƒn vá» 0.1 -> 1.0.
const GENE_MIN = 10;
const GENE_MAX = 100;

// Gene hybrid khÃ´ng Ä‘Æ°á»£c phÃ©p tÄƒng vÃ´ háº¡n.
const HYBRID_GENE_MIN = 15;
const HYBRID_GENE_MAX = 100;

// Chá»‰ sá»‘ cuá»‘i cÃ¹ng cÅ©ng cÃ³ giá»›i háº¡n.
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

    // Hybrid láº¥y gene trá»±c tiáº¿p tá»« database.
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

    // CÃ¢y gá»‘c láº¥y gene tá»« database/plants.js.
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

        `\`${user.username}\` â€” **Lv.${data.level}**`,

        "",

        "ðŸ§¬ **GENETICS**",

        "> Gene cÃ ng cao thÃ¬ kháº£ nÄƒng tÆ°Æ¡ng á»©ng cÃ ng tá»‘t.",

        "> Gene Ä‘Æ°á»£c giá»›i háº¡n Ä‘á»ƒ trÃ¡nh chá»‰ sá»‘ tÄƒng vÃ´ háº¡n.",

        "> Lai nhiá»u Ä‘á»i sáº½ cÃ³ xu hÆ°á»›ng á»•n Ä‘á»‹nh quanh gene cá»§a bá»‘ máº¹.",

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
            `> G ${getGeneValue(plant, "growth").toFixed(0)} â€¢ ` +
            `Y ${getGeneValue(plant, "yield").toFixed(0)} â€¢ ` +
            `W ${getGeneValue(plant, "water").toFixed(0)} â€¢ ` +
            `R ${getGeneValue(plant, "rarity").toFixed(0)} â€¢ ` +
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
                        `CÃ³: ${count} â€¢ G ${getGeneValue(plant, "growth").toFixed(0)} â€¢ Y ${getGeneValue(plant, "yield").toFixed(0)}`
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
                    ? "ðŸŒ± Chá»n cÃ¢y Bá»..."
                    : "ðŸŒ± Chá»n cÃ¢y Máº¸..."
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
                            "Quay láº¡i"
                        )
                        .setEmoji(
                            "â¬…ï¸"
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
 * Gene Ä‘á»i con KHÃ”NG láº¥y nguyÃªn gene bá»‘/máº¹ rá»“i nhÃ¢n tiáº¿p.
 *
 * VÃ­ dá»¥:
 *
 * A = 80
 * B = 90
 *
 * Trung bÃ¬nh = 85
 *
 * Sau Ä‘Ã³ cÃ³ variance nháº¹.
 *
 * VÃ  kÃ©o nháº¹ vá» 50 Ä‘á»ƒ chá»‘ng snowball.
 *
 * Nhá» váº­y:
 *
 * A + B -> ~85
 * C + D -> ~80-90
 *
 * chá»© khÃ´ng thÃ nh:
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

    // Random nháº¹.
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
     * Regression vá» 50.
     *
     * Gene cÃ ng xa 50 thÃ¬ cÃ ng bá»‹ kÃ©o nháº¹ vá» 50.
     * Äiá»u nÃ y cá»±c ká»³ quan trá»ng cho breeding nhiá»u Ä‘á»i.
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
     * Mutation base khoáº£ng 3%.
     *
     * Gene 50 -> khoáº£ng 6%
     * Gene 100 -> khoáº£ng 9%
     *
     * KhÃ´ng cho vÆ°á»£t quÃ¡ 10%.
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
     * cá»±c hiáº¿m.
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
                "ðŸŒŸ",

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
                "âœ¨",

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
                "ðŸ’œ",

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
 * Láº¥y tÃªn "gá»‘c" cá»§a hybrid.
 *
 * VÃ­ dá»¥:
 *
 * Báº¡c HÃ 
 * Hoa Ngá»t
 *
 * -> ["Báº¡c HÃ ", "Hoa Ngá»t"]
 *
 * Náº¿u:
 *
 * (Báº¡c HÃ  + Hoa Ngá»t) + Báº¡c HÃ 
 *
 * -> ["Báº¡c HÃ ", "Hoa Ngá»t"]
 *
 * KhÃ´ng cÃ²n:
 *
 * "Giá»‘ng Lai Giá»‘ng Lai Báº¡c HÃ  Hoa Ngá»t"
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
     * Náº¿u hybrid cÅ© khÃ´ng cÃ³ parent
     * thÃ¬ láº¥y tÃªn nhÆ°ng loáº¡i prefix.
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
        return "CÃ¢y Lai";
    }

    return String(name)

        .replace(
            /^Giá»‘ng Lai\s*/i,
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
     * XÃ³a tÃªn trÃ¹ng.
     *
     * Báº¡c HÃ  + Hoa Ngá»t + Báº¡c HÃ 
     *
     * => Báº¡c HÃ  + Hoa Ngá»t
     */

    lineage =
        [
            ...new Set(
                lineage
            )
        ];

    /*
     * KhÃ´ng Ä‘á»ƒ tÃªn quÃ¡ dÃ i.
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
                "CÃ¢y Lai"
        };
    }

    if (
        lineage.length === 1
    ) {

        return {

            name:
                `Hybrid ${lineage[0]}`,

            nameVi:
                `CÃ¢y Lai ${lineage[0]}`
        };
    }

    return {

        name:
            `Hybrid ${lineage.join(" Ã— ")}`,

        nameVi:
            `CÃ¢y Lai ${lineage.join(" Ã— ")}`
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
     * Gene chá»‰ áº£nh hÆ°á»Ÿng ráº¥t nháº¹.
     *
     * 50 gene = khÃ´ng thay Ä‘á»•i.
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
     * Gene 100 = nhanh hÆ¡n khoáº£ng 20%
     *
     * Gene 10 = cháº­m hÆ¡n khoáº£ng 20%
     *
     * KhÃ´ng bao giá» chia trá»±c tiáº¿p cho gene.
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
     * Gene chá»‰ áº£nh hÆ°á»Ÿng tá»‘i Ä‘a khoáº£ng Â±20%.
     *
     * Mutation thÃªm tá»‘i Ä‘a 60%.
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
     * Gene water cao => tá»‘n Ã­t nÆ°á»›c hÆ¡n.
     *
     * Chá»‰ dao Ä‘á»™ng khoáº£ng Â±20%.
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
     * ÄÃ¢y lÃ  pháº§n quan trá»ng nháº¥t.
     *
     * KHÃ”NG:
     *
     * baseSell * rarityGene
     *
     * vÃ¬ rarityGene 80/90/100 sáº½ phÃ¡ economy.
     *
     * Chá»‰ láº¥y giÃ¡ trung bÃ¬nh bá»‘ máº¹.
     *
     * Gene rarity chá»‰ áº£nh hÆ°á»Ÿng tá»‘i Ä‘a khoáº£ng Â±15%.
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
        "ðŸŒ±";

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
            "ðŸŒ±";
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
                "âŒ CÃ¢y bá»‘ vÃ  cÃ¢y máº¹ pháº£i lÃ  hai cÃ¢y khÃ¡c nhau.",

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
                "âŒ KhÃ´ng tÃ¬m tháº¥y cÃ¢y bá»‘ hoáº·c cÃ¢y máº¹.",

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
                `âŒ Báº¡n khÃ´ng cÃ²n **${plantName(parentA)}**.`,

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
                `âŒ Báº¡n khÃ´ng cÃ²n **${plantName(parentB)}**.`,

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
                `â³ Báº¡n cáº§n chá» **${formatTime(remaining)}** trÆ°á»›c khi lai tiáº¿p.`,

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
                `âŒ Cáº§n **${BREED_COST} Mora** Ä‘á»ƒ lai.`,

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
                    "âŒ Báº¡n khÃ´ng Ä‘á»§ Mora.",

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
                    "âŒ Má»™t trong hai cÃ¢y khÃ´ng cÃ²n trong tÃºi.",

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
         * Rollback náº¿u táº¡o hybrid lá»—i.
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

        `${parentA.emoji || "ðŸŒ±"} **${plantName(parentA)}**`,

        "        ðŸ§¬ +",

        `${parentB.emoji || "ðŸŒ±"} **${plantName(parentB)}**`,

        "",

        "        â†“",

        "",

        `${child.emoji} **${child.nameVi}**`,

        "",

        `> â­ Äá»™ hiáº¿m: **${child.rarity.toFixed(2)} / 5**`,

        `> ðŸ§¬ Gene: G ${child.growthGene.toFixed(0)} â€¢ Y ${child.yieldGene.toFixed(0)} â€¢ W ${child.waterGene.toFixed(0)} â€¢ R ${child.rarityGene.toFixed(0)} â€¢ M ${child.mutationGene.toFixed(0)}`,

        `> â±ï¸ Sinh trÆ°á»Ÿng: **${formatTime(child.growthTime)}**`,

        `> ðŸŒ¾ Sáº£n lÆ°á»£ng: **${child.yieldMin}â€“${child.yieldMax}**`,

        `> ðŸ’§ NÆ°á»›c: **${child.waterCost}**`,

        `> ðŸ’° BÃ¡n: **${child.sellPrice.toLocaleString()} Mora**`,

        "",

        `> ðŸŽ’ CÃ¢y con Ä‘Ã£ Ä‘Æ°á»£c thÃªm vÃ o tÃºi.`
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

            `> âœ¨ Multiplier Ã—${child.mutation.multiplier}`
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
                    "ðŸ§¬ Lai Táº¡o ThÃ nh CÃ´ng",

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
                            "TÃºi Ä‘á»“"
                        )
                        .setEmoji(
                            "ðŸŽ’"
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "home_genetics"
                        )
                        .setLabel(
                            "Lai tiáº¿p"
                        )
                        .setEmoji(
                            "ðŸ§¬"
                        )
                        .setStyle(
                            ButtonStyle.Primary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "home_farm"
                        )
                        .setLabel(
                            "NÃ´ng tráº¡i"
                        )
                        .setEmoji(
                            "ðŸŒ±"
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
