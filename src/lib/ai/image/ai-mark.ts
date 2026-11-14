// Machine-readable "AI-generated" mark (EU AI Act Art. 50(2)): an XMP packet
// with the IPTC DigitalSourceType trainedAlgorithmicMedia, inserted without
// re-encoding. Same format as new-api's pkg/aimark, so a mark from either side
// is recognised by the other and never doubled.

const XMP_PACKET =
  '<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>' +
  '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' +
  '<rdf:Description rdf:about="" xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/" xmlns:xmp="http://ns.adobe.com/xap/1.0/"' +
  ' Iptc4xmpExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"' +
  ' xmp:CreatorTool="UnoRouter"/>' +
  '</rdf:RDF></x:xmpmeta><?xpacket end="w"?>';

const XMP = Buffer.from(XMP_PACKET, "utf8");
const JPEG_XMP_NS = Buffer.from("http://ns.adobe.com/xap/1.0/\0", "latin1");
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const EXISTING_MARKS = [
  "trainedAlgorithmicMedia",
  "compositeSynthetic",
  "c2pa",
];
const XMP_UUID = Buffer.from("be7acfcb97a942e89c71999491e3afac", "hex");
const C2PA_UUID = Buffer.from("d8fec3d61b0e483c92975828877ec481", "hex");
const WEBP_FLAG_ALPHA = 0x10;
const WEBP_FLAG_XMP = 0x04;

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function markPng(img: Buffer): Buffer {
  const afterIhdr = 33;
  if (img.includes("XML:com.adobe.xmp", 0, "latin1")) return img;
  if (img.length < afterIhdr || img.toString("latin1", 12, 16) !== "IHDR") {
    return img;
  }
  const data = Buffer.concat([
    Buffer.from("XML:com.adobe.xmp\0\0\0\0\0", "latin1"),
    XMP,
  ]);
  const typed = Buffer.concat([Buffer.from("iTXt", "latin1"), data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([
    img.subarray(0, afterIhdr),
    len,
    typed,
    crc,
    img.subarray(afterIhdr),
  ]);
}

function markJpeg(img: Buffer): Buffer {
  // JFIF (APP0) must stay first, and a second XMP packet is not allowed.
  let insertAt = 2;
  let pos = 2;
  while (pos + 4 <= img.length && img[pos] === 0xff) {
    const marker = img[pos + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const segLen = img.readUInt16BE(pos + 2);
    if (segLen < 2 || pos + 2 + segLen > img.length) return img;
    const payload = img.subarray(pos + 4, pos + 2 + segLen);
    if (
      marker === 0xe1 &&
      payload.subarray(0, JPEG_XMP_NS.length).equals(JPEG_XMP_NS)
    ) {
      return img;
    }
    if (marker === 0xe0 && insertAt === pos) insertAt = pos + 2 + segLen;
    pos += 2 + segLen;
  }
  const body = Buffer.concat([JPEG_XMP_NS, XMP]);
  const head = Buffer.from([0xff, 0xe1, 0, 0]);
  head.writeUInt16BE(body.length + 2, 2);
  return Buffer.concat([
    img.subarray(0, insertAt),
    head,
    body,
    img.subarray(insertAt),
  ]);
}

function webpSize(
  kind: string,
  data: Buffer,
): { w: number; h: number; alpha: boolean } | null {
  if (kind === "VP8L") {
    if (data.length < 5 || data[0] !== 0x2f) return null;
    const bits = data.readUInt32LE(1);
    return {
      w: (bits & 0x3fff) + 1,
      h: ((bits >>> 14) & 0x3fff) + 1,
      alpha: ((bits >>> 28) & 1) === 1,
    };
  }
  if (
    data.length < 10 ||
    data[3] !== 0x9d ||
    data[4] !== 0x01 ||
    data[5] !== 0x2a
  ) {
    return null;
  }
  return {
    w: data.readUInt16LE(6) & 0x3fff,
    h: data.readUInt16LE(8) & 0x3fff,
    alpha: false,
  };
}

function markWebp(img: Buffer): Buffer {
  const first = img.toString("latin1", 12, 16);
  const firstLen = img.readUInt32LE(16);
  if (20 + firstLen > img.length) return img;
  let out: Buffer;
  if (first === "VP8X") {
    if (img[20] & WEBP_FLAG_XMP) return img;
    out = Buffer.from(img);
    out[20] = out[20] | WEBP_FLAG_XMP;
  } else if (first === "VP8 " || first === "VP8L") {
    const size = webpSize(first, img.subarray(20, 20 + firstLen));
    if (!size) return img;
    const vp8x = Buffer.alloc(18);
    vp8x.write("VP8X", 0, "latin1");
    vp8x.writeUInt32LE(10, 4);
    vp8x[8] = WEBP_FLAG_XMP | (size.alpha ? WEBP_FLAG_ALPHA : 0);
    vp8x.writeUIntLE(size.w - 1, 12, 3);
    vp8x.writeUIntLE(size.h - 1, 15, 3);
    out = Buffer.concat([img.subarray(0, 12), vp8x, img.subarray(12)]);
  } else {
    return img;
  }
  const head = Buffer.alloc(8);
  head.write("XMP ", 0, "latin1");
  head.writeUInt32LE(XMP.length, 4);
  const pad = XMP.length % 2 === 1 ? Buffer.alloc(1) : Buffer.alloc(0);
  out = Buffer.concat([out, head, XMP, pad]);
  out.writeUInt32LE(out.length - 8, 4);
  return out;
}

// Appends a top-level XMP uuid box, which moves no offsets. Same rules as
// new-api's MP4Tracker: only when the file ends exactly on a box boundary,
// carries no C2PA manifest or XMP box, and does not end in mfra, which readers
// locate from the end of the file.
function markMp4(file: Buffer): Buffer {
  let pos = 0;
  let lastType = "";
  while (pos < file.length) {
    if (pos + 8 > file.length) return file;
    const type = file.toString("latin1", pos + 4, pos + 8);
    let size = file.readUInt32BE(pos);
    let headerLen = 8;
    if (size === 1) {
      if (pos + 16 > file.length) return file;
      const large = file.readBigUInt64BE(pos + 8);
      if (large > BigInt(Number.MAX_SAFE_INTEGER)) return file;
      size = Number(large);
      headerLen = 16;
    }
    if (type === "uuid") {
      if (pos + headerLen + 16 > file.length) return file;
      const id = file.subarray(pos + headerLen, pos + headerLen + 16);
      if (id.equals(C2PA_UUID) || id.equals(XMP_UUID)) return file;
      headerLen += 16;
    }
    // Size 0 runs to EOF, so anything appended would land inside that box.
    if (type === "jumb" || size === 0 || size < headerLen) return file;
    lastType = type;
    pos += size;
  }
  if (pos !== file.length || lastType === "mfra") return file;
  const head = Buffer.alloc(8);
  head.writeUInt32BE(8 + XMP_UUID.length + XMP.length, 0);
  head.write("uuid", 4, "latin1");
  return Buffer.concat([file, head, XMP_UUID, XMP]);
}

// Returns the image or MP4/MOV video with the mark added; unsupported formats
// and files that already carry a mark or their own XMP packet come back
// unchanged.
export function markAiGenerated(img: Buffer): Buffer {
  // A byte scan of a whole video would hit "c2pa" by chance; the box walk is exact.
  if (img.length >= 8 && img.toString("latin1", 4, 8) === "ftyp") {
    return markMp4(img);
  }
  if (EXISTING_MARKS.some((m) => img.includes(m, 0, "latin1"))) return img;
  if (img.subarray(0, 8).equals(PNG_SIGNATURE)) return markPng(img);
  if (img.length > 3 && img[0] === 0xff && img[1] === 0xd8 && img[2] === 0xff) {
    return markJpeg(img);
  }
  if (
    img.length > 16 &&
    img.toString("latin1", 0, 4) === "RIFF" &&
    img.toString("latin1", 8, 12) === "WEBP"
  ) {
    return markWebp(img);
  }
  return img;
}
