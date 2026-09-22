# AGENTS.md

## Project UI Design System — Strict Glassmorphism

This document defines the mandatory UI/UX rules for this application.

**IMPORTANT:** When modifying or creating UI, follow these rules exactly. Do not introduce a different visual style unless explicitly requested.

---

# 1. Core Design Direction

The application uses a:

* Dark futuristic glassmorphism design
* Transparent layered surfaces
* Soft gradients
* Subtle borders
* Depth through transparency and shadows
* Rounded glass containers
* Floating UI elements
* Soft glowing accents
* Skia-powered visual backgrounds

The UI should feel:

> **Premium + futuristic + soft + transparent + immersive**

It should NOT look like:

* Standard React Native cards
* Flat Material UI
* White iOS cards
* Solid colored containers
* Traditional dashboard UI
* Heavy blur panels
* Generic purple-gradient UI

---

# 2. ABSOLUTE RULES

These rules are mandatory.

## NEVER use white backgrounds

Do NOT use:

```tsx
backgroundColor: "#fff"
backgroundColor: "#FFFFFF"
backgroundColor: "white"
```

Do NOT use opaque white equivalents such as:

```tsx
backgroundColor: "rgba(255,255,255,1)"
backgroundColor: "rgba(255, 255, 255, 1)"
```

White may only be used for:

* Primary text
* Icons
* Small highlights
* Borders
* Glows

White must NOT be used as a large background surface.

---

# 3. NEVER Introduce BlurView

Do NOT use:

```tsx
BlurView
expo-blur
@react-native-community/blur
```

Do not add a blur dependency just to create glassmorphism.

The project previously experienced Android rendering issues with BlurView.

Glass effects must be achieved using:

* Transparency
* Skia
* Gradients
* Borders
* Shadows
* Layering
* Background visual effects

---

# 4. Use React Native Skia for Visual Backgrounds

Use:

```tsx
@shopify/react-native-skia
```

for visual background effects whenever appropriate.

Preferred primitives include:

```tsx
Canvas
Rect
Circle
Path
LinearGradient
RadialGradient
Group
```

Use Skia for:

* Ambient gradients
* Glows
* Decorative shapes
* Background lighting
* Glass reflections
* Floating particles
* Decorative blobs
* Map backgrounds
* Island/background visuals

Do not replace the application's visual background with a normal solid React Native `View`.

---

# 5. Glass Surface System

The default glass surface should be subtle and transparent.

Preferred:

```tsx
backgroundColor: "rgba(255,255,255,0.035)"
```

Possible stronger glass:

```tsx
backgroundColor: "rgba(255,255,255,0.055)"
```

For highlighted surfaces:

```tsx
backgroundColor: "rgba(255,255,255,0.075)"
```

Avoid opaque surfaces.

### Default glass border

Use:

```tsx
borderWidth: 1,
borderColor: "rgba(255,255,255,0.18)"
```

For stronger glass:

```tsx
borderColor: "rgba(255,255,255,0.28)"
```

For highlighted elements:

```tsx
borderColor: "rgba(255,255,255,0.42)"
```

Do not use thick borders.

---

# 6. Glass Hierarchy

Not every component should have the same opacity.

Use visual hierarchy.

### Level 1 — Background

Very transparent:

```tsx
rgba(255,255,255,0.02)
```

### Level 2 — Normal Glass

```tsx
rgba(255,255,255,0.035)
```

### Level 3 — Elevated Glass

```tsx
rgba(255,255,255,0.055)
```

### Level 4 — Active / Selected

```tsx
rgba(255,255,255,0.075)
```

### Level 5 — Highlight

Use a subtle gradient or border rather than making the whole surface opaque.

---

# 7. Glass Components

Create reusable glass components instead of repeating random styles.

Preferred architecture:

```tsx
<GlassCard>
  ...
</GlassCard>
```

```tsx
<GlassButton>
  ...
</GlassButton>
```

```tsx
<GlassSheet>
  ...
</GlassSheet>
```

```tsx
<GlassPill>
  ...
</GlassPill>
```

The visual language must remain consistent throughout the application.

---

# 8. Rounded Corners

Use rounded corners throughout the UI.

