const database = require("./database");

// ============================================================
// USER MODEL
// ============================================================

function User(userId, username) {

    this.userId = userId;
    this.username = username;

    this.data =
        database.getOrCreateUser(
            userId,
            username
        );

    this.garden =
        database.getGarden(
            userId
        );
}

User.prototype.refresh = function () {

    this.data =
        database.getOrCreateUser(
            this.userId,
            this.username
        );

    this.garden =
        database.getGarden(
            this.userId
        );

    return this;
};

User.prototype.addMora = function (
    amount
) {

    database.addMora(
        this.userId,
        amount
    );

    return this.refresh();
};

User.prototype.removeMora = function (
    amount
) {

    const result =
        database.removeMora(
            this.userId,
            amount
        );

    if (!result) {
        return false;
    }

    this.refresh();

    return true;
};

User.prototype.hasMora = function (
    amount
) {

    return database.hasMora(
        this.userId,
        amount
    );
};

User.prototype.addXP = function ({
    profileXP = 0,
    gardenXP = 0
} = {}) {

    database.addXP(
        this.userId,
        {
            profileXP,
            gardenXP
        }
    );

    return this.refresh();
};

User.prototype.addItem = function (
    itemId,
    amount
) {

    return database.addItem(
        this.userId,
        itemId,
        amount
    );
};

User.prototype.removeItem = function (
    itemId,
    amount
) {

    return database.removeItem(
        this.userId,
        itemId,
        amount
    );
};

User.prototype.hasItem = function (
    itemId,
    amount = 1
) {

    return database.hasItem(
        this.userId,
        itemId,
        amount
    );
};

User.prototype.getInventory = function () {

    return database.getInventory(
        this.userId
    );
};

User.prototype.getInventoryItem =
    function (itemId) {

        return database.getInventoryItem(
            this.userId,
            itemId
        );
    };

User.prototype.getProfileProgress =
    function () {

        return database.getLevelProgress(
            this.data.profile_xp
        );
    };

User.prototype.getGardenProgress =
    function () {

        return database.getLevelProgress(
            this.data.garden_xp
        );
    };

// ============================================================
// GARDEN MODEL
// ============================================================

function Garden(userId) {

    this.userId = userId;

    this.data =
        database.getGarden(
            userId
        );
}

Garden.prototype.refresh = function () {

    this.data =
        database.getGarden(
            this.userId
        );

    return this;
};

Garden.prototype.update = function ({
    slots,
    unlockedSlots,
    fertilizer,
    water
} = {}) {

    database.updateGarden(
        this.userId,
        {
            slots,
            unlockedSlots,
            fertilizer,
            water
        }
    );

    return this.refresh();
};

// ============================================================
// INVENTORY MODEL
// ============================================================

function Inventory(userId) {

    this.userId = userId;
}

Inventory.prototype.getAll =
    function () {

        return database.getInventory(
            this.userId
        );
    };

Inventory.prototype.get =
    function (itemId) {

        return database.getInventoryItem(
            this.userId,
            itemId
        );
    };

Inventory.prototype.add =
    function (
        itemId,
        amount
    ) {

        return database.addItem(
            this.userId,
            itemId,
            amount
        );
    };

Inventory.prototype.remove =
    function (
        itemId,
        amount
    ) {

        return database.removeItem(
            this.userId,
            itemId,
            amount
        );
    };

Inventory.prototype.has =
    function (
        itemId,
        amount = 1
    ) {

        return database.hasItem(
            this.userId,
            itemId,
            amount
        );
    };

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    User,
    Garden,
    Inventory
};