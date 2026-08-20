const { EmbedBuilder } = require("discord.js");

const plantDatabase =
    require("../database/plants");

const {
    COLORS,
    SHOP_REFRESH_COST,
    BREED_COST
} = require("../config");

const {
    unixSeconds,
    formatTime
} = require("../utils/time");

const {
    getUser,
    xpRequired
} = require("../game/user");

const {
    getInventory
} = require("../game/inventory");

const {
    getPlots,
    isReady
} = require("../game/plots");

const {
    isHybridPlant,
    getPlant,
    plantName,
    plantEmoji,
    plantGrowth,
    plantWaterCost,
    plantSellPrice,
    getSeedPrice
} = require("../game/plants");


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

    return new EmbedBuilder()
        .setColor(
            color ||
            COLORS.green
        )
        .setTitle(
            `🌱 ${title}`
        )
        .setDescription(
            description
        )
        .setFooter({
            text:
                `${user.username} • Lv.${data.level} • 💰 ${data.mora.toLocaleString()} Mora`
        })
        .setTimestamp();
}


// ============================================================
// HOME
// ============================================================

function homeEmbed(
    user
) {

    const data =
        getUser(user);

    const text = [

        `\`${user.username}\` — **Lv.${data.level}**`,

        "",

        '> “Mỗi hạt giống đều mang trong mình',
        '> một giấc mơ nhỏ.”',
        "> — Nahida",

        "",

        `💰 ${data.mora.toLocaleString()} Mora`,

        `💧 ${data.water}/200 Nước`,

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

function profileEmbed(
    user
) {

    const data =
        getUser(user);

    const text = [

        `\`${user.username}\``,

        "",

        `⭐ Level: **${data.level}**`,

        `✨ EXP: **${data.xp}/${xpRequired(data.level)}**`,

        `🌱 Farm Level: **${data.farm_level}**`,

        `🌾 Farm EXP: **${data.farm_xp}/${data.farm_level * 100}**`,

        "",

        `💰 Mora: **${data.mora.toLocaleString()}**`,

        `💧 Nước: **${data.water}/200**`,

        "",

        `🌾 Đã thu hoạch: **${data.harvest_count}**`,

        `🐛 Đã bắt sâu: **${data.bug_count}**`

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

function inventoryEmbed(
    user
) {

    const items =
        getInventory(
            user.id
        );

    const lines = [

        `\`${user.username}\` — **Lv.${getUser(user).level}**`,

        "",

        "🎒 **TÚI ĐỒ**",

        ""

    ];

    if (
        !items.length
    ) {

        lines.push(
            "> 🎒 Túi đồ đang trống."
        );

    } else {

        for (
            const item of items
        ) {

            const plant =
                getPlant(
                    item.item_id
                );

            if (!plant) {
                continue;
            }

            lines.push(
                `${plantEmoji(plant)} **${plantName(plant)}** ×${item.quantity}`
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

    const genes =
        isHybridPlant(plant.id)

            ? {

                growth:
                    plant.growth_gene,

                yield:
                    plant.yield_gene,

                water:
                    plant.water_gene,

                rarity:
                    plant.rarity_gene,

                mutation:
                    plant.mutation_gene

            }

            : (

                typeof plantDatabase.getGenes ===
                "function"

                    ? plantDatabase.getGenes(
                        plant.id
                    )

                    : null
            );

    const lines = [];

    lines.push(
        `\`${plant.name || plant.id}\``
    );

    if (
        plant.nameVi ||
        plant.name_vi
    ) {

        lines.push(
            `**${plantName(plant)}**`
        );
    }

    lines.push("");

    lines.push(
        `${plantEmoji(plant)} **${plant.region || "Hybrid"}**`
    );

    lines.push(
        `⭐ Rarity: **${plant.rarity ?? plant.rarity_gene ?? "?"}**`
    );

    lines.push("");

    lines.push(
        "🌱 **CANH TÁC**"
    );

    lines.push(
        `> ⏱️ Sinh trưởng: ${formatTime(plantGrowth(plant))}`
    );

    lines.push(
        `> 🌾 Sản lượng: ${plant.yield_min ?? plant.yield?.min ?? plant.yield ?? 1}–${plant.yield_max ?? plant.yield?.max ?? plant.yield ?? 1}`
    );

    lines.push(
        `> 💧 Nước: ${plantWaterCost(plant)}`
    );

    lines.push(
        `> 💰 Bán: ${plantSellPrice(plant)} Mora`
    );

    lines.push(
        `> 🌱 Giá hạt: ${getSeedPrice(plant).toLocaleString()} Mora`
    );

    if (
        plant.mutation_name
    ) {

        lines.push("");

        lines.push(
            `✨ Mutation: **${plant.mutation_emoji || "✨"} ${plant.mutation_name}**`
        );
    }

    if (genes) {

        lines.push("");

        lines.push(
            "🧬 **GENETICS**"
        );

        lines.push(
            `> Growth ${Number(genes.growth).toFixed(2)}`
        );

        lines.push(
            `> Yield ${Number(genes.yield).toFixed(2)}`
        );

        lines.push(
            `> Water ${Number(genes.water).toFixed(2)}`
        );

        lines.push(
            `> Rarity ${Number(genes.rarity).toFixed(2)}`
        );

        lines.push(
            `> Mutation ${Number(genes.mutation).toFixed(2)}`
        );
    }

    return farmEmbed({

        user,

        title:
            `${plantEmoji(plant)} ${plantName(plant)}`,

        description:
            lines.join("\n"),

        color:
            COLORS.purple
    });
}


// ============================================================
// FARM EMBED VIEW
// ============================================================

function farmEmbedView(
    user
) {

    const plots =
        getPlots(
            user.id
        );

    const lines = [

        `\`${user.username}\` — **Lv.${getUser(user).level}**`,

        "",

        "🌱 **NÔNG TRẠI**",

        ""

    ];

    for (
        const plot of plots
    ) {

        // ----------------------------------------------------
        // EMPTY PLOT
        // ----------------------------------------------------

        if (
            !plot.plant_id
        ) {

            lines.push(
                `🟫 **Ô ${plot.plot_id}** — Trống`
            );

            continue;
        }

        const plant =
            getPlant(
                plot.plant_id
            );

        // ----------------------------------------------------
        // INVALID PLANT
        // ----------------------------------------------------

        if (!plant) {

            lines.push(
                `🟫 **Ô ${plot.plot_id}** — Dữ liệu cây lỗi`
            );

            continue;
        }

        // ----------------------------------------------------
        // READY
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // WATER STATUS
        // ----------------------------------------------------

        lines.push(

            `> 💧 ${
                plot.watered
                    ? "Đã tưới"
                    : "Chưa tưới"
            }`

        );
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

function helpEmbed(
    user
) {

    const text = [

        `\`${user.username}\` — **Lv.${getUser(user).level}**`,

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

        "> Nước sẽ hồi đầy sau **30 phút**.",

        "> Không thể vượt quá **200 nước**.",

        "",

        "🛒 **CỬA HÀNG**",

        "> Shop có **5 loại hạt** riêng cho từng người.",

        "> Shop tự đổi sau **30 phút**.",

        "> Có **3 lần đổi shop miễn phí/ngày**.",

        `> Sau 3 lần: **${SHOP_REFRESH_COST} Mora/lần**.`,

        "> Chọn hạt → nhập số lượng muốn mua.",

        "",

        "🧬 **LAI TẠO**",

        `> Chi phí: **${BREED_COST} Mora/lần**.`,

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