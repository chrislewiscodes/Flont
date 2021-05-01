# Flont
A Javascript library for creating interactive web font specimens. Demo: https://flont.chrislewis.codes/

Web designers can style up their own specimen layout, then plug in Flont to hook up 
form controls to modify various aspects of the specimen's typography. Flont's showcase
feature is an inline OpenType alternates selection popup interface to allow casual users to
create customized, swashy strings very easily.

Flont is still in development mode, so the code is not super organized or ready for
inclusion in public projects.

## Usage

### Simple mode:

```
Flont('#specimen-element')
```

Call with a single element object or CSS selector string, representing the font-specimen display element.
This will set that element up with popup glyph-alternates selection UI when the user selects text.

### Flexible mode:

```
Flont({
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

Flont was written by [Chris Lewis](https://chrislewis.codes/). Thanks to 
[Laura Worthington Design](https://lauraworthingtondesign.com/news/article/the-type-tester)
for partially financing the development of Flont.
