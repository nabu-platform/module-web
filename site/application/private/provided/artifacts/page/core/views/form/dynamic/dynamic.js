// I tried with the v-fragment directive at the root, because of how its rendered (v-route-render rather than <component> like repeat) it does not work correctly
// it works (sort of) if you put a :key at the root, but this key _must_ be rather volatile (e.G. math.random or an incremental counter)
// you also need to embed the key verbatim in the tpl file, you can NOT use for example a computed property (not sure why...)
// so this works:
// <div v-fragment :key="'page_' + pageInstanceId + '_cell_' + cell.id + '_nabu-form-dynamic-component_' + $window.nabu_form_dynamic_component_counter++">
// except that every time you type something, the whole instance will rerender, giving you the type-one-letter-focus-lost issue
// there are possibly even ways around that but currently I've opted to not use the fragment directive

var nabu_form_dynamic_component_counter = 0;
Vue.view("nabu-form-dynamic-component", {
	mixins: [Vue.component("data-mixin")],
	data: function() {
		return {
			localCounter: nabu_form_dynamic_component_counter++,
			// keep track of the values we removed
			// if they are added again, reuse the previous value
			// this is _necessary_ when the definitions for the actual keys arrive after we get the values
			// because we will first remove them, then re-add the keys
			// additionally if you change definitions a couple of times, you might need the same parameters from time to time
			removed: {},
			// the array we are working on
			array: null,
			updatingSelf: false
		}
	},
	props: {
		readOnly: {
			type: Boolean
		},
		disabled: {
			type: Boolean
		}
	},
	computed: {
		// the field we get the type from in the record
		typeField: function() {
			// TODO: allow configuration of this field
			return "type";
		},
		// the field we get the name from in the record
		nameField: function() {
			return "key";
		},
		labelField: function() {
			return "label";
		},
		// the field we write the key to
		targetKeyField: function() {
			return "key";
		},
		// the field we write the value to
		targetValueField: function() {
			return "value";
		},
		parentValue: function() {
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			return pageInstance && this.cell.state.name ? pageInstance.get('page.' + this.cell.state.name) : null;
		}
	},
	methods: {
		getChildComponents: function() {
			return [{
				title: "Form container",
				name: "dynamic-field-container",
				component: "column"
			}];
		},
		postProcess: function(records) {
			var parentValue = this.getArray();
			var self = this;
			var existingKeys = [];
			records.forEach(function(x) {
				var name = x[self.nameField];
				// check that we have an entry for the given key
				var current = parentValue.filter(function(x) {
					return x[self.targetKeyField] == name;
				})[0];
				if (current == null) {
					current = {};
					current[self.targetKeyField] = name;
					current[self.targetValueField] = self.removed[name] == null ? null : self.removed[name];
					parentValue.push(current);
				}
				// set up a list of keys we want
				existingKeys.push(x[self.targetKeyField]);
			});
			// remove any keys we no longer want
			var toRemove = parentValue.filter(function(x) {
				return existingKeys.indexOf(x[self.targetKeyField]) < 0;
			});
			toRemove.forEach(function(x) {
				self.removed[x[self.targetKeyField]] = x[self.targetValueField];
				parentValue.splice(parentValue.indexOf(x), 1);
			});
			return records;
		},
		configurator: function() {
			return "nabu-form-dynamic-component-configure";
		},
		// the label to display, you can translate it but it won't get automatically picked up in translation engine
		getLabelFor: function(record) {
			var label = this.labelField;
			if (label == null) {
				label = this.nameField;
			}
			return this.$services.page.translate(record[label]);
		},
		getComponentFor: function(record) {
			var type = record[this.typeField];
			var name = record[this.nameField];
			if (this.cell.state.custom) {
				var custom = this.cell.state.custom.filter(function(x) {
					return x.component && x.name == type;
				})[0];
				if (custom) {
					var resolved = nabu.page.providers("page-form-input").filter(function(x) {
						return x.name == custom.component;	
					})[0];
					if (resolved) {
						return resolved.component;
					}
				}
			}
			if (type == "boolean") {
				return "page-form-input-checkbox";
			}
			else if (type == "date") {
				return "page-form-input-date";
			}
			else if (type == "string" && name && name.toLowerCase().indexOf("password") >= 0) {
				return "page-form-input-password";
			}
			else {
				return "page-form-input-text";
			}
		},
		getParametersFor: function(record) {
			var type = record[this.typeField];
			var name = record[this.nameField];
			if (this.cell.state.custom) {
				var custom = this.cell.state.custom.filter(function(x) {
					return x.name == type;
				})[0];
				if (custom) {
					return {state: custom.configuration};
				}
			}
			// stuff like mandatory, placeholder etc etc
			// because we want to emulate a cell, we use "state" to do it
			return {state: {}};
		},
		getTargetFor: function(record) {
			var name = record[this.nameField];
			var parentValue = this.getArray();
			var self = this;
			return parentValue.filter(function(x) {
				return x[self.targetKeyField] == name;
			})[0];
		},
		getValueFor: function(record) {
			var target = this.getTargetFor(record);
			return target ? target[this.targetValueField] : null;
		},
		update: function(record, value, label) {
			this.updatingSelf = true;
			var target = this.getTargetFor(record);
			Vue.set(target, this.targetValueField, value);
			//target[this.targetValueField] = value;
		},
		getArray: function(force) {
			if (!this.array || force) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				//return pageInstance && this.cell.state.name ? pageInstance.get('page.' + this.cell.state.name) : null;
				var parentValue = pageInstance && this.cell.state.name ? pageInstance.get('page.' + this.cell.state.name) : null; 
				if (parentValue == null) {
					if (this.cell.state.stringified) {
						parentValue = "{}";
						Vue.set(this, "array", []);
					}
					// we work directly on an array
					else {
						parentValue = [];
						Vue.set(this, "array", parentValue);
					}
					var pageInstance = this.$services.page.getPageInstance(this.page, this);
					if (pageInstance) {
						pageInstance.set("page." + this.cell.state.name, parentValue);
					}
				}
				else {
					if (this.cell.state.stringified) {
						var parsed = JSON.parse(parentValue);
						var array = [];
						Object.keys(parsed).forEach(function(key) {
							array.push({
								key: key,
								value: parsed[key]
							});
						})
						Vue.set(this, "array", array);
					}
					else {
						Vue.set(this, "array", parentValue);
					}
				}
			}
			return this.array;
		},
		getParentValue: function() {
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			return pageInstance ? pageInstance.variables : null;
		}
	},
	watch: {
		"parentValue": function() {
			if (this.updatingSelf) {
				this.updatingSelf = false;
			}
			else {
				// reload the array
				this.getArray(true);
			}
		},
		"array": {
			deep: true,
			handler: function() {
				if (this.cell.state.stringified) {
					var result = {};
					this.array.forEach(function(entry) {
						if (entry.value != null) {
							result[entry.key] = entry.value;
						}
					});
					var pageInstance = this.$services.page.getPageInstance(this.page, this);
					if (pageInstance) {
						pageInstance.set("page." + this.cell.state.name, JSON.stringify(result, null, 2));
					}
				}
			}
		}
	}
})

