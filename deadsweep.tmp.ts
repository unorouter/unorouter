import { Project, Node } from "ts-morph";
const p = new Project({ tsConfigFilePath: "tsconfig.json" });
const rows: {f:string;n:string;int:number}[] = [];
for (const sf of p.getSourceFiles("src/**/*.{ts,tsx}")) {
  const fp = sf.getFilePath();
  if (fp.includes("openapi.ts")) continue;
  let ed: ReadonlyMap<string, any[]>;
  try { ed = sf.getExportedDeclarations(); } catch { continue; }
  for (const [name, decls] of ed) {
    let ext = 0, int = 0, ok = false;
    for (const d of decls) {
      const nn = Node.isVariableDeclaration(d) || Node.isFunctionDeclaration(d)
        || Node.isClassDeclaration(d) || Node.isInterfaceDeclaration(d)
        || Node.isTypeAliasDeclaration(d) || Node.isEnumDeclaration(d)
        ? d.getNameNode() : undefined;
      if (!nn || !Node.isIdentifier(nn)) continue;
      ok = true;
      for (const r of nn.findReferencesAsNodes()) {
        if (r.getSourceFile().getFilePath() === fp) int++; else ext++;
      }
    }
    if (ok && ext === 0) rows.push({ f: fp.replace(process.cwd()+"/",""), n: name, int });
  }
}
const app = (f:string)=>f.startsWith("src/app/");
const dead = rows.filter(r => r.int === 0 && !app(r.f));
console.log("zero-external-ref exports:", rows.length);
console.log("fully unreferenced (excl src/app):", dead.length, "\n");
const byFile: Record<string,string[]> = {};
for (const r of dead) (byFile[r.f] ??= []).push(r.n);
for (const f of Object.keys(byFile).sort()) console.log(`${f}\n    ${byFile[f].join(", ")}`);
