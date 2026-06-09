import { KokoroTTS } from "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";
import { env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1/dist/transformers.min.js";

let ttsInstance = null;

// Catch download status directly out of the Hugging Face Pipeline
env.backends.onnx.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1/dist/";

async function initializeModel() {
    if (!ttsInstance) {
        ttsInstance = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
            dtype: "q8",
            device: "wasm",
            progress_callback: (data) => {
                // Intercept download status and forward upstream to UI
                if (data.status === 'progress') {
                    self.postMessage({
                        type: 'MODEL_PROGRESS',
                        file: data.file,
                        progress: data.progress
                    });
                }
                if (data.status === 'ready') {
                    self.postMessage({ type: 'MODEL_READY' });
                }
            }
        });
    }
    return ttsInstance;
}

self.onmessage = async function(e) {
    const { type, paragraphs, voice } = e.data;

    if (type === 'START_SYNTHESIS') {
        try {
            const tts = await initializeModel();
            const compiledChunks = [];
            let globalSamplingRate = 24000; // Kokoro constant default layout baseline

            for (let i = 0; i < paragraphs.length; i++) {
                // Signal current synthesis index
                self.postMessage({
                    type: 'CHUNK_PROGRESS',
                    current: i + 1,
                    total: paragraphs.length
                });

                // Generate audio segment
                const rawAudioOutput = await tts.generate(paragraphs[i], { voice: voice });
                
                compiledChunks.push(rawAudioOutput.audio);
                if (rawAudioOutput.sampling_rate) {
                    globalSamplingRate = rawAudioOutput.sampling_rate;
                }
            }

            // Concatenation: Calculate aggregate total layout allocation length
            const totalLength = compiledChunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const stitchedWaveform = new Float32Array(totalLength);
            
            let arrayInsertionOffset = 0;
            for (const chunk of compiledChunks) {
                stitchedWaveform.set(chunk, arrayInsertionOffset);
                arrayInsertionOffset += chunk.length;
            }

            // Return floating-point array data blocks to index window
            self.postMessage({
                type: 'COMPILE_SUCCESS',
                audioData: stitchedWaveform,
                samplingRate: globalSamplingRate
            });

        } catch (err) {
            self.postMessage({
                type: 'ERROR',
                error: err.message
            });
        }
    }
};