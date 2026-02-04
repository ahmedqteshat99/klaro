

# Fix PDF Export Cropping and Spacing Issues

## Problem Analysis

After examining the code, I've identified the root causes of the PDF export issues:

### Issue 1: Photo Cropping (Half of photo cut off)
The PDF export creates a photo container with:
```html
<div style="float: right; width: 130px; height: 170px; overflow: hidden;">
  <img src="..." style="width: 130px; height: 170px; object-fit: cover;" />
</div>
```

The problem is that `html2canvas` has issues with:
- `float: right` combined with `overflow: hidden` in certain layouts
- The fixed height container may get clipped when converting to canvas
- The image loading timing - if the image isn't fully loaded when html2canvas captures, it renders partially

### Issue 2: Signature Cropping
The signature image uses:
```html
<img src="..." style="height: 36px; width: auto; display: inline-block;" />
```

Similar html2canvas rendering issues with:
- `display: inline-block` on images
- Image load timing

### Issue 3: Section Spacing Disappearing
The `<h2>` elements have `margin-top: 16px` and `margin-bottom: 8px` in CSS, but:
- html2canvas may collapse margins at page boundaries
- The `border-bottom` CSS property styling differs from inline styling

---

## Solution

### Fix 1: Photo Container - Wait for Image Load + Better Positioning

Replace `float: right` with absolute positioning which html2canvas handles better. Also explicitly wait for images to load before rendering.

**Current code (line 378-384):**
```javascript
if (showFoto && fotoUrl) {
  fullHtml += `
    <div style="float: right; margin-left: 16px; margin-bottom: 8px; width: 130px; height: 170px; overflow: hidden; border-radius: 2px; border: 1px solid #ddd;">
      <img src="${fotoUrl}" alt="Bewerbungsfoto" style="width: 130px; height: 170px; object-fit: cover;" crossorigin="anonymous" />
    </div>
  `;
}
```

**Fixed code:**
- Use a wrapper div with `position: relative` for the entire content
- Position photo with `position: absolute; top: 0; right: 0;` 
- Add padding-right to the content to prevent text overlap
- Wait for images to load before calling html2pdf

### Fix 2: Signature - Use Block Layout + Explicit Dimensions

**Current code (line 395-400):**
```javascript
fullHtml += `
  <div style="margin-top: 24px; text-align: right; clear: both; page-break-inside: avoid;">
    <img src="${signaturUrl}" alt="Unterschrift" style="height: 36px; width: auto; display: inline-block;" crossorigin="anonymous" />
    <p style="font-size: 9pt; color: #666; margin-top: 4px;">${stadt || 'Ort'}, ${currentDate}</p>
  </div>
`;
```

**Fixed code:**
- Use `display: block` and `margin-left: auto` for right alignment
- Add explicit width calculation (approximately 120px for typical signature)
- Add minimum height to prevent cropping

### Fix 3: Section Spacing - Use Padding Instead of Margins

Margins can collapse in html2canvas rendering. Use padding and explicit pixel values.

**Current CSS (line 296-307):**
```css
h2 {
  margin-top: 16px;
  margin-bottom: 8px;
  border-bottom: 1px solid #333;
  padding-bottom: 3px;
}
```

**Fixed CSS:**
- Add padding-top instead of margin-top
- Increase padding-bottom to ensure visible space after border

### Fix 4: Add Image Pre-loading

Before rendering, wait for all images to fully load:

```javascript
// Wait for images to load
const images = element.querySelectorAll('img');
await Promise.all(
  Array.from(images).map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = resolve; // Continue even if image fails
    });
  })
);
```

---

## File Changes

### File: `src/lib/export.ts`

#### Change 1: Update wrapper structure for photo positioning (lines 291-384)

```javascript
// Create wrapper with position relative for photo absolute positioning
let fullHtml = `
  <div style="font-family: 'Spectral', Georgia, serif; font-size: 10.5pt; font-weight: 300; line-height: 1.3; color: #1a1a1a; padding: 20px; position: relative; min-height: 100%;">
    <style>
      /* Section headers */
      h2 {
        font-weight: 600 !important;
        font-size: 11pt;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-top: 0;
        padding-top: 14px;
        margin-bottom: 0;
        padding-bottom: 10px;
        border-bottom: 1px solid #333;
        page-break-after: avoid;
        break-after: avoid;
      }
      /* ... rest of styles ... */
    </style>
`;

// Add photo with absolute positioning (more reliable for html2canvas)
if (showFoto && fotoUrl) {
  fullHtml += `
    <div style="position: absolute; top: 20px; right: 20px; width: 130px; height: 170px; border-radius: 2px; border: 1px solid #ddd; background: #fff;">
      <img src="${fotoUrl}" alt="Bewerbungsfoto" style="width: 130px; height: 170px; object-fit: cover; display: block;" crossorigin="anonymous" />
    </div>
  `;
  // Add padding to content area to prevent overlap with photo
  fullHtml += `<div style="padding-right: 150px;">`;
}

fullHtml += htmlContent;

if (showFoto && fotoUrl) {
  fullHtml += `</div>`; // Close padding wrapper
}
```

#### Change 2: Fix signature rendering (lines 388-401)

```javascript
if (showSignatur && signaturUrl) {
  const currentDate = new Date().toLocaleDateString('de-DE', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
  fullHtml += `
    <div style="margin-top: 30px; clear: both; page-break-inside: avoid; text-align: right;">
      <img src="${signaturUrl}" alt="Unterschrift" style="height: 45px; width: auto; display: block; margin-left: auto;" crossorigin="anonymous" />
      <p style="font-size: 9pt; color: #666; margin-top: 6px; margin-bottom: 0;">${stadt || 'Ort'}, ${currentDate}</p>
    </div>
  `;
}
```

#### Change 3: Add image preloading before PDF generation (after line 412)

```javascript
document.body.appendChild(element);

// Wait for all images to fully load before rendering
const images = element.querySelectorAll('img');
await Promise.all(
  Array.from(images).map(img => {
    if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve; // Continue even if image fails
      // Timeout fallback
      setTimeout(resolve, 3000);
    });
  })
);

// Additional wait for layout to stabilize
await new Promise(resolve => setTimeout(resolve, 200));
```

---

## Summary of Changes

| Issue | Cause | Fix |
|-------|-------|-----|
| Photo cropped | `float: right` + `overflow: hidden` | Use `position: absolute` with content padding |
| Signature cropped | `inline-block` display + height constraint | Use `display: block` + `margin-left: auto` |
| Spacing lost after headers | Margin collapsing in html2canvas | Use padding instead of margins |
| General rendering issues | Images not loaded before capture | Add explicit image preloading with Promise.all |

---

## Expected Results

After these changes:
- Profile photo will render fully at 130×170px in top-right corner
- Signature will render completely with location and date
- Section headers will have consistent spacing before and after
- PDF output will match the preview layout