Preferred values:

```tsx
borderRadius: 16
```

```tsx
borderRadius: 20
```

```tsx
borderRadius: 24
```

Large floating sheets:

```tsx
borderRadius: 28
```

Pills:

```tsx
borderRadius: 999
```

Avoid excessive sharp rectangular containers.

---

# 9. Glass Buttons

Buttons should also follow the glass system.

Example:

```tsx
{
  backgroundColor: "rgba(255,255,255,0.055)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.22)",
  borderRadius: 18,
}
```

Primary buttons may use a subtle accent gradient.

Do not create buttons with:

```tsx
backgroundColor: "#FFFFFF"
```

or large opaque purple rectangles.

---

# 10. Text

Text should have clear hierarchy.

### Primary text

```tsx
color: "#FFFFFF"
```

### Secondary text

```tsx
color: "rgba(255,255,255,0.68)"
```

### Tertiary text

```tsx
color: "rgba(255,255,255,0.48)"
```

### Disabled text

```tsx
color: "rgba(255,255,255,0.30)"
```

Do not use pure black text on the glass UI.

---

# 11. Icons

Icons should visually belong to the glass environment.

Preferred:

```tsx
color: "#FFFFFF"
```

or:

```tsx
color: "rgba(255,255,255,0.75)"
```

Active icons may use the application's accent color.

Avoid placing icons inside large opaque colored squares.

---

# 12. Accent Colors

Accent colors should be used sparingly.

The application may use:

* Purple
* Violet
* Blue
* Cyan
* Pink
* Soft neon gradients

Accent colors should provide:

* Focus
* Progress
* Selection
* Achievement
* Interaction feedback

Do NOT make the entire UI purple.

The glass remains the primary visual language.

---

# 13. Background

The background is an important part of the UI.

Do not create a plain:

```tsx
backgroundColor: "#000000"
```

screen unless specifically required.

Prefer a layered background:

```text
Base dark background
        ↓
Ambient gradient
        ↓
Soft glow
        ↓
Decorative shapes
        ↓
Glass surfaces
        ↓
Content
```

The background should visually continue behind glass components.

---

# 14. Full-Screen Glass

When a screen contains a glass sheet, do not make it look like a small white/gray card floating in the middle.

Bad:

```text
┌──────────────────────┐
│                      │
│   CONTENT            │
│                      │
└──────────────────────┘
```

Preferred:

```text
┌──────────────────────────────────┐
│                                  │
│     Background visual             │
│                                  │
│   ┌──────────────────────────┐   │
│   │ transparent glass        │   │
│   │                          │   │
│   │        CONTENT           │   │
│   │                          │   │
│   └──────────────────────────┘   │
│                                  │
└──────────────────────────────────┘
```

For modal/sheet interfaces, glass should generally extend across the available width.

---

# 15. No White Rectangular Artifacts

Before completing UI work, check for:

* White rectangles
* White backgrounds
* Opaque cards
* Incorrect modal backgrounds
* Android rendering artifacts
* BlurView fallback surfaces
* Unexpected native component backgrounds

> [!CRITICAL]
> **Android Native Elevation Rule**: NEVER set `elevation` on translucent glass components (`rgba(...)` or transparent views). On Android, native elevation shadow canvas renders an opaque white rectangle behind non-opaque views, creating white rectangular box artifacts. Remove `elevation` from all translucent glass components.

If a white rectangle appears, fix the underlying component instead of covering it with another layer.

---

# 16. Shadows

Use subtle shadows.

Example:

```tsx
shadowColor: "#000",
shadowOpacity: 0.18,
shadowRadius: 12,
shadowOffset: {
  width: 0,
  height: 6,
},
elevation: 6,
```

Do not use extremely heavy shadows.

Glass should feel like it is floating, not like a traditional card.

---

# 17. Glow

Use glow sparingly.

Glow can be created using Skia gradients.

For example:

```tsx
<Circle>
  <RadialGradient
    c={...}
    r={...}
    colors={[
      "rgba(130,90,255,0.25)",
      "rgba(130,90,255,0.0)",
    ]}
  />
</Circle>
```

Glows should remain soft and diffuse.

