// diffusion-worker.js
import { StableDiffusionPipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2';

env.allowLocalModels = false;

let pipe = null;

self.onmessage = async function(e) {
    const { type, prompt, negative_prompt, steps } = e.data;

    if (type === 'START_GENERATION') {
        try {
            if (!pipe) {
                self.postMessage({ type: 'STATUS', message: 'Requesting WebGPU device & downloading weights...' });
                
                // Explicitly catch compilation errors
                try {
                    pipe = await StableDiffusionPipeline.from_pretrained('Xenova/distil-diffusion-light', {
                        device: 'webgpu' // Let the browser auto-negotiate optimal shader precision
                    });
                } catch (gpuError) {
                    console.error("WebGPU Init Failed, trying CPU/Wasm fallback...", gpuError);
                    self.postMessage({ type: 'STATUS', message: 'WebGPU failed. Falling back to CPU/Wasm mode (Slower)...' });
                    
                    // Fallback to standard WebAssembly if their graphics card rejects the WebGPU shaders
                    pipe = await StableDiffusionPipeline.from_pretrained('Xenova/distil-diffusion-light', {
                        device: 'wasm'
                    });
                }
                
                self.postMessage({ type: 'STATUS', message: 'Pipeline Compiled Successfully!' });
            }

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

            const image = output.images[0];
            self.postMessage({ type: 'SUCCESS', image: image });

        } catch (error) {
            // Log to worker console AND send up to UI thread
            console.error("WORKER RUNTIME EXCEPTION:", error);
            self.postMessage({ type: 'ERROR', error: error.message });
        }
    }
};
