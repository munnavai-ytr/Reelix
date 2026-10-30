// Reelix Extensible Registry Architecture
import { BUILT_IN_EFFECTS, EffectDefinition } from './effects';
import { BUILT_IN_TRANSITIONS, TransitionDefinition } from './transitions';
import { BUILT_IN_TEXT_ANIMATIONS, TextAnimationDefinition } from './text-animations';
import { BUILT_IN_CAPTION_STYLES, CaptionStyleDefinition } from './caption-styles';
import { BUILT_IN_TEMPLATES, TemplateDefinition } from './templates';
import { BUILT_IN_STICKERS, StickerDefinition } from './stickers';
import { BUILT_IN_FONTS, FontDefinition } from './fonts';

class EngineRegistry {
  private effects = new Map<string, EffectDefinition>(Object.entries(BUILT_IN_EFFECTS));
  private transitions = new Map<string, TransitionDefinition>(Object.entries(BUILT_IN_TRANSITIONS));
  private textAnimations = new Map<string, TextAnimationDefinition>(Object.entries(BUILT_IN_TEXT_ANIMATIONS));
  private captionStyles = new Map<string, CaptionStyleDefinition>(Object.entries(BUILT_IN_CAPTION_STYLES));
  private templates = new Map<string, TemplateDefinition>(Object.entries(BUILT_IN_TEMPLATES));
  private stickers = new Map<string, StickerDefinition>(Object.entries(BUILT_IN_STICKERS));
  private fonts = new Map<string, FontDefinition>(Object.entries(BUILT_IN_FONTS));

  // Effects
  registerEffect(effect: EffectDefinition): void {
    this.effects.set(effect.id, effect);
  }
  getEffect(id: string): EffectDefinition | undefined {
    return this.effects.get(id);
  }
  listEffects(): EffectDefinition[] {
    return Array.from(this.effects.values());
  }

  // Transitions
  registerTransition(trans: TransitionDefinition): void {
    this.transitions.set(trans.id, trans);
  }
  getTransition(id: string): TransitionDefinition | undefined {
    return this.transitions.get(id);
  }
  listTransitions(): TransitionDefinition[] {
    return Array.from(this.transitions.values());
  }

  // Text Animations
  registerTextAnimation(anim: TextAnimationDefinition): void {
    this.textAnimations.set(anim.id, anim);
  }
  getTextAnimation(id: string): TextAnimationDefinition | undefined {
    return this.textAnimations.get(id);
  }
  listTextAnimations(): TextAnimationDefinition[] {
    return Array.from(this.textAnimations.values());
  }

  // Caption Styles
  registerCaptionStyle(style: CaptionStyleDefinition): void {
    this.captionStyles.set(style.id, style);
  }
  getCaptionStyle(id: string): CaptionStyleDefinition | undefined {
    return this.captionStyles.get(id);
  }
  listCaptionStyles(): CaptionStyleDefinition[] {
    return Array.from(this.captionStyles.values());
  }

  // Templates
  registerTemplate(tpl: TemplateDefinition): void {
    this.templates.set(tpl.id, tpl);
  }
  getTemplate(id: string): TemplateDefinition | undefined {
    return this.templates.get(id);
  }
  listTemplates(): TemplateDefinition[] {
    return Array.from(this.templates.values());
  }

  // Stickers
  registerSticker(sticker: StickerDefinition): void {
    this.stickers.set(sticker.id, sticker);
  }
  getSticker(id: string): StickerDefinition | undefined {
    return this.stickers.get(id);
  }
  listStickers(): StickerDefinition[] {
    return Array.from(this.stickers.values());
  }

  // Fonts
  registerFont(font: FontDefinition): void {
    this.fonts.set(font.id, font);
  }
  getFont(id: string): FontDefinition | undefined {
    return this.fonts.get(id);
  }
  listFonts(): FontDefinition[] {
    return Array.from(this.fonts.values());
  }

  // Formatted compact catalog summary for AI Director and Chat-to-Change
  getCatalogSummary(): string {
    const effects = Array.from(this.effects.values()).map(e => `${e.id} (${e.category}: ${e.name})`).join(', ');
    const transitions = Array.from(this.transitions.values()).map(t => `${t.id} (${t.name})`).join(', ');
    const textAnims = Array.from(this.textAnimations.values()).map(a => `${a.id} (${a.name})`).join(', ');
    const captionStyles = Array.from(this.captionStyles.values()).map(c => `${c.id} (${c.name})`).join(', ');
    const templates = Array.from(this.templates.values()).map(t => `${t.id} (${t.name} - ${t.niche})`).join(', ');
    const stickers = Array.from(this.stickers.values()).map(s => `${s.id} (${s.name})`).join(', ');
    const fonts = Array.from(this.fonts.values()).map(f => `${f.id} (${f.family})`).join(', ');

    return `Available Reelix Registry Catalog:
- Effects: ${effects}
- Transitions: ${transitions}
- Text Animations: ${textAnims}
- Caption Styles: ${captionStyles}
- Templates: ${templates}
- Stickers: ${stickers}
- Fonts: ${fonts}`;
  }
}

export const Registry = new EngineRegistry();
export * from './effects';
export * from './transitions';
export * from './text-animations';
export * from './caption-styles';
export * from './templates';
export * from './stickers';
export * from './fonts';
export * from './shader-engine';
