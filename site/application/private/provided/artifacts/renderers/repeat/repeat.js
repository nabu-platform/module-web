/*
# Repeat providers

Fields:

- name: a logical name
- title: a human readable name

Methods:

- getDefinition(container): get the record definition for the given container
- getActions(target, pageInstance, $services): get all the available actions
- getSpecifications(target): get all the specifications
- loadData(target, state, page, append): load the required data for the given target
	note that you get the full state of the repeat, so you can modify the records and the paging as needed
	it should return a promise
- configurator: the name of the component that can be used for configuration

*/


// TODO: currently we repeat the content within, not the cell/row itself
// it seems more natural to repeat the thing the renderer is _on_ rather than the content?

// TODO: when in edit mode, still load the _first_ instance and set it as state in the local page
// this will allow for visual editing

// the components and functionalities are built around state in a page
// however, the problem in a loop is that, depending on the iteration, we have different state
// this different state can not co-exist at the root of the page, only one thing can be true at a time
// apart from a massive refactor in how state is accessed, the other solution is to create temporary pages
// if we have an array called "mydata.myarray" in the current page
// and we want to repeat over that _and_ keep the data responsive, we need to have a reference-copy of the entry
// because in our example the array is nested, we "could" mock an empty mydata and put in an iteration instead of an array
// however, than you can't access any other data in the mydata object (because its a mock)
// we could do more complex mocking but this seems contrived
// another option is to have you set a "local" variable e.g. myInstance which we make available in the variables of the temporary page


// we don't need to specifically define the events
// if you define an event inside a repeat (e.g. a button), it will already exist in the page and be known
// all we need to do is make sure we shuttle the events from our page fragments to this page


