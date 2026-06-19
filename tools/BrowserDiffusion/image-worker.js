// Import the WebGPU-enabled Hugging Face Transformers pipeline distribution
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1/dist/transformers.min.js";

let generationPipeline = null;

// Point the WASM execution backends and tokenizers to the official CDN endpoints
env.backends.onnx.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1/dist/";

async function initializePipeline() {
    if (!generationPipeline) {
        // Load the specialized client-side Ternary Bonsai Image 4B pipeline targeting WebGPU
        generationPipeline = await pipeline("text-to-image", "webml-community/bonsai-image-webgpu", {
            device: "webgpu", 
            dtype: {
                transformer: "q2", // Heavy ternary distillation layer optimization
                text_encoder: "q4", // Compressed 4-bit Qwen text encoder
                vae: "fp16"         // Clean half-precision VAE decoding
            },
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
    return generationPipeline;
}

self.onmessage = async function(e) {
    const { type, prompt, steps, width, height, seed } = e.data;

    if (type === 'START_GENERATION') {
        try {
            const pipe = await initializePipeline();

            // Execute the FlowMatchEuler client pipeline
            const output = await pipe(prompt, {
                num_inference_steps: steps || 4, // Ternary Bonsai excels at 4 fast iterations
                width: width || 512,
                height: height || 512,
                seed: seed || Math.floor(Math.random() * 1000000),
                callback_on_step_end: (step, num_steps, latents) => {
                    // Hook into the diffusion step loop to update UI progress bars
                    self.postMessage({
                        type: 'STEP_PROGRESS',
                        current: step + 1,
                        total: num_steps
                    });
                }
            });

            // The pipeline returns a standard ImageData-compatible pixel format array
            const rawImageData = output.images[0]; 

            // Dispatch pixels back upstream to the UI thread using zero-copy transferable layout
            self.postMessage({
                type: 'GENERATION_SUCCESS',
                width: rawImageData.width,
                height: rawImageData.height,
                rgbaPixels: rawImageData.data.buffer
            }, [rawImageData.data.buffer]);

        } catch (err) {
            self.postMessage({
                type: 'ERROR',
                error: err.message
            });
        }
    }
};