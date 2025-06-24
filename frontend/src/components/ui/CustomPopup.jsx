// src/components/ui/CustomPopup.jsx
import React, { useState, useContext, createContext } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const PopupContext = createContext();

export const PopupProvider = ({ children }) => {
  const [popup, setPopup] = useState(null);

  const confirm = (message) => {
    return new Promise((resolve) => {
      setPopup({
        message,
        onConfirm: () => {
          resolve(true);
          setPopup(null);
        },
        onCancel: () => {
          resolve(false);
          setPopup(null);
        },
      });
    });
  };

  const alert = (message) => {
    setPopup({
      message,
      onConfirm: () => setPopup(null),
      isAlert: true,
    });
  };

  return (
    <PopupContext.Provider value={{ confirm, alert }}>
      {children}
      {popup && (
        <Dialog open={true} onOpenChange={() => setPopup(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{popup.message}</DialogTitle>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              {!popup.isAlert && (
                <Button variant="outline" onClick={popup.onCancel}>Cancel</Button>
              )}
              <Button onClick={popup.onConfirm}>OK</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </PopupContext.Provider>
  );
};

export const usePopup = () => {
  return useContext(PopupContext);
};