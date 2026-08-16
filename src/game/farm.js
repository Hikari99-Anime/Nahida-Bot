const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const { db } = require("../db");

const plantDatabase =
    require("../../database/plants");

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
                "❌ Cây không tồn tại.",
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
                "❌ Ô đất không tồn tại.",
            ephemeral: true
        });
    }

    if (
        plot.plant_id
    ) {

        return interaction.reply({
            content:
                "❌ Ô đất này đang có cây.",
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
                `❌ Bạn không có hạt giống **${plantName(plant)}**.`,
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
                `❌ Không đủ nước. Cần **${water}** nước.`,
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
                    "Gieo Hạt Thành Công",

                description:
                    `${plantEmoji(plant)} **${plantName(plant)}**\n\n` +
                    `> 🟫 Ô đất: **${plotId}**\n` +
                    `> ⏱️ Thời gian: **${formatTime(growth)}**\n` +
                    `> 💧 Đã dùng: **${water} nước**\n` +
                    `> 🌱 Hoàn thành <t:${finish}:R>`,

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
                            "Xem nông trại"
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
                "❌ Ô đất này không có cây.",
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
                `⏳ Cây chưa trưởng thành. Còn **${formatTime(remaining)}**.`,
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
                "❌ Dữ liệu cây không còn tồn tại.",
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
        `> 🌾 Thu hoạch: **×${amount}**\n` +
        `> 💰 Nhận: **${total.toLocaleString()} Mora**\n` +
        `> ✨ +25 EXP`;

    if (
        mutation
    ) {

        result +=
            `\n> ${mutation.emoji || "✨"} **${mutation.name || mutation.id} Mutation!**`;
    }

    return interaction.reply({

        embeds: [

            farmEmbed({

                user:
                    interaction.user,

                title:
                    "Thu Hoạch",

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
                            "Nông trại"
                        )
                        .setEmoji(
                            "🌱"
                        )
                        .setStyle(
                            ButtonStyle.Success
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "home_profile"
                        )
                        .setLabel(
                            "Hồ sơ"
                        )
                        .setEmoji(
                            "👤"
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
                "❌ Ô này chưa có cây.",
            ephemeral: true
        });
    }

    if (
        plot.watered
    ) {

        return interaction.reply({
            content:
                "💧 Cây này đã được tưới.",
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
                "❌ Không tìm thấy cây.",
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
                `❌ Không đủ nước. Cần **${cost}**.`,
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
                    "Tưới Nước",

                description:
                    `💧 Bạn đã tưới cho cây ở **ô ${plotId}**.\n\n` +
                    `> 💧 -${cost} nước\n` +
                    `> 🌱 Cây tiếp tục phát triển.`,

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
                    "Bắt Sâu",

                description:
                    `🐛 Bạn đã bắt được một con sâu trong vườn!\n\n` +
                    `> 💰 Nhận **${reward} Mora**\n` +
                    `> 🐛 Bắt sâu: **+1**`,

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
                            "Quay lại vườn"
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
    plantSeed,
    harvest,
    waterPlot,
    catchBug
};
