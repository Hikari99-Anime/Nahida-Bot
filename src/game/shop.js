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
    SHOP_SIZE,
    SHOP_REFRESH_MS,
    SHOP_REFRESH_COST,
    FREE_SHOP_REFRESHES,
    MAX_BUY_QUANTITY,
    COLORS
} = require("../config");

const { now, getDayKey, unixSeconds, formatTime } = require("../utils/time");
const { getUser, updateUser } = require("./user");
const { getItemCount, addItem } = require("./inventory");
const {
    getPlant,
    isHybridPlant,
    plantEmoji,
    plantName,
    plantGrowth,
    getSeedPrice
} = require("./plants");

const { farmEmbed } = require("../ui/embeds");
const { shopRefreshButton } = require("../ui/components");

// ============================================================
// SHOP STATE
// ============================================================

function getShopState(
    userId
) {

    let state =
        db.prepare(`
            SELECT *
            FROM shop_state
            WHERE user_id = ?
        `).get(
            userId
        );

    const today =
        getDayKey();

    if (!state) {

        state = {
            user_id: userId,
            seed_ids: "[]",
            refreshed_at: 0,
            free_refreshes:
                FREE_SHOP_REFRESHES,
            refresh_day: today
        };

        db.prepare(`
            INSERT INTO shop_state
            (
                user_id,
                seed_ids,
                refreshed_at,
                free_refreshes,
                refresh_day
            )
            VALUES (?, ?, ?, ?, ?)
        `).run(
            userId,
            "[]",
            0,
            FREE_SHOP_REFRESHES,
            today
        );

        return state;
    }

    if (
        state.refresh_day !==
        today
    ) {

        db.prepare(`
            UPDATE shop_state
            SET
                free_refreshes = ?,
                refresh_day = ?
            WHERE user_id = ?
        `).run(
            FREE_SHOP_REFRESHES,
            today,
            userId
        );

        state.free_refreshes =
            FREE_SHOP_REFRESHES;

        state.refresh_day =
            today;
    }

    return state;
}

// ============================================================
// SHOP PLANT POOL
// ============================================================

function getShopPool(
    userId
) {

    const user =
        getUser(userId);

    let plants =
        [];

    if (
        typeof plantDatabase.getAvailablePlants ===
        "function"
    ) {

        plants =
            plantDatabase
                .getAvailablePlants(
                    user.level
                )
                .filter(
                    p =>
                        p &&
                        p.id
                );
    } else if (
        typeof plantDatabase.getAllPlants ===
        "function"
    ) {

        plants =
            plantDatabase
                .getAllPlants()
                .filter(
                    p =>
                        p &&
                        p.id &&
                        (
                            p.unlockLevel === undefined ||
                            user.level >=
                            Number(
                                p.unlockLevel
                            )
                        )
                );
    }

    return plants;
}

// ============================================================
// RANDOM SHOP
// ============================================================

function randomShopPlants(
    userId
) {

    const pool =
        getShopPool(
            userId
        );

    if (!pool.length) {
        return [];
    }

    const shuffled =
        [...pool];

    for (
        let i =
            shuffled.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );

        [
            shuffled[i],
            shuffled[j]
        ] =
        [
            shuffled[j],
            shuffled[i]
        ];
    }

    return shuffled
        .slice(
            0,
            Math.min(
                SHOP_SIZE,
                shuffled.length
            )
        );
}

// ============================================================
// REFRESH SHOP
// ============================================================

function refreshShop(
    userId
) {

    const plants =
        randomShopPlants(
            userId
        );

    const ids =
        plants.map(
            p => p.id
        );

    db.prepare(`
        INSERT INTO shop_state
        (
            user_id,
            seed_ids,
            refreshed_at,
            free_refreshes,
            refresh_day
        )
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id)
        DO UPDATE SET
            seed_ids =
                excluded.seed_ids,
            refreshed_at =
                excluded.refreshed_at
    `).run(
        userId,
        JSON.stringify(ids),
        now(),
        getShopState(userId)
            .free_refreshes,
        getDayKey()
    );

    return plants;
}

