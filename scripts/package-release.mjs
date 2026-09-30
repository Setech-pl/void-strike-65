import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const packageDefinition = JSON.parse(fs.readFileSync(path.join(rootDirectory, "package.json"), "utf8"));
const releaseName = `void-strike-65-${packageDefinition.version}`;
const outputPath = path.join(rootDirectory, "dist", `${releaseName}.zip`);

const topLevelFiles = [
  ".editorconfig",
  ".gitignore",
  "AGENTS.md",
  "CLAUDE.md",
  "Makefile",
  "README.md",
  "package.json",
  "package-lock.json",
];
const sourceDirectories = ["assets", "cfg", "docs", "levels", "scripts", "src", "tests"];
const distributionFiles = [
  "dist/void-strike-65-boot.bin",
  "dist/void-strike-65-manifest.json",
  "dist/void-strike-65.atr",
];

function collectFiles(relativeDirectory) {
  const absoluteDirectory = path.join(rootDirectory, relativeDirectory);
  const collected = [];
  for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      collected.push(...collectFiles(relativePath));
    } else if (entry.isFile() && entry.name !== ".gitkeep") {
      collected.push(relativePath);
    }
  }
  return collected;
}

const crcTable = new Uint32Array(256);
for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  crcTable[index] = value >>> 0;
}

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = (value >>> 8) ^ crcTable[(value ^ byte) & 0xff];
  }
  return (value ^ 0xffffffff) >>> 0;
}

function localHeader(name, data, checksum) {
  const nameBytes = Buffer.from(name, "utf8");
  const header = Buffer.alloc(30 + nameBytes.length);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6);      // UTF-8 names
  header.writeUInt16LE(0, 8);           // stored, no compression
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0x0021, 12);     // 1980-01-01
  header.writeUInt32LE(checksum, 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(nameBytes.length, 26);
  header.writeUInt16LE(0, 28);
  nameBytes.copy(header, 30);
  return header;
}

function centralHeader(name, data, checksum, localOffset) {
  const nameBytes = Buffer.from(name, "utf8");
  const header = Buffer.alloc(46 + nameBytes.length);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x0800, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(0x0021, 14);
  header.writeUInt32LE(checksum, 16);
  header.writeUInt32LE(data.length, 20);
  header.writeUInt32LE(data.length, 24);
  header.writeUInt16LE(nameBytes.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(localOffset, 42);
  nameBytes.copy(header, 46);
  return header;
}

function endRecord(entryCount, centralSize, centralOffset) {
  const record = Buffer.alloc(22);
  record.writeUInt32LE(0x06054b50, 0);
  record.writeUInt16LE(0, 4);
  record.writeUInt16LE(0, 6);
  record.writeUInt16LE(entryCount, 8);
  record.writeUInt16LE(entryCount, 10);
  record.writeUInt32LE(centralSize, 12);
  record.writeUInt32LE(centralOffset, 16);
  record.writeUInt16LE(0, 20);
  return record;
}

const relativeFiles = [
  ...topLevelFiles,
  ...sourceDirectories.flatMap(collectFiles),
  ...distributionFiles,
].sort();

const localParts = [];
const centralParts = [];
let localOffset = 0;

for (const relativePath of relativeFiles) {
  const data = fs.readFileSync(path.join(rootDirectory, relativePath));
  const archivePath = `${releaseName}/${relativePath.replaceAll(path.sep, "/")}`;
  const checksum = crc32(data);
  const header = localHeader(archivePath, data, checksum);
  localParts.push(header, data);
  centralParts.push(centralHeader(archivePath, data, checksum, localOffset));
  localOffset += header.length + data.length;
}

const centralDirectory = Buffer.concat(centralParts);
const archive = Buffer.concat([
  ...localParts,
  centralDirectory,
  endRecord(relativeFiles.length, centralDirectory.length, localOffset),
]);

fs.writeFileSync(outputPath, archive);
console.log(`Release package written: dist/${releaseName}.zip (${archive.length} bytes, ${relativeFiles.length} files)`);
