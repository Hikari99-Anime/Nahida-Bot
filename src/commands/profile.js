const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const User = require("../database/models/User");
const Farm = require("../services/farmService");
const { requiredExp } = require("../services/expService");


/*
==================================================
CONFIG
==================================================
*/

const COLORS = {
    primary: 0x9b8cff,
    green: 0x8fd694,
    gold: 0xf5c96a,
    blue: 0x7cc7ff,
    danger: 0xe87c7c
};

const BAR_LENGTH = 18;


/*
==================================================
FORMAT
==================================================
*/

function formatNumber(value) {
    return Number(value || 0).toLocaleString("vi-VN");
}


function createExpBar(
    current,
    required,
    length = BAR_LENGTH
) {

    current = Math.max(
        0,
        Number(current) || 0
    );

    required = Math.max(
        1,
        Number(required) || 1
    );

    const percent = Math.min(
        current / required,
        1
    );

    const filled = Math.floor(
        percent * length
    );

    return (
        "▰".repeat(filled) +
        "▱".repeat(length - filled)
    );
}


function getExpPercent(
    current,
    required
) {

    current = Number(current) || 0;
    required = Math.max(
        1,
        Number(required) || 1
    );

    return Math.min(
        100,
        Math.floor(
            (current / required) * 100
        )
    );
}


/*
==================================================
PROFILE EMBED
==================================================
*/

function createProfileEmbed(
    interaction,
    user,
    farm
) {

    const need =
        requiredExp(
            user.level
        );

    const percent =
        getExpPercent(
            user.exp,
            need
        );

    const expBar =
        createExpBar(
            user.exp,
            need
        );


    const username =
        user.username ||
        interaction.user.username;


    return new EmbedBuilder()

        .setColor(
            COLORS.primary
        )

        .setAuthor({
            name:
                `${username} • Hồ sơ NahidaFarm`,
            iconURL:
                interaction.user.displayAvatarURL({
                    extension: "png",
                    size: 128
                })
        })

        .setTitle(
            "🌿 `HỒ SƠ NHÀ VƯỜN`"
        )

        .setDescription(
            [
                `> *“Mỗi hạt giống đều mang trong mình một giấc mơ nhỏ.”*`,
                `> — Nahida`,
                "",
                `🌱 **${username}**`,
                `✨ Cấp độ **Lv.${user.level}**`,
                "",
                `**✦ KINH NGHIỆM**`,
                `\`${expBar}\` **${percent}%**`,
                `\`${formatNumber(user.exp)} / ${formatNumber(need)} EXP\``
            ].join("\n")
        )

        .addFields(

            {
                name: "💰 TÀI SẢN",
                value:
                    `> 💰 **${formatNumber(user.mora)}** Mora\n` +
                    `> 🍀 May mắn **+${formatNumber(user.luck)}**`,
                inline: true
            },

            {
                name: "🌾 NÔNG TRẠI",
                value:
                    `> 🌱 Farm **Lv.${farm.level}**\n` +
                    `> 🪴 **${formatNumber(farm.plot_count)}** ô đất\n` +
                    `> ✦ **${formatNumber(farm.exp)}** Farm EXP`,
                inline: true
            },

            {
                name: "📖 NHẬT KÝ",
                value:
                    "> Khu vườn của bạn đang từng ngày lớn lên.\n" +
                    "> Hãy chăm sóc cây và lai tạo những giống mới 🌱",
                inline: false
            }

        )

        .setThumbnail(
            interaction.user.displayAvatarURL({
                extension: "png",
                size: 256
            })
        )

        .setFooter({
            text:
                "NahidaFarm • Mỗi ngày một mầm xanh"
        })

        .setTimestamp();
}


/*
==================================================
COMMAND
==================================================
*/

module.exports = {

    data:

        new SlashCommandBuilder()

            .setName("profile")

            .setDescription(
                "Xem hồ sơ nhà vườn NahidaFarm"
            ),


    async execute(
        interaction
    ) {

        try {

            const user =
                User.getOrCreateUser(
                    interaction.user.id,
                    interaction.user.username
                );


            const farm =
                Farm.ensureFarm(
                    interaction.user.id,
                    interaction.user.username
                );


            const embed =
                createProfileEmbed(
                    interaction,
                    user,
                    farm
                );


            await interaction.reply({
                embeds: [
                    embed
                ]
            });

        } catch (error) {

            console.error(
                "PROFILE COMMAND ERROR:",
                error
            );


            const errorEmbed =
                new EmbedBuilder()

                    .setColor(
                        COLORS.danger
                    )

                    .setTitle(
                        "❌ KHÔNG THỂ MỞ HỒ SƠ"
                    )

                    .setDescription(
                        error.message ||
                        "Đã xảy ra lỗi khi tải hồ sơ."
                    )

                    .setFooter({
                        text:
                            "NahidaFarm • Vui lòng thử lại."
                    });


            await interaction.reply({
                embeds: [
                    errorEmbed
                ],
                ephemeral: true
            });
        }
    },


    /*
    ==================================================
    EXPORT
    ==================================================
    */

    createProfileEmbed
};