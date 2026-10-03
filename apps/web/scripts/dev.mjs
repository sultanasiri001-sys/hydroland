// Use the production static server so local OCR workers, models and MIME types match deployment.
await import('./build.mjs');
await import('./serve.mjs');
