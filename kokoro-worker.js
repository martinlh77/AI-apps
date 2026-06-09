import { KokoroTTS } from "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";
import { env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1/dist/transformers.min.js";

env.backends.onnx.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1/dist/";

let ttsInstance = null;
let currentConfig = {
    model_id: "onnx-community/Kokoro-82M-v1.0-ONNX",
    dtype: "q8",
    device: "wasm"
};

async function ensureTTS(config = {}) {
    const nextConfig = {
        ...currentConfig,
        ...config
    };

    const needsReload =
        !ttsInstance ||
        nextConfig.dtype !== currentConfig.dtype ||
        nextConfig.device !== currentConfig.device ||
        nextConfig.model_id !== currentConfig.model_id;

    if (needsReload) {
        currentConfig = nextConfig;
        ttsInstance = await KokoroTTS.from_pretrained(currentConfig.model_id, {
            dtype: currentConfig.dtype,
            device: currentConfig.device,
            progress_callback: (data) => {
                if (data.status === 'progress') {
                    self.postMessage({
                        type: 'MODEL_PROGRESS',
                        file: data.file,
                        progress: data.progress
                    });
                }
                if (data.status === 'ready') {
                    self.postMessage({
                        type: 'MODEL_READY'
                    });
                }
            }
        });
    }

    return ttsInstance;
}

function encodeWAV(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    function writeString(offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
}

self.onmessage = async function(e) {
    const { type, requestId, text, chunks, voice, dtype } = e.data;

    try {
        if (type === 'INIT') {
            await ensureTTS({ dtype: dtype || "q8" });
            self.postMessage({ type: 'INIT_DONE' });
            return;
        }

        if (type === 'GENERATE') {
            const tts = await ensureTTS({ dtype: dtype || "q8" });

            const result = await tts.generate(text, { voice });
            const wavBlob = encodeWAV(result.audio, result.sampling_rate || 24000);
            const arrayBuffer = await wavBlob.arrayBuffer();

            self.postMessage({
                type: 'AUDIO_RESULT',
                requestId,
                text,
                samplingRate: result.sampling_rate || 24000,
                audioBuffer: arrayBuffer
            }, [arrayBuffer]);

            return;
        }

        if (type === 'GENERATE_BATCH') {
            const tts = await ensureTTS({ dtype: dtype || "q8" });

            if (!Array.isArray(chunks) || chunks.length === 0) {
                throw new Error('No chunks provided for batch generation');
            }

            const audioChunks = [];
            let sampleRate = 24000;

            for (let i = 0; i < chunks.length; i++) {
                self.postMessage({
                    type: 'BATCH_PROGRESS',
                    requestId,
                    current: i + 1,
                    total: chunks.length
                });

                const result = await tts.generate(chunks[i], { voice });
                audioChunks.push(result.audio.buffer.slice(0));
                if (result.sampling_rate) {
                    sampleRate = result.sampling_rate;
                }
            }

            self.postMessage({
                type: 'BATCH_RESULT',
                requestId,
                samplingRate: sampleRate,
                audioChunks
            }, audioChunks);

            return;
        }
    } catch (err) {
        self.postMessage({
            type: 'ERROR',
            requestId,
            error: err.message || String(err)
        });
    }
};
