// Use the production static server so local OCR workers, models and MIME types match deployment.
await import('./build.mjs');
const {createStaticServer}=await import('./serve.mjs');
createStaticServer().listen(Number(process.env.PORT??4173),'0.0.0.0',()=>console.log('HYDROLAND development server ready'));
