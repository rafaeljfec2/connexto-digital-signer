"use client";

import { useEffect, useRef, useState } from 'react';
import { PenTool, Type, X } from 'lucide-react';
import { Button, Input } from '@/shared/ui';

type Mode = 'draw' | 'type';

type SignatureModalLabels = Readonly<{
  title: string;
  draw: string;
  type: string;
  clear: string;
  cancel: string;
  confirm: string;
  placeholder: string;
  drawHint: string;
  typeHint: string;
}>;

type SignatureModalProps = Readonly<{
  open: boolean;
  labels: SignatureModalLabels;
  onConfirm: (value: string) => void;
  onClose: () => void;
}>;

export function SignatureModal({
  open,
  labels,
  onConfirm,
  onClose,
}: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [typedValue, setTypedValue] = useState('');
  const [mode, setMode] = useState<Mode>('draw');

  useEffect(() => {
    if (!open) return;
    setHasDrawn(false);
    setTypedValue('');
    setMode('draw');
  }, [open]);

  useEffect(() => {
    if (!open || mode !== 'draw') return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasDrawn(false);
  }, [open, mode]);

  if (!open) return null;

  const getContext = () => canvasRef.current?.getContext('2d') ?? null;

  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== 'draw') return;
    const ctx = getContext();
    if (!ctx) return;
    const pos = getPointerPos(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== 'draw' || !isDrawing) return;
    const ctx = getContext();
    if (!ctx) return;
    const pos = getPointerPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (mode !== 'draw') return;
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleConfirm = () => {
    if (mode === 'type') {
      onConfirm(typedValue.trim());
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    onConfirm(canvas.toDataURL('image/png'));
  };

  const canConfirm =
    mode === 'draw' ? hasDrawn : typedValue.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-brand-900/98 text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 md:px-6">
        <h2 className="text-base font-semibold md:text-lg">{labels.title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-auto px-4 py-6 md:gap-6 md:px-8">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === 'draw' ? 'primary' : 'ghost'}
            onClick={() => setMode('draw')}
            className="min-h-[44px] gap-2"
          >
            <PenTool className="h-4 w-4" />
            {labels.draw}
          </Button>
          <Button
            type="button"
            variant={mode === 'type' ? 'primary' : 'ghost'}
            onClick={() => setMode('type')}
            className="min-h-[44px] gap-2"
          >
            <Type className="h-4 w-4" />
            {labels.type}
          </Button>
        </div>

        <p className="text-center text-xs text-neutral-100/50 md:text-sm">
          {mode === 'draw' ? labels.drawHint : labels.typeHint}
        </p>

        {mode === 'draw' ? (
          <div className="w-full max-w-xl">
            <div
              ref={containerRef}
              className="relative h-48 w-full overflow-hidden rounded-xl border-2 border-dashed border-white/20 bg-white md:h-64"
            >
              <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full cursor-crosshair"
                style={{ touchAction: 'none' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
              />
            </div>
            <div className="mt-3 flex justify-center">
              <Button
                type="button"
                variant="ghost"
                onClick={clearCanvas}
                className="min-h-[44px]"
              >
                {labels.clear}
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-xl space-y-4">
            <Input
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              placeholder={labels.placeholder}
              className="h-12 text-center text-lg"
            />
            {typedValue.trim().length > 0 ? (
              <div className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 p-6">
                <span className="font-signature text-2xl italic text-white md:text-3xl">
                  {typedValue}
                </span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between border-t border-white/10 px-4 py-3 md:px-6">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="min-h-[44px]"
        >
          {labels.cancel}
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="min-h-[44px]"
        >
          {labels.confirm}
        </Button>
      </footer>
    </div>
  );
}
