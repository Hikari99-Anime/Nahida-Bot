// ============================================================
// TIME
// ============================================================

function now() {

    return Date.now();

}


// ============================================================
// UNIX SECONDS
// ============================================================

function unixSeconds(
    timestamp
) {

    return Math.floor(
        Number(timestamp) / 1000
    );

}


// ============================================================
// DAY KEY
// ============================================================

function getDayKey() {

    const date =
        new Date();

    return [

        date.getFullYear(),

        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        ),

        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        )

    ].join("-");

}


// ============================================================
// FORMAT TIME
// ============================================================

function formatTime(
    seconds
) {

    seconds =
        Math.max(
            0,
            Math.floor(
                Number(seconds) || 0
            )
        );

    const h =
        Math.floor(
            seconds / 3600
        );

    const m =
        Math.floor(
            (
                seconds % 3600
            ) / 60
        );

    const s =
        seconds % 60;

    if (
        h > 0
    ) {

        return (
            `${h} giờ ${m} phút`
        );
    }

    if (
        m > 0
    ) {

        return (
            `${m} phút ${s} giây`
        );
    }

    return (
        `${s} giây`
    );
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    now,
    unixSeconds,
    getDayKey,
    formatTime

};