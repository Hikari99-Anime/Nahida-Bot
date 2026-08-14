const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");


/*
==================================================
DATABASE PATH
==================================================
*/

const dbPath =
    process.env.DATABASE_PATH ||
    "./data/nahida.db";

const directory =
    path.dirname(dbPath);

if (!fs.existsSync(directory)) {

    fs.mkdirSync(
        directory,
        {
            recursive: true
        }
    );
}


/*
==================================================
CONNECT DATABASE
==================================================
*/

const db =
    new Database(dbPath);


/*
==================================================
SQLITE SETTINGS
==================================================
*/

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");


/*
==================================================
USERS
==================================================
*/

db.exec(`
    CREATE TABLE IF NOT EXISTS users (

        id TEXT PRIMARY KEY,

        username TEXT NOT NULL,

        level INTEGER NOT NULL DEFAULT 1,

        exp INTEGER NOT NULL DEFAULT 0,

        mora INTEGER NOT NULL DEFAULT 0,

        luck INTEGER NOT NULL DEFAULT 0,

        created_at INTEGER NOT NULL,

        updated_at INTEGER NOT NULL
    );
`);


/*
==================================================
FARMS
==================================================
*/

db.exec(`
    CREATE TABLE IF NOT EXISTS farms (

        user_id TEXT PRIMARY KEY,

        level INTEGER NOT NULL DEFAULT 1,

        exp INTEGER NOT NULL DEFAULT 0,

        plot_count INTEGER NOT NULL DEFAULT 4,

        created_at INTEGER NOT NULL,

        updated_at INTEGER NOT NULL,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
    );
`);


/*
==================================================
FARM PLOTS
==================================================
*/

db.exec(`
    CREATE TABLE IF NOT EXISTS farm_plots (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id TEXT NOT NULL,

        slot INTEGER NOT NULL,

        plant_id INTEGER DEFAULT NULL,

        unlocked INTEGER NOT NULL DEFAULT 1,

        UNIQUE(user_id, slot),

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
    );
`);


/*
==================================================
PLANT SPECIES
==================================================
*/

db.exec(`
    CREATE TABLE IF NOT EXISTS plant_species (

        id TEXT PRIMARY KEY,

        name TEXT NOT NULL,

        emoji TEXT NOT NULL,

        rarity INTEGER NOT NULL DEFAULT 1,

        growth_seconds INTEGER NOT NULL,

        sell_price INTEGER NOT NULL DEFAULT 10,

        base_vitality INTEGER NOT NULL DEFAULT 50,

        base_growth INTEGER NOT NULL DEFAULT 50,

        base_quality INTEGER NOT NULL DEFAULT 50,

        base_luck INTEGER NOT NULL DEFAULT 0
    );
`);


/*
==================================================
OLD PLANTS
==================================================

Giữ lại để tương thích code cũ.

Plant Individual mới dùng:
plant_individuals
==================================================
*/

db.exec(`
    CREATE TABLE IF NOT EXISTS plants (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id TEXT NOT NULL,

        species_id TEXT NOT NULL,

        generation INTEGER NOT NULL DEFAULT 1,

        rarity INTEGER NOT NULL DEFAULT 1,

        vitality INTEGER NOT NULL DEFAULT 50,

        growth INTEGER NOT NULL DEFAULT 50,

        quality INTEGER NOT NULL DEFAULT 50,

        luck INTEGER NOT NULL DEFAULT 0,

        planted_at INTEGER,

        ready_at INTEGER,

        watered INTEGER NOT NULL DEFAULT 0,

        harvested INTEGER NOT NULL DEFAULT 0,

        created_at INTEGER NOT NULL,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE,

        FOREIGN KEY (species_id)
            REFERENCES plant_species(id)
    );
`);


/*
==================================================
PLANT INDIVIDUALS
==================================================
*/

db.exec(`
    CREATE TABLE IF NOT EXISTS plant_individuals (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id TEXT NOT NULL,

        species_id TEXT NOT NULL,

        generation INTEGER NOT NULL DEFAULT 1,

        vitality INTEGER NOT NULL DEFAULT 50,

        growth INTEGER NOT NULL DEFAULT 50,

        quality INTEGER NOT NULL DEFAULT 50,

        luck INTEGER NOT NULL DEFAULT 0,

        planted_at TEXT NOT NULL,

        ready_at TEXT NOT NULL,

        watered INTEGER NOT NULL DEFAULT 0,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE,

        FOREIGN KEY (species_id)
            REFERENCES plant_species(id)
    );
`);


/*
==================================================
PLANT GENES
==================================================

Schema mới hỗ trợ:

- gene_type
- gene_code
- gene_name
- gene_value
- dominance
- mutation

Hệ thống Gene nâng cao:

- allele_a
- allele_b
- dominant_allele
- recessive_allele

Discovery:

- discovered
- discovered_at

==================================================
*/