---

# 18. Responsive Design

The UI must work across different screen sizes.

Do not hardcode layouts for only:

```text
390 × 844
```

That size may be used as a design reference, but the implementation must scale.

Use:

```tsx
useWindowDimensions()
```

when necessary.

Prefer:

* flex
* percentages
* calculated dimensions
* responsive spacing
* minimum/maximum constraints

Avoid unnecessary fixed widths.

---

# 19. Safe Areas

Screens must respect device safe areas.

Use:

```tsx
useSafeAreaInsets()
```

or the application's existing safe-area system.

Do not allow:

* Headers behind notches
* Bottom content behind navigation bars
* Buttons hidden below gesture areas

---

# 20. Existing Logic Must Not Change

When asked to redesign UI:

## ONLY change presentation.

Do NOT modify:

* API calls
* Business logic
* State management
* Zustand stores
* TanStack Query logic
* Navigation logic
* Authentication
* Database logic
* Question validation
* Lesson progression
* Answer submission
* Analytics
* API contracts
* Types unless required for the UI
* Existing callbacks

Example:

If the existing component contains:

```tsx
const handleAnswer = () => {
  ...
}
```

Do not rewrite its behavior.

Only change the UI around it.

---

# 21. Preserve Existing Props

When redesigning a component, preserve its existing public API.

Do not unnecessarily change:

```tsx
interface Props
```

Do not rename:

```tsx
onPress
onAnswer
question
options
selectedAnswer
isCorrect
```

unless explicitly requested.

---

# 22. Do Not Add Unnecessary Dependencies

Before installing a package, check whether the existing stack can solve the problem.

Do not add:

* BlurView
* New animation libraries
* New UI libraries
* New component libraries

just for visual styling.

Prefer the project's existing:

* React Native
* Reanimated
* Skia
* Expo
* existing icon library

---

# 23. Animation

Animations should be subtle and premium.

Use existing Reanimated infrastructure where possible.

Good animations:

* Fade
* Scale
* Slide
* Soft glow
* Floating
* Press feedback
* Progress animation

Avoid:

* Excessive bouncing
* Fast flashing
* Large rotations
* Distracting transitions

---

# 24. Interaction States

Every interactive glass component should have visual states.

### Default

```tsx
backgroundColor: "rgba(255,255,255,0.035)"
```

### Pressed

```tsx
backgroundColor: "rgba(255,255,255,0.075)"
```

### Selected

Use:

* stronger border
* subtle accent glow
* slightly stronger glass

### Disabled

Reduce:

* opacity
* glow
* contrast

---

# 25. Forms and Inputs

Inputs must also remain glass.

Do NOT use standard white inputs.

Preferred:

```tsx
backgroundColor: "rgba(255,255,255,0.035)",
borderWidth: 1,
borderColor: "rgba(255,255,255,0.18)",
borderRadius: 16,
color: "#FFFFFF",
```

Placeholder:

```tsx
color: "rgba(255,255,255,0.42)"
```

---

# 26. Bottom Sheets

Bottom sheets should feel like transparent glass layers.

Use:

* transparent background
* rounded top corners
* subtle border
* subtle shadow
* Skia/background visual visible behind the sheet

Do not use an opaque white bottom sheet.

---

# 27. Modals

Modals should preserve the application's background.

Preferred:

```text
Background
   ↓
Dark transparent overlay
   ↓
Glass modal
   ↓
Content
```

Do not replace the whole screen with white.

---

# 28. Cards

Cards should not all look identical.

Use depth through:

* opacity
* border intensity
* accent glow
* size
* elevation

Avoid:

```tsx
backgroundColor: "#222"
```

for every card.

Prefer translucent surfaces.

---

# 29. Lists

List items should feel integrated with the glass environment.

Avoid dozens of opaque cards stacked vertically.

Use:

* transparent rows
* subtle separators
* occasional elevated items
* selected glass states

---

# 30. Map / Lesson UI

For the learning map:

* Background must remain immersive.
* Islands/nodes should float above the background.
* Lesson nodes should use glass or accent treatment.
* Connections should remain subtle.
* Progress should be visually obvious.
* Avoid white rectangular containers behind islands.
* The map should remain scrollable.
* The layout must be responsive.

