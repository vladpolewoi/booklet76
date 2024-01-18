"use client"

import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import Image from "next/image"
import { cloneElement, useState } from "react"

export default function Home() {
	const [status, setStatus] = useState("Ready to process")
	const [modifiedPdfBytes, setModifiedPdfBytes] = useState(null)
	const { toast } = useToast()
	// const fileURL = window.URL.createObjectURL(blob)

	// // Setting various property values
	// let alink = document.createElement("a")
	// alink.href = fileURL
	// alink.download = "SamplePDF.pdf"
	// alink.click()

	const onFileSelect = (value: any) => {
		setStatus("Processing...")

		const file = value.target.files[0]

		if (file.type !== "application/pdf") {
			toast({
				title: "Invalid file type",
				description: "Please select a pdf file",
				variant: "destructive",
			})

			return
		}

		const reader = new FileReader()

		reader.onload = async (e) => {
			const pdf = e.target?.result

			console.log(pdf)
			const res = await fetch("/pdf", {
				method: "POST",
				headers: {
					"Content-Type": "application/octet-stream",
				},
				body: pdf,
			})

			const data = await res.json()

			console.log(data)

			setStatus(data.status)

			setModifiedPdfBytes(data.pdf)
		}

		reader.readAsArrayBuffer(file)
	}

	const handleDownload = () => {
		if (!modifiedPdfBytes) {
			return
		}
		const byteArray = Uint8Array.from(atob(modifiedPdfBytes), (char) =>
			char.charCodeAt(0)
		)
		const blob = new Blob([byteArray], { type: "application/pdf" })
		const url = URL.createObjectURL(blob)

		const a = document.createElement("a")
		a.href = url
		a.download = "modified_booklet.pdf"
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)
	}

	const shuffle = () => {
		// array from 1 to 20
		const arr = Array.from(Array(36).keys()).map((i) => i + 1)
		const SHEET_COUNT = 2
		const PAGES_COUNT = SHEET_COUNT * 4

		// I will use 2 moving pointer technique
		// for each iteration of PAGES_COUNT
		const booklet = []
		for (let i = 0; i < arr.length / PAGES_COUNT; i++) {
			let x = i * PAGES_COUNT // left pointer
			let y = (i + 1) * PAGES_COUNT - 1 // right pointer

			// if last iteration move y to last element
			if (i === Math.floor(arr.length / PAGES_COUNT)) {
				y = x - 1 + (arr.length % 20)
			}

			console.log("I:", x, y)

			if (y - x < 4) {
				booklet.push(["e", arr[x]])
				booklet.push([arr[y - 1], arr[x + 1]])
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
		console.log(booklet)
	}

	return (
		<div className="dark flex items-center justify-center w-full h-dvh">
			<Card className="w-80">
				<CardHeader>
					<CardTitle>Booklet76</CardTitle>
					<CardDescription>Convert PDF to Booklet</CardDescription>
				</CardHeader>
				<CardContent>
					<Input type="file" onChange={onFileSelect} />
					<div className="mt-4">Status: {status}</div>
				</CardContent>
				<CardFooter>
					<div className="flex gap-x-4 items-center w-full">
						<Button className="w-full" onClick={shuffle}>
							Process
						</Button>
						<Button
							disabled={!modifiedPdfBytes}
							className="w-full bg-blue-700"
							onClick={handleDownload}
						>
							Download
						</Button>
					</div>
				</CardFooter>
			</Card>
		</div>
	)
}
