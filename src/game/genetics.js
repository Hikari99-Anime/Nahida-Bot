const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");

const { db } = require("../db");

const plantDatabase =
    require("../../database/plants");

const { COLORS, BREED_COST, BREED_COOLDOWN_MS } = require("../config");
const { now, formatTime } = require("../utils/time");
const { getUser, updateUser } = require("./user");
const { getItemCount, getInventory, addItem } = require("./inventory");
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

const { farmEmbed } = require("../ui/embeds");

// ============================================================
// GENETICS
// ============================================================

function getGeneValue(
    plant,
    type
) {

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

        return Number(
            plant[
                map[type]
            ]
        ) || 1;
    }

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

            return Number(
                genes[type]
            ) || 1;
        }
    }

    return 1;
}

function geneticsEmbed(
    user
) {

    const data =
        getUser(user);

    let plants =
        [];

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

        "> Gene quyết định khả năng của cây.",

        "> Lai cây sẽ trộn gene của bố và mẹ.",

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
            `> G ${getGeneValue(plant, "growth").toFixed(2)} • Y ${getGeneValue(plant, "yield").toFixed(2)} • W ${getGeneValue(plant, "water").toFixed(2)} • R ${getGeneValue(plant, "rarity").toFixed(2)} • M ${getGeneValue(plant, "mutation").toFixed(2)}`
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
        )
        .slice(
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
                        `Có: ${count} • G ${getGeneValue(plant, "growth").toFixed(1)} • Y ${getGeneValue(plant, "yield").toFixed(1)}`
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
// BREED STATE IN MEMORY
// ============================================================

const breedingSessions =
    new Map();

// ============================================================
// INHERIT GENE
// ============================================================

function inheritGene(
    a,
    b,
    variance = 0.10
) {

    const first =
        Number(a) || 1;

    const second =
        Number(b) || 1;

    const base =
        Math.random() < 0.5
            ? first
            : second;

    const modifier =
        1 +
        (
            (
                Math.random() * 2
            ) - 1
        ) *
        variance;

    return Math.max(
        0.1,
        Number(
            (
                base *
                modifier
            ).toFixed(2)
        )
    );
}

// ============================================================
// BREED MUTATION
// ============================================================

function rollBreedingMutation(
    mutationGene
) {

    const gene =
        Math.max(
            0,
            Number(
                mutationGene
            ) || 1
        );

    let chance =
        0.08;

    if (
        gene > 1
    ) {

        chance +=
            Math.min(
                0.20,
                (
                    gene - 1
                ) * 0.03
            );
    }

    const roll =
        Math.random();

    if (
        roll <
        chance * 0.05
    ) {

        return {
            id:
                "legendary",
            name:
                "Legendary Mutation",
            emoji:
                "🌟",
            multiplier:
                2.5
        };
    }

    if (
        roll <
        chance * 0.20
    ) {

        return {
            id:
                "golden",
            name:
                "Golden Mutation",
            emoji:
                "✨",
            multiplier:
                1.75
        };
    }

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
                1.35
        };
    }

    return null;
}

// ============================================================
// CREATE HYBRID
// ============================================================

