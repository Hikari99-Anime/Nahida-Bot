const { ADMIN_ID } = require("../config");

// ============================================================
// ADMIN
// ============================================================

function isAdmin(user) {

    if (!ADMIN_ID) {
        return false;
    }

    return String(user.id) ===
        String(ADMIN_ID);
}

function adminOnly(interactionOrMessage) {

    const user =
        interactionOrMessage.user ||
        interactionOrMessage.author;

    return isAdmin(user);
}

// ============================================================
// ADMIN HELPERS
// ============================================================

function getMentionedUser(message) {

    return (
        message.mentions.users.first() ||
        null
    );
}

function adminError(message) {

    return message.reply({
        content:
            "âŒ Báº¡n khÃ´ng cÃ³ quyá»n sá»­ dá»¥ng lá»‡nh Admin."
    });
}

function adminTargetError(message) {

    return message.reply({
        content:
            "âŒ HÃ£y mention ngÆ°á»i chÆ¡i cáº§n chá»‰nh.\n\n" +
            "VÃ­ dá»¥:\n" +
            "`nadmin mora @user 10000`"
    });
}

module.exports = {
    isAdmin,
    adminOnly,
    getMentionedUser,
    adminError,
    adminTargetError
};

