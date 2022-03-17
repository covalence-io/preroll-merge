import ffmpeg from 'fluent-ffmpeg';
import { promises as fsPromises } from 'fs';
import { basename, join } from 'path';

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const FOLDERS = {
    PREROLL: './preroll',
    INPUT: './input',
    OUTPUT: './output',
    TEMP: './temp'
};
const ERRORS = {
    PREROLL: 'Please add a preroll video to the preroll folder',
    INPUT: 'Please add an input video to the input folder'
};

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

function isNil(obj: any) {
    return obj === null || typeof obj === 'undefined';
}

function isEmpty(obj: any) {
    return obj === '' || isNil(obj);
}

function isObject(obj: any) {
    return obj != null && typeof obj === 'object';
}

function isArray(obj: any) {
    return Object.prototype.toString.call(obj) === '[object Array]';
}

function onError(err: Error) {
    if (isObject(err)) {
        console.error(`Error: ${err.message}`, '\n');
    } else {
        console.error(err, '\n');
    }

    process.exitCode = 1;
}

function merge(prePath: string, inputPath: string) {
    return new Promise<void>((resolve, reject) => {
        const inputName = basename(inputPath);

        ffmpeg(prePath)
            .input(inputPath)
            .on('error', reject)
            .on('start', () => {
                console.log(`Starting merge for ${inputName}`);
            })
            .on('end', () => {
                console.log(`${inputName} merged!`);
                resolve();
            })
            .mergeToFile(join(FOLDERS.OUTPUT, inputName), <any>FOLDERS.TEMP);
    });
}

async function mergeAll() {
    try {
        const prerollFiles = await fsPromises.readdir(FOLDERS.PREROLL);

        if (!isArray(prerollFiles) || prerollFiles.length === 0) {
            throw new Error(ERRORS.PREROLL);
        }

        let preroll: string|undefined;

        for (const p of prerollFiles) {
            const apPath = join(FOLDERS.PREROLL, p);
            const stat = await fsPromises.stat(apPath);

            if (!stat.isDirectory()) {
                preroll = apPath;
                break;
            }
        }

        if (isEmpty(preroll)) {
            throw new Error(ERRORS.PREROLL);
        }

        const inputFiles = await fsPromises.readdir(FOLDERS.INPUT);

        if (!isArray(inputFiles) || inputFiles.length === 0) {
            throw new Error(ERRORS.INPUT);
        }

        for (const i of inputFiles) {
            const iPath = join(FOLDERS.INPUT, i);
            const stat = await fsPromises.stat(iPath);

            if (!stat.isDirectory()) {
                await merge(<string>preroll, iPath);
            }
        }
    } catch (e: any) {
        onError(e);
    }
}

mergeAll();
