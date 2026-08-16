const { db } = require("../db");

// ============================================================
// INVENTORY
// ============================================================

function getItem(
    userId,
    itemId
) {

    return db.prepare(`
        SELECT *
        FROM inventory
        WHERE user_id = ?
        AND item_id = ?
    `).get(
        userId,
        itemId
    );
}

function getItemCount(
    userId,
    itemId
) {

    const item =
        getItem(
            userId,
            itemId
        );

    return item
        ? item.quantity
        : 0;
}

function addItem(
    userId,
    itemId,
    amount
) {

    if (
        amount === 0
    ) {
        return;
    }

    const current =
        getItemCount(
            userId,
            itemId
        );

    const quantity =
        Math.max(
            0,
            current + amount
        );

    if (
        quantity <= 0
    ) {

        db.prepare(`
            DELETE FROM inventory
            WHERE user_id = ?
            AND item_id = ?
        `).run(
            userId,
            itemId
        );

        return;
    }

    db.prepare(`
        INSERT INTO inventory
        (
            user_id,
            item_id,
            quantity
        )
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, item_id)
        DO UPDATE SET
            quantity =
                excluded.quantity
    `).run(
        userId,
        itemId,
        quantity
    );
}

function getInventory(
    userId
) {

    return db.prepare(`
        SELECT *
        FROM inventory
        WHERE user_id = ?
        AND quantity > 0
        ORDER BY item_id
    `).all(
        userId
    );
}

module.exports = {
    getItem,
    getItemCount,
    addItem,
    getInventory
};
