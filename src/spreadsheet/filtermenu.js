(function(f, define){
    define([ "../kendo.core", "../kendo.popup", "../kendo.treeview", "../kendo.numerictextbox", "../kendo.datepicker", "../kendo.datetimepicker" ], f);
})(function(){

    (function(kendo) {
        if (kendo.support.browser.msie && kendo.support.browser.version < 9) {
            return;
        }

        var $ = kendo.jQuery;
        var Widget = kendo.ui.Widget;
        var classNames = {
            details: "k-details",
            button: "k-button",
            detailsSummary: "k-details-summary",
            detailsContent: "k-details-content",
            icon: "k-icon k-font-icon",
            iconCollapse: "k-i-collapse-se",
            iconExpand: "k-i-expand-e",
            iconSearch: "k-i-search",
            textbox: "k-textbox",
            wrapper: "k-spreadsheet-filter-menu",
            filterByCondition: "k-spreadsheet-condition-filter",
            filterByValue: "k-spreadsheet-value-filter",
            valuesTreeViewWrapper: "k-spreadsheet-value-treeview-wrapper",
            actionButtons: "k-action-buttons"
        };

        var Details = Widget.extend({
            init: function(element, options) {
                Widget.fn.init.call(this, element, options);

                this.element.addClass(FilterMenu.classNames.details);

                this._summary = this.element.find("." + FilterMenu.classNames.detailsSummary)
                    .on("click", this._toggle.bind(this));

                var iconClass = options.expanded ? FilterMenu.classNames.iconCollapse : FilterMenu.classNames.iconExpand;
                this._icon = $("<span />", { "class": FilterMenu.classNames.icon + " " + iconClass })
                    .prependTo(this._summary);

                this._container = kendo.wrap(this._summary.next(), true);

                if (!options.expanded) {
                    this._container.hide();
                }
            },
            options: {
                name: "Details"
            },
            events: [ "toggle" ],
            visible: function() {
                return this.options.expanded;
            },
            toggle: function(show) {
                var animation = kendo.fx(this._container).expand("vertical");

                animation.stop()[show ? "reverse" : "play"]();

                this._icon.toggleClass(FilterMenu.classNames.iconExpand, show)
                          .toggleClass(FilterMenu.classNames.iconCollapse, !show);

                this.options.expanded = !show;
            },
            _toggle: function() {
                var show = this.visible();
                this.toggle(show);
                this.trigger("toggle", { show: show });
            }
        });

        var FILTERMENU_MESSAGES = kendo.spreadsheet.messages.filterMenu = {
            sortAscending: "Sort range A to Z",
            sortDescending: "Sort range Z to A",
            filterByValue: "Filter by value",
            filterByCondition: "Filter by condition",
            apply: "Apply",
            search: "Search",
            addToCurrent: "Add to current selection",
            clear: "Clear",
            blanks: "(Blanks)",
            operatorNone: "None",
            and: "AND",
            or: "OR",
            operators: {
                string: {
                    contains: "Text contains",
                    doesnotcontain: "Text does not contain",
                    startswith: "Text starts with",
                    endswith: "Text ends with"
                },
                date: {
                    eq:  "Date is",
                    neq: "Date is not",
                    lt:  "Date is before",
                    gt:  "Date is after"
                },
                number: {
                    eq: "Is equal to",
                    neq: "Is not equal to",
                    gte: "Is greater than or equal to",
                    gt: "Is greater than",
                    lte: "Is less than or equal to",
                    lt: "Is less than"
                }
            }
        };

        kendo.data.binders.spreadsheetFilterValue = kendo.data.Binder.extend({
            init: function(element, bindings, options) {
                kendo.data.Binder.fn.init.call(this, element, bindings, options);

                this._change = $.proxy(this.change, this);
                $(this.element).on("change", this._change);
            },
            refresh: function() {
                var that = this,
                    value = that.bindings.spreadsheetFilterValue.get(); //get the value from the View-Model

                $(that.element).val(value instanceof Date ? "" : value);
            },
            change: function() {
                var value = this.element.value;
                this.bindings.spreadsheetFilterValue.set(value); //update the View-Model
            }
        });

        kendo.data.binders.widget.spreadsheetFilterValue = kendo.data.Binder.extend({
            init: function(widget, bindings, options) {
                kendo.data.Binder.fn.init.call(this, widget.element[0], bindings, options);

                this.widget = widget;
                this._change = $.proxy(this.change, this);
                this.widget.first("change", this._change);
            },
            refresh: function() {
                var binding = this.bindings.spreadsheetFilterValue,
                    value = binding.get(),
                    type = $(this.widget.element).data("filterType");

                if ((type === "date" && value instanceof Date) || (type === "number" && !isNaN(value))) {
                    this.widget.value(value);
                } else {
                    this.widget.value(null);
                }
            },
            change: function() {
                var value = this.widget.value(),
                    binding = this.bindings.spreadsheetFilterValue;

                binding.set(value);
            }
        });

        var templates = {
            filterByValue:
                "<div class='" + classNames.detailsSummary + "'>#= messages.filterByValue #</div>" +
                "<div class='" + classNames.detailsContent + "'>" +
                    "<div class='k-textbox k-space-right'>" +
                        "<input placeholder='#= messages.search #' data-#=ns#bind='events: { input: filterValues }' />" +
                        "<span class='k-icon k-font-icon k-i-search' />" +
                    "</div>" +
                    "<div data-#=ns#bind='visible: hasActiveSearch'><input class='k-checkbox' type='checkbox' data-#=ns#bind='checked: appendToSearch' id='_#=guid#' /><label class='k-checkbox-label' for='_#=guid#'>#= messages.addToCurrent #</label></div>" +
                    "<div class='" + classNames.valuesTreeViewWrapper + "'>" +
                        "<div data-#=ns#role='treeview' " +
                            "data-#=ns#checkboxes='{ checkChildren: true }' "+
                            "data-#=ns#bind='source: valuesDataSource, events: { check: valuesChange, select: valueSelect }' "+
                            "/>" +
                    "</div>" +
                "</div>",
            filterByCondition:
                "<div class='" + classNames.detailsSummary + "'>#= messages.filterByCondition #</div>" +
                "<div class='" + classNames.detailsContent + "'>" +
                    '<div>' +
                        '<select ' +
                            'data-#=ns#role="dropdownlist"' +
                            'data-#=ns#bind="value: operator, source: operators, events: { change: operatorChange } "' +
                            'data-value-primitive="false"' +
                            'data-option-label="#=messages.operatorNone#"' +
                            'data-height="auto"' +
                            'data-text-field="text"' +
                            'data-value-field="unique">'+
                        '</select>'+
                    '</div>' +

                    '<div data-#=ns#bind="visible: isString">' +
                        '<input data-filter-type="string" data-#=ns#bind="spreadsheetFilterValue: customFilter.criteria[0].value" class="k-textbox" />'+
                    '</div>' +

                    '<div data-#=ns#bind="visible: isNumber">' +
                        '<input data-filter-type="number" data-#=ns#role="numerictextbox" data-#=ns#bind="spreadsheetFilterValue: customFilter.criteria[0].value" />'+
                    '</div>' +

                    '<div data-#=ns#bind="visible: isDate">' +
                        '<input data-filter-type="date" data-#=ns#role="datepicker" data-#=ns#bind="spreadsheetFilterValue: customFilter.criteria[0].value" />'+
                    '</div>' +
                "</div>",
            menuItem:
                "<li data-command='#=command#' data-dir='#=dir#'>" +
                    "<span class='k-icon k-font-icon k-i-#=iconClass#'></span>#=text#" +
                "</li>",
            actionButtons:
                "<button data-#=ns#bind='click: apply' class='k-button k-primary'>#=messages.apply#</button>" +
                "<button data-#=ns#bind='click: clear' class='k-button'>#=messages.clear#</button>"
        };

        function distinctValues(values) {
            var hash = {};
            var result = [];

            for (var i = 0; i < values.length; i++) {
                if (!hash[values[i].value]) {
                    hash[values[i].value] = values[i];
                    result.push(values[i]);
                } else if (!hash[values[i].value].checked && values[i].checked) {
                    hash[values[i].value].checked = true;
                }
            }

            return result;
        }

        function filter(dataSource, query) {
            var hasVisibleChildren = false;
            var data = dataSource instanceof kendo.data.HierarchicalDataSource && dataSource.data();

            for (var i = 0; i < data.length; i++) {
                var item = data[i];
                var text = item.text.toLowerCase();
                var itemVisible = query === true || query === "" || text.indexOf(query) >= 0;

                var anyVisibleChildren = filter(item.children, itemVisible || query); // pass true if parent matches

                hasVisibleChildren = hasVisibleChildren || anyVisibleChildren || itemVisible;

                item.hidden = !itemVisible && !anyVisibleChildren;
                item.checked = !item.hidden;
            }

            if (data) {
                // re-apply filter on children
                dataSource.filter({ field: "hidden", operator: "neq", value: true });
            }

            return hasVisibleChildren;
        }

        function uncheckAll(dataSource) {
            var data = dataSource instanceof kendo.data.HierarchicalDataSource && dataSource.data();

            for (var i = 0; i < data.length; i++) {
                var item = data[i];
                item.checked = false;

                if (item.hasChildren) {
                    uncheckAll(item.children);
                }
            }
        }

        var FilterMenuViewModel = kendo.spreadsheet.FilterMenuViewModel = kendo.data.ObservableObject.extend({
            valuesChange: function(e) {
                var dataSource = e ? e.sender.dataSource : this.valuesDataSource;
                var checked = function(item) {
                    return item.checked && item.value;
                };
                var value = function(item) {
                    return item.dataType === "date" ? kendo.spreadsheet.dateToNumber(item.value) : item.value;
                };
                var unique = function(value, index, array) {
                    return array.lastIndexOf(value) === index;
                };
                var data = dataSource.data();
                var values = data[0].children.data().toJSON();
                var blanks = values.filter(function(item) {
                    return item.dataType === "blank";
                });

                blanks = blanks.length ? blanks[0].checked : false;
                values = values.filter(checked).map(value);

                if (this.appendToSearch && this.valueFilter && this.valueFilter.values.length) {
                    values = values.concat(this.valueFilter.values.toJSON()).sort().filter(unique);
                }

                this.set("valueFilter", {
                    values: values,
                    blanks: blanks
                });
            },
            valueSelect: function(e) {
                e.preventDefault();

                var node = e.sender.dataItem(e.node);
                node.set("checked", !node.checked);
            },
            hasActiveSearch: false,
            appendToSearch: false,
            filterValues: function(e) {
                var query = typeof e == "string" ? e : $(e.target).val().toLowerCase();
                var dataSource = this.valuesDataSource;

                this.set("hasActiveSearch", !!query);

                uncheckAll(dataSource);
                filter(dataSource, query);
            },
            reset: function() {
                this.set("customFilter", { logic: "and", criteria: [ { operator: null, value: null } ] });
                this.set("valueFilter", { values: [] });
            },
            operatorChange: function(e) {
                var dataItem = e.sender.dataItem();
                this.set("operatorType", dataItem.type);
                this.set("customFilter.criteria[0].operator", dataItem.value);
            },
            isNone: function() {
                return this.get("operatorType") === undefined;
            },
            isString: function() {
                return this.get("operatorType") === "string";
            },
            isNumber: function() {
                return this.get("operatorType") === "number";
            },
            isDate: function() {
                return this.get("operatorType") === "date";
            }
        });

        function flattenOperators(operators) {
            var messages = FILTERMENU_MESSAGES.operators;
            var result = [];
            for (var type in operators) {
                if (!operators.hasOwnProperty(type)) {
                    continue;
                }

                for (var operator in operators[type]) {
                    if (!operators[type].hasOwnProperty(operator)) {
                        continue;
                    }

                    result.push({
                        text: messages[type][operator],
                        value: operator,
                        unique: type + "_" + operator,
                        type: type
                    });
                }
            }
            return result;
        }

        var FilterMenuController = kendo.spreadsheet.FilterMenuController = {
            valuesTree: function(range, column) {
                return [{
                    text: "All",
                    expanded: true,
                    checked: true,
                    items: this.values(range.resize({ top: 1 }), column)
                }];
            },
            values: function(range, column) {
                var values = [];
                var messages = FILTERMENU_MESSAGES;
                var columnRange = range.column(column);
                var sheet = range.sheet();

                columnRange.forEachCell(function(row, col, cell) {
                    if (cell.value === undefined) {
                        cell.dataType = "blank";
                    } else if (cell.format) {
                        cell.dataType = kendo.spreadsheet.formatting.type(cell.value, cell.format);
                    } else {
                        cell.dataType = typeof cell.value;
                    }

                    if (cell.value !== null && cell.format) {
                        cell.text = kendo.spreadsheet.formatting.text(cell.value, cell.format);
                    } else {
                        cell.text = cell.value ? cell.value : messages.blanks;
                    }

                    if (cell.dataType === "percent") { //treat percent as number
                        cell.dataType = "number";
                    }

                    if (cell.dataType === "date") {
                        cell.value = kendo.spreadsheet.numberToDate(cell.value);
                    }

                    if (cell.hasOwnProperty("wrap")) {
                        delete cell.wrap;
                    }

                    cell.checked = !sheet.isHiddenRow(row);

                    values.push(cell);
                });

                values = distinctValues(values);

                values.sort(function(a, b) {
                    if (a.dataType === b.dataType) {
                        return 0;
                    }

                    if (a.dataType === "blank" || b.dataType === "blank") {
                        return a.dataType === "blank" ? -1 : 1;
                    }

                    if (a.dataType === "number" || b.dataType === "number") {
                        return a.dataType === "number" ? -1 : 1;
                    }

                    if (a.dataType === "date" || b.dataType === "date") {
                        return a.dataType === "date" ? -1 : 1;
                    }

                    return 0;
                });

                return values;
            },

            filterType: function(range, column) {
                // 1. try to infer type from current filter
                var sheet = range.sheet();
                var filter = this.filterForColumn(column, sheet);
                var type;

                filter = filter && filter.filter.toJSON();

                if (filter && filter.filter == "custom") {
                    var value = filter.criteria[0].value;

                    if (value instanceof Date) {
                        type = "date";
                    } else if (typeof value == "string") {
                        type = "string";
                    } else if (typeof value == "number") {
                        type = "number";
                    }
                }

                if (!type) {
                    // 2. try to infer type from column data
                    var topValue = this.values(range.row(1), column)[0];
                    type = topValue && topValue.dataType;

                    if (type == "blank") {
                        type = null;
                    }
                }

                return type;
            },

            filterForColumn: function(column, sheet) {
                var allFilters = sheet.filter();
                var filters;

                if (allFilters) {
                    filters =  allFilters.columns.filter(function(item) {
                        return item.index === column;
                    })[0];
                }

                return filters;
            },

            filter: function(column, sheet) {
                var columnFilters = this.filterForColumn(column, sheet);

                if (!columnFilters) {
                    return;
                }

                var options = columnFilters.filter.toJSON();
                var type = options.filter;

                delete options.filter;

                var result = {
                    type: type,
                    options: options
                };

                var criteria = options.criteria;
                if (criteria && criteria.length) {
                    result.operator = criteria[0].operator;
                }

                return result;
            }
        };

        var FilterMenu = Widget.extend({
            init: function(element, options) {
                Widget.call(this, element, options);

                this.element.addClass(FilterMenu.classNames.wrapper);

                this.viewModel = new FilterMenuViewModel({
                    active: "value",
                    operator: null,
                    operators: flattenOperators(this.options.operators),
                    clear: this.clear.bind(this),
                    apply: this.apply.bind(this)
                });

                this._filterInit();
                this._popup();
                this._sort();
                this._filterByCondition();
                this._filterByValue();
                this._actionButtons();
            },

            options: {
                name: "FilterMenu",
                column: 0,
                range: null,
                operators: {
                    string: {
                        contains: "Text contains",
                        doesnotcontain: "Text does not contain",
                        startswith: "Text starts with",
                        endswith: "Text ends with"
                    },
                    date: {
                        eq:  "Date is",
                        neq: "Date is not",
                        lt:  "Date is before",
                        gt:  "Date is after"
                    },
                    number: {
                        eq: "Is equal to",
                        neq: "Is not equal to",
                        gte: "Is greater than or equal to",
                        gt: "Is greater than",
                        lte: "Is less than or equal to",
                        lt: "Is less than"
                    }
                }
            },

            events: [
                "action"
            ],

            destroy: function() {
                Widget.fn.destroy.call(this);

                this.menu.destroy();
                this.valuesTreeView.destroy();
                this.popup.destroy();
            },

            openFor: function(anchor) {
                this.popup.setOptions({ anchor: anchor });
                this.popup.open();
            },

            close: function() {
                this.popup.close();
            },

            clear: function() {
                this.action({
                    command: "ClearFilterCommand",
                    options: {
                        column: this.options.column
                    }
                });
                this.viewModel.reset();
                this.close();
            },

            apply: function() {
                this._active();

                var options = {
                    operatingRange: this.options.range,
                    column: this.options.column
                };

                var valueFilter;
                var customFilter;

                if (this.viewModel.active === "value") {
                    this.viewModel.valuesChange({ sender: this.valuesTreeView });
                    valueFilter = this.viewModel.valueFilter.toJSON();

                    if (valueFilter.values && valueFilter.values.length) {
                        options.valueFilter = valueFilter;
                    }
                } else if (this.viewModel.active === "custom") {
                    customFilter = this.viewModel.customFilter.toJSON();

                    if (customFilter.criteria.length) {
                        options.customFilter = customFilter;
                    }
                }

                if (options.valueFilter || options.customFilter) {
                    this.action({ command: "ApplyFilterCommand", options: options });
                }
            },

            action: function(options) {
                this.trigger("action", $.extend({ }, options));
            },

            _filterInit: function() {
                var column = this.options.column;
                var range = this.options.range;
                var sheet = range.sheet();
                var activeFilter = FilterMenuController.filter(column, sheet);

                if (activeFilter) {
                    var filterType = FilterMenuController.filterType(range, column);

                    this.viewModel.set("active", activeFilter.type);
                    this.viewModel.set(activeFilter.type + "Filter", activeFilter.options);

                    if (activeFilter.type == "custom") {
                        this.viewModel.set("operator", filterType + "_" + activeFilter.operator);
                        this.viewModel.set("operatorType", filterType);
                    }
                } else {
                    this.viewModel.reset();
                }
            },

            _popup: function() {
                this.popup = this.element.kendoPopup({
                    copyAnchorStyles: false
                }).data("kendoPopup");
            },

            _sort: function() {
                var template = kendo.template(FilterMenu.templates.menuItem);
                var messages = FILTERMENU_MESSAGES;
                var items = [
                    { command: "sort", dir: "asc", text: messages.sortAscending, iconClass: "sort-asc" },
                    { command: "sort", dir: "desc", text: messages.sortDescending, iconClass: "sort-desc" }
                ];

                var ul = $("<ul />", {
                    "html": kendo.render(template, items)
                }).appendTo(this.element);

                this.menu = ul.kendoMenu({
                    orientation: "vertical",
                    select: function(e) {
                        var dir = $(e.item).data("dir");
                        var range = this.options.range.resize({ top: 1 });
                        var options = {
                            value: dir,
                            sheet: false,
                            operatingRange: range,
                            column: this.options.column
                        };

                        if (range.isSortable()) {
                            this.action({ command: "SortCommand", options: options });
                        } else {
                            this.close();
                        }
                    }.bind(this)
                }).data("kendoMenu");
            },

            _appendTemplate: function(template, className, details, expanded) {
                var compiledTemplate = kendo.template(template);
                var wrapper = $("<div class='" + className + "'/>").html(compiledTemplate({
                    messages: FILTERMENU_MESSAGES,
                    guid: kendo.guid(),
                    ns: kendo.ns
                }));

                this.element.append(wrapper);

                if (details) {
                    details = new Details(wrapper, { expanded: expanded, toggle: this._detailToggle.bind(this) }); // jshint ignore:line
                }

                kendo.bind(wrapper, this.viewModel);

                return wrapper;
            },

            _detailToggle: function(e) {
                this.element
                    .find("[data-role=details]")
                    .not(e.sender.element)
                    .data("kendoDetails")
                    .toggle(!e.show);
            },

            _filterByCondition: function() {
                var isExpanded = this.viewModel.active === "custom";
                this._appendTemplate(FilterMenu.templates.filterByCondition, FilterMenu.classNames.filterByCondition, true, isExpanded);
            },

            _filterByValue: function() {
                var isExpanded = this.viewModel.active === "value";
                var wrapper = this._appendTemplate(FilterMenu.templates.filterByValue, FilterMenu.classNames.filterByValue, true, isExpanded);

                this.valuesTreeView = wrapper.find("[data-role=treeview]").data("kendoTreeView");

                var values = FilterMenuController.valuesTree(this.options.range, this.options.column);

                this.viewModel.set("valuesDataSource", new kendo.data.HierarchicalDataSource({ data: values }));
            },

            _actionButtons: function() {
                this._appendTemplate(FilterMenu.templates.actionButtons, FilterMenu.classNames.actionButtons, false);
            },

            _active: function() {
                var activeContainer = this.element.find("[data-role=details]").filter(function(index, element) {
                    return $(element).data("kendoDetails").visible();
                });

                if (activeContainer.hasClass(FilterMenu.classNames.filterByValue)) {
                    this.viewModel.set("active", "value");
                } else if (activeContainer.hasClass(FilterMenu.classNames.filterByCondition)) {
                    this.viewModel.set("active", "custom");
                }
            }
        });

        kendo.spreadsheet.FilterMenu = FilterMenu;
        $.extend(true, FilterMenu, { classNames: classNames, templates: templates });

    })(window.kendo);
}, typeof define == 'function' && define.amd ? define : function(a1, a2, a3){ (a3 || a2)(); });
