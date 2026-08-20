const { EmbedBuilder } = require("discord.js");

// ============================================================
// CONFIG
// ============================================================

const {
    COLORS,
    SHOP_REFRESH_COST,
    BREED_COST
} = require("../config");

// ============================================================
// TIME
// ============================================================

const {
    unixSeconds,
    formatTime
} = require("../utils/time");

// ============================================================
// USER
// ============================================================

const {
    getUser,
    xpRequired
} = require("../game/user");

// ============================================================
// INVENTORY
// ============================================================

const {
    getInventory
} = require("../game/inventory");

// ============================================================
// PLOTS
// ============================================================

const {
    getPlots,
    isReady
} = require("../game/plots");

// ============================================================
// PLANTS
// ============================================================

const {
    getPlant,
    plantName,
    plantNameVi,
    plantEmoji,
    plantGrowth,
    plantWater,
    plantSellPrice,
    plantSeedPrice,
    plantRarity,
    plantYield,
    plantMutations,
    plantRegion,
    plantColor,
    plantFarmXP,
    plantProfileXP,
    rarityStars,
    rarityName
} = require("../game/plants");


// ============================================================
// SAFE NUMBER
// ============================================================

function safeNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}


// ============================================================
// MORA FORMAT
// ============================================================

function formatMora(value) {
    return safeNumber(value)
        .toLocaleString();
}


// ============================================================
// WATER
// ============================================================

function getWater(data) {
    return Math.max(
        0,
        Math.min(
            200,
            safeNumber(data?.water, 0)
        )
    );
}


// ============================================================
// FARM EMBED
// ============================================================

function farmEmbed({
    user,
    title,
    description,
    color
}) {

    const data =
        getUser(user);

    const mora =
        safeNumber(
            data?.mora,
            0
        );

    const water =
        getWater(data);

    const level =
        Math.max(
            1,
            safeNumber(
                data?.level,
                1
            )
        );

    return new EmbedBuilder()

        .setColor(
            color ||
            COLORS.green
        )

        .setTitle(
            `🌱 ${title || "Nahida Farm"}`
        )

        .setDescription(
            description || ""
        )

        .setFooter({
            text:
                `${user.username} • Lv.${level} • 💰 ${formatMora(mora)} Mora • 💧 ${water}/200`
        })

        .setTimestamp();
}


// ============================================================
// HOME
// ============================================================

function homeEmbed(user) {

    const data =
        getUser(user);

    const level =
        Math.max(
            1,
            safeNumber(
                data?.level,
                1
            )
        );

    const mora =
        safeNumber(
            data?.mora,
            0
        );

    const water =
        getWater(data);

    const text = [

        `\`${user.username}\` — **Lv.${level}**`,

        "",

        '> “Mỗi hạt giống đều mang trong mình',
        '> một giấc mơ nhỏ.”',
        "> — Nahida",

        "",

        `💰 **${formatMora(mora)} Mora**`,

        `💧 **${water}/200 Nước**`,

        "",

        "🌱 Chăm sóc khu vườn của bạn,",

        "lai tạo giống cây mới và khám phá",

        "những đột biến hiếm."

    ].join("\n");

    return farmEmbed({

        user,

        title:
            "Khu Vườn",

        description:
            text,

        color:
            COLORS.green

    });
}


// ============================================================
// PROFILE
// ============================================================

