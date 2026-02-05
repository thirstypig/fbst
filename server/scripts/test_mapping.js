
function identifyTeam(val) {
    if (!val) return null;
    const v = val.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!v) return null;

    const known = {
        "dodgerdawgs": "DDG", "dodger": "DDG", "devildawgs": "DEV", "devil": "DEV", "dawgs": "DEV",
        "diamondkings": "DKG", "diamond": "DKG", "kings": "DKG", "dkkings": "DKG",
        "demolitionlumber": "DMK", "demolition": "DMK", "lumber": "DMK",
        "skunkdogs": "SKD", "skunk": "SKD", "skunkdogs2": "SKD",
        "rgingsluggers": "RGS", "ragingsluggers": "RGS", "rging": "RGS", "raging": "RGS", "sluggers": "RGS",
        "losdoyers": "LDY", "doyers": "LDY", "los": "LDY",
        "theshow": "SHO", "show": "SHO",
        "foultip": "FTP", "foul": "FTP", "tip": "FTP",
        "bigunit": "BGU", "unit": "BGU", "big": "BGU",
        "theblacksox": "BSX", "blacksox": "BSX", "sox": "BSX",
        "thefluffers": "FLU", "fluffers": "FLU",
        "the": "SHO",
        // 2009 specific
        "bohica": "BOH", "boh": "BOH",
        "moneyball": "MNB", "money": "MNB", "mnb": "MNB"
    };
    
    if (known[v]) return known[v];
    const values = new Set(Object.values(known));
    if (values.has(val.trim().toUpperCase())) return val.trim().toUpperCase();
    const sortedKeys = Object.keys(known).sort((a, b) => b.length - a.length);
    for (const name of sortedKeys) {
        if (name.length > 3 && (v.includes(name) || name.includes(v))) return known[name];
    }
    return null;
}

const tests = [
    "B.O.H.I.C.A.",
    "MoneyBall",
    "money ball",
    "BOHICA",
    "Skunk Dogs",
    "Diamond Kings"
];

tests.forEach(t => {
    console.log(`"${t}" -> ${identifyTeam(t)}`);
});
