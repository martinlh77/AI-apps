// diffusion-worker.js
import { StableDiffusionPipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2';

// Allow downloading pre-quantized web-optimized ONNX models
env.allowLocalModels = false;

let pipe = null;

self.onmessage = async function(e) {
    const { type, prompt, negative_prompt, steps } = e.data;

    if (type === 'START_GENERATION') {
        try {
            // Initialize pipeline directly using the explicit v3 Diffusion class
            if (!pipe) {
                self.postMessage({ type: 'STATUS', message: 'Downloading & compiling Diffusion weights (WebGPU)...' });
                
                pipe = await StableDiffusionPipeline.from_pretrained('Xenova/distil-diffusion-light', {
                    device: 'webgpu', 
                    dtype: 'fp32'     
                });
                
                self.postMessage({ type: 'STATUS', message: 'Pipeline Compiled! Starting generation steps...' });
            }

            self.postMessage({ type: 'STATUS', message: `Executing UNet Denoising Loop (${steps} steps)...` });

            // Run the explicit pipeline
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

            // Extract raw pixel configuration
            const image = output.images[0];
            
            self.postMessage({ type: 'SUCCESS', image: image });

        } catch (error) {
            self.postMessage({ type: 'ERROR', error: error.message });
        }
    }
};
