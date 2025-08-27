Vue.component("n-page-mapper", {
	template: "#n-page-mapper2",
	props: {
		// every key is a new source to map from and contains the definitions of the fields we can map in there
		from: {
			type: Object,
			required: true
		},
		// contains the definitions of the fields we can map to
		to: {
			required: true
		},
		// the resulting bindings are in here
		value: {
			type: Object,
			required: true
		},
		plain: {
			type: Boolean,
			default: false
		},
		allowComputed: {
			type: Boolean,
			default: true
		},
		watchForChanges: {
			type: Boolean,
			default: false
		},
		dropUnused: {
			type: Boolean,
			default: false
		},
		allowRecursiveMapping: {
			type: Boolean,
			default: false
		}
	},
	computed: {
		// for the label dropdown
		sources: function() {
			var sources = Object.keys(this.from);
			// allow fixed values
			sources.push("fixed");
			if (!this.plain) {
				if (this.$services.page.functions.length > 0) {
					sources.push("$function");
				}
				// allow enumerations
				nabu.utils.arrays.merge(sources, nabu.page.providers("page-enumerate").map(function(x) {
					return x.name;
				}).filter(function(x) { return sources.indexOf(x) < 0 }));
			}
			sources.sort();
			return sources;
		},
		unmappedFields: function() {
			var self = this;
			return this.fieldsToMap.filter(function(x) {
				return self.mappedFields.indexOf(x) < 0;
			});
		}
	},
	data: function() {
		return {
			fieldsToMap: [],
			// adding field?
			adding: false,
			fieldToAdd: null,
			fieldToMapRecursively: null,
			fieldMode: null,
			mappedFields: [],
			labelChoice: false
		}
	},
	created: function() {
		this.calculateFieldsToMap();
	},
	methods: {
		calculateFieldsToMap: function() {
			this.fieldsToMap.splice(0);
			this.mappedFields.splice(0);
			
			if (this.to instanceof Array) {
				nabu.utils.arrays.merge(this.fieldsToMap, this.to);
			}
			else if (this.to) {
				nabu.utils.arrays.merge(this.fieldsToMap, this.$services.page.getSimpleKeysFor(this.to, true, true));
			}
			
			var self = this;
			this.fieldsToMap.forEach(function(x) {
				if (self.value[x] != null) {
					self.mappedFields.push(x);
				}
			});
			if (this.dropUnused) {
				Object.keys(this.value).forEach(function(key) {
					if (self.fieldsToMap.indexOf(key) < 0) {
						delete self.value[key];
					}
				})
			}
		},
		removeField: function(field) {
			this.setValue(field, null, null);
			var index = this.mappedFields.indexOf(field);
			if (index >= 0) {
				this.mappedFields.splice(index, 1);
			}
		},
		resetField: function() {
			this.adding = false; 
			this.fieldToAdd = null; 
			this.fieldMode = null;
		},
		addField: function() {
			if (this.fieldToAdd) {
				this.mappedFields.push(this.fieldToAdd);
				if (this.fieldMode == "fixed") {
					this.value[this.fieldToAdd] = "fixed.";
				}
			}
			this.resetField();
		},
		mapRecursively: function() {
			
		},
		allFieldsFrom: function(value) {
			var fields = this.$services.page.getSimpleKeysFor({properties:this.from}, true, true);
			if (value) {
				fields = fields.filter(function(x) { return x.toLowerCase().indexOf(value.toLowerCase()) >= 0 });
			}
			return fields;
		},
		// get the possible field names for this label
		fieldsFrom: function(value, label, fields) {
			if (label == "$function") {
				//var functions = this.$services.page.functions.map(function(x) { return x.id });
				// can not use async functions as mappers (for now?)
				var functions = this.$services.page.listFunctionDefinitions()
					//.filter(function(x) { return !x.async })
					.map(function(x) { return x.id });
				if (value) {
					functions = functions.filter(function(x) { return x.toLowerCase().indexOf(value.toLowerCase() >= 0 )});
				}
				return functions;
			}
			if (label == "fixed") {
				return value ? [value] : [];
			}
			var provider = nabu.page.providers("page-enumerate").filter(function(x) { return x.name == label })[0];
			if (provider) {
				var enumerations = provider.enumerate();
				if (provider.label) {
					enumerations = enumerations.map(function(x) { return x[provider.label ]});
				}
				return enumerations;
			}
			// in some cases the root definition is an array (e.g. batch selection event from a table)
			// at that point, we want the fields within, the getSimpleKeys does not support this well atm
			var def = this.from[label];
			if (def.type == "array" && def.items) {
				def = def.items;
			}
			var fields = this.$services.page.getSimpleKeysFor(def, true, true);
			if (value) {
				fields = fields.filter(function(x) { return x.toLowerCase().indexOf(value.toLowerCase()) >= 0 });
			}
			fields.push("$all");
			return fields;
		},
		getUnmappedField: function(value) {
			return this.unmappedFields.filter(function(x) {
				return !value || x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
			});
		},
		getFunctionInput: function(id) {
			var transformer = this.$services.page.functions.filter(function(x) { return x.id == id })[0];
			var parameters = {};
			var self = this;
			if (transformer) {
				transformer.inputs.map(function(x) {
					parameters[x.name] = self.$services.page.getResolvedPageParameterType(x.type);
				});
			}
			return {properties:parameters};
		},
		getFunctionOutput: function(id, value) {
			var transformer = this.$services.page.functions.filter(function(x) { return x.id == id })[0];
			var parameters = {};
			var self = this;
			if (transformer) {
				transformer.outputs.map(function(x) {
					parameters[x.name] = self.$services.page.getResolvedPageParameterType(x.type);
				});
			}
			return this.$services.page.getSimpleKeysFor({properties:parameters}, true, true);
		},
		setValue: function(field, newValue, label) {
			// when you are not using label-driven choice, split it
			if (label == null && !this.labelChoice && newValue != null) {
				var index = newValue.indexOf(".");
				if (index >= 0) {
					label = newValue.substring(0, index);
					newValue = newValue.substring(index + 1);
				}
			}
			if (false && label == "fixed" && newValue) {
				this.value[field] = {
					label: label,
					value: newValue
				};
			}
			else if (label == "$function" && newValue) {
				var def = this.$services.page.getFunctionDefinition(newValue);
				Vue.set(this.value, field, {
					label: label,
					value: newValue,
					bindings: {},
					lambda: def && def.async ? true : false,
					lambdable: false,
					output: null
				});
				this.value[field].lambdable = def && !def.async;
			}
			else if (this.fieldMode == "mapRecursive" && label != "fixed") {
				var self = this;
				this.getUnmappedField().forEach(function(x) {
					// if it is a child 
					if (x == "$all" || x.indexOf(field + ".") == 0) {
						var xname = x.replace(/^.*\.([^.]+)$/, "$1");
						self.fieldsFrom(null, label).forEach(function(y) {
							if (newValue == "$all" || y.indexOf(newValue + ".") == 0) {
								var yname = y.replace(/^.*\.([^.]+)$/, "$1");
								if (xname == yname) {
									Vue.set(self.value, x, label + "." + y);
									self.mappedFields.push(x);
								}
							}
						})
					}
				});
				this.resetField();
			}
			// can set the full label in non label choice mode
			else if (label == null && !this.labelChoice) {
				Vue.set(this.value, field, newValue);
			}
			else {
				Vue.set(this.value, field, label && (newValue || label == "fixed") ? label + '.' + (newValue ? newValue : "") : null);
			}
		},
		getBindingsFor: function(field) {
			if (this.value[field] && this.value[field].bindings) {
				return this.value[field].bindings;
			}
			return null;
		},
		getObjectFor: function(field) {
			return this.value[field];
		},
		isFixedValue: function(field) {
			var value = this.value[field];
			return value != null && value.indexOf("fixed.") == 0;
		},
		getValueFor: function(field) {
			if (this.value[field] && this.value[field].value) {
				return this.value[field].value;
			}
			if (!this.labelChoice) {
				if (this.value[field] && this.value[field].indexOf("fixed.") == 0) {
					return this.value[field].substring("fixed.".length);
				}
				else {
					return this.value[field];
				}
			}
			else {
				return this.value[field]
					? this.value[field].substring(this.value[field].indexOf(".") + 1)
					: null;
			}
		},
		isComputedValue: function(field) {
			if (!this.allowComputed) {
				return false;
			}
			var value = this.getValueFor(field);
			return value && value.indexOf("=") == 0;
		},
		switchComputed: function(field) {
			var value = this.getValueFor(field);
			// go to non-computed
			if (value && value.indexOf("=") == 0) {
				value = value.substring(1);
			}
			else {
				value = "=" + value;
			}
			console.log("switching computed", field, this.getValueFor(field), value);
			this.setValue(field, value, 'fixed');
		},
		getLabelFor: function(field) {
			// if we have an object
			if (this.value[field] && this.value[field].label) {
				return this.value[field].label;
			}
			return this.value[field]
				? this.value[field].split(".")[0]
				: (this.sources.indexOf("fixed") >= 0 ? "fixed" : null);
		},
		isLambdable: function(field) {
			return this.value[field] && this.value[field].lambdable;
		}
	},
	watch: {
		to: function() {
			if (this.watchForChanges) {
				this.calculateFieldsToMap();
			}
		},
		value: {
			deep: true,
			handler: function() {
				this.$emit("changed");
			}
		}
	}
});
