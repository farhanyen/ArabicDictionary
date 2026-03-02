import fs from 'fs';
import path from 'path';

async function readLocalFile(fp) {
    const fullPath = path.resolve(process.cwd(), fp);
    const data = await fs.promises.readFile(fullPath, { encoding: 'utf8' });
    return data;
}

export default readLocalFile;