// TO BE CHECKED: if we expose all the operation parameters as a filter
// and you can bind to the state
// why do we need operation binding? do we need it? it seems redundant
nabu.page.provide("page-renderer", {
	title: "Repeat",
	name: "repeat",
	type: ["row", "cell"],
	component: "renderer-repeat",
	configuration: "renderer-repeat-configure",
	getTriggers: function(target, pageInstance, $services) {
		// this ONLY works if you set a runtime alias which is not the cleanest way
		// but it is (currently) the only way to really get the definition
		// the problem in getState is when we depend on OTHER definitions to define ourselves (e.g. when doing the array)
		// for this reason we added the pageParameters workaround, but it is fragile at best
		// anyway, the repeat WITHOUT a runtime alias is quite useless as you can't bind to any data anyway
		// we do know however that there is a select, and we want you to be able to configure it immediately
		// so if we can't resolve the state yet (no runtime alias), we already expose the trigger without any data
		var triggers = {};
		var parameters = null;
		if (pageInstance && target && target.runtimeAlias && target.repeat && target.repeat.selectable) {
			// we need the definition for this
			parameters = $services.page.getAllAvailableParameters(pageInstance.page);
			// sometimes the record does not exist because the definition can not be found (e.g. you have removed the operation)
			if (parameters[target.runtimeAlias] && parameters[target.runtimeAlias].properties.record) {
				triggers.select = {
					items: {
						type: "array",
						items: {
							type: "object",
							properties: parameters[target.runtimeAlias].properties.record.properties
						}
					}
				};
				// we want to trigger on deselect so we can for example show a placeholder
				triggers.deselect = {
				};
			}
			else {
				console.error("Could not get trigger because we could not find the definition for: " + target.runtimeAlias);
			}
		}
		if (pageInstance && target && target.runtimeAlias && target.repeat) {
			parameters = $services.page.getAllAvailableParameters(pageInstance.page);
			// sometimes the record does not exist because the definition can not be found (e.g. you have removed the operation)
			if (parameters[target.runtimeAlias] && parameters[target.runtimeAlias].properties.record) {
				// this can be triggered by embedded form components that will emit the update
				triggers.update = {
					type: "object",
					properties: parameters[target.runtimeAlias].properties.record.properties
				};
			}
		}
		if (parameters) {
			triggers.load = {
				type: "array",
				items: {
					properties: parameters[target.runtimeAlias].properties.record.properties
				}
			};
		}
		return triggers;
	},
	getState: function(container, page, pageParameters, $services) {
		var result = {};
		if (container.repeat) {
			result["recordIndex"] = {type: "int64"};
			if ((container.repeat.type == "operation" || container.repeat.type == null) && container.repeat.operation) {
				var operation = $services.swagger.operations[container.repeat.operation];
				if (operation && operation.responses && operation.responses["200"] && operation.responses["200"].schema) {
					var properties = {};
					var definition = $services.swagger.resolve(operation.responses["200"].schema);
					var arrays = $services.page.getArrays(definition);
					if (arrays.length > 0) {
						var childDefinition = $services.page.getChildDefinition(definition, arrays[0]);
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
					result.record = {properties:properties};
					result.records = {type: "array", items: {type:"object",properties:result.record.properties}};	
					if (container.repeat.raw) {
						result.raw = definition;
					}
					
					var filters = {};
					// we also want to expose the parameters as input
					var parameters = operation.parameters;
					if (parameters) {
						parameters.forEach(function(x) {
							// reserved!
							if (x.name != "record") {
								filters[x.name] = x;
							}
						});
					}
					result.filter = {properties:filters};
//					result["$serviceContext"] = {
//						type: "string"
//					}
				}
			}
			else if ((container.repeat.type == "array" || container.repeat.type == null) && container.repeat.array) {
				var record = {};
				var available = pageParameters;
				var arrayName = container.repeat.array;
				var definition = $services.page.getChildDefinition({properties:available}, arrayName);
				if (!definition && arrayName.indexOf("page.") == 0) {
					definition = $services.page.getChildDefinition({properties:available}, arrayName.substring("page.".length));
				}
				if (definition && definition.items && definition.items.properties) {
					nabu.utils.objects.merge(record, definition.items.properties);
				}
				result.record = {properties:record};
				result.records = {type: "array", items: {properties:record}};

				// sometimes an array is actually at the page level (e.g. external) so we can't just strip out page
				/*
				var record = {};
				var available = pageParameters;
				var arrayName = container.repeat.array;
				if (arrayName.indexOf("page.") == 0) {
					arrayName = arrayName.substring("page.".length);
				}
				var indexOfDot = arrayName.indexOf(".");
				var variable = indexOfDot < 0 ? arrayName : arrayName.substring(0, indexOfDot);
				var rest = indexOfDot < 0 ? null : arrayName.substring(indexOfDot + 1);
				if (available[variable]) {
					// we can have root arrays rather than part of something else
					// for example from a multiselect event
					if (!rest) {
						if (available[variable].items && available[variable].items.properties) {
							nabu.utils.objects.merge(record, available[variable].items.properties);
						}
					}
					else {
						var childDefinition = $services.page.getChildDefinition(available[variable], rest);
						if (childDefinition) {
							nabu.utils.objects.merge(record, childDefinition.items.properties);
						}
					}
				}
				result.record = {properties:record};
				result.records = {type: "array", items: {properties:record}};
				*/
			}
			// check if there is a provider for this repeat
			else {
				nabu.page.providers("page-repeat").forEach(function(provider) {
					if (provider.name == container.repeat.type) {
						result.record = {properties:provider.getDefinition(container)};
						result.records = {type: "array", items: result.record};
					}
				})
			}
			if (result.record && container.repeat.selectable) {
				result["selected"] = {
					type: "array",
					items: {
						type: "object",
						properties: result.record.properties
					}
				}
			}
			// the records array contains the filtered values, we want to add an option to get all the records as well
			if (result.records && container.repeat.arrayFilter) {
				result.allRecords = result.records;
			}
			
			// TODO: not yet finished!
			if (container.repeat.localVariables && container.repeat.localVariables.length) {
				var local = {};
				container.repeat.localVariables.forEach(function(single) {
					if (single.name) {
						var schema = null; 
						if (single.template) {
							var templateValue = $services.page.eval(single.template);
							if (templateValue) {
								schema = $services.page.getSchemaFromObject(templateValue);
							}
						}
						else if (single.definition) {
							schema = $services.swagger.resolve(single.definition);
						}
						else {
							schema = {
								type: "string"
							}
						}
						if (schema) {
							if (single.isArray) {
								local[single.name] = {
									type: "array",
									items: schema
								}
							}
							else {
								local[single.name] = schema;
							}
						}
					}
				})
				result.local = {
					properties: local
				}
			}
		}
		return {properties:result};
	},
	getSlots: function(target) {
		var slots = ["empty", "loading", "appendLoading"];
		if (target.repeat && target.repeat.customSlots && target.repeat.customSlots.length) {
			nabu.utils.arrays.merge(slots, target.repeat.customSlots.map(function(x) { return x.name }));
		}
		return slots;
	},
	getChildComponents: function(target) {
		return [{
			title: "Repeat Content",
			name: "repeat-content",
			component: target.rows ? "row" : "column"
		}, {
			title: "Repeat Message",
			name: "repeat-message",
			component: target.rows ? "row" : "column"
		}, {
			title: "Repeat Empty Message",
			name: "repeat-empty",
			component: target.rows ? "row" : "column"
		}, {
			title: "Repeat Loading Message",
			name: "repeat-loading",
			component: target.rows ? "row" : "column"
		}];
	},
	getActions: function(target, pageInstance, $services) {
		var actions = [];
		// can only refresh if there is an operation
		if (target.repeat && target.repeat.operation) {
			var action = {
				title: "Refresh",
				name: "refresh",
				input: {
				},
				output: {
				}
			};
			// check if we are browseable
			var renderer = nabu.page.providers("page-renderer").filter(function(x) { return x.name == "repeat" })[0];
			if (renderer && renderer.getSpecifications(target).indexOf("pageable") >= 0) {
				// usually you refresh because something changed/was added/removed/...
				// in that case, the page you are on is unlikely to have the current details
				// so you want to reset the page count to 0
				// however, sometimes you want to refresh because some internal state was updated on the current page (e.g. task reprocessing)
				action.input.retainOffset = {
					type: "boolean"
				};
			}
			actions.push(action);
		}
		else if (target.repeat) {
			var provider = nabu.page.providers("page-repeat").filter(function(provider) {
				return provider.name == target.repeat.type;
			})[0];
			if (provider && provider.getActions) {
				nabu.utils.arrays.merge(provider.getActions(target, pageInstance, $services));
			}
		}
		if (pageInstance && target && target.runtimeAlias && target.repeat && target.repeat.selectable) {
			// we need the definition for this
			var parameters = $services.page.getAllAvailableParameters(pageInstance.page);
			// sometimes the record does not exist because the definition can not be found (e.g. you have removed the operation)
			if (parameters[target.runtimeAlias] && parameters[target.runtimeAlias].properties.record) {
				var action = {
					title: "Select",
					name: "select",
					input: {
						items: {
							type: "array",
							items: {
								type: "object",
								properties: parameters[target.runtimeAlias].properties.record.properties
							}
						},
						append: {
							type: "boolean"
						}
					},
					output: {}
				};
				actions.push(action);
			}
			else {
				console.error("Could not add select action because the definition could not be found for: " + target.runtimeAlias);
			}
		}
		if (target.repeat && target.repeat.customSlots && target.repeat.customSlots.length) {
			var action = {
				title: "Toggle Slot",
				name: "toggle-slot",
				input: {
					// the name of the slot we want to toggle
					slot: {
						type: "string"
					},
					// the index we want to toggle
					index: {
						type: "int64"
					},
					// if not filled in we toggle, otherwise we explicitly show or hide
					show: {
						type: "boolean"
					}
				},
				output: {}
			};
			actions.push(action);
		}
		return actions;
	},
	getSpecifications: function(target) {
		// TODO: check that it is an operation _and_ it has limit/offset capabilities
		//return [];
		var specifications = [];
		if (target.repeat && (target.repeat.type == "operation" || target.repeat.type == null) && target.repeat.operation) {
			var operation = application.services.swagger.operations[target.repeat.operation];
			if (operation) {
				var parameters = operation.parameters.map(function(x) { return x.name });
				if (parameters.indexOf("limit") >= 0 && parameters.indexOf("offset") >= 0) {
					specifications.push("pageable");
					specifications.push("browseable");
				}
				if (parameters.indexOf("orderBy") >= 0) {
					specifications.push("orderable");
				}
			}
		}
		else if (target.repeat) {
			var provider = nabu.page.providers("page-repeat").filter(function(provider) {
				return provider.name == target.repeat.type;
			})[0];
			if (provider && provider.getSpecifications) {
				nabu.utils.arrays.merge(provider.getSpecifications(target));
			}
		}
		return specifications;
		//return ["pageable", "browseable"];
	}
});

var $$rendererInstanceCounter = 0;
Vue.component("renderer-repeat", {
	template: "#renderer-repeat",
	mixins: [nabu.page.mixins.renderer],
	props: {
		page: {
			type: Object,
			required: true
		},
		// the target (cell or row)
		target: {
			type: Object,
			required: true
		},
		parameters: {
			type: Object,
			required: false
		},
		// whether or not we are in edit mode (we can do things slightly different)
		edit: {
			type: Boolean,
			required: false
		},
		childComponents: {
			type: Object,
			required: false
		}
	},
	data: function() {
		return {
			loadPromise: null,
			destroyed: false,
			repeatTimer: null,
			created: false,
			loadCounter: 0,
			// the instance counter is used to manage our pages on the router
			instanceCounter: $$rendererInstanceCounter++,
			loading: false,
			// when loading new data you want to append, we don't want to show the full load indicator but a small append load indicator
			appendLoading: false,
			fragmentPage: null,
			// each slot has its own page
			fragmentPages: {},
			// position counter to make each record unique
			position: 0,
			lastParameters: null,
			lastFilter: null,
			// for each custom slot (key), we have an array of active indexes
			activatedSlots: {},
			// the state in the original page, this can be used to write stuff like "limit" etc to
			// note that the "record" will not actually be in this
			state: {
				raw: {},
				// the selected
				selected: [],
				order: {
					by: []
				},
				filter: {},
				records: [],
				allRecords: [],
				// if we don't define the fields AND we don't use Vue.set to update them, they are not reactive!
				paging: {
					current: 0,
					total: 0,
					pageSize: 0,
					rowOffset: 0,
					totalRowCount: 0
				}
			}
		}
	},
	/*
	render: function(f) {
		console.log("rendering repeat", f);
		console.log("slots are", this.$slots);
		return f("div2", this.$slots.default);
	},
	*/
	created: function() {
		// the parameters that we pass in contain the bound values
		var self = this;
		
		// first map the default order by, we might overwrite it with the input mappings
		if (this.target.repeat && this.target.repeat.defaultOrderBy) {
			nabu.utils.arrays.merge(this.state.order.by, this.target.repeat.defaultOrderBy.map(function(x) {
				return x.name + " " + (x.direction ? x.direction : "asc") + (x.nulls ? " " + x.nulls : "");
			}));
		}
		
		// the problem is, we want to do an initial load always
		// however, by the act of modifying the state if you have bindings, we trigger the watcher for state.filter which will also do a reload
		// so we want behavior that if we don't do any state mappings, we do an initial load
		// if a filter change comes in because of initial mapping, we ignore it
		this.mergeParameters();
		
		if (this.target.repeat && this.target.repeat.customSlots && this.target.repeat.customSlots.length) {
			this.target.repeat.customSlots.forEach(function(slot) {
				Vue.set(self.activatedSlots, slot.name, []);
			});
		}
		
		this.loadPages();
		
		this.watchArray();
		
		// initialize so it includes all the external bound parameters
		this.lastFilter = JSON.stringify(this.normalizeParametersForComparison(this.state.filter));
		// note that this is NOT an activate, we can not stop the rendering until the call is done
		// in the future we could add a "working" icon or a placeholder logic
		if (!this.target.repeat || !this.target.repeat.waitForPageLoad) {
			this.loadData();
		}
		
		if (this.target.repeat && this.target.repeat.localVariables) {
			this.target.repeat.localVariables.forEach(function(variable) {
				// initialize as null
				Vue.set(self.state.local, variable.name, null);
			})
		}
	},
	mounted: function() {

	},
	computed: {
		alias: function() {
			return "fragment-renderer-repeat-" + this.instanceCounter;
		},
		operationParameters: function() {
			var parameters = {};
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			var self = this;
			if (this.target.repeat && this.target.repeat.bindings) {
				Object.keys(this.target.repeat.bindings).map(function(name) {
					if (self.target.repeat.bindings[name]) {
						var value = self.$services.page.getBindingValue(pageInstance, self.target.repeat.bindings[name], self);
						if (value != null && typeof(value) != "undefined") {
							parameters[name] = value;
						}
					}
				});
			}
			return parameters;
		}
	},
	watch: {
		'$services.page.stable': function(stable) {
			if (stable && !this.created && this.target.repeat && this.target.repeat.waitForPageLoad) {
				var self = this;
				Vue.nextTick(function() {
					// if you toggle the "stable" requirement, it is very likely you want to change settings like the filter
					// because we haven't actually loaded the data yet, we can safely update the filter here to reflect what we will load
					self.lastFilter = JSON.stringify(self.normalizeParametersForComparison(self.state.filter));
					self.created = true;
					self.loadData();
				});
			}	
		},
		'$services.page.editing': function(editing) {
			// if we leave edit mode, the stable boolean is not triggered, use the edit boolean to achieve the same result
			if (!editing && !this.created && this.target.repeat && this.target.repeat.waitForPageLoad) {
				this.created = true;
				this.loadData();
			}	
		},
		// the parameters that are passed in by the page are calculated against the global state maintained in "variables"
		// by doing a loadData, we update the state in the repeat which is exposed globally as well in the variables
		// even though the actual parameter values are not changed, the container that holds them, has been so this triggers a recalculate of parameters at the page level
		// which in turn triggers this watcher, which triggers a load, which triggers this watcher etc....
		// the only way to break this cycle is to check if anything _actually_ changed
		parameters: {
			deep: true,
			handler: function(newValue, oldValue) {
				var newParameters = JSON.stringify(this.normalizeParametersForComparison(newValue));
				if (this.lastParameters != newParameters && this.created && this.target.repeat.enableParameterWatching) {
					this.mergeParameters();
					this.loadData();
				}
				this.lastParameters = newParameters;
			}
		},
		// we don't want to watch paging, it is the output
		operationParameters: function() {
			this.loadData();	
		},
		"state.filter": {
			deep: true,
			handler: function(newValue) {
				if (this.created) {
					var newFilter = JSON.stringify(this.normalizeParametersForComparison(newValue));
					if (this.lastFilter != newFilter) {
						this.loadData();
					}
					this.lastFilter = newFilter;
				}
			}
		},
		// if we have changed the order by, rerun it!
		// same however as with filters, not if it's an initial one
		"state.order.by": function() {
			if (this.created) {
				this.loadData();
			}
		}
	},
	beforeDestroy: function() {
		this.destroyed = true;
		this.unloadPages();
		if (this.repeatTimer) {
			clearTimeout(this.repeatTimer);
		}
	},
	methods: {
		// TODO: suppose you have a form inside the repeat, its state is _always_ localized to the repeat and should not be pushed to the parent page
		// recognizing this localized state requires inspection in the page of all cells/rows and should be limited to runtime aliases
		// currently the state _is_ upstreamed but should be kept in sync, you can not however have two separate repeat instances pushing the same state
		// if this becomes necessary, do a recursive check and cache the results to blacklist upstreaming those values
		
		// inside the repeat (e.g. when creating more complex cards) we may want to alter state on the page that has nothing to do with the repeat
		// however we don't want to only alter the state of our own fragmented page because that will not feed back into the rest of the page and unrelated components
		// a repeat only has a localized (non-similar) state its own repeat stuff
		// for everything else, it should have an up to date copy of the state (ASSUMPTION!)
		// an initial set is just to get the fragment page up and running and does not need to be propagated
		// for nested repeats: they only push to their own parent which in turn should know whether or not it can push the change further on
		repeatSetter: function(instance, name, value, label, initial) {
			// initial sets are never propagated
			if (initial || !instance.fragmentParent || (this.target.runtimeAlias && (name == this.target.runtimeAlias || "page." + name == this.target.runtimeAlias || name.indexOf(this.target.runtimeAlias + ".") == 0 || name.indexOf("page." + this.target.runtimeAlias + ".") == 0))) {
				instance.internalSet(name, value, label);
			}
			else {
				// we _also_ need it locally
				// it is not yet clear why, but previously it was _always_ set locally, so only the upstreaming is new
				instance.internalSet(name, value, label);
				instance.fragmentParent.set(name, value, label);
			}
		},
		collapseAllSlots: function() {
			var self = this;
			Object.keys(this.activatedSlots).forEach(function(slot) {
				self.activatedSlots[slot].splice(0);
			});
		},
		getAdditionalSlots: function(index) {
			var result = [];
			var self = this;
			Object.keys(this.activatedSlots).forEach(function(slot) {
				if (self.activatedSlots[slot].indexOf(index) >= 0) {
					result.push(slot);
				}
			})
			return result;
		},
		normalizeParametersForComparison: function(parameters) {
			var cloned = JSON.parse(JSON.stringify(parameters));
			var normalize = function(object) {
				Object.keys(object).forEach(function(key) {
					var value = object[key];
					if (value == null) {
						delete object[key];
					}
					// empty arrays are removed
					else if (value instanceof Array && value.length == 0) {
						delete object[key];
					}
					// empty strings are removed
					else if (value === "") {
						delete object[key];
					}
					else if (typeof(value) == "object") {
						normalize(value);
					}
				})
			}
			normalize(cloned);
			return cloned;
		},
		update: function(record, value, label, field) {
			return this.$services.triggerable.trigger(this.target, "update", record, this);
		},
		mergeParameters: function() {
			var self = this;
			this.created = false;
			var stateModified = false;
			var blacklist = ["records", "paging"];
			
			// in the past we based our merging off of the parameters that were passed in
			// but these are always objects, so if you bind "filter.limit", you pass in a full filter object with one param: limit
			// null values were ignored which means you could never "unset" a value from the outside
			
			// currently, IF you have input watching enabled, you should make sure the internal state and the outside state are "in sync"
			// otherwise suppose you map 2 fields
			// 1 field is updated internally, then the other is updated externally
			// due to the external update, we map back both values
			// the only way to prevent a reset on that first internal value is to diff the bound values with the previous value
			// we _could_ do that but currently we want to see if it is not better to keep that state in sync
			// for instance when using tags to delete a filter value, don't delete the filter value itself, but the outside source that is bound
			// if you have a filter search field, bind it to the outside source, not directly the filter itself
			// alternatively you could disable input watching and work on your own state
			// if a usecase arises where this is not possible, we can add diffing against the previous bound value and only update if the outside source was actually changed
			
			//var pageInstance = this.$services.page.getPageInstance(this.page, this);
			Object.keys(this.target.rendererBindings).forEach(function(key) {
				// if we have a binding for it, check it!
				if (self.target.rendererBindings[key]) {
					//self.$services.page.setValue(self.state, key, self.$services.page.getBindingValue(pageInstance, self.target.rendererBindings[key], self));
					// we do assume the values to be available in the bound parameters, preventing the need of an additional lookup
					var currValue = self.$services.page.getValue(self.state, key);
					var newValue = self.$services.page.getValue(self.parameters, key);
					if (currValue != newValue) {
						self.$services.page.setValue(self.state, key, newValue);
						stateModified = true;
					}
				}
			});
			return stateModified;
			// the old stuff!
			/*
			// these are objects like "filters", "orderBy" etc
			Object.keys(this.parameters).forEach(function(key) {
				// we want to _merge_ the filter, not just overwrite it!
				if (key == "filter") {
					var filter = self.parameters[key];
					var filterKeys = [];
					if (filter) {
						filterKeys = Object.keys(filter)
						filterKeys.forEach(function(filterKey) {
							Vue.set(self.state.filter, filterKey, filter[filterKey]);
						});
					}
				}
				else if (blacklist.indexOf(key) < 0 && self.parameters[key] != null && self.state[key] != self.parameters[key]) {
					Vue.set(self.state, key, self.parameters[key]);
					stateModified = true;
				}
			});
			return stateModified;
			*/
		},
		getOrderByFields: function() {
			var result = [];
			if (this.target.repeat && this.target.repeat.operation) {
				var operation = this.$services.swagger.operation(this.target.repeat.operation);	
				var self = this;
				if (operation && operation.parameters) {
					var orderBy = operation.parameters.filter(function(x) {
						return x.name == "orderBy";
					})[0];
					// if we have an order by field, we can order by all the outputs (by default)
					if (orderBy && operation.responses["200"] && operation.responses["200"].schema) {
						var definition = self.$services.swagger.resolve(operation.responses["200"].schema);
						var arrays = self.$services.page.getArrays(definition);
						if (arrays.length > 0) {
							var childDefinition = self.$services.page.getChildDefinition(definition, arrays[0]);
							if (childDefinition && childDefinition.items && childDefinition.items.properties) {
								nabu.utils.arrays.merge(result, Object.keys(childDefinition.items.properties));
							}
						}
					}
				}
			}
			return result;
		},
		getCounter: function() {
			return this.$services.page.pageCounter++;
		},
		getPageType: function() {
			var self = this;
			var pageType = null;
//			var path = this.$services.page.getTargetPath(this.page.content, this.target.id);
			var path = this.$services.page.getTargetPath(this.getRootPage().page.content, this.target.id);
			path.reverse();
			if (this.parameters.pageType) {
				pageType = this.parameters.pageType;
			}
			else {
				// we check if there is a renderer in the path to this repeat
				// if so, that renderer can modify how we render the pages (e.g. a table)
				path.forEach(function(x) {
					if (x.renderer && !pageType) {
						var renderer = self.$services.page.getRenderer(x.renderer);
						if (renderer && renderer.getPageType) {
							pageType = renderer.getPageType(x);
						}
					}
				})
			}
			// @2025-06-06: this can concatenate into "undefined-child" if the parent has no explicit page type
			// it is unclear exactly why we want a unique page type for each child? styling perhaps? yes, table renderer uses this!
			// anyway, disabled the original code and made it smarter
			//if (pageType == null) {
			//	pageType = this.page.content.pageType + "-child";
			//}
			// we take the parent page type and add "-child" to it
			// if you keep nesting, we keep adding -child
			if (pageType == null && this.page.content.pageType) {
				pageType = this.page.content.pageType + "-child";
			}
			// this breaks EVERYTHING with regards to tables etc
			//else {
			//	pageType = "page";
			//}
			return {
				pageType: pageType,
				path: path
			};
		},
		getRootPage: function() {
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			while (pageInstance.fragmentParent) {
				pageInstance = pageInstance.fragmentParent;
			}
			return pageInstance;
		},
		getCellClasses: function() {
			var self = this;
			var component = null;
			var pageType = this.getPageType();
			if (pageType.pageType) {
				var provider = nabu.page.providers("page-type").filter(function(x) {
					return x.name == pageType.pageType;
				})[0];
				if (provider && this.target.rows && provider.cellComponent instanceof Function) {
					component = provider.cellComponent(this.target, pageType.path, this.page);
				}
				else if (provider && this.target.rows && provider.cellComponent) {
					component = provider.cellComponent;
				}
			}
			if (!component) {
				component = "page-column";
			}
			var result = ["is-" + component];
			nabu.utils.arrays.merge(result, this.getChildComponentClasses(component));
			return result;
		},
		getComponentClassesForEdit: function() {
			var result = [];
			if (this.getComponent() == "div") {
				// we have a plain row
				if (this.target.cells) {
					result.push("page-row");
					result.push("is-page-row");
				}
				else {
					result.push("page-column");
					result.push("is-page-column");
				}
			}
			return result;
		},
		getComponentClassesForMessage: function() {
			var result = [];
			if (this.getMessageComponent() == "div") {
				// we have a plain row
				if (this.target.cells) {
					result.push("page-row");
					result.push("is-page-row");
				}
				else {
					result.push("page-column");
					result.push("is-page-column");
				}
			}
			return result;
		},
		getComponent: function() {
			var self = this;
			var pageType = this.getPageType();
			var componentType = null;
			if (pageType.pageType) {
				var provider = nabu.page.providers("page-type").filter(function(x) {
					return x.name == pageType.pageType;
				})[0];
				if (provider && this.target.rows && provider.cellTag instanceof Function) {
					componentType = provider.cellTag(null, this.target, null, this.edit, pageType.path, this.page);
				}
				else if (provider && this.target.rows && provider.cellTag) {
					componentType = provider.cellTag;
				}
				// if we are a row, check if we have a celltag
				else if (provider && this.target.cells && provider.rowTag instanceof Function) {
					componentType = provider.rowTag(this.target, null, this.edit, pageType.path, this.page);
				}
				else if (provider && this.target.cells && provider.rowTag) {
					componentType = provider.rowTag;
				}
			}
			return componentType ? componentType : "div";
		},
		getMessageComponent: function() {
			var self = this;
			var pageType = this.getPageType();
			if (pageType.pageType) {
				var provider = nabu.page.providers("page-type").filter(function(x) {
					return x.name == pageType.pageType;
				})[0];
				if (provider && provider.messageTag instanceof Function) {
					return provider.messageTag(this.target);
				}
				else if (provider && provider.messageTag) {
					return provider.messageTag;
				}
				// if we are a cell, check if we have a celltag
				else if (provider && this.target.rows && provider.cellTag instanceof Function) {
					return provider.cellTag(null, this.target);
				}
				else if (provider && this.target.rows && provider.cellTag) {
					return provider.cellTag;
				}
				// if we are a row, check if we have a celltag
				else if (provider && this.target.cells && provider.rowTag instanceof Function) {
					return provider.rowTag(this.target);
				}
				else if (provider && this.target.cells && provider.rowTag) {
					return provider.rowTag;
				}
			}
			return "div";
		},
		onDragStart: function(event, record) {
			var name = this.target.repeat.dragName ? this.target.repeat.dragName : "default";
			this.$services.page.setDragData(event, "data-" + name, JSON.stringify(record));
		},
		watchArray: function() {
			if (this.target.repeat && this.target.repeat.array) {
				var self = this;
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				// if we are accessing parent state, we need to watch that
				// in theory it could come from _any_ parent. realistically for now we are just checking the direct parent
				if (this.target.repeat.array.indexOf("parent.") == 0) {
					var parentPage = this.$services.page.pages.filter(function(x) {
						return x.content.name == self.page.content.pageParent;
					})[0];
					if (parentPage != null) {
						//result.parent = this.getPageParameters(parentPage);
						pageInstance = this.$services.page.getPageInstance(parentPage, pageInstance);
					}
				}
				var targetArray = this.target.repeat.array;
				if (targetArray.indexOf("parent.") == 0) {
					targetArray = targetArray.substring("parent.".length);
				}
				var current = pageInstance.get(targetArray);
				// if it doesn't exist yet, keep an eye on the page state
				// we tried to be more specific and watch direct parents but this _somehow_ failed
				if (current == null) {
					var unwatch = pageInstance.$watch("variables", function(newValue) {
						var result = pageInstance.get(targetArray);
						if (result != null) {
							self.loadData();
							unwatch();
							self.watchArray();
						}
					}, {deep: true});
				}
				else {
					var stringified = JSON.stringify(current);
					if (targetArray.indexOf("page.") == 0) {
						targetArray = targetArray.substring("page.".length);
					}
					var watchKey = "variables." + targetArray;
					var unwatch = pageInstance.$watch(watchKey, function(newValue) {
						if (JSON.stringify(pageInstance.get(targetArray)) != stringified) {
							self.loadData();
							unwatch();
							// may have unset to null, changed to a different array,...
							self.watchArray();
						}
					}, {deep: true});
				}
			}
		},
		// TODO: allow the user to choose their own key in the record
		getKey: function(record) {
			if (record && record.id) {
				return record.id;
			}
			// sometimes we have arrays of uuids
			else if (record && typeof(record) == "string") {
				return record;
			}
			else if (record && record.hasOwnProperty("$position")) {
				return record["$position"];
			}
			else {
				return this.state.records.indexOf(record);
			}
		},
		handleClick: function(event, record) {
			if (this.target.repeat && this.target.repeat.selectable && !this.target.repeat.disableMouseSelection) {
				this.runAction("select", {
					items: [record],
					append: event.ctrlKey || event.metaKey || this.target.repeat.alwaysMultiselect
				});
			}
		},
		runAction: function(action, value) {
			var self = this;
			if (action == "jump-page") {
				return this.loadData(value.page);
			}
			else if (action == "previous-page") {
				if (this.state.paging.current) {
					this.loadData(this.state.paging.current - 1);
				}
			}
			else if (action == "next-page") {
				if (this.state.paging.current < this.state.paging.total - 1) {
					return this.loadData(this.state.paging.current + 1);
				}
			}
			else if (action == "refresh") {
				var retainOffset = value && value.retainOffset;
				return this.loadData(retainOffset ? this.state.paging.current : 0);
			}
			else if (action == "list-available") {
				return this.$services.q.resolve({available: this.getOrderByFields()});
			}
			else if (action == "order-by") {
				if (!value.append) {
					this.state.order.by.splice(0);
				}
				if (value.by) {
					// for example "name desc". we want a list of all the fields involved, e.g. "name" so we can remove any other mentions of this field
					value.by.map(function(x) {
						return x.replace(/[\s]+.*$/, "");
					}).forEach(function(field) {
						var toRemove = self.state.order.by.filter(function(x) {
							return x == field || x.indexOf(field + " ") == 0;
						});
						toRemove.forEach(function(x) {
							self.state.order.by.splice(self.state.order.by.indexOf(x), 1);
						});
					});
					// you can explicitly set "name none" to UNSET an order by
					this.state.order.by.unshift.apply(this.state.order.by, value.by.filter(function(x) {
						return x.indexOf(" none") < 0;
					}));
				}
			}
			else if (action == "select") {
				if (this.target.repeat && this.target.repeat.selectable) {
					if (!value.append || !this.target.repeat.multiSelectable) {
						this.state.selected.splice(0);
					}
					if (value.items) {
						value.items.forEach(function(item) {
							// if we have already selected the item, don't add it again
							if (self.state.selected.indexOf(item) < 0) {
								self.state.selected.push(item);
							}
							// otherwise, if we are selecting only one item and you have append mode on, we actually remove it, because it acts as a toggle
							else if (value.append && value.items.length == 1) {
								self.state.selected.splice(self.state.selected.indexOf(item), 1);
							}
						})
					}
					if (this.state.selected.length) {
						return this.$services.triggerable.trigger(this.target, "select", this.state.selected, this);
					}
					else {
						this.unselectAll();
						return this.$services.q.resolve();
					}
				}
			}
			else if (action == "toggle-slot") {
				var customSlot = this.target.repeat.customSlots.filter(function(x) {
					return x.name == value.slot;
				})[0];
				// invalid slot name or invalid index
				if (!customSlot || value.index == null) {
					return this.$services.q.reject();
				}
				var recordIndex = parseInt(value.index);
				var currentIndex = this.activatedSlots[customSlot.name].indexOf(recordIndex);
				// if we have no explicit show, we just toggle
				var show = value.show == null ? currentIndex < 0 : value.show;
				// no specific action, we just toggle
				if (show) {
					if (currentIndex < 0) {
						if (customSlot.singleOpen) {
							this.activatedSlots[customSlot.name].splice(0);
						}
						this.activatedSlots[customSlot.name].push(recordIndex);
					}
				}
				else if (currentIndex >= 0) {
					this.activatedSlots[customSlot.name].splice(currentIndex, 1);
				}
				return this.$services.q.resolve();
			}
			return this.$services.q.reject();
		},
		unselectAll: function() {
			this.state.selected.splice(0);
			this.$services.triggerable.untrigger(this.target, "select", this);
			// trigger deselect
			this.$services.triggerable.trigger(this.target, "deselect", this);
		},
		getRuntimeState: function() {
			return this.state;	
		},
		getPageInstance: function() {
			return this.$services.page.getPageInstance(this.page, this);
		},
		getParameters: function(record) {
			var result = {};
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			// whatever parameters we passed to the parent page are likely expected to the in the repeated page as well (?)
			// not true, we want the _state_ of the parent page, but this may be due to rest calls etc, we don't want to replay that
			// nabu.utils.objects.merge(result, pageInstance.parameters);
			//nabu.utils.objects.merge(result, this.getVariables());
			// we don't want to pass the entire state as parameters because this causes the repeats to be rerendered if anything changes
			if (this.target.runtimeAlias) {
				result[this.target.runtimeAlias] = {
					// in the fragmented page we want to allow you to update the filter
					// this should work because it is all linked by reference?
					filter: this.state.filter,
					record:record, 
					recordIndex: this.state.records.indexOf(record), 
					records: this.state.records, 
					allRecords: this.state.allRecords
				};
			}
			return result;
		},
		getVariables: function() {
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			return pageInstance.variables;
		},
		unloadPages: function() {
			// unload default
			this.unloadPage();	
			var self = this;
			if (this.target.repeat && this.target.repeat.customSlots && this.target.repeat.customSlots.length) {
				this.target.repeat.customSlots.forEach(function(slot) {
					self.unloadPage(slot.name);
				})
			}
		},
		unloadPage: function(slot) {
			this.$services.router.unregister(this.alias + (slot ? "-" + slot : ""));
		},
		beforeMount: function(component) {
			this.mapVariables(component);
		},
		mapVariables: function(target) {
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			var self = this;
			Object.keys(pageInstance.variables).forEach(function(key) {
				// not interested in changes to itself
				if (key != self.target.runtimeAlias) {
					if (target.set) {
						if (target.variables[key] != pageInstance.variables[key]) {
							target.set(key, pageInstance.variables[key]);
						}
					}
					else {
						if (target[key] != pageInstance.variables[key]) {
							Vue.set(target, key, pageInstance.variables[key]);
						}
					}
				}
			});
		},
		mounted: function(component) {
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			// TODO: subscribe to all events and emit them to this page
			component.$on("hook:beforeDestroy", function() {
				console.debug("Destroying repeated fragmented page");
			});
			// we don't need to explicitly unsubscribe? once the page gets destroyed, its gone anyway
			component.subscribe("$any", function(name, value) {
				if (name != "$load") {
					pageInstance.emit(name, value);
				}
			});
			var self = this;
			// map variables initially to the parameters
			// this _somehow_ breaks reactivity on the page
//						mapVariables(parameters);
			// we want to keep the variables up to date without having the route-render continuously rerender the page
			var unwatch = pageInstance.$watch("variables", function() {
				if (component) {
					self.mapVariables(component);
				}
			}, {deep: true});
			
			component.$on("hook:beforeDestroy", function() {
				unwatch();
			});
			
			// instantiate the local variables if necessary
			if (this.target.repeat.localVariables && this.target.runtimeAlias) {
				this.target.repeat.localVariables.forEach(function(variable) {
					if (variable.defaultValue && variable.name) {
						self.$services.page.setValue(component.variables, self.target.runtimeAlias + ".local." + variable.name, self.$services.page.eval(variable.defaultValue, component.variables, component));
						//Vue.set(component.variables, self.target.runtimeAlias + ".local." + variable.name, self.$services.page.eval(variable.defaultValue, component.variables, component));
					}
				});
			}
		},
		uniquify: function() {
			var self = this;
			// make sure we have the highest before we start
			// if for example we pass in an array from outside, it might already have a position
			this.state.records.forEach(function(record) {
				if (record.hasOwnProperty("$position") && record.$position >= self.position) {
					self.position = record.$position + 1;
				}
			});
			this.state.records.forEach(function(record) {
				if (!record.hasOwnProperty("$position") && typeof(record) != "string" && !(record instanceof String)) {
					record["$position"] = self.position++;
				}
			});
		},
		lazyLoad: function(record) {
			if (this.lazyPromise == null && this.state.paging && this.target.repeat.scrollLoad && this.state.paging.current != null) {
				var next = this.state.paging.current + 1;
				if (this.state.paging.total != null && this.state.paging.total != 0 && this.state.paging.current >= this.state.paging.total - 1) {
					return false;
				}
				var index = this.state.records.indexOf(record);
				// if we are in the final 10% of the table, try to load more
				if (index >= Math.floor(this.state.records.length * 0.9)) {
					this.lazyPromise = this.loadData(next, true);
					var self = this;
					this.lazyPromise.then(function() {
						self.lazyPromise = null;
					}, function() {
						self.lazyPromise = null;
					});
				}
			}
		},
		// in the future we can add a "load more" event support, we then listen to that event and load more data, this means we want to append
		// currently we don't do anything special with limit and offset, you can fill them in in the bindings if you want
		// we will just do the call as a whole, assuming it is a limited service result
		// in the future we can hide the limit/offset inputs and instead expose them as state so you can directly write to them (?)
		loadData: function(page, append) {
			this.loadCounter++;
			var self = this;
			this.collapseAllSlots();
			if (self.repeatTimer) {
				clearTimeout(self.repeatTimer);
				self.repeatTimer = null;
			}
			// trigger an unselect
			if (this.state.selected.length > 0) {
				this.unselectAll();
			}
			// abort the previous promise if it still ongoing
			if (this.loadPromise && this.loadPromise.abort) {
				this.loadPromise.abort();
			}
			this.loadPromise = null;
			// we want to call an operation
			if (this.target.repeat && (this.target.repeat.type == "operation" || this.target.repeat.type == null) && this.target.repeat.operation) {
				var parameters = {}
				nabu.utils.objects.merge(parameters, this.operationParameters);
				// local state variables win from passed in ones!
				if (this.state.filter) {
					Object.keys(this.state.filter).forEach(function(key) {
						// someone might still attempt to write to record?
						// by default the state has no keys
						// any key available is explicitly written by the user, so even a null value is an active decision
						if (key != "record") {
							parameters[key] = self.state.filter[key];
						}
					});
				}
				if (this.state.order.by.length) {
					parameters["orderBy"] = this.state.order.by;
				}
				// if we want to load a certain page, we need a limit
				if (page != null) {
					if (parameters.limit == null) {
						parameters.limit = 10;
					}
					parameters.offset = parameters.limit * page;
				}
				if (this.state["$serviceContext"]) {
					parameters["$serviceContext"] = this.state["$serviceContext"];
				}
				else {
					parameters["$serviceContext"] = this.$services.page.getPageInstance(this.page, this).getServiceContext();
				}
				if (!append) {
					// don't set loading if appending, this will disrupt visualization
					this.loading = true;
					self.state.records.splice(0);
					self.state.allRecords.splice(0);
				}
				else {
					this.appendLoading = true;
				}
				this.loadPromise = this.$services.swagger.execute(this.target.repeat.operation, parameters).then(function(list) {
					Object.keys(self.state.raw).forEach(function(x) {
						Vue.set(self.state.raw, x, null);
					});
					if (!append) {
						self.state.records.splice(0);
						self.state.allRecords.splice(0);
					}
					if (list) {
						Object.keys(list).forEach(function(x) {
							Vue.set(self.state.raw, x, list[x]);
						});
						
						var arrayField = Object.keys(self.$services.data.getArrayOutputField(self.target.repeat.operation))[0];
						var arrayFound = false;
						var findArray = function(root) {
							var array = root[arrayField];
							if (array == null) {
								array = [];
							}
							arrayFound = true;
							
							// enrich with position
							array.forEach(function(x, i) {
								if (x) {
									x.$position = self.position++;
								}
							});
							
							nabu.utils.arrays.merge(self.state.allRecords, array);
							if (self.target.repeat.arrayFilter) {
								nabu.utils.arrays.merge(self.state.records, 
									array.filter(function(x) {
										var $value = function(value, literal) {
											if (value == "records") {
												return array;
											}
											else if (value == "record") {
												return x;
											}
											else {
												return self.$value(value, literal);
											}
										}
										return self.$services.page.isCondition(self.target.repeat.arrayFilter, x, self, $value);
									})
								);
							}
							else {
								nabu.utils.arrays.merge(self.state.records, array);
							}
							
							/*
							// old resolving based on dynamically finding the first array!
							Object.keys(root).forEach(function(field) {
								if (root[field] instanceof Array && !arrayFound) {
									root[field].forEach(function(x, i) {
										if (x) {
											x.$position = self.position++;
										}
									});
									nabu.utils.arrays.merge(self.state.allRecords, root[field]);
									if (self.target.repeat.arrayFilter) {
										nabu.utils.arrays.merge(self.state.records, 
											root[field].filter(function(x) {
												var $value = function(value, literal) {
													if (value == "records") {
														return root[field]
													}
													else if (value == "record") {
														return x;
													}
													else {
														return self.$value(value, literal);
													}
												}
												return self.$services.page.isCondition(self.target.repeat.arrayFilter, x, self, $value);
											})
										);
									}
									else {
										nabu.utils.arrays.merge(self.state.records, root[field]);
									}
									arrayFound = true;
								}
								if (!arrayFound && typeof(root[field]) === "object" && root[field] != null) {
									findArray(root[field]);
								}
							});
							*/
						}
						findArray(list);
						
						var pageFound = false;
						var findPage = function(root) {
							Object.keys(root).forEach(function(field) {
								// check if we have an object that has the necessary information
								if (typeof(root[field]) === "object" && root[field] != null && !pageFound) {
									// these are the two fields we use and map, check if they exist
									if (root[field].current != null && root[field].total != null) {
										nabu.utils.objects.merge(self.state.paging, root[field]);
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
					}
					self.uniquify();
					self.loading = false;
					self.appendLoading = false;
					self.created = true;
					// only repeat if we are not yet destroyed
					if (self.target.repeat.refreshInterval && !self.destroyed) {
						self.repeatTimer = setTimeout(function() {
							self.loadData(page)
						}, self.target.repeat.refreshInterval);
					}
				}, function(error) {
					// TODO: what in case of error?
					self.loading = false;
					self.appendLoading = false;
					self.created = true;
				})
			}
			else if (this.target.repeat && (this.target.repeat.type == "array" || this.target.repeat.type == null) && this.target.repeat.array) {
				if (!append) {
					this.state.records.splice(0);
					this.state.allRecords.splice(0);
				}
				var result = this.$services.page.getPageInstance(this.page, this).get(this.target.repeat.array);

				if (result) {
					nabu.utils.arrays.merge(this.state.allRecords, result);
					if (this.target.repeat.arrayFilter) {
						result = result.filter(function(x) {
							var $value = function(value, literal) {
								if (value == "records") {
									return result;
								}
								else if (value == "record") {
									return x;
								}
								else {
									return self.$value(value, literal);
								}
							}
							return self.$services.page.isCondition(self.target.repeat.arrayFilter, x, self, $value);
						});
					}
					nabu.utils.arrays.merge(this.state.records, result);
				}
				self.uniquify();
				self.created = true;
				this.loadPromise = this.$services.q.resolve(result);
			}
			else {
				var provider = nabu.page.providers("page-repeat").filter(function(provider) {
					return provider.name == self.target.repeat.type;
				})[0];
				if (provider && provider.loadData) {
					this.loadPromise = provider.loadData(self.target, self.state, page, append);
				}
			}
			if (this.loadPromise && this.loadPromise.then) {
				this.loadPromise.then(function() {
					return self.$services.triggerable.trigger(self.target, "load", self.state.records, self);
				})
			}
			return this.loadPromise;
		},
		loadPages: function() {
			// the "default" slot page
			this.loadPage();
			var self = this;
			if (this.target.repeat && this.target.repeat.customSlots && this.target.repeat.customSlots.length) {
				this.target.repeat.customSlots.forEach(function(slot) {
					self.loadPage(slot.name);
				})
			}
		},
		// create a custom route for rendering
		loadPage: function(slot) {
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			
			this.unloadPage(slot);
			if (this.target.runtimeAlias) {
				var content = {
					"rows": [],
					"counter": 1,
					"variables": [],
					"query": [],
					"actions": [],
					"class": null,
					"initial": false,
					"menuX": 0,
					"menuY": 0,
					"states": [],
					"category": "Other Category",
					"slow": false,
					"name": this.alias + (slot ? "-" + slot : ""),
					"parameters": [],
					"readOnly": true,
					"pageType": this.getPageType().pageType,
					// you can optimze the rows by throwing away the page wrapper
					// currently this also throws away edit mode so we can only globally enable this once we have moved the editing outside of the page!
					// no longer needed, vue was complaining about two roots so made an optimized derivative component
					"optimizeRows": false
					// TODO: should be recursive, currently we can only go up one parent
					// aimed at matrices atm
//					"fragmentParentContent": pageInstance.fragmentParent ? pageInstance.fragmentParent.page.content : pageInstance.page.content
				};
				// add our local value
				content.parameters.push({
					name: this.target.runtimeAlias,
					// we can be more specific about the type, not sure if it is necessary though
					type: 'string',
					format: null,
					default: null,
					global: false,
					// we can listen to events and take a value from them to update the current value
					// e.g. we could update a search parameter if you select something
					listeners: []
				});
				var slotFilter = function(x) {
					return (!slot && !x.rendererSlot) || (slot == x.rendererSlot);
				}
				// we have a row, just push it to the rows
				if (this.target.rows) {
					nabu.utils.arrays.merge(content.rows, this.target.rows.filter(slotFilter));
					content.repeatType = "cell";
				}
				// we have a cell
				else if (this.target.cells) {
					content.repeatType = "row";
					var row = {
						// use an id that definitely does not collide with the content
						id: this.target.id,
						state: {},
						cells: [],
						class: null,
						customId: null,
						instances: {},
						condition: null,
						direction: null,
						align: null,
						on: null,
						collapsed: false,
						name: null,
						// the renderer slot needs to be repeated, it is likely for a parent renderer
						rendererSlot: this.target.rendererSlot,
						styleVariables: this.target.styleVariables
					};
					// inherit triggers
					// we want to be able to do it contextually
					row.triggers = this.target.triggers;
					nabu.utils.arrays.merge(row.cells, this.target.cells.filter(slotFilter));
					content.rows.push(row);
				}
				var page = {
					name: content.name,
					content: content
				}
				if (slot) {
					this.fragmentPages[slot] = page;
				}
				else {
					this.fragmentPage = page;
				}
				var self = this;
				// @2025-04-18: not used anymore...?
				var route = {
					alias: page.name,
					enter: function(parameters, mask) {
						var mapVariables = function(target) {
							Object.keys(pageInstance.variables).forEach(function(key) {
								// not interested in changes to itself
								if (key != self.target.runtimeAlias) {
									if (target.set) {
										if (target.variables[key] != pageInstance.variables[key]) {
											target.set(key, pageInstance.variables[key]);
										}
									}
									else {
										if (target[key] != pageInstance.variables[key]) {
											Vue.set(target, key, pageInstance.variables[key]);
										}
									}
								}
							});
						}
						
						// map variables initially to the parameters
						// this _somehow_ breaks reactivity on the page
//						mapVariables(parameters);
						
						var newPage = null;
						// we want to keep the variables up to date without having the route-render continuously rerender the page
						var unwatch = pageInstance.$watch("variables", function() {
							if (newPage) {
								mapVariables(newPage);
							}
						}, {deep: true});
						newPage = new nabu.page.views.Page({template: "n-page-optimized", propsData: {
							page: page, 
							parameters: parameters, 
							stopRerender: parameters ? parameters.stopRerender : false, 
							pageInstanceId: self.$services.page.pageCounter++, 
							masked: mask 
						}, beforeDestroy: function() {
							unwatch();
						// the sweet spot to make sure rules etc are initialized correctly but not to interrupt other things
						}, beforeMount: function() {
							mapVariables(this);
						}});
						return newPage;
					},
					// yes it's a page, but we don't want it treated as such
					isPage: false,
					initial: false,
					properties: page.content.properties ? page.content.properties : []
				};
				this.$services.router.register(route);
			}
		}
	}
});


Vue.component("renderer-repeat-configure", {
	template: "#renderer-repeat-configure",
	props: {
		page: {
			type: Object,
			required: true
		},
		// the target (cell or row)
		target: {
			type: Object,
			required: true
		},
		// whether or not we are in edit mode (we can do things slightly different)
		edit: {
			type: Boolean,
			required: false
		},
		childComponents: {
			type: Object,
			required: false
		}
	},
	created: function() {
		if (!this.target.repeat) {
			Vue.set(this.target, "repeat", {});
		}
		if (!this.target.repeat.bindings) {
			Vue.set(this.target.repeat, "bindings", {});
		}	
		if (!this.target.repeat.defaultOrderBy) {
			Vue.set(this.target.repeat, "defaultOrderBy", []);
		}
		if (!this.target.repeat.type) {
			if (this.target.repeat.operation) {
				Vue.set(this.target.repeat, "type", "operation");
			}
			else if (this.target.repeat.array) {
				Vue.set(this.target.repeat, "type", "array");
			}
		}
		if (!this.target.repeat.customSlots) {
			Vue.set(this.target.repeat, "customSlots", []);
		}
		if (!this.target.repeat.localVariables) {
			Vue.set(this.target.repeat, "localVariables", []);
		}
	},
	computed: {
		operationParameters: function() {
			var result = [];
			if (this.target.repeat && this.target.repeat.operation) {
				// could be an invalid operation?
				if (this.$services.swagger.operations[this.target.repeat.operation]) {
					var parameters = this.$services.swagger.operations[this.target.repeat.operation].parameters;
					if (parameters) {
						nabu.utils.arrays.merge(result, parameters.map(function(x) { return x.name }));
					}
				}
			}
			return result;
		}
	},
	methods: {
		getRepeatTypes: function(value) {
			var types = [];
			types.push({
				name: "operation",
				title: "The return value of a REST call"
			});
			types.push({
				name: "array",
				title: "The values available in an array"
			});
			nabu.utils.arrays.merge(types, nabu.page.providers("page-repeat"));
			if (value) {
				types = types.filter(function(x) {
					return (x.name && x.name.toLowerCase().indexOf(value.toLowerCase()) >= 0)
						|| (x.title && x.title.toLowerCase().indexOf(value.toLowerCase()) >= 0)
				})
			}
			return types;
		},
		getRepeatConfigurator: function() {
			var self = this;
			if (this.target.repeat.type && this.target.repeat.type != "operation" && this.target.repeat.type != "array") {
				var type = nabu.page.providers("page-repeat").filter(function(x) {
					return x.name == self.target.repeat.type;
				})[0];
				return type ? type.configurator : null;
			}	
		},
		getOrderByFields: function(value) {
			var result = [];
			if (this.target.repeat && this.target.repeat.operation) {
				var operation = this.$services.swagger.operation(this.target.repeat.operation);	
				var self = this;
				if (operation && operation.parameters) {
					var orderBy = operation.parameters.filter(function(x) {
						return x.name == "orderBy";
					})[0];
					// if we have an order by field, we can order by all the outputs (by default)
					if (orderBy && operation.responses["200"] && operation.responses["200"].schema) {
						var definition = self.$services.swagger.resolve(operation.responses["200"].schema);
						var arrays = self.$services.page.getArrays(definition);
						if (arrays.length > 0) {
							var childDefinition = self.$services.page.getChildDefinition(definition, arrays[0]);
							if (childDefinition && childDefinition.items && childDefinition.items.properties) {
								nabu.utils.arrays.merge(result, Object.keys(childDefinition.items.properties));
							}
						}
					}
				}
			}
			return result.filter(function(x) {
				return !value || x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
			});
		}
	}
}); 