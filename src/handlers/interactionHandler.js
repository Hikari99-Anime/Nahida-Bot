const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const { COLORS, BREED_COST } = require("../config");

const {
    getPlant,
    plantName,
    plantEmoji
} = require("../game/plants");

const {
    getItemCount
} = require("../game/inventory");

const {
    getPlots,
    isReady
} = require("../game/plots");

const {
    plantSeed,
    harvest,
    waterPlot,
    catchBug
} = require("../game/farm");

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
                        interaction.customId.slice(
                            "shop_quantity_".length
                        );

                    const quantity =
                        interaction.fields.getTextInputValue(
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

                    // ====================================================
                    // SHOP
                    // ====================================================

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
                                    "❌ Không tìm thấy hạt giống.",
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
                                    p.id === plant.id
                            )
                        ) {

                            return interaction.reply({
                                content:
                                    "❌ Hạt giống này không còn trong shop.",
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


                    // ====================================================
                    // PLANT
                    // ====================================================

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
                                    "❌ Không tìm thấy cây.",
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


                    // ====================================================
                    // BREED PARENT A
                    // ====================================================

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
                                    "❌ Không tìm thấy cây.",
                                ephemeral:
                                    true
                            });
                        }

                        breedingSessions.set(
                            `select:${interaction.user.id}`,
                            {
                                parentA,
                                parentB: null
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
                                        "🧬 Chọn Cây Mẹ",

                                    description:
                                        `👨 Cây bố: ${plantEmoji(plant)} **${plantName(plant)}**\n\n` +
                                        "🌱 Bây giờ hãy chọn cây mẹ.",

                                    color:
                                        COLORS.purple
                                })
                            ],

                            components:
                                rows ||
                                backButton()
                        });
                    }


                    // ====================================================
                    // BREED PARENT B
                    // ====================================================

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
                                    "❌ Phiên lai đã hết. Hãy bắt đầu lại.",
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
                                    "❌ Không tìm thấy cây.",
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
                                    "❌ Cây bố và cây mẹ phải khác nhau.",
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
                                    "❌ Bạn không đủ cây để lai.",
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
                                        "🧬 Xác Nhận Lai",

                                    description:
                                        `${plantEmoji(parentA)} **${plantName(parentA)}**\n` +
                                        "        🧬 +\n" +
                                        `${plantEmoji(parentBPlant)} **${plantName(parentBPlant)}**\n\n` +
                                        `> 💰 Chi phí: **${BREED_COST} Mora**\n` +
                                        "> 🌱 Tiêu hao 1 cây bố + 1 cây mẹ.\n" +
                                        "> ✨ Có cơ hội nhận Mutation.",

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
                                    "Gieo Hạt",

                                description:
                                    "🌱 Chọn giống cây bạn muốn gieo."
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
                                "💧 Hiện không có cây nào cần tưới.",

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
                                    `Ô ${plot.plot_id}`
                                )
                                .setEmoji(
                                    "💧"
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
                                    "Tưới Nước",

                                description:
                                    "💧 Chọn ô đất muốn tưới."
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
                                "🌱 Chưa có cây nào trưởng thành.",

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
                                    `Ô ${plot.plot_id}`
                                )
                                .setEmoji(
                                    "🌾"
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
                                    "Thu Hoạch",

                                description:
                                    "🌾 Chọn cây bạn muốn thu hoạch."
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
                        plants.length < 2
                    ) {

                        return interaction.reply({

                            content:
                                "❌ Bạn cần ít nhất **2 giống cây khác nhau** trong túi để lai.",

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
                                    "🧬 Chọn Cây Bố",

                                description:
                                    `💰 Chi phí lai: **${BREED_COST} Mora**\n\n` +
                                    "🌱 Hãy chọn cây bố từ túi đồ.",

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
                                "❌ Phiên lai đã hết. Hãy chọn lại cây.",

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
                            id.split("_")[1]
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
                            id.split("_")[1]
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
                                "❌ Có lỗi xảy ra.",

                            ephemeral:
                                true
                        });

                    } else {

                        await interaction.reply({

                            content:
                                "❌ Có lỗi xảy ra.",

                            ephemeral:
                                true
                        });
                    }

                } catch {}
            }
        }
    );
};