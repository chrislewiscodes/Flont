# Flont
A full-featured Javascript library for creating interactive web font specimens.

Web designers can style up their own specimen layout, then plug in Flont to hook up 
form controls to modify various aspects of the specimen's typography. Flont's showcase
feature is an inline OpenType alternates selection popup interface to allow casual users to
create customized, swashy strings very easily.

Flont is still in development mode, so the code is not super organized or ready for
inclusion in public projects.

## Usage

### Ultra-simple mode:

```
FontTester('#specimen-element[data-webfont-url]')
```

Call with a single element object or CSS selector string, representing the font-specimen display element.
That element needs to have a `data-webfont-url` attribute on it containing the URL to a TTF, OTF, or WOFF font.
This will set that element up with popup glyph-alternates selectors when the user selects text.

### Flexible mode:

```
FontTester({
  sample: '#specimen-element', //required
  fontURL: 'https://mysite.com/fonts/webfont.woff', //either this or `data-webfont-url` attribute on sample element is required
  controls: {
      'size': '#font-size-input', //input that controls font size
      'leading': '#line-height-input', //input that controls line height
      'tracking': '#letter-spacing-input', //input that controls letter spacing
      'foreground': '#fgcolor-input', //input that controls foreground color
      'background': '#bgcolor-input', //input that controls background color,
      'features': '#feature-select', //an empty select or list element to be filled with toggleable OpenType features 
 })
```