const { EmbedBuilder } = require("discord.js");

const plantDatabase =
    require("../database/plants");

const { COLORS, SHOP_REFRESH_COST, BREED_COST } = require("../config");
const { unixSeconds, formatTime } = require("../utils/time");
const { getUser, xpRequired } = require("../game/user");
const { getInventory } = require("../game/inventory");
const { getPlots, isReady } = require("../game/plots");
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
            `ðŸŒ± ${title}`
        )
        .setDescription(
            description
        )
        .setFooter({
            text:
                `${user.username} â€¢ Lv.${data.level} â€¢ ðŸ’° ${data.mora.toLocaleString()} Mora`
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
        `\`${user.username}\` â€” **Lv.${data.level}**`,
        "",
        "> â€œMá»—i háº¡t giá»‘ng Ä‘á»u mang trong mÃ¬nh",
        "> má»™t giáº¥c mÆ¡ nhá».â€",
        "> â€” Nahida",
        "",
        `ðŸ’° ${data.mora.toLocaleString()} Mora`,
        `ðŸ’§ ${data.water}/100 NÆ°á»›c`,
        "",
        "ðŸŒ± ChÄƒm sÃ³c khu vÆ°á»n cá»§a báº¡n,",
        "lai táº¡o giá»‘ng cÃ¢y má»›i vÃ  khÃ¡m phÃ¡",
        "nhá»¯ng Ä‘á»™t biáº¿n hiáº¿m."
    ].join("\n");

    return farmEmbed({
        user,
        title: "Khu VÆ°á»n",
        description: text,
        color: COLORS.green
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
        `â­ Level: **${data.level}**`,
        `âœ¨ EXP: **${data.xp}/${xpRequired(data.level)}**`,
        `ðŸŒ± Farm Level: **${data.farm_level}**`,
        `ðŸŒ¾ Farm EXP: **${data.farm_xp}/${data.farm_level * 100}**`,
        "",
        `ðŸ’° Mora: **${data.mora.toLocaleString()}**`,
        `ðŸ’§ NÆ°á»›c: **${data.water}/100**`,
        "",
        `ðŸŒ¾ ÄÃ£ thu hoáº¡ch: **${data.harvest_count}**`,
        `ðŸ› ÄÃ£ báº¯t sÃ¢u: **${data.bug_count}**`
    ].join("\n");

    return farmEmbed({
        user,
        title: "Há»“ SÆ¡",
        description: text,
        color: COLORS.purple
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
        `\`${user.username}\` â€” **Lv.${getUser(user).level}**`,
        "",
        "ðŸŽ’ **TÃšI Äá»’**",
        ""
    ];

    if (!items.length) {

        lines.push(
            "> ðŸŽ’ TÃºi Ä‘á»“ Ä‘ang trá»‘ng."
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
                `${plantEmoji(plant)} **${plantName(plant)}** Ã—${item.quantity}`
            );
        }
    }

    return farmEmbed({
        user,
        title: "TÃºi Äá»“",
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
        `â­ Rarity: **${plant.rarity ?? plant.rarity_gene ?? "?"}**`
    );

    lines.push("");

    lines.push(
        "ðŸŒ± **CANH TÃC**"
    );

    lines.push(
        `> â±ï¸ Sinh trÆ°á»Ÿng: ${formatTime(plantGrowth(plant))}`
    );

    lines.push(
        `> ðŸŒ¾ Sáº£n lÆ°á»£ng: ${plant.yield_min ?? plant.yield?.min ?? plant.yield ?? 1}â€“${plant.yield_max ?? plant.yield?.max ?? plant.yield ?? 1}`
    );

    lines.push(
        `> ðŸ’§ NÆ°á»›c: ${plantWaterCost(plant)}`
    );

    lines.push(
        `> ðŸ’° BÃ¡n: ${plantSellPrice(plant)} Mora`
    );

    lines.push(
        `> ðŸŒ± GiÃ¡ háº¡t: ${getSeedPrice(plant).toLocaleString()} Mora`
    );

    if (
        plant.mutation_name
    ) {

        lines.push("");

        lines.push(
            `âœ¨ Mutation: **${plant.mutation_emoji || "âœ¨"} ${plant.mutation_name}**`
        );
    }

    if (genes) {

        lines.push("");

        lines.push(
            "ðŸ§¬ **GENETICS**"
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
        `\`${user.username}\` â€” **Lv.${getUser(user).level}**`,
        "",
        "ðŸŒ± **NÃ”NG TRáº I**",
        ""
    ];

    for (
        const plot of plots
    ) {

        if (
            !plot.plant_id
        ) {

            lines.push(
                `ðŸŸ« **Ã” ${plot.plot_id}** â€” Trá»‘ng`
            );

            continue;
        }

        const plant =
            getPlant(
                plot.plant_id
            );

        if (!plant) {

            lines.push(
                `ðŸŸ« **Ã” ${plot.plot_id}** â€” Dá»¯ liá»‡u cÃ¢y lá»—i`
            );

            continue;
        }

        if (
            isReady(plot)
        ) {

            lines.push(
                `ðŸŒ¾ **Ã” ${plot.plot_id}** â€” ${plantEmoji(plant)} **${plantName(plant)}** â€” **Sáº´N SÃ€NG THU HOáº CH!**`
            );

        } else {

            const finish =
                unixSeconds(
                    plot.finish_at
                );

            lines.push(
                `ðŸŒ± **Ã” ${plot.plot_id}** â€” ${plantEmoji(plant)} **${plantName(plant)}** â€” <t:${finish}:R>`
            );
        }

        lines.push(
            `> ðŸ’§ ${plot.watered ? "ÄÃ£ tÆ°á»›i" : "ChÆ°a tÆ°á»›i"}`
        );
    }

    return farmEmbed({
        user,
        title: "NÃ´ng Tráº¡i",
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

        `\`${user.username}\` â€” **Lv.${getUser(user).level}**`,

        "",

        "ðŸŒ± **CÆ  Báº¢N**",

        "> `nstart` â€” má»Ÿ trang chá»§",
        "> `nprofile` â€” xem há»“ sÆ¡",
        "> `nfarm` â€” má»Ÿ nÃ´ng tráº¡i",
        "> `ninv` â€” xem tÃºi Ä‘á»“",

        "",

        "ðŸŒ¾ **NÃ”NG TRáº I**",

        "> Gieo háº¡t báº±ng nÃºt ðŸŒ±",
        "> TÆ°á»›i nÆ°á»›c báº±ng nÃºt ðŸ’§",
        "> Thu hoáº¡ch báº±ng nÃºt ðŸŒ¾",
        "> Báº¯t sÃ¢u báº±ng nÃºt ðŸ›",

        "",

        "ðŸ›’ **Cá»¬A HÃ€NG**",

        "> Shop cÃ³ **5 loáº¡i háº¡t** riÃªng cho tá»«ng ngÆ°á»i.",
        "> Shop tá»± Ä‘á»•i sau **30 phÃºt**.",
        "> CÃ³ **3 láº§n Ä‘á»•i shop miá»…n phÃ­/ngÃ y**.",
        `> Sau 3 láº§n: **${SHOP_REFRESH_COST} Mora/láº§n**.`,
        "> Chá»n háº¡t â†’ nháº­p sá»‘ lÆ°á»£ng muá»‘n mua.",

        "",

        "ðŸ§¬ **LAI Táº O**",

        `> Chi phÃ­: **${BREED_COST} Mora/láº§n**.`,
        "> Chá»n cÃ¢y bá»‘ â†’ chá»n cÃ¢y máº¹.",
        "> Má»—i cÃ¢y bá»‘/máº¹ tiÃªu hao 1 cÃ¢y.",
        "> Gene Ä‘Æ°á»£c káº¿ thá»«a tá»« cáº£ hai cÃ¢y.",
        "> CÃ³ cÆ¡ há»™i táº¡o Mutation hiáº¿m.",

        "",

        "ðŸ’¡ Thá»i gian cÃ¢y dÃ¹ng Ä‘á»“ng há»“ Discord."
    ].join("\n");

    return farmEmbed({
        user,
        title:
            "HÆ°á»›ng Dáº«n",
        description:
            text,
        color:
            COLORS.water
    });
}

module.exports = {
    farmEmbed,
    homeEmbed,
    profileEmbed,
    inventoryEmbed,
    plantDetailEmbed,
    farmEmbedView,
    helpEmbed
};

