/**
 * ngTable: Table + Angular JS
 *
 * @author Vitalii Savchuk <esvit666@gmail.com>
 * @url https://github.com/esvit/ng-table/
 * @license New BSD License <http://creativecommons.org/licenses/BSD/>
 */

/**
 * @ngdoc directive
 * @name ngTable.directive:ngTable
 * @restrict A
 *
 * @description
 * Directive that instantiates {@link ngTable.directive:ngTable.ngTableController ngTableController}.
 */
app.directive('ngTable', ['$compile', '$q', '$parse',
    function($compile, $q, $parse) {
        'use strict';

        return {
            restrict: 'A',
            priority: 1001,
            scope: true,
            controller: ngTableController,
            compile: function(element) {
                var columns = [],
                    i = 0,
                    row = null;

                // custom header
                var thead = element.find('> thead');

                // IE 8 fix :not(.ng-table-group) selector
                angular.forEach(angular.element(element.find('tr')), function(tr) {
                    tr = angular.element(tr);
                    if (!tr.hasClass('ng-table-group') && !row) {
                        row = tr;
                    }
                });
                if (!row) {
                    return;
                }
                angular.forEach(row.find('td'), function(item) {
                    var el = angular.element(item);
                    if (el.attr('ignore-cell') && 'true' === el.attr('ignore-cell')) {
                        return;
                    }
                    var parsedAttribute = function(attr, defaultValue) {
                        return function(scope) {
                            return $parse(el.attr('x-data-' + attr) || el.attr('data-' + attr) || el.attr(attr))(scope, {
                                $columns: columns
                            }) || defaultValue;
                        };
                    };

                    var parsedTitle = parsedAttribute('title', ' '),
                        headerTemplateURL = parsedAttribute('header', false),
                        filter = parsedAttribute('filter', false)(),
                        filterTemplateURL = false,
                        filterName = false;

                    if (filter && filter.$$name) {
                        filterName = filter.$$name;
                        delete filter.$$name;
                    }
                    if (filter && filter.templateURL) {
                        filterTemplateURL = filter.templateURL;
                        delete filter.templateURL;
                    }

                    el.attr('data-title-text', parsedTitle()); // this used in responsive table
                    columns.push({
                        id: i++,
                        title: parsedTitle,
                        sortable: parsedAttribute('sortable', false),
                        'class': parsedAttribute('header-class', ''),
                        filter: filter,
                        filterTemplateURL: filterTemplateURL,
                        filterName: filterName,
                        headerTemplateURL: headerTemplateURL,
                        filterData: (el.attr("filter-data") ? el.attr("filter-data") : null),
                        show: (el.attr("ng-show") ? function(scope) {
                            return $parse(el.attr("ng-show"))(scope);
                        } : function() {
                            return true;
                        })
                    });
                });
                return function(scope, element, attrs) {
                    scope.$loading = false;
                    scope.$columns = columns;
                    scope.$filterRow = {};

                    scope.$watch(attrs.ngTable, (function(params) {
                        if (angular.isUndefined(params)) {
                            return;
                        }
                        scope.paramsModel = $parse(attrs.ngTable);
                        scope.params = params;
                    }), true);
                    scope.parse = function(text) {
                        return angular.isDefined(text) ? text(scope) : '';
                    };
                    if (attrs.showFilter) {
                        scope.$parent.$watch(attrs.showFilter, function(value) {
                            scope.show_filter = value;
                        });
                    }
                    if (attrs.disableFilter) {
                        scope.$parent.$watch(attrs.disableFilter, function(value) {
                            scope.$filterRow.disabled = value;
                        });
                    }
                    angular.forEach(columns, function(column) {
                        var def;
                        if (!column.filterData) {
                            return;
                        }
                        def = $parse(column.filterData)(scope, {
                            $column: column
                        });
                        // if we're working with a deferred object, let's wait for the promise
                        if ((angular.isObject(def) && angular.isObject(def.promise))) {
                            delete column.filterData;
                            return def.promise.then(function(data) {
                                // our deferred can eventually return arrays, functions and objects
                                if (!angular.isArray(data) && !angular.isFunction(data) && !angular.isObject(data)) {
                                    // if none of the above was found - we just want an empty array
                                    data = [];
                                } else if (angular.isArray(data)) {
                                    data.unshift({
                                        title: '-',
                                        id: ''
                                    });
                                }
                                column.data = data;
                            });
                        }
                        // otherwise, we just return what the user gave us. It could be a function, array, object, whatever
                        else {
                            return column.data = def;
                        }
                    });
                    if (!element.hasClass('ng-table')) {
                        scope.templates = {
                            header: (attrs.templateHeader ? attrs.templateHeader : 'ng-table/header.html'),
                            pagination: (attrs.templatePagination ? attrs.templatePagination : 'ng-table/pager.html')
                        };
                        var headerTemplate = thead.length > 0 ? thead : angular.element(document.createElement('thead')).attr('ng-include', 'templates.header');
                        var paginationTemplate = angular.element(document.createElement('div')).attr({
                            'ng-table-pagination': 'params',
                            'template-url': 'templates.pagination'
                        });

                        element.find('> thead').remove();

                        element.addClass('ng-table')
                            .prepend(headerTemplate)
                            .after(paginationTemplate);

                        $compile(headerTemplate)(scope);
                        $compile(paginationTemplate)(scope);
                    }
                };
            }
        }
    }
]);