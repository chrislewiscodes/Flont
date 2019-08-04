(function() {
"use strict";

/*
 * Ultra-simple usage:
 *
 * Flont('#specimen-element') 
 * 
 * Call with a single HTMLElement object or CSS selector string, representing the font-specimen display element.
 * That element needs to have a `data-webfont-url` attribute on it containing the URL to a TTF, OTF, or WOFF font.
 * This will set that element up with popup glyph-alternates selectors when the user selects text.
 *
 * Flexible usage:
 *
 * Flont({
     sample: '#specimen-element', //required
     controls: {
         'size': '#font-size-input', //input that controls font size
         'leading': '#line-height-input', //input that controls line height. Value: multiple of size. Typical range: 0.8 to 2.0
         'tracking': '#letter-spacing-input', //input that controls letter spacing. Value: ‰ of size. Typical range: -100 to 100
         'foreground': '#fgcolor-input', //input that controls foreground color. Value: any valid CSS color format
         'background': '#bgcolor-input', //input that controls background color. Value: any valid CSS color format
         'alignment': '#tester [name=alignment]', //either a select or set of radio buttons that contain left/center/right options
         'features': '#feature-select', //an empty select or list element to be filled with toggleable OpenType features 
    })
 *
 */


window.Flont = function(options) {

    var dependencies = {
        'opentype': 'https://cdn.jsdelivr.net/npm/opentype.js@latest/dist/opentype.min.js'
    };

    var allAlternates = {};
    var otFeatures = {
        'abvf': "Above-base Forms",
        'abvm': "Above-base Mark Positioning",
        'abvs': "Above-base Substitutions",
        'afrc': "Alternative Fractions",
        'blwf': "Below-base Forms",
        'blwm': "Below-base Mark Positioning",
        'blws': "Below-base Substitutions",
        'calt': "Contextual Alternates",
        'case': "Case-Sensitive Forms",
        'clig': "Contextual Ligatures",
        'cpsp': "Capital Spacing",
        'cswh': "Contextual Swash",
        'curs': "Cursive Positioning",
        'c2pc': "Petite Capitals From Capitals",
        'c2sc': "Small Capitals From Capitals",
        'dlig': "Discretionary Ligatures",
        'expt': "Expert Forms",
        'falt': "Final Glyph on Line Alternates",
        'fin2': "Terminal Forms #2",
        'fin3': "Terminal Forms #3",
        'fina': "Terminal Forms",
        'frac': "Fractions",
        'hist': "Historical Forms",
        'hlig': "Historical Ligatures",
        'init': "Initial Forms",
        'isol': "Isolated Forms",
        'ital': "Italics",
        'jalt': "Justification Alternates",
        'kern': "Kerning",
        'liga': "Standard Ligatures",
        'lnum': "Lining Figures",
        'mark': "Mark Positioning",
        'med2': "Medial Forms #2",
        'medi': "Medial Forms",
        'mgrk': "Mathematical Greek",
        'mkmk': "Mark to Mark Positioning",
        'mset': "Mark Positioning via Substitution",
        'nalt': "Alternate Annotation Forms",
        'onum': "Oldstyle Figures",
        'ordn': "Ordinals",
        'ornm': "Ornaments",
        'pcap': "Petite Capitals",
        'pnum': "Proportional Figures",
        'rclt': "Required Contextual Alternates",
        'rlig': "Required Ligatures",
        'rvrn': "Required Variation Alternates",
        'salt': "Stylistic Alternates",
        'sinf': "Scientific Inferiors",
        'size': "Optical size",
        'smcp': "Small Caps",
        'subs': "Subscript",
        'sups': "Superscript",
        'swsh': "Swash",
        'titl': "Titling",
        'tnum': "Tabular Figures",
        'unic': "Unicase",
        'zero': "Slashed Zero"
    };

    //initialize!
    setupPolyfills();

    //make sure we have everything we need
    sanitizeOptions();

    //do all the stuff that needs to happen for a new font
    onFontChange();

    //link up controls to sample
    setupControls();

    //set up the sample element for glyph-alternate replacement
    setupGlyphSelector();

    //and that's it! 

    //everything after this is just function definitions

    function windowScrollTop() {
        return Math.max(document.documentElement.scrollTop, document.body.scrollTop);
    }

    function verifyDependencies(callback) {
        var toLoad = Object.keys(dependencies).length;
        Object.forEach(dependencies, function(url, name) {
            var script;
            if (name in window) {
                --toLoad;
            } else {
                script = document.createElement('script');
                script.src = url;
                script.addEventListener('load', function() {
                    --toLoad;
                    if (toLoad <= 0 && callback) {
                        callback();
                    }
                });
                document.head.appendChild(script);
            }
            if (toLoad <= 0 && callback) {
                callback();
            }
        });
    }

    function sanitizeOptions() {
        function optionError(opt, msg) {
            throw "Flont: Invalid options" + (opt ? ': ' + opt : '') + (msg ? ' ' + msg : '');
        }

        function getElement(el) {
            function isMultiple(first) {
                return first && first.tagName === 'INPUT' && (first.type === 'radio' || first.type === 'checkbox');
            }
            if (typeof el === 'string') {
                return isMultiple(document.querySelector(el)) ? document.querySelectorAll(el) : document.querySelector(el);
            } else if (el instanceof HTMLElement) {
                return isMultiple(el) ? [el] : el;
            } else if (el instanceof HTMLCollection) {
                if (el.length == 0) {
                    return null;
                }
                return isMultiple(el[0]) ? el : el[0];
            }
            return null;
        }

        var temp;

        //if they passed in a plain element, treat it as the sample
        if (temp = getElement(options)) {
            options = {'sample': temp};
        }

        if (typeof options !== 'object') {
            optionError('options', 'must be element or object');
        }

        //sanity check on inputs
        options.sample = getElement(options.sample);
        if (!options.sample) {
            optionError('sample', 'must be element or CSS selector');
        }

        //linking up controls is optional
        if (!options.controls) {
            options.controls = {};
        }

        Object.forEach(options.controls, function(v, k) {
            options.controls[k] = getElement(v);
        });

        var highlight = options.highlightColor || options['highlight-color'];
        if (highlight) {
            var temp = document.createElement('style');
            temp.textContent = "#flont-popup li.selected { background: " + highlight + "; }";
            document.head.appendChild(temp);
        }
    }

    function smoothScroll(y, el) {
        (el || window).scrollTo({'left': 0, 'top': y, 'behavior': 'smooth'});
    }


    // return the first value from a CSS font-family list
    function getPrimaryFontFamily(families) {
        if (families instanceof HTMLElement) {
            families = getComputedStyle(families).fontFamily;
        }
        return families.split(",")[0].trim().replace(/["']/g, '');
    }


    function closeGAP(result) {
        var gap = document.getElementById('flont-popup');
        if (gap) {
            gap.parentNode.removeChild(gap);
        }
        return result;
    }

    //figure out the webfont URL for the sample font
    function getWebfontURL() {
        //go through CSS stylesheets and pull out all the font-family to url mappings
        var name2url = {};
        var s, sl, sheet;
        var r, rl, css, fam, urls;
        var chosen;
        for (s=0, sl=document.styleSheets.length; s < sl; s++) {
            sheet = document.styleSheets[s];
            for (r=0, rl=sheet.cssRules.length; r < rl; r++) {
                if (sheet.cssRules[r] instanceof CSSFontFaceRule) {
                    css = sheet.cssRules[r].cssText;
                    fam = css.match(/font-family\s*:\s*['"]?([^'",;]+)/);
                    urls = css.match(/url\([^\)]+\)(?:\s+format\([^\)]+\))?/g);
                    if (fam && urls) {
                        chosen = null;
                        urls.forEach(function(url) {
                            if (chosen) {
                                return;
                            }
                            var m = url.match(/url\(\s*['"]?([^'"\)]+)['"]?\s*\)(?:\s+format\(['"]?([^\s'"\)]+))?/);
                            if (m[2]) {
                                if (m[2] === 'woff' || m[2] === 'truetype' || m[2] === 'opentype') {
                                    chosen = m[1];
                                }
                            } else if (m[1].match(/(woff|ttf|otf)$/)) {
                                chosen = m[1];
                            }
                        });
                        if (chosen) {
                            name2url[fam[1].trim()] = chosen;
                        }
                    }
                }
            }
        }

        var found = false;
        getComputedStyle(options.sample).fontFamily.split(',').forEach(function(fontname) {
            if (found) {
                return;
            }
            fontname = fontname.trim().replace(/^['"]/, '').replace(/['"]$/, '').trim();
            if (fontname in name2url) {
                found = options.fontURL = name2url[fontname];
            }
        });
        return found;
    }

    //populate features dropdown
    function populateFeatures(font) {
        var select = options.controls.features;

        //no need to do this if there is no features control
        if (!select || !select.tagName || !select.tagName.match(/UL|OL|SELECT/)) {
            return;
        }

        select.textContent = "";

        //styleset matcher
        var ssre = /ss\d\d/;

        //features to be enabled by default
        var defaults = /liga|calt|r.../; //"r" features usually mean "required" and probably can't be disabled

        var seen = {};

        if (!font.tables.gsub || !font.tables.gsub.features) {
            //there ain't no features
            return;
        }

        font.tables.gsub.features.forEach(function(table) {
            if (table.tag in seen) return; //sometimes see weird duplicates
            if (!(table.tag in otFeatures)) return;
            //if (ssre.test(table.tag)) return;
            if (select.tagName === 'SELECT') {
                var option = document.createElement('option');
                option.value = table.tag;
                option.textContent = otFeatures[table.tag];
                option.selected = defaults.test(table.tag);
                select.appendChild(option);
            } else {
                var rando = "input-" + Date.now().toString() + '-' + Math.random().toString().substr(2);
                var item = document.createElement('li');
                var input = document.createElement('input');
                var label = document.createElement('label');
                input.type = 'checkbox';
                input.checked = defaults.test(table.tag);
                input.value = table.tag;
                input.id = rando;
                label.textContent = otFeatures[table.tag];
                label.setAttribute('for', rando);
                item.appendChild(input);
                item.appendChild(label);
                select.appendChild(item);
            }
            seen[table.tag] = true;
        });

        select.trigger('change');
    }

    function populateAlternates(callback) {
        var fontURL = getWebfontURL();
        if (!fontURL) {
            console.log("Couldn't find valid webfont URL in CSS @font-face rules.");
            return;
        }

        allAlternates[options.fontURL] = {};

        window.opentype.load(options.fontURL, function(err, font) {
            if (err) {
                console.log("ERROR LOADING " + options.fontURL + ': ' + err);
                return;
            }

            window.font = font;

            populateFeatures(font);

            //populate glyph alternates
            var gsub = font.tables.gsub;

            if (!gsub) {
                return;
            }

            var reversecmap = {};
            Object.forEach(font.tables.cmap.glyphIndexMap, function(g, u) {
                reversecmap[g] = String.fromCharCode(u);
            });
            function addAlt(fromText, toGlyphID, feature) {
                var toGlyph = font.glyphs.glyphs[toGlyphID];
                if (!toGlyph) {
                    console.log('ERROR: "' + fromText + '" + ' + feature + ' results in nonexistent glyph ' + toGlyphID + '.');
                    return;
                }
                try {
                    var metrics = toGlyph.getMetrics();
                    if (!(fromText in allAlternates[options.fontURL])) {
                        allAlternates[options.fontURL][fromText] = {};
                    }
                    if (!(toGlyph.index in allAlternates[options.fontURL][fromText])) {
                        allAlternates[options.fontURL][fromText][toGlyph.index] = {
                            'feature': feature,
                                'unicode': reversecmap[toGlyph.index],
                            'left': metrics.leftSideBearing / font.unitsPerEm,
                            'right': metrics.rightSideBearing / font.unitsPerEm
                        };
                    }
                } catch (e) {
                    console.log(e);
                }
            }

            var unhandled = {};
            gsub.features.forEach(function(f) {
                var tag = f.tag;
                var feature = f.feature;
                feature.lookupListIndexes.forEach(function(lli) {
                    var lookup = gsub.lookups[lli];
                    lookup.subtables.forEach(function(subtable) {
                        //console.log(tag, lli, subtable);
                        if ('coverage' in subtable && 'substitute' in subtable) {
                            if ('glyphs' in subtable.coverage) {
                                subtable.coverage.glyphs.forEach(function(fromglyph, i) {
                                    addAlt(reversecmap[fromglyph], subtable.substitute[i], tag);
                                });
                            } else if ('ranges' in subtable.coverage) {
                                var i = 0;
                                subtable.coverage.ranges.forEach(function(range) {
                                    for (var fromglyph=range.start; fromglyph<=range.end; fromglyph++) {
                                        addAlt(reversecmap[fromglyph], subtable.substitute[i++], tag);
                                    }
                                });
                            }
                        } else if ('coverage' in subtable && 'deltaGlyphId' in subtable) {
                            if ('glyphs' in subtable.coverage) {
                                subtable.coverage.glyphs.forEach(function(fromglyph) {
                                    addAlt(reversecmap[fromglyph], fromglyph + subtable.deltaGlyphId, tag);
                                });
                            } else if ('ranges' in subtable.coverage) {
                                var i = 0;
                                subtable.coverage.ranges.forEach(function(range) {
                                    for (var fromglyph=range.start; fromglyph<=range.end; fromglyph++) {
                                        addAlt(reversecmap[fromglyph], fromglyph + subtable.deltaGlyphId, tag);
                                    }
                                });
                            }
                        } /* else if ('backtrackCoverage' in subtable) {
                            //as far as I can tell, these are all covered in regular alternates above
                            function asdf(arr) {
                                var r = [];
                                for (var i in arr) {
                                    if (!arr[i].glyphs) continue;
                                    for (var j in arr[i].glyphs) {
                                        r.push(reversecmap[arr[i].glyphs[j]]);
                                    }
                                }
                                return r;
                            }
                            console.log(tag, subtable);
                            console.log(asdf(subtable.backtrackCoverage), asdf(subtable.inputCoverage), asdf(subtable.lookaheadCoverage));
                        }
                        */ else if ('coverage' in subtable && 'ligatureSets' in subtable) {
                            var firsts = [];
                            if ('glyphs' in subtable.coverage) {
                                subtable.coverage.glyphs.forEach(function(glyph) {
                                    firsts.push(reversecmap[glyph]);
                                });
                            } else if ('ranges' in subtable.coverage) {
                                subtable.coverage.ranges.forEach(function(range) {
                                    for (var fromglyph=range.start; fromglyph<=range.end; fromglyph++) {
                                        firsts.push(reversecmap[fromglyph]);
                                    }
                                });
                            }
                            var ligs = [];
                            subtable.ligatureSets.forEach(function(ligsetset, i) {
                                ligsetset.forEach(function(ligset, j) {
                                    var lig = firsts[i];
                                    ligset.components.forEach(function(component) {
                                        lig += reversecmap[component];
                                    });
                                    addAlt(lig, ligset.ligGlyph, tag);
                                    ligs.push(lig);
                                });
                            });
                        } else {
                            if (!(tag in unhandled)) {
                                unhandled[tag] = 0;
                            }
                            unhandled[tag] += 1;
    //                         console.log('Unhandled OT feature:', tag, subtable);
                        }
                    });
                });
            });

            if (Object.keys(unhandled).length) {
                console.log("Unhandled features: ", unhandled);
            }

            if (callback) {
                callback(font);
            }
        });
    }

    function onFontChange() {
        verifyDependencies(populateAlternates);
        resetSample();
    }

    //when changing fonts or other major styling, reset the sample to plain text 
    function resetSample() {
        //some programs put <style> elements in pasted HTML!
        options.sample.querySelectorAll('style').forEach(function(el) {
            el.parentNode.removeChild(el);
        });

        //replace custom chars with plain text
        options.sample.querySelectorAll('span[data-letter]').forEach(function(span) {
            var letter = span.getAttribute('data-letter');
            if (letter !== 'undefined') {
                span.textContent = letter;
            }
        });

        //and remove all the vestigial spans
        options.sample.textContent = options.sample.textContent.trim();
    }

    function setupControls() {
        if (options.controls.features) {
            options.controls.features.addEventListener('change', function(evt) {
                var ffs = [];
                options.controls.features.querySelectorAll(':checked').forEach(function(input) {
                    ffs.push('"' + input.value + '" 1');
                });
                options.sample.style.fontFeatureSettings = ffs.join(", ");
            });
        }

        var input2css = {
            'font': 'fontFamily',
            'size': 'fontSize',
            'fontSize': 'fontSize',
            'font-size': 'fontSize',
            'leading': 'lineHeight',
            'line-height': 'lineHeight',
            'lineHeight': 'lineHeight',
            'tracking': 'letterSpacing',
            'letter-spacing': 'letterSpacing',
            'letterSpacing': 'letterSpacing',
            'foreground': 'color',
            'fgcolor': 'color',
            'color': 'color',
            'background': 'background',
            'bgcolor': 'background',
            'alignment': 'text-align'
        };

        // from inputs to specimen
        function onControlChange(evt) {
            var input = evt.target;
            var cssrule = input.getAttribute('data-css-rule');
            var actualValues = getComputedStyle(options.sample);
            var em = parseFloat(actualValues.fontSize);

            if (!cssrule) {
                return;
            }

            switch (cssrule) {
            //change font
            case 'fontFamily':
                options.sample.style[cssrule] = input.tagName === 'select' ? input.querySelector('option:checked').value : input.value;
                onFontChange();
                break;
            //pixels
            case 'fontSize':
                options.sample.style[cssrule] = input.value + 'px';
                break;
            //per mille em
            case 'letterSpacing':
                options.sample.style[cssrule] = (parseFloat(input.value) / 1000) + 'em';
                break;
            //just use literal value
            default:
                options.sample.style[cssrule] = input.value;
                break;
            }
        }

        //convert input value ranges to standard units, and hook up change events
        Object.forEach(input2css, function(cssrule, name) {
            var inputs = options.controls[name];

            if (!inputs) {
                return;
            }

            var actualValues = getComputedStyle(options.sample);
            var em = parseFloat(actualValues.fontSize);
            var actualValue = parseFloat(actualValues[cssrule]);

            if (inputs instanceof HTMLElement) {
                inputs = [inputs];
            }

            inputs.forEach(function(input) {
                switch (cssrule) {
                case 'fontFamily':
                    actualValue = getPrimaryFontFamily(actualValues[cssrule]);
                    break;
                case 'lineHeight':
                    if (input.max > 3) {
                        //make sure inputs are in em multiples
                        input.min /= em;
                        input.max /= em;
                    }
                    //convert pixels to em multiple
                    actualValue /= em;
                    break;
                case 'letterSpacing':
                    if (Math.abs(input.min) <= 1 && Math.abs(input.max <= 1)) {
                        //assume em, convert to per mille
                        input.min *= 1000;
                        input.max *= 1000;
                    }
                    if (isNaN(actualValue)) {
                        actualValue = 0;
                    }
    
                    //actualValue will be in px, convert to per mille em
                    actualValue = 1000 * actualValue / em;
                    break;
                case 'color': case 'background':
                    if (input.type === 'color') {
                        //color inputs *only* accept #RRGGBB values,
                        //while computed value is rgba(r, g, b, a), so we need to convert!
                        try {
                            var rgba = actualValues[cssrule].match(/rgba?\((.+?)\)/)[1].split(/,\s*/);
                            if (rgba) {
                                if (rgba.length >= 4 && rgba[3] == 0) {
                                    actualValue = '#ffffff';
                                } else {
                                    var r = parseInt(rgba[0]).toString(16);
                                    var g = parseInt(rgba[1]).toString(16);
                                    var b = parseInt(rgba[2]).toString(16);
                                    if (r.length === 1) {
                                        r = '0' + r;
                                    }
                                    if (g.length === 1) {
                                        g = '0' + g;
                                    }
                                    if (b.length === 1) {
                                        b = '0' + b;
                                    }
                                    actualValue = '#' + r + g + b;
                                }
                            }
                        } catch (e) {
                            console.log("Error handling " + cssrule + ": " + e.toString());
                            actualValue = cssrule === 'background' ? '#ffffff' : '#000000';
                        }
                    }
                    break;
                }
                //update input to match specimen
                input.setAttribute('data-css-rule', cssrule);
                input.addEventListener('change', onControlChange);
                input.addEventListener('input', onControlChange);
    
                if (input.tagName === 'SELECT') {
                    var opt = input.querySelector('option[value="' + actualValue + '"]');
                    if (opt) {
                        opt.selected = true;
                    }
                } else if ('checked' in input) {
                    if (input.value == actualValue) {
                        input.checked = true;
                    }
                } else {
                    input.value = actualValue;
                }
                //input.trigger('change');
            });
        });
    }

    function setupGlyphSelector() {
        var pua2letter = {};

        options.sample.addEventListener('paste', function(evt) {
            //hide it to avoid FOIST (flash of inappropriately-styled text)
            options.sample.style.opacity = '0';

            //event fires before the content is actually inserted, so delay reset for a sec
            setTimeout(function() {
                resetSample();
                options.sample.style.opacity = '';
            }, 10);
        });    

        //clone the selection object so that it can persist after the selection changes
        // and also ensure that the anchor is before the focus
        function cloneSelection() {
            var selection = window.getSelection();

            var backward = selection.isCollapsed
                || (selection.anchorNode === selection.focusNode && selection.anchorOffset > selection.focusOffset)
                || (selection.anchorNode.compareDocumentPosition(selection.focusNode) & Node.DOCUMENT_POSITION_PRECEDING);

            return {
                'anchorNode': backward ? selection.focusNode : selection.anchorNode,
                'anchorOffset': backward ? selection.focusOffset : selection.anchorOffset,
                'focusNode': backward ? selection.anchorNode : selection.focusNode,
                'focusOffset': backward ? selection.anchorOffset : selection.focusOffset,
                'text': selection.toString(),
                'rectangle': selection.isCollapsed ? null : selection.getRangeAt(0).getBoundingClientRect(),
                'toString': function() { return this.text; }
            };
        }

        //find the relevant "parent" of selected text.
        // if an alternate has already been selected, will return the parent span
        // otherwise the text node the selection is part of
        function nodeOrSpan(node) {
            if (node.parentNode.tagName === 'SPAN') {
                if (node.parentNode.textContent === node.textContent || node.parentNode.hasAttribute('data-letter')) {
                    return node.parentNode;
                }
            }
            return node;
        }

        var previousSelection;
        function didSelectionReallyChange() {
            if (!previousSelection) {
                return true;
            }
            var selection = cloneSelection();
            return !(
                previousSelection.anchorNode === selection.anchorNode
                && previousSelection.anchorOffset === selection.anchorOffset
                && previousSelection.focusNode === selection.focusNode
                && previousSelection.focusOffset === selection.focusOffset
            );
        }

        window.Flont.ignoreSelectionChange = false;
        function onSelectionChange(evt) {
            if (window.Flont.ignoreSelectionChange) {
                return true;
            }

            //see if we're still part of the document
            if (!document.body.contains(options.sample)) {
                window.Flont.ignoreSelectionChange = true;
                return;
            }

            //ignore mouse events with secondary buttons
            if ('button' in evt && evt.button > 0) {
                return;
            }

            var gap = document.getElementById('flont-popup');

            var selection = cloneSelection();
            var selectedText = selection.toString().trim();

            var isOpen = gap !== null;
            var inPopup = isOpen && (evt.target === gap || gap.contains(evt.target));
            var inSample = options.sample.contains(selection.anchorNode) && options.sample.contains(selection.focusNode);

            //console.log(evt, isOpen, inPopup, inSample);

            //always close on close button
            if (inPopup && evt.target.closest('.close')) {
                return closeGAP();
            }

            //clicking inside the popup shouldn't close the popup
            if (inPopup) {
                return true;
            }

            //don't open the popup for random selections!
            if (evt.type === 'selectionchange' && !isOpen && !inSample) {
                return;
            }

            //no selection, no popup
            if (selection.isCollapsed || !selectedText.length) {
                previousSelection = selection;
                return closeGAP(true);
            }

            //not even going to deal with crossing elements yet
            if (selection.anchorNode !== selection.focusNode) {
                return closeGAP();
            }

            //close on click outside
            if (evt.type !== 'selectionchange' && !inPopup && !inSample) {
                return closeGAP();
            }

            //ignore events if selection hasn't changed
            if (!didSelectionReallyChange()) {
                return;
            }


            previousSelection = selection;


            //see if we have already applied a feature to this selection
            var selectedSpan, parent = selection.anchorNode.parentNode;
            if (parent.tagName === 'SPAN' && (parent.hasAttribute('data-letter') || parent.textContent === selectedText)) {
                selectedSpan = selection.anchorNode.parentNode;
            }

            //convert PUA unicodes back into their original letters
            if (selectedText in pua2letter) {
                selectedText = pua2letter[selectedText];
            } else if (selectedSpan && selectedSpan.hasAttribute('data-letter')) {
                selectedText = selectedSpan.getAttribute('data-letter');
            }

            //now we can get to work!
            var hasAlts = false, allAlts = {};

            //if you only want to match exact string...
            if (options.fontURL in allAlternates && selectedText in allAlternates[options.fontURL]) {
                allAlts = allAlternates[options.fontURL][selectedText];
                hasAlts = true;
            }

            if (hasAlts) {
                var wrapper = document.createElement('div');
                wrapper.id = 'flont-popup';
                wrapper.className = 'popup shadow';

                var pointer = document.createElement('aside');
                wrapper.appendChild(pointer);

                var alternates = document.createElement('ul');
                alternates.style.fontFamily = getComputedStyle(options.sample).fontFamily;

                wrapper.appendChild(alternates);

                var alreadySelected = selectedSpan && parseInt(selectedSpan.getAttribute('data-index'));
                var i = 0;
                var nothingSpecial = document.createElement('li');
                nothingSpecial.className = 'default',
                nothingSpecial.textContent = selectedText;
                nothingSpecial.setAttribute('data-index', i++);
                if (!alreadySelected) {
                    nothingSpecial.className += ' selected';
                } 
                alternates.appendChild(nothingSpecial);
                Object.forEach(allAlts, function(info, toglyph) {
                    var li = document.createElement('li');
                    li.title = info.feature;
                    if (alreadySelected === i) {
                        li.className = 'selected';
                    }
                    li.setAttribute('data-index', i++);

                    if (info.unicode) {
                        li.addClass('pua');
                        li.textContent = info.unicode;
                        pua2letter[info.unicode] = selectedText;
                    } else {
                        li.addClass('ffs');
                        li.textContent = selectedText;
                        li.style.fontFeatureSettings = '"' + info.feature + '" 1';
                    }

                    li.style.paddingLeft = (0.25-info.left) + 'em';
                    li.style.paddingRight = (0.25-info.right) + 'em';

                    alternates.appendChild(li);
                });

                //really doing it now!

                //get rid of existing popup, if any
                closeGAP();

                document.body.appendChild(wrapper);

                //make all boxes the same size for a nice grid
                var boxes = alternates.childNodes;
                var winWidth = window.innerWidth;
                var bodyRect = document.body.getBoundingClientRect();
                var sampRect = options.sample.getBoundingClientRect();

                var widest = 0;
                boxes.forEach(function(box) {
                    widest = Math.max(widest, Math.ceil(box.getBoundingClientRect().width));
                });

                boxes.forEach(function(box) { box.style.width = widest + 'px'; });

                //and size the grid into a pleasing shape: more or less square but also fitting in the window
                var square = Math.ceil(Math.sqrt(boxes.length)); //ideal square shape
                var max = Math.floor((winWidth-30)/widest); //but not too wide
                var columns = Math.min(boxes.length, max, Math.ceil((max + square) / 2)); //actually skew wider than square
                var rows = Math.ceil(boxes.length / columns);
                var popupWidth = columns * widest;
                wrapper.style.width = (popupWidth+1) + 'px';

                //remove unsightly edge borders
                boxes.forEach(function(box, i) {
                    if (i%columns === columns-1) {
                        box.style.borderRight = 'none';
                    }
                    if (Math.ceil((i+1)/columns) === rows) {
                        box.style.borderBottom = 'none';
                    }
                });

                //center popup around selection, but don't overflow screen edges
                var centeredLeft = document.documentElement.scrollLeft + selection.rectangle.left + selection.rectangle.width/2 - popupWidth/2 - bodyRect.left;
                var adjustedLeft = Math.max(document.documentElement.scrollLeft + 12, Math.min(winWidth - popupWidth - 12, centeredLeft));

                wrapper.style.top = (windowScrollTop() + selection.rectangle.top + selection.rectangle.height) + 'px';
                wrapper.style.left = adjustedLeft + 'px';

                if (centeredLeft !== adjustedLeft) {
                    pointer.style.left = (popupWidth/2 - (adjustedLeft-centeredLeft)) + 'px';
                }

                function selectGlyph(evt) {
                    var li = evt.target.closest('li');

                    (alternates.querySelectorAll('li.selected') || []).forEach(function(other) {
                        other.removeClass('selected');
                    });

                    li.addClass('selected');

                    if (!selectedSpan) {
                        //okay this is fun. need to replace parent element's entire contents with a new before-string, span, after-string
                        var parent = selection.anchorNode.parentNode;
                        selectedSpan = document.createElement('span');
                        selectedSpan.textContent = selectedText;
                        var beforeText = document.createTextNode(selection.anchorNode.textContent.substr(0,selection.anchorOffset));
                        var afterText = document.createTextNode(selection.focusNode.textContent.substr(selection.focusOffset));
                        if (afterText.length) {
                            parent.replaceChild(afterText, selection.anchorNode);
                            parent.insertBefore(selectedSpan, afterText);
                        } else {
                            parent.replaceChild(selectedSpan, selection.anchorNode);
                        }
                        if (beforeText.length) {
                            parent.insertBefore(beforeText, selectedSpan);
                        }
                    }

                    var theLetter = pua2letter[li.textContent] || li.textContent;
                    var theIndex = li.getAttribute("data-index");

                    selectedSpan.setAttribute('data-index', theIndex);
                    selectedSpan.setAttribute('data-letter', theLetter);
                    selectedSpan.style.fontFeatureSettings = li.style.fontFeatureSettings;

                    var newText = document.createTextNode(li.textContent);

                    selectedSpan.textContent = "";
                    selectedSpan.appendChild(newText);

                    //and select the new character
                    var newRange = document.createRange();
                    newRange.setStart(newText, 0);
                    newRange.setEnd(newText, newText.length);

                    //don't let the selection change close the popup
                    window.Flont.ignoreSelectionChange = true;
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(newRange);

                    setTimeout(function() {
                        window.Flont.ignoreSelectionChange = false;
                    }, 100);

                    evt.cancelBubble = true;
                    evt.stopPropagation();
                    evt.preventDefault();
                }

                alternates.addEventListener('mousedown', selectGlyph);
                alternates.addEventListener('touchstart', selectGlyph);
                
                return true;
            }
        }

        window.Flont.documentFlonts.push(onSelectionChange);
    }

    //close popup on resize
    window.removeEventListener('resize', closeGAP);
    window.addEventListener('resize', closeGAP);


    function setupPolyfills() {
        // forEach on nodes, from MDN
        if (window.NodeList && !NodeList.prototype.forEach) {
            NodeList.prototype.forEach = function (callback, thisArg) {
                thisArg = thisArg || window;
                for (var i = 0; i < this.length; i++) {
                    callback.call(thisArg, this[i], i, this);
                }
            };
        }

        // do NOT use Object.prototype here as it does not play nice with jQuery http://erik.eae.net/archives/2005/06/06/22.13.54/
        if (!Object.forEach) {
            Object.forEach = function(o, callback) {
                Object.keys(o).forEach(function(k) {
                    callback(o[k], k);
                });
            };
        }

        // jQuery-style addClass/removeClass are not canon, but more flexible than ClassList
        if (!HTMLElement.prototype.hasClass) {
            HTMLElement.prototype.hasClass = function(str) {
                var el = this;
                var words = str.split(/\s+/);
                var found = true;
                words.forEach(function(word) {
                    found = found && el.className.match(new RegExp("(^|\\s)" + word + "($|\\s)"));
                });
                return !!found;
            };
        }

        var spacere = /\s{2,}/g;
        if (!HTMLElement.prototype.addClass) {
            HTMLElement.prototype.addClass = function(cls) {
                this.className += ' ' + cls;
                this.className = this.className.trim().replace(spacere, ' ');
                return this;
            };
        }

        if (!HTMLElement.prototype.removeClass) {
            HTMLElement.prototype.removeClass = function(cls) {
                var i, words = cls.split(/\s+/);
                if (words.length > 1) {
                    for (var i=0; i < words.length; i++) {
                        this.removeClass(words[i]);
                    }
                } else {
                    var classre = new RegExp('(^|\\s)' + cls + '($|\\s)', 'g');
                    while (classre.test(this.className)) {
                        this.className = this.className.replace(classre, ' ').trim().replace(spacere, '');
                    }
                }
                return this;
            };
        }

        //synthetic events
        if (!HTMLElement.prototype.trigger) {
            HTMLElement.prototype.trigger = function(type) {
                var evt;
                if (typeof window.Event === "function"){ 
                    evt = new Event(type);
                } else { 
                    evt = document.createEvent('Event');
                    evt.initEvent(type, true, true);
                }
                return this.dispatchEvent(evt);
            };
        }

        // closest, from MDN
        if (!Element.prototype.matches) {
            Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
        }

        if (!Element.prototype.closest) {
            Element.prototype.closest = function(s) {
                var el = this;
                if (!document.documentElement.contains(el)) return null;
                do {
                    if (el.matches(s)) return el;
                    el = el.parentElement || el.parentNode;
                } while (el !== null && el.nodeType === 1); 
                return null;
            };  
        }

        // not in the spec, but seems weird to be able to do it on elements but not text nodes
        if (!Node.prototype.closest) {
            Node.prototype.closest = function(s) {
                return this.parentNode && this.parentNode.closest(s);
            };
        }

        // escape regex special chars
        if (!RegExp.escape) {
            RegExp.escape= function(s) {
                return s.replace(/[\-\/\\\^\$\*\+\?\.\(\)\|\[\]\{\}]/g, '\\$&');
            };
        }


        // shortcuts to get dimensions of element minus padding, equivalent to jQuery width() and height()
        if (!Element.prototype.contentWidth) {
            Element.prototype.contentWidth = function() {
                var fullwidth = this.getBoundingClientRect().width;
                var css = getComputedStyle(this);
                return fullwidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
            };
        }

        if (!Element.prototype.contentHeight) {
            Element.prototype.contentHeight = function() {
                var fullheight = this.getBoundingClientRect().height;
                var css = getComputedStyle(this);
                return fullheight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom);
            };
        }

        //how is this not a thing 
        if (!HTMLFormElement.prototype.serialize) {
            HTMLFormElement.prototype.serialize = function() {
                var form = this;
                var req = [];
                form.querySelectorAll('input:enabled').forEach(function(input) {
                    if ((input.type === 'checkbox' || input.type === 'radio') && !input.checked) {
                        return;
                    }
                    req.push(encodeURIComponent(input.name) + '=' + encodeURIComponent(input.value));
                });

                form.querySelectorAll('select:enabled').forEach(function(select) {
                    var options = select.querySelectorAll('option:checked');
                    if (options) {
                        options.forEach(function(opt) {
                            req.push(encodeURIComponent(select.name) + '=' + encodeURIComponent(opt.value));
                        });
                    }
                });
                return req.join("&");
            };
        }
    }

    function doOnReady(func, thisArg) {
        if (thisArg) {
            func = func.bind(thisArg);
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', func);
        } else {
            func();
        }
    }

    function doAjax(url, options) {
        var xhr = new XMLHttpRequest();
        if (options.complete) {
            xhr.addEventListener("load", function() { options.complete(xhr); });
        }
        xhr.open(options.method || 'GET', url);

        if (options.data) {
            if (!options.headers) {
                options.headers = {};
            }
            options.headers['Content-type'] = 'application/x-www-form-urlencoded';
        }

        if (options.headers) {
            console.log(options);
            Object.forEach(options.headers, function (v, k) {
                xhr.setRequestHeader(k, v);
            });
        }
        xhr.send(options.data);
    }

// end of line

};

//allow a little cross-Flont communication to avoid interference between testers
window.Flont.documentFlonts = [];

var previousEvent;
function processEvents(evt) {
    if (window.Flont.ignoreSelectionChange && evt.type === 'selectionchange') {
        return;
    }

    //ignore mouse/touch/keyboard events after a selection change
    var handled = (previousEvent && previousEvent.type === 'selectionchange') && evt.type !== 'selectionchange';

    if (!handled) {
        window.Flont.documentFlonts.forEach(function(onSelectionChange) {
            if (!handled) {
                handled = onSelectionChange(evt);
            }
        });
    }

    previousEvent = evt;
}

document.addEventListener('selectionchange', processEvents);
document.addEventListener('mouseup', processEvents);
document.addEventListener('touchend', processEvents);
document.addEventListener('keyup', processEvents);

})();