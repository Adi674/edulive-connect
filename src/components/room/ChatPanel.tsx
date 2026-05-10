import { useEffect, useRef, useState } from "react";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, type RemoteParticipant } from "livekit-client";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils"; // Import cn utility

interface Message {
  id: string;
  sender: string;
  text: string;
  ts: number;
  self?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export const ChatPanel = ({ open, onClose }: Props) => {
  const room = useRoomContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!room) return;
    const decoder = new TextDecoder();
    const handler = (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const data = JSON.parse(decoder.decode(payload)) as { text: string };
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            sender: participant?.name || participant?.identity || "Anon",
            text: data.text,
            ts: Date.now(),
          },
        ]);
      } catch {
        /* ignore */
      }
    };
    room.on(RoomEvent.DataReceived, handler);
    return () => {
      room.off(RoomEvent.DataReceived, handler);
    };
  }, [room]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !room) return;
    const encoder = new TextEncoder();
    try {
      await room.localParticipant.publishData(encoder.encode(JSON.stringify({ text })), {
        reliable: true,
      });
    } catch {
      /* offline / demo mode */
    }
    setMessages((m) => [
      ...m,
      {
        id: crypto.randomUUID(),
        sender: room.localParticipant.name || "You",
        text,
        ts: Date.now(),
        self: true,
      },
    ]);
    setDraft("");
  };

  if (!open) return null;

  return (
    <aside
      className={cn(
        "room-surface fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l border-[hsl(var(--room-tile-border))] shadow-2xl transition-all",
        "md:static md:h-full md:w-72 md:max-w-none md:shadow-none" // Fix: Forced height and width for sidebar mode
      )}
    >
      {/* Fix: Added shrink-0 to header and form to prevent them from collapsing */}
      <header className="flex shrink-0 items-center justify-between border-b border-[hsl(var(--room-tile-border))] px-4 py-3">
        <h3 className="text-sm font-semibold text-white">Chat</h3>
        <button onClick={onClose} className="text-room-muted hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3 scrollbar-thin scrollbar-thumb-room-tile-border">
        {messages.length === 0 && (
          <p className="text-center text-xs text-room-muted">No messages yet. Say hi 👋</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="text-sm break-words">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-white">{m.self ? "You" : m.sender}</span>
              <span className="text-[10px] text-room-muted">
                {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="text-room-muted">{m.text}</p>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex shrink-0 items-center gap-2 border-t border-[hsl(var(--room-tile-border))] p-3"
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message"
          className="border-[hsl(var(--room-tile-border))] bg-[hsl(var(--room-tile))] text-white placeholder:text-room-muted"
        />
        <Button type="submit" size="icon" disabled={!draft.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </aside>
  );
};