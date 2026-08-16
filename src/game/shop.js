const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require("discord.js");

const { db } = require("../db");

const plantDatabase =
    require("../../database/plants");

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
        `\`${user.username}\` — **Lv.${data.level}**`
    );

    lines.push("");

    lines.push(
        `💰 **Mora:** ${data.mora.toLocaleString()}`
    );

    lines.push(
        `🔄 **Đổi miễn phí hôm nay:** ${state.free_refreshes}/${FREE_SHOP_REFRESHES}`
    );

    lines.push("");

    lines.push(
        "🛒 **HẠT GIỐNG HÔM NAY**"
    );

    lines.push(
        `> Shop cá nhân • **${plants.length}/${SHOP_SIZE}** loại`
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
            `> ⏱️ Shop tự đổi <t:${refreshAt}:R>`
        );
    }

    lines.push("");

    if (!plants.length) {

        lines.push(
            "> 🌱 Hiện chưa có hạt giống nào được mở khóa."
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
                `> 💰 **${price.toLocaleString()} Mora** • ⏱️ ${formatTime(growth)}`
            );

            lines.push(
                `> 🎒 Đang có: **${owned}**`
            );

            lines.push("");
        }
    }

    lines.push(
        `💡 Đổi shop: **3 lần miễn phí/ngày**, sau đó **${SHOP_REFRESH_COST} Mora/lần**.`
    );

    return farmEmbed({
        user,
        title: "Cửa Hàng",
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
                            "Trang chủ"
                        )
                        .setEmoji(
                            "🏠"
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
                        `${price.toLocaleString()} Mora • Đang có: ${owned}`
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
                "🛒 Chọn hạt giống muốn mua..."
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
                    `❌ Bạn cần **${cost.toLocaleString()} Mora** để đổi shop.`,
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
                    "❌ Bạn không đủ Mora.",
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
            ? `🎁 **Đổi shop miễn phí thành công!**\n\n> 🔄 Còn **${newState.free_refreshes}/${FREE_SHOP_REFRESHES}** lượt miễn phí hôm nay.`
            : `🔄 **Đổi shop thành công!**\n\n> 💰 Đã trả: **${cost.toLocaleString()} Mora**\n> 💰 Còn lại: **${newUser.mora.toLocaleString()} Mora**`;

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
                "❌ Không tìm thấy hạt giống.",
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
                "❌ Hạt giống này không còn nằm trong shop hiện tại.",
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
                `🔒 Bạn cần **Lv.${plant.unlockLevel}** để mua hạt giống này.`,
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
                "❌ Số lượng không hợp lệ.",
            ephemeral: true
        });
    }

    if (
        quantity >
        MAX_BUY_QUANTITY
    ) {

        return interaction.reply({
            content:
                `❌ Tối đa **${MAX_BUY_QUANTITY} hạt/lần**.`,
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
                `❌ Không đủ Mora.\n\n` +
                `🌱 ${plantName(plant)}\n` +
                `🔢 ×${quantity}\n` +
                `💰 Đơn giá: ${price.toLocaleString()} Mora\n` +
                `💰 Tổng: ${total.toLocaleString()} Mora\n` +
                `💰 Bạn có: ${user.mora.toLocaleString()} Mora`,
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
                    "❌ Bạn không đủ Mora.",
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
                    "Mua Hạt Giống",

                description:
                    `${plantEmoji(plant)} **${plantName(plant)}**\n\n` +
                    `> 🌱 Đã mua: **×${quantity}**\n` +
                    `> 💰 Đơn giá: **${price.toLocaleString()} Mora**\n` +
                    `> 💰 Tổng: **-${total.toLocaleString()} Mora**\n` +
                    `> 🎒 Trong túi: **×${owned}**\n` +
                    `> 💰 Còn lại: **${newUser.mora.toLocaleString()} Mora**`,

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
