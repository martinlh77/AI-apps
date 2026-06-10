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

/**
 * Determines the correct language code for the Kokoro model based on the selected voice prefix.
 * Default profiles use 'a' (American English) or 'b' (British English).
 * Other languages map to their respective ISO or specific model tokens.
 */
function getLanguageCode(voice) {
    if (!voice || voice.length < 2) return "en-us";
    
    const prefix = voice.substring(0, 2).toLowerCase();
    switch (prefix) {
        case 'af': // American Female
        case 'am': // American Male
            return 'en-us';
        case 'bf': // British Female
        case 'bm': // British Male
            return 'en-gb';
        case 'ef': // Spanish Female
        case 'em': // Spanish Male
            return 'es';
        case 'ff': // French Female
            return 'fr-fr';
        case 'jf': // Japanese Female
        case 'jm': // Japanese Male
            return 'ja';
        case 'kf': // Korean Female
        case 'km': // Korean Male
            return 'ko';
        case 'hf': // Hindi Female
        case 'hm': // Hindi Male
            return 'hi';
        case 'if': // Italian Female
        case 'im': // Italian Male
            return 'it';
        case 'pf': // Portuguese Female
        case 'pm': // Portuguese Male
            return 'pt-br';
        case 'zf': // Mandarin Female
        case 'zm': // Mandarin Male
            return 'cmn';
        default:
            return 'en-us';
    }
}

self.onmessage = async function(e) {
    const { type, paragraphs, voice } = e.data;

    if (type === 'START_SYNTHESIS') {
        try {
            const tts = await initializeModel();
            const compiledChunks = [];
            let globalSamplingRate = 24000; // Kokoro constant default layout baseline

            // Determine language code dynamically from the voice name selection
            const langCode = getLanguageCode(voice);

            for (let i = 0; i < paragraphs.length; i++) {
                // Signal current synthesis index
                self.postMessage({
                    type: 'CHUNK_PROGRESS',
                    current: i + 1,
                    total: paragraphs.length
                });

                // Generate audio segment with voice profile and its native language code configuration
                const rawAudioOutput = await tts.generate(paragraphs[i], { 
                    voice: voice,
                    lang_code: langCode 
                });
                
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
