/**
 * Remotion Renderer - V4 COMPATIBLE
 */

const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const path = require('path');
const fs = require('fs').promises;

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

  const tempDir = path.join(path.dirname(tsxFilePath), `project_${Date.now()}`);

  try {
    console.log('📁 Creating Remotion project...');
    
    await fs.mkdir(tempDir, { recursive: true });
    
    // Read TSX
    const tsxContent = await fs.readFile(tsxFilePath, 'utf-8');
    
    // Create index.ts - CORRECT FOR REMOTION V4
    const indexContent = `
import { Composition } from 'remotion';
import React from 'react';
import Component, { compositionConfig } from './Video';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="${compositionId}"
        component={Component}
        durationInFrames={${durationInFrames}}
        fps={${fps}}
        width=${width}
        height=${height}
      />
    </>
  );
};
`;
    
    await fs.writeFile(path.join(tempDir, 'index.ts'), indexContent);
    await fs.writeFile(path.join(tempDir, 'Video.tsx'), tsxContent);
    
    console.log('📦 Bundling...');
    const bundled = await bundle({
      entryPoint: path.join(tempDir, 'index.ts'),
      webpackOverride: (config) => config,
    });
    
    console.log('🔍 Selecting composition...');
    const composition = await selectComposition({
      serveUrl: bundled,
      id: compositionId,
    });
    
    console.log('🎬 Rendering...');
    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: 'h264',
      outputLocation: outputPath,
      onProgress: ({ progress }) => {
        if (Math.round(progress * 100) % 10 === 0) {
          console.log(`Progress: ${Math.round(progress * 100)}%`);
        }
      },
    });
    
    console.log('✅ Done!');
    await fs.access(outputPath);
    return outputPath;

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

module.exports = { renderVideo };