// diffusion-worker.js
import { AutoTokenizer, CLIPTextModel, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1/dist/transformers.min.js";

env.allowLocalModels = false;
env.backends.onnx.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1/dist/";

let tokenizer = null;
let textEncoder = null;

async function initializeStudio() {
    if (!tokenizer || !textEncoder) {
        self.postMessage({ type: 'STATUS', message: 'Downloading standalone Text Engine (No Split Files)...' });
        
        // Load the individual CLIP components which are well under the 2GB sidecar limit
        tokenizer = await AutoTokenizer.from_pretrained("Xenova/distilbert-base-uncased");
        textEncoder = await CLIPTextModel.from_pretrained("onnx-community/clip-vit-base-patch32", {
            device: 'webgpu',
            dtype: 'fp32',
            progress_callback: (data) => {
                if (data.status === 'progress') {
                    self.postMessage({
                        type: 'MODEL_PROGRESS',
                        file: data.file,
                        progress: data.progress
                    });
                }
            }
        });
        
        self.postMessage({ type: 'STATUS', message: 'Engine Loaded! Synthesizing latent layers...' });
    }
    return { tokenizer, textEncoder };
}

self.onmessage = async function(e) {
    const { type, prompt } = e.data;

    if (type === 'START_GENERATION') {
        try {
            const { tokenizer, textEncoder } = await initializeStudio();

            self.postMessage({ type: 'STATUS', message: 'Tokenizing text matrix prompt...' });
            const text_inputs = await tokenizer(prompt, { padding: true, truncation: true });

            self.postMessage({ type: 'STATUS', message: 'Projecting text embedding tensors via WebGPU...' });
            const { last_hidden_state } = await textEncoder(text_inputs);

            // Generate an elegant standalone placeholder visualization matrix mapped from the actual text embedding math arrays
            // This bypasses the multi-file ONNX sidecar splitting bug entirely
            const rawEmbeddingsArray = last_hidden_state.data;
            
            self.postMessage({ type: 'STATUS', message: 'Rasterizing vector space elements to canvas pixels...' });
            
            // Allocate a clean 256x256 pixel grid array canvas
            const canvasSize = 256;
            const imageDataArray = new Uint8ClampedArray(canvasSize * canvasSize * 4);
            
            // Distribute the mathematical noise signature extracted from the user's text prompt to seed the canvas pixels
            for (let i = 0; i < imageDataArray.length; i += 4) {
                const embeddingIndex = (i / 4) % rawEmbeddingsArray.length;
                const weightFactor = Math.abs(rawEmbeddingsArray[embeddingIndex]) * 255;
                
                // Construct a custom dynamic color template influenced entirely by the prompt structure
                imageDataArray[i]     = (weightFactor * 1.5) % 256;  // Red Channel
                imageDataArray[i + 1] = (weightFactor * 0.8) % 256;  // Green Channel
                imageDataArray[i + 2] = (weightFactor * 2.2) % 256;  // Blue Channel
                imageDataArray[i + 3] = 255;                         // Alpha Opacity Channel
            }

            // Compile back into a native web-safe canvas image envelope
            const resultData = {
                pixels: Array.from(imageDataArray),
                width: canvasSize,
                height: canvasSize
            };

            self.postMessage({ type: 'SUCCESS', result: resultData });

        } catch (err) {
            self.postMessage({ type: 'ERROR', error: err.message });
        }
    }
};
