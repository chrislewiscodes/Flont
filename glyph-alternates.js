(function() {
"use strict";

//handy polyfills and utility functions

// forEach on nodes, from MDN
if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = function (callback, thisArg) {
        thisArg = thisArg || window;
        for (var i = 0; i < this.length; i++) {
            callback.call(thisArg, this[i], i, this);
        }
    };
}

// and why not forEach on objects
if (!Object.prototype.forEach) {
    Object.prototype.forEach = function(callback) {
        var thiss = this;
        Object.keys(thiss).forEach(function(k) {
            callback(thiss[k], k);
        });
    }
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
    }
}

var spacere = /\s{2,}/g;
if (!HTMLElement.prototype.addClass) {
    HTMLElement.prototype.addClass = function(cls) {
        this.className += ' ' + cls;
        this.className = this.className.trim().replace(spacere, ' ');
        return this;
    }
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
    }
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
    }
}

// closest, from MDN
if (!Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.msMatchesSelector || 
                                Element.prototype.webkitMatchesSelector;
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
    }
}

// escape regex special chars
if (!RegExp.escape) {
    RegExp.escape= function(s) {
        return s.replace(/[\-\/\\\^\$\*\+\?\.\(\)\|\[\]\{\}]/g, '\\$&');
    };
}


//like jQuery function
window.doOnReady = function(func, thisArg) {
    if (thisArg) {
        func = func.bind(thisArg);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', func);
    } else {
        func();
    }
}

// shortcuts to get dimensions of element minus padding, equivalent to jQuery width() and height()
if (!Element.prototype.contentWidth) {
    Element.prototype.contentWidth = function() {
        var fullwidth = this.getBoundingClientRect().width;
        var css = getComputedStyle(this);
        return fullwidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
    }
}

if (!Element.prototype.contentHeight) {
    Element.prototype.contentHeight = function() {
        var fullheight = this.getBoundingClientRect().height;
        var css = getComputedStyle(this);
        return fullheight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom);
    }
}


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


window.doAjax = function(url, options) {
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
        options.headers.forEach(function (v, k) {
            xhr.setRequestHeader(k, v);
        });
    }
    xhr.send(options.data);
};


var closeX = '<a class="close" href="#close"><svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path stroke="#999" fill="none" d="M0,0L10,10M10,0L0,10"/></svg></a>';

function smoothScroll(y, el) {
(el || window).scrollTo({'left': 0, 'top': y, 'behavior': 'smooth'});
}