Do not put the entire map inside one opaque card.

---

# 31. Mascot

The application mascot should integrate naturally with the glass design.

The mascot should NOT be placed inside:

```tsx
backgroundColor: "#FFFFFF"
```

or an opaque card.

Preferred:

```text
Mascot
   +
soft glow
   +
transparent glass environment
```

The mascot should appear as part of the scene rather than as a standard image inside a card.

---

# 32. Component Styling Pattern

Prefer:

```tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },

  glass: {
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 20,
  },

  title: {
    color: "#FFFFFF",
  },

  subtitle: {
    color: "rgba(255,255,255,0.68)",
  },
});
```

---

# 33. Screen Structure

Preferred screen structure:

```tsx
<View style={styles.container}>
  <SkiaBackground />

  <SafeAreaView style={styles.content}>
    <Header />

    <Content />

    <GlassNavigation />
  </SafeAreaView>
</View>
```

The background should remain behind the complete UI.

---

# 34. Avoid Nested Opaque Containers

Bad:

```tsx
<View style={styles.whiteCard}>
  <View style={styles.grayCard}>
    <View style={styles.purpleCard}>
      ...
    </View>
  </View>
</View>
```

Preferred:

```tsx
<GlassCard>
  <Content />
</GlassCard>
```

Use layers only when they create meaningful visual depth.

---

# 35. Code Quality Rules

When modifying a component:

1. Read the entire component first.
2. Understand the existing state and logic.
3. Preserve existing functionality.
4. Modify only the presentation layer.
5. Keep TypeScript types valid.
6. Remove unused imports.
7. Avoid introducing new dependencies.
8. Ensure Android compatibility.
9. Ensure iOS compatibility.
10. Check responsive behavior.
11. Check for white backgrounds.
12. Check for accidental opaque surfaces.
13. Check for rendering artifacts.

---

# 36. Error Prevention

Pay special attention to React Native Skia.

Do not introduce invalid Skia properties.

Avoid unsupported properties on:

```tsx
Rect
RoundedRect
Circle
Path
Group
```

Do not use web-only CSS properties.

Do not assume browser CSS behavior works in React Native.

Do not use deprecated Skia APIs when an existing supported API is available.

---

# 37. Android Compatibility

Android is a first-class platform.

Before completing a UI change, verify:

* No BlurView dependency
* No white rendering artifacts
* No unsupported Skia properties
* No invalid native view properties
* No layout overflow
* No clipped text
* No invisible buttons
* No invisible icons

---

# 38. Visual Validation Checklist

Before considering a UI redesign complete, verify:

### Background

* [ ] No white background
* [ ] No opaque full-screen cards
* [ ] Background visual is visible

### Glass

* [ ] Transparent
* [ ] Subtle border
* [ ] Rounded corners
* [ ] Proper depth
* [ ] No heavy blur

### Content

* [ ] Text readable
* [ ] Icons visible
* [ ] Buttons visible
* [ ] Correct spacing
* [ ] Correct alignment

### Responsive

* [ ] Small phones
* [ ] Large phones
* [ ] Different aspect ratios
* [ ] Safe areas

### Android

* [ ] No white rectangles
* [ ] No BlurView issues
* [ ] No Skia runtime errors
* [ ] No clipped components

---

# 39. Most Important Rule

When the instruction says:

> "Redesign the UI"

interpret it as:

```text
KEEP:
    Logic
    State
    APIs
    Navigation
    Data
    Functionality
    Props
    Callbacks

CHANGE:
    Layout
    Colors
    Typography
    Borders
    Glass surfaces
    Spacing
    Shadows
    Gradients
    Animations
    Visual hierarchy
```

Do not rewrite application functionality just to change its appearance.

---

# 40. Design Goal

Every screen should feel like it belongs to the same application.

The final visual language should consistently communicate:

**Dark + Transparent + Glass + Soft Glow + Premium + Futuristic + Immersive**

The user should feel that the interface is floating above a living visual background rather than interacting with a collection of ordinary cards.

---

# 41. Profile Screen Glassmorphism Specification

