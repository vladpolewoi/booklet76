import { NextResponse } from "next/server"
import { PDFDocument } from "pdf-lib"

export async function POST(req: Request) {
	const pdfBytes = await req.arrayBuffer()
	const pdfDoc = await PDFDocument.load(pdfBytes)

	// Create a new PDF with the first two pages
	const newPDF = await PDFDocument.create()

	const booklet = shuffle(pdfDoc.getPageCount())
	console.log("DEBUG", pdfDoc.getPageCount(), booklet)
	for (const [left, right] of booklet) {
		let leftPage
		let rightPage

		try {
			leftPage = await newPDF.copyPages(pdfDoc, [left])
		} catch (e) {
			console.log(e)
		}

		try {
			rightPage = await newPDF.copyPages(pdfDoc, [right])
		} catch (e) {
			console.log(e)
		}

		newPDF.addPage(leftPage?.[0])
		newPDF.addPage(rightPage?.[0])
	}

	// Save the modified PDF as bytes
	const modifiedPdfBytes = await newPDF.saveAsBase64()

	// Set the necessary headers for download
	const headers = new Headers()
	headers.append(
		"Content-Disposition",
		"attachment; filename=modified_booklet.pdf"
	)
	headers.append("Content-Type", "application/pdf")

	// Return the response with the headers and the modified PDF bytes
	return NextResponse.json({
		status: "Success",
		headers: Object.fromEntries(headers),
		pdf: modifiedPdfBytes,
	})
}

function shuffle(count: number) {
	const arr = Array.from(Array(count).keys()).map((i) => i)
	const SHEET_COUNT = 5
	const PAGES_PER_SHEET = 4
	const PAGES_COUNT = SHEET_COUNT * PAGES_PER_SHEET

	// I will use 2 moving pointer technique
	// for each iteration of PAGES_COUNT
	const booklet = []
	for (let i = 0; i < arr.length / PAGES_COUNT; i++) {
		let x = i * PAGES_COUNT // left pointer
		let y = (i + 1) * PAGES_COUNT - 1 // right pointer

		// if last iteration move y to last element
		// and add to first % 4 = 0
		if (y > arr.length - 1) {
			y = arr.length - 1 + PAGES_PER_SHEET - (arr.length % PAGES_PER_SHEET)
		}

		const even = []
		const odd = []

		while (x != y && x < y) {
			if (x % 2) {
				odd.push([arr[x], arr[y]])
			} else {
				even.push([arr[y], arr[x]])
			}

			x += 1
			y -= 1
		}

		booklet.push(...even, ...odd)
	}

	return booklet
}