function profileEmbed(user) {

    const data =
        getUser(user);

    const level =
        Math.max(
            1,
            safeNumber(
                data?.level,
                1
            )
        );

    const xp =
        Math.max(
            0,
            safeNumber(
                data?.xp,
                0
            )
        );

    const farmLevel =
        Math.max(
            1,
            safeNumber(
                data?.farm_level,
                1
            )
        );

    const farmXP =
        Math.max(
            0,
            safeNumber(
                data?.farm_xp,
                0
            )
        );

    const mora =
        safeNumber(
            data?.mora,
            0
        );

    const water =
        getWater(data);

    const harvestCount =
        Math.max(
            0,
            safeNumber(
                data?.harvest_count,
                0
            )
        );

    const bugCount =
        Math.max(
            0,
            safeNumber(
                data?.bug_count,
                0
            )
        );

    const text = [

        `\`${user.username}\``,

        "",

        `⭐ Level: **${level}**`,

        `✨ EXP: **${xp}/${xpRequired(level)}**`,

        `🌱 Farm Level: **${farmLevel}**`,

        `🌾 Farm EXP: **${farmXP}/${farmLevel * 100}**`,

        "",

        `💰 Mora: **${formatMora(mora)}**`,

        `💧 Nước: **${water}/200**`,

        "",

        `🌾 Đã thu hoạch: **${harvestCount}**`,

        `🐛 Đã bắt sâu: **${bugCount}**`

    ].join("\n");

    return farmEmbed({

        user,

        title:
            "Hồ Sơ",

        description:
            text,

        color:
            COLORS.purple

    });
}


// ============================================================
// INVENTORY
// ============================================================

function inventoryEmbed(user) {

    const items =
        getInventory(
            user.id
        );

    const data =
        getUser(user);

    const lines = [

        `\`${user.username}\` — **Lv.${safeNumber(data.level, 1)}**`,

        "",

        "🎒 **TÚI ĐỒ**",

        ""

    ];

    if (!items || !items.length) {

        lines.push(
            "> 🎒 Túi đồ đang trống."
        );

    } else {

        for (const item of items) {

            if (!item) {
                continue;
            }

            const plant =
                getPlant(
                    item.item_id
                );

            if (!plant) {
                continue;
            }

            const quantity =
                Math.max(
                    0,
                    safeNumber(
                        item.quantity,
                        0
                    )
                );

            lines.push(
                `${plantEmoji(plant)} **${plantName(plant)}** ×${quantity}`
            );
        }

    }

    return farmEmbed({

        user,

        title:
            "Túi Đồ",

        description:
            lines.join("\n"),

        color:
            COLORS.gray

    });
}


// ============================================================
// PLANT DETAIL
// ============================================================