The Profile screen (`app/(tabs)/profile.tsx`) features a high-fidelity responsive glassmorphism presentation aligned with the `LessonStartView` design system:

* **Color Palette & Glass Base**: Derived from `LessonStartView` (`COLORS.background` `#F5F2FF`, `COLORS.purple` `#6847F5`, `COLORS.text` `#111126`, `COLORS.textSecondary` `#626078`). Uses sleek translucent glass cards (`rgba(104,71,245,0.035)`) with top highlight edges (`rgba(255,255,255,0.70)`) and subtle glass borders (`rgba(104,71,245,0.16)`), avoiding heavy white opaque cards.
* **Android Elevation Safety**: Removes native `elevation` properties from all translucent glass components to prevent Android's native shadow engine from rendering solid white rectangular box artifacts behind translucent surfaces.
* **Automatic Responsive Sizing & Optimized Padding**: Dynamically adjusts font sizes, mascot dimensions, and stat card layouts using `useWindowDimensions()`. Controls horizontal padding to prevent double-padding margins and allow content to stretch elegantly across phone viewports.
* **Background Layer**: `@shopify/react-native-skia` Canvas rendering a linear background gradient (`#F5F2FF` to `#EEF9F7`) with floating lavender, cyan, and gold ambient lighting circles.
* **Profile Card**: Hero Mascot inside a floating circular glass ring with a soft glow background sphere, user details, edit glass button, calendar join date pill, and native-to-target language transition bar with a purple arrow badge.
* **Statistics Grid**: 2x2 grid of translucent glass stat cards (`rgba(104,71,245,0.04)`) with vibrant icon pods for Flame (Streak), Flash (XP), Shield (League), and Medal (Top 3).
* **Achievements Section**: Horizontal scrollable glass cards with unlocked checkmarks (`#16C58B`) and translucent progress bars.
* **Actions List**: Glass container with icon pods for Account, Switch Course, App Settings, Reset Progress (`#FF9600`), and Log Out (`#FF4B4B`), separated by subtle dividers.

---

# 42. Achievements Screen Glassmorphism Specification

The Achievements screen (`app/achievements.tsx`) uses the exact same responsive glassmorphism design system as the Profile screen:

* **Header Navigation**: Translucent glass back button (`rgba(104,71,245,0.06)`), high-contrast header title (`#111126`), and Skia background canvas.
* **Overview Stats Banner**: Glass card (`rgba(104,71,245,0.035)`) displaying 3 stats (Unlocked Count, XP Earned, Gems Earned) with icon pods for Trophy (Purple `#6847F5`), Flash (Orange `#FF9600`), and Diamond (Gold `#F7B718`), separated by glass dividers (`rgba(104,71,245,0.10)`).
* **Item Glass Cards**: Translucent glass cards for each achievement item with custom glowing category icon pods (Streak, XP, Lesson, Question, Goal, Medal), title, description, XP/Gem reward pills, progress track bar for locked items, and green checkmark badges (`#16C58B`) for unlocked items.
* **Android Elevation Safety**: Removes native `elevation` properties from all translucent glass components to prevent Android white rectangle artifacts.

---

# 43. Leaderboard Screen Glassmorphism Specification

The Leaderboard screen (`app/(tabs)/leaderboard.tsx`) adheres to the strict glassmorphism design system:

* **Background Layer**: Skia Canvas with ambient multi-colored linear background gradient (`#F5F2FF` to `#EEF9F7`) with floating lavender and cyan lighting circles behind the leaderboard FlatList.
* **Gamification & League Banner**: `GamificationBar` and translucent glass league card (`rgba(104,71,245,0.06)` background, `rgba(104,71,245,0.20)` border) featuring a purple league pill pod, high-contrast title (`#111126`), countdown timer (`Ends in ...`), and a floating trophy circle (`rgba(247,183,24,0.12)`).
* **Rank Glass Rows**: Translucent glass list items (`rgba(104,71,245,0.035)` background) with custom rank medals (🥇, 🥈, 🥉) or rank numbers, circular glass avatar pods (`rgba(104,71,245,0.08)`), and green glass XP pills (`rgba(22,197,139,0.10)`).
* **User Highlight Row**: Active user row is highlighted with a stronger glass surface (`rgba(104,71,245,0.08)`) and vibrant purple border (`rgba(104,71,245,0.30)`).
* **Android Elevation Safety**: Zero native `elevation` on translucent glass components to prevent Android white rectangle artifacts.

