"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square, Pause, Play, Loader2, Zap } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";

export default function FlashRecordPage() {
  const router = useRouter();
  const { locale } = useAppStore();
  const [phase, setPhase] = useState<"ready" | "recording" | "processing">("ready");
  const [duration, setDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState("");
  const [processingStep, setProcessingStep] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const startRecording = useCallback(async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(1000);
      setPhase("recording");
      setIsPaused(false);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch {
      setError(t("flash.micDenied", locale));
    }
  }, []);

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    }
  };

  const stopAndProcess = async () => {
    if (!mediaRecorderRef.current) return;

    setPhase("processing");
    setProcessingStep(t("flash.finalizingRecording", locale));

    return new Promise<void>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        if (timerRef.current) clearInterval(timerRef.current);

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });

        try {
          // Step 1: Create a minimal flash session
          setProcessingStep(t("flash.creatingSession", locale));
          const sessionRes = await fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: "Session flash — en cours de traitement",
              clientName: "En cours d'identification",
              language: "fr",
            }),
          });
          if (!sessionRes.ok) throw new Error(t("flash.sessionError", locale));
          const sessionData = await sessionRes.json();
          const sessionId = sessionData.id;

          // Step 2: Upload audio
          setProcessingStep(t("flash.uploadingAudio", locale));
          const formData = new FormData();
          formData.append("audio", blob, "flash-recording.webm");
          formData.append("sessionId", sessionId);
          const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
          if (!uploadRes.ok) throw new Error(t("flash.uploadError", locale));

          await fetch(`/api/sessions/${sessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audioDuration: duration, status: "transcribing" }),
          });

          // Step 3: Full flash processing (transcribe + extract metadata + generate report)
          setProcessingStep(t("flash.transcribing", locale));
          const flashRes = await fetch("/api/flash", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });

          if (!flashRes.ok) {
            const err = await flashRes.json();
            throw new Error(err.error || t("flash.processingError", locale));
          }

          const flashData = await flashRes.json();
          setProcessingStep(t("flash.done", locale));

          setTimeout(() => {
            router.push(`/sessions/${sessionId}`);
          }, 500);
        } catch (err: any) {
          console.error(err);
          setError(err.message || t("flash.genericError", locale));
          setPhase("ready");
        }

        resolve();
      };

      mediaRecorderRef.current!.stop();
      mediaRecorderRef.current!.stream.getTracks().forEach((t) => t.stop());
    });
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  if (phase === "processing") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="text-center">
          <Loader2 size={36} className="mx-auto animate-spin text-neutral-300" />
          <h2 className="mt-6 text-[18px] font-semibold text-black">
            {t("flash.processing", locale)}
          </h2>
          <p className="mt-2 text-[12px] text-neutral-400">{processingStep}</p>
          <div className="mx-auto mt-6 h-0.5 w-48 overflow-hidden bg-neutral-200">
            <div className="h-full animate-pulse bg-black" style={{ width: "60%" }} />
          </div>
          <p className="mt-4 text-[10px] text-neutral-300">
            {t("flash.doNotClose", locale)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center bg-black">
          <Zap size={22} className="text-white" />
        </div>
        <p className="text-[10px] font-semibold tracking-[0.2em] text-neutral-300 uppercase">
          {t("flash.mode", locale)}
        </p>
        <h1 className="mt-1 text-[22px] font-semibold text-black">
          {t("flash.title", locale)}
        </h1>
        <p className="mt-2 text-[13px] text-neutral-400">
          {t("flash.subtitle", locale)}
        </p>
      </div>

      {error && (
        <div className="border-l-2 border-red-500 bg-red-50 px-4 py-3 text-[12px] text-red-700">
          {error}
        </div>
      )}

      {phase === "recording" && (
        <>
          <div className="flex flex-col items-center">
            <div className="text-[56px] font-extralight tabular-nums tracking-wider text-black">
              {formatTime(duration)}
            </div>
            <p className="mt-2 text-[10px] font-semibold tracking-[0.2em] text-neutral-400 uppercase">
              {isPaused ? t("flash.paused", locale) : t("flash.active", locale)}
            </p>
          </div>

          {!isPaused && (
            <div className="flex h-12 items-center justify-center gap-0.5">
              {Array.from({ length: 40 }).map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 bg-black animate-pulse"
                  style={{
                    height: `${Math.random() * 100}%`,
                    animationDelay: `${i * 40}ms`,
                    animationDuration: `${400 + Math.random() * 400}ms`,
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      <div className="flex items-center justify-center gap-4">
        {phase === "ready" ? (
          <button
            onClick={startRecording}
            className="group flex h-28 w-28 flex-col items-center justify-center bg-black text-white transition-transform hover:scale-105 active:scale-95"
          >
            <Mic size={36} />
            <span className="mt-2 text-[9px] font-semibold tracking-[0.15em] uppercase">
              {t("flash.start", locale)}
            </span>
          </button>
        ) : (
          <>
            <button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="flex h-14 w-14 items-center justify-center border-2 border-neutral-300 text-neutral-600 transition-colors hover:border-black hover:text-black"
            >
              {isPaused ? <Play size={18} /> : <Pause size={18} />}
            </button>
            <button
              onClick={stopAndProcess}
              className="flex h-24 w-24 flex-col items-center justify-center bg-red-600 text-white transition-transform hover:scale-105 active:scale-95"
            >
              <Square size={28} />
              <span className="mt-1 text-[8px] font-semibold tracking-[0.1em] uppercase">
                {t("flash.stop", locale)}
              </span>
            </button>
          </>
        )}
      </div>

      {phase === "ready" && (
        <div className="text-center space-y-3">
          <div className="mx-auto h-px w-16 bg-neutral-200" />
          <div className="space-y-2 text-[11px] text-neutral-400">
            <p className="font-semibold text-neutral-500">{t("flash.howItWorks", locale)}</p>
            <p>{t("flash.step1", locale)}</p>
            <p>{t("flash.step2", locale)}</p>
            <p>{t("flash.step3", locale)}</p>
            <p>{t("flash.step4", locale)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
