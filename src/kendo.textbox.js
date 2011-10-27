(function($, undefined) {
    var kendo = window.kendo,
        keys = kendo.keys,
        ui = kendo.ui,
        Widget = ui.Widget,
        parse = kendo.parseFloat,
        touch = kendo.support.touch,
        TOUCHEND = "touchend",
        MOUSEDOWN = touch ? "touchstart" : "mousedown",
        MOUSEUP = touch ? "touchmove " + TOUCHEND : "mouseup mouseleave",
        HOVER = "k-state-hover",
        HOVEREVENTS = "mouseenter mouseleave",
        DISABLED = "disabled",
        HIDE = "k-hide-text",
        INPUT = "k-input",
        CHANGE = "change",
        POINT = ".",
        NULL = null,
        proxy = $.proxy,
        decimals = {
            190 : ".",
            188 : ","
        };

    var TextBox = Widget.extend(/** @lends kendo.ui.TextBox.prototype */{
        init: function(element, options) {
            var that = this,
                isStep = options && options[step] !== undefined,
                min, max, step, value;

            Widget.fn.init.call(that, element, options);

            options = that.options;
            element = that.element.addClass(INPUT)
                          .bind({
                              keydown: proxy(that._keydown, that),
                              paste: proxy(that._paste, that)
                          });

            that._wrapper();
            that._arrows();
            that._input();

            that.bind(CHANGE, options);

            that.wrapper.bind({
                focusin: proxy(that._focusin, that),
                focusout: proxy(that._focusout, that),
            });

            that._text.focus(function() { that._focusin(); });

            min = parse(element.attr("min"));
            max = parse(element.attr("max"));
            step = parse(element.attr("step"));

            if (options.min === NULL && min !== NULL) {
                options.min = min;
            }

            if (options.max === NULL && max !== NULL) {
                options.max = max;
            }

            if (!isStep && step !== NULL) {
                options.step = step;
            }

            value = options.value;
            that.value(value !== NULL ? value : element.val());
            that._old = that._value;

            that.enable(!element.is('[disabled]'));

            that._blur();
        },
        options: {
            value: NULL,
            min: NULL,
            max: NULL,
            step: 1,
            format: "n",
            name: "TextBox",
            empty: "Enter value",
            upArrowText: "Increase value",
            downArrowText: "Decrease value"
        },

        enable: function(enable) {
            var that = this,
                element = that.element;
                wrapper = that.wrapper,
                upArrow = that._upArrow,
                downArrow = that._downArrow;

            upArrow.unbind(MOUSEDOWN);
            downArrow.unbind(MOUSEDOWN);

            that._toggleText(enable);

            if (enable === false) {
                wrapper
                    .addClass(DISABLED)
                    .unbind(HOVEREVENTS);

                element.attr(DISABLED, DISABLED);
            } else {
                wrapper
                    .removeClass(DISABLED)
                    .bind(HOVEREVENTS, that._toggleHover);

                element.removeAttr(DISABLED);

                upArrow.bind(MOUSEDOWN, function(e) {
                    e.preventDefault();
                    that._spin(1);
                });

                downArrow.bind(MOUSEDOWN, function(e) {
                    e.preventDefault();
                    that._spin(-1);
                });
            }
        },

        value: function(value) {
            var that = this,
                options = that.options,
                format = options.format,
                decimals = options.decimals,
                numberFormat = that._format(format),
                isNotNull;

            if (value === undefined) {
                return that._value;
            }

            if (decimals === undefined) {
                decimals = numberFormat.decimals;
            }

            value = parse(value);

            isNotNull = value !== NULL;

            if (isNotNull) {
                value = parseFloat(value.toFixed(decimals));
            }

            that._value = value = that._adjust(value);
            that._text.val(isNotNull ? kendo.toString(value, format) : options.empty);
            that.element.val(isNotNull ? value.toString().replace(POINT, numberFormat[POINT]) : "");
        },

        _adjust: function(value) {
            var that = this,
            options = that.options,
            min = options.min,
            max = options.max;

            if (min !== NULL && value < min) {
                value = min;
            } else if (max !== NULL && value > max) {
                value = max;
            }

            return value;
        },

        _arrows: function() {
            var that = this,
            arrows,
            options = that.options,
            element = that.element;

            arrows = element.siblings(".k-icon");

            if (!arrows[0]) {
                arrows = $(buttonHtml("up", options.upArrowText) + buttonHtml("down", options.downArrowText))
                        .insertAfter(element);
            }

            arrows.bind(MOUSEUP, function(e) {
                if (!touch || kendo.eventTarget(e) != e.currentTarget || e.type === TOUCHEND) {
                    clearTimeout( that._spinning );
                }
            });

            that._upArrow = arrows.eq(0);
            that._downArrow = arrows.eq(1);
        },

        _blur: function() {
            var that = this;

            that._toggleText(true);
            that._change(that.element.val());
        },

        _change: function(value) {
            var that = this;

            that.value(value);
            value = that._value;

            if (that._old != value) {
                that._old = value;
                that.trigger(CHANGE);
            }
        },

        _focusin: function() {
            var that = this;
            clearTimeout(that._bluring);
            that._toggleText(false);
            that.element.focus();
        },

        _focusout: function() {
            var that = this;
            that._bluring = setTimeout(function() {
                that._blur();
            }, 100);
        },

        _format: function(format) {
            var that = this,
                options = that.options,
                numberFormat = kendo.culture().numberFormat;


            if (format.indexOf("c") > -1) {
                numberFormat = numberFormat.currency;
            } else if (format.indexOf("p") > -1) {
                numberFormat = numberFormat.percent;
            }

            return numberFormat;
        },

        _input: function() {
            var that = this,
                CLASSNAME = "k-formatted-value",
                element = that.element.show()[0],
                wrapper = that.wrapper,
                text;

           text = wrapper.find(POINT + CLASSNAME);

            if (!text[0]) {
                text = $("<input />").insertBefore(element).addClass(CLASSNAME);//.hide()
            }

            text[0].style.cssText = element.style.cssText;
            that._text = text.addClass(element.className);
        },

        _keydown: function(e) {
            var that = this,
                key = e.keyCode;

            if (key == keys.DOWN) {
                that._step(-1);
            } else if (key == keys.UP) {
                that._step(1);
            }

            if (that._prevent(key) && !e.ctrlKey) {
                e.preventDefault();
            }
        },

        _paste: function(e) {
            var that = this,
                element = e.target,
                value = element.value;
                setTimeout(function() {
                    if (parse(element.val()) === null) {
                        that.value(value);
                    }
                });

        },

        _prevent: function(key) {
            var that = this,
                prevent = true,
                min = that.options.min,
                element = that.element[0],
                value = element.value,
                separator = that._format(that.options.format)[POINT],
                idx = caret(element),
                end;

            if ((key > 16 && key < 21)
             || (key > 32 && key < 37)
             || (key > 47 && key < 58)
             || (key > 95 && key < 106)
             || key == 45 /* INSERT */
             || key == 46 /* DELETE */
             || key == keys.LEFT
             || key == keys.RIGHT
             || key == keys.TAB
             || key == keys.BACKSPACE
             || key == keys.ENTER) {
                prevent = false;
            } else if (decimals[key] === separator && value.indexOf(separator) == -1) {
                prevent = false;
            } else if ((min === NULL || min < 0) && value.indexOf("-") == -1 && (key == 189 || key == 109) && idx == 0) { //sign
                prevent = false;
            } else if (key == 110 && value.indexOf(separator) == -1) {
                end = value.substring(idx);

                element.value = value.substring(0, idx) + separator + end;
            }

            return prevent;
        },

        _spin: function(step, timeout) {
            var that = this;

            timeout = timeout || 500;

            clearTimeout( that._spinning );
            that._spinning = setTimeout(function() {
                that._spin(step, 50);
            }, timeout );

            that._step(step);
        },

        _step: function(step) {
            var that = this,
                element = that.element,
                value = parse(element.val()) || 0;

            if (document.activeElement != element[0]) {
                that._focusin();
            }

            value += that.options.step * parse(step);

            value = that._adjust(value);
            that.value(value);
        },

        _toggleHover: function(e) {
            if (!touch) {
                $(e.currentTarget).toggleClass(HOVER, e.type === "mouseenter");
            }
        },

        _toggleText: function(toggle) {
            var that = this;

            that._text.toggle(toggle);
            that.element.toggle(!toggle);
        },

        _wrapper: function() {
            var that = this,
                element = that.element,
                wrapper;

            wrapper = element.parent();

            if (!wrapper.is("span.k-widget")) {
                wrapper = element.hide().wrap("<span/>").parent();
            }

            wrapper[0].style.cssText = element[0].style.cssText;
            that.wrapper = wrapper.addClass("k-widget k-textbox").show();
        }
    });

    function buttonHtml(className, text) {
        return '<span class="k-link k-icon k-arrow-' + className + '" title="' + text + '">' + text + '</span>'
    }

    function caret(element) {
        var position = -1;
        if (document.selection) {
            position = element.value.indexOf(element.document.selection.createRange().text);
        } else if (element.selectionStart !== undefined) {
            position = element.selectionStart;
        }

        return position;
    }

    ui.plugin(TextBox);
})(jQuery);