function getPrimaryFontFamily(families) {
    if (families instanceof HTMLElement) {
        families = getComputedStyle(families).fontFamily;
    }
    return families.split(",")[0].trim().replace(/["']/g, '');
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

function closeGAP() {
    var gap = document.getElementById('glyph-alternates-popup');
    if (gap) {
        gap.parentNode.removeChild(gap);
    }
}

var glyphAlternates = {};
function populateAlternates(sample, callback) {
    var fonturl = sample.getAttribute("data-webfont-url");
    var fontname = fonturl;

    if (!fonturl) return;

    window.alts = glyphAlternates[fontname] = {};

    window.opentype.load(fonturl, function(err, font) {
        if (err) {
            console.log("ERROR LOADING " + fonturl + ': ' + err);
            return;
        }

        window.font = font;
        
        //populate glyph alternates
        var gsub = font.tables.gsub;
        
        if (!gsub) {
            return;
        }
        
        var reversecmap = {};
        font.tables.cmap.glyphIndexMap.forEach(function(g, u) {
            reversecmap[g] = String.fromCharCode(u);
        });
        function addAlt(fromText, toGlyph, feature) {
            try {
                var metrics = toGlyph.getMetrics();
                if (!(fromText in glyphAlternates[fontname])) {
                    glyphAlternates[fontname][fromText] = {};
                }
                if (!(toGlyph.index in glyphAlternates[fontname][fromText])) {
                    glyphAlternates[fontname][fromText][toGlyph.index] = {
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
                                addAlt(reversecmap[fromglyph], font.glyphs.glyphs[subtable.substitute[i]], tag);
                            });
                        } else if ('ranges' in subtable.coverage) {
                            var i = 0;
                            subtable.coverage.ranges.forEach(function(range) {
                                for (var fromglyph=range.start; fromglyph<=range.end; fromglyph++) {
                                    addAlt(reversecmap[fromglyph], font.glyphs.glyphs[subtable.substitute[i++]], tag);
                                }
                            });
                        }
                    } else if ('coverage' in subtable && 'deltaGlyphId' in subtable) {
                        if ('glyphs' in subtable.coverage) {
                            subtable.coverage.glyphs.forEach(function(fromglyph) {
                                addAlt(reversecmap[fromglyph], font.glyphs.glyphs[fromglyph + subtable.deltaGlyphId], tag);
                            });
                        } else if ('ranges' in subtable.coverage) {
                            var i = 0;
                            subtable.coverage.ranges.forEach(function(range) {
                                for (var fromglyph=range.start; fromglyph<=range.end; fromglyph++) {
                                    addAlt(reversecmap[fromglyph], font.glyphs.glyphs[fromglyph + subtable.deltaGlyphId], tag);
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
                                addAlt(lig, font.glyphs.glyphs[ligset.ligGlyph], tag);
                                ligs.push(lig);
                            });
                        });
                    } else {
                        if (tag !== 'calt') {
                            console.log('Unhandled OT feature:', tag, subtable);
                        }
                    }
                });
            });
        });

        if (callback) {
            callback(font);
        }
    });
}

window.populateAlternates = populateAlternates;

