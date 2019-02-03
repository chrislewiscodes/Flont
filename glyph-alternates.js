(function() {
"use strict";

window.FontTester = function(options) {

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

    //load webfont and parse features
    populateAlternates();

    //set up the sample element for glyph-alternate replacement
    setupGlyphSelector();
    
    //and that's it! 
   
    //everything after this is just function definitions
    function sanitizeOptions() {
        function optionError(opt, msg) {
            throw "FontTester: Invalid options" + (opt ? ': ' + opt : '') + (msg ? ' ' + msg : '');
        }
        
        function getElement(el, multiple) {
            var qs = multiple ? document.querySelectorAll.bind(document) : document.querySelector.bind(document);
            if (typeof el === 'string') {
                return qs(el);
            } else if (el instanceof HTMLElement) {
                return multiple ? [el] : el;
            } else if (el instanceof HTMLCollection) {
                if (el.length == 0) {
                    return null;
                }
                return multiple ? el : el[0];
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
        if (!options.sample) {
            optionError('sample', 'must be element or CSS selector');
        }
    
        //valid fontURL ?
        if (!options.fontURL) {
            options.fontURL = options.sample.getAttribute('data-webfont-url');
        }
        
        if (!options.fontURL) {
            optionError('fontURL', 'missing');
        }
    
        //linking up controls is optional
        if (!options.controls) {
            options.controls = {};
        }

        options.controls.forEach(function(v, k) {
            options.controls[k] = getElement(v);
        });
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
    

    function closeGAP() {
        var gap = document.getElementById('glyph-alternates-popup');
        if (gap) {
            gap.parentNode.removeChild(gap);
        }
    }
    
    function populateAlternates(callback) {
        window.alts = allAlternates[options.fontURL] = {};
    
        window.opentype.load(options.fontURL, function(err, font) {
            if (err) {
                console.log("ERROR LOADING " + options.fontURL + ': ' + err);
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

    function setupGlyphSelector() {
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
            var inSample = evt.target === options.sample || options.sample.contains(evt.target);
    
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
            if (options.fontURL in allAlternates && selectedText in allAlternates[options.fontURL]) {
                allAlts = allAlternates[options.fontURL][selectedText];
                hasAlts = true;
            }
    
            if (hasAlts) {
                var wrapper = document.createElement('div');
                wrapper.id = 'glyph-alternates-popup';
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
                var sampWidth = options.sample.getBoundingClientRect().width;
                
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
        
        // and why not forEach on objects
        if (!Object.prototype.forEach) {
            Object.prototype.forEach = function(callback) {
                var thiss = this;
                Object.keys(thiss).forEach(function(k) {
                    callback(thiss[k], k);
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
            options.headers.forEach(function (v, k) {
                xhr.setRequestHeader(k, v);
            });
        }
        xhr.send(options.data);
    }
    
// end of line

};

})();