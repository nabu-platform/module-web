Vue.component("enumeration-provider", {
	props: {
		cell: {
			type: Object,
			required: true
		},
		page: {
			type: Object,
			required: true
		},
		field: {
			type: Object,
			required: true
		}
	},
	data: function() {
		return {
			provider: null
		}
	},
	created: function() {
		if (this.field.provider == "provider") {
			this.provider = this.getProvider();
		}
	},
	computed: {
		operationBinding: function() {
			var parameters = {};
			var self = this;
			if (this.field.enumerationOperationBinding) {
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				Object.keys(this.field.enumerationOperationBinding).map(function(key) {
					// if the binding is not set, we don't want to overwrite any parameters that are already there (e.g. the resolve field)
					if (self.field.enumerationOperationBinding[key] != null) {
						var target = parameters;
						var parts = key.split(".");
						for (var i = 0; i < parts.length - 1; i++) {
							if (!target[parts[i]]) {
								target[parts[i]] = {};
							}
							target = target[parts[i]];
						}
						if (self.field.enumerationOperationBinding[key].indexOf("record.") == 0) {
							target[parts[parts.length - 1]] = self.$services.page.getValue(self.parentValue, self.field.enumerationOperationBinding[key].substring("record.".length));
						}
						else {
							target[parts[parts.length - 1]] = self.$services.page.getBindingValue(pageInstance, self.field.enumerationOperationBinding[key], self);
						}
					}
				});
			}
			return parameters;
		}	
	},
	methods: {
		getProvider: function() {
			if (this.field.enumerationProvider) {
				var self = this;
				return nabu.page.providers("page-enumerate").filter(function(x) { return x.name == self.field.enumerationProvider })[0];
			}
			return null;
		},
		// enumerationOperation: null,
		// enumerationFormatter
		// enumerationFieldLabel: null,
		// enumerationFieldValue: null,
		// enumerationOperationQuery: null,
		// enumerationOperationBinding: {}
		enumerationFilter: function(value) {
			return this.enumerationFilterAny(value, false);
		},
		// if we set the "asResolve", we are actually resolving the existing value, so for example if you have an ID already
		// and you want to resolve it to the full object so you can get the correct label to show, it will be called with the resolve id
		// the query is used to find _new_ values
		enumerationFilterAny: function(value, asResolve) {
			if (this.field.provider == "operation") {
				if (!this.field.enumerationOperation) {
					return [];
				}
				var parameters = {};
				// don't set a default, use the binding if it's needed
				//parameters.limit = 20;
				nabu.utils.objects.merge(parameters, this.operationBinding);
				if (!asResolve && this.field.enumerationOperationQuery) {
					parameters[this.field.enumerationOperationQuery] = value;
				}
				else if (asResolve && this.field.enumerationOperationResolve) {
					parameters[this.field.enumerationOperationResolve] = value;
				}
				var self = this;
				// map any additional bindings
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				if (this.field.enumerationOperationBinding && false) {
					Object.keys(this.field.enumerationOperationBinding).map(function(key) {
						// if the binding is not set, we don't want to overwrite any parameters that are already there (e.g. the resolve field)
						if (self.field.enumerationOperationBinding[key] != null) {
							var target = parameters;
							var parts = key.split(".");
							for (var i = 0; i < parts.length - 1; i++) {
								if (!target[parts[i]]) {
									target[parts[i]] = {};
								}
								target = target[parts[i]];
							}
							if (self.field.enumerationOperationBinding[key].indexOf("record.") == 0) {
								target[parts[parts.length - 1]] = self.$services.page.getValue(self.parentValue, self.field.enumerationOperationBinding[key].substring("record.".length));
							}
							else {
								target[parts[parts.length - 1]] = self.$services.page.getBindingValue(pageInstance, self.field.enumerationOperationBinding[key], self);
							}
						}
					});
				}
				if (!parameters["$serviceContext"]) {
					parameters["$serviceContext"] = pageInstance.getServiceContext();
				}
				return this.$services.swagger.execute(this.field.enumerationOperation, parameters, function(response) {
					var result = null;
					if (response) {
						var arrayFound = false;
						Object.keys(response).map(function(key) {
							if (response[key] instanceof Array && arrayFound == false) {
								result = response[key];
								if (self.field.selectFirstIfEmpty && self.value == null && result && result.length > 0) {
									self.$emit("input", self.enumerationExtracter(result[0]));
								}
								arrayFound = true;
							}
						});
					}
					return result ? result : [];
				});
			}
			else if (this.field.provider == "array") {
				if (this.field.enumerationArray) {
					var self = this;
					var pageInstance = self.$services.page.getPageInstance(self.page, self);
					var pageArray = pageInstance.get(this.field.enumerationArray);
					var array = [];
					if (pageArray && pageArray.length) {
						nabu.utils.arrays.merge(array, pageArray);
					}
					if (this.field.filter) {
						array = array.filter(function(x) {
							return self.$services.page.isCondition(self.field.filter, x, self);
						})
					}
						
					if (array && array.length) {
						
						if (this.field.addEmptyState == true && this.field.emptyState != null) {
							// create empty object
							var empty = {}
							if (this.field.enumerationFieldValue) {
								empty[this.field.enumerationFieldValue] = null;
								empty['emptyState'] = true;
							}
							
							var emptyInArray = array.filter(function(x) {
								return x.emptyState == true;	
							});
							if (emptyInArray != null && emptyInArray.length == 0) {
								array.push(empty);
							}
						}
						
						if (!value) {
							return array;
						}
						else {
							return array.filter(function(x) {
								if (x == value) {
									return true;
								}
								if (self.field.enumerationArrayLabel != null) {
									var label = x[self.field.enumerationArrayLabel];
									if (label && label.toLowerCase && label.toLowerCase().indexOf(value.toLowerCase()) >= 0) {
										return true;
									}
								}
								if (self.field.enumerationFieldValue != null) {
									var label = x[self.field.enumerationFieldValue];
									if (label && label.toLowerCase && label.toLowerCase().indexOf(value.toLowerCase()) >= 0) {
										return true;
									}
								}
							});
						}
					}
				}
				return [];
			}
			else if (this.field.provider == "provider") {
				var provider = this.provider;
				if (provider) {
					var self = this;
					var values = provider.enumerate();
					if (this.field.filter && values) {
						values = values.filter(function(x) {
							return self.$services.page.isCondition(self.field.filter, x, self);
						})
					}
					if (value) {
						values = values.filter(function(x) {
							var formatted = self.enumerationFormatter(x);
							return formatted.toLowerCase().indexOf(value.toLowerCase()) >= 0;
						});
					}
					// the sorting can conflict with explicit sorting you want to manage from the outside
					// additionally, it can cause an infinite render loop
					/*
					values.sort(function(a, b) {
						var valueA = self.enumerationFormatter(a);
						var valueB = self.enumerationFormatter(b);
						return valueA ? valueA.localeCompare(valueB) : (valueB ? -1 : 0);
					});
					*/
					return values;
				}
				else {
					return [];
				}
			}
			else if (this.field.provider == "fixed") {
				var self = this;
				var result = this.field.enumerations.map(function(x) {
					if(typeof(x) == "string"){
						return "" + self.$services.page.translate((x && x.indexOf("=") == 0 ? self.$services.page.interpret(x, self) : x));
					}
					else {
						x = nabu.utils.objects.clone(x);
						x.value = "" + self.$services.page.translate((x && x.value && x.value.indexOf("=") == 0 ? self.$services.page.interpret(x.value, self) : x.value));
						return x;
					}
				}).filter(function(x) {
					if(typeof(x) == "string") {
						return !value || x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
					}
					else {
						return !value || x.value.toLowerCase().indexOf(("" + value).toLowerCase()) >= 0;
					}
				});
				if (this.field.allowCustom && result.indexOf(value) < 0) {
					result.unshift(value);
				}
				return result;
			}
			return [];
		},
		getFixedMatch: function(value) {
			var self = this;
			var result = this.field.enumerations.filter(function(x) {
				if (x.key != null) {
					return self.$services.page.interpret(x.key) == value;
				}
				else if (x.value != null) {
					return self.$services.page.interpret(x.value) == value;
				}
				else {
					return self.$services.page.interpret(x) == value;
				}
			});
			return result;
		},
		enumerationResolver: function(value) {
			if (this.field.provider == "operation" && this.field.enumerationOperationResolve && this.field.enumerationFieldValue) {
				return this.enumerationFilterAny(value, true);
			}
			else if (this.field.provider == "array") {
				return this.enumerationFilterAny();
			}
			else if (this.field.provider == "provider") {
				return this.enumerationFilterAny();
			}
			else if (this.field.provider == "fixed") {
				return this.getFixedMatch(value);
			}
			return value;
		},
		enumerationFormatter: function(value) {
			if (this.field.provider == "fixed") {
				if (typeof(value) == "string") {
					return value;
				}
				else if (value) {
					// probably not used because we already resolve interpretations in the enumerate (?)
					if (value.value) {
						return this.$services.page.interpret(this.$services.page.translate(value.value, this), this);
					}
					else {
						return value.key;
					}
				}
			}
			else {
				if (value == null) {
					return null;
				}
				else if (this.field.enumerationFieldLabelComplex) {
					var pageInstance = this.$services.page.getPageInstance(this.page, this);
					return !this.field.complexLabel ? this.field.complexLabel : this.$services.typography.replaceVariables(pageInstance, this.field, this.field.complexLabel, this.$services.q.reject(), value);
				}
				else if (this.field.enumerationFormatter) {
					return this.field.enumerationFormatter(value);
				}
				else if (this.field.enumerationFieldLabel) {
					return value[this.field.enumerationFieldLabel];
				}
				else {
					return value;
				}
			}
		},
		enumerationPrettyFormatter: function(value) {
			if (value == null) {
				return null;
			}
			if (value && value.emptyState == true && this.field.addEmptyState == true && !!this.field.emptyState) {
				return this.$services.page.interpret(this.$services.page.translate(this.field.emptyState), this);
			}
			else if (this.field.enumerationFieldPrettyLabelComplex) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				return !this.field.complexPrettyLabel ? this.field.complexPrettyLabel : this.$services.typography.replaceVariables(pageInstance, this.field, this.field.complexPrettyLabel, this.$services.q.reject(), value);
			}
			else if (this.field.enumerationFieldPrettyLabel) {
				return value[this.field.enumerationFieldPrettyLabel];
			}
			else {
				return this.enumerationFormatter(value);
			}
		},
		enumerationExtracter: function(value) {
			if (this.field.provider == "fixed") {
				if (typeof(value) == "string") {
					return value;
				}
				else if (value) {
					if (value.key) {
						return this.$services.page.interpret(value.key, this);
					}
					else {
						return value.value;
					}
				}
			}
			else {
				if (value == null) {
					return null;
				}
				else if (this.field.enumerationFieldValue) {
					return value[this.field.enumerationFieldValue];
				}
				else {
					return value;
				}
			}
		},
		validate: function(soft) {
			return this.$refs.form ? this.$refs.form.validate(soft) : true;
		}
	}
})
Vue.component("enumeration-provider-configure", {
	template: "#enumeration-provider-configure",
	props: {
		cell: {
			type: Object,
			required: true
		},
		page: {
			type: Object,
			required: true
		},
		field: {
			type: Object,
			required: true
		}
	},
	created: function() {
		if (!this.field.enumerationOperationBinding) {
			Vue.set(this.field, "enumerationOperationBinding", {});
		}
		if (this.field.enumerations == null) {
			Vue.set(this.field, "enumerations", []);
		}
	},
	computed: {
		availableParameters: function() {
			return this.$services.page.getAvailableParameters(this.page, this.cell, true);
		},
		providerValueOptions: function() {
			if (this.field.enumerationProvider != null) {
				var self = this;
				var providers = nabu.page.providers("page-enumerate").map(function(x) { return x.name });
				var provider = nabu.page.providers("page-enumerate").filter(function(x) { return x.name == self.field.enumerationProvider })[0];
				if (provider && provider.values) {
					return provider.values;
				}
			}
			return null;
		},
		providerLabelOptions: function() {
			if (this.field.enumerationProvider != null) {
				var self = this;
				var providers = nabu.page.providers("page-enumerate").map(function(x) { return x.name });
				var provider = nabu.page.providers("page-enumerate").filter(function(x) { return x.name == self.field.enumerationProvider })[0];
				if (provider && provider.labels) {
					return provider.labels;
				}
			}
			return null;
		}
	},
	methods: {
		addEnumeration: function() {
			if (this.field.complex) {
				this.field.enumerations.push({value:null,key:null});
			}
			else {
				this.field.enumerations.push('');
			}
		},
		getEnumerationArrays: function(name) {
			var self = this;
			return this.$services.page.getAllArrays(this.page, this.cell.id).filter(function(x) {
				return !name || x.toLowerCase().indexOf(name.toLowerCase()) >= 0;
			});
		},
		getEnumerationServices: function(name) {
			var self = this;
			return this.$services.page.getOperations(function(operation) {
				// must be a get
				var isAllowed = operation.method.toLowerCase() == "get"
					// and contain the name fragment (if any)
					&& (!name || operation.id.toLowerCase().indexOf(name.toLowerCase()) >= 0)
					// must have _a_ response
					&& operation.responses["200"];
				// we also need at least _a_ complex array in the results
				if (isAllowed) {
					var schema = operation.responses["200"] ? operation.responses["200"].schema : null;
					if (schema) {
						var definition = self.$services.swagger.definition(schema["$ref"]);
						// now we need a child in the definition that is a record array
						// TODO: we currently don't actually check for a complex array, just any array, could be an array of strings...
						isAllowed = false;
						if (definition.properties) {
							Object.keys(definition.properties).map(function(field) {
								if (definition.properties[field].type == "array") {
									isAllowed = true;
								}
							});
						}
					}
				}
				return isAllowed;
			}).map(function(x) {
				 return x.id;
			});	
		},
		getEnumerationFields: function(operationId, value) {
			var fields = [];
			if (this.field.provider == "operation") {
				if (this.$services.swagger.operations[operationId]) {
					var resolved = this.$services.swagger.resolve(this.$services.swagger.operations[operationId].responses["200"]);
					Object.keys(resolved.schema.properties).map(function(property) {
						if (resolved.schema.properties[property].type == "array") {
							nabu.utils.arrays.merge(fields, Object.keys(resolved.schema.properties[property].items.properties));
						}
					});
				}
			}
			else if (this.field.provider == "array") {
				var properties = {};
				var available = null;
				var variable = null;
				var rest = null;
				if (this.field.enumerationArray.indexOf("parent.") == 0) {
					var self = this;
					variable = this.field.enumerationArray.substring("parent.".length);
					var parentPage = this.$services.page.pages.filter(function(x) {
						return x.content.name == self.page.content.pageParent;
					})[0];
					if (parentPage != null) {
						//result.parent = this.getPageParameters(parentPage);
						available = this.$services.page.getAllAvailableParameters(parentPage);
					}
					rest = variable.substring(variable.indexOf(".") + 1);
					variable = variable.substring(0, variable.indexOf("."));
				}
				else {
					available = this.$services.page.getAllAvailableParameters(this.page, this.cell);
					variable = this.field.enumerationArray.substring(0, this.field.enumerationArray.indexOf("."));
					rest = this.field.enumerationArray.substring(this.field.enumerationArray.indexOf(".") + 1);
				}
				if (available[variable]) {
					var childDefinition = this.$services.page.getChildDefinition(available[variable], rest);
					console.log("variable", available, variable, childDefinition);
					if (childDefinition) {
						nabu.utils.objects.merge(properties, childDefinition.items.properties);
					}
				}
				nabu.utils.arrays.merge(fields, this.$services.page.getSimpleKeysFor({properties:properties}));
			}
			else if (this.field.provider == "provider") {
				nabu.utils.arrays.merge(fields, this.providerLabelOptions);
			}
			if (value) {
				fields = fields.filter(function(x) {
					return x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				});
			}
			return fields;
		},
		getEnumerationParameters: function(operationId, value) {
			var parameters = this.$services.swagger.operations[operationId].parameters;
			var result = parameters ? parameters.map(function(x) { return x.name }) : [];
			if (value != null) {
				result = result.filter(function(x) {
					return x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				});
			}
			return result;
		},
		getMappableEnumerationParameters: function(field) {
			var result = {
				properties: {}
			};
			if (this.$services.swagger.operations[field.enumerationOperation]) {
				Object.keys(this.$services.page.getInputBindings(this.$services.swagger.operations[field.enumerationOperation])).map(function(key) {
					if (key != field.enumerationOperationQuery) {
						result.properties[key] = {
							type: "string"
						}
					}
				});
				result.properties["$serviceContext"] = {
					type: "string"
				}
			}
			return result;
		},
		hasMappableEnumerationParameters: function(field) {
			var amount = Object.keys(this.getMappableEnumerationParameters(field).properties).length;
			return amount > 0;
		},
		searchPossible: function(value) {
			return this.possibleFields.filter(function(x) {
				return !value || x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
			});
		},
		getEnumerationProviders: function(value) {
			var providers = nabu.page.providers("page-enumerate").map(function(x) { return x.name });
			if (value) {
				providers = providers.filter(function(x) { return x.toLowerCase().indexOf(value.toLowerCase()) >= 0 });
			}
			providers.sort();
			return providers;
		}
	}
}) 