db.exec(`
    CREATE TABLE IF NOT EXISTS plant_genes (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        plant_id INTEGER NOT NULL,

        gene_type TEXT NOT NULL DEFAULT 'vitality',

        gene_code TEXT NOT NULL DEFAULT 'UNKNOWN',

        gene_name TEXT NOT NULL DEFAULT 'Unknown Gene',

        gene_value INTEGER NOT NULL DEFAULT 0,

        dominance TEXT NOT NULL DEFAULT 'recessive',

        mutation INTEGER NOT NULL DEFAULT 0,

        allele_a TEXT NOT NULL DEFAULT '',

        allele_b TEXT NOT NULL DEFAULT '',

        dominant_allele TEXT DEFAULT NULL,

        recessive_allele TEXT DEFAULT NULL,

        discovered INTEGER NOT NULL DEFAULT 0,

        discovered_at INTEGER DEFAULT NULL,

        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (plant_id)
            REFERENCES plant_individuals(id)
            ON DELETE CASCADE
    );
`);


/*
==================================================
DATABASE MIGRATION HELPERS
==================================================
*/

/*
Không dùng ALTER TABLE trực tiếp nếu column
đã tồn tại.

Điều này rất quan trọng vì database .db của
bạn đã được tạo từ các phiên bản code cũ.
*/

function columnExists(
    tableName,
    columnName
) {

    const columns =
        db.prepare(
            `PRAGMA table_info(${tableName})`
        ).all();

    return columns.some(
        column =>
            column.name === columnName
    );
}


function addColumnIfMissing(
    tableName,
    columnName,
    definition
) {

    if (
        columnExists(
            tableName,
            columnName
        )
    ) {

        return false;
    }


    console.log(
        `[DATABASE] Adding column ${tableName}.${columnName}`
    );


    db.exec(`
        ALTER TABLE ${tableName}
        ADD COLUMN ${columnName} ${definition}
    `);


    return true;
}


/*
==================================================
MIGRATE PLANT GENES
==================================================

Đây là phần quan trọng nhất.

Database cũ của bạn có thể đang có schema kiểu:

    id
    plant_id
    gene_code
    gene_type
    allele_a
    allele_b
    dominant_allele
    recessive_allele
    created_at

Hoặc schema cũ hơn chỉ có:

    id
    plant_id
    gene_type
    gene_code

Ta bổ sung tất cả column còn thiếu.
==================================================
*/


/*
------------------------------------------
GENE TYPE
------------------------------------------
*/

addColumnIfMissing(
    "plant_genes",
    "gene_type",
    "TEXT NOT NULL DEFAULT 'vitality'"
);


/*
------------------------------------------
GENE CODE
------------------------------------------
*/

addColumnIfMissing(
    "plant_genes",
    "gene_code",
    "TEXT NOT NULL DEFAULT 'UNKNOWN'"
);


/*
------------------------------------------
GENE NAME
------------------------------------------
*/

addColumnIfMissing(
    "plant_genes",
    "gene_name",
    "TEXT NOT NULL DEFAULT 'Unknown Gene'"
);


/*
------------------------------------------
GENE VALUE
------------------------------------------
*/

addColumnIfMissing(
    "plant_genes",
    "gene_value",
    "INTEGER NOT NULL DEFAULT 0"
);


/*
------------------------------------------
DOMINANCE
------------------------------------------
*/

addColumnIfMissing(
    "plant_genes",
    "dominance",
    "TEXT NOT NULL DEFAULT 'recessive'"
);


/*
------------------------------------------
MUTATION
------------------------------------------
*/

addColumnIfMissing(
    "plant_genes",
    "mutation",
    "INTEGER NOT NULL DEFAULT 0"
);


/*
------------------------------------------
ALLELE A
------------------------------------------
*/

addColumnIfMissing(
    "plant_genes",
    "allele_a",
    "TEXT NOT NULL DEFAULT ''"
);


/*
------------------------------------------
ALLELE B
------------------------------------------
*/

addColumnIfMissing(
    "plant_genes",
    "allele_b",
    "TEXT NOT NULL DEFAULT ''"
);


/*
------------------------------------------
DOMINANT ALLELE
------------------------------------------
*/

addColumnIfMissing(
    "plant_genes",
    "dominant_allele",
    "TEXT DEFAULT NULL"
);


/*
------------------------------------------
RECESSIVE ALLELE
------------------------------------------
*/

addColumnIfMissing(
    "plant_genes",
    "recessive_allele",
    "TEXT DEFAULT NULL"
);


/*
------------------------------------------
DISCOVERED
------------------------------------------
*/

addColumnIfMissing(
    "plant_genes",
    "discovered",
    "INTEGER NOT NULL DEFAULT 0"
);


/*
------------------------------------------
DISCOVERED AT
------------------------------------------
*/

addColumnIfMissing(
    "plant_genes",
    "discovered_at",
    "INTEGER DEFAULT NULL"
);


