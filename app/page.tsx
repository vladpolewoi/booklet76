'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import Image from 'next/image'
import { cloneElement, useState } from 'react'

export default function Home() {
  const [status, setStatus] = useState('Ready to process')
  const [modifiedPdfBytes, setModifiedPdfBytes] = useState(null)
  const [sheetCount, setSheetCount] = useState(5)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const { toast } = useToast()

  const onFileSelect = (value: any) => {
    const file = value.target.files[0]

    if (file.type !== 'application/pdf') {
      toast({
        title: 'Invalid file type',
        description: 'Please select a pdf file',
        variant: 'destructive',
      })
      return
    }

    setSelectedFile(file)
    setFileName(file.name)
    setStatus('Ready to process')
  }

  const handleProcess = async () => {
    if (!selectedFile) return

    setStatus('Processing...')
    const reader = new FileReader()

    reader.onload = async (e) => {
      const pdf = e.target?.result

      const res = await fetch('/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Sheet-Count': sheetCount.toString(),
        },
        body: pdf,
      })

      const data = await res.json()
      setStatus(data.status)
      setModifiedPdfBytes(data.pdf)
    }

    reader.readAsArrayBuffer(selectedFile)
  }

  const handleDownload = () => {
    if (!modifiedPdfBytes) {
      return
    }
    const byteArray = Uint8Array.from(atob(modifiedPdfBytes), (char) =>
      char.charCodeAt(0)
    )
    const blob = new Blob([byteArray], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    const bookletName = fileName.replace('.pdf', '-booklet.pdf')
    a.download = bookletName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className='dark flex items-center justify-center w-full h-dvh'>
      <Card className='w-80'>
        <CardHeader>
          <CardTitle>Booklet76</CardTitle>
          <CardDescription>Convert PDF to Booklet</CardDescription>
        </CardHeader>
        <CardContent>
          <Input type='file' onChange={onFileSelect} />
          <div className='mt-4'>Status: {status}</div>
          <label htmlFor='sheetCount' className='mt-4 block text-sm'>
            Sheet Count:
          </label>
          <Input
            id='sheetCount'
            type='number'
            value={sheetCount}
            onChange={(e) => setSheetCount(Number(e.target.value))}
            min='1'
            className='mt-2'
          />
        </CardContent>
        <CardFooter>
          <div className='flex gap-x-4 items-center w-full'>
            <Button
              className='w-full'
              onClick={handleProcess}
              disabled={!selectedFile}
            >
              Process
            </Button>
            <Button
              disabled={!modifiedPdfBytes}
              className='w-full bg-blue-700'
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
