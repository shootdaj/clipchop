# Clipchop Design Research

## Design Direction
Modern, fluid, calm UI inspired by the best Mac-native apps.

---

## Baseline Reference

**Dark Mode Control Panel UI** - Key design elements to emulate:

### Visual Characteristics
- **Deep dark background** - Near-black with subtle blue undertones
- **Rounded cards/tiles** - Large border-radius (~16-24px), creating soft modular feel
- **Inset/soft shadows** - Cards appear to float slightly above background
- **Accent colors** - Vibrant orange/amber and cyan/blue for interactive elements
- **Muted secondary elements** - Gray tones for non-active states

### Typography
- Clean, light-weight sans-serif
- Large numerical displays with smaller unit labels
- Clear hierarchy through size and weight

### Interactive Elements
- Pill-shaped buttons with high contrast
- Circular +/- controls with dark backgrounds
- Toggle switches with colored active states
- Slider tracks with gradient fills

### Layout Principles
- Grid-based modular cards
- Consistent spacing and padding
- Grouped related controls together
- Visual breathing room between sections

### Color Strategy (Implemented)
| Element | Color |
|---------|-------|
| Background | Near-black (#0a0a12) |
| Card surface | Dark gray with gradient (rgba(30,30,50,0.9)) |
| Primary accent | Purple (#a855f7) |
| Secondary accent | Amber (#f59e0b) |
| Active states | Bright, saturated versions |
| Inactive | Muted grays |

---

## Primary Inspiration (Tier 1)

### Raycast
- **Website**: https://www.raycast.com
- **Blog - Fresh Look**: https://www.raycast.com/blog/a-fresh-look-and-feel
- **Dribbble**: https://dribbble.com/raycastapp
- **Key Takeaways**: Fast, simple, delightful. Outline icons with bold strokes. Minimalism with strategic microinteractions.

### Arc Browser
- **Website**: https://arc.net
- **Figma UI Kit**: https://www.figma.com/community/file/1228728710215940920/arc-browser-interface
- **Key Takeaways**: "Clean and calm". Color-coded spaces. Vertical organization. Playful animations, theming engine.

### Linear
- **Website**: https://linear.app
- **Design Analysis**: https://blog.logrocket.com/ux-design/linear-design/
- **SaaS UI Reference**: https://www.saasui.design/application/linear
- **Key Takeaways**: Monochrome with bold accent pops. Reduced cognitive load. Sequential, logical progression.

### Craft Docs
- **Website**: https://www.craft.do
- **Key Takeaways**: "Fluid navigation". Hand-drawn separators for organic feel. Style Gallery. Balance of AI fluidity and dedicated space.

---

## Visual Reference (Tier 2)

### Apple Liquid Glass (iOS/macOS 2025)
- **Reference**: https://www.mockplus.com/blog/post/liquid-glass-effect-design-examples
- **Key Takeaways**: Translucent layers responding to motion. Refraction, adaptive blur. Content pushes through glass.

### Glassmorphism Examples
- **Gallery**: https://superdevresources.com/glassmorphism-ui-inspiration/
- **Webflow Examples**: https://webflow.com/made-in-webflow/glassmorphism
- **Deep Dive**: https://www.ramotion.com/blog/what-is-glassmorphism/
- **Key Takeaways**: Frosted glass with blur + saturation. Soft borders, bright gradients behind.

### Vercel Dashboard
- **Template**: https://vercel.com/templates/next.js/next-js-and-shadcn-ui-admin-dashboard
- **Key Takeaways**: Dark mode purple/blue gradients. Subtle glow effects. Dense data made approachable.

### Spotify Wrapped
- **Key Takeaways**: Bold gradients, icy glass. Typography as hero element. Motion storytelling.

---

## Design Principles

| Principle | Description |
|-----------|-------------|
| **Fluid** | Motion feels like water, not robots |
| **Calm** | No visual noise, focused |
| **Purposeful** | Every animation has meaning |
| **Organic** | Rounded, soft, approachable |
| **Context-aware** | UI adapts to state |

---

## Technical Resources

### Motion (Framer Motion)
- **Docs**: https://motion.dev/docs
- **React Animation**: https://motion.dev/docs/react/animation
- **Springs**: https://motion.dev/docs/react/transitions
- **Gestures**: https://motion.dev/docs/react/gestures
- **Layout Animations**: https://motion.dev/docs/react/layout-animations

### Tailwind CSS
- **Motion Integration**: https://motion.dev/docs/react/tailwind
- **Tailwind v4**: https://tailwindcss.com/blog/tailwindcss-v4

### shadcn/ui
- **Components**: https://ui.shadcn.com/docs/components
- **Theming**: https://ui.shadcn.com/docs/theming

---

## Color Palette Direction

**Implemented**: Purple + Amber palette
- Background: `#0a0a12` - Near-black with purple undertone
- Primary: `#a855f7` - Vibrant purple
- Accent: `#f59e0b` - Warm amber/orange
- Gradient: Purple → Amber for headers and highlights

### 3D Design System (Implemented)
- **card-3d**: Multi-layer box shadows creating depth
- **btn-3d**: Raised buttons with press-down effect (4px offset shadow)
- **pill-3d**: Pill buttons with subtle 3D borders
- **orb-purple/orb-amber**: Floating background orbs with blur
- **glow-purple**: Pulsing glow effect for CTAs

---

## Animation Notes

**Implemented Spring Configs**:
- `fluidSpring`: `{ stiffness: 120, damping: 14, mass: 1 }` - Main transitions
- `bouncySpring`: `{ stiffness: 400, damping: 25, mass: 0.5 }` - Snappy feedback
- `gentleSpring`: `{ stiffness: 80, damping: 20, mass: 1.2 }` - Slow reveals

**Applied To**:
- Page enter/exit transitions
- Card hover states (scale 1.01-1.02, y: -2px lift)
- Button press (scale 0.98, y: +2px press)
- Floating orbs with morphing border-radius
- Staggered list item animations (delay: index * 0.05)

---

## Implementation Status

### Completed
- [x] 3D dark theme with purple + amber colors
- [x] Fluid spring animations throughout
- [x] Video upload with drag & drop
- [x] Duration selector with preset + custom options
- [x] Split preview with visual timeline
- [x] Video splitting using WebAV (av-cliper)

### Bug Fixes
- **VideoEncoder closed codec error** (fixed): Set `sprite.time` with duration before adding to Combinator, and await `sprite.ready`

---

## To Explore

- [ ] Custom spring presets via Motion Studio MCP
- [ ] Drag-to-reorder for segments
- [ ] Haptic-like feedback animations
- [ ] Sound design integration?
