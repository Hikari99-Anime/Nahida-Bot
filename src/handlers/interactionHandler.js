const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const { COLORS, BREED_COST } = require("../config");
const { getPlant, plantName, plantEmoji } = require("../game/plants");
const { getItemCount } = require("../game/inventory");
const { getPlots, isReady } = require("../game/plots");
const { plantSeed, harvest, waterPlot, catchBug } = require("../game/farm");

const {
    getShopPlants,
    buySeeds,
    shopEmbed,
    shopSelectMenu,
    forceRefreshShop
} = require("../game/shop");

const {
    geneticsEmbed,
    getBreedablePlants,
    breedParentMenu,
    breedingSessions,
    breedPlants
} = require("../game/genetics");

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
    breedConfirmButtons,
    plantSelectMenu,
    plotSelect,
    shopQuantityModal
} = require("../ui/components");

// ============================================================
// INTERACTIONS
// ============================================================

module.exports = (client) => {

    client.on(
        "interactionCreate",
        async interaction => {

            try {

                // ========================================================
                // MODAL
                // ========================================================

                if (
                    interaction.isModalSubmit()
                ) {

                    if (
                        !interaction.customId.startsWith(
                            "shop_quantity_"
                        )
                    ) {
                        return;
                    }

                    const plantId =
                        interaction.customId
                            .slice(
                                "shop_quantity_".length
                            );

                    const quantity =
                        interaction.fields
                            .getTextInputValue(
                                "quantity"
                            );

                    return buySeeds(
                        interaction,
                        plantId,
                        quantity
                    );
                }

                // ========================================================
                // SELECT MENU
                // ========================================================

                if (
                    interaction.isStringSelectMenu()
                ) {

                    // SHOP
                    if (
                        interaction.customId ===
                        "shop_buy"
                    ) {

                        const plantId =
                            interaction.values[0];

                        const plant =
                            getPlant(
                                plantId
                            );

                        if (!plant) {

                            return interaction.reply({
                                content:
                                    "âŒ KhÃ´ng tÃ¬m tháº¥y háº¡t giá»‘ng.",
                                ephemeral:
                                    true
                            });
                        }

                        const shopPlants =
                            getShopPlants(
                                interaction.user.id
                            );

                        if (
                            !shopPlants.some(
                                p =>
                                    p.id ===
                                    plant.id
                            )
                        ) {

                            return interaction.reply({
                                content:
                                    "âŒ Háº¡t giá»‘ng nÃ y khÃ´ng cÃ²n trong shop.",
                                ephemeral:
                                    true
                            });
                        }

                        return interaction.showModal(
                            shopQuantityModal(
                                plant
                            )
                        );
                    }

                    // PLANT
                    if (
                        interaction.customId ===
                        "select_plant"
                    ) {

                        const plantId =
                            interaction.values[0];

                        const plant =
                            getPlant(
                                plantId
                            );

                        if (!plant) {

                            return interaction.reply({
                                content:
                                    "âŒ KhÃ´ng tÃ¬m tháº¥y cÃ¢y.",
                                ephemeral:
                                    true
                            });
                        }

                        const rows =
                            plotSelect(
                                interaction.user.id,
                                plant.id
                            );

                        return interaction.update({

                            embeds: [
                                plantDetailEmbed(
                                    interaction.user,
                                    plant
                                )
                            ],

                            components:
                                rows.length
                                    ? rows
                                    : backButton()
                        });
                    }

                    // BREED PARENT
                    if (
                        interaction.customId ===
                        "breed_parent_a"
                    ) {

                        const parentA =
                            interaction.values[0];

                        const plant =
                            getPlant(
                                parentA
                            );

                        if (!plant) {

                            return interaction.reply({
                                content:
                                    "âŒ KhÃ´ng tÃ¬m tháº¥y cÃ¢y.",
                                ephemeral:
                                    true
                            });
                        }

                        const session =
                            breedingSessions.get(
                                `select:${interaction.user.id}`
                            ) || {};

                        breedingSessions.set(
                            `select:${interaction.user.id}`,
                            {
                                parentA,
                                parentB:
                                    null
                            }
                        );

                        const rows =
                            breedParentMenu(
                                interaction.user.id,
                                "b"
                            );

                        return interaction.update({

                            embeds: [

                                farmEmbed({

                                    user:
                                        interaction.user,

                                    title:
                                        "ðŸ§¬ Chá»n CÃ¢y Máº¹",

                                    description:
                                        `ðŸ‘¨ CÃ¢y bá»‘: ${plantEmoji(plant)} **${plantName(plant)}**\n\n` +
                                        "ðŸŒ± BÃ¢y giá» hÃ£y chá»n cÃ¢y máº¹.",

                                    color:
                                        COLORS.purple
                                })
                            ],

                            components:
                                rows ||
                                backButton()
                        });
                    }

                    if (
                        interaction.customId ===
                        "breed_parent_b"
                    ) {

                        const parentB =
                            interaction.values[0];

                        const session =
                            breedingSessions.get(
                                `select:${interaction.user.id}`
                            );

                        if (
                            !session ||
                            !session.parentA
                        ) {

                            return interaction.reply({
                                content:
                                    "âŒ PhiÃªn lai Ä‘Ã£ háº¿t. HÃ£y báº¯t Ä‘áº§u láº¡i.",
                                ephemeral:
                                    true
                            });
                        }

                        const parentA =
                            getPlant(
                                session.parentA
                            );

                        const parentBPlant =
                            getPlant(
                                parentB
                            );

                        if (
                            !parentA ||
                            !parentBPlant
                        ) {

                            return interaction.reply({
                                content:
                                    "âŒ KhÃ´ng tÃ¬m tháº¥y cÃ¢y.",
                                ephemeral:
                                    true
                            });
                        }

                        if (
                            parentA.id ===
                            parentBPlant.id
                        ) {

                            return interaction.reply({
                                content:
                                    "âŒ CÃ¢y bá»‘ vÃ  cÃ¢y máº¹ pháº£i khÃ¡c nhau.",
                                ephemeral:
                                    true
                            });
                        }

                        const countA =
                            getItemCount(
                                interaction.user.id,
                                parentA.id
                            );

                        const countB =
                            getItemCount(
                                interaction.user.id,
                                parentBPlant.id
                            );

                        if (
                            countA <= 0 ||
                            countB <= 0
                        ) {

                            return interaction.reply({
                                content:
                                    "âŒ Báº¡n khÃ´ng Ä‘á»§ cÃ¢y Ä‘á»ƒ lai.",
                                ephemeral:
                                    true
                            });
                        }

                        breedingSessions.set(
                            `select:${interaction.user.id}`,
                            {
                                parentA:
                                    parentA.id,
                                parentB:
                                    parentBPlant.id
                            }
                        );

                        return interaction.update({

                            embeds: [

                                farmEmbed({

                                    user:
                                        interaction.user,

                                    title:
                                        "ðŸ§¬ XÃ¡c Nháº­n Lai",

                                    description:
                                        `${plantEmoji(parentA)} **${plantName(parentA)}**\n` +
                                        "        ðŸ§¬ +\n" +
                                        `${plantEmoji(parentBPlant)} **${plantName(parentBPlant)}**\n\n` +
                                        `> ðŸ’° Chi phÃ­: **${BREED_COST} Mora**\n` +
                                        "> ðŸŒ± TiÃªu hao 1 cÃ¢y bá»‘ + 1 cÃ¢y máº¹.\n" +
                                        "> âœ¨ CÃ³ cÆ¡ há»™i nháº­n Mutation.",

                                    color:
                                        COLORS.purple
                                })
                            ],

                            components:
                                breedConfirmButtons()
                        });
                    }

                    return;
                }

                // ========================================================
                // BUTTON
                // ========================================================

                if (
                    !interaction.isButton()
                ) {
                    return;
                }

                const id =
                    interaction.customId;

                // ========================================================
                // HOME
                // ========================================================

                if (
                    id === "home"
                ) {

                    return interaction.update({

                        embeds: [
                            homeEmbed(
                                interaction.user
                            )
                        ],

                        components:
                            mainButtons()
                    });
                }

                // ========================================================
                // PROFILE
                // ========================================================

                if (
                    id === "home_profile"
                ) {

                    return interaction.update({

                        embeds: [
                            profileEmbed(
                                interaction.user
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
                }

                // ========================================================
                // FARM
                // ========================================================

                if (
                    id === "home_farm"
                ) {

                    return interaction.update({

                        embeds: [
                            farmEmbedView(
                                interaction.user
                            )
                        ],

                        components:
                            farmButtons()
                    });
                }

                // ========================================================
                // INVENTORY
                // ========================================================

                if (
                    id === "home_inventory"
                ) {

                    return interaction.update({

                        embeds: [
                            inventoryEmbed(
                                interaction.user
                            )
                        ],

                        components:
                            mainButtons()
                    });
                }

                // ========================================================
                // SHOP
                // ========================================================

                if (
                    id === "home_shop"
                ) {

                    return interaction.update({

                        embeds: [
                            shopEmbed(
                                interaction.user
                            )
                        ],

                        components:
                            shopSelectMenu(
                                interaction.user
                            )
                    });
                }

                // ========================================================
                // SHOP REFRESH
                // ========================================================

                if (
                    id === "shop_refresh"
                ) {

                    return forceRefreshShop(
                        interaction
                    );
                }

                // ========================================================
                // GENETICS
                // ========================================================

                if (
                    id === "home_genetics"
                ) {

                    return interaction.update({

                        embeds: [
                            geneticsEmbed(
                                interaction.user
                            )
                        ],

                        components:
                            geneticsButtons()
                    });
                }

                // ========================================================
                // HELP
                // ========================================================

                if (
                    id === "home_help"
                ) {

                    return interaction.update({

                        embeds: [
                            helpEmbed(
                                interaction.user
                            )
                        ],

                        components:
                            mainButtons()
                    });
                }

                // ========================================================
                // FARM PLANT
                // ========================================================

                if (
                    id === "farm_plant"
                ) {

                    const menu =
                        plantSelectMenu(
                            interaction.user
                        );

                    return interaction.update({

                        embeds: [

                            farmEmbed({

                                user:
                                    interaction.user,

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
                }

                // ========================================================
                // WATER
                // ========================================================

                if (
                    id === "farm_water"
                ) {

                    const plots =
                        getPlots(
                            interaction.user.id
                        );

                    const active =
                        plots.filter(
                            p =>
                                p.plant_id &&
                                !p.watered
                        );

                    if (
                        !active.length
                    ) {

                        return interaction.reply({

                            content:
                                "ðŸ’§ Hiá»‡n khÃ´ng cÃ³ cÃ¢y nÃ o cáº§n tÆ°á»›i.",

                            ephemeral:
                                true
                        });
                    }

                    const row =
                        new ActionRowBuilder();

                    for (
                        const plot of active
                    ) {

                        row.addComponents(

                            new ButtonBuilder()
                                .setCustomId(
                                    `water_${plot.plot_id}`
                                )
                                .setLabel(
                                    `Ã” ${plot.plot_id}`
                                )
                                .setEmoji(
                                    "ðŸ’§"
                                )
                                .setStyle(
                                    ButtonStyle.Primary
                                )
                        );

                        if (
                            row.components.length >=
                            5
                        ) {
                            break;
                        }
                    }

                    return interaction.reply({

                        embeds: [

                            farmEmbed({

                                user:
                                    interaction.user,

                                title:
                                    "TÆ°á»›i NÆ°á»›c",

                                description:
                                    "ðŸ’§ Chá»n Ã´ Ä‘áº¥t muá»‘n tÆ°á»›i."
                            })
                        ],

                        components: [
                            row,
                            ...backButton()
                        ],

                        ephemeral:
                            true
                    });
                }

                // ========================================================
                // HARVEST
                // ========================================================

                if (
                    id === "farm_harvest"
                ) {

                    const plots =
                        getPlots(
                            interaction.user.id
                        );

                    const ready =
                        plots.filter(
                            p =>
                                p.plant_id &&
                                isReady(p)
                        );

                    if (
                        !ready.length
                    ) {

                        return interaction.reply({

                            content:
                                "ðŸŒ± ChÆ°a cÃ³ cÃ¢y nÃ o trÆ°á»Ÿng thÃ nh.",

                            ephemeral:
                                true
                        });
                    }

                    const row =
                        new ActionRowBuilder();

                    for (
                        const plot of ready
                    ) {

                        row.addComponents(

                            new ButtonBuilder()
                                .setCustomId(
                                    `harvest_${plot.plot_id}`
                                )
                                .setLabel(
                                    `Ã” ${plot.plot_id}`
                                )
                                .setEmoji(
                                    "ðŸŒ¾"
                                )
                                .setStyle(
                                    ButtonStyle.Success
                                )
                        );

                        if (
                            row.components.length >=
                            5
                        ) {
                            break;
                        }
                    }

                    return interaction.reply({

                        embeds: [

                            farmEmbed({

                                user:
                                    interaction.user,

                                title:
                                    "Thu Hoáº¡ch",

                                description:
                                    "ðŸŒ¾ Chá»n cÃ¢y báº¡n muá»‘n thu hoáº¡ch."
                            })
                        ],

                        components: [
                            row,
                            ...backButton()
                        ],

                        ephemeral:
                            true
                    });
                }

                // ========================================================
                // BUG
                // ========================================================

                if (
                    id === "farm_bug"
                ) {

                    return catchBug(
                        interaction
                    );
                }

                // ========================================================
                // GENETICS INFO
                // ========================================================

                if (
                    id === "genetics_info"
                ) {

                    return interaction.update({

                        embeds: [
                            geneticsEmbed(
                                interaction.user
                            )
                        ],

                        components:
                            geneticsButtons()
                    });
                }

                // ========================================================
                // BREED START
                // ========================================================

                if (
                    id === "breed_start"
                ) {

                    const plants =
                        getBreedablePlants(
                            interaction.user.id
                        );

                    if (
                        plants.length <
                        2
                    ) {

                        return interaction.reply({

                            content:
                                "âŒ Báº¡n cáº§n Ã­t nháº¥t **2 giá»‘ng cÃ¢y khÃ¡c nhau** trong tÃºi Ä‘á»ƒ lai.",

                            ephemeral:
                                true
                        });
                    }

                    const rows =
                        breedParentMenu(
                            interaction.user.id,
                            "a"
                        );

                    return interaction.update({

                        embeds: [

                            farmEmbed({

                                user:
                                    interaction.user,

                                title:
                                    "ðŸ§¬ Chá»n CÃ¢y Bá»‘",

                                description:
                                    `ðŸ’° Chi phÃ­ lai: **${BREED_COST} Mora**\n\n` +
                                    "ðŸŒ± HÃ£y chá»n cÃ¢y bá»‘ tá»« tÃºi Ä‘á»“.",

                                color:
                                    COLORS.purple
                            })
                        ],

                        components:
                            rows ||
                            backButton()
                    });
                }

                // ========================================================
                // BREED CONFIRM
                // ========================================================

                if (
                    id === "breed_confirm"
                ) {

                    const session =
                        breedingSessions.get(
                            `select:${interaction.user.id}`
                        );

                    if (
                        !session ||
                        !session.parentA ||
                        !session.parentB
                    ) {

                        return interaction.reply({

                            content:
                                "âŒ PhiÃªn lai Ä‘Ã£ háº¿t. HÃ£y chá»n láº¡i cÃ¢y.",

                            ephemeral:
                                true
                        });
                    }

                    breedingSessions.delete(
                        `select:${interaction.user.id}`
                    );

                    return breedPlants(
                        interaction,
                        session.parentA,
                        session.parentB
                    );
                }

                // ========================================================
                // BREED CANCEL
                // ========================================================

                if (
                    id === "breed_cancel"
                ) {

                    breedingSessions.delete(
                        `select:${interaction.user.id}`
                    );

                    return interaction.update({

                        embeds: [
                            geneticsEmbed(
                                interaction.user
                            )
                        ],

                        components:
                            geneticsButtons()
                    });
                }

                // ========================================================
                // PLANT TO PLOT
                // ========================================================

                if (
                    id.startsWith(
                        "plant_"
                    )
                ) {

                    const parts =
                        id.split("_");

                    const plotId =
                        Number(
                            parts.pop()
                        );

                    const plantId =
                        parts
                            .slice(1)
                            .join("_");

                    return plantSeed(
                        interaction,
                        plantId,
                        plotId
                    );
                }

                // ========================================================
                // WATER PLOT
                // ========================================================

                if (
                    id.startsWith(
                        "water_"
                    )
                ) {

                    const plotId =
                        Number(
                            id.split(
                                "_"
                            )[1]
                        );

                    return waterPlot(
                        interaction,
                        plotId
                    );
                }

                // ========================================================
                // HARVEST PLOT
                // ========================================================

                if (
                    id.startsWith(
                        "harvest_"
                    )
                ) {

                    const plotId =
                        Number(
                            id.split(
                                "_"
                            )[1]
                        );

                    return harvest(
                        interaction,
                        plotId
                    );
                }

            } catch (error) {

                console.error(
                    "Interaction error:",
                    error
                );

                try {

                    if (
                        interaction.replied ||
                        interaction.deferred
                    ) {

                        await interaction.followUp({

                            content:
                                "âŒ CÃ³ lá»—i xáº£y ra.",

                            ephemeral:
                                true
                        });

                    } else {

                        await interaction.reply({

                            content:
                                "âŒ CÃ³ lá»—i xáº£y ra.",

                            ephemeral:
                                true
                        });
                    }

                } catch {}
            }
        }
    );
};

