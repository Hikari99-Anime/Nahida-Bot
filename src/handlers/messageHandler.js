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
                            content: "ðŸ“ Pinging..."
                        });

                        const latency =
                            sent.createdTimestamp -
                            message.createdTimestamp;

                        await sent.edit({
                            content:
                                `ðŸ“ Pong! Äá»™ trá»… tin nháº¯n: ${latency}ms | API: ${Math.round(client.ws.ping)}ms`
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
                                                "home"
                                            )
                                            .setLabel(
                                                "Trang chá»§"
                                            )
                                            .setEmoji(
                                                "ðŸ "
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
                                            "Gieo Háº¡t",

                                        description:
                                            "ðŸŒ± Chá»n giá»‘ng cÃ¢y báº¡n muá»‘n gieo."
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
                                "âŒ KhÃ´ng tÃ¬m tháº¥y cÃ¢y."
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
                "âŒ Báº¡n khÃ´ng cÃ³ quyá»n sá»­ dá»¥ng lá»‡nh Admin."
        });

        break;
    }

    await message.reply({

        embeds: [

            farmEmbed({

                user:
                    message.author,

                title:
                    "âš™ï¸ Admin Panel",

                description:
                    [
                        "ðŸ” **ADMIN MODE**",
                        "",
                        "> `nadmin shop` â€” Ä‘á»•i shop cá»§a ngÆ°á»i dÃ¹ng",
                        "> `nadmin mora @user 10000` â€” thÃªm Mora",
                        "> `nadmin seed @user windwheel 10` â€” thÃªm háº¡t",
                        "> `nadmin xp @user 100` â€” thÃªm EXP",
                        "> `nadmin water @user 100` â€” thÃªm nÆ°á»›c",
                        "> `nadmin resetshop @user` â€” reset shop",
                        "> `nadmin resetuser @user` â€” reset dá»¯ liá»‡u user"
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
                                "âŒ KhÃ´ng tÃ¬m tháº¥y cÃ¢y."
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
                                        "KhÃ´ng TÃ¬m Tháº¥y Lá»‡nh",

                                    description:
                                        `âŒ KhÃ´ng tÃ¬m tháº¥y \`${PREFIX}${command}\`.\n\n` +
                                        `ðŸ’¡ DÃ¹ng **\`nhelp\`**.`,

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
                                                "HÆ°á»›ng dáº«n"
                                            )
                                            .setEmoji(
                                                "ðŸ“–"
                                            )
                                            .setStyle(
                                                ButtonStyle.Primary
                                            ),

                                        new ButtonBuilder()
                                            .setCustomId(
                                                "home"
                                            )
                                            .setLabel(
                                                "Trang chá»§"
                                            )
                                            .setEmoji(
                                                "ðŸ "
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
                        "âŒ CÃ³ lá»—i xáº£y ra. HÃ£y thá»­ láº¡i."
                    );
                }
            }
        }
    );
};

