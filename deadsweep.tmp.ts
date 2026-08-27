import { Project } from "ts-morph";
const p = new Project({ tsConfigFilePath: "tsconfig.json" });
const rows: {f:string;n:string;int:number}[] = [];
for (const sf of p.getSourceFiles("src/**/*.{ts,tsx}")) {
  const fp = sf.getFilePath();
  if (fp.includes("openapi.ts") || fp.includes("/app/")) continue;
  for (const [name, decls] of sf.getExportedDeclarations()) {
    let ext = 0, int = 0;
    for (const d of decls) {
      const nn = (d as any).getNameNode?.();
      if (!nn) continue;
      for (const r of nn.findReferencesAsNodes()) {
        if (r.getSourceFile().getFilePath() === fp) int++; else ext++;
      }
    }
    if (ext === 0) rows.push({ f: fp.replace(process.cwd()+"/",""), n: name, int });
  }
}
console.log("zero-external-ref exports:", rows.length);
const dead = rows.filter(r => r.int === 0);
console.log("fully unreferenced:", dead.length, "\n");
for (const r of dead) console.log(`${r.f}  ::  ${r.n}`);
