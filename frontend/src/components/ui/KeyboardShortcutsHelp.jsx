// src/components/ui/KeyboardShortcutsHelp.jsx
import React, { useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { Button } from './button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';
import { SHORTCUTS_LIST, isMac } from '../../hooks/useKeyboardShortcuts';

/**
 * Composant affichant l'aide des raccourcis clavier
 * Peut être affiché comme bouton flottant ou intégré dans une page
 */
export default function KeyboardShortcutsHelp({ variant = 'floating' }) {
  const [open, setOpen] = useState(false);
  const mac = isMac();

  const content = (
    <div className="space-y-3">
      {SHORTCUTS_LIST.map((shortcut) => (
        <div
          key={shortcut.id}
          className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
        >
          <span className="text-sm text-gray-700">{shortcut.action}</span>
          <kbd className="px-2 py-1 text-xs font-mono bg-white border border-gray-300 rounded shadow-sm">
            {mac ? shortcut.mac : shortcut.keys}
          </kbd>
        </div>
      ))}
    </div>
  );

  if (variant === 'inline') {
    return (
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Keyboard className="w-4 h-4" />
          Raccourcis clavier
        </h3>
        {content}
      </div>
    );
  }

  // Floating button variant
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 shadow-lg bg-white hover:bg-gray-50"
        title="Raccourcis clavier"
      >
        <Keyboard className="w-4 h-4 mr-2" />
        <span className="hidden sm:inline">Raccourcis</span>
        <span className="sm:hidden">?</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              Raccourcis clavier
            </DialogTitle>
            <DialogDescription>
              Utilisez ces raccourcis pour naviguer plus rapidement
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {content}
          </div>
          <div className="text-xs text-gray-500 text-center">
            Appuyez sur <kbd className="px-1 py-0.5 bg-gray-100 border rounded text-xs">Escape</kbd> pour fermer cette fenêtre
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