// ============================================================
// GET SHOP PLANTS
// ============================================================

function getShopPlants(
    userId
) {

    let state =
        getShopState(
            userId
        );

    let ids = [];

    try {

        ids =
            JSON.parse(
                state.seed_ids ||
                "[]"
            );

    } catch {

        ids = [];
    }

    const expired =
        !state.refreshed_at ||
        (
            now() -
            Number(
                state.refreshed_at
            )
        >=
        SHOP_REFRESH_MS
        );

    if (
        expired ||
        !ids.length
    ) {

        return refreshShop(
            userId
        );
    }

    const plants =
        ids
            .map(
                id =>
                    getPlant(id)
            )
            .filter(Boolean);

    if (
        plants.length <
        Math.min(
            SHOP_SIZE,
            getShopPool(userId).length
        )
    ) {

        return refreshShop(
            userId
        );
    }

    return plants;
}

// ============================================================
// SHOP REMAINING
// ============================================================

function getShopRemainingMs(
    userId
) {

    const state =
        getShopState(
            userId
        );

    if (
        !state.refreshed_at
    ) {

        return 0;
    }

    return Math.max(
        0,
        SHOP_REFRESH_MS -
        (
            now() -
            Number(
                state.refreshed_at
            )
        )
    );
}

// ============================================================
// SHOP EMBED
// ============================================================

function shopEmbed(
    user
) {

    const data =
        getUser(user);

    const plants =
        getShopPlants(
            user.id
        );

    const remaining =
        getShopRemainingMs(
            user.id
        );

    const state =
        getShopState(
            user.id
        );

    const lines = [];

    lines.push(
        `\`${user.username}\` â€” **Lv.${data.level}**`
    );

    lines.push("");

    lines.push(
        `ðŸ’° **Mora:** ${data.mora.toLocaleString()}`
    );

    lines.push(
        `ðŸ”„ **Äá»•i miá»…n phÃ­ hÃ´m nay:** ${state.free_refreshes}/${FREE_SHOP_REFRESHES}`
    );

    lines.push("");

    lines.push(
        "ðŸ›’ **Háº T GIá»NG HÃ”M NAY**"
    );

    lines.push(
        `> Shop cÃ¡ nhÃ¢n â€¢ **${plants.length}/${SHOP_SIZE}** loáº¡i`
    );

    if (
        remaining > 0
    ) {

        const refreshAt =
            unixSeconds(
                now() +
                remaining
            );

        lines.push(
            `> â±ï¸ Shop tá»± Ä‘á»•i <t:${refreshAt}:R>`
        );
    }

    lines.push("");

    if (!plants.length) {

        lines.push(
            "> ðŸŒ± Hiá»‡n chÆ°a cÃ³ háº¡t giá»‘ng nÃ o Ä‘Æ°á»£c má»Ÿ khÃ³a."
        );

    } else {

        for (
            let i = 0;
            i < plants.length;
            i++
        ) {

            const plant =
                plants[i];

            const price =
                getSeedPrice(
                    plant
                );

            const growth =
                plantGrowth(
                    plant
                );

            const owned =
                getItemCount(
                    user.id,
                    plant.id
                );

            lines.push(
                `${i + 1}. ${plantEmoji(plant)} **${plantName(plant)}**`
            );

            lines.push(
                `> ðŸ’° **${price.toLocaleString()} Mora** â€¢ â±ï¸ ${formatTime(growth)}`
            );

            lines.push(
                `> ðŸŽ’ Äang cÃ³: **${owned}**`
            );

            lines.push("");
        }
    }

    lines.push(
        `ðŸ’¡ Äá»•i shop: **3 láº§n miá»…n phÃ­/ngÃ y**, sau Ä‘Ã³ **${SHOP_REFRESH_COST} Mora/láº§n**.`
    );

    return farmEmbed({
        user,
        title: "Cá»­a HÃ ng",
        description:
            lines.join("\n"),
        color:
            COLORS.gold
    });
}

// ============================================================
// SHOP SELECT
// ============================================================

