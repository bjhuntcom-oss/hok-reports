"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square, Pause, Play, ArrowLeft, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";

export default function NewSessionPage() {
  const router = useRouter();
  const { locale } = useAppStore();
  const [step, setStep] = useState<"info" | "record" | "processing">("info");
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [caseReference, setCaseReference] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("fr");
  const [category, setCategory] = useState("consultation");

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title || !clientName) {
      setError(locale === "en" ? "Title and client name are required." : "Le titre et le nom du client sont obligatoires.");
      return;
    }

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          clientName,
          clientEmail,
          clientPhone,
          caseReference,
          description,
          language,
        }),
      });

      if (!res.ok) throw new Error(locale === "en" ? "Creation error" : "Erreur lors de la création");
      const data = await res.json();
      setSessionId(data.id);
      setStep("record");
    } catch {
      setError(locale === "en" ? "Unable to create session. Please try again." : "Impossible de créer la session. Veuillez réessayer.");
    }
  };

  const startRecording = useCallback(async () => {
    try {
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
      setIsRecording(true);
      setIsPaused(false);

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

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !sessionId) return;

    setStep("processing");
    setProcessing(t("flash.finalizingRecording", locale));

    return new Promise<void>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsRecording(false);

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });

        setProcessing(t("flash.uploadingAudio", locale));
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");
        formData.append("sessionId", sessionId);

        try {
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!uploadRes.ok) throw new Error("Upload failed");

          await fetch(`/api/sessions/${sessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audioDuration: duration,
              status: "completed",
            }),
          });

          setProcessing(locale === "en" ? "Transcribing audio..." : "Transcription audio en cours...");
          const transcribeRes = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });

          if (transcribeRes.ok) {
            setProcessing(t("session.generating", locale));
            await fetch("/api/reports", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId, category, format: "standard" }),
            });
          }

          router.push(`/sessions/${sessionId}`);
        } catch (err) {
          console.error(err);
          setError(locale === "en" ? "An error occurred. You can retry from the session page." : "Une erreur est survenue. Vous pouvez relancer le traitement depuis la fiche de la session.");
          router.push(`/sessions/${sessionId}`);
        }

        resolve();
      };

      mediaRecorderRef.current!.stop();
      mediaRecorderRef.current!.stream
        .getTracks()
        .forEach((t) => t.stop());
    });
  };

  if (step === "processing") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="text-center">
          <Loader2 size={36} className="mx-auto animate-spin text-neutral-300" />
          <h2 className="mt-6 text-[18px] font-semibold text-black">
            {locale === "en" ? "Processing" : "Traitement en cours"}
          </h2>
          <p className="mt-2 text-[12px] text-neutral-400">{processing}</p>
          <div className="mx-auto mt-6 h-0.5 w-48 overflow-hidden bg-neutral-200">
            <div className="h-full animate-pulse bg-black" style={{ width: "60%" }} />
          </div>
          <p className="mt-4 text-[10px] text-neutral-300">
            {locale === "en" ? "Do not close this page during processing." : "Ne fermez pas cette page pendant le traitement."}
          </p>
        </div>
      </div>
    );
  }

  if (step === "record") {
    return (
      <div className="mx-auto max-w-lg space-y-8">
        <button
          onClick={() => setStep("info")}
          className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-400 transition-colors hover:text-black"
        >
          <ArrowLeft size={13} /> {locale === "en" ? "Back to info" : "Retour aux informations"}
        </button>

        <div className="text-center">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-neutral-300 uppercase">
            {t("status.recording", locale)}
          </p>
          <h1 className="mt-1 text-[20px] font-semibold text-black">{title}</h1>
          <p className="mt-1 text-[11px] text-neutral-400">
            {clientName}
            {caseReference && ` — ${t("dash.ref", locale)} ${caseReference}`}
          </p>
        </div>

        {error && (
          <div className="border-l-2 border-red-500 bg-red-50 px-4 py-3 text-[12px] text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col items-center">
          <div className="text-[56px] font-extralight tabular-nums tracking-wider text-black">
            {formatTime(duration)}
          </div>
          <p className="mt-2 text-[10px] font-semibold tracking-[0.2em] text-neutral-400 uppercase">
            {isRecording
              ? isPaused
                ? t("flash.paused", locale)
                : t("flash.active", locale)
              : (locale === "en" ? "Waiting" : "En attente")}
          </p>
        </div>

        {isRecording && !isPaused && (
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

        <div className="flex items-center justify-center gap-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex h-20 w-20 items-center justify-center bg-black text-white transition-transform hover:scale-105 active:scale-95"
            >
              <Mic size={30} />
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
                onClick={stopRecording}
                className="flex h-20 w-20 items-center justify-center bg-red-600 text-white transition-transform hover:scale-105 active:scale-95"
              >
                <Square size={26} />
              </button>
            </>
          )}
        </div>

        {isRecording && (
          <p className="text-center text-[10px] text-neutral-400">
            {locale === "en" ? "Press the red button to stop recording and start processing." : "Appuyez sur le bouton rouge pour terminer l'enregistrement et lancer le traitement."}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-[10px] font-semibold tracking-[0.2em] text-neutral-300 uppercase">
          {t("common.create", locale)}
        </p>
        <h1 className="mt-1 text-[22px] font-semibold text-black">{t("session.newTitle", locale)}</h1>
        <p className="mt-1 text-[13px] text-neutral-400">
          {t("session.newSubtitle", locale)}
        </p>
      </div>

      {error && (
        <div className="border-l-2 border-red-500 bg-red-50 px-4 py-3 text-[12px] text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleCreateSession} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[10px] font-semibold tracking-[0.15em] text-neutral-400 uppercase">
              {t("session.title", locale)} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-neutral-200 bg-white px-4 py-3 text-[13px] outline-none transition-colors focus:border-black"
              placeholder={t("session.titlePlaceholder", locale)}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold tracking-[0.15em] text-neutral-400 uppercase">
              {t("session.client", locale)} *
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full border border-neutral-200 bg-white px-4 py-3 text-[13px] outline-none transition-colors focus:border-black"
              placeholder={t("session.clientPlaceholder", locale)}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold tracking-[0.15em] text-neutral-400 uppercase">
              {t("session.caseRef", locale)}
            </label>
            <input
              type="text"
              value={caseReference}
              onChange={(e) => setCaseReference(e.target.value)}
              className="w-full border border-neutral-200 bg-white px-4 py-3 text-[13px] outline-none transition-colors focus:border-black"
              placeholder={t("session.caseRefPlaceholder", locale)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold tracking-[0.15em] text-neutral-400 uppercase">
              {t("session.clientEmail", locale)}
            </label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="w-full border border-neutral-200 bg-white px-4 py-3 text-[13px] outline-none transition-colors focus:border-black"
              placeholder="client@exemple.fr"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold tracking-[0.15em] text-neutral-400 uppercase">
              {t("session.clientPhone", locale)}
            </label>
            <input
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              className="w-full border border-neutral-200 bg-white px-4 py-3 text-[13px] outline-none transition-colors focus:border-black"
              placeholder="+33 6 00 00 00 00"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold tracking-[0.15em] text-neutral-400 uppercase">
              {t("session.language", locale)}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full border border-neutral-200 bg-white px-4 py-3 text-[13px] outline-none focus:border-black"
            >
              <option value="fr">{locale === "en" ? "French" : "Français"}</option>
              <option value="en">{locale === "en" ? "English" : "Anglais"}</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold tracking-[0.15em] text-neutral-400 uppercase">
              {t("report.category", locale)}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-neutral-200 bg-white px-4 py-3 text-[13px] outline-none focus:border-black"
            >
              <option value="consultation">{t("cat.consultation", locale)}</option>
              <option value="hearing">{t("cat.hearing", locale)}</option>
              <option value="deposition">{t("cat.deposition", locale)}</option>
              <option value="meeting">{t("cat.meeting", locale)}</option>
              <option value="general">{t("cat.general", locale)}</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[10px] font-semibold tracking-[0.15em] text-neutral-400 uppercase">
              {locale === "en" ? "Preliminary notes" : "Notes préliminaires"}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none border border-neutral-200 bg-white px-4 py-3 text-[13px] outline-none transition-colors focus:border-black"
              placeholder={t("session.descriptionPlaceholder", locale)}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="border border-neutral-200 px-6 py-3 text-[11px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
          >
            {t("common.cancel", locale)}
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 bg-black px-6 py-3 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-neutral-800"
          >
            <Mic size={14} />
            {t("session.startRecording", locale)}
          </button>
        </div>
      </form>
    </div>
  );
}
