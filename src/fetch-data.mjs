import fs from "fs";
import path from "path";
import { writeFile } from "fs";
import { promisify } from "util";

import neatCsv from "neat-csv";
import sharp from "sharp";

import {
  formResponsesSheetId,
  readyTabId,
  driveApiKey,
  memeMediaFolder,
} from "./config.mjs";

const sheetUrl = `https://docs.google.com/spreadsheets/d/${formResponsesSheetId}/export?format=csv&gid=${readyTabId}`;

const toCamelCase = (str) =>
  str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.|$)/g, (m, chr) => chr.toUpperCase());

const writeFilePromise = promisify(writeFile);

const getDriveApiUrl = (id) =>
  `https://www.googleapis.com/drive/v3/files/${id}?key=${driveApiKey}&alt=media`;

const timer = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const downloadFile = async (url, outputPath, fileStem) =>
  await fetch(url)
    .then((response) => {
      if (response.ok) return response;
      console.dir(response);
      process.exit(1);
    })
    .then(async (response) => {
      const mimeType = response.headers.get("content-type");
      const buffer = await response.arrayBuffer();
      const filename = `${fileStem}.${mimeType.split("/")[1]}`;
      const destination = path.join(outputPath, filename);
      const rotatedBuffer = await sharp(Buffer.from(buffer))
        .rotate()
        .toBuffer();
      writeFilePromise(destination, rotatedBuffer);
      return filename;
    });

const memeExists = (fileStem, memeMediaFolder) => {
  const files = fs.readdirSync(memeMediaFolder);
  for (let filename of files) {
    if (path.parse(filename).name === fileStem) return filename;
  }
  return false;
};

const fetchSheet = async (sheetUrl) => {
  const response = await fetch(sheetUrl);
  return await neatCsv(await response.text(), {
    mapHeaders: ({ header, index }) => toCamelCase(header.trim()),
    mapValues: ({ header, index, value }) => value.trim(),
  });
};

const fetchMemes = async () => {
  const memes = await fetchSheet(sheetUrl);
  return memes
    .map((meme) => ({
      ...meme,
      driveId: meme.file.match(/[a-zA-Z0-9]{33}/)?.[0],
    }))
    .filter((meme) => meme.driveId); // filter out rows where we can't derive a driveId
};

const fetchFile = async (meme, memeMediaFolder, delay = 1000) => {
  const { driveId } = meme;
  let filename;

  if (typeof (filename = memeExists(driveId, memeMediaFolder)) === "string") {
    console.log(`${driveId}: exists (skipping)`);
    return filename;
  }

  console.log(`${driveId}: downloading...`);

  const url = getDriveApiUrl(driveId);
  filename = await downloadFile(url, memeMediaFolder, driveId);
  await timer(delay);
  return filename;
};

const purgeFiles = (memes, memeMediaFolder) => {
  const files = fs.readdirSync(memeMediaFolder);
  const driveIds = memes.map((meme) => meme.driveId);
  for (let filename of files) {
    if (!driveIds.includes(path.parse(filename).name)) {
      console.log(`purging ${filename}...`);
      fs.unlinkSync(path.join(memeMediaFolder, filename));
    }
  }
};

export { fetchMemes, fetchFile, purgeFiles };

// If called as a node script, fetch and parse the spreadsheet and ensure the
//  media files cache is up to date.
// See `yarn update-media`  (requires node >= v17.5.0)
import { fileURLToPath } from "url";
const nodePath = path.resolve(process.argv[1]);
const modulePath = path.resolve(fileURLToPath(import.meta.url));
if (nodePath === modulePath) {
  const memes = await fetchMemes();
  for (const meme of memes) {
    meme.filename = await fetchFile(meme, memeMediaFolder);
  }
  purgeFiles(memes, memeMediaFolder);
}
