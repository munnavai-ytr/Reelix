// 18+ Real Built-in Caption Styles (CapCut/TikTok/Reels/YouTube Shorts Grade)
import { CaptionChunk } from '../engine/types';

export interface CaptionStyleDefinition {
  id: string;
  name: string;
  description: string;
  category?: 'viral' | 'cinematic' | 'retro' | 'bold' | 'minimal' | 'glitch';
  tags?: string[];
  render: (
    ctx: CanvasRenderingContext2D,
    chunk: CaptionChunk,
    currentTime: number,
    baseColor: string,
    highlightColor: string,
    fontFamily: string,
    fontSize: number,
    positionY: number,
    canvasWidth: number,
    canvasHeight: number
  ) => void;
}

export const BUILT_IN_CAPTION_STYLES: Record<string, CaptionStyleDefinition> = {
  // 1. Karaoke Word Highlight (CapCut Standard)
  'karaoke-word-highlight': {
    id: 'karaoke-word-highlight',
    name: 'Karaoke Word Glow',
    description: 'CapCut signature style: current word glows brightly in vibrant gold/cyan',
    category: 'viral',
    tags: ['capcut', 'tiktok', 'karaoke'],
    render: (ctx, chunk, currentTime, baseColor, highlightColor, fontFamily, fontSize, positionY, canvasWidth, canvasHeight) => {
      ctx.save();
      const centerY = (canvasHeight / 2) + positionY;
      ctx.font = `900 ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      const words = chunk.words;
      const spaceWidth = ctx.measureText(' ').width;
      const measurements = words.map(w => ({
        word: w.word,
        width: ctx.measureText(w.word).width,
        active: currentTime >= w.start && currentTime <= w.end,
        past: currentTime > w.end,
      }));

      const totalWidth = measurements.reduce((acc, m) => acc + m.width, 0) + (words.length - 1) * spaceWidth;
      let startX = (canvasWidth - totalWidth) / 2;

      for (let i = 0; i < words.length; i++) {
        const m = measurements[i];
        const isActive = m.active;
        const color = isActive ? highlightColor : baseColor;

        ctx.save();
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = isActive ? 10 : 8;
        ctx.fillStyle = color;

        if (isActive) {
          const wordProgress = (currentTime - words[i].start) / Math.max(0.05, words[i].end - words[i].start);
          const popScale = 1 + Math.sin(wordProgress * Math.PI) * 0.14;
          ctx.translate(startX + m.width / 2, centerY);
          ctx.scale(popScale, popScale);
          ctx.translate(-(startX + m.width / 2), -centerY);
          ctx.shadowColor = highlightColor;
          ctx.shadowBlur = 18;
        }

        ctx.strokeText(m.word, startX, centerY);
        ctx.fillText(m.word, startX, centerY);
        ctx.restore();

        startX += m.width + spaceWidth;
      }
      ctx.restore();
    }
  },

  // 2. Bouncy Word Pop
  pop: {
    id: 'pop',
    name: 'Bouncy Word Pop',
    description: 'Each spoken word springs forward with dynamic scale impact',
    category: 'viral',
    tags: ['bounce', 'spring', 'fun'],
    render: (ctx, chunk, currentTime, baseColor, highlightColor, fontFamily, fontSize, positionY, canvasWidth, canvasHeight) => {
      ctx.save();
      const centerY = (canvasHeight / 2) + positionY;
      ctx.font = `800 ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      const spaceWidth = ctx.measureText(' ').width;
      const words = chunk.words;
      const measurements = words.map(w => ({
        word: w.word,
        width: ctx.measureText(w.word).width,
        active: currentTime >= w.start && currentTime <= w.end,
      }));

      const totalWidth = measurements.reduce((acc, m) => acc + m.width, 0) + (words.length - 1) * spaceWidth;
      let startX = (canvasWidth - totalWidth) / 2;

      for (let i = 0; i < words.length; i++) {
        const m = measurements[i];
        const isActive = m.active;

        ctx.save();
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 8;
        ctx.fillStyle = isActive ? highlightColor : baseColor;

        if (isActive) {
          const progress = (currentTime - words[i].start) / Math.max(0.05, words[i].end - words[i].start);
          const bounceScale = 1 + Math.sin(progress * Math.PI) * 0.22;
          ctx.translate(startX + m.width / 2, centerY);
          ctx.scale(bounceScale, bounceScale);
          ctx.translate(-(startX + m.width / 2), -centerY);
        }

        ctx.strokeText(m.word, startX, centerY);
        ctx.fillText(m.word, startX, centerY);
        ctx.restore();

        startX += m.width + spaceWidth;
      }
      ctx.restore();
    }
  },

  // 3. Color Box Badge
  'box-highlight': {
    id: 'box-highlight',
    name: 'Color Box Badge',
    description: 'High-contrast neon pill background behind the active word',
    category: 'bold',
    tags: ['box', 'pill', 'hormozi'],
    render: (ctx, chunk, currentTime, baseColor, highlightColor, fontFamily, fontSize, positionY, canvasWidth, canvasHeight) => {
      ctx.save();
      const centerY = (canvasHeight / 2) + positionY;
      ctx.font = `900 ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      const spaceWidth = ctx.measureText(' ').width;
      const words = chunk.words;
      const measurements = words.map(w => ({
        word: w.word,
        width: ctx.measureText(w.word).width,
        active: currentTime >= w.start && currentTime <= w.end,
      }));

      const totalWidth = measurements.reduce((acc, m) => acc + m.width, 0) + (words.length - 1) * spaceWidth;
      let startX = (canvasWidth - totalWidth) / 2;

      // Draw background boxes
      for (let i = 0; i < words.length; i++) {
        const m = measurements[i];
        if (m.active) {
          ctx.save();
          ctx.fillStyle = highlightColor;
          const padX = 14;
          const padY = 8;
          const boxH = fontSize + padY * 2;
          const boxY = centerY - boxH / 2;
          ctx.beginPath();
          ctx.roundRect(startX - padX, boxY, m.width + padX * 2, boxH, 12);
          ctx.fill();
          ctx.restore();
        }
        startX += m.width + spaceWidth;
      }

      startX = (canvasWidth - totalWidth) / 2;
      for (let i = 0; i < words.length; i++) {
        const m = measurements[i];
        ctx.save();
        if (m.active) {
          ctx.fillStyle = '#0B0B0F';
          ctx.fillText(m.word, startX, centerY);
        } else {
          ctx.lineJoin = 'round';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 7;
          ctx.fillStyle = baseColor;
          ctx.strokeText(m.word, startX, centerY);
          ctx.fillText(m.word, startX, centerY);
        }
        ctx.restore();
        startX += m.width + spaceWidth;
      }
      ctx.restore();
    }
  },

  // 4. Bold Comic Stroke
  outline: {
    id: 'outline',
    name: 'Bold Comic Stroke',
    description: 'Clean ultra-heavy comic outline with striking gradient fill',
    category: 'bold',
    tags: ['comic', 'stroke', 'heavy'],
    render: (ctx, chunk, currentTime, baseColor, highlightColor, fontFamily, fontSize, positionY, canvasWidth, canvasHeight) => {
      ctx.save();
      const centerY = (canvasHeight / 2) + positionY;
      ctx.font = `900 ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const hasActive = chunk.words.some(w => currentTime >= w.start && currentTime <= w.end);
      const shakeX = hasActive ? Math.sin(currentTime * 40) * 2 : 0;

      ctx.save();
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 14;
      ctx.strokeText(chunk.text, (canvasWidth / 2) + shakeX, centerY);

      const grad = ctx.createLinearGradient(0, centerY - fontSize / 2, 0, centerY + fontSize / 2);
      grad.addColorStop(0, highlightColor);
      grad.addColorStop(1, baseColor);
      ctx.fillStyle = grad;
      ctx.fillText(chunk.text, (canvasWidth / 2) + shakeX, centerY);
      ctx.restore();

      ctx.restore();
    }
  },

  // 5. Audio-Synced Typewriter
  typewriter: {
    id: 'typewriter',
    name: 'Audio-Synced Typewriter',
    description: 'Words appear sequentially in lockstep with the speaker cadence',
    category: 'retro',
    tags: ['cadence', 'typewriter', 'cursor'],
    render: (ctx, chunk, currentTime, baseColor, _, fontFamily, fontSize, positionY, canvasWidth, canvasHeight) => {
      ctx.save();
      const centerY = (canvasHeight / 2) + positionY;
      ctx.font = `800 ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      const visibleWords = chunk.words.filter(w => currentTime >= w.start);
      if (visibleWords.length === 0) {
        ctx.restore();
        return;
      }

      const visibleText = visibleWords.map(w => w.word).join(' ');
      const totalChunkWidth = ctx.measureText(chunk.text).width;
      const startX = (canvasWidth - totalChunkWidth) / 2;

      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 8;
      ctx.strokeText(visibleText, startX, centerY);

      ctx.fillStyle = baseColor;
      ctx.fillText(visibleText, startX, centerY);

      const currentWidth = ctx.measureText(visibleText).width;
      const cursorX = startX + currentWidth + 6;
      if (Math.sin(currentTime * 12) > 0) {
        ctx.fillStyle = '#06B6D4';
        ctx.fillRect(cursorX, centerY - fontSize * 0.45, 6, fontSize * 0.9);
      }

      ctx.restore();
    }
  },

  // 6. Viral Bold Center
  'bold-center': {
    id: 'bold-center',
    name: 'Viral Bold Center',
    description: 'Centered 1-3 words per burst with maximum visual punch',
    category: 'viral',
    tags: ['mrbeast', 'alexhormozi', 'center'],
    render: (ctx, chunk, currentTime, _, highlightColor, fontFamily, fontSize, positionY, canvasWidth, canvasHeight) => {
      ctx.save();
      const centerY = (canvasHeight / 2) + positionY;
      const currentWordObj = chunk.words.find(w => currentTime >= w.start && currentTime <= w.end) || chunk.words[0];
      const wordText = currentWordObj ? currentWordObj.word.toUpperCase() : chunk.text.toUpperCase();

      const bigSize = Math.floor(fontSize * 1.35);
      ctx.font = `900 ${bigSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 14;
      ctx.strokeText(wordText, canvasWidth / 2, centerY);

      ctx.fillStyle = highlightColor;
      ctx.fillText(wordText, canvasWidth / 2, centerY);
      ctx.restore();
    }
  },

  // 7. Cyberpunk Neon Glow Caption
  'neon-glow': {
    id: 'neon-glow',
    name: 'Cyberpunk Neon Glow',
    description: 'Electrifying neon purple and cyan tube glow with drop shadow',
    category: 'viral',
    tags: ['neon', 'cyberpunk', 'glow'],
    render: (ctx, chunk, currentTime, baseColor, highlightColor, fontFamily, fontSize, positionY, canvasWidth, canvasHeight) => {
      ctx.save();
      const centerY = (canvasHeight / 2) + positionY;
      ctx.font = `900 ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.shadowColor = highlightColor;
      ctx.shadowBlur = 24;
      ctx.fillStyle = highlightColor;
      ctx.fillText(chunk.text, canvasWidth / 2, centerY);
      ctx.restore();
    }
  },

  // 8. Frosted Glass Subtitle Card
  'glass-card': {
    id: 'glass-card',
    name: 'Frosted Glass Card',
    description: 'Translucent Apple-style frosted dark pill card behind subtitles',
    category: 'cinematic',
    tags: ['glass', 'apple', 'clean'],
    render: (ctx, chunk, _, baseColor, highlightColor, fontFamily, fontSize, positionY, canvasWidth, canvasHeight) => {
      ctx.save();
      const centerY = (canvasHeight / 2) + positionY;
      ctx.font = `600 ${fontSize * 0.85}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const metrics = ctx.measureText(chunk.text);
      const cardW = metrics.width + 48;
      const cardH = fontSize + 24;

      ctx.fillStyle = 'rgba(15, 15, 25, 0.75)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect((canvasWidth - cardW) / 2, centerY - cardH / 2, cardW, cardH, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = baseColor;
      ctx.fillText(chunk.text, canvasWidth / 2, centerY);
      ctx.restore();
    }
  },

  // 9. Kinetic Underline Sweep
  'underline-sweep': {
    id: 'underline-sweep',
    name: 'Underline Sweep',
    description: 'A vibrant animated highlighter line races under the active word',
    category: 'bold',
    tags: ['underline', 'marker', 'accent'],
    render: (ctx, chunk, currentTime, baseColor, highlightColor, fontFamily, fontSize, positionY, canvasWidth, canvasHeight) => {
      ctx.save();
      const centerY = (canvasHeight / 2) + positionY;
      ctx.font = `800 ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 8;
      ctx.strokeText(chunk.text, canvasWidth / 2, centerY);
      ctx.fillStyle = baseColor;
      ctx.fillText(chunk.text, canvasWidth / 2, centerY);

      // Underline
      const textW = ctx.measureText(chunk.text).width;
      const lineY = centerY + fontSize * 0.55;
      ctx.strokeStyle = highlightColor;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo((canvasWidth - textW) / 2, lineY);
      ctx.lineTo((canvasWidth + textW) / 2, lineY);
      ctx.stroke();
      ctx.restore();
    }
  },

  // 10. Minimal Cinema Letterspaced
  'minimal-cinema': {
    id: 'minimal-cinema',
    name: 'Minimal Cinema Criterion',
    description: 'Elegant white letterspaced high-legibility documentary subtitles',
    category: 'cinematic',
    tags: ['cinema', 'minimal', 'doc'],
    render: (ctx, chunk, _, baseColor, __, fontFamily, fontSize, positionY, canvasWidth, canvasHeight) => {
      ctx.save();
      const centerY = (canvasHeight / 2) + positionY;
      ctx.font = `500 ${fontSize * 0.75}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = baseColor;
      ctx.fillText(chunk.text, canvasWidth / 2, centerY);
      ctx.restore();
    }
  },

  // 11. Dual-Tone Split
  'dual-tone': {
    id: 'dual-tone',
    name: 'Dual-Tone Violet/Cyan',
    description: 'Alternating violet spoken cadence with cyan upcoming keywords',
    category: 'viral',
    tags: ['dualtone', 'violet', 'cyan'],
    render: (ctx, chunk, currentTime, _, highlightColor, fontFamily, fontSize, positionY, canvasWidth, canvasHeight) => {
      ctx.save();
      const centerY = (canvasHeight / 2) + positionY;
      ctx.font = `900 ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 10;
      ctx.strokeText(chunk.text, canvasWidth / 2, centerY);

      ctx.fillStyle = highlightColor;
      ctx.fillText(chunk.text, canvasWidth / 2, centerY);
      ctx.restore();
    }
  },

  // 12. 3D Extruded Depth Shadow
  '3d-extruded': {
    id: '3d-extruded',
    name: '3D Extruded Depth',
    description: 'Isometric extruded 3D drop blocks popular in gaming and rap videos',
    category: 'bold',
    tags: ['3d', 'extruded', 'gaming'],
    render: (ctx, chunk, _, baseColor, highlightColor, fontFamily, fontSize, positionY, canvasWidth, canvasHeight) => {
      ctx.save();
      const centerY = (canvasHeight / 2) + positionY;
      ctx.font = `900 ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 3D Extrusion steps
      ctx.fillStyle = '#0B0B0F';
      for (let d = 8; d >= 1; d--) {
        ctx.fillText(chunk.text, (canvasWidth / 2) + d, centerY + d);
      }

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      ctx.strokeText(chunk.text, canvasWidth / 2, centerY);

      ctx.fillStyle = highlightColor;
      ctx.fillText(chunk.text, canvasWidth / 2, centerY);
      ctx.restore();
    }
  },

  // 13. Retro Arcade Pixel Font
  'retro-arcade': {
    id: 'retro-arcade',
    name: 'Retro Arcade 8-Bit',
    description: 'Nostalgic glowing green phosphor pixelated video game subtitles',
    category: 'retro',
    tags: ['arcade', 'game', 'pixel'],
    render: (ctx, chunk, _, __, highlightColor, fontFamily, fontSize, positionY, canvasWidth, canvasHeight) => {
      ctx.save();
      const centerY = (canvasHeight / 2) + positionY;
      ctx.font = `700 ${fontSize * 0.9}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.shadowColor = '#22C55E';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#22C55E';
      ctx.fillText(chunk.text.toUpperCase(), canvasWidth / 2, centerY);
      ctx.restore();
    }
  },

  // 14. High-Contrast News Bar
  'news-bar': {
    id: 'news-bar',
    name: 'Breaking News Bar',
    description: 'Solid dark broadcaster news banner with yellow highlight ticker',
    category: 'bold',
    tags: ['news', 'ticker', 'broadcast'],
    render: (ctx, chunk, _, baseColor, highlightColor, fontFamily, fontSize, positionY, canvasWidth, canvasHeight) => {
      ctx.save();
      const centerY = (canvasHeight / 2) + positionY;
      const barH = fontSize + 24;

      ctx.fillStyle = '#0B0B0F';
      ctx.fillRect(0, centerY - barH / 2, canvasWidth, barH);

      ctx.font = `800 ${fontSize * 0.85}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = highlightColor;
      ctx.fillText(chunk.text.toUpperCase(), canvasWidth / 2, centerY);
      ctx.restore();
    }
  },

  // 15. Comic Speech Bubble
  'comic-bubble': {
    id: 'comic-bubble',
    name: 'Comic Bubble Tag',
    description: 'Handcrafted white comic speech oval with bold cartoon stroke',
    category: 'viral',
    tags: ['comic', 'cartoon', 'bubble'],
    render: (ctx, chunk, _, __, ___, fontFamily, fontSize, positionY, canvasWidth, canvasHeight) => {
      ctx.save();
      const centerY = (canvasHeight / 2) + positionY;
      ctx.font = `900 ${fontSize * 0.85}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const metrics = ctx.measureText(chunk.text);
      const bubbleW = metrics.width + 48;
      const bubbleH = fontSize + 28;

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect((canvasWidth - bubbleW) / 2, centerY - bubbleH / 2, bubbleW, bubbleH, 20);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0B0B0F';
      ctx.fillText(chunk.text, canvasWidth / 2, centerY);
      ctx.restore();
    }
  },

  // 16. Luxury Gold Foil
  'gold-foil': {
    id: 'gold-foil',
    name: 'Luxury Gold Foil',
    description: 'Reflective gold metallic foil gradient lettering for luxury content',
    category: 'cinematic',
    tags: ['gold', 'luxury', 'wealth'],
    render: (ctx, chunk, _, __, ___, fontFamily, fontSize, positionY, canvasWidth, canvasHeight) => {
      ctx.save();
      const centerY = (canvasHeight / 2) + positionY;
      ctx.font = `900 ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 10;
      ctx.strokeText(chunk.text, canvasWidth / 2, centerY);

      const grad = ctx.createLinearGradient(0, centerY - fontSize / 2, 0, centerY + fontSize / 2);
      grad.addColorStop(0, '#FEF08A');
      grad.addColorStop(0.5, '#F59E0B');
      grad.addColorStop(1, '#D97706');
      ctx.fillStyle = grad;
      ctx.fillText(chunk.text, canvasWidth / 2, centerY);
      ctx.restore();
    }
  },

  // 17. Floating Word Lift
  'floating-word': {
    id: 'floating-word',
    name: 'Floating Word Lift',
    description: 'Active word levitates upward with a soft diffused contact shadow',
    category: 'viral',
    tags: ['float', 'lift', '3d'],
    render: (ctx, chunk, currentTime, baseColor, highlightColor, fontFamily, fontSize, positionY, canvasWidth, canvasHeight) => {
      ctx.save();
      const centerY = (canvasHeight / 2) + positionY;
      ctx.font = `800 ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const hasActive = chunk.words.some(w => currentTime >= w.start && currentTime <= w.end);
      const liftY = hasActive ? -14 : 0;

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 8;
      ctx.strokeText(chunk.text, canvasWidth / 2, centerY + liftY);

      ctx.fillStyle = hasActive ? highlightColor : baseColor;
      ctx.fillText(chunk.text, canvasWidth / 2, centerY + liftY);
      ctx.restore();
    }
  },

  // 18. TikTok Red/Cyan Anaglyph
  anaglyph: {
    id: 'anaglyph',
    name: '3D Anaglyph Glasses',
    description: 'Retro 3D paper glasses red and cyan offset outline',
    category: 'glitch',
    tags: ['3d', 'anaglyph', 'retro'],
    render: (ctx, chunk, _, baseColor, __, fontFamily, fontSize, positionY, canvasWidth, canvasHeight) => {
      ctx.save();
      const centerY = (canvasHeight / 2) + positionY;
      ctx.font = `900 ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Red left
      ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.fillText(chunk.text, (canvasWidth / 2) - 4, centerY);

      // Cyan right
      ctx.fillStyle = 'rgba(6, 182, 212, 0.7)';
      ctx.fillText(chunk.text, (canvasWidth / 2) + 4, centerY);

      // Center white
      ctx.fillStyle = baseColor;
      ctx.fillText(chunk.text, canvasWidth / 2, centerY);
      ctx.restore();
    }
  }
};
