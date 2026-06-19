// image-worker.js
import { env, AutoTokenizer } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1/dist/transformers.min.js";
// Import the raw WebGPU-enabled ONNX runtime execution engine
import * as ort from "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.0/dist/ort.webgpu.min.js";

// Set path for WebAssembly fallbacks if needed
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.0/dist/";

let tokenizer = null;
let textEncoderSession = null;
let transformerSession = null;
let vaeSession = null;

const MODEL_BASE = "https://huggingface.co/webml-community/bonsai-image-webgpu/resolve/main";

async function initModels() {
    if (!tokenizer) {
        // 1. Load tokenizer for text parsing
        tokenizer = await AutoTokenizer.from_pretrained("webml-community/bonsai-image-webgpu");
        
        // 2. Initialize Text Encoder Session via WebGPU
        textEncoderSession = await ort.InferenceSession.create(`${MODEL_BASE}/text_encoder_quantized.onnx`, {
            executionProviders: ['webgpu']
        });
        
        // 3. Initialize the Core Ternary Diffusion Transformer (MMDiT)
        transformerSession = await ort.InferenceSession.create(`${MODEL_BASE}/transformer_quantized.onnx`, {
            executionProviders: ['webgpu']
        });
        
        // 4. Initialize Variational Autoencoder (VAE) for pixel decoding
        vaeSession = await ort.InferenceSession.create(`${MODEL_BASE}/vae_decoder.onnx`, {
            executionProviders: ['webgpu']
        });
        
        self.postMessage({ type: 'MODEL_READY' });
    }
}

self.onmessage = async function(e) {
    const { type, prompt, steps, width, height, seed } = e.data;
    if (type !== 'START_GENERATION') return;

    try {
        await initModels();
        
        statusUpdate("Encoding prompt text...");
        // 1. Text Tokenization & Encoding
        const { input_ids } = await tokenizer(prompt);
        const textEncoderFeeds = { input_ids: new ort.Tensor('int64', BigInt64Array.from(input_ids.map(BigInt)), [1, input_ids.length]) };
        const textEncoderResults = await textEncoderSession.run(textEncoderFeeds);
        const textEmbeddings = textEncoderResults.text_embeddings; // Shape [1, sequence, hidden_dim]

        // 2. Initialize Latent Noise Space
        statusUpdate("Generating random latents...");
        let latents = generateLatentNoise(width, height, seed); 

        // 3. Denoising Loop (FlowMatchEuler)
        const totalSteps = steps || 4;
        for (let step = 0; step < totalSteps; step++) {
            self.postMessage({ type: 'STEP_PROGRESS', current: step + 1, total: totalSteps });
            
            // Prepare inputs for the Diffusion Transformer iteration
            const transformerFeeds = {
                hidden_states: latents,
                encoder_hidden_states: textEmbeddings,
                timestep: new ort.Tensor('float32', new Float32Array([step / totalSteps]), [1])
            };
            
            const transformerResults = await transformerSession.run(transformerFeeds);
            const noisePred = transformerResults.noise_pred;
            
            // Euler step integration math updates the latents
            latents = performEulerStep(latents, noisePred, step, totalSteps);
        }

        // 4. VAE Tiled Decode to Pixels
        statusUpdate("Decoding latents to image pixels...");
        const vaeFeeds = { latents: latents };
        const vaeResults = await vaeSession.run(vaeFeeds);
        const rawPixels = vaeResults.pixel_values.data; // Output Float32 or Uint8 matrix

        // Convert the structural tensor matrix array back to RGBA canvas layout
        const rgbaBuffer = convertTensorToRGBA(rawPixels, width, height);

        self.postMessage({
            type: 'GENERATION_SUCCESS',
            width: width,
            height: height,
            rgbaPixels: rgbaBuffer
        }, [rgbaBuffer]);

    } catch (err) {
        self.postMessage({ type: 'ERROR', error: err.message });
    }
};

function statusUpdate(text) {
    // Helper to pipe initialization sub-states to UI
    self.postMessage({ type: 'MODEL_PROGRESS', file: text, progress: 50 });
}

// Math stubs for the standard FlowMatch Euler integration step loops
function generateLatentNoise(w, h, seed) {
    const size = 1 * 16 * (h / 8) * (w / 8); // FLUX models operate on standard 16-channel latents
    const arr = new Float32Array(size);
    for (let i = 0; i < size; i++) arr[i] = Math.random() * 2.0 - 1.0; // Controlled Gaussian substitute
    return new ort.Tensor('float32', arr, [1, 16, h / 8, w / 8]);
}

function performEulerStep(latents, noisePred, step, total) {
    const dt = 1.0 / total;
    const nextData = new Float32Array(latents.data.length);
    for (let i = 0; i < latents.data.length; i++) {
        nextData[i] = latents.data[i] - dt * noisePred.data[i];
    }
    return new ort.Tensor('float32', nextData, latents.dims);
}

function convertTensorToRGBA(pixelData, w, h) {
    const buffer = new ArrayBuffer(w * h * 4);
    const view = new Uint8ClampedArray(buffer);
    let pIdx = 0;
    for (let i = 0; i < w * h; i++) {
        // Map normalized -1/1 tensor channels back to standard 0-255 canvas byte ranges
        view[pIdx] = Math.min(255, Math.max(0, (pixelData[i] + 1.0) * 127.5)); // R
        view[pIdx+1] = Math.min(255, Math.max(0, (pixelData[i + w*h] + 1.0) * 127.5)); // G
        view[pIdx+2] = Math.min(255, Math.max(0, (pixelData[i + 2*w*h] + 1.0) * 127.5)); // B
        view[pIdx+3] = 255; // Alpha opaque
        pIdx += 4;
    }
    return buffer;
}
