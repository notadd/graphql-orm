"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const rimraf_1 = __importDefault(require("rimraf"));
const path_1 = require("path");
async function clear(path) {
    rimraf_1.default(path, () => {
        console.log(`rimraf`);
    });
}
clear(path_1.join(process.cwd(), "packages/**/*.{js,d.ts,js.map}"));
clear(path_1.join(process.cwd(), "tools/**/*.{js,d.ts,js.map}"));
