// diffusion-worker.js
import { AutoProcessor, MultiModalityCausalLM, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1/dist/transformers.min.js";

env.allowLocalModels = false;
env.backends.onnx.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.1/dist/";

let processor = null;
let model = null;
const model_id = "onnx-community/Janus-Pro-1B-ONNX";

async function initializeModel() {
    if (!model || !processor) {
        self.postMessage({ type: 'STATUS', message: 'Downloading & compiling DeepSeek Janus-Pro weights (WebGPU)...' });
        
        processor = await AutoProcessor.from_pretrained(model_id);
        model = await MultiModalityCausalLM.from_pretrained(model_id, {
            device: 'webgpu',
            dtype: 'fp32', // Safe fallback precision for web layers
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
        self.postMessage({ type: 'STATUS', message: 'Janus Engine Ready! Running inference tokens...' });
    }
    return { processor, model };
}

self.onmessage = async function(e) {
    const { type, prompt } = e.data;

    if (type === 'START_GENERATION') {
        try {
            const { processor, model } = await initializeModel();

            // Structure conversational block matching text_to_image templates
            const conversation = [
                { role: "<|User|>", content: prompt }
            ];

            self.postMessage({ type: 'STATUS', message: 'Tokenizing input matrix and assembling vision grid...' });
            const inputs = await processor(conversation, { chat_template: "text_to_image" });

            self.postMessage({ type: 'STATUS', message: 'Autoregressive Generation Loop executing (This will take a moment)...' });
            
            // Generate visual context tokens (Janus uses a specific fixed token length for a 384x384 frame)
            const outputs = await model.generate({
                ...inputs,
                max_new_tokens: 576, 
                do_sample: true,
                temperature: 0.7
            });

            self.postMessage({ type: 'STATUS', message: 'Rasterizing pixel output array...' });

            // Decode the generation tokens into visual pixel frames
            const generated_tokens = outputs.slice(null, [inputs.input_ids.dims.at(-1), null]);
            const decodedImages = await processor.post_process_image_generation(generated_tokens);
            
            // Extract the final native structural image object
            const imageBlobData = decodedImages[0];

            self.postMessage({ type: 'SUCCESS', image: imageBlobData });

        } catch (err) {
            self.postMessage({
                type: 'ERROR',
                error: err.message
            });
        }
    }
};
