import { PDFDocument } from 'pdf-lib'

export const runtime = 'nodejs'
export const maxDuration = 60

const PAGES_PER_SHEET = 4
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024

/** A blank filler page in the imposed order. */
const BLANK = -1

type Layout = 'booklet' | 'cutstack'

export async function POST(req: Request) {
  const sheetCount = parseInt(req.headers.get('X-Sheet-Count') || '5', 10)
  if (!Number.isFinite(sheetCount) || sheetCount < 1) {
    return jsonError('Sheet count must be a positive integer', 400)
  }
  const layout = (req.headers.get('X-Layout') || 'booklet') as Layout
  if (layout !== 'booklet' && layout !== 'cutstack') {
    return jsonError(`Unknown layout ${layout}`, 400)
  }

  const pdfBytes = await req.arrayBuffer()
  if (pdfBytes.byteLength === 0) {
    return jsonError('Empty request body', 400)
  }
  if (pdfBytes.byteLength > MAX_UPLOAD_BYTES) {
    return jsonError('PDF is larger than 100 MB', 413)
  }

  let srcDoc: PDFDocument
  try {
    srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  } catch (e) {
    return jsonError('Could not read that file as a PDF', 400)
  }

  const pageCount = srcDoc.getPageCount()
  if (pageCount === 0) return jsonError('PDF has no pages', 400)

  const order =
    layout === 'cutstack'
      ? cutStack(pageCount, sheetCount)
      : impose(pageCount, sheetCount)

  const bookletDoc = await PDFDocument.create()

  // Copy every source page in ONE call. pdf-lib builds a fresh object copier per
  // copyPages() invocation, so copying page-by-page duplicates shared resources
  // (fonts, images) once per page and blows the output size — and the heap — up.
  const copied = await bookletDoc.copyPages(
    srcDoc,
    Array.from({ length: pageCount }, (_, i) => i)
  )

  // Filler pages match the first source page so the booklet stays one paper size.
  const [fillerWidth, fillerHeight] = [
    srcDoc.getPage(0).getWidth(),
    srcDoc.getPage(0).getHeight(),
  ]

  for (const index of order) {
    if (index === BLANK) bookletDoc.addPage([fillerWidth, fillerHeight])
    else bookletDoc.addPage(copied[index])
  }

  const bytes = await bookletDoc.save()

  return new Response(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="booklet.pdf"',
      'Content-Length': String(bytes.length),
      'X-Booklet-Pages': String(order.length),
      'X-Blank-Pages': String(order.filter((i) => i === BLANK).length),
      'X-Second-Half': String(roundUpToSheet(pageCount) / 2 + 1),
    },
  })
}

/**
 * Imposition order for saddle-stitched booklets.
 *
 * The book is split into signatures of `sheetCount` sheets (4 pages each). Within
 * a signature the outermost pages pair up first: for 8 pages the sheets carry
 * 8|1, 2|7, 6|3, 4|5.
 *
 * Output is grouped fronts-first, then backs, so the whole stack can be printed
 * on one side, flipped, and run through again:
 *   8,1  6,3  |  2,7  4,5
 *
 * Returns a flat list of 0-based source page indices; BLANK marks a filler page
 * where the last signature runs past the end of the document.
 */
function impose(pageCount: number, sheetCount: number): number[] {
  const pagesPerSignature = sheetCount * PAGES_PER_SHEET
  const order: number[] = []

  for (let start = 0; start < pageCount; start += pagesPerSignature) {
    // Pad the final (short) signature up to a whole number of sheets, never
    // beyond a full signature.
    const remaining = pageCount - start
    const size = Math.min(pagesPerSignature, roundUpToSheet(remaining))

    const fronts: number[] = []
    const backs: number[] = []

    let left = start
    let right = start + size - 1

    while (left < right) {
      // Even leaves land on a sheet front and read outer|inner (8|1);
      // odd leaves land on the back and read inner|outer (2|7).
      if (left % 2 === 0) {
        fronts.push(pageAt(right, pageCount), pageAt(left, pageCount))
      } else {
        backs.push(pageAt(left, pageCount), pageAt(right, pageCount))
      }

      left += 1
      right -= 1
    }

    order.push(...fronts, ...backs)
  }

  return order
}

/**
 * Imposition order for cut-and-stack: the whole document is ONE stack of sheets,
 * cut in half when printed. Each sheet carries a page from the first half of the
 * book on its left and the matching page of the second half on its right, so
 * after the cut the left pile reads 1..H and the right pile H+1..2H, top to
 * bottom. Put the left pile on the right pile and the book is in order.
 *
 * For 16 pages (4 sheets, H = 8) the sheets carry 1|9, 3|11, 5|13, 7|15 on the
 * front and 10|2, 12|4, 14|6, 16|8 on the back -- a back's left half sits behind
 * its front's right half, the same short-edge flip as the booklet layout.
 *
 * Sheets go to the printer in batches of `batchSheets`, fronts first, then
 * backs, exactly like a signature in the booklet layout, so the same manual
 * duplex routine works; a batch of 1 interleaves front, back for a duplex
 * printer. BLANK fills the end of the second half when the page count is not a
 * multiple of 4.
 */
function cutStack(pageCount: number, batchSheets: number): number[] {
  const total = roundUpToSheet(pageCount)
  const sheets = total / PAGES_PER_SHEET
  const half = total / 2
  const order: number[] = []

  for (let first = 0; first < sheets; first += batchSheets) {
    const fronts: number[] = []
    const backs: number[] = []

    for (let s = first; s < Math.min(first + batchSheets, sheets); s++) {
      fronts.push(pageAt(2 * s, pageCount), pageAt(half + 2 * s, pageCount))
      backs.push(pageAt(half + 2 * s + 1, pageCount), pageAt(2 * s + 1, pageCount))
    }

    order.push(...fronts, ...backs)
  }

  return order
}

function roundUpToSheet(n: number) {
  return Math.ceil(n / PAGES_PER_SHEET) * PAGES_PER_SHEET
}

function pageAt(index: number, pageCount: number) {
  return index < pageCount ? index : BLANK
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
