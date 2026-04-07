"use client"

import { useState, useRef, useCallback } from "react"
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import { motion, AnimatePresence } from "framer-motion"
import { X, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AvatarCropModalProps {
  imageSrc: string
  onConfirm: (blob: Blob) => Promise<void>
  onClose: () => void
}

function centerAspectCrop(width: number, height: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 80 }, 1, width, height),
    width,
    height
  )
}

export function AvatarCropModal({ imageSrc, onConfirm, onClose }: AvatarCropModalProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [isUploading, setIsUploading] = useState(false)

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget
    setCrop(centerAspectCrop(naturalWidth, naturalHeight))
  }, [])

  const getCroppedBlob = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const image = imgRef.current
      if (!image || !completedCrop) { reject(new Error("no crop")); return }

      const canvas = document.createElement("canvas")
      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height
      const size = 256 // output size px
      canvas.width = size
      canvas.height = size

      const ctx = canvas.getContext("2d")
      if (!ctx) { reject(new Error("no ctx")); return }

      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0, 0, size, size
      )

      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error("canvas toBlob failed"))
      }, "image/jpeg", 0.9)
    })
  }

  const handleConfirm = async () => {
    if (!completedCrop) return
    setIsUploading(true)
    try {
      const blob = await getCroppedBlob()
      await onConfirm(blob)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg glass-panel rounded-2xl overflow-hidden relative"
        >
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            <div className="scanning-line absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-secondary/50 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold font-mono text-foreground">裁剪头像</h3>
              <p className="text-xs text-muted-foreground font-mono mt-1">拖动选框选择显示区域（1:1 正方形）</p>
            </div>

            <div className="flex justify-center bg-secondary/30 rounded-xl overflow-hidden max-h-[60vh]">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
                minWidth={50}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="crop preview"
                  onLoad={onImageLoad}
                  style={{ maxHeight: "60vh", maxWidth: "100%", objectFit: "contain" }}
                />
              </ReactCrop>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={onClose} className="flex-1 border border-border font-mono">
                取消
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!completedCrop || isUploading}
                className="flex-1 bg-gradient-to-r from-primary to-accent text-primary-foreground font-mono"
              >
                {isUploading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />上传中...</>
                  : <><Check className="w-4 h-4 mr-2" />确认裁剪</>
                }
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
