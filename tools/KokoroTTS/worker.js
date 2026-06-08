import { KokoroTTS } from "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js";

let ttsInstance = null;

// Pre-load the core ONNX community model
async function getTTS() {
    if (!ttsInstance) {
        postMessage({ status: "Downloading model (this may take a moment)..." });
        
        // You can change device to "webgpu" if the user's browser supports it
        ttsInstance = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
            dtype: "q8", 
            device: "wasm" 
        });
    }
    return ttsInstance;
}

self.onmessage = async function(e) {
    const { text, voice } = e.data;

    try {
        const tts = await getTTS();
        postMessage({ status: "Synthesizing audio..." });

        // Generate the audio structure
        const audio = await tts.generate(text, { voice: voice });
        
        // Convert the raw audio Float32Array to a playable browser Blob URL
        const blob = audio.toBlob(); 
        const audioUrl = URL.createObjectURL(blob);

        postMessage({ type: 'DONE', status: 'Speech ready!', audioUrl });
    } catch (err) {
        postMessage({ type: 'ERROR', status: 'Error occurred.', error: err.message });
    }
};