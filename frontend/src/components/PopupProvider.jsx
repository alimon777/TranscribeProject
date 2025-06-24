// src/components/PopupProvider.jsx
import React, { useState, useContext, createContext, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

const PopupContext = createContext()

export const PopupProvider = ({ children }) => {
  const [popup, setPopup] = useState(null)

  const confirm = (message) => {
    return new Promise((resolve) => {
      setPopup({
        message,
        onConfirm: () => {
          resolve(true)
          setPopup(null)
        },
        onCancel: () => {
          resolve(false)
          setPopup(null)
        },
        isAlert: false,
      })
    })
  }

  const alert = (message) => {
    setPopup({
      message,
      onConfirm: () => setPopup(null),
      isAlert: true,
    })
  }

  // auto-dismiss alerts after 3s
  useEffect(() => {
    if (popup?.isAlert) {
      const timer = setTimeout(() => {
        popup.onConfirm()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [popup])

  return (
    <PopupContext.Provider value={{ confirm, alert }}>
      {children}

      {popup?.isAlert && (
        <div
          className="
            fixed bottom-4 right-4
            bg-primary text-primary-foreground
            shadow-lg rounded-md
            px-4 py-2 flex items-center
            space-x-2
            transition-opacity duration-300
          "
          role="status"
          aria-live="polite"
        >
          <span className="text-sm">{popup.message}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={popup.onConfirm}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {popup && !popup.isAlert && (
        <Dialog open onOpenChange={() => setPopup(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{popup.message}</DialogTitle>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={popup.onCancel}>
                Cancel
              </Button>
              <Button onClick={popup.onConfirm}>OK</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </PopupContext.Provider>
  )
}

export const usePopup = () => useContext(PopupContext)