// diffusion-worker.js
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1/dist/transformers.min.js";

// Emulate your working Kokoro architecture path configuration
env.allowLocalModels = false;
env.backends.onnx.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1/dist/";

let pipeInstance = null;

async function initializeModel() {
    if (!pipeInstance) {
        self.postMessage({ type: 'STATUS', message: 'Downloading & compiling optimized Stable Diffusion pipeline...' });
        
        // Use standard pipeline initializer but explicitly map to WebGPU
        pipeInstance = await pipeline('text-to-image', 'Xenova/distil-diffusion-light', {
            device: 'webgpu',
            progress_callback: (data) => {
                if (data.status === 'progress') {
                    self.postMessage({
                        type: 'MODEL_PROGRESS',
                        file: data.file,
                        progress: data.progress
                    });
                }
                if (data.status === 'ready') {
                    self.postMessage({ type: 'STATUS', message: 'Weights Ready! Compiling WebGPU shaders...' });
                }
            }
        });
    }
    return pipeInstance;
}

self.onmessage = async function(e) {
    const { type, prompt, negative_prompt, steps } = e.data;

    if (type === 'START_GENERATION') {
        try {
            const pipe = await initializeModel();

            self.postMessage({ type: 'STATUS', message: `Executing UNet Denoising Loop (${steps} steps)...` });

            const output = await pipe(prompt, {
                negative_prompt: negative_prompt || 'blurry, low quality, distorted',
                num_inference_steps: parseInt(steps) || 8,
                width: 256,
                height: 256,
                callback_on_step_end: (info) => {
                    self.postMessage({ 
                        type: 'PROGRESS', 
                        step: info.step + 1, 
                        total: info.num_inference_steps 
                    });
                }
            });

            // Extract native image generation result structure
            const image = output.images[0];
            
            self.postMessage({ type: 'SUCCESS', image: image });

        } catch (err) {
            self.postMessage({
                type: 'ERROR',
                error: err.message
            });
        }
    }
};