function plantDetailEmbed(
    user,
    plant
) {

    if (!plant) {

        return farmEmbed({

            user,

            title:
                "Cây Không Tồn Tại",

            description:
                "❌ Không tìm thấy dữ liệu cây.",

            color:
                COLORS.red

        });
    }

    // --------------------------------------------------------
    // RESOLVE PLANT
    // --------------------------------------------------------

    const resolved =
        typeof plant === "string"
            ? getPlant(plant)
            : plant;

    if (!resolved) {

        return farmEmbed({

            user,

            title:
                "Cây Không Tồn Tại",

            description:
                "❌ Không tìm thấy dữ liệu cây.",

            color:
                COLORS.red

        });
    }

    plant =
        resolved;

    // --------------------------------------------------------
    // BASIC
    // --------------------------------------------------------

    const id =
        String(
            plant.id || "unknown"
        );

    const name =
        plantName(plant);

    const nameVi =
        plantNameVi(plant);

    const emoji =
        plantEmoji(plant);

    const region =
        plantRegion(plant);

    const rarity =
        plantRarity(plant);

    const growth =
        plantGrowth(plant);

    const water =
        plantWater(plant);

    const sellPrice =
        plantSellPrice(plant);

    const seedPrice =
        plantSeedPrice(plant);

    const yieldData =
        plantYield(plant);

    const mutations =
        plantMutations(plant);

    const farmXP =
        plantFarmXP(plant);

    const profileXP =
        plantProfileXP(plant);

    // --------------------------------------------------------
    // DESCRIPTION
    // --------------------------------------------------------

    const lines = [];

    lines.push(
        `\`${id}\``
    );

    if (
        nameVi &&
        nameVi !== name
    ) {

        lines.push(
            `**${nameVi}**`
        );

    } else {

        lines.push(
            `**${name}**`
        );

    }

    lines.push("");

    // --------------------------------------------------------
    // INFO
    // --------------------------------------------------------

    lines.push(
        `${emoji} **${region}**`
    );

    lines.push(
        `${rarityStars(rarity)} **${rarityName(rarity)}**`
    );

    lines.push("");

    // --------------------------------------------------------
    // FARM
    // --------------------------------------------------------

    lines.push(
        "🌱 **CANH TÁC**"
    );

    lines.push(
        `> ⏱️ Sinh trưởng: **${formatTime(growth)}**`
    );

    lines.push(
        `> 🌾 Sản lượng: **${yieldData.min}–${yieldData.max}**`
    );

    lines.push(
        `> 💧 Nước: **${water}**`
    );

    lines.push(
        `> 💰 Bán: **${formatMora(sellPrice)} Mora**`
    );

    lines.push(
        `> 🌱 Giá hạt: **${formatMora(seedPrice)} Mora**`
    );

    // --------------------------------------------------------
    // XP
    // --------------------------------------------------------

    if (
        farmXP > 0 ||
        profileXP > 0
    ) {

        lines.push("");

        lines.push(
            "✨ **KINH NGHIỆM**"
        );

        lines.push(
            `> 🌾 Farm XP: **${farmXP}**`
        );

        lines.push(
            `> ⭐ Profile XP: **${profileXP}**`
        );
    }

    // --------------------------------------------------------
    // MUTATIONS
    // --------------------------------------------------------

    if (
        mutations.length
    ) {

        lines.push("");

        lines.push(
            "✨ **MUTATIONS**"
        );

        for (
            const mutation of mutations
        ) {

            if (
                typeof mutation === "string"
            ) {

                lines.push(
                    `> ✨ ${mutation}`
                );

                continue;
            }

            if (
                mutation &&
                typeof mutation === "object"
            ) {

                const mutationName =
                    mutation.name ||
                    mutation.nameVi ||
                    mutation.id ||
                    "Mutation";

                const mutationEmoji =
                    mutation.emoji ||
                    "✨";

                lines.push(
                    `> ${mutationEmoji} **${mutationName}**`
                );
            }
        }
    }

    // --------------------------------------------------------
    // GENES
    // --------------------------------------------------------

    if (
        plant.genes &&
        typeof plant.genes === "object"
    ) {

        const genes =
            plant.genes;

        lines.push("");

        lines.push(
            "🧬 **GENETICS**"
        );

        lines.push(
            `> Growth: **${safeNumber(genes.growth).toFixed(2)}**`
        );

        lines.push(
            `> Yield: **${safeNumber(genes.yield).toFixed(2)}**`
        );

        lines.push(
            `> Water: **${safeNumber(genes.water).toFixed(2)}**`
        );

        lines.push(
            `> Rarity: **${safeNumber(genes.rarity).toFixed(2)}**`
        );

        lines.push(
            `> Mutation: **${safeNumber(genes.mutation).toFixed(2)}**`
        );
    }

    // --------------------------------------------------------
    // DESCRIPTION
    // --------------------------------------------------------

    if (
        plant.description
    ) {

        lines.push("");

        lines.push(
            "📖 **MÔ TẢ**"
        );

        lines.push(
            `> ${plant.description}`
        );
    }

    return farmEmbed({

        user,

        title:
            `${emoji} ${name}`,

        description:
            lines.join("\n"),

        color:
            COLORS.purple

    });
}


// ============================================================
// FARM EMBED VIEW
// ============================================================

