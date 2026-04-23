import { useEffect, useRef } from "react";
import {
  type TrackReferenceOrPlaceholder,
  useIsSpeaking,
  useParticipantTracks,
  VideoTrack,
} from "@livekit/components-react";
import { Track, type Participant } from "livekit-client";
import { Mic, MicOff } from "lucide-react";
import { SpeakingRing } from "./SpeakingRing";
import { cn } from "@/lib/utils";

interface Props {
  participant: Participant;
  isLocal?: boolean;
  className?: string;
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export const ParticipantTile = ({ participant, isLocal, className }: Props) => {
  const isSpeaking = useIsSpeaking(participant);
  const cameraTracks = useParticipantTracks([Track.Source.Camera], participant.identity);
  const cameraTrack: TrackReferenceOrPlaceholder | undefined = cameraTracks[0];
  const hasVideo = !!cameraTrack?.publication?.track && !cameraTrack.publication.isMuted;
  const micPublication = participant.getTrackPublication(Track.Source.Microphone);
  const micMuted = !micPublication || micPublication.isMuted;

  const tileRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isSpeaking && tileRef.current) {
      tileRef.current.classList.add("active-speaker");
    } else {
      tileRef.current?.classList.remove("active-speaker");
    }
  }, [isSpeaking]);

  return (
    <div
      ref={tileRef}
      className={cn(
        "room-tile relative aspect-video overflow-hidden rounded-xl",
        className,
      )}
    >
      {hasVideo && cameraTrack ? (
        <VideoTrack trackRef={cameraTrack} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 text-2xl font-semibold text-primary">
            {initialsOf(participant.name || participant.identity || "?")}
          </div>
        </div>
      )}

      {/* Name + status overlay */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-sm">
        <span className="flex items-center gap-2 font-medium text-white">
          {participant.name || participant.identity}
          {isLocal && (
            <span className="rounded bg-primary/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
              You
            </span>
          )}
        </span>
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full",
            micMuted ? "bg-destructive/80" : "bg-[hsl(var(--speaking))]/80",
          )}
        >
          {micMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        </span>
      </div>

      <SpeakingRing active={isSpeaking} />
    </div>
  );
};
