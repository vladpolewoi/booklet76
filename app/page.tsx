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
import { useEffect, useRef, useState } from 'react'

export default function Home() {
  const [status, setStatus] = useState('Ready to process')
  const [isProcessing, setIsProcessing] = useState(false)
  const [bookletUrl, setBookletUrl] = useState<string | null>(null)
  const [sheetCount, setSheetCount] = useState(5)
  const [layout, setLayout] = useState<'booklet' | 'cutstack'>('cutstack')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const { toast } = useToast()

  // Revoke the previous object URL whenever it is replaced or the page unmounts.
  const urlRef = useRef<string | null>(null)
  useEffect(() => {
    urlRef.current = bookletUrl
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [bookletUrl])

  const clearBooklet = () => setBookletUrl(null)

  const onFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast({
        title: 'Invalid file type',
        description: 'Please select a pdf file',
        variant: 'destructive',
      })
      return
    }

    setSelectedFile(file)
    clearBooklet()
    setStatus('Ready to process')
  }

  const handleProcess = async () => {
    if (!selectedFile || isProcessing) return

    setIsProcessing(true)
    clearBooklet()
    setStatus('Processing...')

    try {
      const res = await fetch('/pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/pdf',
          'X-Sheet-Count': String(sheetCount),
          'X-Layout': layout,
        },
        body: selectedFile,
      })

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: null }))
        throw new Error(error || `Server returned ${res.status}`)
      }

      const blob = await res.blob()
      setBookletUrl(URL.createObjectURL(blob))
      const pages = res.headers.get('X-Booklet-Pages')
      const blanks = Number(res.headers.get('X-Blank-Pages') || 0)
      const filler = blanks ? `, ${blanks} blank at the end` : ''
      setStatus(
        layout === 'cutstack'
          ? `${pages} pages${filler}. Cut the stack, put the page 1 pile on the page ${res.headers.get('X-Second-Half')} pile.`
          : `Success — ${pages} pages${filler}`
      )
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      setStatus('Failed')
      toast({
        title: 'Could not build the booklet',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!bookletUrl || !selectedFile) return

    const a = document.createElement('a')
    a.href = bookletUrl
    a.download = selectedFile.name.replace(/\.pdf$/i, '') + '-booklet.pdf'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className='dark flex items-center justify-center w-full h-dvh'>
      <Card className='w-80'>
        <CardHeader>
          <CardTitle>Booklet76</CardTitle>
          <CardDescription>Convert PDF to Booklet</CardDescription>
        </CardHeader>
        <CardContent>
          <Input type='file' accept='application/pdf' onChange={onFileSelect} />
          <div className='mt-4'>Status: {status}</div>
          <div className='mt-4 flex gap-x-2'>
            {(
              [
                ['cutstack', 'Cut & stack'],
                ['booklet', 'Fold'],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                variant={layout === value ? 'default' : 'outline'}
                className='w-full'
                onClick={() => {
                  setLayout(value)
                  clearBooklet()
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <label htmlFor='sheetCount' className='mt-4 block text-sm'>
            {layout === 'cutstack'
              ? 'Sheets per print batch (1 = auto duplex):'
              : 'Sheets per signature:'}
          </label>
          <Input
            id='sheetCount'
            type='number'
            value={sheetCount}
            onChange={(e) => {
              setSheetCount(Math.max(1, Number(e.target.value) || 1))
              clearBooklet()
            }}
            min='1'
            className='mt-2'
          />
        </CardContent>
        <CardFooter>
          <div className='flex gap-x-4 items-center w-full'>
            <Button
              className='w-full'
              onClick={handleProcess}
              disabled={!selectedFile || isProcessing}
            >
              {isProcessing ? 'Working…' : 'Process'}
            </Button>
            <Button
              disabled={!bookletUrl}
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
