import * as fs from 'fs';
import {PNG} from 'pngjs';
import * as path from 'path';

export const findCoordinatesToIgnore = (pngData: Buffer, startingIndex: number = 0, endIndex: number = 0, skipBy: number = 0) => {
    const png: PNG.PNGWithMetadata = PNG.sync.read(pngData);
    const width: number = png.width;
    const height: number = png.height;
    let pixels: any[] = [];
    fs.writeFileSync("test.txt", "utf-8");
    const uniqueRGB: Map<string, number> = new Map();

    for (let i = 0, j=0; i < png.data.length; i += 4, j++) {
        const r: number = png.data[i];
        const g: number = png.data[i + 1];
        const b: number = png.data[i + 2];
        pixels[j] = [r, g, b];
        uniqueRGB.add(`${r}, ${g}, ${b}`);
    }
    const coordinatesToIgnore: any[] = [];
    let x=0, y=0;

    for (let i = startingIndex; i < pixels.length; i++) {
        const r: number = pixels[i][0];
        const g: number = pixels[i][1];
        const b: number = pixels[i][2];

        // if ((r != 255 && g != 255 && b != 255) || (r != 128 && g != 128 && b != 128)) {
        if ((r === 255 && g === 255 && b === 255) || (r === 128 && g === 128 && b === 128)) {
            coordinatesToIgnore.push([x, y]);
        }

        y++;
        if(y === endIndex) {
            y = 0;
            x++;
            i += skipBy-1;
        }
    }

    return coordinatesToIgnore;
}

(async() => {
    const pngBinaryData: Buffer = fs.readFileSync(path.join(__dirname, '../src/test.png'));
    const coordinates = findCoordinatesToIgnore(pngBinaryData, 1280, 2560, 2560);

    console.log(`coordinates: ${coordinates.length}`);
})();