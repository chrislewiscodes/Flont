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
  controls: { //optional form controls you can hook up to change aspects of the specimen
      'font': '#font-select', //a select element, to change the displayed font
      'size': '#font-size-input', //input that controls font size
      'leading': '#line-height-input', //input that controls line height
      'tracking': '#letter-spacing-input', //input that controls letter spacing
      'foreground': '#fgcolor-input', //input that controls foreground color
      'background': '#bgcolor-input', //input that controls background color,
      'features': '#feature-select', //an empty select or list element to be filled with toggleable OpenType features
  },
  highlightColor: '#beefed', //optional CSS color to be used for highlights in the UI, e.g. "current glyph" callout
 })
```

## About the project

Flont was written by [Chris Lewis](https://chrislewis.codes/), based on work done originally for
[Laura Worthington Design](https://lauraworthingtondesign.com/news/article/the-type-tester).
Many thanks to Laura for essentially financing the development of this tool, and for agreeing to
release it to the public!

The [Flont demo site](https://flont.chrislewis.codes/) was designed by [Nick Sherman](https://nicksherman.com/)
of [Hex Projects](https://hex.xyz/).
