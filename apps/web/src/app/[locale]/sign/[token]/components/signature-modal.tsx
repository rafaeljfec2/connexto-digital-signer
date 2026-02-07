"use client";

import { useEffect, useRef, useState } from 'react';
import { PenTool, Type, Eraser } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/15 bg-brand-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 md:px-5">
          <h2 className="text-sm font-semibold text-white md:text-base">
            {labels.title}
          </h2>
          <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
            <button
              type="button"
              onClick={() => setMode('draw')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                mode === 'draw'
                  ? 'bg-accent-400 text-white shadow-sm'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <PenTool className="h-3.5 w-3.5" />
              {labels.draw}
            </button>
            <button
              type="button"
              onClick={() => setMode('type')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                mode === 'type'
                  ? 'bg-accent-400 text-white shadow-sm'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <Type className="h-3.5 w-3.5" />
              {labels.type}
            </button>
          </div>
        </div>

        <div className="px-4 py-4 md:px-5 md:py-5">
          <p className="mb-3 text-center text-[11px] text-white/40 md:text-xs">
            {mode === 'draw' ? labels.drawHint : labels.typeHint}
          </p>

          {mode === 'draw' ? (
            <div className="space-y-2">
              <div
                ref={containerRef}
                className="relative h-40 w-full overflow-hidden rounded-xl border-2 border-dashed border-white/20 bg-white md:h-48"
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
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={clearCanvas}
                  disabled={!hasDrawn}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-white/40 transition hover:text-white/70 disabled:opacity-30"
                >
                  <Eraser className="h-3 w-3" />
                  {labels.clear}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                value={typedValue}
                onChange={(e) => setTypedValue(e.target.value)}
                placeholder={labels.placeholder}
                className="h-11 text-center text-base"
                autoFocus
              />
              {typedValue.trim().length > 0 ? (
                <div className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 py-5">
                  <span className="font-signature text-2xl italic text-white md:text-3xl">
                    {typedValue}
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3 md:px-5">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="min-h-[38px] px-4 text-sm"
          >
            {labels.cancel}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="min-h-[38px] px-6 text-sm"
          >
            {labels.confirm}
          </Button>
        </div>
      </div>
    </div>
  );
}
