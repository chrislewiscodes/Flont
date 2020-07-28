(function() {
"use strict";

/*
 * Ultra-simple usage:
 *
 * Flont('#specimen-element') 
 * 
 * Call with a single HTMLElement object or CSS selector string, representing the font-specimen display element.
 * Webfont URL will be determined from stylesheets and the CSS font-family name on the specimen.
 * This will set that element up with popup glyph-alternates selectors when the user selects text.
 *
 * Flexible usage:
 *
 * Flont({
     sample: '#specimen-element', //required
     controls: {
         'font': '[name="font-family"]', // select element, or a set of radio buttons, 
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


var dependencies = {
    'opentype': 'https://cdn.jsdelivr.net/npm/opentype.js@latest/dist/opentype.min.js'
};

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


//polyfills
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

if (!Document.prototype.trigger) {
    Document.prototype.trigger = HTMLElement.prototype.trigger;
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

// String.fromCodePoint, from MDN
if (!String.fromCodePoint) (function(stringFromCharCode) {
    var fromCodePoint = function(_) {
      var codeUnits = [], codeLen = 0, result = "";
      for (var index=0, len = arguments.length; index !== len; ++index) {
        var codePoint = +arguments[index];
        // correctly handles all cases including `NaN`, `-Infinity`, `+Infinity`
        // The surrounding `!(...)` is required to correctly handle `NaN` cases
        // The (codePoint>>>0) === codePoint clause handles decimals and negatives
        if (!(codePoint < 0x10FFFF && (codePoint>>>0) === codePoint))
          throw RangeError("Invalid code point: " + codePoint);
        if (codePoint <= 0xFFFF) { // BMP code point
          codeLen = codeUnits.push(codePoint);
        } else { // Astral code point; split in surrogate halves
          // https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
          codePoint -= 0x10000;
          codeLen = codeUnits.push(
            (codePoint >> 10) + 0xD800,  // highSurrogate
            (codePoint % 0x400) + 0xDC00 // lowSurrogate
          );
        }
        if (codeLen >= 0x3fff) {
          result += stringFromCharCode.apply(null, codeUnits);
          codeUnits.length = 0;
        }
      }
      return result + stringFromCharCode.apply(null, codeUnits);
    };
    try { // IE 8 only supports `Object.defineProperty` on DOM elements
      Object.defineProperty(String, "fromCodePoint", {
        "value": fromCodePoint, "configurable": true, "writable": true
      });
    } catch(e) {
      String.fromCodePoint = fromCodePoint;
    }
}(String.fromCharCode));

/*! https://mths.be/codepointat v0.2.0 by @mathias */
if (!String.prototype.codePointAt) {
  (function() {
    'use strict'; // needed to support `apply`/`call` with `undefined`/`null`
    var defineProperty = (function() {
      // IE 8 only supports `Object.defineProperty` on DOM elements
      try {
        var object = {};
        var $defineProperty = Object.defineProperty;
        var result = $defineProperty(object, object, object) && $defineProperty;
      } catch(error) {}
      return result;
    }());
    var codePointAt = function(position) {
      if (this == null) {
        throw TypeError();
      }
      var string = String(this);
      var size = string.length;
      // `ToInteger`
      var index = position ? Number(position) : 0;
      if (index != index) { // better `isNaN`
        index = 0;
      }
      // Account for out-of-bounds indices:
      if (index < 0 || index >= size) {
        return undefined;
      }
      // Get the first code unit
      var first = string.charCodeAt(index);
      var second;
      if ( // check if it’s the start of a surrogate pair
        first >= 0xD800 && first <= 0xDBFF && // high surrogate
        size > index + 1 // there is a next code unit
      ) {
        second = string.charCodeAt(index + 1);
        if (second >= 0xDC00 && second <= 0xDFFF) { // low surrogate
          // https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
          return (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
        }
      }
      return first;
    };
    if (defineProperty) {
      defineProperty(String.prototype, 'codePointAt', {
        'value': codePointAt,
        'configurable': true,
        'writable': true
      });
    } else {
      String.prototype.codePointAt = codePointAt;
    }
  }());
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

// end polyfills


// basically like jQuery()
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


// cut-down version of jQuery.ajax
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

function windowScrollTop() {
    return window.scrollY || window.pageYOffset;
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


//figure out the webfont URL for the sample font
function getWebfontUrl(searchFamily) {
    //go through CSS stylesheets and pull out all the font-family to url mappings
    var name2url = {};
    var s, sl, sheet;
    var r, rl, css, fam, urls;
    var chosen;
    for (s=0, sl=document.styleSheets.length; s < sl; s++) {
        sheet = document.styleSheets[s];
        try {
            //cssRules are inaccessible for off-site stylesheets
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
        } catch (e) {
            console.log("Ignoring off-site stylesheet: " + sheet.href);
        }
    }
    
    return name2url[searchFamily];
}

function getReverseCmap(font) {
    //glyph to unicode mapping
    var reversecmap = {};
    Object.forEach(font.tables.cmap.glyphIndexMap, function(g, u) {
        reversecmap[g] = String.fromCodePoint(u);
    });
    return reversecmap;
}

function getGlyphSingleSubstitutions(font) {
    var g2g = {};
    function glyph2glyph(fromGlyphID, toGlyphID, feature, featIndex) {
        if (!(fromGlyphID in g2g)) {
            g2g[fromGlyphID] = {};
        }
        if (!(feature in g2g[fromGlyphID])) {
            g2g[fromGlyphID][feature] = {};
        }
        g2g[fromGlyphID][feature][featIndex || '0'] = toGlyphID;
    }

    var unhandledFeatures = {};
    font.tables.gsub.features.forEach(function(f) {
        var tag = f.tag;
        var feature = f.feature;

        feature.lookupListIndexes.forEach(function(lli) {
            var lookup = font.tables.gsub.lookups[lli];
            lookup.subtables.forEach(function(subtable) {
                function unhandled() {
                    if (!(tag in unhandledFeatures)) {
                        unhandledFeatures[tag] = 0;
                    }
                    unhandledFeatures[tag] += 1;
                    //console.log('Unhandled OT feature:', tag, subtable);
                }

                //console.log(tag, lli, subtable);
                if ('mapping' in subtable) {
                    Object.forEach(mapping, function(toglyph, fromglyph) {
                        glyph2glyph(fromglyph, toglyph, tag);
                    });
                } else if ('coverage' in subtable) {
                    //ignore multiple-character substitutions
                    if ('ligatureSets' in subtable || 'backtrackCoverage' in subtable) {
                        return;
                    }
                    
                    // common one-to-one substitutions
                    // there are a million ways to represent these in GSUB
                    var hasSubstitute = 'substitute' in subtable;
                    var hasDelta = 'deltaGlyphId' in subtable;
                    var hasAlternates = 'alternateSets' in subtable;
                    if (!hasSubstitute && !hasDelta && !hasAlternates) {
                        unhandled();
                    } else if ('glyphs' in subtable.coverage) {
                        subtable.coverage.glyphs.forEach(function(fromglyph, i) {
                            if (hasSubstitute) {
                                glyph2glyph(fromglyph, subtable.substitute[i], tag);
                            } else if (hasDelta) {
                                glyph2glyph(fromglyph, fromglyph + subtable.deltaGlyphId, tag);
                            } else if (hasAlternates) {
                                subtable.alternateSets[i].forEach(function(altID, altIndex) {
                                    glyph2glyph(fromglyph, altID, tag, altIndex + 1);
                                });
                            }
                        });
                    } else if ('ranges' in subtable.coverage) {
                        var i = 0;
                        subtable.coverage.ranges.forEach(function(range) {
                            for (var fromglyph=range.start; fromglyph<=range.end; fromglyph++) {
                                if (hasSubstitute) {
                                    glyph2glyph(fromglyph, subtable.substitute[i], tag);
                                } else if (hasDelta) {
                                    glyph2glyph(fromglyph, fromglyph + subtable.deltaGlyphId, tag);
                                } else if (hasAlternates) {
                                    subtable.alternateSets[i].forEach(function(altID, altIndex) {
                                        glyph2glyph(fromglyph, altID, tag, altIndex + 1);
                                    });
                                }
                                ++i;
                            }
                        });
                    }
                } else {
                    unhandled();
                }
            });
        });
    });
    
    return g2g;
}

function getLigatures(font) {
    var ligatures = {};
    font.tables.gsub.features.forEach(function(f) {
        var tag = f.tag;
        var feature = f.feature;

        var reversecmap = getReverseCmap(font);

        feature.lookupListIndexes.forEach(function(lli) {
            var lookup = font.tables.gsub.lookups[lli];
            lookup.subtables.forEach(function(subtable) {
                if ('coverage' in subtable && 'ligatureSets' in subtable) {
                    // ligatures: many to one substitution
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
                            if (!(lig in ligatures)) {
                                ligatures[lig] = {};
                            }
                            ligatures[lig][tag] = ligset.ligGlyph;
                        });
                    });
                }
            });
        });
    });
    
    return ligatures;
}

function getGlyphSubstitutionTrails(font) {
    var g2g = getGlyphSingleSubstitutions(font);
    var seen = {};
    var substitutions = [];
    var urglyph;
    var addcell = function(fromglyph, featureTrail, indexTrail) {
        if (!featureTrail || !indexTrail) {
            urglyph = fromglyph;
            featureTrail = [];
            indexTrail = [];
        }
        if (!(fromglyph in g2g)) {
            return;
        }
        Object.forEach(g2g[fromglyph], function(subfeatures, feat) {
            if (feat === 'aalt') {
                return;
            }
            if (featureTrail.indexOf(feat) >= 0) {
                return;
            }
            Object.forEach(subfeatures, function(toglyph, featureIndex) {
                if (toglyph in seen) {
                    return;
                }
                featureIndex = parseInt(featureIndex) || 0;
                featureTrail.push(feat);
                indexTrail.push(featureIndex);

                seen[toglyph] = true;

                var ffs = [];
                featureTrail.forEach(function(f, i) {
                    var clause = '"' + f + '"';
                    if (indexTrail[i] > 0) {
                        clause += ' ' + indexTrail[i];
                    }
                    ffs.push(clause);
                });

                var sub = {
                    'fromGlyph': urglyph,
                    'toGlyph': toglyph,
                    'features': featureTrail.slice(),
                    'indices': indexTrail,
                    'fontFeatureSettings': ffs.join(', ')
                };
                
                substitutions.push(sub);

                addcell(toglyph, featureTrail, indexTrail);
                featureTrail.pop();
                indexTrail.pop();
            });
        });
    };
    
    Object.forEach(g2g, function(whatever, fromGlyph) {
        addcell(fromGlyph);
    });
    
    return substitutions;
}

function getMetrics(glyph, font) {
    try {
        var metrics = glyph.getMetrics();
    } catch (e) {
        console.log("Error getting metrics for glyph " + glyph.index, e);
        return {};
    }

    return {
        'left': metrics.leftSideBearing / font.unitsPerEm,
        'right': metrics.rightSideBearing / font.unitsPerEm,
        'width': glyph.advanceWidth / font.unitsPerEm
    };
}

function getAlternatesForUrl(fontUrl, callback) {
    var alternates = {};
    
    window.opentype.load(fontUrl, function(err, font) {
        if (err) {
            console.log("ERROR LOADING " + fontUrl + ': ' + err);
            callback(alternates, null);
            return;
        }

        window.font = font;

        var reversecmap = getReverseCmap(font);
        
        function addAlt(fromText, toGlyphID, features, indices, ffs) {
            var toGlyph = font.glyphs.glyphs[toGlyphID];
            if (!toGlyph) {
                console.log('ERROR: "' + fromText + '" + ' + ffs + ' results in nonexistent glyph ' + toGlyphID + '.');
                return;
            }
            try {
                var metrics = getMetrics(toGlyph, font);

                if (!(fromText in alternates)) {
                    alternates[fromText] = {};
                }
                var existingSub = alternates[fromText][toGlyph.index];
                //generally first found substitution wins, but prefer specific alt features to aalt
                if (!existingSub || existingSub.feature === 'aalt' || existingSub.featureIndex > 0) {
                    alternates[fromText][toGlyph.index] = {
                        'feature': features[0],
                        'unicode': reversecmap[toGlyph.index],
                        'featureIndex': parseInt(indices[0]) || "", // valid values will always be nonzero
                        'fontFeatureSettings': ffs,
                        'features': features,
                        'featureIndices': indices,
                        'glyph': toGlyph.index
                    };
                    Object.forEach(metrics, function(v, k) {
                        alternates[fromText][toGlyph.index][k] = v;
                    });
                }
            } catch (e) {
                console.log("Unknown error in addAlt", e);
            }
        }

        getGlyphSubstitutionTrails(font).forEach(function(sub) {
            if (sub.fromGlyph in reversecmap) {
                addAlt(reversecmap[sub.fromGlyph], sub.toGlyph, sub.features, sub.indices, sub.fontFeatureSettings);
            }
        });
        
        Object.forEach(getLigatures(font), function(features, fromText) {
            Object.forEach(features, function(toGlyph, feature) {
                addAlt(fromText, toGlyph, [feature], [""], '"' + feature + '"');
            });
        });

        if (callback) {
            callback(alternates, font);
        }
    });
}


window.Flont = function(options) {

    var currentAlternates = {};

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

    function getSampleWebfontUrl() {
        var found = false;
        getComputedStyle(options.sample).fontFamily.split(',').forEach(function(fontname) {
            if (found) {
                return;
            }
            fontname = fontname.trim().replace(/^['"]/, '').replace(/['"]$/, '').trim();
            var url = getWebfontUrl(fontname);
            if (url) {
                found = options.fontUrl = url;
            }
        });
        return found;
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


    function closeGAP(result) {
        var gap = document.getElementById('flont-popup');
        if (gap) {
            gap.parentNode.removeChild(gap);
        }
        return result;
    }


    //populate features dropdown
    function populateFeatures(alternates, font) {
        var select = options.controls.features;

        //no need to do this if there is no features control
        if (!select || !select.tagName || !select.tagName.match(/UL|OL|SELECT/)) {
            return;
        }

        select.textContent = "";

        //styleset matcher
        var ssre = /ss(\d\d)/;

        //features to be enabled by default
        var defaults = /liga|calt|rlig|rvrn|rclt|dnum/; //"r" features are "required" can't be disabled
        
        var figureTags = /[oltp]num/;

        var features = {};
        var figureStyles = {};

        Object.forEach(alternates, function(subs, fromText) {
            Object.forEach(subs, function(sub, toGlyph) {
                if (sub.fontFeatureSettings in features) {
                    return;
                }

                var fstring = sub.features.join(',');

                if (figureTags.test(sub.fontFeatureSettings) && sub.features.length <= 2) {
                    switch (fstring) {
                        case "onum": case "tnum": case "lnum": case "pnum":
                            figureStyles[fstring] = otFeatures[fstring];
                            break;
                        case "onum,tnum": case "tnum,onum":
                            figureStyles[fstring] = "Tabular Old Style";
                            break;
                        case "onum,pnum": case "pnum,onum":
                            figureStyles[fstring] = "Proportional Old Style";
                            break;
                        case "lnum,tnum": case "tnum,lnum":
                            figureStyles[fstring] = "Tabular Lining";
                            break;
                        case "lnum,pnum": case "pnum,lnum":
                            figureStyles[fstring] = "Proportional Lining";
                            break;
                    }
                } else if (sub.features.length === 1 && (sub.features[0] in otFeatures || ssre.test(sub.features[0]))) {
                    features[sub.fontFeatureSettings] = otFeatures[sub.features[0]] || sub.features[0].replace(ssre, "Stylistic Set $1");
                }
            });
        });

        if (figureStyles.tnum && !figureStyles.pnum) {
            if (figureStyles.onum) { figureStyles.onum = "Proportional Old Style"; }
            if (figureStyles.lnum) { figureStyles.onum = "Proportional Lining"; }
        }

        if (figureStyles.pnum && !figureStyles.tnum) {
            if (figureStyles.onum) { figureStyles.onum = "Tabular Old Style"; }
            if (figureStyles.lnum) { figureStyles.onum = "Tabular Lining"; }
        }

        if (figureStyles.lnum && !figureStyles.onum) {
            if (figureStyles.tnum) { figureStyles.tnum = "Tabular Old Style"; }
            if (figureStyles.pnum) { figureStyles.pnum = "Proportional Old Style"; }
        }

        if (figureStyles.onum && !figureStyles.lnum) {
            if (figureStyles.tnum) { figureStyles.tnum = "Tabular Lining"; }
            if (figureStyles.pnum) { figureStyles.pnum = "Proportional Lining"; }
        }
        
        var defaultFigureStyle;
        if (figureStyles.pnum && figureStyles.lnum) {
            defaultFigureStyle = "Tabular Old Style";
        } else if (figureStyles.pnum && figureStyles.onum) {
            defaultFigureStyle = "Tabular Lining";
        } else if (figureStyles.tnum && figureStyles.lnum) {
            defaultFigureStyle = "Proportional Old Style";
        } else if (figureStyles.tnum && figureStyles.onum) {
            defaultFigureStyle = "Proportional Lining";
        } else {
            defaultFigureStyle = "Default Figures";
        }

        var rando = function() {
            return "input-" + Date.now().toString() + '-' + Math.random().toString().substr(2);
        }

        var addopt = function(type, name, label, ffs) {
            if (select.tagName === 'SELECT') {
                var option = document.createElement('option');
                option.value = ffs;
                option.textContent = label;
                option.selected = defaults.test(ffs);
                select.appendChild(option);
            } else {
                var id = rando();
                var item = document.createElement('li');
                var input = document.createElement('input');
                var labelel = document.createElement('label');
                input.type = type;
                if (name) {
                    input.name = name;
                }
                input.checked = defaults.test(ffs);
                input.value = ffs;
                input.id = id;
                labelel.textContent = label;
                labelel.setAttribute('for', id);
                labelel.setAttribute('data-feature', ffs);
                item.appendChild(input);
                item.appendChild(labelel);
                select.appendChild(item);
            }
        };

        var figid = rando();
        addopt('radio', figid, defaultFigureStyle, '"dnum"', true);
        Object.forEach(figureStyles, function(label, features) {
            addopt('radio', figid, label, '"' + features.replace(',', '", "') + '"');
        });

        Object.forEach(features, function(label, ffs) {
            addopt('checkbox', null, label, ffs);
        });

        select.trigger('change');
    }

    function populateAlternates() {
        var fontUrl = getSampleWebfontUrl();
        if (!fontUrl) {
            console.log("Couldn't find valid webfont URL in CSS @font-face rules.");
            return;
        }

        getAlternatesForUrl(fontUrl, function(alternates, font) {
            currentAlternates = alternates;
            populateFeatures(alternates, font);
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
                    ffs.push(input.value);
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
            if (selectedText in currentAlternates) {
                allAlts = currentAlternates[selectedText];
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
                        li.style.fontFeatureSettings = '"' + info.feature + '" ' + (info.featureIndex || 1);
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

                wrapper.style.top = (-bodyRect.top + selection.rectangle.top + selection.rectangle.height + pointer.getBoundingClientRect().width/3) + 'px';
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

}; //window.Flont

// handy metrics function
window.Flont.getMetrics = function(font) {
        var os2 = font.tables.os2;
        var hhea = font.tables.hhea;
        var useTypo = !!(os2.fsSelection & 128);
        var ascent = Math.abs(useTypo ? os2.sTypoAscender : /* os2.usWinAscent */ hhea.ascender);
        var descent = Math.abs(useTypo ? os2.sTypoDescender : /* os2.usWinDescent */ hhea.descender);
        var divisor = font.unitsPerEm /* ascent + descent */;
        return {
                'maxWidth': 0.0,
                'em': font.unitsPerEm,
                'baseline': ascent / (ascent + descent),
                'ascender': ascent / divisor,
                'descender': descent / divisor,
                'capHeight': os2.sCapHeight / divisor,
                'xHeight': os2.sxHeight / divisor,
                'lineGap': os2.sTypoLineGap / divisor,
                'which': useTypo ? 'typo' : 'hhea'
        };
};

// separate function for handling glyph grids
window.Flont.getGlyphsForUrl = function(fonturl, callback) {
    getAlternatesForUrl(fonturl, function(alternates, font) {
        var result = {
            'characters': [],
            'substitutions': {},
            'metrics': window.Flont.getMetrics(font)
        };
        
        //first, just compile the unicode codepoints
        Object.forEach(font.tables.cmap.glyphIndexMap, function(gid, unicode) {
            var c = String.fromCodePoint(unicode);
            var metrics = getMetrics(font.glyphs.glyphs[gid], font);
            if (unicode >= 32) {
                result.characters.push({
	                'codepoint': parseInt(unicode),
	                'character': String.fromCodePoint(unicode),
	                'glyph': gid,
	                'metrics': metrics
                });
                result.metrics.maxWidth = Math.max(result.metrics.maxWidth, metrics.width);
            }
        });
        
        result.substitutions = alternates;

        callback(result, font);
    });
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