/**
 * Remotion Renderer Module - REAL VERSION
 * Actual video rendering using Remotion
 */

const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const path = require('path');
const fs = require('fs').promises;

/**
 * Render a video from TSX code
 */
async function renderVideo(options) {
  const {
    tsxFilePath,
    compositionId,
    outputPath,
    width = 1080,
    height = 1920,
    fps = 30,
    durationInFrames = 150
  } = options;

  const tempDir = path.join(path.dirname(tsxFilePath), `temp_${Date.now()}`);

  try {
    console.log('📁 Creating temporary project...');
    
    // Create temporary directory structure
    await fs.mkdir(tempDir, { recursive: true });
    
    // Read the TSX content
    const tsxContent = await fs.readFile(tsxFilePath, 'utf-8');
    
    // Write Video.tsx
    await fs.writeFile(path.join(tempDir, 'Video.tsx'), tsxContent, 'utf-8');
    
    // Create Root.tsx
    const rootContent = `
import { Composition } from 'remotion';
import Component, { compositionConfig } from './Video';

export const RemotionRoot = () => {
  return (
    <Composition
      id={compositionConfig.id}
      component={Component}
      durationInFrames={compositionConfig.durationInSeconds * compositionConfig.fps}
      fps={compositionConfig.fps}
      width={compositionConfig.width}
      height={compositionConfig.height}
    />
  );
};
`;
    await fs.writeFile(path.join(tempDir, 'Root.tsx'), rootContent, 'utf-8');
    
    console.log('📦 Bundling...');
    const bundleLocation = await bundle({
      entryPoint: path.join(tempDir, 'Root.tsx'),
      webpackOverride: (config) => config,
    });
    
    console.log('🎬 Rendering video...');
    await renderMedia({
      composition: {
        id: compositionId,
        durationInFrames,
        fps,
        width,
        height,
      },
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      onProgress: ({ progress }) => {
        const percent = Math.round(progress * 100);
        if (percent % 10 === 0) {
          console.log(`Rendering: ${percent}%`);
        }
      },
    });
    
    console.log('✅ Render complete!');
    
    // Verify output exists
    await fs.access(outputPath);
    
    return outputPath;

  } catch (error) {
    console.error('❌ Render error:', error);
    throw error;
  } finally {
    // Cleanup
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log('🧹 Cleaned up temp directory');
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  }
}

module.exports = {
  renderVideo,
};