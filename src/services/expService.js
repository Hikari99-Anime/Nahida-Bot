const User = require("../database/models/User");

function requiredExp(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
}

function addExp(userId, amount) {
    const user = User.getUser(userId);

    if (!user) {
        throw new Error("User not found");
    }

    let level = user.level;
    let exp = user.exp + amount;
    let levelsGained = 0;

    while (exp >= requiredExp(level)) {
        exp -= requiredExp(level);
        level++;
        levelsGained++;
    }

    const updated = User.updateUser(userId, {
        level,
        exp
    });

    return {
        user: updated,
        amount,
        levelsGained,
        requiredExp: requiredExp(level)
    };
}

module.exports = {
    requiredExp,
    addExp
};