const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const { db } = require("../db");

const plantDatabase =
    require("../database/plants");

const { COLORS } = require("../config");
const { now, unixSeconds, formatTime } = require("../utils/time");
const { getUser, updateUser, addXP, addFarmXP } = require("./user");
const { getItemCount, addItem } = require("./inventory");
const { getPlot, isReady } = require("./plots");
const {
    getPlant,
    plantName,
    plantEmoji,
    plantGrowth,
    plantYield,
    plantSellPrice,
    plantWaterCost
} = require("./plants");

const { farmEmbed } = require("../ui/embeds");

// ============================================================
// PLANT SEED
// ============================================================

async function plantSeed(
    interaction,
    plantId,
    plotId
) {

    const user =
        getUser(
            interaction.user
        );

    const plant =
        getPlant(
            plantId
        );

    if (!plant) {

        return interaction.reply({
            content:
                "âŒ CÃ¢y khÃ´ng tá»“n táº¡i.",
            ephemeral: true
        });
    }

    const plot =
        getPlot(
            interaction.user.id,
            plotId
        );

    if (!plot) {

        return interaction.reply({
            content:
                "âŒ Ã” Ä‘áº¥t khÃ´ng tá»“n táº¡i.",
            ephemeral: true
        });
    }

    if (
        plot.plant_id
    ) {

        return interaction.reply({
            content:
                "âŒ Ã” Ä‘áº¥t nÃ y Ä‘ang cÃ³ cÃ¢y.",
            ephemeral: true
        });
    }

    const seedCount =
        getItemCount(
            interaction.user.id,
            plant.id
        );

    if (
        seedCount <= 0
    ) {

        return interaction.reply({
            content:
                `âŒ Báº¡n khÃ´ng cÃ³ háº¡t giá»‘ng **${plantName(plant)}**.`,
            ephemeral: true
        });
    }

    const water =
        plantWaterCost(
            plant
        );

    if (
        user.water <
        water
    ) {

        return interaction.reply({
            content:
                `âŒ KhÃ´ng Ä‘á»§ nÆ°á»›c. Cáº§n **${water}** nÆ°á»›c.`,
            ephemeral: true
        });
    }

    const growth =
        plantGrowth(
            plant
        );

    const plantedAt =
        now();

    const finishAt =
        plantedAt +
        growth * 1000;

    const transaction =
        db.transaction(() => {

            addItem(
                interaction.user.id,
                plant.id,
                -1
            );

            updateUser(
                interaction.user.id,
                {
                    water:
                        user.water -
                        water
                }
            );

            db.prepare(`
                UPDATE plots
                SET
                    plant_id = ?,
                    planted_at = ?,
                    finish_at = ?,
                    watered = 0,
                    mutation = NULL
                WHERE user_id = ?
                AND plot_id = ?
            `).run(
                plant.id,
                plantedAt,
                finishAt,
                interaction.user.id,
                plotId
            );
        });

    transaction();

    const finish =
        unixSeconds(
            finishAt
        );

    return interaction.reply({

        embeds: [

            farmEmbed({

                user:
                    interaction.user,

                title:
                    "Gieo Háº¡t ThÃ nh CÃ´ng",

                description:
                    `${plantEmoji(plant)} **${plantName(plant)}**\n\n` +
                    `> ðŸŸ« Ã” Ä‘áº¥t: **${plotId}**\n` +
                    `> â±ï¸ Thá»i gian: **${formatTime(growth)}**\n` +
                    `> ðŸ’§ ÄÃ£ dÃ¹ng: **${water} nÆ°á»›c**\n` +
                    `> ðŸŒ± HoÃ n thÃ nh <t:${finish}:R>`,

                color:
                    COLORS.green
            })
        ],

        components: [

            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            "home_farm"
                        )
                        .setLabel(
                            "Xem nÃ´ng tráº¡i"
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
// HARVEST
// ============================================================

async function harvest(
    interaction,
    plotId
) {

    const plot =
        getPlot(
            interaction.user.id,
            plotId
        );

    if (
        !plot ||
        !plot.plant_id
    ) {

        return interaction.reply({
            content:
                "âŒ Ã” Ä‘áº¥t nÃ y khÃ´ng cÃ³ cÃ¢y.",
            ephemeral: true
        });
    }

    if (
        !isReady(plot)
    ) {

        const remaining =
            Math.ceil(
                (
                    Number(
                        plot.finish_at
                    ) -
                    now()
                ) / 1000
            );

        return interaction.reply({
            content:
                `â³ CÃ¢y chÆ°a trÆ°á»Ÿng thÃ nh. CÃ²n **${formatTime(remaining)}**.`,
            ephemeral: true
        });
    }

    const plant =
        getPlant(
            plot.plant_id
        );

    if (!plant) {

        return interaction.reply({
            content:
                "âŒ Dá»¯ liá»‡u cÃ¢y khÃ´ng cÃ²n tá»“n táº¡i.",
            ephemeral: true
        });
    }

    let amount =
        plantYield(
            plant
        );

    let sell =
        plantSellPrice(
            plant
        );

    let mutation =
        null;

    if (
        typeof plantDatabase.rollMutation ===
        "function"
    ) {

        mutation =
            plantDatabase.rollMutation();
    }

    if (
        mutation
    ) {

        amount =
            Math.ceil(
                amount *
                Number(
                    mutation.yieldMultiplier ||
                    1
                )
            );

        sell =
            Math.ceil(
                sell *
                Number(
                    mutation.sellMultiplier ||
                    1
                )
            );
    }

    const total =
        amount *
        sell;

    const transaction =
        db.transaction(() => {

            addItem(
                interaction.user.id,
                plant.id,
                amount
            );

            const user =
                getUser(
                    interaction.user
                );

            updateUser(
                interaction.user.id,
                {
                    mora:
                        user.mora +
                        total,

                    harvest_count:
                        user.harvest_count +
                        1
                }
            );

            addXP(
                interaction.user.id,
                25
            );

            addFarmXP(
                interaction.user.id,
                10
            );

            db.prepare(`
                UPDATE plots
                SET
                    plant_id = NULL,
                    planted_at = NULL,
                    finish_at = NULL,
                    watered = 0,
                    mutation = NULL
                WHERE user_id = ?
                AND plot_id = ?
            `).run(
                interaction.user.id,
                plotId
            );
        });

    transaction();

    let result =
        `${plantEmoji(plant)} **${plantName(plant)}**\n\n` +
        `> ðŸŒ¾ Thu hoáº¡ch: **Ã—${amount}**\n` +
        `> ðŸ’° Nháº­n: **${total.toLocaleString()} Mora**\n` +
        `> âœ¨ +25 EXP`;

    if (
        mutation
    ) {

        result +=
            `\n> ${mutation.emoji || "âœ¨"} **${mutation.name || mutation.id} Mutation!**`;
    }

    return interaction.reply({

        embeds: [

            farmEmbed({

                user:
                    interaction.user,

                title:
                    "Thu Hoáº¡ch",

                description:
                    result,

                color:
                    COLORS.gold
            })
        ],

        components: [

            new ActionRowBuilder()
                .addComponents(

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
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "home_profile"
                        )
                        .setLabel(
                            "Há»“ sÆ¡"
                        )
                        .setEmoji(
                            "ðŸ‘¤"
                        )
                        .setStyle(
                            ButtonStyle.Primary
                        )
                )
        ]
    });
}

// ============================================================
// WATER
// ============================================================

async function waterPlot(
    interaction,
    plotId
) {

    const plot =
        getPlot(
            interaction.user.id,
            plotId
        );

    if (
        !plot ||
        !plot.plant_id
    ) {

        return interaction.reply({
            content:
                "âŒ Ã” nÃ y chÆ°a cÃ³ cÃ¢y.",
            ephemeral: true
        });
    }

    if (
        plot.watered
    ) {

        return interaction.reply({
            content:
                "ðŸ’§ CÃ¢y nÃ y Ä‘Ã£ Ä‘Æ°á»£c tÆ°á»›i.",
            ephemeral: true
        });
    }

    const user =
        getUser(
            interaction.user
        );

    const plant =
        getPlant(
            plot.plant_id
        );

    if (!plant) {

        return interaction.reply({
            content:
                "âŒ KhÃ´ng tÃ¬m tháº¥y cÃ¢y.",
            ephemeral: true
        });
    }

    const cost =
        Math.max(
            5,
            Math.floor(
                plantWaterCost(
                    plant
                ) / 2
            )
        );

    if (
        user.water <
        cost
    ) {

        return interaction.reply({
            content:
                `âŒ KhÃ´ng Ä‘á»§ nÆ°á»›c. Cáº§n **${cost}**.`,
            ephemeral: true
        });
    }

    updateUser(
        interaction.user.id,
        {
            water:
                user.water -
                cost
        }
    );

    db.prepare(`
        UPDATE plots
        SET watered = 1
        WHERE user_id = ?
        AND plot_id = ?
    `).run(
        interaction.user.id,
        plotId
    );

    return interaction.reply({

        embeds: [

            farmEmbed({

                user:
                    interaction.user,

                title:
                    "TÆ°á»›i NÆ°á»›c",

                description:
                    `ðŸ’§ Báº¡n Ä‘Ã£ tÆ°á»›i cho cÃ¢y á»Ÿ **Ã´ ${plotId}**.\n\n` +
                    `> ðŸ’§ -${cost} nÆ°á»›c\n` +
                    `> ðŸŒ± CÃ¢y tiáº¿p tá»¥c phÃ¡t triá»ƒn.`,

                color:
                    COLORS.water
            })
        ],

        components: [

            new ActionRowBuilder()
                .addComponents(

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
// BUG
// ============================================================

async function catchBug(
    interaction
) {

    const user =
        getUser(
            interaction.user
        );

    const chance =
        Math.random();

    let reward =
        5;

    if (
        chance <
        0.05
    ) {

        reward =
            50;

    } else if (
        chance <
        0.20
    ) {

        reward =
            20;
    }

    updateUser(
        interaction.user.id,
        {
            mora:
                user.mora +
                reward,

            bug_count:
                user.bug_count +
                1
        }
    );

    return interaction.reply({

        embeds: [

            farmEmbed({

                user:
                    interaction.user,

                title:
                    "Báº¯t SÃ¢u",

                description:
                    `ðŸ› Báº¡n Ä‘Ã£ báº¯t Ä‘Æ°á»£c má»™t con sÃ¢u trong vÆ°á»n!\n\n` +
                    `> ðŸ’° Nháº­n **${reward} Mora**\n` +
                    `> ðŸ› Báº¯t sÃ¢u: **+1**`,

                color:
                    COLORS.green
            })
        ],

        components: [

            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            "home_farm"
                        )
                        .setLabel(
                            "Quay láº¡i vÆ°á»n"
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

module.exports = {
    plantSeed,
    harvest,
    waterPlot,
    catchBug
};

