// diffusion-worker.js
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0';

// Allow downloading pre-quantized web-optimized ONNX models
env.allowLocalModels = false;

let pipe = null;

self.onmessage = async function(e) {
    const { type, prompt, negative_prompt, steps } = e.data;

    if (type === 'START_GENERATION') {
        try {
            // Initialize pipeline if it hasn't been loaded yet
            if (!pipe) {
                self.postMessage({ type: 'STATUS', message: 'Downloading & compiling Diffusion weights (WebGPU)...' });
                
                pipe = await pipeline('text-to-image', 'Xenova/distil-diffusion-light', {
                    device: 'webgpu', // Uses WebGPU directly on the client machine
                    dtype: 'fp32'     // Ensures compatible precision across standard web-runtimes
                });
                
                self.postMessage({ type: 'STATUS', message: 'Pipeline Compiled! Starting generation steps...' });
            }

            self.postMessage({ type: 'STATUS', message: `Executing UNet Denoising Loop (${steps} steps)...` });

            // Run the actual inference pipeline
            const output = await pipe(prompt, {
                negative_prompt: negative_prompt || 'blurry, low quality, distorted',
                num_inference_steps: parseInt(steps) || 8,
                width: 256, // Fixed to light dimensions for responsive client-side speeds
                height: 256,
                callback_on_step_end: (info) => {
                    self.postMessage({ 
                        type: 'PROGRESS', 
                        step: info.step + 1, 
                        total: info.num_inference_steps 
                    });
                }
            });

            // The pipeline returns a raw canvas/image element or raw pixel data
            const image = output.images[0];
            
            // Send the raw data back to the main thread
            self.postMessage({ type: 'SUCCESS', image: image });

        } catch (error) {
            self.postMessage({ type: 'ERROR', error: error.message });
        }
    }
};