function shopSelectMenu(
    user
) {

    const plants =
        getShopPlants(
            user.id
        );

    if (!plants.length) {

        return [
            new ActionRowBuilder()
                .addComponents(
                    shopRefreshButton(),
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
        ];
    }

    const options =
        plants.map(
            plant => {

                const price =
                    getSeedPrice(
                        plant
                    );

                const owned =
                    getItemCount(
                        user.id,
                        plant.id
                    );

                return {
                    label:
                        `${plantEmoji(plant)} ${plantName(plant)}`
                            .slice(
                                0,
                                100
                            ),

                    description:
                        `${price.toLocaleString()} Mora â€¢ Äang cÃ³: ${owned}`
                            .slice(
                                0,
                                100
                            ),

                    value:
                        plant.id
                };
            }
        );

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                "shop_buy"
            )
            .setPlaceholder(
                "ðŸ›’ Chá»n háº¡t giá»‘ng muá»‘n mua..."
            )
            .addOptions(
                options
            );

    return [

        new ActionRowBuilder()
            .addComponents(
                menu
            ),

        new ActionRowBuilder()
            .addComponents(

                shopRefreshButton(),

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
    ];
}

// ============================================================
// FORCE REFRESH SHOP
// ============================================================

async function forceRefreshShop(
    interaction
) {

    const user =
        getUser(
            interaction.user
        );

    const state =
        getShopState(
            interaction.user.id
        );

    const today =
        getDayKey();

    let free =
        Number(
            state.free_refreshes
        );

    if (
        state.refresh_day !==
        today
    ) {

        free =
            FREE_SHOP_REFRESHES;
    }

    let cost =
        0;

    if (
        free > 0
    ) {

        free--;

    } else {

        cost =
            SHOP_REFRESH_COST;

        if (
            user.mora <
            cost
        ) {

            return interaction.reply({
                content:
                    `âŒ Báº¡n cáº§n **${cost.toLocaleString()} Mora** Ä‘á»ƒ Ä‘á»•i shop.`,
                ephemeral: true
            });
        }
    }

    const transaction =
        db.transaction(() => {

            const fresh =
                getUser(
                    interaction.user.id
                );

            if (
                cost > 0 &&
                fresh.mora <
                cost
            ) {

                throw new Error(
                    "NOT_ENOUGH_MORA"
                );
            }

            if (
                cost > 0
            ) {

                updateUser(
                    interaction.user.id,
                    {
                        mora:
                            fresh.mora -
                            cost
                    }
                );
            }

            const plants =
                randomShopPlants(
                    interaction.user.id
                );

            db.prepare(`
                INSERT INTO shop_state
                (
                    user_id,
                    seed_ids,
                    refreshed_at,
                    free_refreshes,
                    refresh_day
                )
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(user_id)
                DO UPDATE SET
                    seed_ids =
                        excluded.seed_ids,
                    refreshed_at =
                        excluded.refreshed_at,
                    free_refreshes =
                        excluded.free_refreshes,
                    refresh_day =
                        excluded.refresh_day
            `).run(
                interaction.user.id,
                JSON.stringify(
                    plants.map(
                        p => p.id
                    )
                ),
                now(),
                free,
                today
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
                ephemeral: true
            });
        }

        throw error;
    }

    const newUser =
        getUser(
            interaction.user
        );

    const newState =
        getShopState(
            interaction.user.id
        );

    const message =
        cost === 0
            ? `ðŸŽ **Äá»•i shop miá»…n phÃ­ thÃ nh cÃ´ng!**\n\n> ðŸ”„ CÃ²n **${newState.free_refreshes}/${FREE_SHOP_REFRESHES}** lÆ°á»£t miá»…n phÃ­ hÃ´m nay.`
            : `ðŸ”„ **Äá»•i shop thÃ nh cÃ´ng!**\n\n> ðŸ’° ÄÃ£ tráº£: **${cost.toLocaleString()} Mora**\n> ðŸ’° CÃ²n láº¡i: **${newUser.mora.toLocaleString()} Mora**`;

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

// ============================================================
// BUY SEEDS
// ============================================================

async function buySeeds(
    interaction,
    plantId,
    quantity
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
                "âŒ KhÃ´ng tÃ¬m tháº¥y háº¡t giá»‘ng.",
            ephemeral: true
        });
    }

    const shopPlants =
        getShopPlants(
            interaction.user.id
        );

    const inShop =
        shopPlants.some(
            p =>
                p.id ===
                plant.id
        );

    if (!inShop) {

        return interaction.reply({
            content:
                "âŒ Háº¡t giá»‘ng nÃ y khÃ´ng cÃ²n náº±m trong shop hiá»‡n táº¡i.",
            ephemeral: true
        });
    }

    if (
        !isHybridPlant(
            plant.id
        ) &&
        plant.unlockLevel !==
        undefined &&
        user.level <
        Number(
            plant.unlockLevel
        )
    ) {

        return interaction.reply({
            content:
                `ðŸ”’ Báº¡n cáº§n **Lv.${plant.unlockLevel}** Ä‘á»ƒ mua háº¡t giá»‘ng nÃ y.`,
            ephemeral: true
        });
    }

    quantity =
        Number(
            quantity
        );

    if (
        !Number.isInteger(
            quantity
        ) ||
        quantity <= 0
    ) {

        return interaction.reply({
            content:
                "âŒ Sá»‘ lÆ°á»£ng khÃ´ng há»£p lá»‡.",
            ephemeral: true
        });
    }

    if (
        quantity >
        MAX_BUY_QUANTITY
    ) {

        return interaction.reply({
            content:
                `âŒ Tá»‘i Ä‘a **${MAX_BUY_QUANTITY} háº¡t/láº§n**.`,
            ephemeral: true
        });
    }

    const price =
        getSeedPrice(
            plant
        );

    const total =
        price *
        quantity;

    if (
        user.mora <
        total
    ) {

        return interaction.reply({
            content:
                `âŒ KhÃ´ng Ä‘á»§ Mora.\n\n` +
                `ðŸŒ± ${plantName(plant)}\n` +
                `ðŸ”¢ Ã—${quantity}\n` +
                `ðŸ’° ÄÆ¡n giÃ¡: ${price.toLocaleString()} Mora\n` +
                `ðŸ’° Tá»•ng: ${total.toLocaleString()} Mora\n` +
                `ðŸ’° Báº¡n cÃ³: ${user.mora.toLocaleString()} Mora`,
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
                total
            ) {

                throw new Error(
                    "NOT_ENOUGH_MORA"
                );
            }

            updateUser(
                interaction.user.id,
                {
                    mora:
                        freshUser.mora -
                        total
                }
            );

            addItem(
                interaction.user.id,
                plant.id,
                quantity
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
                ephemeral: true
            });
        }

        throw error;
    }

    const newUser =
        getUser(
            interaction.user
        );

    const owned =
        getItemCount(
            interaction.user.id,
            plant.id
        );

    return interaction.reply({

        embeds: [

            farmEmbed({

                user:
                    interaction.user,

                title:
                    "Mua Háº¡t Giá»‘ng",

                description:
                    `${plantEmoji(plant)} **${plantName(plant)}**\n\n` +
                    `> ðŸŒ± ÄÃ£ mua: **Ã—${quantity}**\n` +
                    `> ðŸ’° ÄÆ¡n giÃ¡: **${price.toLocaleString()} Mora**\n` +
                    `> ðŸ’° Tá»•ng: **-${total.toLocaleString()} Mora**\n` +
                    `> ðŸŽ’ Trong tÃºi: **Ã—${owned}**\n` +
                    `> ðŸ’° CÃ²n láº¡i: **${newUser.mora.toLocaleString()} Mora**`,

                color:
                    COLORS.gold
            })
        ],

        components:
            shopSelectMenu(
                interaction.user
            )
    });
}

module.exports = {
    getShopState,
    getShopPool,
    randomShopPlants,
    refreshShop,
    getShopPlants,
    getShopRemainingMs,
    shopEmbed,
    shopSelectMenu,
    forceRefreshShop,
    buySeeds
};

