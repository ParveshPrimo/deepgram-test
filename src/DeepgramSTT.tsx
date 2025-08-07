"use client";

import React, { useState, useRef } from "react";
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";

const DeepgramSTT = () => {
  const [transcript, setTranscript] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const connectionRef = useRef<any>(null);

  console.log({ connectionRef });

  const startTranscription = async () => {
    const dgApiKey = import.meta.env.VITE_API_KEY;
    if (!dgApiKey) return alert("Deepgram API key missing");

    const deepgram = createClient(dgApiKey);

    const connection = deepgram.listen.live({
      model: "nova-3",
      interim_results: true,
      language: "multi", // or use "en", "hi", etc.
    });

    connectionRef.current = connection;

    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log("🔗 Deepgram connected");

      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        const recorder = new MediaRecorder(stream);
        recorderRef.current = recorder;

        recorder.addEventListener("dataavailable", (event) => {
          if (connectionRef.current) {
            connectionRef.current.send(event.data);
          }
        });

        recorder.start(250); // send audio in 250ms chunks
      });
    });

    connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
      const isFinal = data.is_final;
      const transcriptText = data.channel.alternatives[0]?.transcript;

      if (transcriptText && isFinal) {
        setTranscript((prev) => `${prev} ${transcriptText}`);
      }
    });

    connection.on(LiveTranscriptionEvents.Error, (err: any) => {
      console.error("❌ Deepgram error", err);
    });

    connection.on(LiveTranscriptionEvents.Close, () => {
      console.log("🔌 Deepgram connection closed");
    });
  };

  const stopTranscription = () => {
    if (recorderRef.current) {
      recorderRef.current.stream.getTracks().forEach((track) => track.stop()); // ✅ fully stop mic
      recorderRef.current.stop();
      recorderRef.current = null;
    }

    if (connectionRef.current) {
      connectionRef.current?._events.close(); // ✅ Proper method for browser SDK
      connectionRef.current = null;
    }
  };
  return (
    <div className="p-4">
      <button
        onClick={startTranscription}
        className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
      >
        Start Mic
      </button>
      <button
        onClick={stopTranscription}
        className="bg-red-500 text-white px-4 py-2 rounded"
      >
        Stop
      </button>

      <div className="mt-4 bg-gray-100 p-3 rounded text-black whitespace-pre-wrap">
        {transcript || "Start speaking..."}
      </div>
    </div>
  );
};

export default DeepgramSTT;
