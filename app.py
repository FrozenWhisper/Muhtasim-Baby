# Minimal Gradio app for a Docker-style Hugging Face Space
# - Uses PORT env var (if present) so it works in docker/Spaces environments
# - Replace the process() function with your real model inference
import os
import gradio as gr
from huggingface_hub import hf_hub_download  # kept to match pinned huggingface-hub dependency

def process(text: str, audio_path: str):
    """
    Placeholder processing function.
    Replace this with your actual model loading and inference.
    - If an audio file is uploaded, returns its filepath so you can debug.
    - If text is provided, echoes it back.
    """
    if audio_path:
        return f"Received audio file at: {audio_path}"
    if text:
        return f"Echo: {text}"
    return "Please provide text input or upload an audio file."

def build_ui():
    with gr.Blocks(title="Muhtasim-Baby") as demo:
        gr.Markdown("# Muhtasim-Baby\nPlaceholder demo — replace process() with your inference.")
        with gr.Row():
            txt = gr.Textbox(label="Text input", placeholder="Type something here...")
            aud = gr.Audio(label="Upload audio (optional)", source="upload", type="filepath")
        out = gr.Textbox(label="Output")
        btn = gr.Button("Run")
        btn.click(process, inputs=[txt, aud], outputs=out)
    return demo

if __name__ == "__main__":
    demo = build_ui()
    # Use PORT env var if present (common in docker-style Spaces); fallback to 7860
    port = int(os.environ.get("PORT", os.environ.get("HF_SPACE_PORT", 7860)))
    # Bind to all interfaces so container is reachable
    demo.launch(server_name="0.0.0.0", server_port=port)