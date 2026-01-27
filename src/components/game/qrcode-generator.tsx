'use client'

import React, { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface QRCodeProps {
    value: string
    size?: number
    className?: string
}

export function QRCodeGenerator({ value, size = 200, className }: QRCodeProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        if (canvasRef.current) {
            QRCode.toCanvas(canvasRef.current, value, {
                width: size,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            }, (error) => {
                if (error) console.error(error)
            })
        }
    }, [value, size])

    return <canvas ref={canvasRef} className={className} />
}
