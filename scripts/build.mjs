import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist");

if (!output.startsWith(`${root}\\`) && !output.startsWith(`${root}/`)) {
  throw new Error("Diretório de saída inválido");
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(resolve(root, "index.html"), resolve(output, "index.html"));
for (const folder of ["assets", "css", "data", "js"]) {
  await cp(resolve(root, folder), resolve(output, folder), { recursive: true });
}
console.log("Jogo preparado em dist/");