/*
------------------------------------------
CREATED AT
------------------------------------------

Dùng DEFAULT '' thay vì
CURRENT_TIMESTAMP khi ALTER TABLE.

SQLite không phải phiên bản nào cũng cho phép
ADD COLUMN với DEFAULT CURRENT_TIMESTAMP.
------------------------------------------
*/

addColumnIfMissing(
    "plant_genes",
    "created_at",
    "TEXT NOT NULL DEFAULT ''"
);


/*
==================================================
NORMALIZE OLD GENE DATA
==================================================

Nếu database cũ có gene_type = "normal",
chuyển thành "vitality" để hệ thống mới
hoạt động thống nhất.

Không bắt buộc nhưng giúp tránh dữ liệu
cũ gây lỗi UI.
==================================================
*/

try {

    db.prepare(`
        UPDATE plant_genes

        SET gene_type = 'vitality'

        WHERE
            gene_type IS NULL
            OR gene_type = ''
            OR gene_type = 'normal'
    `).run();

} catch (error) {

    console.error(
        "[DATABASE] Gene type normalization error:",
        error
    );
}


/*
==================================================
NORMALIZE NULL GENE DATA
==================================================

Các database cũ có thể đã có dữ liệu NULL
ở những column mới.

Sau migration, đảm bảo code Gene không
nhận NULL ngoài ý muốn.
==================================================
*/

try {

    db.exec(`
        UPDATE plant_genes

        SET gene_name = 'Unknown Gene'

        WHERE
            gene_name IS NULL
            OR gene_name = '';
    `);


    db.exec(`
        UPDATE plant_genes

        SET gene_value = 0

        WHERE
            gene_value IS NULL;
    `);


    db.exec(`
        UPDATE plant_genes

        SET dominance = 'recessive'

        WHERE
            dominance IS NULL
            OR dominance = '';
    `);


    db.exec(`
        UPDATE plant_genes

        SET mutation = 0

        WHERE
            mutation IS NULL;
    `);


    db.exec(`
        UPDATE plant_genes

        SET allele_a = ''

        WHERE
            allele_a IS NULL;
    `);


    db.exec(`
        UPDATE plant_genes

        SET allele_b = ''

        WHERE
            allele_b IS NULL;
    `);


    db.exec(`
        UPDATE plant_genes

        SET discovered = 0

        WHERE
            discovered IS NULL;
    `);

} catch (error) {

    console.error(
        "[DATABASE] Gene normalization error:",
        error
    );
}


/*
==================================================
INDEXES
==================================================
*/

db.exec(`
    CREATE INDEX IF NOT EXISTS idx_farm_plots_user
    ON farm_plots(user_id);

    CREATE INDEX IF NOT EXISTS idx_plants_user
    ON plants(user_id);

    CREATE INDEX IF NOT EXISTS idx_plant_individuals_user
    ON plant_individuals(user_id);

    CREATE INDEX IF NOT EXISTS idx_plant_individuals_species
    ON plant_individuals(species_id);

    CREATE INDEX IF NOT EXISTS idx_plant_genes_plant
    ON plant_genes(plant_id);

    CREATE INDEX IF NOT EXISTS idx_plant_genes_type
    ON plant_genes(gene_type);

    CREATE INDEX IF NOT EXISTS idx_plant_genes_code
    ON plant_genes(gene_code);

    CREATE INDEX IF NOT EXISTS idx_plant_genes_discovered
    ON plant_genes(discovered);
`);

/*
==================================================
PLANT BREEDINGS
==================================================
*/

db.prepare(`
    CREATE TABLE IF NOT EXISTS plant_breedings (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id TEXT NOT NULL,

        parent_1_id INTEGER NOT NULL,

        parent_2_id INTEGER NOT NULL,

        child_id INTEGER NOT NULL,

        generation INTEGER NOT NULL DEFAULT 1,

        created_at INTEGER NOT NULL,

        FOREIGN KEY (parent_1_id)
            REFERENCES plant_individuals(id),

        FOREIGN KEY (parent_2_id)
            REFERENCES plant_individuals(id),

        FOREIGN KEY (child_id)
            REFERENCES plant_individuals(id)
    )
`).run();
/*
==================================================
DATABASE READY CHECK
==================================================
*/

try {

    const geneColumns =
        db.prepare(
            `PRAGMA table_info(plant_genes)`
        ).all();


    console.log(
        "[DATABASE] plant_genes columns:"
    );

    console.table(
        geneColumns.map(
            column => ({
                name:
                    column.name,

                type:
                    column.type,

                notnull:
                    column.notnull,

                default:
                    column.dflt_value
            })
        )
    );

} catch (error) {

    console.error(
        "[DATABASE] Failed to inspect plant_genes:",
        error
    );
}


/*
==================================================
EXPORT
==================================================
*/

module.exports = db;