function createHybridPlant(
    userId,
    parentA,
    parentB
) {

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

    const mutation =
        rollBreedingMutation(
            mutationGene
        );

    const baseGrowth =
        Math.round(
            (
                plantGrowth(parentA) +
                plantGrowth(parentB)
            ) / 2
        );

    const baseYield =
        Math.max(
            1,
            Math.round(
                (
                    plantYield(parentA) +
                    plantYield(parentB)
                ) / 2
            )
        );

    const baseWater =
        Math.max(
            1,
            Math.round(
                (
                    plantWaterCost(parentA) +
                    plantWaterCost(parentB)
                ) / 2
            )
        );

    const baseSell =
        Math.max(
            1,
            Math.round(
                (
                    plantSellPrice(parentA) +
                    plantSellPrice(parentB)
                ) / 2
            )
        );

    const multiplier =
        mutation
            ? mutation.multiplier
            : 1;

    const growthTime =
        Math.max(
            5,
            Math.round(
                baseGrowth /
                Math.max(
                    0.5,
                    growthGene
                )
            )
        );

    const yieldMin =
        Math.max(
            1,
            Math.round(
                baseYield *
                yieldGene *
                0.8 *
                multiplier
            )
        );

    const yieldMax =
        Math.max(
            yieldMin,
            Math.round(
                baseYield *
                yieldGene *
                1.2 *
                multiplier
            )
        );

    const waterCost =
        Math.max(
            1,
            Math.round(
                baseWater /
                Math.max(
                    0.5,
                    waterGene
                )
            )
        );

    const sellPrice =
        Math.max(
            1,
            Math.round(
                baseSell *
                rarityGene *
                multiplier
            )
        );

    const id =
        `hybrid_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const name =
        `${plantName(parentA)} × ${plantName(parentB)}`;

    const nameVi =
        `Giống Lai ${plantName(parentA)} ${plantName(parentB)}`;

    const rarity =
        Math.max(
            1,
            Number(
                rarityGene.toFixed(2)
            )
        );

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
        VALUES (
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
        mutation
            ? mutation.emoji
            : "🌱",
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

    addItem(
        userId,
        id,
        1
    );

    return {
        id,
        name,
        nameVi,
        emoji:
            mutation
                ? mutation.emoji
                : "🌱",
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

    if (
        parentAId ===
        parentBId
    ) {

        return interaction.reply({
            content:
                "❌ Cây bố và cây mẹ phải là hai cây khác nhau.",
            ephemeral: true
        });
    }

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
            ephemeral: true
        });
    }

    if (
        getItemCount(
            interaction.user.id,
            parentA.id
        ) <= 0
    ) {

        return interaction.reply({
            content:
                `❌ Bạn không còn **${plantName(parentA)}**.`,
            ephemeral: true
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
            ephemeral: true
        });
    }

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
                ) / 1000
            );

        return interaction.reply({
            content:
                `⏳ Bạn cần chờ **${formatTime(remaining)}** trước khi lai tiếp.`,
            ephemeral: true
        });
    }

    if (
        user.mora <
        BREED_COST
    ) {

        return interaction.reply({
            content:
                `❌ Cần **${BREED_COST} Mora** để lai.`,
            ephemeral: true
        });
    }

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
                ephemeral: true
            });
        }

        if (
            error.message ===
            "NO_PARENT"
        ) {

            return interaction.reply({
                content:
                    "❌ Một trong hai cây không còn trong túi.",
                ephemeral: true
            });
        }

        throw error;
    }

    let child;

    try {

        child =
            createHybridPlant(
                interaction.user.id,
                parentA,
                parentB
            );

    } catch (error) {

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

    breedingSessions.set(
        interaction.user.id,
        now()
    );

    let result = [

        `${parentA.emoji || "🌱"} **${plantName(parentA)}**`,
        "        🧬 +",
        `${parentB.emoji || "🌱"} **${plantName(parentB)}**`,
        "",
        `        ↓`,
        "",
        `${child.emoji} **${child.nameVi}**`,
        "",
        `> ⏱️ Sinh trưởng: **${formatTime(child.growthTime)}**`,
        `> 🌾 Sản lượng: **${child.yieldMin}–${child.yieldMax}**`,
        `> 💧 Nước: **${child.waterCost}**`,
        `> 💰 Bán: **${child.sellPrice.toLocaleString()} Mora**`,
        "",
        `> 🎒 Cây con đã được thêm vào túi.`
    ];

    if (
        child.mutation
    ) {

        result.push(
            "",
            `> ${child.mutation.emoji} **${child.mutation.name}!**`,
            `> ✨ Multiplier ×${child.mutation.multiplier}`
        );
    }

    const fresh =
        getUser(
            interaction.user
        );

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
