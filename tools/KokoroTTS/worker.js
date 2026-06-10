import { KokoroTTS } from "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";
import { env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1/dist/transformers.min.js";

let ttsInstance = null;

// Catch download status directly out of the Hugging Face Pipeline
env.backends.onnx.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1/dist/";

async function initializeModel() {
    if (!ttsInstance) {
        // Keep the base instance matching the js architecture baseline
        ttsInstance = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
            dtype: "q8",
            device: "wasm",
            progress_callback: (data) => {
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
 * Determines the explicit language flag to pass directly to Kokoro's core tokenizer mechanics.
 * This directly intercepts the phonemizer dictionary rather than using the restricted wrapper configurations.
 */
function getTokenizerLanguage(voice) {
    if (!voice || voice.length < 2) return "a";
    const prefix = voice.substring(0, 2).toLowerCase();
    
    switch (prefix) {
        case 'af': return 'a'; // American English
        case 'am': return 'a';
        case 'bf': return 'b'; // British English
        case 'bm': return 'b';
        case 'ef': // Spanish
        case 'em': 
            return 'e';
        case 'ff': return 'f'; // French
        case 'jf': // Japanese
        case 'jm': 
            return 'j';
        case 'kf': // Korean
        case 'km': 
            return 'k';
        case 'hf': // Hindi
        case 'hm': 
            return 'h';
        case 'if': // Italian
        case 'im': 
            return 'i';
        case 'pf': // Portuguese
        case 'pm': 
            return 'p';
        case 'zf': // Mandarin
        case 'zm': 
            return 'z';
        default: return 'a';
    }
}

self.onmessage = async function(e) {
    const { type, paragraphs, voice } = e.data;

    if (type === 'START_SYNTHESIS') {
        try {
            const tts = await initializeModel();
            const compiledChunks = [];
            let globalSamplingRate = 24000;

            // Extract the core token identifier character (e.g., 'e' for Spanish, 'z' for Mandarin)
            const tokenLang = getTokenizerLanguage(voice);

            for (let i = 0; i < paragraphs.length; i++) {
                self.postMessage({
                    type: 'CHUNK_PROGRESS',
                    current: i + 1,
                    total: paragraphs.length
                });

                /* BYPASS MECHANISM:
                  We pass 'en-us' as the nominal lang_code to keep the JS gatekeeper happy.
                  Then, we use a hidden backdoor feature of the model's text pipeline 
                  by injecting the custom target language prefix into the options object,
                  forcing the internal phonemizer to switch character maps!
                */
                const rawAudioOutput = await tts.generate(paragraphs[i], { 
                    voice: voice,
                    lang_code: 'en-us', 
                    language: tokenLang
                });
                
                compiledChunks.push(rawAudioOutput.audio);
                if (rawAudioOutput.sampling_rate) {
                    globalSamplingRate = rawAudioOutput.sampling_rate;
                }
            }

            // Concatenation logic
            const totalLength = compiledChunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const stitchedWaveform = new Float32Array(totalLength);
            
            let arrayInsertionOffset = 0;
            for (const chunk of compiledChunks) {
                stitchedWaveform.set(chunk, arrayInsertionOffset);
                arrayInsertionOffset += chunk.length;
            }

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
