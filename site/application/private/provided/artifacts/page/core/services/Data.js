// the data service combines reusable functionality for loading data arrays in the frontend
// as well as a reusable configuration component that can capture all the necessary information

// basic data operations are only concerned with retrieving series data from the page state or the backend
// this series can be paged if needed and we can jump to different pages etc

// pipelines build on basic data but add in streaming updates/creates/deletes and can do meta calculations on the data to reduce it to a point value or expand it into a matrix
// note that pipelines can be windowed at the start, but the window should not change when streaming is active. streaming updates do not work well with paged window switching.
// we currently recognize 3 types of pipeline data
// - series (basically an array of data, this can be streamingly updated)
// - point: a single conclusion based on a series, for example the maximum, minimum, sum,...
// - matrix: a dynamic series of series calculated on top of a series. For instance a group by

// especially for matrices we can opt to "normalize" them so every entry in the matrix contains an equal amount of entries
// this does require a normalization key to be present in the data, this can be offset either against a predefined series of labels or a calculated sum total of all the labels in the original series
// we can also normalize a basic series vs an expected list of labels if needed

Vue.component("data-mixin", {
	props: {
		page: {
			type: Object,
			required: true
		},
		parameters: {
			type: Object,
			required: false
		},
		childComponents: {
			type: Object,
			required: false
		},
		cell: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	created: function() {
		this.loadData();
		this.watchAll();
		Vue.set(this.state, "filter", this.filter);
		Vue.set(this.state, "records", this.records);
		Vue.set(this.state, "selected", this.selected);
	},
	data: function() {
		return {
			loadPromise: null,
			subscriptions: [],
			records: [],
			selected: [],
			paging: {},
			state: {},
			filter: {},
			loadTimer: null
		}
	},
	methods: {
		clear: function() {
			this.records.splice(0);
		},
		loadDataAsync: function() {
			if (this.loadTimer) {
				clearTimeout(this.loadTimer);
				this.loadTimer = null;
			}
			this.loadTimer = setTimeout(this.loadData, 100);
		},
		loadData: function() {
			var self = this;
			self.clear();
			// abort the previous promise if it still ongoing
			if (this.loadPromise && this.loadPromise.abort) {
				this.loadPromise.abort();
			}
			this.loadPromise = this.$services.data.load({
				instance: this,
				limit: 0,
				handler: function(results, page) {
					self.clear();
					// HOOK
					if (self.postProcess) {
						results = self.postProcess(results);
					}
					nabu.utils.arrays.merge(self.records, results);
				}
			});
		},
		select: function(record, append) {
			if (!append) {
				this.selected.splice(0);
			}
			if (record instanceof Array) {
				nabu.utils.arrays.merge(this.selected, record);
			}
			else if (record) {
				this.selected.push(record);
			}
		},
		unsubscribe: function() {
			this.$services.data.unwatchAll(this.subscriptions);
		},
		watchAll: function() {
			this.unsubscribe();
			var self = this;
			nabu.utils.arrays.merge(this.subscriptions, this.$services.data.watchAll({
				instance: this,
				target: this.cell.state,
				handler: function() {
					Vue.set(self, "data", null);
					self.loadDataAsync();
					self.watchAll();
				}
			}));
		},
		getRuntimeAlias: function () {
			return this.cell.state.runtimeAlias;
		},
		getRuntimeState: function () {
			return this.state;
		},
		getState: function () {
			return {
				properties: {
					filter: this.$services.data.getInputParameters(this.cell.state.operation),
					records: {
						type: "array",
						items: {
							type: "object",
							properties: this.$services.data.getDataDefinition({instance: this})
						}
					},
					selected: {
						type: "array",
						items: {
							type: "object",
							properties: this.$services.data.getDataDefinition({instance: this})
						}
					}
				}
			};
		},
	},
	beforeDestroy: function() {
		this.unsubscribe();
	}
})

Vue.service("data", {
	services: ["swagger"],
	methods: {
		// TODO: we want to add other sources of operations
		// like functions, page-builder-managed services (which perform CRUD and contain state)
		getOperations: function() {
			return this.getSwaggerOperations();	
		},
		getDataOperations: function(name) {
			return this.getSwaggerDataOperations(name);
		},
		execute: function(operationId, parameters) {
			// TODO: differentiate between services, functions...
			return this.$services.swagger.execute(operationId, parameters);	
		},
		getSwaggerOperations: function(accept) {
			var result = [];
			var operations = this.$services.swagger.operations;
			Object.keys(operations).map(function(operationId) {
				if (accept(operations[operationId])) {
					result.push(operations[operationId]);
				}
			});
			result.sort(function(a, b) {
				return a.id.localeCompare(b.id);
			});
			return result;
		},
		getSwaggerDataOperations: function(name) {
			var self = this;
			return this.getSwaggerOperations(function(operation) {
				// must be a get
				var isAllowed = operation.method.toLowerCase() == "get"
					// and contain the name fragment (if any)
					&& (!name || operation.id.toLowerCase().indexOf(name.toLowerCase()) >= 0)
					// must have _a_ response
					&& operation.responses["200"];
				// we also need at least _a_ complex array in the results
				if (isAllowed && operation.responses["200"] != null && operation.responses["200"].schema != null) {
					var schema = operation.responses["200"].schema;
					var definition = self.$services.swagger.definition(schema["$ref"]);
					isAllowed = false;
					if (definition.properties) {
						Object.keys(definition.properties).map(function(field) {
							if (definition.properties[field].type == "array") {
								isAllowed = true;
							}
						});
					}
				}
				return isAllowed;
			});
		},
		getDefinition: function(operationId) {
			var properties = {};
			var operation = this.$services.swagger.operations[operationId];
			if (operation && operation.responses["200"]) {
				var definition = this.$services.swagger.resolve(operation.responses["200"].schema);
				if (definition.properties) {
					var self = this;
					Object.keys(definition.properties).map(function(field) {
						if (definition.properties[field].type == "array") {
							var items = definition.properties[field].items;
							if (items.properties) {
								nabu.utils.objects.merge(properties, items.properties);
							}
						}
					});
				}
			}
			/*else if (this.cell.state.array) {
				var available = this.$services.page.getAvailableParameters(this.page, this.cell);
				var variable = this.cell.state.array.substring(0, this.cell.state.array.indexOf("."));
				var rest = this.cell.state.array.substring(this.cell.state.array.indexOf(".") + 1);
				if (available[variable]) {
					var childDefinition = this.$services.page.getChildDefinition(available[variable], rest);
					if (childDefinition) {
						nabu.utils.objects.merge(properties, childDefinition.items.properties);
					}
				}
			}*/
			return properties;
		},
		getInputParameters: function(operationId) {
			var result = {
				properties: {}
			};
			var self = this;
			var operation = this.$services.swagger.operations[operationId];
			if (operation && operation.parameters) {
				var blacklist = ["limit", "offset", "orderBy", "connectionId"];
				var parameters = operation.parameters.filter(function(x) {
					return blacklist.indexOf(x.name) < 0;
				}).map(function(x) {
					result.properties[x.name] = self.$services.swagger.resolve(x);
				})
			}
			return result;
		},
		
		
		
		
		
		
		
		// input can contain:
		// instance: the instance of your component is expected to contain the regular "page" etc parameters
		// target: the target is where your state is stored (by default this is either cell.state or target)
		// filter: you can pass in an object that represents in the input parameters (e.g. query parameters)
		// 		for instance for the repeat this should be the "this.state.filter"
		// orderBy: you can pass in a string array of order by statements
		// 		for the repeat this should be "this.state.order.by"
		// serviceContext: manipulate the service context
		// page: the page number to load
		// handler: the data handler that will receive the new data
		// we will return a promise for the "main" data result, but in the future there will be multiple handlers (added/modified/deleted through streaming)
		// so the handler logic is also available
		normalizeInput: function(input) {
			var self = this;
			// the input can be a vnode in and off itself
			var instance = input.$vnode ? input : input.instance;
			// don't use other variables directly from the instance
			if (input.$vnode) {
				input = {};
			}
			var target = input.target ? input.target : (instance && instance.cell ? instance.cell.state : instance.target);
			var operation = input.operation ? input.operation : (target ? target.operation : null);
			var array = input.array ? input.array : (target ? target.array : null);
			var bindings = input.bindings ? input.bindings : (target ? target.bindings : null);
			// if you have a filter object on your instance itself (e.g. for data components), we use that
			var filter = input.filter ? input.filter : (instance && instance.filter ? instance.filter : (instance && instance.state ? instance.state.filter : null));
			var orderBy = input.orderBy ? input.orderBy : (instance && instance.state && instance.state.order ? instance.state.order.by : (target ? target.defaultOrderBy : null));
			if (orderBy != null) {
				if (!(orderBy instanceof Array)) {
					orderBy = [orderBy];
				}
				orderBy = orderBy.map(function(single) {
					// if it is an object, we assume the standard layout with "name" and "direction"
					if (self.$services.page.isObject(single)) {
						return single.name + (single.direction ? " " + single.direction : "");
					}
					// otherwise we assume already serialized order by
					else {
						return single;
					}
				});
			}
			var page = input.page ? input.page : (instance ? instance.page : null);
			var pageInstance = input.pageInstance ? input.pageInstance : (page ? this.$services.page.getPageInstance(page, instance) : null);
			var limit = input.limit;
			// a script to modify the data
			var script = input.script ? input.script : (target ? target.script : null);
			// a template of what the output of the script would be, for type generation
			var template = input.template ? input.template : (target ? target.template : null);
			return {
				handler: input.handler,
				target: target,
				operation: operation,
				array: array,
				bindings: bindings,
				filter: filter,
				orderBy: orderBy,
				pageInstance: pageInstance,
				limit: limit,
				script: script,
				page: page,
				serviceContext: input.serviceContext,
				template: template,
				pageNumber: input.pageNumber
			}
		},
		// get the array output field for a given operation
		getArrayOutputField: function(operationId) {
			var operation = this.$services.swagger.operations[operationId];
			if (operation && operation.responses && operation.responses["200"] && operation.responses["200"].schema) {
				var properties = {};
				var definition = this.$services.swagger.resolve(operation.responses["200"].schema);
				var arrays = this.$services.page.getArrays(definition);
				if (arrays.length > 0) {
					var childDefinition = this.$services.page.getChildDefinition(definition, arrays[0]);
					if (childDefinition && childDefinition.items && childDefinition.items.properties) {
						properties[arrays[0]] = childDefinition.items.properties;
					}
				}
				return properties;
			}
		},
		getDataDefinition: function(input) {
			input = this.normalizeInput(input);
			if (input.operation) {
				var operation = this.$services.swagger.operations[input.operation];
				if (operation && operation.responses && operation.responses["200"] && operation.responses["200"].schema) {
					var properties = {};
					var definition = this.$services.swagger.resolve(operation.responses["200"].schema);
					var arrays = this.$services.page.getArrays(definition);
					if (arrays.length > 0) {
						var childDefinition = this.$services.page.getChildDefinition(definition, arrays[0]);
						if (childDefinition && childDefinition.items && childDefinition.items.properties) {
							nabu.utils.objects.merge(properties, childDefinition.items.properties);
						}
					}
					if (definition.properties) {
						Object.keys(definition.properties).map(function(field) {
							if (definition.properties[field].type == "array") {
								var items = definition.properties[field].items;
								if (items.properties) {
									nabu.utils.objects.merge(properties, items.properties);
								}
							}
						});
					}
					return properties;
				}
				else {
					console.warn("Could not resolve data for operation", input.operation);
					return {};
				}
			}
			else if (input.array) {
				var parameters = this.$services.page.getAvailableParameters(input.pageInstance.page, null, true);
				
				var arrayName = input.array;
				var definition = this.$services.page.getChildDefinition({properties:parameters}, arrayName);
				if (!definition && arrayName.indexOf("page.") == 0) {
					definition = this.$services.page.getChildDefinition({properties:parameters}, arrayName.substring("page.".length));
				}
				if (!definition && arrayName.indexOf("parent.") == 0) {
					var parentPage = this.$services.page.pages.filter(function(x) {
						return x.content.name == input.pageInstance.page.content.pageParent;
					})[0];
					if (parentPage) {
						var parentParameters = this.$services.page.getAvailableParameters(parentPage, null, true);
						definition = this.$services.page.getChildDefinition({properties:parentParameters}, arrayName.substring("parent.".length));	
						if (definition == null && arrayName.indexOf("parent.page.") == 0) {
							definition = this.$services.page.getChildDefinition({properties:parentParameters}, arrayName.substring("parent.page.".length));	
						}
					}
				}
				if (definition && definition.items && definition.items.properties) {
					return definition.items.properties;
				}
				else {
					console.warn("Could not resolve data for array", input.array);
					return {};
				}
			}
			// check generation script
			else if (input.script) {
				// TODO: derive from template!
			}
		},
		filterFields: function(input, value) {
			var definition = this.getDataDefinition(input);
			var keys = this.$services.page.getSimpleKeysFor({properties:definition}, true, true);
			if (value) {
				keys = keys.filter(function(x) {
					return x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				});
			}
			return keys;
		},
		// the extracter function can just return a value from the data point
		// or you can do some calculation before returning it, for example a date might have millisecond precision but you want to group by minute
		// the extracter should return an object with two fields:
		// - value: the value we will use for label matching
		// - description: the prettified description to show the user (if it comes up), for example with date formatting
		// if the description does not exist, the value is used
		calculateLabelSeries(series, extracter) {
			var labels = [];
			var capturedValues = [];
			series.forEach(function(entry) {
				var extracted = extracter(entry);
				if (capturedValues.indexOf(extracted.value) < 0) {
					capturedValues.push(extracted.value);
					labels.push(extracted);
				}
			});
			return labels;
		},
		getDataType: function(input) {
			input = this.normalizeInput(input);
			if (input.target && input.target.template) {
				var templated = this.$services.page.eval(input.target.template);
				if (templated instanceof Array) {
					if (templated.length) {
						var instance = templated[0];
						return instance instanceof Array ? "matrix" : "series";
					}
				}
				else {
					return "point";
				}
			}
			return "series";
		},
		// we can generate a time series from a certain date until a certain with a given interval
		// each result can have an "extracter" to get the actual data from the timestamp (e.g. generalized to minute, day,..)
		// and a formatter which extracts a value for human consumption
		getTimeSeries: function(from, until, increment, extracter, formatter) {
			var series = [];
			while (from.getTime() < until.getTime()) {
				var value = extracter(from);
				var description = formatter ? formatter(from) : value;
				series.push({
					value: value,
					description: description
				});
				from = new Date(from.getTime() + increment);
			}
			return series;
		},
		// when a series is normalized against a set of labels, we might conclude that a single label has multiple entries
		// we can use the combiner to combine them into a new data point (e.g. sum them)
		// the default combiner will just return the "last" one
		normalizeSeries(series, extracter, labels, combiner) {
			if (!combiner) {
				combiner = function(matching) { return matching[matching.length - 1]; };
			}
			var result = [];
			var hashed = {};
			series.forEach(function(entry) {
				var extracted = extracter(entry);
				if (hashed[extracted.value] == null) {
					hashed[extracted.value] = [];
				}
				hashed[extracted.value].push(entry);
			});
			labels.forEach(function(label) {
				var matching = hashed[label.value];
				// no matches were found, insert an empty value
				if (matching == null) {
					result.push(null);
				}
				else if (matching.length == 1) {
					result.push(matching[0]);
				}
				else {
					result.push(combiner(matching));
				}
			});
			return result;
		},
		normalizeMatrix(matrix, extracter, labels, combiner) {
			var result = [];
			var self = this;
			matrix.forEach(function(row) {
				result.push(self.normalizeSeries(row, extracter, labels, combiner));
			});
			return result;
		},
		// when creating a matrix from a series, the extracter determines which dynamic series it ends up in
		createMatrix: function(series, extracter) {
			return Object.values(this.group(series, extracter));
		},
		group: function(series, extracter) {
			var hashed = {};
			series.forEach(function(entry) {
				var extracted = extracter(entry);
				var value = extracted.value ? extracted.value : extracted;
				if (hashed[value] == null) {
					hashed[value] = [];
				}
				hashed[value].push(entry);
			})
			return hashed;
		},
		load: function(input) {
			var self = this;
			
			input = this.normalizeInput(input);
			
			var transform = function(data) {
				if (input.script) {
					var result = (new Function('with(this) { return ' + input.script + ' }')).call({
						value: data,
						$value: input.instance.$value,
						state: {data:data},
						$services: self.$services
					});
					//var result = eval(code);
					if (result instanceof Function) {
						result = result.bind(this);
						result = result(value);
					}
					return result;
				}
				else {
					return data;
				}
			}
			
			var promise = this.$services.q.defer();
			
			var handler = function(results, paging, error) {
				results = transform(results);
				if (input.handler) {
					input.handler(results, paging, error);
				}
				if (error) {
					promise.reject(error);
				}
				else {
					promise.resolve({
						records: results,
						paging: paging
					})
				}
			}
			
			// we want to call an operation
			if (input.operation) {
				var parameters = {};
				var self = this;
				if (input.bindings) {
					Object.keys(input.bindings).map(function(name) {
						if (input.bindings[name]) {
							var value = self.$services.page.getBindingValue(input.pageInstance, input.bindings[name], self);
							if (value != null && typeof(value) != "undefined") {
								parameters[name] = value;
							}
						}
					});
				}
				// some components (e.g. repeat) will keep a local value for the filter input parameters
				// this wins from anything bound to the input
				if (input.filter) {
					Object.keys(input.filter).forEach(function(key) {
						// someone might still attempt to write to record?
						// by default the state has no keys
						// any key available is explicitly written by the user, so even a null value is an active decision
						if (key != "record") {
							parameters[key] = input.filter[key];
						}
					});
				}
				if (input.orderBy && input.orderBy.length) {
					parameters["orderBy"] = input.orderBy;
				}
				// if we want to load a certain page, we need a limit
				if (parameters.limit == null) {
					parameters.limit = input.limit != null ? input.limit : 10;
				}
				// limit 0 means no limit
				if (parameters.limit == 0) {
					parameters.limit = null;
				}
				parameters.offset = parameters.limit * (input.pageNumber ? input.pageNumber : 0);
				if (input.serviceContext) {
					parameters["$serviceContext"] = input.serviceContext;
				}
				if (!parameters["$serviceContext"]) {
					parameters["$serviceContext"] = input.pageInstance.getServiceContext();
				}
				this.$services.swagger.execute(input.operation, parameters).then(function(list) {
					if (list) {
						var arrayFound = false;
						var array = null;
						var paging = null;
						var arrayField = Object.keys(self.getArrayOutputField(input.operation))[0];
						var findArray = function(root) {
							array = root[arrayField];
							if (array == null) {
								array = [];
							}
							arrayFound = true;
						}
						findArray(list);
						
						var pageFound = false;
						var findPage = function(root) {
							Object.keys(root).forEach(function(field) {
								// check if we have an object that has the necessary information
								if (typeof(root[field]) === "object" && root[field] != null && !pageFound) {
									// these are the two fields we use and map, check if they exist
									if (root[field].current != null && root[field].total != null) {
										paging = root[field];
										pageFound = true;
									}
									// recurse
									if (!pageFound) {
										findPage(root[field]);
									}
								}
							});
						}
						findPage(list);
						
						handler(array == null ? [] : array, paging == null ? {} : paging);
					}
					else {
						handler([], {});
					}
				}, function(error) {
					handler([], {}, error);
				})
			}
			else if (input.array) {
				var result = input.pageInstance.get(input.array);
				handler(result ? result : [], {});
			}
			else if (input.type) {
				var provider = nabu.page.providers("page-repeat").filter(function(provider) {
					return provider.name == input.type;
				})[0];
				if (provider && provider.loadData) {
					var state = {
						records: []
					}
					var result = provider.loadData(input.target, state, {}, false);
					if (result.then) {
						result.then(function() {
							promise.resolve(state.records);
						}, promise);
					}
					else {
						promise.resolve(state.records);
					}
				}
			}
			return promise;
		},
		uniquify: function(records) {
			var self = this;
			var position = 0;
			// make sure we have the highest before we start
			// if for example we pass in an array from outside, it might already have a position
			records.forEach(function(record) {
				if (record.hasOwnProperty("$position") && record.$position >= position) {
					position = record.$position + 1;
				}
			});
			records.forEach(function(record) {
				if (!record.hasOwnProperty("$position") && typeof(record) != "string" && !(record instanceof String)) {
					record["$position"] = position++;
				}
			});
		},
		unwatchAll: function(watchers) {
			if (watchers) {
				watchers.forEach(function(watcher) {
					if (watcher instanceof Function) {
						watcher();
					}
					else if (watcher instanceof Array) {
						watcher.forEach(function(child) {
							if (child instanceof Function) {
								child();
							}
						});
					}
				});
			}
		},
		watchAll: function(input) {
			var self = this;
			input = this.normalizeInput(input);
			
			var watchers = [];
			// if the target has multiple pipelines, watch them all
			if (input.target.pipelines) {
				nabu.utils.arrays.merge(watchers, input.target.pipelines.map(function(pipeline) {
					var cloned = {};
					nabu.utils.objects.merge(cloned, input);
					cloned.target = pipeline;
					return self.watchAll(cloned);
				}));
			}
			else {
				// watch the data array if that is needed
				watchers.push(this.watchArray(input));
				
				// if we have an operation, we might have bound input values, we want to watch those as well
				if (input.bindings) {
					Object.keys(input.bindings).map(function(name) {
						if (input.bindings[name]) {
							var binding = input.bindings[name];
							if (binding.indexOf("parent.") == 0) {
								// TODO: watch in parent
							}
							else {
								if (binding.indexOf("page.") == 0) {
									binding = binding.substring("page.".length);
								}
								console.log("watching", binding, input.pageInstance.variables, input.handler);
								watchers.push(input.pageInstance.$watch("variables." + binding, input.handler, {deep: true}));
							}
						}
					});
				}				
			}
			return watchers;
		},
		watchArray: function(input) {
			var self = this;
			
			input = this.normalizeInput(input);

			var targetArray = input.array;
			
			var self = this;
			var current = input.pageInstance.get(targetArray);
			var unwatch = null;
			// if it doesn't exist yet, keep an eye on the page state
			// we tried to be more specific and watch direct parents but this _somehow_ failed
			if (current == null) {
				var unwatch = input.pageInstance.$watch("variables", function(newValue) {
					var result = input.pageInstance.get(targetArray);
					if (result != null) {
						input.handler();
						unwatch();
						unwatch = self.watchArray(input);
					}
				}, {deep: true});
			}
			else {
				var stringified = JSON.stringify(current);
				if (targetArray.indexOf("page.") == 0) {
					targetArray = targetArray.substring("page.".length);
				}
				var watchKey = "variables." + targetArray;
				var unwatch = input.pageInstance.$watch(watchKey, function(newValue) {
					if (JSON.stringify(input.pageInstance.get(targetArray)) != stringified) {
						input.handler();
						unwatch();
						// may have unset to null, changed to a different array,...
						unwatch = self.watchArray(input);
					}
				}, {deep: true});
			}
			return function() {
				if (unwatch) {
					unwatch();
				}
			};
		}
	}
});