Vue.component("nabu-form-dynamic-component-configure", {
	template: "#nabu-form-dynamic-component-configure",
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
		if (!this.cell.state.custom) {
			Vue.set(this.cell.state, "custom", []);
		}
	},
	methods: {
		getCustomConfiguration: function(custom) {
			var component = nabu.page.providers("page-form-input").filter(function(x) {
				return x.name == custom.component;	
			})[0];
			var result = component && component.configure ? component.configure : custom.component + "-configure";
			return Vue.component(result) ? result : null;
		},
		getAvailableComponents: function(value) {
			return nabu.page.providers("page-form-input").filter(function(x) {
				return !value || x.name.toLowerCase().indexOf(value.toLowerCase()) >= 0;
			});
		},
		availableFields: function(value) {
			if (this.cell.state.stringified) {
				var fields = [];
				var parameters = this.$services.page.getPageParameters(this.page);
				nabu.utils.arrays.merge(fields, this.$services.page.getSimpleKeysFor(parameters, true, true));
				//console.log("fields are", fields);
				fields.sort();
				if (value) {
					fields = fields.filter(function(x) {
						return x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
					});
				}
				return fields;
			}
			else {
				var parameters = this.$services.page.getAllArrays(this.page);
				parameters.sort();
				if (value) {
					parameters = parameters.filter(function(x) {
						return x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
					});
				}
			}
			return parameters;
		}
	}
})