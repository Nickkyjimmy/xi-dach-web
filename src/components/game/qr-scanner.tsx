'use client'

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Loader2 } from "lucide-react"
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode"

interface QRScannerProps {
    onScan: (decodedText: string) => void
    onClose: () => void
    title?: string
}

export function QRScanner({ onScan, onClose, title = "Scan QR Code" }: QRScannerProps) {
    const [manualId, setManualId] = useState("")
    const [scannerInitialized, setScannerInitialized] = useState(false)
    const scannerRef = useRef<Html5QrcodeScanner | null>(null)
    const mountedRef = useRef(true)

    useEffect(() => {
        mountedRef.current = true

        // Initialize scanner only on client side
        if (typeof window !== "undefined") {
            const scanner = new Html5QrcodeScanner(
                "reader",
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
                },
                /* verbose= */ false
            )

            scanner.render(
                (decodedText) => {
                    onScan(decodedText)
                },
                () => {
                    // Error callback required by html5-qrcode, errors are expected during scanning
                }
            )

            scannerRef.current = scanner

            // Use setTimeout to defer state update and avoid synchronous setState in effect
            setTimeout(() => {
                if (mountedRef.current) {
                    setScannerInitialized(true)
                }
            }, 0)

            return () => {
                mountedRef.current = false
                if (scannerRef.current) {
                    scannerRef.current.clear().catch(err => console.error("Scanner clear error", err))
                }
            }
        }
    }, [onScan])

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (manualId.trim()) {
            onScan(manualId.trim())
            setManualId("") // Clear for next input
        }
    }
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
             <div className="bg-white rounded-2xl p-6 w-full max-w-md relative shadow-2xl animate-in fade-in zoom-in duration-300 text-slate-900">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-xl text-slate-800">{title}</h3>
                    <Button 
                        onClick={onClose}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full hover:bg-slate-100 text-slate-500"
                    >
                        ✕
                    </Button>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl mb-6 relative overflow-hidden ring-1 ring-slate-200">
                    <div id="reader" className="w-full overflow-hidden rounded-lg"></div>
                    {!scannerInitialized && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                        </div>
                    )}
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200"></span>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-slate-400 font-bold">Or Manual Entry</span>
                    </div>
                </div>

                <form onSubmit={handleManualSubmit} className="flex gap-2 mt-4">
                    <Input 
                        placeholder="Enter Player ID..." 
                        value={manualId}
                        onChange={(e) => setManualId(e.target.value)}
                        className="bg-white border-slate-200"
                        autoFocus
                    />
                    <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                        <Search className="w-4 h-4" />
                    </Button>
                </form>
             </div>
        </div>
    )
}
