# Design System

## Theme: 게이밍 & 다이나믹
LoL 테마 기반 - 다크 배경 + 골드/퍼플 액센트

## Color Palette

### Background
- Main: `bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900`
- Card: `bg-slate-800/30` (반투명)
- Border: `border-slate-700/50`

### Text
- Primary: `text-slate-200`
- Secondary: `text-slate-300`
- Tertiary: `text-slate-400`
- Muted: `text-slate-500`

### Accent
- Primary (Gold): `amber-400`, `amber-500`
- Secondary (Purple): `purple-500`
- Tertiary (Blue): `blue-500`

### Gradients
- Title: `from-amber-200 via-amber-400 to-amber-200`
- Button: `from-amber-500 via-amber-400 to-amber-500`
- Hover: `from-amber-500/5 to-purple-500/5`

## Typography
- H1: `text-6xl sm:text-7xl md:text-8xl font-black`
- H2: `text-4xl sm:text-5xl font-bold`
- H3: `text-xl font-bold`
- Large: `text-xl sm:text-2xl font-medium`
- Medium: `text-base sm:text-lg`
- Small: `text-sm`

## Component Examples

### Primary Button
```tsx
<button className="
  rounded-full
  bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500
  px-12 py-5
  text-xl font-bold text-slate-900
  shadow-2xl shadow-amber-500/50
  hover:shadow-amber-500/80
  transition-all duration-300
">
```

### Card
```tsx
<div className="
  rounded-2xl
  border border-slate-700/50
  bg-slate-800/30
  p-6
  backdrop-blur-sm
  hover:border-amber-500/50
  transition-all duration-300
">
```

### Input
```tsx
<input className="
  rounded-lg
  border border-slate-700
  bg-slate-800/50
  px-4 py-3
  text-slate-200
  placeholder:text-slate-500
  focus:border-amber-500
  focus:ring-2 focus:ring-amber-500/20
  outline-none
">
```

## Framer Motion Animations
```tsx
// 페이드인
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.8 }}

// 호버
whileHover={{ scale: 1.05 }}
whileTap={{ scale: 0.95 }}
```
