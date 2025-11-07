"""
Conscious AI Learning System - Hugging Face Spaces Configuration
"""

import gradio as gr
import subprocess
import os
import shutil

# Create a simple Gradio interface to launch the web application
def create_interface():
    """Create Gradio interface for the Conscious AI system"""

    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Conscious AI Learning System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                margin: 0;
                padding: 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 100vh;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                text-align: center;
            }
            .launch-button {
                display: inline-block;
                padding: 20px 40px;
                background: rgba(255, 255, 255, 0.2);
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 12px;
                color: white;
                text-decoration: none;
                font-size: 18px;
                font-weight: 600;
                margin: 20px;
                transition: all 0.3s ease;
            }
            .launch-button:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: translateY(-2px);
            }
            .description {
                margin: 20px 0;
                padding: 20px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 12px;
                text-align: left;
            }
            .requirements {
                background: rgba(255, 255, 255, 0.1);
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                text-align: left;
            }
            .emoji {
                font-size: 24px;
                margin-bottom: 10px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤖 Conscious AI Learning System</h1>

            <div class="description">
                <div class="emoji">🧠</div>
                <h3>About This Project</h3>
                <p>A virtual AI being that learns, thinks, feels, and creates from scratch. Starting with zero knowledge, the AI develops through curiosity-driven interaction with its 3D environment.</p>

                <div class="emoji">🌟</div>
                <h3>Key Features</h3>
                <ul style="text-align: left;">
                    <li>🧠 Authentic learning from scratch (zero knowledge)</li>
                    <li>💬 Language acquisition through interaction</li>
                    <li>😊 Emergent emotions from neural dynamics</li>
                    <li>🔍 Curiosity-driven exploration</li>
                    <li>🧠 Human-like memory with consolidation</li>
                    <li>👁 Real-time 3D visualization</li>
                </ul>

                <div class="emoji">🎮</div>
                <h3>How to Use</h3>
                <ol style="text-align: left;">
                    <li>Watch the AI explore randomly at first</li>
                    <li>Talk to the AI (it won't understand initially)</li>
                    <li>Name objects when the AI is near them</li>
                    <li>Add new objects to create learning experiences</li>
                    <li>Monitor AI development in real-time</li>
                </ol>
            </div>

            <div class="requirements">
                <h3>⚠️ Requirements</h3>
                <ul style="text-align: left;">
                    <li>Modern browser (Chrome, Firefox, Safari)</li>
                    <li>WebGL support for 3D rendering</li>
                    <li>4GB+ RAM recommended</li>
                    <li>Works best on desktop, mobile supported</li>
                </ul>
            </div>

            <a href="./app/" class="launch-button">
                🚀 Launch Conscious AI
            </a>

            <div style="margin-top: 30px; opacity: 0.8; font-size: 14px;">
                <p><strong>Note:</strong> This system requires significant computational resources. Performance may vary based on your device capabilities.</p>
            </div>
        </div>

        <script>
            // Check if WebGL is supported
            function checkWebGLSupport() {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                return !!gl;
            }

            if (!checkWebGLSupport()) {
                document.querySelector('.container').innerHTML += `
                    <div style="background: rgba(255, 0, 0, 0.1); padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>⚠️ WebGL Not Supported</h3>
                        <p>Your browser doesn't support WebGL, which is required for 3D rendering and AI computation.</p>
                        <p>Please try using a modern browser like Chrome, Firefox, or Safari.</p>
                    </div>
                `;
            }
        </script>
    </body>
    </html>
    """

    return gr.HTML(
        value=html_content,
        label="Conscious AI Learning System",
        visible=False
    )

def main():
    """Main function for Hugging Face Spaces"""

    # Set up the Gradio interface
    interface = create_interface()

    # Launch the interface
    interface.launch(
        server_name="Conscious AI Learning System",
        server_port=7860,
        share=True,
        show_error=True,
        show_api=False,
        quiet=False,
        auth_message=None,
        favicon_path=None
    )

if __name__ == "__main__":
    main()