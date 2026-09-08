"use client";

import { useState, useCallback, useRef } from "react";
import UploadPanel from "./UploadPanel";
import ProductForm from "./ProductForm";
import ControlBar from "./ControlBar";
import ProgressBar from "./ProgressBar";
import LiveLog from "./LiveLog";
import GenerationGrid from "./GenerationGrid";
import DownloadAll from "./DownloadAll";
import { JobSnapshot, LogEntry } from "@/lib/types";

export default function Playground() {
  const [reference, setReference] = useState<{ source: "file" | "url"; dataUrl?: string; url?: string } | null>(null);
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const startPolling = useCallback((id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);

    const poll = async () => {
      try {
        const res = await fetch(`/api/generate/${id}`);
        if (!res.ok) {
          if (pollRef.current) clearInterval(pollRef.current);
          return;
        }
        const snapshot: JobSnapshot = await res.json();
        setJob(snapshot);
        setLogs(snapshot.logs.slice(-50));

        if (snapshot.status === "completed" || snapshot.status === "stopped") {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch {
        // Silently retry on next tick
      }
    };

    pollRef.current = setInterval(poll, 1200);
    poll(); // Immediate first call
  }, []);

  const handleStart = async () => {
    if (!reference || !productName) return;
    setLoading(true);

    try {
      const formData = new FormData();
      if (reference.source === "file" && reference.dataUrl) {
        const blob = await fetch(reference.dataUrl).then((r) => r.blob());
        formData.append("referenceImage", blob, "product.jpg");
      } else if (reference.source === "url" && reference.url) {
        // Send as JSON
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: reference.url,
            productName,
            description,
          }),
        });
        if (!res.ok) throw new Error("Failed to start generation");
        const data = await res.json();
        setJobId(data.jobId);
        startPolling(data.jobId);
        setLoading(false);
        return;
      }

      formData.append("productName", productName);
      formData.append("description", description);

      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to start generation");
      const data = await res.json();
      setJobId(data.jobId);
      startPolling(data.jobId);
    } catch (err) {
      console.error("Start error:", err);
    }

    setLoading(false);
  };

  const handleControl = async (action: "pause" | "resume" | "stop") => {
    if (!jobId) return;
    try {
      const res = await fetch(`/api/generate/${jobId}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const snapshot: JobSnapshot = await res.json();
        setJob(snapshot);
      }
    } catch (err) {
      console.error("Control error:", err);
    }
  };

  const handleRetryAll = async () => {
    if (!jobId) return;
    try {
      const res = await fetch(`/api/generate/${jobId}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        startPolling(jobId);
      }
    } catch (err) {
      console.error("Retry error:", err);
    }
  };

  const handleRetryAngle = async (angle: number) => {
    if (!jobId) return;
    try {
      const res = await fetch(`/api/generate/${jobId}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ angles: [angle] }),
      });
      if (res.ok) {
        startPolling(jobId);
      }
    } catch (err) {
      console.error("Retry angle error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload + Form */}
      <div className="grid gap-6 lg:grid-cols-2">
        <UploadPanel
          onUpload={(dataUrl) =>
            setReference({ source: "file", dataUrl })
          }
          onUrlSubmit={(url) =>
            setReference({ source: "url", url })
          }
          previewUrl={reference?.dataUrl}
        />
        <ProductForm
          productName={productName}
          onProductNameChange={setProductName}
          description={description}
          onDescriptionChange={setDescription}
        />
      </div>

      {/* Control Bar */}
      <ControlBar
        onStart={handleStart}
        onPause={() => handleControl("pause")}
        onResume={() => handleControl("resume")}
        onStop={() => handleControl("stop")}
        onRetryAll={handleRetryAll}
        canStart={!!reference && !!productName && !loading}
        jobStatus={job?.status}
        failedCount={job?.progress.failed || 0}
        loading={loading}
      />

      {/* Progress + Log side-by-side */}
      {job && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ProgressBar
              completed={job.progress.completed}
              total={job.progress.total}
              failed={job.progress.failed}
              generating={job.progress.generating}
            />
          </div>
          <div>
            <DownloadAll jobId={jobId} completedCount={job.progress.completed} />
          </div>
        </div>
      )}

      {/* Live Log */}
      <LiveLog logs={logs} />

      {/* Generation Grid */}
      {job && (
        <GenerationGrid
          angles={job.angles}
          jobId={jobId!}
          onRetryAngle={handleRetryAngle}
        />
      )}
    </div>
  );
}