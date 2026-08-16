const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const { PREFIX, COLORS } = require("../config");
const { isAdmin } = require("../utils/admin");
const { getUser } = require("../game/user");
const { ensurePlots } = require("../game/plots");
const { getPlant } = require("../game/plants");
const { shopEmbed, shopSelectMenu } = require("../game/shop");
const { geneticsEmbed } = require("../game/genetics");

const {
    homeEmbed,
    profileEmbed,
    farmEmbedView,
    inventoryEmbed,
    helpEmbed,
    plantDetailEmbed,
    farmEmbed
} = require("../ui/embeds");

const {
    mainButtons,
    farmButtons,
    backButton,
    geneticsButtons,
    plantSelectMenu,
    plotSelect
} = require("../ui/components");

// ============================================================
// MESSAGE COMMANDS
// ============================================================

module.exports = (client) => {

    client.on(
        "messageCreate",
        async message => {

            if (
                message.author.bot
            ) {
                return;
            }

            if (
                !message.content
                    .toLowerCase()
                    .startsWith(
                        PREFIX
                    )
            ) {
                return;
            }

            const args =
                message.content
                    .slice(
                        PREFIX.length
                    )
                    .trim()
                    .split(
                        /\s+/
                    );

            const command =
                (
                    args.shift() ||
                    ""
                ).toLowerCase();

            if (!command) {
                return;
            }

            getUser(
                message.author
            );

            ensurePlots(
                message.author.id
            );

            try {

                switch (
                    command
                ) {

                    case "ping": {

                        const sent = await message.reply({
                            content: "🏓 Pinging..."
                        });

                        const latency =
                            sent.createdTimestamp -
                            message.createdTimestamp;

                        await sent.edit({
                            content:
                                `🏓 Pong! Độ trễ tin nhắn: ${latency}ms | API: ${Math.round(client.ws.ping)}ms`
                        });

                        break;
                    }

                    case "start":
                    case "home":

                        await message.reply({

                            embeds: [
                                homeEmbed(
                                    message.author
                                )
                            ],

                            components:
                                mainButtons()
                        });

                        break;

                    case "profile":
                    case "p":

                        await message.reply({

                            embeds: [
                                profileEmbed(
                                    message.author
                                )
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
                                                "home"
                                            )
                                            .setLabel(
                                                "Trang chủ"
                                            )
                                            .setEmoji(
                                                "🏠"
                                            )
                                            .setStyle(
                                                ButtonStyle.Secondary
                                            )
                                    )
                            ]
                        });

                        break;

                    case "farm":
                    case "f":

                        await message.reply({

                            embeds: [
                                farmEmbedView(
                                    message.author
                                )
                            ],

                            components:
                                farmButtons()
                        });

                        break;

                    case "inv":
                    case "inventory":

                        await message.reply({

                            embeds: [
                                inventoryEmbed(
                                    message.author
                                )
                            ],

                            components:
                                mainButtons()
                        });

                        break;

                    case "shop":

                        await message.reply({

                            embeds: [
                                shopEmbed(
                                    message.author
                                )
                            ],

                            components:
                                shopSelectMenu(
                                    message.author
                                )
                        });

                        break;

                    case "genetics":
                    case "genes":

                        await message.reply({

                            embeds: [
                                geneticsEmbed(
                                    message.author
                                )
                            ],

                            components:
                                geneticsButtons()
                        });

                        break;

                    case "help":

                        await message.reply({

                            embeds: [
                                helpEmbed(
                                    message.author
                                )
                            ],

                            components:
                                mainButtons()
                        });

                        break;

                    case "plant": {

                        const plantId =
                            args[0];

                        if (!plantId) {

                            const menu =
                                plantSelectMenu(
                                    message.author
                                );

                            await message.reply({

                                embeds: [

                                    farmEmbed({

                                        user:
                                            message.author,

                                        title:
                                            "Gieo Hạt",

                                        description:
                                            "🌱 Chọn giống cây bạn muốn gieo."
                                    })
                                ],

                                components:
                                    menu ||
                                    backButton()
                            });

                            break;
                        }

                        const plant =
                            getPlant(
                                plantId
                            );

                        if (!plant) {

                            await message.reply(
                                "❌ Không tìm thấy cây."
                            );

                            break;
                        }

                        const rows =
                            plotSelect(
                                message.author.id,
                                plant.id
                            );

                        await message.reply({

                            embeds: [
                                plantDetailEmbed(
                                    message.author,
                                    plant
                                )
                            ],

                            components:
                                rows.length
                                    ? rows
                                    : backButton()
                        });

                        break;
                    }
// ====================================================
// ADMIN
// ====================================================

case "admin": {

    if (!isAdmin(message.author)) {

        await message.reply({
            content:
                "❌ Bạn không có quyền sử dụng lệnh Admin."
        });

        break;
    }

    await message.reply({

        embeds: [

            farmEmbed({

                user:
                    message.author,

                title:
                    "⚙️ Admin Panel",

                description:
                    [
                        "🔐 **ADMIN MODE**",
                        "",
                        "> `nadmin shop` — đổi shop của người dùng",
                        "> `nadmin mora @user 10000` — thêm Mora",
                        "> `nadmin seed @user windwheel 10` — thêm hạt",
                        "> `nadmin xp @user 100` — thêm EXP",
                        "> `nadmin water @user 100` — thêm nước",
                        "> `nadmin resetshop @user` — reset shop",
                        "> `nadmin resetuser @user` — reset dữ liệu user"
                    ].join("\n"),

                color:
                    COLORS.red
            })
        ]
    });

    break;
}
                    case "nplant": {

                        const plant =
                            getPlant(
                                args[0]
                            );

                        if (!plant) {

                            await message.reply(
                                "❌ Không tìm thấy cây."
                            );

                            break;
                        }

                        await message.reply({

                            embeds: [
                                plantDetailEmbed(
                                    message.author,
                                    plant
                                )
                            ],

                            components:
                                backButton()
                        });

                        break;
                    }

                    default:

                        await message.reply({

                            embeds: [

                                farmEmbed({

                                    user:
                                        message.author,

                                    title:
                                        "Không Tìm Thấy Lệnh",

                                    description:
                                        `❌ Không tìm thấy \`${PREFIX}${command}\`.\n\n` +
                                        `💡 Dùng **\`nhelp\`**.`,

                                    color:
                                        COLORS.red
                                })
                            ],

                            components: [

                                new ActionRowBuilder()
                                    .addComponents(

                                        new ButtonBuilder()
                                            .setCustomId(
                                                "home_help"
                                            )
                                            .setLabel(
                                                "Hướng dẫn"
                                            )
                                            .setEmoji(
                                                "📖"
                                            )
                                            .setStyle(
                                                ButtonStyle.Primary
                                            ),

                                        new ButtonBuilder()
                                            .setCustomId(
                                                "home"
                                            )
                                            .setLabel(
                                                "Trang chủ"
                                            )
                                            .setEmoji(
                                                "🏠"
                                            )
                                            .setStyle(
                                                ButtonStyle.Secondary
                                            )
                                    )
                            ]
                        });
                }

            } catch (error) {

                console.error(
                    "Command error:",
                    error
                );

                if (
                    !message.replied
                ) {

                    await message.reply(
                        "❌ Có lỗi xảy ra. Hãy thử lại."
                    );
                }
            }
        }
    );
};