function farmEmbedView(user) {

    const plots =
        getPlots(
            user.id
        );

    const data =
        getUser(user);

    const level =
        Math.max(
            1,
            safeNumber(
                data?.level,
                1
            )
        );

    const lines = [

        `\`${user.username}\` — **Lv.${level}**`,

        "",

        "🌱 **NÔNG TRẠI**",

        ""

    ];

    if (
        !plots ||
        !plots.length
    ) {

        lines.push(
            "> 🟫 Chưa có ô đất nào."
        );

    } else {

        for (
            const plot of plots
        ) {

            // ------------------------------------------------
            // EMPTY PLOT
            // ------------------------------------------------

            if (
                !plot.plant_id
            ) {

                lines.push(
                    `🟫 **Ô ${plot.plot_id}** — Trống`
                );

                continue;
            }

            // ------------------------------------------------
            // GET PLANT
            // ------------------------------------------------

            const plant =
                getPlant(
                    plot.plant_id
                );

            // ------------------------------------------------
            // INVALID PLANT
            // ------------------------------------------------

            if (!plant) {

                lines.push(
                    `🟫 **Ô ${plot.plot_id}** — Dữ liệu cây lỗi`
                );

                continue;
            }

            // ------------------------------------------------
            // READY
            // ------------------------------------------------

            if (
                isReady(plot)
            ) {

                lines.push(

                    `🌾 **Ô ${plot.plot_id}** — ` +
                    `${plantEmoji(plant)} **${plantName(plant)}** — ` +
                    "**SẴN SÀNG THU HOẠCH!**"

                );

            } else {

                const finish =
                    unixSeconds(
                        plot.finish_at
                    );

                lines.push(

                    `🌱 **Ô ${plot.plot_id}** — ` +
                    `${plantEmoji(plant)} **${plantName(plant)}** — ` +
                    `<t:${finish}:R>`

                );
            }

            // ------------------------------------------------
            // WATER STATUS
            // ------------------------------------------------

            lines.push(

                `> 💧 ${
                    plot.watered
                        ? "Đã tưới"
                        : "Chưa tưới"
                }`

            );

            // ------------------------------------------------
            // OPTIONAL MUTATION
            // ------------------------------------------------

            if (
                plot.mutation
            ) {

                lines.push(
                    `> ✨ Mutation: **${plot.mutation}**`
                );
            }

        }

    }

    return farmEmbed({

        user,

        title:
            "Nông Trại",

        description:
            lines.join("\n"),

        color:
            COLORS.green

    });
}


// ============================================================
// HELP
// ============================================================

function helpEmbed(user) {

    const text = [

        `\`${user.username}\` — **Lv.${safeNumber(getUser(user).level, 1)}**`,

        "",

        "🌱 **CƠ BẢN**",

        "> `nstart` — mở trang chủ",

        "> `nprofile` — xem hồ sơ",

        "> `nfarm` — mở nông trại",

        "> `ninv` — xem túi đồ",

        "",

        "🌾 **NÔNG TRẠI**",

        "> Gieo hạt bằng nút 🌱",

        "> Tưới nước bằng nút 💧",

        "> Thu hoạch bằng nút 🌾",

        "> Bắt sâu bằng nút 🐛",

        "",

        "💧 **NƯỚC**",

        "> Sức chứa tối đa: **200 nước**.",

        "> Nước sẽ tự hồi theo thời gian.",

        "> Không thể vượt quá **200 nước**.",

        "",

        "🛒 **CỬA HÀNG**",

        "> Shop có các loại hạt riêng cho từng người.",

        "> Shop tự đổi sau một khoảng thời gian.",

        "> Có lượt đổi shop miễn phí mỗi ngày.",

        `> Sau lượt miễn phí: **${formatMora(SHOP_REFRESH_COST)} Mora/lần**.`,

        "> Chọn hạt → nhập số lượng muốn mua.",

        "",

        "🧬 **LAI TẠO**",

        `> Chi phí: **${formatMora(BREED_COST)} Mora/lần**.`,

        "> Chọn cây bố → chọn cây mẹ.",

        "> Mỗi cây bố/mẹ tiêu hao 1 cây.",

        "> Gene được kế thừa từ cả hai cây.",

        "> Có cơ hội tạo Mutation hiếm.",

        "",

        "💡 Thời gian cây dùng đồng hồ Discord."

    ].join("\n");

    return farmEmbed({

        user,

        title:
            "Hướng Dẫn",

        description:
            text,

        color:
            COLORS.water

    });
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    farmEmbed,

    homeEmbed,

    profileEmbed,

    inventoryEmbed,

    plantDetailEmbed,

    farmEmbedView,

    helpEmbed

};