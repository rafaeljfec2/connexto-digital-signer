import { useEffect, useRef, useState } from 'react';

import { Button, Input } from '@/shared/ui';

type SignaturePadProps = Readonly<{
  onConfirm: (value: string) => void;
  onCancel?: () => void;
}>;

type Mode = 'draw' | 'type';

export const SignaturePad = ({ onConfirm, onCancel }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [typedValue, setTypedValue] = useState('');
  const [mode, setMode] = useState<Mode>('draw');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    canvas.width = 600;
    canvas.height = 200;
  }, []);

  const getContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }
    return canvas.getContext('2d');
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== 'draw') {
      return;
    }
    const context = getContext();
    if (!context) {
      return;
    }
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== 'draw' || !isDrawing) {
      return;
    }
    const context = getContext();
    if (!context) {
      return;
    }
    context.lineTo(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
    context.stroke();
  };

  const handlePointerUp = () => {
    if (mode !== 'draw') {
      return;
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = getContext();
    if (!canvas || !context) {
      return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleConfirm = () => {
    if (mode === 'type') {
      onConfirm(typedValue.trim());
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    onConfirm(canvas.toDataURL('image/png'));
  };

  const canConfirm = mode === 'draw' ? hasDrawn : typedValue.trim().length > 0;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button type="button" variant={mode === 'draw' ? 'primary' : 'ghost'} onClick={() => setMode('draw')}>
          Draw
        </Button>
        <Button type="button" variant={mode === 'type' ? 'primary' : 'ghost'} onClick={() => setMode('type')}>
          Type
        </Button>
      </div>
      {mode === 'draw' ? (
        <div className="space-y-2">
          <canvas
            ref={canvasRef}
            className="h-32 w-full rounded-md border border-border bg-white"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          <Button type="button" variant="ghost" onClick={clearCanvas}>
            Clear
          </Button>
        </div>
      ) : (
        <Input
          value={typedValue}
          onChange={(event) => setTypedValue(event.target.value)}
          placeholder="Type your name"
        />
      )}
      <div className="flex items-center justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="button" onClick={handleConfirm} disabled={!canConfirm}>
          Confirm
        </Button>
      </div>
    </div>
  );
};
