export const PYODIDE_BASE = "https://cdn.jsdelivr.net/pyodide/v314.0.8/full/";
const PYPI = "https://files.pythonhosted.org/packages/";

// Pure wheels the Pyodide distribution does not carry, pinned by URL so a new
// upload can never change what runs. Built-in packages load by name.
const WHEEL = {
  python_docx: `${PYPI}d0/00/1e03a4989fa5795da308cd774f05b704ace555a70f9bf9d3be057b680bcf/python_docx-1.2.0-py3-none-any.whl`,
  python_pptx: `${PYPI}d9/4f/00be2196329ebbff56ce564aa94efb0fbc828d00de250b1980de1a34ab49/python_pptx-1.0.2-py3-none-any.whl`,
  openpyxl: `${PYPI}c0/da/977ded879c29cbd04de313843e76868e6e13408a94ed6b987245dc7c8506/openpyxl-3.1.5-py2.py3-none-any.whl`,
  et_xmlfile: `${PYPI}c1/8b/5fe2cc11fee489817272089c4203e679c63b570a5aaeb18d852ae3cbba6a/et_xmlfile-2.0.0-py3-none-any.whl`,
  xlsxwriter: `${PYPI}88/eb/1e6af9959a567901a7e7c7cef2e75883e487df223ed67f9a8977ff863bd8/xlsxwriter-3.3.1-py3-none-any.whl`,
  fpdf2: `${PYPI}2f/b0/f0e770163d0e635c81e8ba117686e31c6b172715e1185ff00ea2eb0b2f3d/fpdf2-2.9.0-py3-none-any.whl`,
  defusedxml: `${PYPI}07/6c/aa3f2f849e01cb6a001cd8554a88d4c77c5c1a31c95bdf1cf9301e6d9ef4/defusedxml-0.7.1-py2.py3-none-any.whl`,
};

// A wheel loaded by URL brings no dependencies, so each import lists them.
const BY_IMPORT: Array<[RegExp, string[]]> = [
  [/\bdocx\b/, ["lxml", "typing-extensions", WHEEL.python_docx]],
  [
    /\bpptx\b/,
    [
      "lxml",
      "pillow",
      "typing-extensions",
      WHEEL.xlsxwriter,
      WHEEL.python_pptx,
    ],
  ],
  [
    /\bopenpyxl\b|\.to_excel\(|read_excel\(/,
    [WHEEL.et_xmlfile, WHEEL.openpyxl],
  ],
  [/\bxlsxwriter\b/, [WHEEL.xlsxwriter]],
  [/\bfpdf\b/, ["pillow", "fonttools", WHEEL.defusedxml, WHEEL.fpdf2]],
];

export function packagesFor(code: string): string[] {
  const out = new Set<string>();
  for (const [re, pkgs] of BY_IMPORT)
    if (re.test(code)) for (const p of pkgs) out.add(p);
  return [...out];
}