---

# 44. Shop Screen Glassmorphism Specification

The Shop screen (`app/(tabs)/shop.tsx`) follows the strict glassmorphism design system:

* **Header Navigation & Shop History**: High-contrast title (`#111126`), subtitle (`#626078`), and a translucent glass button navigating to `/shop-history` (`rgba(104,71,245,0.07)` background, `rgba(104,71,245,0.20)` border).
* **Balances Hero Banner**: Glass card (`rgba(104,71,245,0.035)`) presenting total Gems Available and Current Lives (`stats.lives/5`) with custom glowing icon pods (Diamond `#F7B718`, Heart `#FF4B4B`).
* **Shop Item Glass Cards**: Translucent glass cards for each power-up item with custom icon pods (Heart Refill `#FF4B4B`, Streak Freeze `#3DCDE2`, XP Boost `#F7B718`), title, description, and vibrant purple purchase button (`#6847F5`) displaying the gem price.
* **Android Elevation Safety**: Zero native `elevation` on translucent glass components to prevent Android white rectangle artifacts.

---

# 45. Practice Setup & AI Call Screen Glassmorphism Specification

The Practice experience is split into two dedicated screens adhering strictly to the shared glassmorphism design system matching `shop.tsx` and `profile.tsx`:

* **Architecture & Screen Decomposition**: `app/(tabs)/practice.tsx` serves strictly as the Practice Setup & Input view where users select scenarios, topics, goals, difficulty levels, and practice styles. Upon starting a session, it navigates cleanly via Expo Router (`router.push`) to `app/practice-call.tsx` which manages the live Stream AI video call session.
* **Color Palette & Glass Base**: Derived from `LessonStartView` / `ShopScreen` / `ProfileScreen` (`COLORS.background` `#F5F2FF`, `COLORS.purple` `#6847F5`, `COLORS.text` `#111126`, `COLORS.textSecondary` `#626078`). Uses sleek translucent glass cards (`rgba(104,71,245,0.035)`) with subtle top highlight edges (`rgba(255,255,255,0.70)`) and glass borders (`rgba(104,71,245,0.16)`).
* **Background Layer**: Both screens render a `@shopify/react-native-skia` Canvas with a linear background gradient (`["#F5F2FF", "#F0EDFF", "#F8F8FF", "#EEF9F7"]`) and floating radial ambient lighting circles (`rgba(111,82,245,0.14)`, `rgba(61,205,226,0.13)`, `rgba(112,87,245,0.10)`).
* **Preset Scenario Carousel**: Horizontal scrollable glass cards (`rgba(104,71,245,0.035)`) with category icon pods (Travel, Interview, Cafe, Casual, Doctor, Shopping) and selected glowing purple border highlights (`#6847F5`).
* **Interactive Glass Inputs**: Translucent text inputs (`rgba(104,71,245,0.035)` background, `rgba(104,71,245,0.16)` border) with leading Ionicons, active focus glow states (`rgba(104,71,245,0.08)` background, `#6847F5` border), and instant text reset buttons.
* **Difficulty & Style Grid**: Chips for Beginner, Intermediate, and Advanced with active glass fills, alongside a 2x2 grid of translucent style cards (Guided, Free Talk, Role-play, Q&A) featuring glowing icon pods.
* **Live AI Call Stage**: `app/practice-call.tsx` features a glass stage with floating topic badge, session timer badge, center stage Mascot with animated voice glow sphere, closed captions feed distinguishing AI Teacher vs User bubbles, and a push-to-talk mic button.
* **Android Elevation Safety**: Removes native `elevation` properties from all translucent glass components across both screens to prevent Android white rectangle box artifacts.

---


## FINAL RULE

If a proposed UI implementation conflicts with this document, follow this document unless the user explicitly tells you to override a specific rule.

**Glassmorphism is the default design system for the entire application.**

