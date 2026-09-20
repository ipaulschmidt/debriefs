import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  value: string;
  onChange: (value: string, mode: "text" | "voice") => void;
  placeholder?: string;
  disabled?: boolean;
};

/**
 * Type or speak an answer. Speech is transcribed and dropped into the same
 * text box so the person can correct it before submitting.
 */
export function VoiceAnswer({ value, onChange, placeholder, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const baseRef = useRef("");

  useEffect(() => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const start = () => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    baseRef.current = value ? value + " " : "";
    rec.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      onChange((baseRef.current + transcript).trimStart(), "voice");
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
  };

  const stop = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value, "text")}
        placeholder={placeholder ?? "Type your answer, or use the mic and edit the transcript."}
        className="min-h-32 bg-card text-base leading-relaxed"
      />
      <div className="flex items-center gap-3">
        {supported ? (
          <Button
            type="button"
            variant={recording ? "destructive" : "outline"}
            size="sm"
            disabled={disabled}
            onClick={recording ? stop : start}
          >
            {recording ? <Square className="mr-2 size-3.5" /> : <Mic className="mr-2 size-3.5" />}
            {recording ? "Stop and review" : "Speak your answer"}
          </Button>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {recording
            ? "Listening. Everything appears above so you can fix it before sending."
            : "Type or speak — whatever's easier. You can edit before sending."}
        </p>
      </div>
    </div>
  );
}