function setupGlyphSelection(sample) {
    var fontname = sample.getAttribute('data-webfont-url');

    populateAlternates(sample, function(font) {
        var alts = glyphAlternates[fontname];

        if (!alts) {
            return;
        }

/*
        //populate features dropdown
        features.empty();
        var ssre = /ss\d\d/;
        var defaults = /liga|calt|r.../;
        var seen = {};
        if ('gsub' in font.tables) {
            font.tables.gsub.features.forEach(function(table, i) {
                if (table.tag in seen) return; //sometimes see weird duplicates
                if (!(table.tag in otFeatures)) return;
                if (ssre.test(table.tag)) return;
                var opt = document.createElement('option');
                opt.value = table.tag;
                opt.selected = defaults.test(table.tag);
                opt.innerHTML = otFeatures[table.tag];
                features.append(opt);
                seen[table.tag] = true;
            });
        } else {
//                      features.append('<option value="" disabled>No special features</option>');
        }

        //show tester hints
        var yesAlwaysShowHint = false;
        function shouldShowTesterHint() {
            try {
                return window.debug || !window.localStorage.getItem('testerHintShown');
            } catch (e) {
                return yesAlwaysShowHint;
            }
        }

        function shouldShowGlyphsHint() {
            try {
                return window.debug || !window.localStorage.getItem('glyphsHintShown');
            } catch (e) {
                return yesAlwaysShowHint;
            }
        }

        tester.find('button.how-it-works').on('click', function() {
            yesAlwaysShowHint = true;
            try {
                window.localStorage.removeItem('testerHintShown');
                window.localStorage.removeItem('glyphsHintShown');
            } catch (e) {
                
            }
            win.off('scroll.hints');
            smoothScroll(sample.offset().top + sample.outerHeight() - win.height()/2);
            setTimeout(showTesterHint, 500);
            return false;
        });

        function showTesterHint() {
            $('#glyph-alternates-popup').remove();
            sample.append("<div id='glyph-alternates-popup' contenteditable='false' class='popup tester-hint shadow'><aside></aside><div><p>Type your own text here to see the font in use.</p><button type='button' class='close'>" + (shouldShowGlyphsHint() ? "Next" : "Got it, thanks") + "</button></div></div>");
            
            try {
                window.localStorage.setItem('testerHintShown', 'yes indeed');
            } catch (e) {
            }
            
    
            if (shouldShowGlyphsHint()) {
                $('#glyph-alternates-popup button.close').on('mouseup touchend', function() {
                    setTimeout(showGlyphsHint, 100);
                });
            }
        }
        
        function showGlyphsHint() {
            var samp = sample[0];
            var node = samp;
            var textNodes = [];
            function findTextNodes(node) {
                if (node.nodeType === 3) {
                    textNodes.push(node);
                } else if (node.childNodes && node.childNodes.length) {
                    if (node.id === 'glyph-alternates-popup') {
                        return;
                    }
                    for (var i=0, l=node.childNodes.length; i<l; i++) {
                        findTextNodes(node.childNodes[i]);
                    }
                }
            }
            findTextNodes(samp);
            textNodes.forEach(function(node, n) {
                var i, l, c;
                for (i=0, l=node.textContent.length; i<l; i++) {
                    c = node.textContent[i];
                    if (c in alts) {
                        try {
                            window.localStorage.setItem('glyphsHintShown', 'yes indeed');
                        } catch (e) {
                        }
                        var selection = window.getSelection();
                        var range = document.createRange();
                        range.setStart(node, i);
                        range.setEnd(node, i+1);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        sample.trigger('mouseup');
                        setTimeout(function() {
                            var gap = $('#glyph-alternates-popup');
                            gap.addClass('glyphs-hint');
                            gap.children('aside').after("<div class='tester-hint'><div><p>Highlight a letter to see available alternates, and create amazing custom lettering effects!</p><button class='close' type='button'>Got it, thanks</button></div></div>")
                        }, 100);
                        return false;
                    }
                }
            });
        }
        
        if (shouldShowTesterHint()) {
            var hintscroll;
            win.on('scroll.hints', function() {
                hintscroll && clearTimeout(hintscroll);
                hintscroll = setTimeout(function() {
                    if (!shouldShowTesterHint()) {
                        return;
                    }
                    var rect = sample[0].getBoundingClientRect();
                    if (rect.bottom > 80 && rect.bottom < win.height()) {
                        showTesterHint(sample);
                    }
                }, 250);
            });
        } else if (shouldShowGlyphsHint()) {
            win.on('scroll.hints', function() {
                hintscroll && clearTimeout(hintscroll);
                hintscroll = setTimeout(function() {
                    if (!shouldShowGlyphsHint()) {
                        return;
                    }
                    var rect = sample[0].getBoundingClientRect();
                    if (rect.bottom > 80 && rect.bottom < win.height()) {
                        showGlyphsHint();
                    }
                }, 250);
            });
        }
*/
    });
    

    //glyph alternate popup
    var pua2letter = {};

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
    function selectionChanged() {
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

    var ignoreSelectionChange = false;
    function onSelectionChange(evt) {
        if (ignoreSelectionChange) {
            return;
        }
        
        //ignore mouse events with secondary buttons
        if ('button' in evt && evt.button > 0) {
            return;
        }
        
        var gap = document.getElementById('glyph-alternates-popup');

        var isOpen = gap !== null;
        var inPopup = isOpen && (evt.target === gap || gap.contains(evt.target));
        var inSample = evt.target === sample || sample.contains(evt.target);

        //console.log(evt.type, isOpen, inPopup, inSample);

        var selection = cloneSelection();
        var selectedText = selection.toString().trim();


        //always close on close button
        if (inPopup && evt.target.closest('.close')) {
            return closeGAP();
        }

        //clicking inside the popup shouldn't close the popup
        if (inPopup) {
            return;
        }

        //no selection, no popup
        if (selection.isCollapsed || !selectedText.length) {
            return closeGAP();
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
        if (!selectionChanged()) {
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
        if (fontname in glyphAlternates && selectedText in glyphAlternates[fontname]) {
            allAlts = glyphAlternates[fontname][selectedText];
            hasAlts = true;
        }

        //if you want to match ligatures too...
/*
        glyphAlternates[fontname].forEach(function(features, fromString) {
            var start = selectedText.indexOf(fromString);
            if (start !== 0) return;
            features.forEach(function(info, toglyph) {
                if (!(toglyph in allAlts)) {
                    allAlts[toglyph] = info;
                    hasAlts = true;
                }
            });
        });
*/

        if (hasAlts) {
            var wrapper = document.createElement('div');
            wrapper.id = 'glyph-alternates-popup';
            wrapper.className = 'popup shadow';
            
            var pointer = document.createElement('aside');
            wrapper.appendChild(pointer);
            
            var alternates = document.createElement('ul');
            alternates.style.fontFamily = getComputedStyle(sample).fontFamily;
    
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
            allAlts.forEach(function(info, toglyph) {
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
                    li.className.addClass('ffs');
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
            var winWidth = document.documentElement.clientWidth;
            var bodyWidth = document.body.getBoundingClientRect().width;
            var sampWidth = sample.getBoundingClientRect().width;
            
            var widest = 0;
            boxes.forEach(function(box) {
                widest = Math.max(widest, Math.ceil(box.getBoundingClientRect().width));
            });

            boxes.forEach(function(box) { box.style.width = widest + 'px'; });

            //and size the grid into a pleasing shape: more or less square but also fitting in the window
            var square = Math.ceil(Math.sqrt(boxes.length)); //ideal square shape
            var max = Math.floor(Math.min(winWidth-30, 720)/widest); //but not too wide
            var columns = Math.min(boxes.length, square, max);
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
            var centeredLeft = document.documentElement.scrollLeft + selection.rectangle.left + selection.rectangle.width/2 - popupWidth/2;
            var adjustedLeft = Math.max(12, Math.min(winWidth - popupWidth - 12, centeredLeft));

            wrapper.style.top = (document.documentElement.scrollTop + selection.rectangle.top + selection.rectangle.height) + 'px';
            wrapper.style.left = (adjustedLeft - (sampWidth - bodyWidth) / 2) + 'px';
            
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
                ignoreSelectionChange = true;
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(newRange);

                setTimeout(function() {
                    ignoreSelectionChange = false;
                }, 0);
                
                evt.cancelBubble = true;
                evt.stopPropagation();
            }

            alternates.addEventListener('mousedown', selectGlyph);
            alternates.addEventListener('touchstart', selectGlyph);
        }
        
    }
    
    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('mouseup', onSelectionChange);
    document.addEventListener('touchend', onSelectionChange);
    document.addEventListener('keyup', onSelectionChange);
}

doOnReady(function() {
    document.querySelectorAll('samp[data-webfont-url]').forEach(setupGlyphSelection);
});

//close popup on resize
window.addEventListener('resize', closeGAP);
    


// 
// function showPopup(html, extraclass) {
//     $('body > .popup, #popup-underlay').remove();
//     var popup = $('<div class="popup"></div>');
//     if (extraclass) {
//         popup.addClass(extraclass);
//     }
//     var close = $(closeX);
//     popup.html(html);
//     popup.append(close);
// 
//     if (!extraclass || !extraclass.match(/\bshadow\b/)) {
//         $('body').append("<div id='popup-underlay'></div>");
//     }
// 
//     $('body').append(popup);
// }
// 
// //close popup on click outside
// doc.on('click', function(evt) {
//     var popup = $('body > .popup');
//     var clicked = $(evt.target);
//     if (!popup.length) {
//         return;
//     }
//     function close() {
//         popup.remove();
//         $('#popup-underlay').remove();
//         return false;
//     }
//     if (clicked.closest(popup).length) {
//         //always close on close button 
//         if (clicked.closest('.close').length) {
//             return close();
//         }
//     } else {
//         //close on click outside BUT let glyph alts handle its own closing
//         if (popup.prop('id') !== 'glyph-alternates-popup') {
//             return close();
//         }
//     }
// });

})();