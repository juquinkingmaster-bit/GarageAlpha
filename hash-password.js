// Usage : node scripts/hash-password.js "Identifiant" "MotDePasse"  → valeurs pour ADMIN_SALT et ADMIN_HASHES
const crypto = require("crypto");
const [user, pass] = process.argv.slice(2);
if (!user || !pass) { console.error('Usage : node scripts/hash-password.js "Identifiant" "MotDePasse"'); process.exit(1); }
const salt = process.env.ADMIN_SALT ? Buffer.from(process.env.ADMIN_SALT, "base64") : crypto.randomBytes(16);
const u = user.trim().toLowerCase().replace(/\s+/g, " ");
console.log("ADMIN_SALT=" + salt.toString("base64"));
console.log("ADMIN_HASHES=" + crypto.pbkdf2Sync(u + "\n" + pass, salt, 210000, 32, "sha256").toString("base64"));
