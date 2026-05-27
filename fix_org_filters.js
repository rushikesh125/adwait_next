const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

let modifiedFiles = 0;

walkDir(srcDir, function(filePath) {
    if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Pattern 1: query(collection(db, "locations"), where("orgId", "==", user.orgId))
    content = content.replace(/query\(\s*collection\(db,\s*"locations"\),\s*where\("orgId",\s*"==",\s*user\.orgId\)\s*\)/g, 'collection(db, "locations")');
    // Pattern 2: query(collection(db, "locations"), ...orgFilter(orgId))
    content = content.replace(/query\(\s*collection\(db,\s*"locations"\),\s*\.\.\.orgFilter\(orgId\)\s*\)/g, 'collection(db, "locations")');
    // Pattern 3: query(collection(db, "locations"), ...(orgId ? [where("orgId", "==", orgId)] : []))
    content = content.replace(/query\(\s*collection\(db,\s*"locations"\),\s*\.\.\.\(orgId\s*\?\s*\[where\("orgId",\s*"==",\s*orgId\)\]\s*:\s*\[\]\)\s*\)/g, 'collection(db, "locations")');
    // Pattern 4: query(collection(db, "locations"), ...orgFilter(orgId), orderBy("name"))
    content = content.replace(/query\(\s*collection\(db,\s*"locations"\),\s*\.\.\.orgFilter\(orgId\),\s*orderBy\("name"\)\s*\)/g, 'query(collection(db, "locations"), orderBy("name"))');

    // Pattern 1: query(collection(db, "transport"), where("orgId", "==", user.orgId))
    content = content.replace(/query\(\s*collection\(db,\s*"transport"\),\s*where\("orgId",\s*"==",\s*user\.orgId\)\s*\)/g, 'collection(db, "transport")');
    // Pattern 2: query(collection(db, "transport"), ...orgFilter(orgId))
    content = content.replace(/query\(\s*collection\(db,\s*"transport"\),\s*\.\.\.orgFilter\(orgId\)\s*\)/g, 'collection(db, "transport")');
    // Pattern 3: query(collection(db, "transport"), ...orgFilter(user.orgId))
    content = content.replace(/query\(\s*collection\(db,\s*"transport"\),\s*\.\.\.orgFilter\(user\.orgId\)\s*\)/g, 'collection(db, "transport")');
    // Pattern 4: query(collection(db, "transport"), ...orgFilter(orgId), orderBy("name"))
    content = content.replace(/query\(\s*collection\(db,\s*"transport"\),\s*\.\.\.orgFilter\(orgId\),\s*orderBy\("name"\)\s*\)/g, 'query(collection(db, "transport"), orderBy("name"))');

    if (original !== content) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Modified:', filePath);
        modifiedFiles++;
    }
});

console.log('Total files modified:', modifiedFiles);
