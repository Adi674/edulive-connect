import { useRef, useState, type PointerEvent } from "react";
import { type TrackReferenceOrPlaceholder, VideoTrack } from "@livekit/components-react";

export const CameraPiP = ({ trackRef }: { trackRef?: TrackReferenceOrPlaceholder }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 24, y: 24 }); // from bottom-right
  const drag = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, baseX: pos.x, baseY: pos.y };
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const dx = drag.current.startX - e.clientX;
    const dy = drag.current.startY - e.clientY;
    setPos({
      x: Math.max(8, drag.current.baseX + dx),
      y: Math.max(8, drag.current.baseY + dy),
    });
  };
  const onUp = () => { drag.current = null; };

  return (
    <div
      ref={ref}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      style={{ right: pos.x, bottom: pos.y }}
      className="absolute z-30 h-[90px] w-[160px] cursor-grab overflow-hidden rounded-xl border-2 border-white/30 bg-black shadow-2xl active:cursor-grabbing"
    >
      {trackRef && trackRef.publication?.track ? (
        <VideoTrack
          trackRef={{
            participant: trackRef.participant,
            source: trackRef.source,
            publication: trackRef.publication,
          }}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] text-room-muted">
          Camera off
        </div>
      )}
    </div>
  );
};
